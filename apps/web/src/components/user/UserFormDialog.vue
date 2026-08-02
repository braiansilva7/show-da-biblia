<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import ImageCropDialog from '@/components/common/ImageCropDialog.vue';
import type {
  Country,
  ManagedUser,
  PermissionRole,
  UserFormInput,
} from '@/types/user';

const props = defineProps<{
  modelValue: boolean;
  user: ManagedUser | null;
  roles: PermissionRole[];
  countries: Country[];
  error: string;
  isSaving: boolean;
  checkUsername: (username: string) => Promise<boolean>;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [input: UserFormInput];
}>();
const form = ref<UserFormInput>(emptyForm());
const isEditing = computed(() => props.user !== null);
const isCropOpen = ref(false);
const cropSource = ref('');
const profilePicturePreview = ref('');
const usernameStatus = ref<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
const originalUsername = ref('');
let localPreviewUrl = '';
let usernameCheckTimeout: ReturnType<typeof setTimeout> | undefined;
let usernameCheckRequest = 0;

function revokeLocalPreview() {
  if (!localPreviewUrl) return;
  URL.revokeObjectURL(localPreviewUrl);
  localPreviewUrl = '';
}

function closeCrop() {
  isCropOpen.value = false;
  if (cropSource.value) URL.revokeObjectURL(cropSource.value);
  cropSource.value = '';
}
function emptyForm(): UserFormInput {
  return {
    username: '',
    email: '',
    password: '',
    permission_role_id:
      props.roles.find((role) => role.code === 'PLAYER')?.id ?? '',
    country_id: '',
    language_code: 'pt-BR',
    active: true,
    profile_picture: null,
    remove_profile_picture: false,
  };
}
watch(
  () => [props.modelValue, props.user] as const,
  ([visible, user]) => {
    if (!visible) return;
    if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
    usernameCheckTimeout = undefined;
    usernameCheckRequest += 1;
    revokeLocalPreview();
    closeCrop();
    profilePicturePreview.value = user?.profile_picture_url ?? '';
    originalUsername.value = user?.username.trim() ?? '';
    usernameStatus.value = 'idle';
    form.value = user
      ? {
          username: user.username,
          email: user.email,
          password: '',
          permission_role_id: user.permission_role_id,
          country_id: user.country_id,
          language_code: user.language_code,
          active: user.active,
          profile_picture: null,
          remove_profile_picture: false,
        }
      : emptyForm();
  },
  { immediate: true }
);
const usernameStatusMessage = computed(() => ({
  idle: '',
  checking: 'username_checking',
  available: 'username_available',
  taken: 'username_unavailable',
  error: 'username_error',
} as const)[usernameStatus.value]);
const isUsernameUnavailable = computed(() =>
  usernameStatus.value === 'taken' || usernameStatus.value === 'checking' || usernameStatus.value === 'error'
);

async function checkUsername(): Promise<boolean> {
  if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
  usernameCheckTimeout = undefined;
  const username = form.value.username.trim();
  const request = ++usernameCheckRequest;
  if (username.length < 3) {
    usernameStatus.value = 'idle';
    return false;
  }
  if (username === originalUsername.value) {
    usernameStatus.value = 'idle';
    return true;
  }
  usernameStatus.value = 'checking';
  try {
    const available = await props.checkUsername(username);
    if (request !== usernameCheckRequest) return false;
    usernameStatus.value = available ? 'available' : 'taken';
    return available;
  } catch {
    if (request === usernameCheckRequest) usernameStatus.value = 'error';
    return false;
  }
}
function scheduleUsernameCheck() {
  if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
  usernameCheckRequest += 1;
  const username = form.value.username.trim();
  if (username.length < 3 || username === originalUsername.value) {
    usernameStatus.value = 'idle';
    return;
  }
  usernameStatus.value = 'checking';
  usernameCheckTimeout = setTimeout(() => void checkUsername(), 350);
}
async function submit() {
  if (!(await checkUsername())) return;
  emit('submit', form.value);
}
onBeforeUnmount(() => {
  if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
});

function selectProfilePicture(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  form.value.remove_profile_picture = false;
  cropSource.value = URL.createObjectURL(file);
  isCropOpen.value = true;
}

