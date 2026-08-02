<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import verticalNavigation from '@/navigation/vertical';
import type { Page } from '@/types/navigation';
import type { AuthenticatedUser } from '@/types/user';

const props = defineProps<{ user: AuthenticatedUser; currentPage: Page }>();
const emit = defineEmits<{
  navigate: [page: Page];
  logout: [];
  editProfile: [];
}>();
const { t } = useI18n();
function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}
const navigationItems = computed(() =>
  verticalNavigation.filter(
    (item) =>
      !item.permissions ||
      item.permissions.some((permission) =>
        props.user.permissions.includes(permission)
      )
  )
);
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="/" :aria-label="$t('app_name')"
        ><span class="auth-logo-mark" aria-hidden="true">S</span
        ><span>{{ $t('app_name') }}</span></a
      >
      <nav class="navigation" :aria-label="$t('app_name')">
        <v-btn
          v-for="item in navigationItems"
          :key="item.page"
          :class="{ active: currentPage === item.page }"
          variant="text"
          @click="emit('navigate', item.page)"
          ><v-icon :icon="item.icon" size="20" aria-hidden="true" />
          {{ $t(item.title) }}</v-btn
        >
      </nav>
      <v-menu location="top">
        <template #activator="{ props: menuProps }">
          <button v-bind="menuProps" class="sidebar-footer" type="button">
            <span class="sidebar-footer-details">
              <strong>{{ user.username }}</strong
              ><span>{{ user.permission_role?.name }}</span>
            </span>
            <svg
              aria-hidden="true"
              class="settings-icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" />
              <path d="m19.4 13.5 1.05.82-1.8 3.12-1.24-.5a7.47 7.47 0 0 1-1.7.98l-.19 1.32h-3.6l-.19-1.32a7.46 7.46 0 0 1-1.7-.98l-1.24.5-1.8-3.12 1.05-.82a7.31 7.31 0 0 1 0-1.96l-1.05-.82 1.8-3.12 1.24.5a7.47 7.47 0 0 1 1.7-.98l.19-1.32h3.6l.19 1.32a7.46 7.46 0 0 1 1.7.98l1.24-.5 1.8 3.12-1.05.82a7.31 7.31 0 0 1 0 1.96Z" />
            </svg>
          </button>
        </template>
        <v-list density="compact">
          <v-list-item @click="emit('editProfile')">
            <template #prepend>
              <svg aria-hidden="true" class="menu-icon" fill="none" viewBox="0 0 24 24">
                <path d="m4 16.5-.5 4 4-.5L18.5 9 15 5.5 4 16.5Z" />
                <path d="m13.5 7 3.5 3.5M5 21h14" />
              </svg>
            </template>
            {{ $t('edit_profile') }}
          </v-list-item>
          <v-list-item @click="emit('logout')">
            <template #prepend>
              <svg aria-hidden="true" class="menu-icon" fill="none" viewBox="0 0 24 24">
                <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
              </svg>
            </template>
            {{ $t('logout') }}
          </v-list-item>
        </v-list>
      </v-menu>
    </aside>
    <section class="app-content">
      <header class="topbar">
        <v-btn
          class="mobile-brand"
          type="button"
          variant="text"
          @click="emit('navigate', 'dashboard')"
          >{{ $t('app_name') }}</v-btn
        >
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <button v-bind="menuProps" class="topbar-user" type="button">
              <img
                v-if="user.profile_picture_url"
                :src="user.profile_picture_url"
                :alt="user.username"
                class="topbar-avatar"
              />
              <span v-else class="topbar-avatar topbar-avatar-fallback">{{
                initials(user.username)
              }}</span>
              <span class="topbar-user-details">
                <strong>{{ user.username }}</strong
                ><span>{{ user.email }}</span>
              </span>
            </button>
          </template>
          <v-list density="compact">
            <v-list-item @click="emit('editProfile')">
              <template #prepend>
                <svg aria-hidden="true" class="menu-icon" fill="none" viewBox="0 0 24 24">
                  <path d="m4 16.5-.5 4 4-.5L18.5 9 15 5.5 4 16.5Z" />
                  <path d="m13.5 7 3.5 3.5M5 21h14" />
                </svg>
              </template>
              {{ $t('edit_profile') }}
            </v-list-item>
            <v-list-item @click="emit('logout')">
              <template #prepend>
                <svg aria-hidden="true" class="menu-icon" fill="none" viewBox="0 0 24 24">
                  <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
                </svg>
              </template>
              {{ $t('logout') }}
            </v-list-item>
          </v-list>
        </v-menu>
      </header>
      <slot />
    </section>
  </main>
</template>
