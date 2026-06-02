import type { Listing, ListingImage } from '@prisma/client';
import { attachImageSchema, LISTING_MAX_IMAGES, type ListingImageDTO, type Role } from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { assertOwnership } from '../middleware/rbac';
import { createUploadSignature, destroyAsset, listingFolder, type UploadSignature } from '../lib/cloudinary';

type Principal = { id: string; roles: Role[] };

function toImageDTO(i: ListingImage): ListingImageDTO {
  return { id: i.id, url: i.url, publicId: i.publicId, isPrimary: i.isPrimary, order: i.order };
}

async function requireOwnedListing(listingId: string, actor: Principal): Promise<Listing> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.deletedAt) throw AppError.notFound('Listing not found');
  assertOwnership(actor, listing.ownerId);
  return listing;
}

async function imagesOf(listingId: string): Promise<ListingImageDTO[]> {
  const imgs = await prisma.listingImage.findMany({
    where: { listingId },
    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
  });
  return imgs.map(toImageDTO);
}

export async function getUploadSignature(listingId: string, actor: Principal): Promise<UploadSignature> {
  await requireOwnedListing(listingId, actor);
  return createUploadSignature(listingId);
}

export async function attachImage(
  listingId: string,
  input: unknown,
  actor: Principal,
): Promise<ListingImageDTO[]> {
  await requireOwnedListing(listingId, actor);
  const data = attachImageSchema.parse(input);

  // Asset must live in this listing's folder (blocks attaching arbitrary public_ids).
  if (!data.publicId.startsWith(listingFolder(listingId))) {
    throw AppError.badRequest('Image does not belong to this listing');
  }

  const count = await prisma.listingImage.count({ where: { listingId } });
  if (count >= LISTING_MAX_IMAGES) {
    throw AppError.conflict(`A listing can have at most ${LISTING_MAX_IMAGES} images`);
  }

  const makePrimary = data.isPrimary || count === 0; // first image is primary by default
  if (makePrimary) {
    await prisma.listingImage.updateMany({ where: { listingId }, data: { isPrimary: false } });
  }

  await prisma.listingImage.create({
    data: {
      listingId,
      url: data.url,
      publicId: data.publicId,
      isPrimary: makePrimary,
      order: count,
    },
  });
  return imagesOf(listingId);
}

export async function deleteImage(
  listingId: string,
  imageId: string,
  actor: Principal,
): Promise<ListingImageDTO[]> {
  await requireOwnedListing(listingId, actor);
  const image = await prisma.listingImage.findUnique({ where: { id: imageId } });
  if (!image || image.listingId !== listingId) throw AppError.notFound('Image not found');

  await destroyAsset(image.publicId);
  await prisma.listingImage.delete({ where: { id: imageId } });

  // Promote a new primary if we removed the primary one.
  if (image.isPrimary) {
    const next = await prisma.listingImage.findFirst({
      where: { listingId },
      orderBy: { order: 'asc' },
    });
    if (next) {
      await prisma.listingImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }
  return imagesOf(listingId);
}

export async function setPrimaryImage(
  listingId: string,
  imageId: string,
  actor: Principal,
): Promise<ListingImageDTO[]> {
  await requireOwnedListing(listingId, actor);
  const image = await prisma.listingImage.findUnique({ where: { id: imageId } });
  if (!image || image.listingId !== listingId) throw AppError.notFound('Image not found');

  await prisma.$transaction([
    prisma.listingImage.updateMany({ where: { listingId }, data: { isPrimary: false } }),
    prisma.listingImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);
  return imagesOf(listingId);
}
