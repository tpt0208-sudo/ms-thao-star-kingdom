import React from 'react';
import { MenuIcon } from './MenuIcon';
import { NavTab, navItems } from './Sidebar';
import { MenuItemCustomization } from '../types';
import { playStarSound } from '../utils/effects';

interface NavigationCardsProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  menuCustomization?: Record<string, MenuItemCustomization>;
}

const cardStyles: Record<NavTab, { bg: string; border: string; activeRing: string; imgName: string }> = {
  home: { bg: 'bg-[#EBF7FF]', border: 'border-sky-200', activeRing: 'ring-sky-500', imgName: 'nav_home.png' },
  news: { bg: 'bg-[#FFF0F6]', border: 'border-pink-200', activeRing: 'ring-pink-500', imgName: 'nav_news.png' },
  teams: { bg: 'bg-[#F0FDF4]', border: 'border-emerald-200', activeRing: 'ring-emerald-500', imgName: 'nav_teams.png' },
  students: { bg: 'bg-[#FEFCE8]', border: 'border-amber-200', activeRing: 'ring-amber-500', imgName: 'nav_students.png' },
  rewards: { bg: 'bg-[#FFFBEB]', border: 'border-yellow-300', activeRing: 'ring-yellow-500', imgName: 'nav_rewards.png' },
  halloffame: { bg: 'bg-[#FFF7ED]', border: 'border-orange-200', activeRing: 'ring-orange-500', imgName: 'nav_halloffame.png' },
  tools: { bg: 'bg-[#FAF5FF]', border: 'border-purple-200', activeRing: 'ring-purple-500', imgName: 'nav_tools.png' },
  library: { bg: 'bg-[#F0F9FF]', border: 'border-blue-200', activeRing: 'ring-blue-500', imgName: 'nav_library.png' },
  settings: { bg: 'bg-[#F8FAFC]', border: 'border-slate-200', activeRing: 'ring-slate-500', imgName: 'nav_settings.png' },
};

export const NavigationCards: React.FC<NavigationCardsProps> = ({ currentTab, onSelectTab, menuCustomization = {} }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3 my-3">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        const style = cardStyles[item.id];
        const custom = menuCustomization[item.id];
        const titleVi = custom?.titleVi || item.titleVi;
        const titleEn = custom?.titleEn || item.titleEn;
        const iconUrl = custom?.iconUrl;
        const customEmoji = custom?.presetIcon;

        return (
          <button
            key={item.id}
            onClick={() => {
              playStarSound('click');
              onSelectTab(item.id);
            }}
            className={`group relative flex flex-col items-center justify-between text-center p-3 rounded-3xl border-2 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-1 ${
              style.bg
            } ${style.border} ${isActive ? `ring-3 ${style.activeRing} shadow-md scale-102` : ''}`}
          >
            {/* 3D Icon Container */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <MenuIcon id={item.iconKey} size={40} customUrl={iconUrl} customEmoji={customEmoji} />
            </div>

            {/* Bilingual Titles: Vietnamese on top (15-16px), English below (12-13px) */}
            <div className="w-full leading-tight">
              <span className="text-[14.5px] sm:text-[15.5px] font-black text-[#263C72] leading-tight block truncate">
                {titleVi}
              </span>
              <span className="text-[12px] sm:text-[12.5px] font-bold text-slate-600 leading-tight block truncate mt-0.5">
                {titleEn}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
