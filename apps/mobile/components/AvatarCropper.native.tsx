import type { ProfilePicture } from '../types/auth';

type AvatarCropperProps = {
  picture: ProfilePicture;
  onCancel: () => void;
  onConfirm: (picture: ProfilePicture) => void;
};

/** Android e iOS usam o editor nativo do Expo Image Picker. */
export function AvatarCropper(_props: AvatarCropperProps) {
  return null;
}
