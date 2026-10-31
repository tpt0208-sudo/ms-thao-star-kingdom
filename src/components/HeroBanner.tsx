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
      {/* If teacher uploaded a custom cover, show it. Otherwise show the exact Star Kingdom Fairytale Castle artwork! */}
      {customCover ? (
        <div
          className="w-full min-h-[220px] md:min-h-[280px] bg-cover bg-center flex items-center p-6 sm:p-8 relative"
          style={{ backgroundImage: `url(${customCover})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent"></div>
          <div className="relative z-10 max-w-lg">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#D97706] tracking-tight drop-shadow-xs font-['Fredoka',sans-serif]">
              {classInfo.nameVi} - Ms. Thao's Star Kingdom
            </h1>
            <p className="text-sm sm:text-base font-black text-[#263C72] mb-3">
              {classInfo.sloganVi}
            </p>
            <div className="inline-block bg-white/95 px-4 py-1.5 rounded-2xl shadow-xs border border-amber-300">
              <span className="text-xs font-bold text-sky-700">{classInfo.sloganEn}</span>
            </div>
          </div>
        </div>
      ) : (
        /* The authentic Fairytale Castle banner from Mockup */
        <div className="relative w-full overflow-hidden">
          <img
            src="/assets/kingdom/hero_banner.png"
            alt="Ms. Thao's Star Kingdom Castle"
            className="w-full h-auto object-cover max-h-[310px] select-none"
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
