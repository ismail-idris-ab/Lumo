import { describe, it, expect, vi, beforeEach } from 'vitest';

const { staffApplication, user, writeAudit, notify, sendEmail } = vi.hoisted(() => ({
  staffApplication: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  user: { findMany: vi.fn() },
  writeAudit: vi.fn(),
  notify: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({ prisma: { staffApplication, user } }));
vi.mock('../lib/audit', () => ({ writeAudit }));
vi.mock('../lib/notify', () => ({ notify }));
vi.mock('../lib/email', () => ({ sendEmail }));

import { submitApplication, approveApplication, rejectApplication } from './staff-application.service';

const actor = { id: 'super_1', ip: '127.0.0.1' };

beforeEach(() => vi.clearAllMocks());

describe('submitApplication', () => {
  it('creates the row and notifies every SUPER_ADMIN', async () => {
    staffApplication.create.mockResolvedValue({
      id: 'app1', name: 'Bayo', email: 'bayo@test.com', message: null, status: 'PENDING', createdAt: new Date(), reviewedAt: null,
    });
    user.findMany.mockResolvedValue([{ id: 'super_1', email: 'super1@lumo.test' }, { id: 'super_2', email: 'super2@lumo.test' }]);

    const result = await submitApplication({ name: 'Bayo', email: 'bayo@test.com' });

    expect(result.status).toBe('PENDING');
    expect(notify).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith('super1@lumo.test', expect.any(String), expect.any(String));
  });
});

describe('approveApplication', () => {
  it('marks APPROVED, writes audit, emails the applicant', async () => {
    staffApplication.findUnique.mockResolvedValue({ id: 'app1', status: 'PENDING' });
    staffApplication.update.mockResolvedValue({
      id: 'app1', name: 'Bayo', email: 'bayo@test.com', message: null, status: 'APPROVED', createdAt: new Date(), reviewedAt: new Date(),
    });

    const result = await approveApplication('app1', actor);

    expect(result.status).toBe('APPROVED');
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'staff_application.approve' }));
    expect(sendEmail).toHaveBeenCalledWith('bayo@test.com', expect.stringContaining('approved'), expect.any(String));
  });

  it('throws 404 for a missing application', async () => {
    staffApplication.findUnique.mockResolvedValue(null);
    await expect(approveApplication('ghost', actor)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 409 for an already-reviewed application', async () => {
    staffApplication.findUnique.mockResolvedValue({ id: 'app1', status: 'APPROVED' });
    await expect(approveApplication('app1', actor)).rejects.toMatchObject({ statusCode: 409 });
    expect(staffApplication.update).not.toHaveBeenCalled();
  });
});

describe('rejectApplication', () => {
  it('marks REJECTED, writes audit, emails the applicant', async () => {
    staffApplication.findUnique.mockResolvedValue({ id: 'app1', status: 'PENDING' });
    staffApplication.update.mockResolvedValue({
      id: 'app1', name: 'Bayo', email: 'bayo@test.com', message: null, status: 'REJECTED', createdAt: new Date(), reviewedAt: new Date(),
    });

    const result = await rejectApplication('app1', actor);

    expect(result.status).toBe('REJECTED');
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'staff_application.reject' }));
    expect(sendEmail).toHaveBeenCalledWith('bayo@test.com', expect.any(String), expect.any(String));
  });
});
