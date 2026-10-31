import React from 'react';

interface MenuIconProps {
  id: string;
  size?: number;
  className?: string;
  customUrl?: string;
  customEmoji?: string;
}

export const MenuIcon: React.FC<MenuIconProps> = ({ id, size = 40, className = '', customUrl, customEmoji }) => {
  if (customUrl) {
    return (
      <img
        src={customUrl}
        alt={id}
        style={{ width: size, height: size }}
        className={`rounded-xl object-contain shadow-2xs ${className}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  if (customEmoji) {
    return (
      <div
        style={{ width: size, height: size, fontSize: Math.floor(size * 0.65) }}
        className={`rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shadow-2xs ${className}`}
      >
        {customEmoji}
      </div>
    );
  }

  switch (id) {
    case 'home':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#E0F2FE" />
          <path d="M12 36V22H36V36H12Z" fill="#93C5FD" stroke="#2563EB" strokeWidth="2" />
          <path d="M21 36V28C21 26.3431 22.3431 25 24 25C25.6569 25 27 26.3431 27 28V36H21Z" fill="#1E3A8A" />
          <rect x="10" y="18" width="8" height="18" rx="2" fill="#60A5FA" stroke="#2563EB" strokeWidth="2" />
          <polygon points="14,10 9,18 19,18" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
          <rect x="30" y="18" width="8" height="18" rx="2" fill="#60A5FA" stroke="#2563EB" strokeWidth="2" />
          <polygon points="34,10 29,18 39,18" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
          <rect x="20" y="14" width="8" height="14" fill="#BFDBFE" stroke="#2563EB" strokeWidth="1.5" />
          <polygon points="24,6 18,14 30,14" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
          <path d="M24 6V2L28 4L24 6Z" fill="#EF4444" />
          <rect x="22.5" y="18" width="3" height="4" rx="1.5" fill="#1E3A8A" />
          <circle cx="14" cy="23" r="1.5" fill="#FEF08A" />
          <circle cx="34" cy="23" r="1.5" fill="#FEF08A" />
        </svg>
      );

    case 'news':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#FCE7F3" />
          <path d="M14 20L28 14V32L14 26H10C8.89543 26 8 25.1046 8 24V22C8 20.8954 8.89543 20 10 20H14Z" fill="#EC4899" stroke="#BE185D" strokeWidth="2" />
          <ellipse cx="28" cy="23" rx="4" ry="9" fill="#F472B6" stroke="#BE185D" strokeWidth="2" />
          <path d="M34 16C37 18 37 28 34 30" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M39 12C44 15 44 31 39 34" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 26L16 34" stroke="#BE185D" strokeWidth="3" strokeLinecap="round" />
          <polygon points="38,8 39,11 42,12 39,13 38,16 37,13 34,12 37,11" fill="#FDE047" />
        </svg>
      );

    case 'teams':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#DCFCE7" />
          <line x1="16" y1="12" x2="16" y2="38" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M16 14C20 12 22 17 26 15L26 25C22 27 20 22 16 24V14Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
          <line x1="32" y1="10" x2="32" y2="38" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 12C28 10 26 15 22 13L22 23C26 25 28 20 32 22V12Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
          <ellipse cx="24" cy="38" rx="16" ry="4" fill="#BBF7D0" />
        </svg>
      );

    case 'students':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#FEF3C7" />
          {/* Boy */}
          <circle cx="16" cy="19" r="6" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" />
          <path d="M11 17C11 14 14 13 18 13C21 13 22 15 21 18C18 18 14 18 11 17Z" fill="#4B5563" />
          <circle cx="14" cy="19" r="1" fill="#1F2937" />
          <circle cx="18" cy="19" r="1" fill="#1F2937" />
          <path d="M15 22C16 23 17 23 18 22" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />
          <path d="M9 34C9 28 12 26 16 26C20 26 23 28 23 34" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />

          {/* Girl */}
          <circle cx="32" cy="19" r="6" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" />
          <path d="M26 17C26 13 30 13 35 13C38 13 39 15 38 18C35 18 30 18 26 17Z" fill="#92400E" />
          <path d="M26 18C24 19 24 23 26 24" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
          <path d="M38 18C40 19 40 23 38 24" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="19" r="1" fill="#1F2937" />
          <circle cx="34" cy="19" r="1" fill="#1F2937" />
          <path d="M31 22C32 23 33 23 34 22" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />
          <path d="M25 34C25 28 28 26 32 26C36 26 39 28 39 34" fill="#EC4899" stroke="#BE185D" strokeWidth="1.5" />
        </svg>
      );

    case 'rewards':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#FEF9C3" />
          <path d="M18 24L14 38L24 33L34 38L30 24" fill="#EF4444" stroke="#DC2626" strokeWidth="1.5" />
          <circle cx="24" cy="20" r="12" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
          <circle cx="24" cy="20" r="9.5" fill="#FCD34D" />
          <polygon
            points="24,13 26.5,17.5 31.5,18 27.5,21.5 28.5,26.5 24,24 19.5,26.5 20.5,21.5 16.5,18 21.5,17.5"
            fill="#F59E0B"
            stroke="#D97706"
            strokeWidth="0.8"
          />
        </svg>
      );

    case 'halloffame':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#FFFBEB" />
          <path d="M16 12H32V22C32 26.4183 28.4183 30 24 30C19.5817 30 16 26.4183 16 22V12Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
          <path d="M16 15H11C9.89543 15 9 15.8954 9 17V20C9 22.2091 10.7909 24 13 24H16" stroke="#D97706" strokeWidth="2" />
          <path d="M32 15H37C38.1046 15 39 15.8954 39 17V20C39 22.2091 37.2091 24 35 24H32" stroke="#D97706" strokeWidth="2" />
          <rect x="22" y="30" width="4" height="6" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
          <path d="M16 36H32V40H16V36Z" rx="2" fill="#B45309" stroke="#92400E" strokeWidth="1.5" />
          <polygon points="24,16 25.2,19.5 29,19.5 26,21.5 27.2,25 24,23 20.8,25 22,21.5 19,19.5 22.8,19.5" fill="#FEF08A" />
        </svg>
      );

    case 'tools':
      // Orange/Purple magical suitcase/toolbox matching mockup
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#FFF7ED" />
          {/* Bag Handle */}
          <path d="M19 16C19 13.5 20.5 12 24 12C27.5 12 29 13.5 29 16" stroke="#C2410C" strokeWidth="2.5" strokeLinecap="round" />
          {/* Main Bag Box */}
          <rect x="10" y="16" width="28" height="22" rx="5" fill="#FB923C" stroke="#EA580C" strokeWidth="2" />
          {/* Accent Stripe */}
          <path d="M10 24H38" stroke="#C2410C" strokeWidth="2" />
          {/* Golden Clasp */}
          <rect x="21" y="21" width="6" height="6" rx="1.5" fill="#FDE047" stroke="#D97706" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="1" fill="#78350F" />
        </svg>
      );

    case 'library':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#E0F2FE" />
          <rect x="12" y="14" width="6" height="24" rx="2" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
          <line x1="14" y1="18" x2="16" y2="18" stroke="#DBEAFE" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="19" y="10" width="6" height="28" rx="2" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
          <line x1="21" y1="15" x2="23" y2="15" stroke="#D1FAE5" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="26" y="16" width="6" height="22" rx="2" fill="#F97316" stroke="#C2410C" strokeWidth="1.5" />
          <line x1="28" y1="20" x2="30" y2="20" stroke="#FFEDD5" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="33" y="18" width="6" height="20" rx="2" fill="#A855F7" stroke="#7E22CE" strokeWidth="1.5" transform="rotate(12 33 18)" />
          <rect x="8" y="38" width="32" height="3" rx="1.5" fill="#78350F" />
        </svg>
      );

    case 'settings':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#F1F5F9" />
          <circle cx="24" cy="24" r="6" fill="#64748B" />
          <path
            d="M24 10V14M24 34V38M10 24H14M34 24H38M14.1 14.1L16.9 16.9M31.1 31.1L33.9 33.9M14.1 33.9L16.9 31.1M31.1 16.9L33.9 14.1"
            stroke="#475569"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return null;
  }
};
