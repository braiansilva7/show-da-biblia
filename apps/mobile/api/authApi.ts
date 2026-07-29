import { request } from './client';
import { Platform } from 'react-native';
import type {
  AuthSession,
  MobileUser,
  ProfilePicture,
  RegisterInput,
  UpdateProfileInput,
  PasswordResetVerification,
  RegistrationEmailVerification,
} from '../types/auth';

type ApiUser = {
  id: string;
  username: string;
  email: string;
  country_id: string;
  language_code: MobileUser['languageCode'];
  profile_picture_url: string | null;
  total_score: number;
  best_time_seconds: number | null;
};
type ApiSession = { access_token: string; user: ApiUser };
const user = (value: ApiUser): MobileUser => ({
  id: value.id,
  username: value.username,
  email: value.email,
  countryId: value.country_id,
  languageCode: value.language_code,
  profilePictureUrl: value.profile_picture_url,
  totalScore: value.total_score,
  bestTimeSeconds: value.best_time_seconds,
});
const session = (value: ApiSession): AuthSession => ({
  accessToken: value.access_token,
  user: user(value.user),
});

async function appendProfilePicture(form: FormData, picture: ProfilePicture) {
  if (picture.file) {
    form.append('profile_picture', picture.file, picture.name);
    return;
  }

  if (Platform.OS === 'web') {
    const response = await fetch(picture.uri);
    if (!response.ok) throw new Error('Unable to read the selected photo.');
    form.append('profile_picture', await response.blob(), picture.name);
    return;
  }

  form.append('profile_picture', picture as unknown as Blob);
}

export async function profileForm(input: RegisterInput | UpdateProfileInput) {
  const form = new FormData();
  const entries: Record<string, string | undefined> = {
    username: input.username,
    email: input.email,
    password: input.password,
    country_id: input.countryId,
    language_code: input.languageCode,
    remove_profile_picture:
      'removeProfilePicture' in input && input.removeProfilePicture
        ? 'true'
        : undefined,
  };
  for (const [key, value] of Object.entries(entries))
    if (value !== undefined) form.append(key, value);
  if (input.profilePicture)
    await appendProfilePicture(form, input.profilePicture);
  return form;
}

export const authApi = {
  async login(email: string, password: string) {
    return session(
      await request<ApiSession>('/auth/login', {
        method: 'POST',
        authenticated: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    );
  },
  async register(input: RegisterInput, registrationToken: string) {
    return session(
      await request<ApiSession>('/auth/register', {
        method: 'POST',
        authenticated: false,
        headers: { Authorization: `Bearer ${registrationToken}` },
        body: await profileForm(input),
      })
    );
  },
  async checkUsernameAvailability(username: string): Promise<boolean> {
    const response = await request<{ available: boolean }>(
      '/auth/register/check-username',
      {
        method: 'POST',
        authenticated: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      }
    );
    return response.available;
  },
  async requestRegistrationEmailCode(
    email: string,
    languageCode: RegisterInput['languageCode']
  ) {
    await request<{ message: string }>('/auth/register/request-email-code', {
      method: 'POST',
      authenticated: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, language_code: languageCode }),
    });
  },
  async verifyRegistrationEmailCode(
    email: string,
    code: string
  ): Promise<RegistrationEmailVerification> {
    const response = await request<{
      registration_token: string;
      expires_in: string;
    }>('/auth/register/verify-email-code', {
      method: 'POST',
      authenticated: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    return {
      registrationToken: response.registration_token,
      expiresIn: response.expires_in,
    };
  },
  async me() {
    const response = await request<{ user: ApiUser }>('/auth/me');
    return user(response.user);
  },
  async updateProfile(input: UpdateProfileInput) {
    const response = await request<{ user: ApiUser }>('/auth/me', {
      method: 'PATCH',
      body: await profileForm(input),
    });
    return user(response.user);
  },
  async sendPasswordResetCode(email: string) {
    await request<{ message: string }>('/auth/forgot-password/send-code', {
      method: 'POST',
      authenticated: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },
  async verifyPasswordResetCode(
    email: string,
    code: string
  ): Promise<PasswordResetVerification> {
    const response = await request<{ reset_token: string; expires_in: string }>(
      '/auth/forgot-password/verify-code',
      {
        method: 'POST',
        authenticated: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      }
    );
    return { resetToken: response.reset_token, expiresIn: response.expires_in };
  },
  async resetPassword(
    resetToken: string,
    password: string,
    confirmation: string
  ) {
    await request<void>('/auth/forgot-password/reset-password', {
      method: 'POST',
      authenticated: false,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resetToken}`,
      },
      body: JSON.stringify({
        new_password: password,
        confirm_password: confirmation,
      }),
    });
  },
};
