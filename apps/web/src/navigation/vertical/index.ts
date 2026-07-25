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
    page: 'users',
    title: 'users',
    icon: 'mdi-account-group-outline',
    permissions: ['users.view'],
  },
];

export default verticalNavigation;
