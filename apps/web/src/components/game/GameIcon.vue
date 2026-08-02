<script setup lang="ts">
defineProps<{ name: 'level' | 'score' | 'time' | 'correct' | 'wrong' | 'skip' | 'eliminate' | 'reveal' | 'trophy' | 'celebration' | 'items' }>();
</script>

<template>
  <svg class="game-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path v-if="name === 'level'" d="M3 18h4V6H3v12Zm7 0h4V3h-4v15Zm7 0h4V10h-4v8Z" />
    <path v-else-if="name === 'score' || name === 'celebration'" d="m12 2 1.7 5.3L19 5.5l-1.8 5.2L22 12l-4.8 1.3L19 18.5l-5.3-1.8L12 22l-1.7-5.3L5 18.5l1.8-5.2L2 12l4.8-1.3L5 5.5l5.3 1.8L12 2Z" />
    <path v-else-if="name === 'time'" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 11.4-4.2-2.5 1-1.7 2.2 1.3V6h2v7.4Z" />
    <path v-else-if="name === 'correct'" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-2 15-4-4 1.4-1.4 2.6 2.6 5.6-5.6L17 10l-7 7Z" />
    <path v-else-if="name === 'wrong'" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm4.3 13-1.4 1.3-2.9-2.8-2.9 2.8L7.7 15l2.9-3-2.9-3 1.4-1.3 2.9 2.8 2.9-2.8L16.3 9l-2.9 3 2.9 3Z" />
    <path v-else-if="name === 'skip'" d="M4 4h2v6.5c0 2.5 1.7 4.5 4 4.5h1v-3l5 4-5 4v-3h-1c-3.4 0-6-2.9-6-6.5V4Zm12 0h2v5.5c0 .8-.2 1.6-.5 2.3l-1.7-1.4c.1-.3.2-.6.2-.9V4Z" />
    <path v-else-if="name === 'eliminate' || name === 'items'" d="M4 4h16v16H4V4Zm3 3v10h10V7H7Zm2 2h6v2H9V9Zm0 4h6v2H9v-2Z" />
    <path v-else-if="name === 'reveal'" d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Zm2 18H10v2h4v-2Zm-3-7.5a2 2 0 1 1 2 0c-.7.5-1 1-1 2.5h-2c0-1.8.5-3 1-3.5Z" />
    <path v-else d="M6 3h12v4h3v4c0 3-2.3 5-5 5h-1.2A5 5 0 0 1 13 18.7V21h4v2H7v-2h4v-2.3A5 5 0 0 1 9.2 16H8c-2.7 0-5-2-5-5V7h3V3Zm12 6v2c0 1.4-.8 2.5-2 2.9V9h2ZM6 9H5v2c0 1.4.8 2.5 2 2.9V9H6Z" />
  </svg>
</template>

<style scoped>
.game-icon { fill: currentColor; flex: 0 0 auto; height: 26px; width: 26px; }
</style>
