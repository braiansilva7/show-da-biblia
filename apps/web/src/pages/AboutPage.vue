<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import GameIcon from '@/components/game/GameIcon.vue';
import {
  getPayPalDonationUrl,
  isPayPalDonationUrl,
  openPayPalDonation,
} from '@/utils/paypalDonation';

const { locale } = useI18n();
const supportEmail = 'grupo5developer@gmail.com';
const donationError = ref(false);
const donationUrl = computed(() => getPayPalDonationUrl(locale.value as 'pt' | 'en' | 'es'));
const donationAvailable = computed(() => isPayPalDonationUrl(donationUrl.value));
function donate() {
  donationError.value = !openPayPalDonation(donationUrl.value);
}
</script>

<template>
  <section class="page-content about-page">
    <div class="page-heading"><div><p class="eyebrow">{{ $t('about') }}</p><h1>{{ $t('about_title') }}</h1></div></div>
    <article class="about-copy"><p>{{ $t('about_mission') }}</p><p>{{ $t('about_collaboration') }}</p></article>
    <article class="contact-card"><GameIcon name="reveal" /><div><p>{{ $t('about_contact') }}</p><a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a></div></article>
    <article class="donation-card"><GameIcon name="celebration" /><div><h2>{{ $t('about_support_title') }}</h2><p>{{ $t('about_support_description') }}</p></div><v-btn color="primary" :disabled="!donationAvailable" @click="donate">{{ $t('donate') }}</v-btn><p v-if="!donationAvailable" class="status-message">{{ $t('donation_unavailable') }}</p><p v-else-if="donationError" class="form-error">{{ $t('donation_error') }}</p></article>
  </section>
</template>

<style scoped>
.about-page{display:grid;gap:1.25rem;max-width:820px}.page-heading{margin:0}.about-copy{display:grid;gap:1rem}.about-copy p{color:#5d596c;font-size:1rem;line-height:1.6;margin:0;text-align:justify}.contact-card,.donation-card{align-items:flex-start;border-radius:12px;display:grid;gap:1rem;padding:1.5rem}.contact-card{background:#fff;border:1px solid #e7e5ef;grid-template-columns:auto 1fr}.contact-card .game-icon{color:#7f4f24}.contact-card p{margin:0 0 .35rem}.contact-card a{color:#7f4f24;font-weight:800}.donation-card{background:#f7e9d6;border:1px solid #7f4f24;grid-template-columns:auto 1fr}.donation-card>.game-icon{color:#7f4f24}.donation-card h2,.donation-card p{margin:0}.donation-card h2{font-size:1.3rem}.donation-card p{line-height:1.5}.donation-card .v-btn,.status-message,.form-error{grid-column:2}.status-message{color:#797586;margin:0}@media(max-width:599px){.contact-card,.donation-card{grid-template-columns:1fr}.donation-card .v-btn,.status-message,.form-error{grid-column:auto}}
</style>
