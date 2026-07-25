export const permissionActions = [
  'dashboard.view',
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  'categories.view',
  'categories.create',
  'categories.update',
  'categories.delete',
  'questions.view',
  'questions.create',
  'questions.update',
  'questions.publish',
  'questions.archive',
  'questions.delete',
  'roles.view',
  'roles.create',
  'roles.update',
  'roles.delete',
  'roles.permissions',
] as const;
export type PermissionAction = (typeof permissionActions)[number];
export type PermissionRole = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
  active: boolean;
  permissions: PermissionAction[];
};
