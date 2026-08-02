<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '@/components/common/AppIcon.vue';
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
const mobileNavigationOpen = ref(false);
const isCompactNavigation = ref(false);
let compactNavigationQuery: MediaQueryList | undefined;

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}
function navigate(page: Page) {
  mobileNavigationOpen.value = false;
  emit('navigate', page);
}
function closeNavigation() {
  mobileNavigationOpen.value = false;
}
function updateCompactNavigation(event?: MediaQueryListEvent) {
  isCompactNavigation.value = event?.matches ?? compactNavigationQuery?.matches ?? false;
  if (!isCompactNavigation.value) mobileNavigationOpen.value = false;
}
const navigationItems = computed(() =>
  verticalNavigation.filter(
    (item) =>
      !item.permissions ||
      item.permissions.some((permission) => props.user.permissions.includes(permission))
  )
);
const currentTitle = computed(
  () => t(verticalNavigation.find((item) => item.page === props.currentPage)?.title ?? 'app_name')
);
onMounted(() => {
  compactNavigationQuery = window.matchMedia('(max-width: 959px)');
  updateCompactNavigation();
  compactNavigationQuery.addEventListener('change', updateCompactNavigation);
});
onBeforeUnmount(() => compactNavigationQuery?.removeEventListener('change', updateCompactNavigation));
</script>

<template>
  <main class="app-shell" @keydown.esc="closeNavigation">
    <button
      v-if="mobileNavigationOpen"
      class="navigation-scrim"
      :aria-label="$t('close')"
      type="button"
      @click="closeNavigation"
    />
    <aside
      :class="['sidebar', { 'sidebar-open': mobileNavigationOpen }]"
      :inert="isCompactNavigation && !mobileNavigationOpen"
    >
      <a class="brand" href="/" :aria-label="$t('app_name')">
        <span class="auth-logo-mark" aria-hidden="true">S</span>
        <span>{{ $t('app_name') }}</span>
      </a>
      <p class="navigation-label">{{ $t('app_name') }}</p>
      <nav class="navigation" :aria-label="$t('app_name')">
        <v-btn
          v-for="item in navigationItems"
          :key="item.page"
          :class="{ active: currentPage === item.page }"
          variant="text"
          @click="navigate(item.page)"
        >
          <AppIcon :name="item.icon" :size="20" />
          {{ $t(item.title) }}
        </v-btn>
      </nav>
      <v-menu location="top">
        <template #activator="{ props: menuProps }">
          <button v-bind="menuProps" class="sidebar-footer" type="button">
            <span v-if="user.profile_picture_url" class="sidebar-avatar-wrap">
              <img :src="user.profile_picture_url" :alt="user.username" class="sidebar-avatar" />
            </span>
            <span v-else class="sidebar-avatar sidebar-avatar-fallback">{{ initials(user.username) }}</span>
            <span class="sidebar-footer-details">
              <strong>{{ user.username }}</strong>
              <span>{{ user.permission_role?.name }}</span>
            </span>
            <span class="profile-menu-trigger"><AppIcon name="settings" :size="18" /></span>
          </button>
        </template>
        <v-list class="profile-menu" density="comfortable">
          <v-list-item @click="emit('editProfile')">
            <template #prepend><AppIcon class="menu-icon" name="edit" :size="18" /></template>
            {{ $t('edit_profile') }}
          </v-list-item>
          <v-list-item class="logout-menu-item" @click="emit('logout')">
            <template #prepend><AppIcon class="menu-icon" name="logout" :size="18" /></template>
            {{ $t('logout') }}
          </v-list-item>
        </v-list>
      </v-menu>
    </aside>
    <section class="app-content">
      <header class="topbar">
        <div class="topbar-context">
          <button
            class="mobile-menu-toggle"
            :aria-expanded="mobileNavigationOpen"
            :aria-label="$t('app_name')"
            type="button"
            @click="mobileNavigationOpen = !mobileNavigationOpen"
          ><AppIcon :name="mobileNavigationOpen ? 'close' : 'menu'" :size="22" /></button>
          <div><span class="topbar-kicker">{{ $t('app_name') }}</span><strong>{{ currentTitle }}</strong></div>
        </div>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <button v-bind="menuProps" class="topbar-user" type="button">
              <img v-if="user.profile_picture_url" :src="user.profile_picture_url" :alt="user.username" class="topbar-avatar" />
              <span v-else class="topbar-avatar topbar-avatar-fallback">{{ initials(user.username) }}</span>
              <span class="topbar-user-details"><strong>{{ user.username }}</strong><span>{{ user.email }}</span></span>
            </button>
          </template>
          <v-list class="profile-menu" density="comfortable">
            <v-list-item @click="emit('editProfile')"><template #prepend><AppIcon class="menu-icon" name="edit" :size="18" /></template>{{ $t('edit_profile') }}</v-list-item>
            <v-list-item class="logout-menu-item" @click="emit('logout')"><template #prepend><AppIcon class="menu-icon" name="logout" :size="18" /></template>{{ $t('logout') }}</v-list-item>
          </v-list>
        </v-menu>
      </header>
      <slot />
    </section>
  </main>
</template>
