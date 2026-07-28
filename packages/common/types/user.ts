import type { PermissionAction, PermissionRole } from './permission.js';
export type LanguageCode = 'pt-BR' | 'en' | 'es';

export type User = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  sessionVersion: number;
  permissionRoleId: string;
  permissionRole?: PermissionRole;
  permissions: PermissionAction[];
  countryId: string;
  languageCode: LanguageCode;
  profilePictureUrl: string | null;
  totalScore: number;
  highestUnlockedLevel: 1 | 2 | 3;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  permission_role_id: string;
  permission_role?: {
    id: string;
    name: string;
    code: string | null;
    is_system: boolean;
    active: boolean;
  };
  permissions: PermissionAction[];
  country_id: string;
  language_code: LanguageCode;
  profile_picture_url: string | null;
  total_score: number;
  highest_unlocked_level: 1 | 2 | 3;
  active: boolean;
  created_at: string;
};

export type UserListItem = PublicUser;
