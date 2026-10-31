import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, Team, Badge, RankingPeriod, StarTransaction, AcademicCalendarConfig, SchoolInfo, ClassInfo } from '../types';
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Award,
  Tv,
  Flag,
  Star,
  Users,
  X,
  Volume2,
  Printer,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { triggerGrandCelebration, playStarSound, stopCelebration } from '../utils/effects';
import {
  getPeriodRange,
  getStudentPeriodStars,
  getTeamPeriodPoints,
  DEFAULT_ACADEMIC_CONFIG,
  getAcademicMonthsForConfig,
  getCurrentAcademicMonthKey,
  getAcademicWeekInfo,
  getAvailableSchoolWeeks,
} from '../utils/timePeriodService';

interface HallOfFameViewProps {
  students: Student[];
  teams: Team[];
  badges: Badge[];
  starTransactions?: StarTransaction[];
  academicConfig?: AcademicCalendarConfig;
  school?: SchoolInfo;
  classInfo?: ClassInfo;
}

export const HallOfFameView: React.FC<HallOfFameViewProps> = ({
  students,
  teams,
  badges,
  starTransactions = [],
  academicConfig = DEFAULT_ACADEMIC_CONFIG,
  school,
  classInfo,
}) => {
  const [clockNow, setClockNow] = useState<Date>(() => new Date());
  const [period, setPeriod] = useState<RankingPeriod>('week');

  const initialWeekInfo = useMemo(() => getAcademicWeekInfo(clockNow, academicConfig), [clockNow, academicConfig]);
  const [selectedWeek, setSelectedWeek] = useState<number>(() => getAcademicWeekInfo(new Date(), academicConfig).weekNumber);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => getCurrentAcademicMonthKey(new Date(), academicConfig));

  const lastAutoWeekRef = useRef<number>(initialWeekInfo.weekNumber);
  const lastAutoMonthRef = useRef<string>(getCurrentAcademicMonthKey(new Date(), academicConfig));

  // Auto-rollover watcher across Monday 00:00 and 1st of month 00:00 (Asia/Ho_Chi_Minh) without requiring F5
  useEffect(() => {
    const checkRollover = (customDate?: Date) => {
      const now = customDate || new Date();
      setClockNow(now);
      const nextWeekInfo = getAcademicWeekInfo(now, academicConfig);
      const nextMonthKey = getCurrentAcademicMonthKey(now, academicConfig);

      if (nextWeekInfo.weekNumber !== lastAutoWeekRef.current) {
        const prevAutoWeek = lastAutoWeekRef.current;
        lastAutoWeekRef.current = nextWeekInfo.weekNumber;
        setSelectedWeek((curr) => (curr === prevAutoWeek ? nextWeekInfo.weekNumber : curr));
      }

      if (nextMonthKey !== lastAutoMonthRef.current) {
        const prevAutoMonth = lastAutoMonthRef.current;
        lastAutoMonthRef.current = nextMonthKey;
        setSelectedMonthKey((curr) => (curr === prevAutoMonth ? nextMonthKey : curr));
      }
    };

    const intervalId = window.setInterval(() => checkRollover(), 10000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkRollover();
    };
    const onCustomClockTick = (e: Event) => {
      const detailDate = (e as CustomEvent)?.detail?.now ? new Date((e as CustomEvent).detail.now) : undefined;
      checkRollover(detailDate);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('starkingdom:clock-tick', onCustomClockTick);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('starkingdom:clock-tick', onCustomClockTick);
    };
  }, [academicConfig]);

  const availableWeeks = useMemo(() => getAvailableSchoolWeeks(academicConfig.totalWeeks, academicConfig, clockNow), [academicConfig, clockNow]);
  const academicMonths = useMemo(() => getAcademicMonthsForConfig(academicConfig, clockNow), [academicConfig, clockNow]);
  const liveWeekInfo = useMemo(() => getAcademicWeekInfo(clockNow, academicConfig), [clockNow, academicConfig]);
  const liveMonthKey = useMemo(() => getCurrentAcademicMonthKey(clockNow, academicConfig), [clockNow, academicConfig]);

  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);
  const [certHonor, setCertHonor] = useState<string>('Ngôi sao xuất sắc tuần – Tinh tú tỏa sáng');

  const schoolLogoSrc = school?.logoUrl || '/assets/kingdom/school_logo_v2.png';
  const schoolNameVi = school?.nameVi || 'Trường Tiểu học và THCS Thư Lâm';
  const classNameVi = classInfo?.nameVi || 'Lớp 2A5';

  const periodRange = useMemo(() => {
    return getPeriodRange(period, academicConfig, clockNow, selectedWeek, selectedMonthKey);
  }, [period, academicConfig, clockNow, selectedWeek, selectedMonthKey]);

  // Compute student rankings for current period
  const sortedStudents = useMemo(() => {
    const list = students.map((st) => {
      const stats = getStudentPeriodStars(st, starTransactions, period, academicConfig, selectedWeek, selectedMonthKey, clockNow);
      const team = teams.find((t) => t.id === st.teamId);
      return {
        ...st,
        periodEarned: stats.earned,
        periodNet: stats.net,
        team,
      };
    });

    list.sort((a, b) => {
      if (b.periodNet !== a.periodNet) return b.periodNet - a.periodNet;
      return b.totalEarnedStars - a.totalEarnedStars;
    });

    return list;
  }, [students, starTransactions, period, academicConfig, teams, selectedWeek, selectedMonthKey, clockNow]);

  const top1 = sortedStudents[0];
  const top2 = sortedStudents[1];
  const top3 = sortedStudents[2];

  // Compute team rankings for current period
  const sortedTeams = useMemo(() => {
    const list = teams.map((tm) => {
      const pts = getTeamPeriodPoints(tm, starTransactions, period, academicConfig, selectedWeek, selectedMonthKey, clockNow);
      return {
        ...tm,
        periodPoints: pts,
      };
    });

    list.sort((a, b) => b.periodPoints - a.periodPoints);
    return list;
  }, [teams, starTransactions, period, academicConfig, selectedWeek, selectedMonthKey, clockNow]);

  const maxTeamPoints = Math.max(...sortedTeams.map((t) => t.periodPoints), 10);

  const handleCelebrate = () => {
    setIsCelebrating(true);
    playStarSound('win');
    triggerGrandCelebration();
  };

  const handleStopCelebration = () => {
    stopCelebration();
    setIsCelebrating(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-3xl p-5 md:p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/25 backdrop-blur-xs rounded-2xl ring-2 ring-white/50 shadow-xs">
            <Trophy className="w-8 h-8 fill-amber-100 text-white" />
          </div>
          <div>
            <h2 className="typo-title-section text-amber-950 leading-tight drop-shadow-2xs">
              Đại Sảnh Danh Dự
            </h2>
            <p className="text-[14px] font-black text-amber-900 leading-tight">
              Hall of Fame & Leaderboards
            </p>
            <p className="text-[12.5px] font-bold text-amber-950 mt-0.5">
              Vinh danh cá nhân và 4 tổ xuất sắc nhất • {periodRange.labelVi} ({periodRange.labelEn})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Certificate Generator */}
          <button
            onClick={() => {
              playStarSound('click');
              setCertificateStudent(sortedStudents[0] || null);
            }}
            className="px-3.5 py-2 rounded-2xl bg-white/95 hover:bg-white text-indigo-900 shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95"
            title="Tạo giấy chứng nhận vinh danh / Certificate"
          >
            <Award className="w-4.5 h-4.5 text-indigo-600" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Giấy chứng nhận 📜</span>
              <span className="text-[11px] font-bold text-indigo-700">Certificate</span>
            </div>
          </button>

          {/* Celebrate Button */}
          <button
            onClick={handleCelebrate}
            className="px-3.5 py-2 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4.5 h-4.5 text-amber-500 fill-amber-400" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Ăn mừng / Pháo hoa! 🎉</span>
              <span className="text-[11px] font-bold text-amber-800">Celebrate</span>
            </div>
          </button>

          {/* Projector TV Mode */}
          <button
            onClick={() => {
              playStarSound('click');
              setIsProjectorMode(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-indigo-900/95 hover:bg-indigo-950 text-white shadow-md flex items-center gap-2 transition cursor-pointer"
          >
            <Tv className="w-4.5 h-4.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Chế độ Máy Chiếu</span>
              <span className="text-[11px] font-bold text-indigo-200">Projector Mode</span>
            </div>
          </button>
        </div>
      </div>

      {/* 4-Group Unified Time Periods Filter Bar: [Tuần] [Tháng] [Học kỳ] [Năm học] */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-sky-100 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-black text-slate-800">
            <Calendar className="w-4.5 h-4.5 text-amber-500" />
            <span>Kỳ vinh danh / Selected Period:</span>
            <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-950 border border-indigo-200 shadow-2xs">
              {periodRange.labelVi} / {periodRange.labelEn}
            </span>
            {liveWeekInfo.isOutOfRange && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-[12px] font-extrabold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{liveWeekInfo.statusLabelVi}</span>
              </span>
            )}
          </div>

          {/* 4 Main Period Filter Buttons: [Tuần] [Tháng] [Học kỳ] [Năm học] */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                playStarSound('click');
                setPeriod('week');
              }}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                period === 'week'
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>📅</span>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13px] font-black">Tuần ({`Tuần ${selectedWeek}`})</span>
                <span className="text-[11px] font-bold opacity-90">Weekly (Week {selectedWeek})</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                playStarSound('click');
                setPeriod('month');
              }}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                period === 'month'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>🗓️</span>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13px] font-black">Tháng ({academicMonths.find((m) => m.monthKey === selectedMonthKey)?.labelVi || 'Tháng này'})</span>
                <span className="text-[11px] font-bold opacity-90">Monthly</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                playStarSound('click');
                if (period !== 'semester1' && period !== 'semester2') {
                  const currMonth = academicMonths.find((m) => m.monthKey === liveMonthKey);
                  setPeriod(currMonth?.semester === 2 ? 'semester2' : 'semester1');
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                period === 'semester1' || period === 'semester2'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>📘</span>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13px] font-black">Học kỳ ({period === 'semester2' ? 'Học kỳ II' : 'Học kỳ I'})</span>
                <span className="text-[11px] font-bold opacity-90">Semester</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                playStarSound('click');
                setPeriod('year');
              }}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                period === 'year'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>👑</span>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13px] font-black">Năm học ({academicConfig.schoolYear})</span>
                <span className="text-[11px] font-bold opacity-90">School Year</span>
              </div>
            </button>
          </div>
        </div>

        {/* Chế độ 1: Bộ điều khiển Tuần (Tuần 1 đến Tuần 36) */}
        {period === 'week' && (
          <div className="bg-gradient-to-r from-amber-50/90 via-yellow-50/60 to-sky-50/60 rounded-2xl p-4 border border-amber-200 space-y-3 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-400 text-amber-950 shadow-2xs">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-amber-950 flex flex-wrap items-center gap-1.5">
                    <span>Bảng vinh danh theo Tuần • Năm học {academicConfig.schoolYear}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-extrabold">
                      Tổng {availableWeeks.length} tuần học
                    </span>
                    {selectedWeek === liveWeekInfo.weekNumber && !liveWeekInfo.isOutOfRange && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold">
                        ⭐ Đang ở tuần hiện tại
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500">
                    Tự động chuyển sang tuần mới vào 00:00 Thứ Hai hàng tuần (Múi giờ Việt Nam UTC+7).
                  </p>
                </div>
              </div>

              {/* Controls: Prev Week | Dropdown Tuần 1..36 | Next Week | Tuần này */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={selectedWeek <= 1}
                  onClick={() => {
                    playStarSound('click');
                    setSelectedWeek((w) => Math.max(1, w - 1));
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 disabled:opacity-40 text-slate-700 border border-amber-200 text-xs font-black flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  title="Tuần trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tuần trước</span>
                </button>

                <select
                  value={selectedWeek}
                  onChange={(e) => {
                    playStarSound('click');
                    setSelectedWeek(Number(e.target.value));
                  }}
                  aria-label="Chọn tuần năm học"
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-amber-400 text-xs font-black text-amber-950 cursor-pointer outline-none shadow-2xs"
                >
                  {availableWeeks.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      {w.labelVi} {w.isCurrent ? '⭐ (Tuần hiện tại)' : ''} {w.isHoliday ? '🏖️ (Nghỉ lễ)' : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={selectedWeek >= availableWeeks.length}
                  onClick={() => {
                    playStarSound('click');
                    setSelectedWeek((w) => Math.min(availableWeeks.length, w + 1));
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 disabled:opacity-40 text-slate-700 border border-amber-200 text-xs font-black flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  title="Tuần kế tiếp"
                >
                  <span className="hidden sm:inline">Tuần sau</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playStarSound('click');
                    setSelectedWeek(liveWeekInfo.weekNumber);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition shadow-2xs flex items-center gap-1 ${
                    selectedWeek === liveWeekInfo.weekNumber
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                  }`}
                >
                  <span>📍 Tuần này (Tuần {liveWeekInfo.weekNumber})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chế độ 2: Bộ điều khiển Tháng (Tháng 9/2026 đến Tháng 5/2027) */}
        {period === 'month' && (
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50/50 to-amber-50/60 rounded-2xl p-4 border border-sky-200 space-y-3 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-sky-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-1.5">
                    <span>Chọn tháng vinh danh tự động • Năm học {academicConfig.schoolYear}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold">
                      9 tháng thực học
                    </span>
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500">
                    Tự động sang tháng mới vào 00:00 ngày 01 hàng tháng. Điểm tháng tính theo đúng tháng thực tế của giao dịch.
                  </p>
                </div>
              </div>

              {/* Month Quick Navigation: Prev Month | Dropdown | Next Month | Tháng này */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={academicMonths.findIndex((m) => m.monthKey === selectedMonthKey) <= 0}
                  onClick={() => {
                    playStarSound('click');
                    const idx = academicMonths.findIndex((m) => m.monthKey === selectedMonthKey);
                    if (idx > 0) setSelectedMonthKey(academicMonths[idx - 1].monthKey);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 disabled:opacity-40 text-slate-700 border border-sky-200 text-xs font-black flex items-center gap-1 cursor-pointer transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tháng trước</span>
                </button>

                <select
                  value={selectedMonthKey}
                  onChange={(e) => {
                    playStarSound('click');
                    setSelectedMonthKey(e.target.value);
                  }}
                  aria-label="Chọn tháng năm học"
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-sky-400 text-xs font-black text-indigo-950 cursor-pointer outline-none shadow-2xs"
                >
                  {academicMonths.map((m) => (
                    <option key={m.monthKey} value={m.monthKey}>
                      {m.labelVi} {m.isCurrent ? '⭐ (Hiện tại)' : ''} - {m.semester === 1 ? 'HK1' : 'HK2'}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={academicMonths.findIndex((m) => m.monthKey === selectedMonthKey) >= academicMonths.length - 1}
                  onClick={() => {
                    playStarSound('click');
                    const idx = academicMonths.findIndex((m) => m.monthKey === selectedMonthKey);
                    if (idx >= 0 && idx < academicMonths.length - 1) setSelectedMonthKey(academicMonths[idx + 1].monthKey);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 disabled:opacity-40 text-slate-700 border border-sky-200 text-xs font-black flex items-center gap-1 cursor-pointer transition"
                >
                  <span className="hidden sm:inline">Tháng sau</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playStarSound('click');
                    setSelectedMonthKey(liveMonthKey);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition shadow-2xs ${
                    selectedMonthKey === liveMonthKey
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300'
                  }`}
                >
                  📍 Tháng này
                </button>
              </div>
            </div>

            {/* Month buttons grid: 9 months of the academic year */}
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 sm:gap-2">
              {academicMonths.map((m) => {
                const isSelected = selectedMonthKey === m.monthKey;
                return (
                  <button
                    key={m.monthKey}
                    type="button"
                    onClick={() => {
                      playStarSound('click');
                      setSelectedMonthKey(m.monthKey);
                    }}
                    className={`py-2 px-2 rounded-2xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 border relative ${
                      isSelected
                        ? 'bg-gradient-to-tr from-sky-600 to-indigo-700 text-white border-indigo-700 shadow-md ring-2 ring-sky-300 scale-105'
                        : m.isCurrent
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 shadow-2xs'
                        : 'bg-white hover:bg-sky-50 text-slate-700 border-slate-200 hover:border-sky-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{m.labelVi}</span>
                    </div>
                    <span
                      className={`text-[10px] font-black ${
                        isSelected ? 'text-sky-200' : 'text-slate-400'
                      }`}
                    >
                      {m.semester === 1 ? 'Học kỳ 1' : 'Học kỳ 2'}
                    </span>
                    {m.isCurrent && (
                      <span
                        className="absolute -top-1.5 -right-1 text-[11px] filter drop-shadow"
                        title={`Tháng hiện tại (${m.labelVi})`}
                      >
                        ⭐
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chế độ 3: Bộ điều khiển Học kỳ (Học kỳ I / Học kỳ II) */}
        {(period === 'semester1' || period === 'semester2') && (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50/60 to-sky-50 rounded-2xl p-4 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-indigo-950">
                Bảng vinh danh theo Học kỳ • Năm học {academicConfig.schoolYear}
              </h4>
              <p className="text-[11px] font-bold text-slate-500">
                Tổng hợp thành tích thi đua của học sinh và các tổ theo thời gian cấu hình từng học kỳ.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playStarSound('click');
                  setPeriod('semester1');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition ${
                  period === 'semester1'
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                    : 'bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                📘 Học kỳ I ({academicConfig.semester1Start} → {academicConfig.semester1End})
              </button>
              <button
                type="button"
                onClick={() => {
                  playStarSound('click');
                  setPeriod('semester2');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition ${
                  period === 'semester2'
                    ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                    : 'bg-white text-slate-700 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                📗 Học kỳ II ({academicConfig.semester2Start} → {academicConfig.semester2End})
              </button>
            </div>
          </div>
        )}

        {/* Chế độ 4: Bộ điều khiển Năm học (Tổng kết cả năm 36 tuần) */}
        {period === 'year' && (
          <div className="bg-gradient-to-r from-amber-50 via-rose-50/60 to-amber-100/60 rounded-2xl p-4 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-amber-950">
                👑 Tổng kết toàn Năm học {academicConfig.schoolYear} ({availableWeeks.length} tuần thực học)
              </h4>
              <p className="text-[11px] font-bold text-slate-600">
                Từ {availableWeeks[0]?.startFormatted || '07/09/2026'} đến {availableWeeks[availableWeeks.length - 1]?.endFormatted || '16/05/2027'} • Tổng tích lũy xuyên suốt cả năm học.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Năm học:</span>
              <select
                value={academicConfig.schoolYear}
                onChange={() => playStarSound('click')}
                aria-label="Chọn năm học"
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-400 text-xs font-black text-amber-950"
              >
                <option value={academicConfig.schoolYear}>Năm học {academicConfig.schoolYear}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Celebratory Announcement Banner with Congratulations and Stop sound/effects */}
      {isCelebrating && (
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 rounded-3xl p-5 text-white shadow-xl border-2 border-yellow-300 flex flex-col sm:flex-row items-center justify-between gap-4 animate-scale-in">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <span className="text-3xl animate-bounce">👑</span>
            <div>
              <h3 className="text-base sm:text-xl font-black tracking-wide drop-shadow-md">
                🎉 Congratulations! – Chúc mừng các ngôi sao Lớp 2A5! 🎉
              </h3>
              <p className="text-xs text-amber-100 font-bold mt-0.5">
                Vinh danh thành tích tuyệt vời của học sinh và 4 tổ thi đua xuất sắc nhất trong {periodRange.labelVi}!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCelebrate}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/40 cursor-pointer"
            >
              Pháo hoa nữa ✨
            </button>
            <button
              type="button"
              onClick={handleStopCelebration}
              className="px-4 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Volume2 className="w-4 h-4" />
              <span>Tắt âm thanh & Dừng hiệu ứng</span>
            </button>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-[17px] sm:text-[18.5px] font-black text-[#263C72] flex items-center gap-2">
              <Crown className="w-5.5 h-5.5 text-amber-500 fill-amber-300" />
              <span>Bục Vinh Danh Top 3 Xuất Sắc Nhất ({periodRange.labelVi})</span>
            </h3>
            <p className="text-[13px] font-bold text-slate-600">
              Top 3 Shining Stars Podium ({periodRange.labelEn})
            </p>
          </div>

          <span className="text-[12.5px] font-bold text-slate-600">
            Tự động xếp hạng theo sao thực nhận / Ranked by net stars earned
          </span>
        </div>

        {/* Podium visualization */}
        {sortedStudents.length >= 3 && top1 && top2 && top3 ? (
          <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-2">
            {/* Top 2 (Silver) */}
            <div className="flex flex-col items-center w-28 sm:w-38 text-center">
              <div className="relative mb-2">
                <img
                  src={top2.avatarUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=120'}
                  alt={top2.fullName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-slate-300 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 bg-slate-500 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white">
                  2
                </span>
              </div>
              <h4 className="text-[14px] sm:text-[15px] font-black text-slate-800 truncate w-full">{top2.fullName}</h4>
              <p className="text-[12.5px] font-black text-slate-600 mb-2">
                {top2.periodNet} sao / stars
              </p>
              <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-2xl border-t-4 border-slate-300 flex items-center justify-center font-black text-slate-400 text-xl">
                🥈
              </div>
            </div>

            {/* Top 1 (Gold) */}
            <div className="flex flex-col items-center w-32 sm:w-44 text-center">
              <div className="relative mb-2">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Crown className="w-8 h-8 text-amber-500 fill-amber-300 drop-shadow-md animate-bounce" />
                </div>
                <img
                  src={top1.avatarUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'}
                  alt={top1.fullName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-amber-400 shadow-lg"
                />
                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white font-black text-xs w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                  1
                </span>
              </div>
              <h4 className="text-[15.5px] sm:text-[17px] font-black text-amber-950 truncate w-full">{top1.fullName}</h4>
              <p className="text-[13px] font-black text-amber-700 mb-2">
                {top1.periodNet} sao / stars
              </p>
              <div className="w-full h-32 sm:h-36 bg-gradient-to-t from-amber-300 to-yellow-200 rounded-t-2xl border-t-4 border-amber-400 flex items-center justify-center font-black text-amber-600 text-2xl shadow-inner">
                🥇
              </div>
            </div>

            {/* Top 3 (Bronze) */}
            <div className="flex flex-col items-center w-28 sm:w-38 text-center">
              <div className="relative mb-2">
                <img
                  src={top3.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                  alt={top3.fullName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-orange-300 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white">
                  3
                </span>
              </div>
              <h4 className="text-[14px] sm:text-[15px] font-black text-slate-800 truncate w-full">{top3.fullName}</h4>
              <p className="text-[12.5px] font-black text-slate-600 mb-2">
                {top3.periodNet} sao / stars
              </p>
              <div className="w-full h-18 sm:h-22 bg-gradient-to-t from-orange-200 to-orange-100 rounded-t-2xl border-t-4 border-orange-300 flex items-center justify-center font-black text-orange-400 text-xl">
                🥉
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-xs text-slate-600">Chưa đủ dữ liệu học sinh để xếp bục vinh danh.</p>
        )}
      </div>

      {/* Team Competition Progress Bars */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-[17px] sm:text-[18.5px] font-black text-[#263C72] flex items-center gap-2">
              <Flag className="w-5.5 h-5.5 text-indigo-600" />
              <span>Thi Đua 4 Tổ Vương Quốc ({periodRange.labelVi})</span>
            </h3>
            <p className="text-[13px] font-bold text-slate-600">
              4 Kingdom Teams Competition ({periodRange.labelEn})
            </p>
          </div>
          <span className="text-[12.5px] font-bold text-slate-600">
            Tính theo tổng điểm sao các thành viên trong kỳ / Total team stars in period
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedTeams.map((team, index) => {
            const percentage = Math.min(100, Math.round((team.periodPoints / maxTeamPoints) * 100));
            return (
              <div
                key={team.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-2xs"
                      style={{ backgroundColor: team.color }}
                    >
                      {index === 0 ? '🏆' : index + 1}
                    </span>
                    <div>
                      <h4 className="text-[15px] font-black text-slate-800 flex items-center gap-1.5">
                        <span>{team.nameVi}</span>
                        <span className="text-base">{team.mascot}</span>
                      </h4>
                      <p className="text-[12.5px] font-bold text-slate-600">{team.nameEn}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[18px] font-black text-slate-900 block">
                      {team.periodPoints} ⭐
                    </span>
                    <span className="text-[11.5px] font-bold text-slate-600">sao thi đua / stars</span>
                  </div>
                </div>

                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: team.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-[17px] sm:text-[18.5px] font-black text-[#263C72] flex items-center gap-2">
              <Users className="w-5.5 h-5.5 text-sky-600" />
              <span>Bảng Xếp Hạng Toàn Thể Học Sinh ({sortedStudents.length})</span>
            </h3>
            <p className="text-[13px] font-bold text-slate-600">
              Full Student Leaderboard
            </p>
          </div>

          <span className="text-[12.5px] font-bold text-slate-600">
            Nhấn Giấy khen để in chứng nhận vinh danh / Click Certificate to print award
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-slate-50 text-[12px] text-slate-700 font-black border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">
                  <div>Hạng</div>
                  <div className="text-[10.5px] font-bold text-slate-500">Rank</div>
                </th>
                <th className="py-2.5 px-3">
                  <div>Học sinh</div>
                  <div className="text-[10.5px] font-bold text-slate-500">Student</div>
                </th>
                <th className="py-2.5 px-3">
                  <div>Tổ thi đua</div>
                  <div className="text-[10.5px] font-bold text-slate-500">Team</div>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <div>Sao kỳ này</div>
                  <div className="text-[10.5px] font-bold text-slate-500">Period Stars</div>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <div>Tổng sao tích lũy</div>
                  <div className="text-[10.5px] font-bold text-slate-500">Total Stars</div>
                </th>
                <th className="py-2.5 px-3 text-center">
                  <div>Vinh danh</div>
                  <div className="text-[10.5px] font-bold text-slate-500">Certificate</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {sortedStudents.map((st, idx) => (
                <tr key={st.id} className="hover:bg-amber-50/40 transition">
                  <td className="py-2.5 px-3 font-black text-slate-800">
                    {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={st.avatarUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=80'}
                        alt={st.fullName}
                        className="w-8.5 h-8.5 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <span className="font-black text-slate-800 block text-[14px]">{st.fullName}</span>
                        <span className="text-[11.5px] font-bold text-slate-500">{st.studentCode}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className="text-[12px] font-black px-2.5 py-0.5 rounded-lg inline-block"
                      style={{
                        backgroundColor: st.team?.bgColor || '#f1f5f9',
                        color: st.team?.color || '#334155',
                      }}
                    >
                      {st.team?.nameVi || 'Chưa xếp tổ'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-amber-700 text-[14.5px]">
                    +{st.periodNet} ⭐
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-800 text-[14px]">
                    {st.totalEarnedStars} ⭐
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => {
                        playStarSound('click');
                        setCertificateStudent(st);
                      }}
                      className="px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 transition cursor-pointer inline-flex flex-col items-center leading-tight"
                    >
                      <span className="text-[12.5px] font-black">📜 Giấy khen</span>
                      <span className="text-[10.5px] font-bold text-amber-800">Award</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projector TV Mode Fullscreen Overlay */}
      {isProjectorMode && (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white p-6 sm:p-10 flex flex-col justify-between overflow-y-auto">
          {/* Top Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 bg-white shadow-lg shrink-0">
                <img
                  src={schoolLogoSrc}
                  alt={schoolNameVi}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/kingdom/school_logo_v2.png';
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-amber-400 font-['Fredoka',sans-serif]">
                  VƯƠNG QUỐC NGÔI SAO – BẢNG VÀNG {classNameVi.toUpperCase()}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  {schoolNameVi} • Kỳ vinh danh: {periodRange.labelVi}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCelebrate}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs shadow-lg cursor-pointer"
              >
                🎉 Pháo hoa
              </button>
              <button
                onClick={() => setIsProjectorMode(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Main Grid: Top 3 Students + Teams */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-6">
            {/* Top 3 List (7 cols) */}
            <div className="lg:col-span-7 bg-slate-800/80 rounded-3xl p-8 border border-slate-700 shadow-2xl space-y-4">
              <h3 className="text-xl font-black text-amber-400 mb-6 text-center">
                👑 TOP 3 NGÔI SAO XUẤT SẮC NHẤT
              </h3>

              {sortedStudents.slice(0, 3).map((st, i) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-700/60 border border-slate-600"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </span>
                    <img
                      src={st.avatarUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=100'}
                      alt={st.fullName}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-400"
                    />
                    <div>
                      <h4 className="text-lg font-black text-white">{st.fullName}</h4>
                      <p className="text-xs text-slate-300">{st.studentCode} • {st.team?.nameVi || 'Chưa xếp tổ'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-amber-400">{st.periodNet}</span>
                    <span className="text-xs text-slate-400 block">sao kỳ này</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 4 Teams (5 cols) */}
            <div className="lg:col-span-5 bg-slate-800/80 rounded-3xl p-8 border border-slate-700 shadow-2xl space-y-4">
              <h3 className="text-xl font-black text-sky-400 mb-6 text-center">
                🚩 THI ĐUA 4 TỔ VƯƠNG QUỐC
              </h3>
              {sortedTeams.map((tm) => (
                <div key={tm.id} className="p-3.5 rounded-2xl bg-slate-700/60 border border-slate-600">
                  <div className="flex items-center justify-between mb-1.5 text-sm font-black">
                    <span style={{ color: tm.color }}>{tm.nameVi} {tm.mascot}</span>
                    <span>{tm.periodPoints} sao</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (tm.periodPoints / maxTeamPoints) * 100)}%`,
                        backgroundColor: tm.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="text-center text-xs text-slate-400">
            Chế độ trình chiếu máy chiếu cho lớp học • Nhấn [X] để quay lại màn hình làm việc
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {certificateStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-sky-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-[#263C72]">
                  Giấy Chứng Nhận Vinh Danh – Star Kingdom Certificate
                </h3>
              </div>
              <button
                onClick={() => setCertificateStudent(null)}
                className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customization controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chọn học sinh khen thưởng:</label>
                <select
                  value={certificateStudent.id}
                  onChange={(e) => {
                    const st = students.find((s) => s.id === e.target.value);
                    if (st) setCertificateStudent(st);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-800"
                >
                  {sortedStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.studentCode} • {s.periodNet} sao kỳ này)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Danh hiệu vinh danh:</label>
                <select
                  value={certHonor}
                  onChange={(e) => setCertHonor(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                >
                  <option value="Ngôi sao xuất sắc tuần – Tinh tú tỏa sáng">Ngôi sao xuất sắc tuần</option>
                  <option value="Học sinh tiến bộ vượt bậc tuần này">Học sinh tiến bộ vượt bậc</option>
                  <option value="Chiến binh chăm chỉ – Chăm ngoan học giỏi">Chiến binh chăm chỉ</option>
                  <option value="Quán quân vương quốc sao – Star Champion">Quán quân vương quốc sao</option>
                  <option value="Thủ lĩnh gương mẫu – Tinh thần đồng đội">Thủ lĩnh gương mẫu</option>
                  <option value="Vua sáng tạo – Khám phá tri thức mới">Vua sáng tạo</option>
                </select>
              </div>
            </div>

            {/* Printable Certificate Frame */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 border-4 border-amber-300 shadow-inner text-center relative overflow-hidden print:m-0 print:border-amber-400">
              {/* Corner Ornaments */}
              <div className="absolute top-2 left-2 text-xl">⭐</div>
              <div className="absolute top-2 right-2 text-xl">⭐</div>
              <div className="absolute bottom-2 left-2 text-xl">⭐</div>
              <div className="absolute bottom-2 right-2 text-xl">⭐</div>

              <div className="flex flex-col items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-white shadow-sm mb-1.5">
                  <img
                    src={schoolLogoSrc}
                    alt={schoolNameVi}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/kingdom/school_logo_v2.png';
                    }}
                  />
                </div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700">
                  {schoolNameVi} • {classNameVi}
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-900 font-['Fredoka',sans-serif] uppercase tracking-wide mb-1">
                GIẤY CHỨNG NHẬN VINH DANH
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                CERTIFICATE OF STAR ACHIEVEMENT • VƯƠNG QUỐC NGÔI SAO
              </p>

              <p className="text-xs text-slate-600 mb-1 font-semibold">Trân trọng trao tặng em:</p>
              <h3 className="text-2xl sm:text-3xl font-black text-[#263C72] font-['Nunito',sans-serif] mb-2 tracking-tight">
                {certificateStudent.fullName}
              </h3>
              <p className="text-xs font-bold text-sky-700 mb-3">
                Mã số: {certificateStudent.studentCode} • Thành tích kỳ: {certificateStudent.totalEarnedStars} ⭐ sao vàng
              </p>

              <div className="inline-block px-5 py-2 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 font-black text-xs sm:text-sm mb-6 shadow-2xs">
                🏅 {certHonor}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-amber-200 text-xs px-4">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-400 block">Ngày chứng nhận:</span>
                  <span className="font-bold text-slate-700">{new Date().toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block">Giáo viên chủ nhiệm:</span>
                  <span className="font-black text-amber-800 text-sm">Cô Thảo</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCertificateStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>In giấy chứng nhận (Print / PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
