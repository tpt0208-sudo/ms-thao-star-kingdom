import React, { useState } from 'react';
import { Student, Team } from '../types';
import { Star, Plus, Minus, Camera, Award, Shield, Check, Sparkles } from 'lucide-react';
import { StarPopover } from './StarPopover';
import { triggerStarConfetti, playStarSound } from '../utils/effects';
import { LEVEL_TITLES_BILINGUAL } from '../utils/bilingual';

interface StudentCardProps {
  student: Student;
  team?: Team;
  isSelected?: boolean;
  onSelect?: (studentId: string) => void;
  isMultiSelectMode?: boolean;
  onOpenDetails: (student: Student) => void;
  onGiveStars: (payload: {
    studentId: string;
    deltaStars: number;
    reasonCategory: string;
    reasonNote: string;
  }) => Promise<void>;
  onChangeAvatar: (student: Student) => void;
  isTeacher?: boolean;
}

interface LevelInfo {
  level: number;
  title: string;
  minStars: number;
  nextLevelStars: number | null;
  progressPercent: number;
  starsToNext: number;
}

function getStudentLevelInfo(totalStars: number): LevelInfo {
  if (totalStars >= 150) {
    return {
      level: 5,
      title: 'Tinh Tú Vàng',
      minStars: 150,
      nextLevelStars: null,
      progressPercent: 100,
      starsToNext: 0,
    };
  }
  if (totalStars >= 100) {
    return {
      level: 4,
      title: 'Tinh Tú Bạc',
      minStars: 100,
      nextLevelStars: 150,
      progressPercent: Math.min(100, Math.max(0, Math.round(((totalStars - 100) / 50) * 100))),
      starsToNext: 150 - totalStars,
    };
  }
  if (totalStars >= 50) {
    return {
      level: 3,
      title: 'Hiệp Sĩ Vàng',
      minStars: 50,
      nextLevelStars: 100,
      progressPercent: Math.min(100, Math.max(0, Math.round(((totalStars - 50) / 50) * 100))),
      starsToNext: 100 - totalStars,
    };
  }
  if (totalStars >= 20) {
    return {
      level: 2,
      title: 'Hiệp Sĩ Bạc',
      minStars: 20,
      nextLevelStars: 50,
      progressPercent: Math.min(100, Math.max(0, Math.round(((totalStars - 20) / 30) * 100))),
      starsToNext: 50 - totalStars,
    };
  }
  return {
    level: 1,
    title: 'Hiệp Sĩ Đồng',
    minStars: 0,
    nextLevelStars: 20,
    progressPercent: Math.min(100, Math.max(0, Math.round((totalStars / 20) * 100))),
    starsToNext: 20 - totalStars,
  };
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  team,
  isSelected = false,
  onSelect,
  isMultiSelectMode = false,
  onOpenDetails,
  onGiveStars,
  onChangeAvatar,
  isTeacher = true,
}) => {
  const [popoverMode, setPopoverMode] = useState<'add' | 'deduct' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Compute level and progress details
  const levelInfo = getStudentLevelInfo(student.totalEarnedStars);

  // Compute birthdate details
  const birthInfo = React.useMemo(() => {
    if (!student.dob) return null;
    const parts = student.dob.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (parts) {
      return {
        day: parseInt(parts[3], 10),
        month: parseInt(parts[2], 10),
        year: parseInt(parts[1], 10),
        formatted: `${parts[3].padStart(2, '0')}/${parts[2].padStart(2, '0')}`,
        fullFormatted: `${parts[3].padStart(2, '0')}/${parts[2].padStart(2, '0')}/${parts[1]}`,
      };
    }
    const vnParts = student.dob.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (vnParts) {
      return {
        day: parseInt(vnParts[1], 10),
        month: parseInt(vnParts[2], 10),
        year: parseInt(vnParts[3], 10),
        formatted: `${vnParts[1].padStart(2, '0')}/${vnParts[2].padStart(2, '0')}`,
        fullFormatted: `${vnParts[1].padStart(2, '0')}/${vnParts[2].padStart(2, '0')}/${vnParts[3]}`,
      };
    }
    return null;
  }, [student.dob]);

  const now = new Date();
  const isBirthdayMonth = birthInfo && birthInfo.month === (now.getMonth() + 1);
  const isBirthdayToday = isBirthdayMonth && birthInfo.day === now.getDate();

  // Handle star adjustment
  const handleStarSubmit = async (delta: number, category: string, note: string) => {
    await onGiveStars({
      studentId: student.id,
      deltaStars: delta,
      reasonCategory: category,
      reasonNote: note,
    });

    if (delta > 0) {
      playStarSound('star');
      triggerStarConfetti();
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 800);
    } else {
      playStarSound('deduct');
    }
  };

  const defaultAvatar =
    student.gender === 'female'
      ? '/assets/kingdom/student_ngoc.png'
      : '/assets/kingdom/student_minh.png';

  // Team border accent
  const teamBorder = team?.borderColor || 'border-sky-100';
  const teamBg = team?.bgColor || 'bg-white';

  return (
    <>
      <div
        className={`relative group rounded-[28px] p-3 sm:p-3.5 select-none flex flex-col justify-between transition-all duration-300 ease-out ${
          isSelected
            ? 'ring-3 ring-sky-400 border-2 border-sky-300 bg-sky-50/90 shadow-[0_12px_28px_-6px_rgba(56,189,248,0.35)] -translate-y-1.5'
            : `border-2 ${teamBorder} ${teamBg} shadow-[0_4px_20px_-4px_rgba(38,60,114,0.07)] hover:shadow-[0_14px_30px_-6px_rgba(38,60,114,0.16)] hover:-translate-y-1.5 hover:scale-[1.015]`
        }`}
      >
        {/* Multi-select Checkbox */}
        {isMultiSelectMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect && onSelect(student.id);
            }}
            className={`absolute top-3 left-3 z-20 w-6 h-6 rounded-xl flex items-center justify-center border-2 transition cursor-pointer shadow-xs ${
              isSelected
                ? 'bg-sky-500 border-sky-600 text-white scale-105'
                : 'bg-white/95 border-slate-300 hover:border-sky-400 text-transparent'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
        )}

        {/* Card Header & Avatar Area */}
        <div className="flex flex-col items-center">
          {/* Avatar Container with Level Ribbon */}
          <div className="relative mt-1 mb-1.5">
            <div
              onClick={() => onOpenDetails(student)}
              className="cursor-pointer overflow-hidden rounded-full ring-3 ring-amber-300/80 hover:ring-amber-400 w-16 h-16 sm:w-18 sm:h-18 bg-white shadow-sm transition-all duration-300 group-hover:scale-105"
            >
              <img
                src={student.avatarUrl || defaultAvatar}
                alt={student.fullName}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    student.gender === 'female'
                      ? 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
                      : 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=150';
                }}
              />
            </div>

            {/* Change Avatar Button */}
            {isTeacher && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeAvatar(student);
                }}
                className="absolute -bottom-1 -right-1 p-1.5 bg-white hover:bg-sky-50 rounded-full border border-sky-200 text-sky-700 shadow-xs transition hover:scale-110 cursor-pointer"
                title="Thay ảnh học sinh"
              >
                <Camera className="w-3 h-3" />
              </button>
            )}

            {/* Top-Left Level Badge */}
            <div className="absolute -top-1.5 -left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white font-black text-[10px] shadow-xs flex items-center gap-0.5 border border-white">
              <Shield className="w-2.5 h-2.5 fill-white/80" />
              <span>Lv.{levelInfo.level}</span>
            </div>
          </div>

          {/* Level Progress Bar right below Avatar */}
          <div className="w-full max-w-[144px] flex flex-col items-center my-1">
            <div className="w-full flex items-center justify-between text-[11.5px] font-black text-amber-900 mb-0.5 px-0.5">
              <div className="min-w-0 leading-tight">
                <span className="block truncate">{levelInfo.title}</span>
                <span className="block text-[10px] font-bold text-amber-800 truncate">
                  {LEVEL_TITLES_BILINGUAL[levelInfo.level]?.en || 'Knight'}
                </span>
              </div>
              <span className="text-amber-800 font-extrabold shrink-0 ml-1">
                {levelInfo.nextLevelStars ? `${student.totalEarnedStars}/${levelInfo.nextLevelStars}★` : 'Max 👑'}
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2 bg-amber-100/70 rounded-full overflow-hidden p-0.5 border border-amber-200/60 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 transition-all duration-500 ease-out shadow-2xs relative"
                style={{ width: `${levelInfo.progressPercent}%` }}
              >
                {/* Subtle shine line */}
                <div className="absolute inset-0 bg-white/30 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Student Name & Code */}
        <div className="text-center my-1">
          <h4
            onClick={() => onOpenDetails(student)}
            className="text-[15.5px] sm:text-[16px] font-black text-[#263C72] hover:text-sky-600 transition truncate cursor-pointer leading-tight"
            title={student.fullName}
          >
            {student.fullName}
          </h4>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="text-[12.5px] font-bold text-slate-600">
              {student.studentCode}
            </span>
            {team && (
              <span
                className="text-[11px] font-black px-2 py-0.5 rounded-full text-white shadow-2xs truncate max-w-[110px]"
                style={{ backgroundColor: team.color }}
              >
                {team.nameVi.split(':')[0]} / {team.nameEn?.split(':')[0] || `Team`}
              </span>
            )}
          </div>

          {/* Birthday Chip */}
          {birthInfo && (
            <div className="flex flex-wrap items-center justify-center gap-1 mt-1 text-[11.5px] font-extrabold text-slate-600">
              <span className="text-xs">🎂</span>
              <span>{birthInfo.formatted}</span>
              {isBirthdayToday ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[11px] shadow-2xs animate-pulse leading-tight">
                  Sinh nhật hôm nay! / Birthday! 🎈
                </span>
              ) : isBirthdayMonth ? (
                <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-[11px] leading-tight">
                  Tháng sinh nhật / Birthday Month
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Star Counter Card */}
        <div
          className={`my-1.5 py-2 px-2.5 rounded-2xl bg-gradient-to-r from-amber-100/90 via-yellow-50 to-amber-100/90 border border-amber-200 flex items-center justify-center gap-2 text-center transition-all ${
            isAnimating ? 'scale-105 ring-2 ring-amber-400 shadow-md' : 'shadow-2xs'
          }`}
        >
          <div className="relative shrink-0">
            <Star className="w-5.5 h-5.5 text-amber-500 fill-amber-400 drop-shadow-xs" />
            {isAnimating && (
              <span className="absolute -top-3 -right-2 text-xs font-black text-amber-600 animate-ping">
                +★
              </span>
            )}
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-[19px] sm:text-[21px] font-black text-amber-950 leading-none">
                {student.totalEarnedStars}
              </span>
              <span className="text-[12.5px] font-black text-amber-900">sao / stars</span>
            </div>
            <span className="text-[11.5px] font-bold text-amber-800 leading-tight block mt-0.5 truncate">
              {student.spendableStars} đổi quà / spendable
            </span>
          </div>
        </div>

        {/* Badges Preview */}
        {student.badgeIds && student.badgeIds.length > 0 && (
          <div className="flex items-center justify-center gap-1 mb-1.5">
            {student.badgeIds.slice(0, 3).map((bId) => (
              <span
                key={bId}
                className="w-4.5 h-4.5 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-2xs text-[10px]"
                title={bId}
              >
                <Award className="w-3 h-3" />
              </span>
            ))}
            {student.badgeIds.length > 3 && (
              <span className="text-[11px] font-bold text-slate-600">
                +{student.badgeIds.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Prominent Rounded Pastel (+) and (-) Buttons */}
        {isTeacher ? (
          <div className="grid grid-cols-2 gap-2 mt-auto pt-1">
            {/* Minus (-) Pastel Button */}
            <button
              type="button"
              onClick={() => setPopoverMode('deduct')}
              className="w-full py-2 px-2 rounded-2xl bg-[#FFF0F3] hover:bg-[#FFE0E6] text-rose-700 border border-rose-200/90 flex items-center justify-center gap-1.5 font-black transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
              title="Trừ sao học sinh / Deduct Stars"
            >
              <div className="w-5 h-5 rounded-full bg-white/90 text-rose-600 shadow-2xs flex items-center justify-center shrink-0">
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13px] font-black">Trừ sao</span>
                <span className="text-[10.5px] font-bold text-rose-600">Deduct</span>
              </div>
            </button>

            {/* Plus (+) Pastel Button */}
            <button
              type="button"
              onClick={() => setPopoverMode('add')}
              className="w-full py-2 px-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white border border-amber-300/80 shadow-xs hover:shadow-md hover:shadow-amber-400/30 flex items-center justify-center gap-1.5 font-black transition-all cursor-pointer active:scale-95"
              title="Cộng sao học sinh / Add Stars"
            >
              <div className="w-5 h-5 rounded-full bg-white/25 text-white shadow-2xs flex items-center justify-center shrink-0">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13px] font-black">Cộng sao</span>
                <span className="text-[10.5px] font-bold text-white/95">Add Stars</span>
              </div>
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenDetails(student)}
            className="w-full py-2 rounded-2xl bg-sky-50 text-sky-800 hover:bg-sky-100 transition-all cursor-pointer mt-auto border border-sky-200 shadow-2xs flex flex-col items-center justify-center leading-tight"
          >
            <span className="text-[13.5px] font-black">Xem hồ sơ</span>
            <span className="text-[11px] font-bold text-sky-700">View Profile</span>
          </button>
        )}
      </div>

      {/* Popover modal when (+) or (-) is pressed */}
      {popoverMode && (
        <StarPopover
          student={student}
          mode={popoverMode}
          onClose={() => setPopoverMode(null)}
          onSubmit={handleStarSubmit}
        />
      )}
    </>
  );
};
