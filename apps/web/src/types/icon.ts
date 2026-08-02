export const appIconNames = [
  'home',
  'ranking',
  'play',
  'users',
  'categories',
  'questions',
  'about',
  'menu',
  'close',
  'settings',
  'edit',
  'delete',
  'publish',
  'unpublish',
  'logout',
  'search',
  'plus',
  'chart',
  'book',
] as const;

export type AppIconName = (typeof appIconNames)[number];
