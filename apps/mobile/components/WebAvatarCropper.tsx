import { useRef, useState, type PointerEvent } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import type { ProfilePicture } from '../types/auth';

type AvatarCropperProps = {
  picture: ProfilePicture;
  onCancel: () => void;
  onConfirm: (picture: ProfilePicture) => void;
};

const CANVAS_SIZE = 512;
const MIN_CROP_SIZE = 64;

type Crop = { x: number; y: number; size: number };
type Drag = {
  mode: 'move' | 'resize';
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startCrop: Crop;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cropFileName(name: string) {
  const baseName = name.replace(/\.[^/.]+$/, '') || 'profile';
  return `${baseName}-cropped.png`;
}

export function AvatarCropper({
  picture,
  onCancel,
  onConfirm,
}: AvatarCropperProps) {
  const { t } = useLocalization();
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [saving, setSaving] = useState(false);

  const startDrag = (
    mode: Drag['mode'],
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (!crop) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCrop: crop,
    };
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const image = imageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !image || !imageSize)
      return;

    const scale = image.getBoundingClientRect().width / imageSize.width;
    const deltaX = (event.clientX - drag.startClientX) / scale;
    const deltaY = (event.clientY - drag.startClientY) / scale;
    if (drag.mode === 'move') {
      setCrop({
        ...drag.startCrop,
        x: clamp(
          drag.startCrop.x + deltaX,
          0,
          imageSize.width - drag.startCrop.size
        ),
        y: clamp(
          drag.startCrop.y + deltaY,
          0,
          imageSize.height - drag.startCrop.size
        ),
      });
      return;
    }

    const maximumSize = Math.min(
      imageSize.width - drag.startCrop.x,
      imageSize.height - drag.startCrop.y
    );
    setCrop({
      ...drag.startCrop,
      size: clamp(
        drag.startCrop.size + Math.max(deltaX, deltaY),
        MIN_CROP_SIZE,
        maximumSize
      ),
    });
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const confirm = async () => {
    const image = imageRef.current;
    if (!image || !crop) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.size,
        crop.size,
        0,
        0,
        CANVAS_SIZE,
        CANVAS_SIZE
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) return;
      const name = cropFileName(picture.name);
      onConfirm({
        uri: URL.createObjectURL(blob),
        name,
        type: 'image/png',
        file: new File([blob], name, { type: 'image/png' }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true">
      <div style={styles.dialog}>
        <h2 style={styles.title}>{t('cropPhoto')}</h2>
        <div style={styles.previewFrame}>
          <img
            alt=""
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              const size = Math.floor(
                Math.min(image.naturalWidth, image.naturalHeight) * 0.8
              );
              setImageSize({
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
              setCrop({
                size,
                x: Math.floor((image.naturalWidth - size) / 2),
                y: Math.floor((image.naturalHeight - size) / 2),
              });
            }}
            ref={imageRef}
            src={picture.uri}
            style={styles.image}
          />
          {crop && imageSize ? (
            <div
              aria-label={t('cropPhoto')}
              onPointerCancel={endDrag}
              onPointerDown={(event) => startDrag('move', event)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              role="group"
              style={{
                ...styles.cropBox,
                height: `${(crop.size / imageSize.height) * 100}%`,
                left: `${(crop.x / imageSize.width) * 100}%`,
                top: `${(crop.y / imageSize.height) * 100}%`,
                width: `${(crop.size / imageSize.width) * 100}%`,
              }}
            >
              <div
                aria-label={t('cropPhoto')}
                onPointerCancel={endDrag}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  startDrag('resize', event);
                }}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                style={styles.resizeHandle}
              />
            </div>
          ) : null}
        </div>
        <p style={styles.hint}>{t('cropHint')}</p>
        <div style={styles.actions}>
          <button disabled={saving} onClick={onCancel} style={styles.secondary}>
            {t('cancel')}
          </button>
          <button
            disabled={saving}
            onClick={() => void confirm()}
            style={styles.primary}
          >
            {t('confirmCrop')}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    inset: 0,
    justifyContent: 'center',
    padding: 20,
    position: 'fixed',
    zIndex: 1000,
  },
  dialog: {
    background: '#fffaf2',
    borderRadius: 12,
    boxSizing: 'border-box',
    color: '#342016',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxHeight: '100%',
    maxWidth: 420,
    overflow: 'auto',
    padding: 20,
    width: '100%',
  },
  title: { fontSize: 22, margin: 0 },
  previewFrame: {
    alignSelf: 'center',
    background: '#eee',
    borderRadius: 12,
    display: 'inline-block',
    maxHeight: 280,
    maxWidth: 280,
    overflow: 'hidden',
    position: 'relative',
    touchAction: 'none',
  },
  image: {
    display: 'block',
    maxHeight: 280,
    maxWidth: '72vw',
    userSelect: 'none',
  },
  cropBox: {
    border: '2px solid #ffffff',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.48)',
    boxSizing: 'border-box',
    cursor: 'move',
    position: 'absolute',
    touchAction: 'none',
  },
  resizeHandle: {
    background: '#8c5525',
    border: '2px solid #ffffff',
    borderRadius: '50%',
    bottom: -12,
    cursor: 'nwse-resize',
    height: 22,
    position: 'absolute',
    right: -12,
    touchAction: 'none',
    width: 22,
  },
  hint: { margin: 0, textAlign: 'center' },
  actions: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
  secondary: {
    background: '#fffaf2',
    border: '1px solid #8c5525',
    borderRadius: 8,
    color: '#8c5525',
    fontWeight: 700,
    padding: '10px 14px',
  },
  primary: {
    background: '#8c5525',
    border: '1px solid #8c5525',
    borderRadius: 8,
    color: '#ffffff',
    fontWeight: 700,
    padding: '10px 14px',
  },
};
