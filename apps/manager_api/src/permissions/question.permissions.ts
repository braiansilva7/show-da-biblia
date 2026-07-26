import type { PermissionAction } from '@core/common/types/permission.js';

export const questionViewPermissions: PermissionAction[] = ['questions.view'];
export const questionCreatePermissions: PermissionAction[] = [
  'questions.create',
];
export const questionUpdatePermissions: PermissionAction[] = [
  'questions.update',
];
export const questionPublishPermissions: PermissionAction[] = [
  'questions.publish',
];
export const questionDeletePermissions: PermissionAction[] = [
  'questions.delete',
];
