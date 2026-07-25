<script setup lang="ts">
import type { Category } from '@/types/category';
defineProps<{ category: Category | null; isDeleting: boolean }>();
const emit = defineEmits<{ close: []; confirm: [] }>();
</script>

<template>
  <v-dialog :model-value="category !== null" max-width="460" persistent @update:model-value="(visible) => { if (!visible && !isDeleting) emit('close'); }">
    <v-card class="delete-dialog-card"><v-card-title>{{ $t('delete_category_question') }}</v-card-title><v-card-text>{{ $t('delete_category_confirmation', { name: category?.name }) }}</v-card-text><v-card-actions><v-spacer /><v-btn variant="text" :disabled="isDeleting" @click="emit('close')">{{ $t('cancel') }}</v-btn><v-btn color="error" variant="flat" :loading="isDeleting" @click="emit('confirm')">{{ $t('delete') }}</v-btn></v-card-actions></v-card>
  </v-dialog>
</template>