function applyCrop(file: File) {
  revokeLocalPreview();
  localPreviewUrl = URL.createObjectURL(file);
  profilePicturePreview.value = localPreviewUrl;
  form.value.profile_picture = file;
}
function toggleRemoveProfilePicture() {
  if (form.value.remove_profile_picture) {
    revokeLocalPreview();
    profilePicturePreview.value = '';
    form.value.profile_picture = null;
    return;
  }
  profilePicturePreview.value = props.user?.profile_picture_url ?? '';
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="540"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="modal-card"
      ><v-card-text
        ><form @submit.prevent="submit">
          <header>
            <p class="eyebrow">
              {{ $t(isEditing ? 'edit_registration' : 'new_registration') }}
            </p>
            <h2>{{ $t(isEditing ? 'edit_user' : 'register_user') }}</h2>
            <p>{{ $t('user_form_subtitle') }}</p>
          </header>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <label class="profile-picture-field"
            ><span>{{ $t('profile_picture') }}</span
            ><span class="profile-picture-picker">
              <img
                v-if="profilePicturePreview"
                :src="profilePicturePreview"
                :alt="$t('profile_picture')"
                class="profile-picture-preview"
              />
              <span v-else class="profile-picture-placeholder">{{
                $t('profile_picture')
              }}</span>
              <span class="profile-picture-button">{{
                $t(profilePicturePreview ? 'change_picture' : 'choose_picture')
              }}</span>
              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="profile-picture-input"
                type="file"
                @change="selectProfilePicture"
              />
            </span>
            <span
              v-if="isEditing && user?.profile_picture_url"
              class="remove-picture-option"
            >
              <input
                v-model="form.remove_profile_picture"
                type="checkbox"
                @change="toggleRemoveProfilePicture"
              />
              {{ $t('remove_current_picture') }}
            </span>
          </label>
          <label
            ><span>{{ $t('username') }}</span
            ><input
              v-model="form.username"
              autocomplete="username"
              maxlength="120"
              required
              @blur="checkUsername"
              @input="scheduleUsernameCheck"
          /></label>
          <p
            v-if="usernameStatusMessage"
            :class="['field-message', usernameStatus]"
            role="status"
          >{{ $t(usernameStatusMessage) }}</p>
          <label
            ><span>{{ $t('email') }}</span
            ><input
              v-model="form.email"
              autocomplete="email"
              maxlength="320"
              required
              type="email"
          /></label>
          <label
            ><span>{{
              $t(isEditing ? 'new_password_optional' : 'password')
            }}</span
            ><input
              v-model="form.password"
              autocomplete="new-password"
              minlength="8"
              :required="!isEditing"
              type="password"
          /></label>
          <div class="form-grid">
            <label
              ><span>{{ $t('role') }}</span
              ><select v-model="form.permission_role_id" required>
                <option v-for="role in roles" :key="role.id" :value="role.id">
                  {{ role.name }}
                </option>
              </select></label
            ><label
              ><span>{{ $t('game_language') }}</span
              ><select v-model="form.language_code">
                <option value="pt-BR">{{ $t('language_pt') }}</option>
                <option value="en">{{ $t('language_en') }}</option>
                <option value="es">{{ $t('language_es') }}</option>
              </select></label
            >
          </div>
          <label
            ><span>{{ $t('country_of_origin') }}</span
            ><select v-model="form.country_id" required>
              <option disabled value="">{{ $t('select_country') }}</option>
              <option
                v-for="country in countries"
                :key="country.id"
                :value="country.id"
              >
                {{ country.name }} ({{ country.iso_code }})
              </option>
            </select></label
          >
          <label v-if="isEditing"
            ><span>{{ $t('status') }}</span
            ><select v-model="form.active">
              <option :value="true">{{ $t('active') }}</option>
              <option :value="false">{{ $t('inactive') }}</option>
            </select></label
          >
          <footer>
            <v-btn
              type="button"
              variant="outlined"
              @click="emit('update:modelValue', false)"
              >{{ $t('cancel') }}</v-btn
            ><v-btn
              color="primary"
              type="submit"
              variant="flat"
              :disabled="isUsernameUnavailable"
              :loading="isSaving"
              >{{ $t(isEditing ? 'save_changes' : 'register') }}</v-btn
            >
          </footer>
        </form></v-card-text
      ></v-card
    >
  </v-dialog>
  <ImageCropDialog
    v-model="isCropOpen"
    :source="cropSource"
    @crop="applyCrop"
    @update:model-value="
      (visible) => {
        if (!visible) closeCrop();
      }
    "
  />
</template>

<style scoped>
.profile-picture-picker {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.45rem;
}
.profile-picture-field {
  margin-bottom: 1.25rem;
}
.profile-picture-preview,
.profile-picture-placeholder {
  align-items: center;
  background: #f4f3f8;
  border: 1px solid #e7e5ef;
  border-radius: 50%;
  display: flex;
  height: 72px;
  justify-content: center;
  object-fit: cover;
  overflow: hidden;
  width: 72px;
}
.profile-picture-placeholder {
  color: #797586;
  font-size: 0.7rem;
  text-align: center;
}
.profile-picture-button {
  background: #7f4f24;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 0.45rem 0.7rem;
  position: relative;
  text-transform: uppercase;
}
.profile-picture-input {
  cursor: pointer;
  inset: 0;
  opacity: 0;
  position: absolute;
  width: 100%;
}
.remove-picture-option {
  align-items: center;
  color: #7f4f24;
  cursor: pointer;
  display: flex;
  font-size: 0.75rem;
  font-weight: 600;
  gap: 0.35rem;
  margin: 0.15rem auto 0;
  width: max-content;
}
.remove-picture-option input {
  accent-color: #7f4f24;
  cursor: pointer;
  flex: 0 0 14px;
  height: 14px;
  margin: 0;
  padding: 0;
  width: 14px;
}
.remove-picture-option:has(input:checked) {
  color: #c73d3e;
}
</style>
