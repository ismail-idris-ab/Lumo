import type { ApplicationStatus, StaffApplicationDTO, SubmitStaffApplication } from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { writeAudit, type Actor } from '../lib/audit';
import { notify } from '../lib/notify';
import { sendEmail } from '../lib/email';
import { AppError } from '../lib/errors';
import { config } from '../config/env';

function toDTO(a: {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
}): StaffApplicationDTO {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    message: a.message,
    status: a.status as StaffApplicationDTO['status'],
    createdAt: a.createdAt.toISOString(),
    reviewedAt: a.reviewedAt?.toISOString() ?? null,
  };
}

export async function submitApplication(input: SubmitStaffApplication): Promise<StaffApplicationDTO> {
  const created = await prisma.staffApplication.create({ data: input });

  const superAdmins = await prisma.user.findMany({
    where: { roles: { has: 'SUPER_ADMIN' } },
    select: { id: true, email: true },
  });
  for (const admin of superAdmins) {
    void notify(admin.id, 'staff_application.new', { applicationId: created.id, name: input.name });
    void sendEmail(
      admin.email,
      'New application to join Lumo',
      `<p><strong>${input.name}</strong> (${input.email}) wants to join the team.</p>${
        input.message ? `<p>${input.message}</p>` : ''
      }<p>Review it on the admin dashboard.</p>`,
    );
  }

  return toDTO(created);
}

export async function listApplications(status?: ApplicationStatus): Promise<StaffApplicationDTO[]> {
  const applications = await prisma.staffApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return applications.map(toDTO);
}

async function loadPending(id: string) {
  const application = await prisma.staffApplication.findUnique({ where: { id } });
  if (!application) throw AppError.notFound('Application not found');
  if (application.status !== 'PENDING') throw AppError.conflict('Application already reviewed');
  return application;
}

export async function approveApplication(id: string, actor: Actor): Promise<StaffApplicationDTO> {
  await loadPending(id);
  const updated = await prisma.staffApplication.update({
    where: { id },
    data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: actor.id },
  });
  await writeAudit({
    actorId: actor.id,
    action: 'staff_application.approve',
    targetType: 'StaffApplication',
    targetId: id,
    after: { status: 'APPROVED' },
    ip: actor.ip,
  });
  void sendEmail(
    updated.email,
    "You're approved to join Lumo",
    `<p>Hi ${updated.name},</p><p>We'd like to bring you on. Register an account at <a href="${config.WEB_BASE_URL}/register">${config.WEB_BASE_URL}/register</a> using this same email, then reply here once you have — we'll set up your access.</p>`,
  );
  return toDTO(updated);
}

export async function rejectApplication(id: string, actor: Actor): Promise<StaffApplicationDTO> {
  await loadPending(id);
  const updated = await prisma.staffApplication.update({
    where: { id },
    data: { status: 'REJECTED', reviewedAt: new Date(), reviewedBy: actor.id },
  });
  await writeAudit({
    actorId: actor.id,
    action: 'staff_application.reject',
    targetType: 'StaffApplication',
    targetId: id,
    after: { status: 'REJECTED' },
    ip: actor.ip,
  });
  void sendEmail(
    updated.email,
    'Your Lumo application',
    `<p>Hi ${updated.name},</p><p>Thanks for your interest in joining Lumo. We won't be moving forward right now, but we'll keep your details on file in case a fit comes up.</p>`,
  );
  return toDTO(updated);
}
