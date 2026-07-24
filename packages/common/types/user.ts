export type UserRole = 'ADMIN' | 'PLAYER';
export type LanguageCode = 'pt-BR' | 'en' | 'es';

export type User = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  countryId: string | null;
  languageCode: LanguageCode;
  profilePictureUrl: string | null;
  totalScore: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  country_id: string | null;
  language_code: LanguageCode;
  profile_picture_url: string | null;
  total_score: number;
  active: boolean;
  created_at: string;
};

export type UserListItem = PublicUser;
