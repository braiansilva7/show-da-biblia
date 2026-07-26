import { Platform } from 'react-native';
import type { ProfilePicture } from '../types/auth';
import { AvatarCropper as WebAvatarCropper } from './WebAvatarCropper';

type AvatarCropperProps = {
  picture: ProfilePicture;
  onCancel: () => void;
  onConfirm: (picture: ProfilePicture) => void;
};

/** Carrega o editor Web explicitamente; Android e iOS usam o editor nativo. */
export function AvatarCropper(props: AvatarCropperProps) {
  if (Platform.OS === 'web') return <WebAvatarCropper {...props} />;
  return null;
}
