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
const minimumSelectionSize = 64;
const image = ref<HTMLImageElement | null>(null);
const naturalSize = ref({ width: 0, height: 0 });
const selection = ref({ x: 28, y: 28, size: 224 });
const pointerStart = ref<{
  x: number;
  y: number;
  mode: 'move' | 'resize';
} | null>(null);
const selectionStart = ref({ x: 28, y: 28, size: 224 });

const baseScale = computed(() => {
  if (!naturalSize.value.width || !naturalSize.value.height) return 1;
  return Math.max(
    cropSize / naturalSize.value.width,
    cropSize / naturalSize.value.height
  );
});
const renderedSize = computed(() => ({
  width: naturalSize.value.width * baseScale.value,
  height: naturalSize.value.height * baseScale.value,
}));
const imageStyle = computed(() => ({
  width: `${renderedSize.value.width}px`,
  height: `${renderedSize.value.height}px`,
  left: `${cropSize / 2}px`,
  top: `${cropSize / 2}px`,
}));

watch(
  () => [props.modelValue, props.source],
  ([visible]) => {
    if (!visible) return;
    selection.value = { x: 28, y: 28, size: 224 };
    naturalSize.value = { width: 0, height: 0 };
  }
);

function onImageLoad() {
  if (!image.value) return;
  naturalSize.value = {
    width: image.value.naturalWidth,
    height: image.value.naturalHeight,
  };
}

function startDrag(event: PointerEvent, mode: 'move' | 'resize') {
  pointerStart.value = {
    x: event.clientX,
    y: event.clientY,
    mode,
  };
  selectionStart.value = { ...selection.value };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function drag(event: PointerEvent) {
  const start = pointerStart.value;
  if (!start) return;
  const deltaX = event.clientX - start.x;
  const deltaY = event.clientY - start.y;
  if (start.mode === 'resize') {
    const maximumSize = Math.min(
      cropSize - selectionStart.value.x,
      cropSize - selectionStart.value.y
    );
    selection.value = {
      ...selectionStart.value,
      size: Math.min(
        maximumSize,
        Math.max(
          minimumSelectionSize,
          selectionStart.value.size + Math.max(deltaX, deltaY)
        )
      ),
    };
    return;
  }
  selection.value = {
    ...selectionStart.value,
    x: Math.min(
      cropSize - selectionStart.value.size,
      Math.max(0, selectionStart.value.x + deltaX)
    ),
    y: Math.min(
      cropSize - selectionStart.value.size,
      Math.max(0, selectionStart.value.y + deltaY)
    ),
  };
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

  const left = cropSize / 2 - renderedSize.value.width / 2;
  const top = cropSize / 2 - renderedSize.value.height / 2;
  const sourceX = (-left / renderedSize.value.width) * naturalSize.value.width;
  const sourceY = (-top / renderedSize.value.height) * naturalSize.value.height;
  const cropSourceX =
    sourceX +
    (selection.value.x / renderedSize.value.width) * naturalSize.value.width;
  const cropSourceY =
    sourceY +
    (selection.value.y / renderedSize.value.height) * naturalSize.value.height;
  const cropSourceSize =
    (selection.value.size / renderedSize.value.width) * naturalSize.value.width;

  context.drawImage(
    image.value,
    cropSourceX,
    cropSourceY,
    cropSourceSize,
    cropSourceSize,
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
          <div
            :aria-label="$t('crop_selection')"
            class="crop-selection"
            role="group"
            :style="{
              height: `${selection.size}px`,
              left: `${selection.x}px`,
              top: `${selection.y}px`,
              width: `${selection.size}px`,
            }"
            @pointerdown="startDrag($event, 'move')"
            @pointermove="drag"
            @pointerup="endDrag"
            @pointercancel="endDrag"
          >
            <span
              :aria-label="$t('resize_crop')"
              class="crop-resize-handle"
              @pointerdown.stop="startDrag($event, 'resize')"
              @pointermove.stop="drag"
              @pointerup.stop="endDrag"
              @pointercancel.stop="endDrag"
            />
          </div>
        </div>
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
  height: 280px;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
  touch-action: none;
  user-select: none;
  width: 280px;
}
.crop-frame img {
  max-width: none;
  position: absolute;
  transform: translate(-50%, -50%);
}
.crop-selection {
  border: 2px solid #fff;
  box-shadow: 0 0 0 999px rgb(0 0 0 / 45%);
  cursor: grab;
  position: absolute;
  touch-action: none;
}
.crop-selection:active { cursor: grabbing; }
.crop-resize-handle {
  background: #7f4f24;
  border: 2px solid #fff;
  border-radius: 50%;
  bottom: -11px;
  cursor: nwse-resize;
  height: 20px;
  position: absolute;
  right: -11px;
  width: 20px;
}
</style>
