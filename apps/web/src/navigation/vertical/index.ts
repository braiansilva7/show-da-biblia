import type { Page } from '@/types/navigation';
import type { PermissionAction } from '@/types/user';

export interface NavigationItem {
  page: Page;
  title: string;
  icon: string;
  permissions?: PermissionAction[];
}

const verticalNavigation: NavigationItem[] = [
  {
    page: 'dashboard',
    title: 'home',
    icon: 'mdi-home-variant-outline',
  },
  {
    page: 'ranking',
    title: 'ranking',
    icon: 'mdi-trophy-outline',
  },
  {
    page: 'game',
    title: 'start_game',
    icon: 'mdi-play-circle-outline',
  },
  {
    page: 'users',
    title: 'users',
    icon: 'mdi-account-group-outline',
    permissions: ['users.view'],
  },
  {
    page: 'categories',
    title: 'categories',
    icon: 'mdi-shape-outline',
    permissions: ['categories.view'],
  },
  {
    page: 'questions',
    title: 'questions',
    icon: 'mdi-help-circle-outline',
    permissions: ['questions.view'],
  },
];

export default verticalNavigation;
