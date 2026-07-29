import { s3Environment } from '@core/config/environments.js';

/**
 * Rebuilds the public URL of a profile picture from its persisted object key.
 * This keeps existing MinIO objects reachable after the public host changes
 * (for example, from localhost to the LAN address used by a mobile device).
 */
export function toPublicProfilePictureUrl(
  profilePictureUrl: string | null
): string | null {
  if (!profilePictureUrl) return null;

  const bucketPrefix = `/${s3Environment.bucket}/`;
  const index = profilePictureUrl.indexOf(bucketPrefix);
  if (index === -1) return profilePictureUrl;

  const key = profilePictureUrl.slice(index + bucketPrefix.length);
  if (!key.startsWith('users/profile-pictures/')) return profilePictureUrl;

  return `${s3Environment.publicBaseUrl.replace(/\/$/, '')}/${s3Environment.bucket}/${key}`;
}
