<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ImageCropDialog from '@/components/common/ImageCropDialog.vue';
import type {
  AuthenticatedUser,
  Country,
  OwnProfileInput,
} from '@/types/user';

const props = defineProps<{
  modelValue: boolean;
  user: AuthenticatedUser;
  countries: Country[];
  error: string;
  isSaving: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [input: OwnProfileInput];
}>();

const form = ref<OwnProfileInput>(emptyForm());
const isCropOpen = ref(false);
const cropSource = ref('');
const profilePicturePreview = ref('');
let localPreviewUrl = '';

function emptyForm(): OwnProfileInput {
  return {
    username: props.user.username,
    country_id: props.user.country_id,
    language_code: props.user.language_code,
    profile_picture: null,
    remove_profile_picture: false,
    current_password: '',
    password: '',
    confirm_password: '',
  };
}

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
watch(
  () => [props.modelValue, props.user] as const,
  ([visible]) => {
    if (!visible) return;
    revokeLocalPreview();
    closeCrop();
    form.value = emptyForm();
    profilePicturePreview.value = props.user.profile_picture_url ?? '';
  },
  { immediate: true }
);

const isChangingPassword = computed(() =>
  Boolean(
    form.value.current_password ||
      form.value.password ||
      form.value.confirm_password
  )
);
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
  profilePicturePreview.value = props.user.profile_picture_url ?? '';
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="540"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="modal-card">
      <v-card-text>
        <form @submit.prevent="emit('submit', form)">
          <header>
            <p class="eyebrow">{{ $t('settings') }}</p>
            <h2>{{ $t('edit_profile') }}</h2>
            <p>{{ $t('own_profile_subtitle') }}</p>
          </header>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <label class="profile-picture-field">
            <span>{{ $t('profile_picture') }}</span>
            <span class="profile-picture-picker">
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
            <span v-if="user.profile_picture_url" class="remove-picture-option">
              <input
                v-model="form.remove_profile_picture"
                type="checkbox"
                @change="toggleRemoveProfilePicture"
              />
              {{ $t('remove_current_picture') }}
            </span>
          </label>
          <label>
            <span>{{ $t('username') }}</span>
            <input
              v-model="form.username"
              autocomplete="username"
              maxlength="120"
              required
            />
          </label>
          <div class="form-grid">
            <label>
              <span>{{ $t('game_language') }}</span>
              <select v-model="form.language_code" required>
                <option value="pt-BR">{{ $t('language_pt') }}</option>
                <option value="en">{{ $t('language_en') }}</option>
                <option value="es">{{ $t('language_es') }}</option>
              </select>
            </label>
            <label>
              <span>{{ $t('country_of_origin') }}</span>
              <select v-model="form.country_id" required>
                <option disabled value="">{{ $t('select_country') }}</option>
                <option v-for="country in countries" :key="country.id" :value="country.id">
                  {{ country.name }} ({{ country.iso_code }})
                </option>
              </select>
            </label>
          </div>
          <fieldset class="password-section">
            <legend>{{ $t('change_password') }}</legend>
            <p>{{ $t('change_password_hint') }}</p>
            <label>
              <span>{{ $t('current_password') }}</span>
              <input
                v-model="form.current_password"
                :required="isChangingPassword"
                autocomplete="current-password"
                type="password"
              />
            </label>
            <label>
              <span>{{ $t('new_password') }}</span>
              <input
                v-model="form.password"
                :required="isChangingPassword"
                autocomplete="new-password"
                minlength="8"
                type="password"
              />
            </label>
            <label>
              <span>{{ $t('confirm_password') }}</span>
              <input
                v-model="form.confirm_password"
                :required="isChangingPassword"
                autocomplete="new-password"
                type="password"
              />
            </label>
          </fieldset>
          <footer>
            <v-btn type="button" variant="outlined" @click="emit('update:modelValue', false)">
              {{ $t('cancel') }}
            </v-btn>
            <v-btn color="primary" type="submit" variant="flat" :loading="isSaving">
              {{ $t('save_changes') }}
            </v-btn>
          </footer>
        </form>
      </v-card-text>
    </v-card>
  </v-dialog>
  <ImageCropDialog
    v-model="isCropOpen"
    :source="cropSource"
    @crop="applyCrop"
    @update:model-value="!$event && closeCrop()"
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
.profile-picture-field { margin-bottom: 1.25rem; }
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
.profile-picture-placeholder { color: #797586; font-size: 0.7rem; text-align: center; }
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
.profile-picture-input { cursor: pointer; inset: 0; opacity: 0; position: absolute; width: 100%; }
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
.remove-picture-option input { accent-color: #7f4f24; cursor: pointer; height: 14px; margin: 0; width: 14px; }
.remove-picture-option:has(input:checked) { color: #c73d3e; }
.password-section {
  border: 1px solid #dedbe7;
  border-radius: 8px;
  display: grid;
  gap: 0.85rem;
  margin: 1.25rem 0;
  padding: 1rem;
}
.password-section legend { color: #27233a; font-weight: 700; padding: 0 0.25rem; }
.password-section p { color: #797586; font-size: 0.875rem; margin: 0; }
</style>
