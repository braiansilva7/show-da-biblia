<script setup lang="ts">
import { ref } from 'vue';
import bibleIllustration from '@/assets/images/illustrations/bible.png';

defineProps<{ error: string; notice: string; isSubmitting: boolean }>();
const emit = defineEmits<{
  submit: [credentials: { email: string; password: string }];
  register: [];
  forgotPassword: [];
}>();
const email = ref('');
const password = ref('');
const isPasswordVisible = ref(false);
const isEmailLocked = ref(true);
const isPasswordLocked = ref(true);

function submit() {
  emit('submit', { email: email.value, password: password.value });
}
</script>

<template>
  <main class="auth-page">
    <a class="auth-logo" href="/" :aria-label="$t('app_name')"
      ><span class="auth-logo-mark" aria-hidden="true">S</span
      ><span class="auth-title">{{ $t('app_name') }}</span></a
    >
    <section class="auth-wrapper">
      <aside class="auth-visual" aria-hidden="true">
        <img :src="bibleIllustration" alt="" class="auth-illustration" />
      </aside>
      <section class="auth-card-v2" aria-labelledby="login-title">
        <form class="auth-card" autocomplete="off" @submit.prevent="submit">
          <header>
            <h1 id="login-title">
              {{ $t('login_title', { app: $t('app_name') }) }}
            </h1>
            <p>{{ $t('login_subtitle') }}</p>
          </header>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <p v-if="notice" class="form-success" role="status">{{ notice }}</p>
          <label
            ><span>{{ $t('email') }}</span
            ><input
              v-model="email"
              autocomplete="off"
              inputmode="email"
              :placeholder="$t('email_placeholder')"
              :readonly="isEmailLocked"
              type="email"
              @focus="isEmailLocked = false"
              @pointerdown="isEmailLocked = false"
          /></label>
          <label
            ><span>{{ $t('password') }}</span
            ><span class="password-field"
              ><input
                v-model="password"
                autocomplete="off"
                placeholder="············"
                :readonly="isPasswordLocked"
                :type="isPasswordVisible ? 'text' : 'password'"
                @focus="isPasswordLocked = false"
                @pointerdown="isPasswordLocked = false"
              /><button
                type="button"
                class="password-toggle password-visibility-toggle"
                :aria-label="$t(isPasswordVisible ? 'hide_password' : 'show_password')"
                @click="isPasswordVisible = !isPasswordVisible"
              ><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.75" /><path v-if="isPasswordVisible" d="M4 4l16 16" /></svg></button></span
            ></label
          >
          <v-btn
            class="login-button"
            color="primary"
            type="submit"
            variant="flat"
            :loading="isSubmitting"
            block
            >{{ $t(isSubmitting ? 'logging_in' : 'login') }}</v-btn
          >
          <v-btn class="auth-link-button" type="button" variant="text" @click="emit('forgotPassword')">
            {{ $t('forgot_password') }}
          </v-btn>
          <v-btn class="auth-link-button" type="button" variant="text" @click="emit('register')">
            {{ $t('create_account') }}
          </v-btn>
        </form>
      </section>
    </section>
  </main>
</template>
