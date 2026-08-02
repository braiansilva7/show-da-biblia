export type LanguageCode = 'pt-BR' | 'en' | 'es';
export type PermissionAction =
  | 'dashboard.view'
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'categories.view'
  | 'categories.create'
  | 'categories.update'
  | 'categories.delete'
  | 'questions.view'
  | 'questions.create'
  | 'questions.update'
  | 'questions.publish'
  | 'questions.archive'
  | 'questions.delete'
  | 'roles.view'
  | 'roles.create'
  | 'roles.update'
  | 'roles.delete'
  | 'roles.permissions';
export interface PermissionRole {
  id: string;
  name: string;
  code: string | null;
  is_system: boolean;
  active: boolean;
  permissions?: PermissionAction[];
}

export interface Country {
  id: string;
  iso_code: string;
  name: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  permission_role_id: string;
  permission_role?: PermissionRole;
  permissions: PermissionAction[];
  country_id: string;
  language_code: LanguageCode;
  profile_picture_url?: string | null;
}

export interface OwnProfileInput {
  username: string;
  country_id: string;
  language_code: LanguageCode;
  profile_picture: File | null;
  remove_profile_picture: boolean;
  current_password: string;
  password: string;
  confirm_password: string;
}

export interface ManagedUser extends AuthenticatedUser {
  active: boolean;
  created_at: string;
  country_id: string;
  profile_picture_url?: string | null;
  total_score?: number;
}

export interface UsersListResponse {
  users: ManagedUser[];
  total: number;
  page: number;
  limit: number;
}

export interface UserFormInput {
  username: string;
  email: string;
  password: string;
  permission_role_id: string;
  country_id: string;
  language_code: LanguageCode;
  active: boolean;
  profile_picture: File | null;
  remove_profile_picture: boolean;
}
