import React, { useState } from 'react';
import { MenuIcon } from './MenuIcon';
import { Crown, Camera } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';

export type NavTab =
  | 'home'
  | 'news'
  | 'teams'
  | 'students'
  | 'rewards'
  | 'halloffame'
  | 'tools'
  | 'library'
  | 'settings';

import { MenuItemCustomization } from '../types';
import { playStarSound } from '../utils/effects';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  className?: string;
  menuCustomization?: Record<string, MenuItemCustomization>;
  kingdomAvatarUrl?: string;
  sidebarMascotUrl?: string;
  onUpdateKingdomAvatar?: (avatarUrl: string) => Promise<void>;
  onUpdateSidebarMascot?: (mascotUrl: string) => Promise<void>;
}

export const navItems: Array<{ id: NavTab; titleVi: string; titleEn: string; iconKey: string }> = [
  { id: 'home', titleVi: 'Trang chủ', titleEn: 'Home', iconKey: 'home' },
  { id: 'news', titleVi: 'Bảng tin lớp', titleEn: 'Class News', iconKey: 'news' },
  { id: 'teams', titleVi: 'Lớp và tổ', titleEn: 'Class & Teams', iconKey: 'teams' },
  { id: 'students', titleVi: 'Hồ sơ măng non', titleEn: 'Little Learners', iconKey: 'students' },
  { id: 'rewards', titleVi: 'Thưởng sao', titleEn: 'Star Rewards', iconKey: 'rewards' },
  { id: 'halloffame', titleVi: 'Vinh danh', titleEn: 'Hall of Fame', iconKey: 'halloffame' },
  { id: 'tools', titleVi: 'Bộ công cụ', titleEn: 'Classroom Tools', iconKey: 'tools' },
  { id: 'library', titleVi: 'Kho học liệu', titleEn: 'Learning Library', iconKey: 'library' },
];

