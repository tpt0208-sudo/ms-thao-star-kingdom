import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Student, ClassInfo, SchoolInfo } from '../types';
import { api } from '../services/api';
import {
  Star,
  Sparkles,
  QrCode,
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  Copy,
  Check,
  Download,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface LoginPageProps {
  students: Student[];
  currentClass?: ClassInfo;
  school?: SchoolInfo;
  onTeacherLoginSuccess: (userEmail?: string, displayName?: string, token?: string) => void;
  onStudentLoginSuccess: (student: Student, token?: string) => void;
  onGuestStudentAccess: (token?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentClass,
  school,
  onTeacherLoginSuccess,
  onStudentLoginSuccess,
  onGuestStudentAccess,
}) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [studentPinInput, setStudentPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [classQrDataUrl, setClassQrDataUrl] = useState<string>('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const studentPortalUrl = `${origin}?portal=student&classId=${currentClass?.id || 'class_2a5'}`;

  // Generate QR code for Student Portal
  useEffect(() => {
    QRCode.toDataURL(studentPortalUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1E3A8A',
        light: '#FFFFFF',
      },
    })
      .then((url) => setClassQrDataUrl(url))
      .catch((err) => console.error('Failed to generate portal QR:', err));
  }, [studentPortalUrl]);

  // Handle Google Login (Direct 1-Click Authentication)
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const userEmail = (email.trim() || 'tpt0208@gmail.com').toLowerCase();
      const userName = userEmail.includes('thao') ? 'Cô Thảo' : userEmail.split('@')[0] || 'Giáo viên';

      const serverAuth = await api.teacherLogin({
        email: userEmail,
        isGoogleAuth: true,
        displayName: userName,
      });
      onTeacherLoginSuccess(serverAuth.user.email, serverAuth.user.name, serverAuth.token);
    } catch (err: any) {
      setAuthError(err?.message || 'Không thể đăng nhập. Vui lòng thử lại. / Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Email & Password Login (Universal Login for Any Teacher / User)
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanEmail = (email.trim() || 'tpt0208@gmail.com').toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setAuthError('Vui lòng nhập địa chỉ Email/Gmail của bạn. / Please enter your Email address.');
      return;
    }

    setLoading(true);
    try {
      const serverAuth = await api.teacherLogin({
        email: cleanEmail,
        password: cleanPass,
        displayName: cleanEmail.includes('thao') ? 'Cô Thảo' : cleanEmail.split('@')[0],
      });
      onTeacherLoginSuccess(serverAuth.user.email, serverAuth.user.name, serverAuth.token);
    } catch (err: any) {
      setAuthError(err?.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Student Code + Security PIN submission
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const code = studentCodeInput.trim().toUpperCase();
    const pin = studentPinInput.trim();

    if (!code) {
      setAuthError('Vui lòng nhập Mã số học sinh (VD: 2A501). / Please enter your Student Code (e.g. 2A501).');
      return;
    }
    if (!pin) {
      setAuthError('Vui lòng nhập Mã PIN bảo mật. / Please enter your Security PIN.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.studentLogin(code, pin);
      onStudentLoginSuccess(res.student, res.token);
    } catch (err: any) {
      setAuthError(
        err?.message || 'Mã học sinh hoặc mã PIN bảo mật không đúng. / Invalid Student Code or Security PIN.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccessClick = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const res = await api.guestLogin();
      onGuestStudentAccess(res.token);
    } catch {
      onGuestStudentAccess();
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2FE] via-[#F0F8FF] to-[#EFF6FF] flex flex-col justify-between py-4 sm:py-5 px-3 sm:px-4 font-['Nunito',sans-serif]">
      {/* Top Brand Bar */}
      <header className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-white shadow-md border-2 border-sky-300 ring-2 ring-white p-0.5 shrink-0">
            <img
              src={school?.logoUrl || '/assets/kingdom/school_logo_v2.png'}
              alt="School Logo"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/kingdom/school_logo_v2.png';
              }}
            />
          </div>
          <div>
            <div className="text-[13px] sm:text-sm uppercase font-extrabold tracking-wide text-sky-900 leading-tight">
              {school?.nameVi || 'Trường Tiểu học & THCS Thư Lâm'}
            </div>
            <div className="text-xs uppercase font-bold tracking-wide text-sky-700 leading-tight mt-0.5">
              {school?.nameEn || 'THU LAM PRIMARY & LOWER SECONDARY SCHOOL'}
            </div>
            <div className="text-lg sm:text-xl font-black text-[#1E3A8A] leading-tight mt-1">
              Vương quốc ngôi sao
              <span className="block sm:inline sm:ml-2 text-sky-700 font-extrabold text-xs sm:text-sm">
                • Ms. Thao's Star Kingdom
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-sky-200 shadow-sm text-center sm:text-right">
          <Sparkles className="w-5 h-5 text-amber-500 animate-spin-slow shrink-0" />
          <div className="leading-snug">
            <div className="text-sm font-black text-sky-950">
              Mỗi ngày vui học – Mỗi ngày tỏa sáng!
            </div>
            <div className="text-xs font-bold text-sky-700">
              Learn Happy, Shine Bright Every Day!
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: 2 Columns */}
      <main className="max-w-5xl mx-auto w-full my-auto py-2 sm:py-3">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-4 border-[#BAE6FD] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* ================= LEFT COLUMN: KINGDOM VISUAL BANNER ================= */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#263C72] via-[#1E3A8A] to-[#0284C7] p-6 sm:p-7 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Background sparkle glow accents */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              {/* Top Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/15 text-white mb-4 backdrop-blur-sm border border-white/20">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                <div className="leading-tight">
                  <span className="block text-[13px] font-black text-white">Cổng Đăng Nhập & Truy Cập Lớp Học</span>
                  <span className="block text-[11.5px] font-bold text-sky-100">Login & Classroom Access Portal</span>
                </div>
              </div>

              {/* Title: Vietnamese prominent in white & amber, English right below */}
              <div className="mb-4">
                <h1 className="typo-title-main font-black leading-tight text-white">
                  Chào mừng tới <br />
                  <span className="text-amber-300 drop-shadow-sm">
                    Vương quốc ngôi sao!
                  </span>
                </h1>
                <div className="text-sm sm:text-base font-bold text-sky-100 mt-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Welcome to Ms. Thao's Star Kingdom!</span>
                </div>
              </div>

              {/* Description: Vietnamese & English */}
              <div className="mb-4 space-y-1 bg-white/12 p-3.5 rounded-2xl backdrop-blur-sm border border-white/15">
                <p className="text-white text-[15px] leading-snug font-extrabold">
                  Hệ thống thi đua và quản lý lớp học thông minh
                </p>
                <p className="text-sky-100 text-[13px] leading-snug font-semibold">
                  Smart Classroom Competition & Management System
                </p>
              </div>

              {/* Feature Cards 1 & 2 */}
              <div className="space-y-3 mb-4">
                {/* Feature Card 1 */}
                <div className="flex items-start gap-3 bg-white/12 p-3.5 rounded-2xl backdrop-blur-sm border border-white/15">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/30 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                    <Star className="w-5 h-5 fill-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-black text-white leading-tight">
                      Quản lý thi đua & Tích sao
                    </div>
                    <div className="text-[12.5px] font-bold text-amber-200 leading-tight mt-0.5">
                      Team Competition & Star Rewards
                    </div>
                    <div className="text-white/95 text-[13px] font-semibold mt-1 leading-snug">
                      4 tổ thi đua, bảng vàng & đổi thưởng hấp dẫn.
                    </div>
                    <div className="text-sky-100 text-[12px] font-medium leading-snug">
                      Four teams, leaderboards & exciting reward redemption.
                    </div>
                  </div>
                </div>

                {/* Feature Card 2 */}
                <div className="flex items-start gap-3 bg-white/12 p-3.5 rounded-2xl backdrop-blur-sm border border-white/15">
                  <div className="w-9 h-9 rounded-xl bg-sky-400/30 flex items-center justify-center text-sky-200 shrink-0 mt-0.5">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-black text-white leading-tight">
                      Thư viện bài học & STEM
                    </div>
                    <div className="text-[12.5px] font-bold text-sky-200 leading-tight mt-0.5">
                      Learning Library & STEM
                    </div>
                    <div className="text-white/95 text-[13px] font-semibold mt-1 leading-snug">
                      Học liệu, sách điện tử và video bổ ích.
                    </div>
                    <div className="text-sky-100 text-[12px] font-medium leading-snug">
                      Learning resources, e-books & educational videos.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Share Link Box */}
            <div className="relative z-10 bg-white/15 p-3.5 rounded-2xl border border-white/25 backdrop-blur-sm">
              <div className="text-[14px] font-black text-white leading-tight">
                Liên kết chia sẻ cho giáo viên & học sinh
              </div>
              <div className="text-[12px] text-sky-100 font-semibold mb-2 leading-tight">
                Shareable Link for Teachers & Students
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={origin}
                  className="bg-black/30 text-white font-mono text-xs px-3 py-2 rounded-xl flex-1 outline-none truncate border border-white/20 shadow-inner"
                />
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#1E3A8A] rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-sm cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <div className="text-left leading-tight">
                    <span className="block font-black text-[13px] text-[#1E3A8A]">
                      {copiedLink ? 'Đã sao chép!' : 'Sao chép'}
                    </span>
                    <span className="block font-bold text-[11px] text-sky-900">
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: INTERACTIVE LOGIN TABS ================= */}
          <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between bg-white">
            <div>
              {/* Portal Selector Tabs: Teacher vs Student */}
              <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-sky-50 rounded-2xl mb-4 border border-sky-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('teacher');
                    setAuthError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl transition-all flex flex-col items-center justify-center cursor-pointer ${
                    activeTab === 'teacher'
                      ? 'bg-[#1E3A8A] text-white shadow-md'
                      : 'text-slate-700 hover:text-sky-950 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-[15px] leading-tight">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Giáo viên & Quản lý</span>
                  </div>
                  <span className={`text-[12px] font-bold mt-0.5 ${activeTab === 'teacher' ? 'text-sky-100' : 'text-slate-600'}`}>
                    Teachers & Administrators
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('student');
                    setAuthError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl transition-all flex flex-col items-center justify-center cursor-pointer ${
                    activeTab === 'student'
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'text-slate-700 hover:text-amber-900 hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-[15px] leading-tight">
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>Học sinh quét QR</span>
                  </div>
                  <span className={`text-[12px] font-bold mt-0.5 ${activeTab === 'student' ? 'text-amber-50' : 'text-slate-600'}`}>
                    Student QR Access
                  </span>
                </button>
              </div>

              {/* Error Banner */}
              {authError && (
                <div className="mb-3.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-sm text-rose-800 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span className="flex-1 font-bold leading-snug">{authError}</span>
                </div>
              )}

              {/* TAB 1: TEACHER & ADMIN LOGIN */}
              {activeTab === 'teacher' && (
                <div className="space-y-3.5 animate-fade-in">
                  {/* Form Title & Subtitle */}
                  <div>
                    <h2 className="typo-title-section font-black text-[#1E3A8A] leading-tight">
                      Đăng nhập Giáo Viên Lớp Học
                    </h2>
                    <div className="text-[13.5px] font-extrabold text-sky-700 leading-tight mt-0.5">
                      Classroom Teacher Login
                    </div>
                    <p className="text-[14.5px] text-slate-700 mt-1.5 font-bold leading-snug">
                      Đăng nhập bằng tài khoản Google/Gmail hoặc Email và mật khẩu.
                      <span className="block text-[12.5px] text-slate-600 font-semibold mt-0.5">
                        Sign in with your Google account or email and password.
                      </span>
                    </p>
                  </div>

                  {/* Google Sign In Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 hover:border-sky-400 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-2xs transition-all transform active:scale-[0.99] cursor-pointer"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <div className="text-left leading-tight">
                      <span className="block font-black text-slate-900 text-[15px]">
                        Đăng nhập với Google / Gmail
                      </span>
                      <span className="block text-[12.5px] text-slate-600 font-bold">
                        Sign in with Google Account
                      </span>
                    </div>
                  </button>

                  {/* Divider: HOẶC DÙNG EMAIL & MẬT KHẨU / OR USE EMAIL & PASSWORD */}
                  <div className="flex items-center my-1.5">
                    <div className="flex-1 border-t border-slate-200" />
                    <div className="px-3 text-center leading-tight">
                      <span className="block text-xs uppercase text-slate-700 font-black tracking-wider">
                        HOẶC DÙNG EMAIL & MẬT KHẨU
                      </span>
                      <span className="block text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                        OR USE EMAIL & PASSWORD
                      </span>
                    </div>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleEmailSignIn} className="space-y-3">
                    <div>
                      <label className="block mb-1 leading-tight">
                        <span className="block text-[15px] font-black text-slate-800">Địa chỉ Email / Gmail</span>
                        <span className="block text-[12.5px] text-slate-600 font-bold">Email Address</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com (hoặc tpt0208@gmail.com)"
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl text-[15px] font-bold text-slate-900 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 leading-tight">
                        <span className="block text-[15px] font-black text-slate-800">Mật khẩu</span>
                        <span className="block text-[12.5px] text-slate-600 font-bold">Password</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Nhập mật khẩu... / Enter your password..."
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl text-[15px] font-bold text-slate-900 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
                    >
                      <LogIn className="w-5 h-5 shrink-0" />
                      <div className="text-center leading-tight">
                        <span className="block font-black text-[15px] text-white">
                          {loading ? 'Đang đăng nhập...' : 'Đăng nhập vào hệ thống'}
                        </span>
                        <span className="block font-bold text-[12px] text-sky-200">
                          {loading ? 'Signing in...' : 'Sign In to System'}
                        </span>
                      </div>
                    </button>
                  </form>

                  {/* Security & Role Notice */}
                  <div className="pt-2 border-t border-slate-100 text-center leading-tight">
                    <span className="block text-[12.5px] text-slate-600 font-bold">
                      🔒 Khu vực quản trị được bảo mật dành riêng cho Giáo viên chủ nhiệm.
                    </span>
                    <span className="block text-[11.5px] text-slate-500 font-semibold">
                      Secured administration area reserved for the Homeroom Teacher.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: STUDENT PORTAL & QR SCAN */}
              {activeTab === 'student' && (
                <div className="space-y-3.5 animate-fade-in">
                  <div>
                    <h2 className="typo-title-section font-black text-[#1E3A8A] leading-tight">
                      Đăng nhập học sinh & Quét mã QR
                    </h2>
                    <div className="text-[13.5px] font-extrabold text-amber-700 leading-tight mt-0.5">
                      Student Login & Scan QR Code
                    </div>
                    <p className="text-[14.5px] text-slate-700 mt-1.5 font-bold leading-snug">
                      Quét mã QR bằng điện thoại/iPad hoặc nhập Mã học sinh và Mã PIN để vào học tập.
                      <span className="block text-[12.5px] text-slate-600 font-semibold mt-0.5">
                        Scan QR code with phone/iPad or enter your Student Code & PIN to access classroom.
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center bg-sky-50/80 p-3.5 rounded-2xl border border-sky-200">
                    {/* QR Code visual */}
                    <div className="sm:col-span-5 flex flex-col items-center">
                      {classQrDataUrl ? (
                        <div className="bg-white p-2 rounded-2xl shadow-md border border-sky-200 inline-block">
                          <img src={classQrDataUrl} alt="Class QR" className="w-32 h-32 sm:w-36 sm:h-36 object-contain" />
                        </div>
                      ) : (
                        <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-500">
                          Đang tạo QR... / Generating QR...
                        </div>
                      )}
                      <div className="text-[13px] font-extrabold text-slate-700 mt-1.5 text-center leading-tight">
                        <span>Mã lớp: <b className="text-[#1E3A8A]">{currentClass?.nameVi || 'Lớp 2A5'}</b></span>
                        <span className="block text-[11.5px] text-slate-600 font-bold">Class Code: {currentClass?.nameEn || 'Class 2A5'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = classQrDataUrl;
                          link.download = `QR_VaoLop_${currentClass?.nameVi || '2A5'}.png`;
                          link.click();
                        }}
                        className="mt-1.5 px-3 py-1 rounded-xl bg-white border border-sky-200 hover:bg-sky-100 text-sky-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <div className="text-left leading-tight">
                          <span className="block text-[12.5px] font-black">Tải ảnh QR</span>
                          <span className="block text-[11px] font-bold text-sky-700">Download QR Code</span>
                        </div>
                      </button>
                    </div>

                    {/* Student Portal Benefits */}
                    <div className="sm:col-span-7 space-y-2">
                      <div className="leading-tight">
                        <span className="block text-[14px] font-black text-sky-950">📱 Quyền lợi cổng học sinh</span>
                        <span className="block text-[12px] font-bold text-sky-700">Student Portal Benefits</span>
                      </div>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="font-black text-[13.5px] text-slate-800 block">Số sao & bảng xếp hạng cá nhân</span>
                            <span className="text-[12px] text-slate-600 font-semibold block">Individual stars & leaderboard</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="font-black text-[13.5px] text-slate-800 block">Thư viện bài giảng, STEM, video</span>
                            <span className="text-[12px] text-slate-600 font-semibold block">Lesson library, STEM & videos</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="font-black text-[13.5px] text-slate-800 block">Bảng tin lớp và đổi quà tặng</span>
                            <span className="text-[12px] text-slate-600 font-semibold block">Class news & reward redemption</span>
                          </div>
                        </li>
                      </ul>

                      <a
                        href={studentPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-900 pt-1"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        <div className="leading-tight">
                          <span className="block text-[13px] font-black underline">Mở cổng học sinh trực tiếp</span>
                          <span className="block text-[11.5px] font-bold text-sky-600">Open Student Portal Directly</span>
                        </div>
                      </a>
                    </div>
                  </div>

                  {/* Authenticated Student Code + PIN Form */}
                  <form onSubmit={handleStudentLogin} className="space-y-2.5 pt-0.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block mb-1 leading-tight">
                          <span className="block text-[14.5px] font-black text-slate-800">
                            Mã số học sinh (VD: 2A501)
                          </span>
                          <span className="block text-[12px] text-slate-600 font-bold">
                            Student Code (e.g. 2A501)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={studentCodeInput}
                          onChange={(e) => setStudentCodeInput(e.target.value.toUpperCase())}
                          placeholder="VD: 2A501"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl text-[14.5px] font-black uppercase tracking-wider outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block mb-1 leading-tight">
                          <span className="block text-[14.5px] font-black text-slate-800">
                            Mã PIN bảo mật
                          </span>
                          <span className="block text-[12px] text-slate-600 font-bold">
                            Security PIN
                          </span>
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          value={studentPinInput}
                          onChange={(e) => setStudentPinInput(e.target.value)}
                          placeholder="Nhập mã PIN / Enter PIN"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl text-[14.5px] font-black tracking-widest outline-none"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <div className="text-center leading-tight">
                        <span className="block font-black text-[14.5px]">
                          {loading ? 'Đang xác thực...' : 'Đăng nhập Cổng Học Sinh'}
                        </span>
                        <span className="block font-bold text-[12px] text-amber-50">
                          {loading ? 'Verifying...' : 'Sign In to Student Portal'}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleGuestAccessClick}
                      className="inline-flex flex-col items-center text-slate-700 hover:text-sky-800 cursor-pointer leading-tight"
                    >
                      <span className="text-[13.5px] font-extrabold underline">Xem với tư cách khách (Chỉ đọc)</span>
                      <span className="text-[12px] font-bold text-slate-500">Browse as Guest (Read-Only)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer bilingual notice */}
            <div className="pt-3.5 mt-3.5 border-t border-slate-200 flex flex-col items-center justify-center text-center gap-1.5">
              <span className="text-xs text-slate-600 font-bold">
                Hệ thống quản lý lớp học Song ngữ Việt – Anh • Bilingual Classroom System
              </span>
              <span className="text-[11.5px] text-slate-500 font-medium tracking-wide">
                © 2026 Phuong Thao Tran. All rights reserved.
              </span>
            </div>
          </div>

        </div>
      </main>

      {/* Bottom hint: Bilingual */}
      <footer className="max-w-4xl mx-auto w-full text-center leading-snug">
        <div className="text-[13.5px] text-sky-900 font-extrabold">
          Đăng nhập giáo viên quản lý lớp hoặc quét mã QR dành cho học sinh truy cập tự do mọi lúc mọi nơi.
        </div>
        <div className="text-[12px] text-sky-700 font-bold">
          Teacher administration login or student QR code access anytime, anywhere.
        </div>
      </footer>
    </div>
  );
};
