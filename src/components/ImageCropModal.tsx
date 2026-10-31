import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Upload, RotateCcw, Check, Sparkles, Image as ImageIcon } from 'lucide-react';

export interface ImagePreset {
  label: string;
  url: string;
}

interface ImageCropModalProps {
  title: string;
  subtitle?: string;
  currentImage?: string;
  defaultImage: string;
  shape?: 'circle' | 'rounded' | 'card';
  aspectRatio?: number;
  presets?: ImagePreset[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
  onResetDefault: () => Promise<void>;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  title,
  subtitle,
  currentImage,
  defaultImage,
  shape = 'circle',
  aspectRatio,
  presets = [],
  isOpen,
  onClose,
  onSave,
  onResetDefault,
}) => {
  const [imageSrc, setImageSrc] = useState<string>(currentImage || defaultImage);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCard = shape === 'card';
  const effectiveAspect = isCard ? (aspectRatio || 196 / 260) : 1;
  const previewW = isCard ? 200 : 220;
  const previewH = isCard ? Math.round(200 / effectiveAspect) : 220;

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setImageSrc(currentImage || defaultImage);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setError(null);
    }
  }, [isOpen, currentImage, defaultImage]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size <= 5MB
    if (file.size === 0) {
      setError('Tệp ảnh rỗng (0 byte). Vui lòng chọn tệp ảnh PNG, JPG hoặc WebP hợp lệ.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh tối đa là 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = ['png', 'jpg', 'jpeg', 'webp'];
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setError('Định dạng không hợp lệ. Vui lòng chỉ chọn ảnh PNG, JPG hoặc WebP.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        const resultDataUrl = evt.target.result;
        const probeImg = new Image();
        probeImg.onload = () => {
          setImageSrc(resultDataUrl);
          setZoom(1);
          setPan({ x: 0, y: 0 });
        };
        probeImg.onerror = () => {
          setError('Tệp ảnh bị lỗi hoặc không thể giải mã. Vui lòng chọn ảnh PNG, JPG hoặc WebP khác.');
        };
        probeImg.src = resultDataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  // Mouse / Touch drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleCropAndSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const canvas = document.createElement('canvas');
      const targetW = isCard ? 360 : 320;
      const targetH = isCard ? Math.round(360 / effectiveAspect) : 320;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (!ctx || !imageRef.current) {
        throw new Error('Canvas context not available');
      }

      // If circle shape, clip circle
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(targetW / 2, targetH / 2, targetW / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }

      const img = imageRef.current;

      // Draw transformed image
      ctx.save();
      ctx.translate(targetW / 2, targetH / 2);
      ctx.scale(zoom, zoom);
      ctx.translate((pan.x / previewW) * targetW, (pan.y / previewH) * targetH);

      // Maintain aspect ratio
      const naturalAspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      const targetAspect = targetW / targetH;
      let drawW = targetW;
      let drawH = targetH;
      if (naturalAspect > targetAspect) {
        drawW = targetH * naturalAspect;
        drawH = targetH;
      } else {
        drawW = targetW;
        drawH = targetW / naturalAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const outputDataUrl = canvas.toDataURL('image/png', 0.95);
      await onSave(outputDataUrl);
      onClose();
    } catch (err: unknown) {
      console.error('Error cropping image:', err);
      setError(err instanceof Error ? err.message : 'Lỗi khi xử lý hình ảnh');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-sky-100 flex flex-col justify-between max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div>
            <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-300" />
              <span>{title}</span>
            </h3>
            {subtitle && <p className="text-xs text-slate-500 font-semibold mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Interactive Viewport */}
        <div className="flex flex-col items-center">
          <p className="text-[11px] font-bold text-slate-500 mb-2">
            Kéo chuột / chạm để định vị • Dùng thanh trượt bên dưới để phóng to / thu nhỏ
          </p>

          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ width: `${previewW}px`, height: `${previewH}px` }}
            className={`relative bg-slate-900 overflow-hidden cursor-grab active:cursor-grabbing select-none border-4 border-white shadow-xl ${
              shape === 'circle' ? 'rounded-full ring-4 ring-sky-300' : 'rounded-3xl ring-4 ring-sky-200'
            }`}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              className="w-full h-full object-cover pointer-events-none transition-transform duration-75"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultImage;
              }}
            />

            {/* Inner guideline border */}
            <div
              className={`absolute inset-0 pointer-events-none border border-white/40 ${
                shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
              }`}
            />
          </div>

          {/* Zoom Slider */}
          <div className="w-full max-w-xs mt-3 flex items-center gap-3 px-2">
            <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-sky-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="text-[10px] font-black text-slate-500 w-8 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Presets Chips if provided */}
        {presets && presets.length > 0 && (
          <div className="w-full mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
                <span>Gợi ý mẫu ảnh đẹp ({presets.length}):</span>
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setImageSrc(preset.url);
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition ${
                    imageSrc === preset.url
                      ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300'
                  }`}
                >
                  <img src={preset.url} alt={preset.label} className="w-5 h-5 rounded-md object-cover border border-white/80" />
                  <span className="truncate max-w-[130px]">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload and Reset Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex-1 py-2 px-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-black border border-sky-200 flex items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4 text-sky-600" />
              <span>Tải ảnh mới từ máy</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={async () => {
                if (window.confirm('Khôi phục ảnh về mặc định ban đầu?')) {
                  await onResetDefault();
                  onClose();
                }
              }}
              className="py-2 px-3 rounded-2xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-pointer transition"
              title="Khôi phục ảnh ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mặc định</span>
            </button>
          </div>

          {/* Confirm & Cancel Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleCropAndSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{saving ? 'Đang lưu ảnh...' : 'Lưu ảnh đại diện'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