export const settingsItem = {
  id: 'settings' as NavTab,
  titleVi: 'Cài đặt & Sao lưu',
  titleEn: 'Settings & Backup',
  iconKey: 'settings',
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  className = '',
  menuCustomization = {},
  kingdomAvatarUrl,
  sidebarMascotUrl,
  onUpdateKingdomAvatar,
  onUpdateSidebarMascot,
}) => {
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isMascotCropOpen, setIsMascotCropOpen] = useState(false);

  const handleItemClick = (tab: NavTab) => {
    playStarSound('click');
    onSelectTab(tab);
  };

  const customSettings = menuCustomization['settings'];
  const settingsVi = customSettings?.titleVi || settingsItem.titleVi;
  const settingsEn = customSettings?.titleEn || settingsItem.titleEn;
  const settingsUrl = customSettings?.iconUrl;
  const settingsEmoji = customSettings?.presetIcon;

  const activeAvatar = kingdomAvatarUrl || '/assets/kingdom/sidebar_logo.png';
  const activeMascot = sidebarMascotUrl || '/assets/kingdom/sidebar_mascot.png';

  return (
    <aside
      className={`w-64 bg-white/95 backdrop-blur-md border-r border-sky-100 flex flex-col justify-between p-3.5 shadow-sm shrink-0 select-none ${className}`}
    >
      <div>
        {/* Brand Header with Circular Kingdom Avatar */}
        <div className="mb-4 px-1 text-center flex flex-col items-center">
          {/* Circular Kingdom Avatar Container */}
          <div className="relative group mb-2">
            <div
              onClick={() => onUpdateKingdomAvatar && setIsCropOpen(true)}
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-white ring-4 ring-sky-200/90 shadow-md bg-gradient-to-tr from-sky-100 via-amber-50 to-pink-100 flex items-center justify-center transition-transform group-hover:scale-102 cursor-pointer"
              title="Bấm để thay đổi ảnh đại diện vương quốc"
            >
              <img
                src={activeAvatar}
                alt="Ms. Thao's Star Kingdom"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/kingdom/sidebar_logo.png';
                }}
              />
            </div>

            {/* Quick Camera Edit Button Overlay */}
            {onUpdateKingdomAvatar && (
              <button
                type="button"
                onClick={() => setIsCropOpen(true)}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-sky-600 border-2 border-sky-200 shadow-md flex items-center justify-center hover:bg-sky-50 transition-transform active:scale-95 cursor-pointer"
                title="Thay đổi ảnh đại diện vương quốc"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          <h2 className="text-[16px] font-black tracking-tight text-[#263C72] leading-tight">
            Vương quốc ngôi sao
          </h2>
          <p className="text-[12.5px] font-extrabold text-sky-700 leading-tight mt-0.5">
            Ms. Thao's Star Kingdom
          </p>
        </div>

        {/* Image Crop Modal for Kingdom Avatar */}
        {onUpdateKingdomAvatar && (
          <ImageCropModal
            isOpen={isCropOpen}
            onClose={() => setIsCropOpen(false)}
            title="Ảnh đại diện Vương quốc / Kingdom Avatar"
            subtitle="Tải ảnh lên, thu phóng, căn chỉnh vị trí và lưu ảnh đại diện tròn • Upload, zoom, pan & save circular avatar"
            currentImage={kingdomAvatarUrl}
            defaultImage="/assets/kingdom/sidebar_logo.png"
            shape="circle"
            onSave={async (dataUrl) => {
              await onUpdateKingdomAvatar(dataUrl);
              setIsCropOpen(false);
            }}
            onResetDefault={async () => {
              await onUpdateKingdomAvatar('/assets/kingdom/sidebar_logo.png');
              setIsCropOpen(false);
            }}
          />
        )}

        {/* 8 Menus Navigation List */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            const custom = menuCustomization[item.id];
            const titleVi = custom?.titleVi || item.titleVi;
            const titleEn = custom?.titleEn || item.titleEn;
            const iconUrl = custom?.iconUrl;
            const customEmoji = custom?.presetIcon;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-left transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#47B5FF] to-[#2563EB] text-white shadow-md shadow-blue-300/40 translate-x-1'
                    : 'text-[#263C72] hover:bg-sky-50/90 hover:text-sky-800'
                }`}
              >
                <div className={`p-0.5 rounded-xl shrink-0 transition-transform ${isActive ? 'scale-110 drop-shadow-sm' : ''}`}>
                  <MenuIcon id={item.iconKey} size={30} customUrl={iconUrl} customEmoji={customEmoji} />
                </div>
                <div className="min-w-0 leading-tight flex flex-col gap-0.5">
                  <span className={`text-[15px] block font-black truncate ${isActive ? 'text-white' : 'text-[#263C72]'}`}>
                    {titleVi}
                  </span>
                  <span className={`text-[12.5px] block font-bold truncate ${isActive ? 'text-sky-100' : 'text-slate-600'}`}>
                    {titleEn}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Settings & Backup Item at bottom of nav */}
          <button
            onClick={() => handleItemClick('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-left transition-all duration-200 cursor-pointer mt-2 border-t border-slate-100 pt-2.5 ${
              currentTab === 'settings'
                ? 'bg-gradient-to-r from-[#47B5FF] to-[#2563EB] text-white shadow-md shadow-blue-300/40 translate-x-1'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className={`p-0.5 rounded-xl shrink-0 transition-transform ${currentTab === 'settings' ? 'scale-110 drop-shadow-sm' : ''}`}>
              <MenuIcon id="settings" size={30} customUrl={settingsUrl} customEmoji={settingsEmoji} />
            </div>
            <div className="min-w-0 leading-tight flex flex-col gap-0.5">
              <span className={`text-[15px] block font-black truncate ${currentTab === 'settings' ? 'text-white' : 'text-[#263C72]'}`}>
                {settingsVi}
              </span>
              <span className={`text-[12.5px] block font-bold truncate ${currentTab === 'settings' ? 'text-sky-100' : 'text-slate-600'}`}>
                {settingsEn}
              </span>
            </div>
          </button>
        </nav>
      </div>

      {/* Mascot Card at Bottom - Exactly matching the Mockup artwork with customizable image */}
      <div
        onClick={() => onUpdateSidebarMascot && setIsMascotCropOpen(true)}
        className="mt-4 rounded-3xl overflow-hidden shadow-sm border border-sky-200 relative group cursor-pointer transition-all hover:shadow-md hover:border-sky-300"
        title="Bấm để thay đổi hình ảnh linh vật vương quốc / Click to change mascot image"
      >
        <img
          src={activeMascot}
          alt="Together We Learn We Shine!"
          className="w-full object-cover transition-transform duration-300 group-hover:scale-102"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/kingdom/sidebar_mascot.png';
          }}
        />

        {/* Hover Change Image Overlay */}
        {onUpdateSidebarMascot && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 pointer-events-none">
            <span className="w-full py-1.5 px-2.5 rounded-xl bg-white/95 text-[#263C72] flex items-center justify-center gap-1.5 shadow-md backdrop-blur-xs">
              <Camera className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="leading-tight text-left">
                <span className="block text-[12.5px] font-black text-[#263C72]">Thay đổi hình ảnh</span>
                <span className="block text-[11px] font-bold text-sky-700">Change Mascot Image</span>
              </span>
            </span>
          </div>
        )}

        {/* Floating Quick Camera Button */}
        {onUpdateSidebarMascot && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMascotCropOpen(true);
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-sky-600 border border-sky-200 shadow-md flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
            title="Thay đổi hình ảnh linh vật"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Image Crop Modal for Sidebar Mascot Card */}
      {onUpdateSidebarMascot && (
        <ImageCropModal
          isOpen={isMascotCropOpen}
          onClose={() => setIsMascotCropOpen(false)}
          title="Thay đổi hình ảnh Linh vật Vương quốc"
          subtitle="Tải ảnh mới từ máy, phóng to / căn chỉnh hoặc chọn các mẫu linh vật có sẵn"
          currentImage={sidebarMascotUrl}
          defaultImage="/assets/kingdom/sidebar_mascot.png"
          shape="card"
          aspectRatio={196 / 260}
          presets={[
            { label: 'Học vui Tỏa sáng (Gốc)', url: '/assets/kingdom/sidebar_mascot.png' },
            { label: 'Vương quốc Ngôi sao V2', url: '/assets/kingdom/sidebar_mascot_v2.png' },
            { label: 'Lâu đài Cổ tích', url: '/assets/kingdom/hero_banner.png' },
            { label: 'Linh vật Di động', url: '/assets/kingdom/mobile_mascot.png' },
            { label: 'Trường học Ngôi sao', url: '/assets/kingdom/school_logo_v2.png' },
          ]}
          onSave={async (dataUrl) => {
            await onUpdateSidebarMascot(dataUrl);
            setIsMascotCropOpen(false);
          }}
          onResetDefault={async () => {
            await onUpdateSidebarMascot('/assets/kingdom/sidebar_mascot.png');
            setIsMascotCropOpen(false);
          }}
        />
      )}
    </aside>
  );
};
