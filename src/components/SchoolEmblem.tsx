import React from 'react';

interface SchoolEmblemProps {
  className?: string;
  size?: number;
}

export const SchoolEmblem: React.FC<SchoolEmblemProps> = ({ className = '', size = 52 }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full shadow-sm bg-white border-2 border-emerald-600/30 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      title="Trường Tiểu học và THCS Thư Lâm"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Circle */}
        <circle cx="50" cy="50" r="48" fill="#F0FDF4" stroke="#059669" strokeWidth="3" />
        <circle cx="50" cy="50" r="43" fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="3 2" />

        {/* Circular text path */}
        <path
          id="schoolTextPath"
          d="M 16,50 A 34,34 0 1,1 84,50"
          fill="none"
        />
        <text fontSize="7.5" fontWeight="800" fill="#047857" letterSpacing="0.4">
          <textPath href="#schoolTextPath" startOffset="50%" textAnchor="middle">
            TH & THCS THƯ LÂM
          </textPath>
        </text>

        {/* Center Emblem: Open Book and Torch / Stars */}
        <g transform="translate(25, 34) scale(0.5)">
          {/* Open Book */}
          <path
            d="M50 70 C35 55 10 60 5 65 L5 25 C15 20 35 22 50 32 C65 22 85 20 95 25 L95 65 C90 60 65 55 50 70 Z"
            fill="#FFFFFF"
            stroke="#059669"
            strokeWidth="3.5"
          />
          <path
            d="M50 32 L50 70"
            stroke="#047857"
            strokeWidth="3"
          />
          {/* Book Pages lines */}
          <line x1="18" y1="36" x2="42" y2="40" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="46" x2="40" y2="50" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <line x1="58" y1="40" x2="82" y2="36" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="50" x2="82" y2="46" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />

          {/* Torch & Flame / Golden Star */}
          <polygon
            points="50,2 54,14 66,14 56,22 60,34 50,26 40,34 44,22 34,14 46,14"
            fill="#F59E0B"
            stroke="#D97706"
            strokeWidth="1.5"
          />
        </g>

        {/* Laurel Wreath at Bottom */}
        <path
          d="M 22,64 C 30,82 70,82 78,64"
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Laurel leaves */}
        <circle cx="28" cy="71" r="3" fill="#10B981" />
        <circle cx="36" cy="76" r="3.2" fill="#10B981" />
        <circle cx="50" cy="79" r="3.5" fill="#059669" />
        <circle cx="64" cy="76" r="3.2" fill="#10B981" />
        <circle cx="72" cy="71" r="3" fill="#10B981" />

        {/* Mini year at bottom */}
        <text x="50" y="89" fontSize="6" fontWeight="bold" fill="#065F46" textAnchor="middle">
          EST. THƯ LÂM
        </text>
      </svg>
    </div>
  );
};
