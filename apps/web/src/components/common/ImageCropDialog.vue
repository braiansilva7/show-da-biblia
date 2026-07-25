<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  source: string;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  crop: [file: File];
}>();

const cropSize = 280;
const image = ref<HTMLImageElement | null>(null);
const naturalSize = ref({ width: 0, height: 0 });
const zoom = ref(1);
const offset = ref({ x: 0, y: 0 });
const pointerStart = ref<{ x: number; y: number } | null>(null);
const offsetStart = ref({ x: 0, y: 0 });

const baseScale = computed(() => {
  if (!naturalSize.value.width || !naturalSize.value.height) return 1;
  return Math.max(
    cropSize / naturalSize.value.width,
    cropSize / naturalSize.value.height
  );
});
const renderedSize = computed(() => ({
  width: naturalSize.value.width * baseScale.value * zoom.value,
  height: naturalSize.value.height * baseScale.value * zoom.value,
}));
const imageStyle = computed(() => ({
  width: `${renderedSize.value.width}px`,
  height: `${renderedSize.value.height}px`,
  left: `${cropSize / 2 + offset.value.x}px`,
  top: `${cropSize / 2 + offset.value.y}px`,
}));

watch(
  () => [props.modelValue, props.source],
  ([visible]) => {
    if (!visible) return;
    zoom.value = 1;
    offset.value = { x: 0, y: 0 };
    naturalSize.value = { width: 0, height: 0 };
  }
);

function constrainOffset() {
  const maxX = Math.max(0, (renderedSize.value.width - cropSize) / 2);
  const maxY = Math.max(0, (renderedSize.value.height - cropSize) / 2);
  offset.value = {
    x: Math.max(-maxX, Math.min(maxX, offset.value.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.value.y)),
  };
}

function onImageLoad() {
  if (!image.value) return;
  naturalSize.value = {
    width: image.value.naturalWidth,
    height: image.value.naturalHeight,
  };
  constrainOffset();
}

function onZoom() {
  constrainOffset();
}

function startDrag(event: PointerEvent) {
  pointerStart.value = { x: event.clientX, y: event.clientY };
  offsetStart.value = { ...offset.value };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function drag(event: PointerEvent) {
  if (!pointerStart.value) return;
  offset.value = {
    x: offsetStart.value.x + event.clientX - pointerStart.value.x,
    y: offsetStart.value.y + event.clientY - pointerStart.value.y,
  };
  constrainOffset();
}

function endDrag() {
  pointerStart.value = null;
}

function close() {
  emit('update:modelValue', false);
}

function crop() {
  if (!image.value || !naturalSize.value.width) return;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return;

  const left = cropSize / 2 + offset.value.x - renderedSize.value.width / 2;
  const top = cropSize / 2 + offset.value.y - renderedSize.value.height / 2;
  const sourceX = (-left / renderedSize.value.width) * naturalSize.value.width;
  const sourceY = (-top / renderedSize.value.height) * naturalSize.value.height;
  const sourceWidth =
    (cropSize / renderedSize.value.width) * naturalSize.value.width;
  const sourceHeight =
    (cropSize / renderedSize.value.height) * naturalSize.value.height;

  context.drawImage(
    image.value,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      emit(
        'crop',
        new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' })
      );
      close();
    },
    'image/jpeg',
    0.9
  );
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="460"
    persistent
    @update:model-value="close"
  >
    <v-card class="crop-dialog">
      <v-card-title>{{ $t('crop_profile_picture') }}</v-card-title>
      <v-card-text>
        <p>{{ $t('crop_profile_picture_hint') }}</p>
        <div
          class="crop-frame"
          @pointerdown="startDrag"
          @pointermove="drag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <img
            v-if="source"
            ref="image"
            :src="source"
            :style="imageStyle"
            alt=""
            draggable="false"
            @load="onImageLoad"
          />
        </div>
        <label class="crop-zoom"
          ><span>{{ $t('zoom') }}</span
          ><input
            v-model.number="zoom"
            max="3"
            min="1"
            step="0.05"
            type="range"
            @input="onZoom"
        /></label>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="outlined" @click="close">{{ $t('cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="crop">{{
          $t('apply_crop')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.crop-dialog p {
  color: #797586;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
.crop-frame {
  background: #f4f3f8;
  cursor: grab;
  height: 280px;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
  touch-action: none;
  user-select: none;
  width: 280px;
}
.crop-frame:active {
  cursor: grabbing;
}
.crop-frame img {
  max-width: none;
  position: absolute;
  transform: translate(-50%, -50%);
}
.crop-zoom {
  align-items: center;
  display: flex;
  gap: 1rem;
  margin: 1rem auto 0;
  max-width: 280px;
}
.crop-zoom input {
  flex: 1;
}
</style>
