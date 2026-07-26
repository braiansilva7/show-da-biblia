import type { ImagePickerAsset } from 'expo-image-picker';
import type { ProfilePicture } from '../types/auth';

export function profilePictureFromAsset(
  asset: ImagePickerAsset
): ProfilePicture {
  return {
    uri: asset.uri,
    name: asset.fileName ?? 'profile.jpg',
    type: asset.mimeType ?? asset.file?.type ?? 'image/jpeg',
    file: asset.file,
  };
}
