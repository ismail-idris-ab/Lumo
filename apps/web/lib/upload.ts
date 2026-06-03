import { api } from './api-client';

interface UploadSignature {
  cloudName: string;
  apiKey: string | number;
  timestamp: number;
  folder: string;
  signature: string;
}

// Signed direct upload: browser → Cloudinary, then attach the returned asset to the listing.
export async function uploadListingImage(listingId: string, file: File, isPrimary: boolean): Promise<void> {
  const sign = await api.post<UploadSignature>(`/listings/${listingId}/images/sign`);

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', String(sign.apiKey));
  form.append('timestamp', String(sign.timestamp));
  form.append('folder', sign.folder);
  form.append('signature', sign.signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Image upload failed');
  const data = (await res.json()) as { secure_url: string; public_id: string };

  await api.post(`/listings/${listingId}/images`, {
    url: data.secure_url,
    publicId: data.public_id,
    isPrimary,
  });
}

interface VerificationUploadSignature extends UploadSignature {
  type: string; // 'authenticated' — private bucket, needs a signed URL to view
}

// Private (authenticated) upload for verification docs. Returns the asset to attach to the request.
export async function uploadVerificationDoc(file: File): Promise<{ url: string; publicId: string }> {
  const sign = await api.post<VerificationUploadSignature>('/verification/docs/sign');

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', String(sign.apiKey));
  form.append('timestamp', String(sign.timestamp));
  form.append('folder', sign.folder);
  form.append('type', sign.type);
  form.append('signature', sign.signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Document upload failed');
  const data = (await res.json()) as { secure_url: string; public_id: string };
  return { url: data.secure_url, publicId: data.public_id };
}
