import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Student, AppState, LearningResource, ClassNewsItem } from '../types';
import {
  UserCircle,
  Star,
  Award,
  Gift,
  Target,
  Sparkles,
  Lock,
  LogOut,
  Shield,
  CheckCircle,
  BookOpen,
  Megaphone,
  Trophy,
  QrCode,
  Download,
  ExternalLink,
  ChevronRight,
  Heart,
  Calendar,
  Tag,
  Pin,
  Flame,
  Music,
} from 'lucide-react';
import { playStarSound, triggerGrandCelebration } from '../utils/effects';

interface StudentPortalViewProps {
  appState: AppState;
  currentStudent: Student | null;
  onLogin: (code: string, pin: string) => Promise<void>;
  onLogout: () => void;
  onRedeemReward: (rewardId: string, studentId: string) => Promise<void>;
  onExitPortal: () => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  appState,
  currentStudent,
  onLogin,
  onLogout,
  onRedeemReward,
  onExitPortal,
}) => {
  const [studentCode, setStudentCode] = useState('2A501');
  const [pin, setPin] = useState('2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentTab, setStudentTab] = useState<'rewards' | 'library' | 'news' | 'halloffame' | 'myqr'>('rewards');
  const [myQrUrl, setMyQrUrl] = useState<string>('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Generate individual QR for student
  useEffect(() => {
    if (currentStudent) {
      const studentUrl = `${origin}?portal=student&classId=${currentStudent.classId}&code=${currentStudent.studentCode || currentStudent.id}`;
      QRCode.toDataURL(studentUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#1E3A8A', light: '#FFFFFF' },
      }).then(setMyQrUrl).catch(console.error);
    }
  }, [currentStudent, origin]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(studentCode, pin);
      playStarSound('star');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  // If not logged in, show student login / QR scan screen
  if (!currentStudent) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-3xl shadow-xl border-4 border-amber-200 text-center animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-200 flex items-center justify-center text-amber-700 shadow-md">
          <Star className="w-10 h-10 fill-amber-400 text-amber-600 animate-pulse" />
        </div>
        <h2 className="typo-title-main text-[#1E3A8A] font-['Fredoka',sans-serif]">
          Cổng Học Sinh Vương Quốc ⭐
        </h2>
        <p className="text-[14px] font-extrabold text-amber-600 mt-0.5">
          Student Kingdom Portal
        </p>
        <p className="text-xs text-slate-600 mb-6 font-bold mt-1">
          Dành riêng cho các bạn nhỏ {appState.classInfo.nameVi} • Xem sao, học bài và đổi quà
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
          <div>
            <label className="block mb-1">
              <span className="block text-[14px] font-black text-slate-800 leading-tight">Mã học sinh của em (VD: 2A501):</span>
              <span className="block text-[11.5px] font-bold text-slate-500 leading-tight">Your Student Code (e.g. 2A501)</span>
            </label>
            <input
              type="text"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
              placeholder="VD: 2A501"
              className="w-full px-3.5 py-2.5 text-sm font-black rounded-xl border border-slate-300 bg-slate-50 uppercase tracking-wider"
              required
            />
          </div>

          <div>
            <label className="block mb-1">
              <span className="block text-[14px] font-black text-slate-800 leading-tight">Mã PIN bảo mật:</span>
              <span className="block text-[11.5px] font-bold text-slate-500 leading-tight">Security PIN</span>
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Nhập mã PIN / Enter PIN"
              className="w-full px-3.5 py-2.5 text-sm font-black rounded-xl border border-slate-300 bg-slate-50 tracking-widest"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-black shadow-md transition cursor-pointer"
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="text-[15px]">{loading ? 'Đang mở cổng...' : 'ĐĂNG NHẬP VÀO VƯƠNG QUỐC ⭐'}</span>
              <span className="text-[12px] font-bold text-amber-950/80">Enter the Star Kingdom</span>
            </span>
          </button>
        </form>

        <div className="mt-5">
          <button
            onClick={onExitPortal}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            ← Quay lại trang đăng nhập chính / Back to Main Login
          </button>
        </div>
      </div>
    );
  }

  // Logged-in Student View
  const team = appState.teams.find((t) => t.id === currentStudent.teamId);

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Student Profile Banner */}
      <div className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 border-2 border-sky-300/40 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row relative z-10">
          <div className="relative">
            <img
              src={currentStudent.avatarUrl || '/assets/kingdom/student_minh.png'}
              alt={currentStudent.fullName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-amber-300 shadow-lg bg-white"
            />
            <span className="absolute -top-1 -left-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-black text-xs shadow-md border border-amber-200">
              Cấp {currentStudent.level} / Lv.{currentStudent.level}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5 justify-center md:justify-start flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black font-['Fredoka',sans-serif]">{currentStudent.fullName}</h2>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white/20 border border-white/20">
                {currentStudent.studentCode}
              </span>
            </div>
            <p className="text-xs text-sky-100 font-bold mt-1">
              Thành viên / Member: <span className="text-amber-300 font-black">{team ? team.nameVi : 'Lớp 2A5'}</span> • {appState.classInfo.nameVi} cô Thảo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {/* Spendable Stars */}
          <div className="px-5 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-center shadow-inner">
            <div className="flex items-center justify-center gap-1.5 text-amber-300">
              <Star className="w-6 h-6 fill-amber-300 animate-spin-slow" />
              <span className="typo-stat-number">{currentStudent.spendableStars}</span>
            </div>
            <span className="text-[12px] font-black text-white uppercase tracking-wider block leading-tight mt-0.5">
              Sao đổi quà
            </span>
            <span className="text-[10.5px] font-bold text-sky-100 block leading-tight">
              Spendable Stars
            </span>
          </div>

          {/* Total Accumulated Stars */}
          <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center hidden sm:block">
            <div className="text-xl font-black text-white">⭐ {currentStudent.totalEarnedStars}</div>
            <span className="text-[12px] font-bold text-white block leading-tight mt-0.5">Tổng tích lũy</span>
            <span className="text-[10.5px] font-bold text-sky-200 block leading-tight">Total Stars</span>
          </div>

          <button
            onClick={onLogout}
            className="p-3 rounded-2xl bg-white/20 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-sm"
            title="Đăng xuất khỏi tài khoản em / Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Student Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-sky-100 shadow-sm overflow-x-auto">
        {[
          { id: 'rewards' as const, label: 'Đổi Quà Tặng', en: 'Gift Shop', icon: Gift },
          { id: 'library' as const, label: 'Kho Bài Học & STEM', en: 'Learning Library', icon: BookOpen },
          { id: 'news' as const, label: 'Bản Tin Lớp Học', en: 'Class News', icon: Megaphone },
          { id: 'halloffame' as const, label: 'Bảng Vinh Danh', en: 'Hall of Fame', icon: Trophy },
          { id: 'myqr' as const, label: 'Mã QR Của Em', en: 'My QR Code', icon: QrCode },
        ].map((item) => {
          const isActive = studentTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                playStarSound('click');
                setStudentTab(item.id);
              }}
              className={`flex-1 min-w-[135px] py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-left ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-700 hover:bg-sky-50 hover:text-sky-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex flex-col leading-tight">
                <span className="text-[13.5px] font-black">{item.label}</span>
                <span className={`text-[11px] font-bold ${isActive ? 'text-sky-100' : 'text-slate-500'}`}>{item.en}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: REWARDS */}
      {studentTab === 'rewards' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[#1E3A8A] flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500 fill-amber-300 shrink-0" />
              <span className="flex flex-col leading-tight">
                <span>Cửa hàng quà tặng vương quốc (Em có {currentStudent.spendableStars} sao)</span>
                <span className="text-[12px] font-bold text-slate-500">Kingdom Gift Shop (You have {currentStudent.spendableStars} spendable stars)</span>
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {appState.rewards.map((rew) => {
              const canAfford = currentStudent.spendableStars >= rew.starCost;

              return (
                <div
                  key={rew.id}
                  className={`p-4 rounded-3xl border-2 transition flex flex-col justify-between ${
                    canAfford ? 'border-amber-300 bg-amber-50/40 shadow-sm' : 'border-slate-200 bg-slate-50/60 opacity-80'
                  }`}
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
                      <Gift className="w-7 h-7 fill-amber-300" />
                    </div>
                    <h4 className="text-[15px] font-black text-slate-800 text-center leading-tight mb-0.5">
                      {rew.titleVi}
                    </h4>
                    <p className="text-[12px] font-bold text-amber-700 text-center mb-1">
                      {rew.titleEn}
                    </p>
                    <p className="text-xs text-slate-500 text-center mb-3 font-medium">{rew.description}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                      <span>Giá / Cost: <b className="text-amber-600 font-black">{rew.starCost} sao ⭐</b></span>
                      <span>Kho / Stock: {rew.stock}</span>
                    </div>

                    <button
                      disabled={!canAfford || rew.stock <= 0}
                      onClick={async () => {
                        if (confirm(`Em có chắc chắn muốn đổi "${rew.titleVi}" bằng ${rew.starCost} sao?`)) {
                          await onRedeemReward(rew.id, currentStudent.id);
                          playStarSound('win');
                          triggerGrandCelebration();
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 text-white font-black shadow-sm transition cursor-pointer"
                    >
                      {canAfford ? (
                        <span className="flex flex-col items-center leading-tight">
                          <span className="text-[13.5px]">Đổi quà ngay! ✨</span>
                          <span className="text-[11px] font-bold text-amber-950/80">Redeem Gift Now</span>
                        </span>
                      ) : (
                        <span className="flex flex-col items-center leading-tight">
                          <span className="text-[13px]">Cần thêm {rew.starCost - currentStudent.spendableStars} sao</span>
                          <span className="text-[10.5px] font-bold text-amber-950/80">Need {rew.starCost - currentStudent.spendableStars} more stars</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LEARNING LIBRARY */}
      {studentTab === 'library' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4 animate-fade-in">
          <div>
            <h3 className="text-base font-black text-[#1E3A8A] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-600" />
              <span>Kho Học Liệu & Bài Học Kỳ Diệu ({appState.learningResources.length} tài nguyên)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tài liệu học tập, sách điện tử và video STEM bổ ích do cô Thảo chuẩn bị cho em.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {appState.learningResources.map((res) => (
              <div
                key={res.id}
                className="bg-sky-50/50 hover:bg-sky-50 rounded-2xl p-4 border border-sky-200 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-800">
                      {res.category.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                      {res.type.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1 leading-snug">
                    {res.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mb-3">
                    {res.description}
                  </p>
                </div>

                <a
                  href={res.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở bài học</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CLASS NEWS */}
      {studentTab === 'news' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4 animate-fade-in">
          <div>
            <h3 className="text-base font-black text-[#1E3A8A] flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-500" />
              <span>Bản Tin & Thông Báo Lớp Học ({appState.news.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật các hoạt động mới nhất, chúc mừng sinh nhật và thông báo từ cô Thảo.
            </p>
          </div>

          {/* Active news for students: exclude deleted and teacher-only posts, pinned on top */}
          <div className="space-y-4">
            {appState.news
              .filter((item) => !item.isDeleted && item.visibility !== 'teachers')
              .sort((a, b) => {
                const aPinned = a.pinned || a.isPinned ? 1 : 0;
                const bPinned = b.pinned || b.isPinned ? 1 : 0;
                if (aPinned !== bPinned) return bPinned - aPinned;
                return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
              })
              .map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all ${
                  item.pinned || item.isPinned
                    ? 'bg-amber-50/60 border-amber-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black">
                        <Pin className="w-3 h-3 fill-amber-950" />
                        Ghim đầu bảng
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-medium">{item.date}</span>
                  </div>
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
                    {item.author}
                  </span>
                </div>

                <h4 className="font-['Fredoka',sans-serif] text-base font-bold text-[#1E3A8A] mb-1.5">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-line mb-3">
                  {item.content}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-rose-500 font-bold">
                    <Heart className="w-3.5 h-3.5 fill-rose-500" />
                    <span>{item.likes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HALL OF FAME */}
      {studentTab === 'halloffame' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4 animate-fade-in">
          <div>
            <h3 className="text-base font-black text-[#1E3A8A] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 fill-amber-300" />
              <span>Bảng Vinh Danh 4 Tổ Thi Đua & Top Ngôi Sao</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cùng thi đua chăm ngoan, học giỏi để đưa tổ của mình lên đỉnh vinh quang!
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {appState.teams.map((t, idx) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-gradient-to-b from-sky-50 to-white border-2 border-sky-200 text-center shadow-xs"
              >
                <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-black text-white text-sm shadow-md" style={{ backgroundColor: t.color || '#3B82F6' }}>
                  #{idx + 1}
                </div>
                <div className="font-bold text-xs text-[#1E3A8A]">{t.nameVi}</div>
                <div className="text-lg font-black text-amber-500 mt-1">⭐ {t.points} điểm</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MY QR CODE */}
      {studentTab === 'myqr' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm text-center max-w-md mx-auto animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="font-['Fredoka',sans-serif] text-lg font-bold text-[#1E3A8A]">
            Thẻ QR Của Em: {currentStudent.fullName}
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">
            Quét mã này bằng camera điện thoại hoặc iPad để đăng nhập ngay mà không cần mật khẩu!
          </p>

          {myQrUrl ? (
            <div className="bg-gradient-to-b from-sky-50 to-white p-4 rounded-2xl border-2 border-sky-200 inline-block shadow-md">
              <img src={myQrUrl} alt="My QR" className="w-56 h-56 object-contain mx-auto" />
              <div className="mt-2 text-xs font-black text-sky-800">
                Mã học sinh: {currentStudent.studentCode}
              </div>
            </div>
          ) : (
            <div className="w-56 h-56 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-xs text-slate-400">
              Đang tạo mã QR...
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={() => {
                if (myQrUrl) {
                  const link = document.createElement('a');
                  link.href = myQrUrl;
                  link.download = `TheQR_${currentStudent.studentCode}_${currentStudent.fullName}.png`;
                  link.click();
                }
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Tải thẻ QR về máy
            </button>
          </div>
        </div>
      )}

      {/* Bottom return to teacher button */}
      <div className="text-center pt-4">
        <button
          onClick={onExitPortal}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          ← Trở lại giao diện Quản lý Giáo viên
        </button>
      </div>
    </div>
  );
};
