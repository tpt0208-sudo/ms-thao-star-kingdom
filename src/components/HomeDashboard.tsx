import React, { useState } from 'react';
import { AppState, Student, Team, RankingPeriod } from '../types';
import {
  Users,
  Shield,
  Star,
  Trophy,
  Flag,
  Clock,
  Crown,
  PieChart,
  Sparkles,
  ChevronRight,
  Mic,
  Video,
  Image as ImageIcon,
  BookOpen,
  FolderOpen,
  Briefcase,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { ACADEMIC_MONTHS_2026_2027, getTeamPeriodPoints as calcTeamPeriodPoints, getPeriodRange } from '../utils/timePeriodService';

interface HomeDashboardProps {
  appState: AppState;
  onNavigateTab: (tab: NavTab) => void;
  onNavigateTool?: (toolTab: 'noise' | 'timer' | 'picker') => void;
  onNavigateLibraryCategory?: (cat: 'video' | 'image' | 'book' | 'other') => void;
  onQuickStarReward: (delta: number) => void;
  onOpenBatchReward: () => void;
  onSelectStudent: (student: Student) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  appState,
  onNavigateTab,
  onNavigateTool,
  onNavigateLibraryCategory,
  onQuickStarReward,
  onOpenBatchReward,
  onSelectStudent,
}) => {
  const { students, teams, starTransactions, attendance } = appState;
  const [rankingPeriod, setRankingPeriod] = useState<string>('week');

  // Compute team points per period, supporting months from Sep 2026 to May 2027
  const getTeamPeriodPoints = (team: Team, periodChoice: string): number => {
    if (periodChoice.startsWith('month_')) {
      const mKey = periodChoice.replace('month_', '').replace('_', '-');
      return calcTeamPeriodPoints(team, starTransactions, 'month', appState.academicConfig, undefined, mKey);
    }
    if (periodChoice === 'month') {
      return calcTeamPeriodPoints(team, starTransactions, 'month', appState.academicConfig);
    }
    return calcTeamPeriodPoints(team, starTransactions, periodChoice as RankingPeriod, appState.academicConfig);
  };

  // Compute stats or defaults matching mockup
  const totalStudents = students.length > 0 ? students.length : 28;
  const totalTeams = teams.length > 0 ? teams.length : 4;
  const totalStars = students.length > 0
    ? students.reduce((acc, s) => acc + s.totalEarnedStars, 0)
    : 186;

  // Attendance rate
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance[todayKey];
  let attendanceRate = 92;
  if (todayAtt && todayAtt.records && Object.keys(todayAtt.records).length > 0) {
    const records = Object.values(todayAtt.records);
    const presentCount = records.filter((r) => r === 'present' || r === 'late').length;
    attendanceRate = Math.round((presentCount / records.length) * 100);
  }

  // Dynamic top shining students from active students list
  const shiningStudents = React.useMemo(() => {
    if (students && students.length > 0) {
      const sorted = [...students].sort((a, b) => {
        if (b.weeklyStars !== a.weeklyStars) return b.weeklyStars - a.weeklyStars;
        return b.totalEarnedStars - a.totalEarnedStars;
      });
      return sorted.slice(0, 5).map((s) => {
        const starVal = s.weeklyStars > 0 ? s.weeklyStars : (s.totalEarnedStars % 5) + 1;
        return {
          id: s.id,
          name: s.fullName,
          stars: `+${starVal} sao`,
          starsEn: `+${starVal} stars`,
          img:
            s.avatarUrl ||
            (s.gender === 'female'
              ? '/assets/kingdom/student_ngoc.png'
              : '/assets/kingdom/student_minh.png'),
          gender: s.gender,
          student: s as Student | undefined,
        };
      });
    }
    return [
      { id: '1', name: 'Nguyễn Minh', stars: '+5 sao', starsEn: '+5 stars', img: '/assets/kingdom/student_minh.png', gender: 'male' as const, student: undefined },
      { id: '2', name: 'Trần Bảo Ngọc', stars: '+5 sao', starsEn: '+5 stars', img: '/assets/kingdom/student_ngoc.png', gender: 'female' as const, student: undefined },
      { id: '3', name: 'Lê Gia Huy', stars: '+4 sao', starsEn: '+4 stars', img: '/assets/kingdom/student_huy.png', gender: 'male' as const, student: undefined },
      { id: '4', name: 'Phạm Hà Anh', stars: '+4 sao', starsEn: '+4 stars', img: '/assets/kingdom/student_anh.png', gender: 'female' as const, student: undefined },
      { id: '5', name: 'Bùi Quang Minh', stars: '+3 sao', starsEn: '+3 stars', img: '/assets/kingdom/student_qminh.png', gender: 'male' as const, student: undefined },
    ];
  }, [students]);

  const currentWeekRange = getPeriodRange('week', appState.academicConfig);

  return (
    <div className="space-y-4 w-full">
      {/* ================= ROW 1: Class Overview (3 cols) | Teams Ranking (4 cols) | Classroom Tools (3 cols) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3.5 w-full">
        {/* 1. Tổng quan lớp học (Class Overview) - 3 Cols */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-4.5 border border-sky-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-amber-100 text-amber-600 shadow-2xs">
                <Crown className="w-5 h-5 fill-amber-400 text-amber-600" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-black text-[#263C72] leading-tight">
                  Tổng quan lớp học
                </h3>
                <p className="text-[12.5px] font-bold text-slate-600">Class Overview</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('teams')}
              className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition flex flex-col items-end cursor-pointer border border-sky-100"
            >
              <span className="text-[12.5px] font-black leading-tight">Xem chi tiết</span>
              <span className="text-[10.5px] font-bold text-sky-600 leading-tight">View Details</span>
            </button>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Học sinh / Students (Pink) */}
            <div className="p-3 rounded-2xl bg-[#FFF0F6] border border-pink-100 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-pink-400 text-white flex items-center justify-center shadow-xs shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="typo-stat-number text-[#263C72] block leading-tight">
                  {totalStudents}
                </span>
                <span className="text-[13.5px] font-black text-pink-800 leading-tight block">
                  Học sinh
                </span>
                <span className="text-[12px] font-bold text-slate-600 block truncate">
                  Students
                </span>
              </div>
            </div>

            {/* 2. Tổ / Teams (Mint Green) */}
            <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-emerald-100 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="typo-stat-number text-[#263C72] block leading-tight">
                  {totalTeams}
                </span>
                <span className="text-[13.5px] font-black text-emerald-800 leading-tight block">
                  Tổ thi đua
                </span>
                <span className="text-[12px] font-bold text-slate-600 block truncate">
                  Teams
                </span>
              </div>
            </div>

            {/* 3. Tổng số sao / Total Stars (Gold) */}
            <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-yellow-200 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-white flex items-center justify-center shadow-xs shrink-0">
                <Star className="w-5 h-5 fill-white" />
              </div>
              <div className="min-w-0">
                <span className="typo-stat-number text-[#263C72] block leading-tight">
                  {totalStars}
                </span>
                <span className="text-[13.5px] font-black text-amber-900 leading-tight block truncate">
                  Tổng số sao
                </span>
                <span className="text-[12px] font-bold text-slate-600 block truncate">
                  Total Stars
                </span>
              </div>
            </div>

            {/* 4. Điểm danh hôm nay (Purple/Indigo) */}
            <div className="p-3 rounded-2xl bg-[#F5F3FF] border border-purple-100 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <PieChart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="typo-stat-number text-[#263C72] block leading-tight">
                  {attendanceRate}%
                </span>
                <span className="text-[13.5px] font-black text-indigo-800 leading-tight block truncate">
                  Điểm danh hôm nay
                </span>
                <span className="text-[12px] font-bold text-slate-600 block truncate">
                  Attendance Today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Thi đua 4 tổ (Teams Ranking) - 4 Cols */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-4.5 border border-sky-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-amber-400 text-white shadow-2xs">
                <Trophy className="w-5 h-5 fill-amber-200 text-amber-100" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-black text-[#263C72] leading-tight">
                  Thi đua 4 tổ
                </h3>
                <p className="text-[12.5px] font-bold text-slate-600">Teams Ranking</p>
              </div>
            </div>

            {/* Period selector dropdown */}
            <select
              value={rankingPeriod}
              onChange={(e) => setRankingPeriod(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[12.5px] font-black text-slate-700 cursor-pointer focus:outline-none max-w-[210px]"
            >
              <option value="week">{currentWeekRange.labelVi} / {currentWeekRange.labelEn}</option>
              <optgroup label="Chọn tháng / Select Month (2026 - 2027)">
                {ACADEMIC_MONTHS_2026_2027.map((m) => (
                  <option key={m.monthKey} value={`month_${m.monthKey.replace('-', '_')}`}>
                    {m.labelVi} ({m.labelEn}) {m.isCurrent ? '⭐' : ''}
                  </option>
                ))}
              </optgroup>
              <option value="semester1">Học kì 1 / Semester 1</option>
              <option value="semester2">Học kì 2 / Semester 2</option>
              <option value="year">Cả năm 2026 - 2027 / Full Year</option>
            </select>
          </div>

          {/* 4 Teams Podiums / Cards */}
          <div className="grid grid-cols-4 gap-2">
            {(() => {
              const fourTeams = teams.slice(0, 4);
              const sortedByPoints = [...fourTeams].sort(
                (a, b) => getTeamPeriodPoints(b, rankingPeriod) - getTeamPeriodPoints(a, rankingPeriod)
              );
              const ranksMap: Record<string, number> = {};
              sortedByPoints.forEach((t, i) => {
                ranksMap[t.id] = i + 1;
              });

              return fourTeams.map((team) => {
                const pts = getTeamPeriodPoints(team, rankingPeriod);
                const rank = ranksMap[team.id] || 1;

                return (
                  <div
                    key={team.id}
                    onClick={() => onNavigateTab('teams')}
                    className={`p-2 sm:p-2.5 rounded-2xl border-2 text-center flex flex-col items-center justify-between transition hover:-translate-y-1 shadow-2xs cursor-pointer group ${team.bgColor} ${team.borderColor}`}
                    title={`${team.nameVi} (${team.nameEn}) - Nhấn để xem & chỉnh sửa tổ`}
                  >
                    {/* Team Avatar or Flag Icon */}
                    <div className="relative mb-1">
                      {team.avatarUrl ? (
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 p-0.5 bg-white shadow-2xs group-hover:scale-105 transition"
                          style={{ borderColor: team.color, boxShadow: `0 0 0 2px ${team.color}40` }}
                        >
                          <img
                            src={team.avatarUrl}
                            alt={team.nameVi}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      ) : (
                        <Flag
                          className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-xs group-hover:scale-110 transition"
                          style={{ color: team.color, fill: team.color }}
                        />
                      )}
                    </div>

                    {/* Team Name */}
                    <h4 className="text-[13px] font-black text-slate-800 truncate w-full leading-tight">
                      {team.nameVi.split(':')[0]}
                    </h4>
                    <p className="text-[11.5px] font-bold text-slate-600 truncate w-full leading-tight">
                      {team.nameEn?.split(':')[0] || team.nameVi.split(':')[1]?.trim() || team.nameEn}
                    </p>

                    {/* Points for selected period */}
                    <div className="my-1">
                      <span className="text-[18px] sm:text-[20px] font-black text-slate-900 block leading-tight">
                        {pts}
                      </span>
                      <span className="text-[11.5px] font-bold text-slate-600 block leading-tight">
                        sao / stars
                      </span>
                    </div>

                    {/* Rank circle */}
                    <div
                      className="w-5.5 h-5.5 rounded-full text-white text-[12px] font-black flex items-center justify-center shadow-xs mt-0.5"
                      style={{ backgroundColor: team.color }}
                    >
                      {rank}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* 3. Bộ công cụ (Classroom Tools) - 3 Cols - Directly matching mockup! */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-4.5 border border-sky-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-orange-100 text-orange-600 shadow-2xs">
                <Briefcase className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-[16px] sm:text-[17px] font-black text-[#263C72] leading-tight">
                  Bộ công cụ
                </h3>
                <p className="text-[12.5px] font-bold text-slate-600">Classroom Tools</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('tools')}
              className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition cursor-pointer flex flex-col items-end border border-sky-100"
            >
              <span className="text-[12.5px] font-black leading-tight">Xem tất cả</span>
              <span className="text-[10.5px] font-bold text-sky-600 leading-tight">View All</span>
            </button>
          </div>

          {/* 3 Tool Rows matching mockup */}
          <div className="space-y-2 my-auto">
            {/* Tool 1: Đo tiếng ồn (Noise Meter) */}
            <button
              onClick={() => {
                onNavigateTool ? onNavigateTool('noise') : onNavigateTab('tools');
              }}
              className="w-full p-2.5 rounded-2xl bg-[#FFFBEB] hover:bg-amber-100 border border-amber-200 flex items-center justify-between gap-2.5 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-amber-400 text-white flex items-center justify-center text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  ⭐
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-black text-amber-950 block leading-tight truncate">
                    Đo tiếng ồn
                  </span>
                  <span className="text-[12px] font-bold text-amber-800 block truncate">
                    Noise Meter
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* Tool 2: Đếm ngược (Countdown Timer) */}
            <button
              onClick={() => {
                onNavigateTool ? onNavigateTool('timer') : onNavigateTab('tools');
              }}
              className="w-full p-2.5 rounded-2xl bg-[#EFF6FF] hover:bg-blue-100 border border-blue-200 flex items-center justify-between gap-2.5 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-blue-500 text-white flex items-center justify-center text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  ⏰
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-black text-blue-950 block leading-tight truncate">
                    Đếm ngược
                  </span>
                  <span className="text-[12px] font-bold text-blue-800 block truncate">
                    Countdown Timer
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* Tool 3: Gọi tên ngẫu nhiên (Random Picker) */}
            <button
              onClick={() => {
                onNavigateTool ? onNavigateTool('picker') : onNavigateTab('tools');
              }}
              className="w-full p-2.5 rounded-2xl bg-[#FAF5FF] hover:bg-purple-100 border border-purple-200 flex items-center justify-between gap-2.5 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-purple-500 text-white flex items-center justify-center text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  🎡
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-black text-purple-950 block leading-tight truncate">
                    Gọi tên ngẫu nhiên
                  </span>
                  <span className="text-[12px] font-bold text-purple-800 block truncate">
                    Random Picker
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= ROW 2: Shining Students | Latest Activities | Quick Reward | Learning Library (4 Balanced Cols) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 w-full">
        {/* 1. Học sinh tỏa sáng hôm nay */}
        <div className="bg-white rounded-3xl p-4.5 border border-sky-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-amber-100 text-amber-600">
                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              </div>
              <div>
                <h3 className="text-[15.5px] sm:text-[16.5px] font-black text-[#263C72] leading-tight">
                  Học sinh tỏa sáng hôm nay
                </h3>
                <p className="text-[12.5px] font-bold text-slate-600">Shining Students Today</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('students')}
              className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition cursor-pointer flex flex-col items-end border border-sky-100 shrink-0"
            >
              <span className="text-[12.5px] font-black leading-tight">Xem tất cả</span>
              <span className="text-[10.5px] font-bold text-sky-600 leading-tight">View All</span>
            </button>
          </div>

          {/* 5 Shining Students dynamically loaded with circular avatars */}
          <div className="grid grid-cols-5 gap-1.5 text-center my-auto py-1">
            {shiningStudents.map((st, index) => (
              <div
                key={st.id || index}
                onClick={() => {
                  if (st.student) {
                    onSelectStudent(st.student);
                  } else {
                    onNavigateTab('students');
                  }
                }}
                className="flex flex-col items-center p-1 rounded-2xl hover:bg-sky-50 transition cursor-pointer group"
                title={`${st.name} (${st.stars} / ${st.starsEn})`}
              >
                <div className="relative mb-1">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden ring-2 ring-amber-300 shadow-xs bg-amber-50 group-hover:scale-105 transition-transform">
                    <img
                      src={st.img}
                      alt={st.name}
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          st.gender === 'female'
                            ? '/assets/kingdom/student_ngoc.png'
                            : '/assets/kingdom/student_minh.png';
                      }}
                    />
                  </div>
                </div>
                <span className="text-[12px] font-black text-[#263C72] truncate w-full leading-tight">
                  {st.name}
                </span>
                <span className="text-[11.5px] font-extrabold text-amber-700 mt-0.5 leading-tight">
                  {st.stars}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Hoạt động mới nhất */}
        <div className="bg-white rounded-3xl p-4.5 border border-sky-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-pink-100 text-pink-600">
                <Clock className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h3 className="text-[15.5px] sm:text-[16.5px] font-black text-[#263C72] leading-tight">
                  Hoạt động mới nhất
                </h3>
                <p className="text-[12.5px] font-bold text-slate-600">Latest Activities</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('news')}
              className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition cursor-pointer flex flex-col items-end border border-sky-100 shrink-0"
            >
              <span className="text-[12.5px] font-black leading-tight">Xem tất cả</span>
              <span className="text-[10.5px] font-bold text-sky-600 leading-tight">View All</span>
            </button>
          </div>

          {/* 4 Activities matching mockup */}
          <div className="space-y-1.5">
            {[
              {
                icon: '⭐',
                bg: 'bg-rose-100 text-rose-600',
                title: 'Cô Thảo đã thưởng 5 sao cho Nguyễn Minh',
                titleEn: 'Ms. Thao awarded 5 stars to Nguyễn Minh',
                time: '2 phút trước • 2 mins ago',
              },
              {
                icon: '🚩',
                bg: 'bg-emerald-100 text-emerald-600',
                title: 'Tổ 2 đạt thành tích cao nhất tuần!',
                titleEn: 'Team 2 achieved the highest weekly score!',
                time: '30 phút trước • 30 mins ago',
              },
              {
                icon: '📚',
                bg: 'bg-blue-100 text-blue-600',
                title: 'Bài đăng mới: Hoạt động STEM tuần này',
                titleEn: 'New post: STEM Activity this week',
                time: '1 giờ trước • 1 hour ago',
              },
              {
                icon: '🎂',
                bg: 'bg-purple-100 text-purple-600',
                title: 'Chúc mừng sinh nhật Trần Bảo Ngọc',
                titleEn: 'Happy Birthday to Trần Bảo Ngọc',
                time: '3 giờ trước • 3 hours ago',
              },
            ].map((item, i) => (
              <div key={i} className="p-2 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${item.bg}`}>
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-slate-800 leading-tight truncate">
                    {item.title}
                  </p>
                  <p className="text-[11.5px] font-bold text-slate-600 leading-tight truncate">
                    {item.titleEn}
                  </p>
                  <span className="text-[11px] font-semibold text-slate-500 leading-none block mt-0.5">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Thưởng sao nhanh */}
        <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/70 rounded-3xl p-4.5 border border-amber-300 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-2xl bg-amber-400 text-white shadow-2xs">
              <Sparkles className="w-5 h-5 fill-amber-100" />
            </div>
            <div>
              <h3 className="text-[15.5px] sm:text-[16.5px] font-black text-amber-950 leading-tight">
                Thưởng sao nhanh
              </h3>
              <p className="text-[12.5px] font-bold text-amber-800">Quick Star Reward</p>
            </div>
          </div>

          {/* Quick buttons */}
          <div className="grid grid-cols-3 gap-1.5 my-1.5">
            {[1, 3, 5].map((val) => (
              <button
                key={val}
                onClick={() => onQuickStarReward(val)}
                className="py-2 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 font-black flex flex-col items-center justify-center gap-0.5 shadow-2xs transition cursor-pointer active:scale-95"
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span className="text-[13.5px] font-black leading-tight">+{val} sao</span>
                <span className="text-[11px] font-bold text-amber-800 leading-tight">+{val} {val === 1 ? 'Star' : 'Stars'}</span>
              </button>
            ))}
          </div>

          {/* Vibrant Pink Select Students Button matching mockup */}
          <button
            onClick={onOpenBatchReward}
            className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#F43F5E] via-[#EC4899] to-[#F59E0B] hover:opacity-95 text-white font-black shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
          >
            <Star className="w-4.5 h-4.5 fill-white shrink-0" />
            <div className="text-center min-w-0">
              <span className="block leading-tight font-black text-[13.5px] truncate">Chọn học sinh để thưởng sao</span>
              <span className="block text-[11.5px] font-bold text-white/95 leading-tight truncate">Select students to give stars</span>
            </div>
          </button>
        </div>

        {/* 4. Kho học liệu (Learning Library) */}
        <div className="bg-white rounded-3xl p-4.5 border border-sky-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-blue-100 text-blue-600 shadow-2xs">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-[15.5px] sm:text-[16.5px] font-black text-[#263C72] leading-tight">
                  Kho học liệu
                </h3>
                <p className="text-[12.5px] font-bold text-slate-600">Learning Library</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('library')}
              className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition cursor-pointer flex flex-col items-end border border-sky-100 shrink-0"
            >
              <span className="text-[12.5px] font-black leading-tight">Xem tất cả</span>
              <span className="text-[10.5px] font-bold text-sky-600 leading-tight">View All</span>
            </button>
          </div>

          {/* 4 Category 2x2 Grid matching mockup */}
          <div className="grid grid-cols-2 gap-2 my-auto">
            {/* Category 1: Video */}
            <button
              onClick={() => {
                onNavigateLibraryCategory ? onNavigateLibraryCategory('video') : onNavigateTab('library');
              }}
              className="p-2.5 rounded-2xl bg-[#FFF1F2] hover:bg-rose-100 border border-rose-200 flex items-center gap-2 text-left transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <Video className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[13.5px] font-black text-rose-950 block leading-tight truncate">Video</span>
                <span className="text-[11.5px] font-bold text-rose-800 block truncate">Videos</span>
              </div>
            </button>

            {/* Category 2: Hình ảnh */}
            <button
              onClick={() => {
                onNavigateLibraryCategory ? onNavigateLibraryCategory('image') : onNavigateTab('library');
              }}
              className="p-2.5 rounded-2xl bg-[#F0FDF4] hover:bg-emerald-100 border border-emerald-200 flex items-center gap-2 text-left transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[13.5px] font-black text-emerald-950 block leading-tight truncate">Hình ảnh</span>
                <span className="text-[11.5px] font-bold text-emerald-800 block truncate">Images</span>
              </div>
            </button>

            {/* Category 3: Sách truyện */}
            <button
              onClick={() => {
                onNavigateLibraryCategory ? onNavigateLibraryCategory('book') : onNavigateTab('library');
              }}
              className="p-2.5 rounded-2xl bg-[#FFF7ED] hover:bg-orange-100 border border-orange-200 flex items-center gap-2 text-left transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[13.5px] font-black text-orange-950 block leading-tight truncate">Sách truyện</span>
                <span className="text-[11.5px] font-bold text-orange-800 block truncate">Books & Stories</span>
              </div>
            </button>

            {/* Category 4: Khác */}
            <button
              onClick={() => {
                onNavigateLibraryCategory ? onNavigateLibraryCategory('other') : onNavigateTab('library');
              }}
              className="p-2.5 rounded-2xl bg-[#FFFBEB] hover:bg-amber-100 border border-amber-200 flex items-center gap-2 text-left transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[13.5px] font-black text-amber-950 block leading-tight truncate">Khác</span>
                <span className="text-[11.5px] font-bold text-amber-800 block truncate">Other Resources</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
