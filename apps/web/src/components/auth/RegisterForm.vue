<script setup lang="ts">
import { computed, ref } from 'vue';
import bibleIllustration from '@/assets/images/illustrations/bible.png';
import ImageCropDialog from '@/components/common/ImageCropDialog.vue';
import type { Country, RegistrationInput } from '@/types/user';

const props = defineProps<{
  countries: Country[];
  checkUsername: (username: string) => Promise<boolean>;
  requestCode: (email: string, language: RegistrationInput['language_code']) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<string>;
  register: (input: RegistrationInput, token: string) => Promise<void>;
}>();
const emit = defineEmits<{ login: []; complete: [] }>();
const form = ref<RegistrationInput>({
  username: '', email: '', password: '', country_id: '', language_code: 'pt-BR', profile_picture: null,
});
const verificationCode = ref('');
const phase = ref<'details' | 'verification'>('details');
const usernameStatus = ref<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
const error = ref('');
const isLoading = ref(false);
const isCropOpen = ref(false);
const isPasswordVisible = ref(false);
const cropSource = ref('');
const preview = ref('');
let previewUrl = '';

const submitLabel = computed(() =>
  phase.value === 'details' ? 'send_verification_code' : 'verify_and_create_account'
);
const usernameStatusMessage = computed(() => {
  const messages = {
    idle: '',
    checking: 'username_checking',
    available: 'username_available',
    taken: 'username_unavailable',
    error: 'username_error',
  } as const;
  return messages[usernameStatus.value] ?? '';
});
function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
}
function selectPicture(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  cropSource.value = URL.createObjectURL(file);
  isCropOpen.value = true;
}
function applyCrop(file: File) {
  clearPreview();
  previewUrl = URL.createObjectURL(file);
  preview.value = previewUrl;
  form.value.profile_picture = file;
}
function closeCrop() {
  isCropOpen.value = false;
  if (cropSource.value) URL.revokeObjectURL(cropSource.value);
  cropSource.value = '';
}
async function checkUsername(): Promise<boolean> {
  const username = form.value.username.trim();
  if (username.length < 3) {
    usernameStatus.value = 'idle';
    return false;
  }
  usernameStatus.value = 'checking';
  try {
    const available = await props.checkUsername(username);
    usernameStatus.value = available ? 'available' : 'taken';
    return available;
  } catch {
    usernameStatus.value = 'error';
    return false;
  }
}
async function sendCode() {
  if (!form.value.username || !form.value.email || !form.value.password || !form.value.country_id) {
    error.value = 'required_fields';
    return;
  }
  const usernameAvailable = await checkUsername();
  if (!usernameAvailable) {
    error.value = usernameStatus.value === 'taken' ? 'username_unavailable' : 'username_error';
    return;
  }
  isLoading.value = true;
  error.value = '';
  try {
    await props.requestCode(form.value.email, form.value.language_code);
    phase.value = 'verification';
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'registration_failed';
  } finally { isLoading.value = false; }
}
async function completeRegistration() {
  if (!/^\d{6}$/.test(verificationCode.value)) { error.value = 'verification_code_required'; return; }
  isLoading.value = true;
  error.value = '';
  try {
    const token = await props.verifyCode(form.value.email, verificationCode.value);
    await props.register(form.value, token);
    emit('complete');
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'registration_failed';
  } finally { isLoading.value = false; }
}
</script>

<template>
  <main class="auth-page">
    <a class="auth-logo" href="/" :aria-label="$t('app_name')"><span class="auth-logo-mark">S</span><span class="auth-title">{{ $t('app_name') }}</span></a>
    <section class="auth-wrapper">
      <aside class="auth-visual" aria-hidden="true"><img :src="bibleIllustration" alt="" class="auth-illustration" /></aside>
      <section class="auth-card-v2 auth-card-scroll">
        <form class="auth-card" @submit.prevent="phase === 'details' ? sendCode() : completeRegistration()">
          <header>
            <h1>{{ $t(phase === 'details' ? 'registration_title' : 'verification_title') }}</h1>
            <p>{{ $t(phase === 'details' ? 'registration_subtitle' : 'verification_subtitle', { email: form.email }) }}</p>
          </header>
          <template v-if="phase === 'details'">
            <label class="profile-picture-field"><span>{{ $t('profile_picture_optional') }}</span><span class="profile-picture-picker"><img v-if="preview" :src="preview" :alt="$t('profile_picture')" class="profile-picture-preview" /><span v-else class="profile-picture-placeholder">{{ $t('profile_picture') }}</span><span class="profile-picture-button">{{ $t(preview ? 'change_picture' : 'choose_picture') }}</span><input accept="image/jpeg,image/png,image/webp,image/gif" class="profile-picture-input" type="file" @change="selectPicture" /></span></label>
            <label><span>{{ $t('username') }}</span><input v-model="form.username" autocomplete="username" minlength="3" maxlength="120" required @blur="checkUsername" @input="usernameStatus = 'idle'" /></label>
            <p v-if="usernameStatusMessage" :class="['field-message', usernameStatus]">{{ $t(usernameStatusMessage) }}</p>
            <label><span>{{ $t('email') }}</span><input v-model="form.email" autocomplete="email" type="email" required /></label>
            <label><span>{{ $t('password') }}</span><span class="password-field"><input v-model="form.password" autocomplete="new-password" :type="isPasswordVisible ? 'text' : 'password'" minlength="8" required /><button type="button" class="password-toggle password-visibility-toggle" :aria-label="$t(isPasswordVisible ? 'hide_password' : 'show_password')" @click="isPasswordVisible = !isPasswordVisible"><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.75" /><path v-if="isPasswordVisible" d="M4 4l16 16" /></svg></button></span></label>
            <div class="form-grid auth-form-grid">
              <label><span>{{ $t('game_language') }}</span><select v-model="form.language_code"><option value="pt-BR">{{ $t('language_pt') }}</option><option value="en">{{ $t('language_en') }}</option><option value="es">{{ $t('language_es') }}</option></select></label>
              <label><span>{{ $t('country_of_origin') }}</span><select v-model="form.country_id" required><option disabled value="">{{ $t('select_country') }}</option><option v-for="country in countries" :key="country.id" :value="country.id">{{ country.name }} ({{ country.iso_code }})</option></select></label>
            </div>
          </template>
          <template v-else>
            <label><span>{{ $t('verification_code') }}</span><input v-model="verificationCode" autocomplete="one-time-code" inputmode="numeric" maxlength="6" required /></label>
            <v-btn class="auth-link-button" type="button" variant="text" @click="sendCode">{{ $t('resend_code') }}</v-btn>
            <v-btn class="auth-link-button" type="button" variant="text" @click="phase = 'details'; verificationCode = ''; error = ''">{{ $t('change_email') }}</v-btn>
          </template>
          <p v-if="error" class="form-error" role="alert">{{ error.includes(' ') ? error : $t(error) }}</p>
          <v-btn class="login-button" color="primary" type="submit" variant="flat" :disabled="usernameStatus === 'taken' || usernameStatus === 'checking'" :loading="isLoading" block>{{ $t(isLoading ? 'loading' : submitLabel) }}</v-btn>
          <v-btn class="auth-link-button" type="button" variant="text" @click="emit('login')">{{ $t('already_have_account') }}</v-btn>
        </form>
      </section>
    </section>
  </main>
  <ImageCropDialog v-model="isCropOpen" :source="cropSource" @crop="applyCrop" @update:model-value="!$event && closeCrop()" />
</template>
