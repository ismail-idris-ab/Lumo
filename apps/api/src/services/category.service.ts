import type { Category } from '@prisma/client';
import { createCategorySchema, slugify, updateCategorySchema } from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { writeAudit, type Actor } from '../lib/audit';

export function listCategories() {
  return prisma.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export async function listCategoryTree(): Promise<CategoryNode[]> {
  const all = await listCategories();
  const byId = new Map<string, CategoryNode>();
  for (const c of all) byId.set(c.id, { ...c, children: [] });

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

async function ensureUniqueSlug(slug: string, excludeId?: string) {
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing && existing.id !== excludeId) {
    throw AppError.conflict(`Category slug "${slug}" already exists`);
  }
}

export async function createCategory(input: unknown, actor: Actor): Promise<Category> {
  const data = createCategorySchema.parse(input);
  const slug = data.slug ?? slugify(data.name);
  await ensureUniqueSlug(slug);

  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
    if (!parent) throw AppError.badRequest('Parent category not found');
  }

  const category = await prisma.category.create({
    data: { name: data.name, slug, parentId: data.parentId ?? null, order: data.order ?? 0 },
  });
  await writeAudit({
    actorId: actor.id,
    action: 'category.create',
    targetType: 'Category',
    targetId: category.id,
    after: category,
    ip: actor.ip,
  });
  return category;
}

export async function updateCategory(id: string, input: unknown, actor: Actor): Promise<Category> {
  const data = updateCategorySchema.parse(input);
  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) throw AppError.notFound('Category not found');
  if (data.parentId === id) throw AppError.badRequest('Category cannot be its own parent');

  let slug = before.slug;
  if (data.slug || data.name) {
    slug = data.slug ?? slugify(data.name ?? before.name);
    if (slug !== before.slug) await ensureUniqueSlug(slug, id);
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: data.name ?? before.name,
      slug,
      parentId: data.parentId ?? before.parentId,
      order: data.order ?? before.order,
    },
  });
  await writeAudit({
    actorId: actor.id,
    action: 'category.update',
    targetType: 'Category',
    targetId: id,
    before,
    after: category,
    ip: actor.ip,
  });
  return category;
}

export async function deleteCategory(id: string, actor: Actor): Promise<void> {
  const before = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { listings: true, children: true } } },
  });
  if (!before) throw AppError.notFound('Category not found');
  if (before._count.listings > 0) {
    throw AppError.conflict('Category has listings; reassign them first');
  }
  if (before._count.children > 0) {
    throw AppError.conflict('Category has subcategories; remove them first');
  }

  await prisma.category.delete({ where: { id } });
  await writeAudit({
    actorId: actor.id,
    action: 'category.delete',
    targetType: 'Category',
    targetId: id,
    before,
    ip: actor.ip,
  });
}
