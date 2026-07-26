import type { Locale } from './game';

export type MobileUser = {
  id: string;
  username: string;
  email: string;
  countryId: string;
  languageCode: Locale;
  profilePictureUrl: string | null;
  totalScore: number;
};
export type AuthSession = { accessToken: string; user: MobileUser };
export type Country = { id: string; isoCode: string; name: string };
export type ProfilePicture = {
  uri: string;
  name: string;
  type: string;
  /** Arquivo nativo do navegador, fornecido pelo Expo Image Picker no Web. */
  file?: Blob;
};
export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  countryId: string;
  languageCode: Locale;
  profilePicture?: ProfilePicture | null;
};
export type UpdateProfileInput = Partial<
  Omit<RegisterInput, 'profilePicture'>
> & { profilePicture?: ProfilePicture | null; removeProfilePicture?: boolean };

export type PasswordResetVerification = {
  resetToken: string;
  expiresIn: string;
};
