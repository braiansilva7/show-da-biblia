import type { Page } from '@/types/navigation';
import type { AppIconName } from '@/types/icon';
import type { PermissionAction } from '@/types/user';

export interface NavigationItem {
  page: Page;
  title: string;
  icon: AppIconName;
  permissions?: PermissionAction[];
}

const verticalNavigation: NavigationItem[] = [
  {
    page: 'dashboard',
    title: 'home',
    icon: 'home',
  },
  {
    page: 'ranking',
    title: 'ranking',
    icon: 'ranking',
  },
  {
    page: 'game',
    title: 'start_game',
    icon: 'play',
  },
  {
    page: 'users',
    title: 'users',
    icon: 'users',
    permissions: ['users.view'],
  },
  {
    page: 'categories',
    title: 'categories',
    icon: 'categories',
    permissions: ['categories.view'],
  },
  {
    page: 'questions',
    title: 'questions',
    icon: 'questions',
    permissions: ['questions.view'],
  },
  {
    page: 'about',
    title: 'about',
    icon: 'about',
  },
];

export default verticalNavigation;
