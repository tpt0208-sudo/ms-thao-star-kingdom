import React from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { ClassInfo } from '../types';

interface HeroBannerProps {
  classInfo: ClassInfo;
  onChangeCover?: () => void;
  isTeacher?: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  classInfo,
  onChangeCover,
  isTeacher = true,
}) => {
  const customCover = classInfo.coverUrl;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-md border-2 border-sky-200/80 group">
      {/* If teacher uploaded a custom cover, show ONLY the image cleanly with NO text overlay! */}
      {customCover ? (
        <div className="relative w-full overflow-hidden flex items-center justify-center bg-slate-50">
          <img
            src={customCover}
            alt="Ms. Thao's Star Kingdom Banner"
            className="w-full h-auto object-cover max-h-[340px] select-none block"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        /* The authentic Fairytale Castle banner from Mockup */
        <div className="relative w-full overflow-hidden">
          <img
            src="/assets/kingdom/hero_banner.png"
            alt="Ms. Thao's Star Kingdom Castle"
            className="w-full h-auto object-cover max-h-[340px] select-none block"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Change Cover Photo Trigger Button (Only visible to teacher) */}
      {isTeacher && onChangeCover && (
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={onChangeCover}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/95 hover:bg-white text-[#263C72] shadow-md border border-sky-300 transition cursor-pointer backdrop-blur-xs"
            title="Đổi ảnh bìa lâu đài tùy chỉnh / Change custom castle cover"
          >
            <Camera className="w-4 h-4 text-sky-600 shrink-0" />
            <div className="text-left leading-tight">
              <span className="block text-[13px] font-black text-[#263C72]">Đổi ảnh bìa</span>
              <span className="block text-[11px] font-bold text-sky-700">Change Cover</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
