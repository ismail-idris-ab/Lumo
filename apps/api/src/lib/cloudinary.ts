import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env';
import { AppError } from './errors';

const configured = Boolean(
  config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET,
);

if (configured) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function ensureConfigured() {
  if (!configured) {
    throw new AppError(503, 'INTERNAL_ERROR', 'Image uploads are not configured');
  }
}

export const LISTING_FOLDER_PREFIX = 'lumo/listings';

export function listingFolder(listingId: string): string {
  return `${LISTING_FOLDER_PREFIX}/${listingId}`;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

// Signed direct-upload params (TRD §12). Browser uploads straight to Cloudinary with these.
export function createUploadSignature(listingId: string): UploadSignature {
  ensureConfigured();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = listingFolder(listingId);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    config.CLOUDINARY_API_SECRET!,
  );
  return {
    cloudName: config.CLOUDINARY_CLOUD_NAME!,
    apiKey: config.CLOUDINARY_API_KEY!,
    timestamp,
    folder,
    signature,
  };
}

export async function destroyAsset(publicId: string): Promise<void> {
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId);
}

// ── Verification docs: PRIVATE (authenticated) assets (TRD §22) ──
export const VERIFICATION_FOLDER_PREFIX = 'lumo/verification';
export function verificationFolder(userId: string): string {
  return `${VERIFICATION_FOLDER_PREFIX}/${userId}`;
}

export interface VerificationUploadSignature extends UploadSignature {
  type: string; // 'authenticated' — private, needs a signed URL to view
}

export function createVerificationSignature(userId: string): VerificationUploadSignature {
  ensureConfigured();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = verificationFolder(userId);
  const type = 'authenticated';
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, type },
    config.CLOUDINARY_API_SECRET!,
  );
  return {
    cloudName: config.CLOUDINARY_CLOUD_NAME!,
    apiKey: config.CLOUDINARY_API_KEY!,
    timestamp,
    folder,
    type,
    signature,
  };
}

// Time-limited signed URL so an admin can view a private verification doc.
export function signedViewUrl(publicId: string): string {
  ensureConfigured();
  return cloudinary.url(publicId, { type: 'authenticated', sign_url: true, secure: true });
}
