<script setup lang="ts">
import { computed, ref } from 'vue';
import bibleIllustration from '@/assets/images/illustrations/bible.png';

const props = defineProps<{
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<string>;
  resetPassword: (token: string, password: string, confirmation: string) => Promise<void>;
}>();
const emit = defineEmits<{ login: [success: boolean] }>();
const step = ref<'email' | 'code' | 'password'>('email');
const email = ref('');
const code = ref('');
const password = ref('');
const confirmation = ref('');
const isPasswordVisible = ref(false);
const isConfirmationVisible = ref(false);
const resetToken = ref('');
const error = ref('');
const message = ref('');
const isLoading = ref(false);
const description = computed(() => `password_recovery_${step.value}_description`);
const submitLabel = computed(() => ({ email: 'send_code', code: 'verify_code', password: 'reset_password' })[step.value]);
const confirmationMismatch = computed(() => step.value === 'password' && Boolean(confirmation.value) && password.value !== confirmation.value);

async function submit() {
  isLoading.value = true;
  error.value = '';
  message.value = '';
  try {
    if (step.value === 'email') {
      if (!email.value.trim()) throw new Error('required_fields');
      await props.sendCode(email.value);
      message.value = 'password_reset_code_sent';
      step.value = 'code';
      return;
    }
    if (step.value === 'code') {
      if (!/^\d{6}$/.test(code.value)) throw new Error('verification_code_required');
      resetToken.value = await props.verifyCode(email.value, code.value);
      step.value = 'password';
      return;
    }
    if (!password.value || !confirmation.value) throw new Error('required_fields');
    if (password.value !== confirmation.value) throw new Error('passwords_do_not_match');
    await props.resetPassword(resetToken.value, password.value, confirmation.value);
    resetToken.value = '';
    password.value = '';
    confirmation.value = '';
    emit('login', true);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'password_recovery_failed';
  } finally { isLoading.value = false; }
}
async function resendCode() {
  isLoading.value = true;
  error.value = '';
  try {
    await props.sendCode(email.value);
    message.value = 'password_reset_code_sent';
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'password_recovery_failed';
  } finally { isLoading.value = false; }
}
</script>

<template>
  <main class="auth-page">
    <a class="auth-logo" href="/" :aria-label="$t('app_name')"><span class="auth-logo-mark">S</span><span class="auth-title">{{ $t('app_name') }}</span></a>
    <section class="auth-wrapper">
      <aside class="auth-visual" aria-hidden="true"><img :src="bibleIllustration" alt="" class="auth-illustration" /></aside>
      <section class="auth-card-v2">
        <form class="auth-card" @submit.prevent="submit">
          <header><h1>{{ $t('password_recovery_title') }}</h1><p>{{ $t(description) }}</p></header>
          <label v-if="step === 'email'"><span>{{ $t('email') }}</span><input v-model="email" autocomplete="email" type="email" required /></label>
          <label v-if="step === 'code'"><span>{{ $t('recovery_code') }}</span><input v-model="code" autocomplete="one-time-code" inputmode="numeric" maxlength="6" required /></label>
          <template v-if="step === 'password'">
            <label><span>{{ $t('new_password') }}</span><span class="password-field"><input v-model="password" autocomplete="new-password" :type="isPasswordVisible ? 'text' : 'password'" minlength="8" required /><button type="button" class="password-toggle password-visibility-toggle" :aria-label="$t(isPasswordVisible ? 'hide_password' : 'show_password')" @click="isPasswordVisible = !isPasswordVisible"><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.75" /><path v-if="isPasswordVisible" d="M4 4l16 16" /></svg></button></span></label>
            <label><span>{{ $t('confirm_password') }}</span><span class="password-field"><input v-model="confirmation" autocomplete="new-password" :type="isConfirmationVisible ? 'text' : 'password'" :aria-invalid="confirmationMismatch" aria-describedby="password-confirmation-error" required /><button type="button" class="password-toggle password-visibility-toggle" :aria-label="$t(isConfirmationVisible ? 'hide_password' : 'show_password')" @click="isConfirmationVisible = !isConfirmationVisible"><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.75" /><path v-if="isConfirmationVisible" d="M4 4l16 16" /></svg></button></span></label>
            <p v-if="confirmationMismatch" id="password-confirmation-error" class="form-error" role="alert">{{ $t('passwords_do_not_match') }}</p>
          </template>
          <p v-if="message" class="form-success" role="status">{{ $t(message) }}</p>
          <p v-if="error" class="form-error" role="alert">{{ error.includes(' ') ? error : $t(error) }}</p>
          <v-btn class="login-button" color="primary" type="submit" variant="flat" :loading="isLoading" block>{{ $t(isLoading ? 'loading' : submitLabel) }}</v-btn>
          <v-btn v-if="step === 'code'" class="auth-link-button" type="button" variant="text" @click="resendCode">{{ $t('resend_code') }}</v-btn>
          <v-btn class="auth-link-button" type="button" variant="text" @click="emit('login', false)">{{ $t('back_to_login') }}</v-btn>
        </form>
      </section>
    </section>
  </main>
</template>
