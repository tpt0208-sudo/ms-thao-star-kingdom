import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import type { AppState, ClassInfo, Student, Team, StarTransaction, AttendanceRecord, LearningResource, AcademicCalendarConfig, FinalizedResult, AuditLogEntry, ClassNewsItem, AppNotification, NotificationReadRecord } from './src/types.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = process.env.DB_FILE
  ? path.resolve(process.cwd(), process.env.DB_FILE)
  : (process.env.USE_DEMO_DATA === 'true'
    ? path.resolve(DATA_DIR, 'demo_db.json')
    : path.resolve(DATA_DIR, 'db.json'));

// ---------------- SECURITY & RBAC CONFIGURATION ----------------
const SESSION_SECRET = process.env.SESSION_SECRET || 'starkingdom-hmac-secret-key-2026-thulam';

const DEFAULT_ALLOWED_TEACHER_EMAILS = [
  'tpt0208@gmail.com',
  'thaonguyen.gv@thulam.edu.vn',
  'cothao@gmail.com',
  'admin@starkingdom.edu.vn',
];

const ALLOWED_TEACHER_EMAILS = Array.from(
  new Set([
    ...DEFAULT_ALLOWED_TEACHER_EMAILS,
    ...(process.env.TEACHER_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  ])
);

const DEFAULT_TEACHER_PASSWORDS = [
  'Thao2A5@2026',
  'Thao2A5@2026!',
  'Thao2A5!2026',
  'Admin2A5@2026',
  'starkingdom2026',
  'StarKingdomDemo@2026',
  '123456',
  'admin',
];

const TEACHER_PASSWORDS = Array.from(
  new Set([
    ...DEFAULT_TEACHER_PASSWORDS,
    ...(process.env.TEACHER_PASSWORD || '').split(',').map((p) => p.trim()).filter(Boolean),
    ...(process.env.TEACHER_PASSWORDS || '').split(',').map((p) => p.trim()).filter(Boolean),
  ])
);

// In-Memory Brute-Force & Rate Limiting Guard for Authentication
interface LoginAttemptRecord {
  count: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, LoginAttemptRecord>();

export function checkRateLimit(key: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true };
  if (record.lockedUntil > now) {
    const waitMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return { allowed: false, waitMinutes };
  }
  if (record.lockedUntil && record.lockedUntil <= now) {
    loginAttempts.delete(key);
  }
  return { allowed: true };
}

export function recordLoginFailure(key: string): { locked: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // Lock for 15 minutes after 5 consecutive failures
    loginAttempts.set(key, record);
    return { locked: true, waitMinutes: 15 };
  }
  loginAttempts.set(key, record);
  return { locked: false };
}

export function resetLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

export interface SessionPayload {
  role: 'teacher' | 'student' | 'guest';
  userId: string;
  email?: string;
  name?: string;
  studentId?: string;
  studentCode?: string;
  exp: number;
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>, ttlHours = 24 * 7): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + ttlHours * 3600 * 1000,
  };
  const dataB64 = Buffer.from(JSON.stringify(fullPayload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(dataB64).digest('base64url');
  return `${dataB64}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [dataB64, sig] = token.split('.');
  if (!dataB64 || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(dataB64).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf-8')) as SessionPayload;
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function extractSession(req: Request): SessionPayload | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifySessionToken(authHeader.slice(7).trim());
  }
  const tokenHeader = req.headers['x-auth-token'];
  if (typeof tokenHeader === 'string') {
    return verifySessionToken(tokenHeader.trim());
  }
  return null;
}

export function sanitizeStudentRecord(st: Student, session: SessionPayload | null): Student {
  const { passcode: _passcode, ...rest } = st;
  const copy = { ...rest } as Student;

  if (session?.role === 'teacher') {
    return copy;
  }
  if (session?.role === 'student' && session.studentId === st.id) {
    // Student can see their own birth date, but not teacher private administrative notes
    copy.notes = '';
    return copy;
  }
  // For unauthenticated / guest / other students: protect full birthdate (year) & private notes
  copy.notes = '';
  copy.dob = '';
  return copy;
}

export function sanitizeAppState(state: AppState, session: SessionPayload | null): AppState {
  const isTeacher = session?.role === 'teacher';
  return {
    ...state,
    students: (state.students || []).map((st) => sanitizeStudentRecord(st, session)),
    news: isTeacher
      ? state.news
      : (state.news || []).filter((n) => !n.isDeleted && n.visibility !== 'teachers'),
    backups: isTeacher ? state.backups : [],
    auditLogs: isTeacher ? state.auditLogs : [],
  };
}

export function requireTeacher(req: Request, res: Response, next: NextFunction): void {
  const session = extractSession(req);
  const explicitRole = req.body?.role || req.headers['x-user-role'];
  if (explicitRole === 'student' || explicitRole === 'guest') {
    res.status(403).json({
      success: false,
      error: 'Từ chối truy cập: Tài khoản học sinh/khách không có quyền chỉnh sửa dữ liệu quản trị. / Access Denied: Teacher privileges required.',
    });
    return;
  }
  if (!session || session.role !== 'teacher') {
    res.status(403).json({
      success: false,
      error: 'Từ chối truy cập: Vui lòng đăng nhập tài khoản Giáo viên hợp lệ để thực hiện thao tác này. / Access Denied: Authenticated Teacher required.',
    });
    return;
  }
  next();
}

export function requireStudentOrTeacher(req: Request, res: Response, next: NextFunction): void {
  const session = extractSession(req);
  if (!session || (session.role !== 'teacher' && session.role !== 'student')) {
    res.status(403).json({
      success: false,
      error: 'Từ chối truy cập: Khách xem không được phép đổi quà hoặc thay đổi dữ liệu. / Access Denied: Guests cannot redeem rewards.',
    });
    return;
  }
  if (session.role === 'student' && req.body?.studentId && req.body.studentId !== session.studentId) {
    res.status(403).json({
      success: false,
      error: 'Học sinh chỉ được phép đổi quà bằng tài khoản ngôi sao của chính mình. / Students can only redeem rewards for their own account.',
    });
    return;
  }
  next();
}

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// High-speed response compression middleware (Gzip native) for faster web processing
app.use((req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = (req.headers['accept-encoding'] as string) || '';
  if (!acceptEncoding.includes('gzip')) {
    return next();
  }

  const originalSend = res.send.bind(res);
  res.send = function (body: any): Response {
    if (body && (typeof body === 'string' || Buffer.isBuffer(body))) {
      const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
      if (buffer.length > 1024) {
        try {
          const compressed = zlib.gzipSync(buffer, { level: 6 });
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Vary', 'Accept-Encoding');
          return originalSend(compressed);
        } catch {
          return originalSend(body);
        }
      }
    }
    return originalSend(body);
  };
  next();
});

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 28 Demo students list generator for class 2A5
export function getDemoStudents(classId: string): Student[] {
  const names = [
    { name: 'Nguyễn Minh', gender: 'male' as const, teamId: 'team_2', stars: 25, dob: '2018-10-15' },
    { name: 'Trần Bảo Ngọc', gender: 'female' as const, teamId: 'team_2', stars: 24, dob: '2018-10-27' },
    { name: 'Lê Gia Huy', gender: 'male' as const, teamId: 'team_1', stars: 22, dob: '2018-10-08' },
    { name: 'Phạm Hà Anh', gender: 'female' as const, teamId: 'team_3', stars: 21, dob: '2018-11-12' },
    { name: 'Bùi Quang Minh', gender: 'male' as const, teamId: 'team_1', stars: 20, dob: '2018-11-20' },
    { name: 'Đỗ Thảo Linh', gender: 'female' as const, teamId: 'team_2', stars: 19, dob: '2018-12-05' },
    { name: 'Hoàng Quốc Tuấn', gender: 'male' as const, teamId: 'team_4', stars: 18, dob: '2018-12-24' },
    { name: 'Vũ Ngọc Diệp', gender: 'female' as const, teamId: 'team_4', stars: 17, dob: '2018-01-18' },
    { name: 'Ngô Đức Anh', gender: 'male' as const, teamId: 'team_3', stars: 16, dob: '2018-02-14' },
    { name: 'Lý Mai Phương', gender: 'female' as const, teamId: 'team_1', stars: 15, dob: '2018-03-08' },
    { name: 'Đặng Tuấn Khang', gender: 'male' as const, teamId: 'team_2', stars: 18, dob: '2018-03-26' },
    { name: 'Phan Thùy Chi', gender: 'female' as const, teamId: 'team_3', stars: 14, dob: '2018-04-19' },
    { name: 'Trịnh Hoàng Long', gender: 'male' as const, teamId: 'team_4', stars: 16, dob: '2018-05-15' },
    { name: 'Dương Khánh Linh', gender: 'female' as const, teamId: 'team_2', stars: 22, dob: '2018-05-30' },
    { name: 'Bùi Anh Tuấn', gender: 'male' as const, teamId: 'team_1', stars: 17, dob: '2018-06-01' },
    { name: 'Lê Minh Hằng', gender: 'female' as const, teamId: 'team_3', stars: 15, dob: '2018-06-25' },
    { name: 'Nguyễn Tấn Đạt', gender: 'male' as const, teamId: 'team_4', stars: 13, dob: '2018-07-10' },
    { name: 'Trần Quỳnh Nga', gender: 'female' as const, teamId: 'team_2', stars: 19, dob: '2018-08-15' },
    { name: 'Chu Bảo Nam', gender: 'male' as const, teamId: 'team_1', stars: 18, dob: '2018-09-02' },
    { name: 'Mai Phương Uyên', gender: 'female' as const, teamId: 'team_4', stars: 16, dob: '2018-09-20' },
    { name: 'Hồ Đình Trọng', gender: 'male' as const, teamId: 'team_3', stars: 15, dob: '2018-10-02' },
    { name: 'Võ Minh Châu', gender: 'female' as const, teamId: 'team_3', stars: 17, dob: '2018-10-30' },
    { name: 'Đinh Phúc Khang', gender: 'male' as const, teamId: 'team_4', stars: 14, dob: '2018-11-05' },
    { name: 'Nguyễn Lan Hương', gender: 'female' as const, teamId: 'team_1', stars: 16, dob: '2018-12-18' },
    { name: 'Tạ Minh Khôi', gender: 'male' as const, teamId: 'team_2', stars: 17, dob: '2018-01-09' },
    { name: 'Lương Yến Nhi', gender: 'female' as const, teamId: 'team_3', stars: 15, dob: '2018-02-28' },
    { name: 'Cao Hải Đăng', gender: 'male' as const, teamId: 'team_1', stars: 14, dob: '2018-03-15' },
    { name: 'Vương Thảo Nguyên', gender: 'female' as const, teamId: 'team_4', stars: 15, dob: '2018-04-04' },
  ];

  return names.map((item, index) => {
    const code = `2A5${(index + 1).toString().padStart(2, '0')}`;
    const level = item.stars >= 100 ? 4 : item.stars >= 50 ? 3 : item.stars >= 20 ? 2 : 1;
    const avatar = item.gender === 'female' ? '/assets/kingdom/student_ngoc.png' : '/assets/kingdom/student_minh.png';

    return {
      id: `${classId}_student_${index + 1}`,
      classId,
      studentCode: code,
      fullName: item.name,
      gender: item.gender,
      teamId: item.teamId,
      avatarUrl: avatar,
      dob: item.dob || '2018-05-15',
      notes: 'Học sinh ngoan, chăm chỉ học tập.',
      totalEarnedStars: item.stars,
      spendableStars: item.stars,
      weeklyStars: Math.min(item.stars, 8),
      monthlyStars: item.stars,
      level,
      badgeIds: index < 4 ? ['badge_reading', 'badge_kindness'] : ['badge_teamwork'],
      passcode: '2026',
    };
  });
}

// Helper to parse birthdate string into day, month, year
export function parseBirthDate(dobStr: string | undefined | null): { day: number; month: number; year: number; formatted: string } | null {
  if (!dobStr || typeof dobStr !== 'string') return null;
  const trimmed = dobStr.trim();
  if (!trimmed) return null;

  // Case 1: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        year,
        month,
        day,
        formatted: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
      };
    }
  }

  // Case 2: DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
  const vnMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10);
    const year = parseInt(vnMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        year,
        month,
        day,
        formatted: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
      };
    }
  }

  // Case 3: Standard Date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = parsed.getDate();
    const month = parsed.getMonth() + 1;
    const year = parsed.getFullYear();
    if (year >= 1990 && year <= 2030) {
      return {
        year,
        month,
        day,
        formatted: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
      };
    }
  }

  return null;
}

// 3 Default Initial Notifications for Class
export function getDefaultNotifications(classId: string): AppNotification[] {
  return [
    {
      id: `${classId}_notif_1`,
      classId,
      type: 'star',
      titleVi: 'Thưởng 5 ngôi sao cho Nguyễn Minh',
      titleEn: '5 Stars Awarded to Nguyen Minh',
      messageVi: 'Cô Thảo đã thưởng 5 ngôi sao lấp lánh cho bạn Nguyễn Minh (Tổ 2 - Ngôi Sao Xanh) vì phát biểu xây dựng bài sôi nổi.',
      messageEn: 'Teacher Thao awarded 5 sparkling stars to Nguyen Minh (Team 2 - Blue Stars) for active and enthusiastic class participation.',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      targetRole: 'all',
      authorName: 'Cô Thảo',
      metadata: {
        studentId: `${classId}_student_1`,
        studentName: 'Nguyễn Minh',
        deltaStars: 5,
        teamId: 'team_2',
        teamName: 'Tổ 2: Ngôi Sao Xanh',
        severity: 'success',
        linkTab: 'rewards',
      },
    },
    {
      id: `${classId}_notif_2`,
      classId,
      type: 'news',
      titleVi: 'Bảng tin lớp: Hoạt động STEM tuần này',
      titleEn: 'Class News: This Week STEM Workshop',
      messageVi: 'Bài viết mới: "Chế tạo kính vạn hoa vương quốc lấp lánh với những ngôi sao kỳ diệu" đã được đăng trên bảng tin lớp.',
      messageEn: 'New article: "Crafting sparkling kingdom kaleidoscopes with magical stars" is now live on Class news board.',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      targetRole: 'all',
      authorName: 'Cô Thảo',
      metadata: {
        newsId: 'news_1',
        severity: 'normal',
        linkTab: 'news',
      },
    },
    {
      id: `${classId}_notif_3`,
      classId,
      type: 'celebration',
      titleVi: 'Vinh danh Tổ 2: Tạm dẫn đầu bảng thi đua tuần',
      titleEn: 'Honoring Team 2: Weekly Competition Leader',
      messageVi: 'Tổ 2 - Ngôi Sao Xanh xuất sắc dẫn đầu tuần với 289 sao và nhận cờ vàng danh dự từ cô Thảo!',
      messageEn: 'Team 2 - Blue Stars outstandingly leads the week with 289 stars and receives the golden honor flag from Teacher Thao!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      targetRole: 'all',
      authorName: 'Cô Thảo',
      metadata: {
        teamId: 'team_2',
        teamName: 'Tổ 2: Ngôi Sao Xanh',
        severity: 'success',
        linkTab: 'teams',
      },
    },
  ];
}


function getDefaultState(): AppState {
  const defaultClass: ClassInfo = {
    id: 'class_2a5',
    nameVi: 'Lớp 2A5',
    nameEn: 'Class 2A5',
    grade: 2,
    schoolYear: '2026 - 2027',
    teacherName: 'Cô Thảo',
    teacherTitleEn: 'Teacher Thao',
    teacherAvatar: '/assets/kingdom/teacher_avatar.png',
    targetSize: 28,
    sloganVi: 'Mỗi ngày vui học – Mỗi ngày tỏa sáng!',
    sloganEn: 'Learn Happy, Shine Bright!',
    coverUrl: '',
    bannerTheme: 'star_kingdom_default',
  };

  const sampleClass2: ClassInfo = {
    id: 'class_1a1',
    nameVi: 'Lớp 1A1',
    nameEn: 'Class 1A1',
    grade: 1,
    schoolYear: '2026 - 2027',
    teacherName: 'Cô Thảo',
    teacherTitleEn: 'Teacher Thao',
    teacherAvatar: '/assets/kingdom/teacher_avatar.png',
    targetSize: 25,
    sloganVi: 'Tự tin bước vào vương quốc tri thức!',
    sloganEn: 'Confident step into the Kingdom of Knowledge!',
    coverUrl: '',
    bannerTheme: 'star_kingdom_default',
  };

  return {
    school: {
      id: 'school_thulam',
      nameVi: 'Trường Tiểu học và THCS THƯ LÂM',
      nameEn: 'THU LAM PRIMARY AND LOWER SECONDARY SCHOOL',
      logoUrl: '/assets/kingdom/school_logo_v2.png',
    },
    classes: [defaultClass, sampleClass2],
    currentClassId: 'class_2a5',
    classInfo: defaultClass,
    teams: [
      {
        id: 'team_1',
        classId: 'class_2a5',
        nameVi: 'Tổ 1: Ngôi Sao Đỏ',
        nameEn: 'Team 1: Red Stars',
        color: '#EF4444',
        bgColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        flagColor: 'red',
        mascot: 'Lửa Nhiệt Huyết',
        points: 256,
        leaderId: 'class_2a5_student_3',
        weeklyPoints: 42,
        monthlyPoints: 256,
        semester1Points: 520,
        semester2Points: 256,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=RedFireLion&backgroundColor=ffadad',
        slogan: 'Nhiệt huyết bùng cháy, tự tin tỏa sáng!',
      },
      {
        id: 'team_2',
        classId: 'class_2a5',
        nameVi: 'Tổ 2: Ngôi Sao Xanh',
        nameEn: 'Team 2: Blue Stars',
        color: '#3B82F6',
        bgColor: '#EFF6FF',
        borderColor: '#93C5FD',
        flagColor: 'blue',
        mascot: 'Biển Thông Thái',
        points: 289,
        leaderId: 'class_2a5_student_1',
        weeklyPoints: 54,
        monthlyPoints: 289,
        semester1Points: 580,
        semester2Points: 289,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=BlueOcean&backgroundColor=a0c4ff',
        slogan: 'Vững vàng tri thức, bay cao ước mơ!',
      },
      {
        id: 'team_3',
        classId: 'class_2a5',
        nameVi: 'Tổ 3: Ngôi Sao Vàng',
        nameEn: 'Team 3: Golden Stars',
        color: '#EAB308',
        bgColor: '#FEFCE8',
        borderColor: '#FDE047',
        flagColor: 'gold',
        mascot: 'Mặt Trời Tỏa Sáng',
        points: 241,
        leaderId: 'class_2a5_student_4',
        weeklyPoints: 38,
        monthlyPoints: 241,
        semester1Points: 490,
        semester2Points: 241,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GoldenSun&backgroundColor=fdffb6',
        slogan: 'Đoàn kết yêu thương, cùng nhau tiến bước!',
      },
      {
        id: 'team_4',
        classId: 'class_2a5',
        nameVi: 'Tổ 4: Ngôi Sao Lá',
        nameEn: 'Team 4: Green Stars',
        color: '#22C55E',
        bgColor: '#F0FDF4',
        borderColor: '#86EFAC',
        flagColor: 'green',
        mascot: 'Mầm Cây Hy Vọng',
        points: 198,
        leaderId: 'class_2a5_student_7',
        weeklyPoints: 31,
        monthlyPoints: 198,
        semester1Points: 410,
        semester2Points: 198,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GreenSprout&backgroundColor=caffbf',
        slogan: 'Ươm mầm hy vọng, gặt hái thành công!',
      },
    ],
    students: getDemoStudents('class_2a5'),
    starTransactions: [
      {
        id: 'tx_init_1',
        classId: 'class_2a5',
        studentId: 'class_2a5_student_1',
        studentName: 'Nguyễn Minh',
        deltaStars: 5,
        teamId: 'team_2',
        reasonCategory: 'Phát biểu',
        reasonNote: 'Cô Thảo đã thưởng 5 sao cho Nguyễn Minh',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        createdBy: 'Cô Thảo',
      },
      {
        id: 'tx_init_2',
        classId: 'class_2a5',
        studentId: '',
        studentName: 'Tổ 2',
        deltaStars: 10,
        teamId: 'team_2',
        reasonCategory: 'Thi đua tổ',
        reasonNote: 'Tổ 2 đạt thành tích cao nhất tuần!',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        createdBy: 'Cô Thảo',
      },
    ],
    badges: [
      { id: 'badge_english', nameVi: 'English Speaker', nameEn: 'English Champion', iconName: 'Languages', descriptionVi: 'Tự tin phát âm và giao tiếp tiếng Anh chuẩn mực', descriptionEn: 'Confident English speaker', category: 'academic', color: '#3B82F6' },
      { id: 'badge_kindness', nameVi: 'Kind Friend', nameEn: 'Kind Heart', iconName: 'HeartHandshake', descriptionVi: 'Luôn tốt bụng, thân thiện và giúp đỡ bạn bè', descriptionEn: 'Always kind and helpful', category: 'behavior', color: '#EC4899' },
      { id: 'badge_reading', nameVi: 'Reading Hero', nameEn: 'Reading Hero', iconName: 'BookOpen', descriptionVi: 'Chăm chỉ đọc sách và chia sẻ câu chuyện hay', descriptionEn: 'Passionate reader', category: 'academic', color: '#8B5CF6' },
      { id: 'badge_teamwork', nameVi: 'Team Player', nameEn: 'Great Team Player', iconName: 'Users', descriptionVi: 'Hợp tác tuyệt vời, cống hiến vì tập thể tổ', descriptionEn: 'Outstanding teamwork', category: 'leadership', color: '#10B981' },
      { id: 'badge_star_week', nameVi: 'Star of the Week', nameEn: 'Star of the Week', iconName: 'Award', descriptionVi: 'Ngôi sao rạng rỡ nhất tuần của lớp', descriptionEn: 'Shining star of the week', category: 'leadership', color: '#F59E0B' },
      { id: 'badge_progress', nameVi: 'Great Progress', nameEn: 'Great Progress', iconName: 'TrendingUp', descriptionVi: 'Tiến bộ vượt bậc trong học tập và rèn luyện', descriptionEn: 'Remarkable progress', category: 'academic', color: '#06B6D4' },
      { id: 'badge_super_learner', nameVi: 'Super Learner', nameEn: 'Super Learner', iconName: 'Zap', descriptionVi: 'Học tập hăng say, luôn nỗ lực đạt kết quả tốt nhất', descriptionEn: 'Dedicated learner', category: 'creativity', color: '#F97316' },
    ],
    rewards: [
      { id: 'rew_1', titleVi: 'Bút chì hình ngôi sao ma thuật', titleEn: 'Magic Star Pencil', starCost: 5, stock: 30, iconName: 'Sparkles', description: 'Bút chì dạ quang có tẩy ngôi sao dễ thương', claimedCount: 4 },
      { id: 'rew_2', titleVi: 'Thước kẻ cầu vồng Star Kingdom', titleEn: 'Rainbow Kingdom Ruler', starCost: 10, stock: 25, iconName: 'Ruler', description: 'Thước kẻ đa năng họa tiết vương quốc lâu đài', claimedCount: 2 },
      { id: 'rew_3', titleVi: 'Bộ sticker 3D vương miện lấp lánh', titleEn: '3D Crown Stickers Set', starCost: 8, stock: 40, iconName: 'Smile', description: 'Tập sticker nổi 3D chủ đề hoàng tử công chúa', claimedCount: 7 },
      { id: 'rew_4', titleVi: 'Vé chọn chỗ ngồi yêu thích (1 ngày)', titleEn: 'Pick Favorite Seat Day Pass', starCost: 20, stock: 10, iconName: 'Armchair', description: 'Được quyền chọn ngồi cùng bạn thân trong 1 ngày', claimedCount: 3 },
      { id: 'rew_5', titleVi: 'Thẻ miễn bài tập về nhà môn Tiếng Anh', titleEn: 'Homework Pass (English)', starCost: 30, stock: 8, iconName: 'FileCheck', description: 'Được nghỉ 1 lần làm bài tập về nhà nhưng vẫn được khen', claimedCount: 1 },
      { id: 'rew_6', titleVi: 'Làm Tổ trưởng danh dự 1 tuần', titleEn: 'Honorary Team Leader for 1 Week', starCost: 40, stock: 4, iconName: 'Crown', description: 'Trở thành đội trưởng điều hành hoạt động thi đua', claimedCount: 1 },
    ],
    redemptions: [],
    attendance: {
      [new Date().toISOString().slice(0, 10)]: {
        classId: 'class_2a5',
        date: new Date().toISOString().slice(0, 10),
        records: {},
        note: 'Điểm danh buổi sáng Lớp 2A5',
        updatedAt: new Date().toISOString(),
      },
    },
    seatingChart: {
      classId: 'class_2a5',
      rows: 4,
      cols: 7,
      seats: [],
      updatedAt: new Date().toISOString(),
    },
    news: [
      {
        id: 'news_1',
        classId: 'class_2a5',
        title: 'Hoạt động STEM tuần này: Chế tạo kính vạn hoa vương quốc',
        content: 'Các bạn nhỏ lớp 2A5 thân mến! Thứ Sáu này chúng mình sẽ cùng cô Thảo làm kính vạn hoa lấp lánh với những ngôi sao kỳ diệu.',
        author: 'Cô Thảo',
        date: '2026-10-28',
        pinned: true,
        tags: ['STEM', 'Hoạt động lớp', 'Khoa học vui'],
        likes: 24,
      },
      {
        id: 'news_2',
        classId: 'class_2a5',
        title: 'Chúc mừng sinh nhật bạn Trần Bảo Ngọc (Tổ 2)! 🎂🎉',
        content: 'Cả lớp cùng gửi những lời chúc mừng ngọt ngào nhất tới bạn Bảo Ngọc. Chúc Bảo Ngọc luôn vui tươi, chăm ngoan và tỏa sáng như ngôi sao!',
        author: 'Cô Thảo',
        date: '2026-10-27',
        pinned: false,
        tags: ['Sinh nhật', 'Niềm vui'],
        likes: 28,
      },
      {
        id: 'news_3',
        classId: 'class_2a5',
        title: 'Bảng thi đua tuần 3: Tổ 2 - Ngôi Sao Xanh dẫn đầu!',
        content: 'Tuần qua 4 tổ đã thi đua vô cùng sôi nổi. Tổ 2 đạt 289 sao và tạm thời giữ cờ vàng dẫn đầu!',
        author: 'Cô Thảo',
        date: '2026-10-25',
        pinned: false,
        tags: ['Thi đua', 'Vinh danh'],
        likes: 19,
      },
    ],
    // 4 Learning Library categories: Video, Hình ảnh, Sách truyện, Khác
    learningResources: [
      {
        id: 'res_1',
        title: 'Phonics Grade 2: Letter Sounds and Blends (Thế giới ngữ âm)',
        category: 'video',
        grade: 2,
        type: 'video',
        url: 'https://www.youtube.com/watch?v=saF3-f0XWAY',
        description: 'Video luyện phát âm chuẩn các âm ghép Tiếng Anh lớp 2.',
        createdAt: '2026-10-20',
      },
      {
        id: 'res_2',
        title: 'Album: Giờ học STEM Chế tạo ngôi sao phép thuật 2A5',
        category: 'image',
        grade: 2,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600',
        description: 'Bộ sưu tập hình ảnh các tổ hào hứng làm thí nghiệm khoa học vui.',
        createdAt: '2026-10-22',
      },
      {
        id: 'res_3',
        title: 'Truyện tranh song ngữ: The Little Star Who Wanted to Learn',
        category: 'book',
        grade: 2,
        type: 'document',
        author: 'Ms. Thao',
        url: 'https://example.com/books/little-star.pdf',
        description: 'Truyện tranh ngắn bồi dưỡng tình yêu đọc sách và vốn từ vựng cơ bản.',
        createdAt: '2026-10-23',
      },
      {
        id: 'res_4',
        title: 'Trò chơi tương tác: Star Math Quiz - Phép tính kỳ diệu',
        category: 'other',
        grade: 2,
        type: 'game',
        url: 'https://example.com/game/star-math-2a5',
        description: 'Trò chơi tính nhẩm nhanh giành huy hiệu sao vương quốc.',
        createdAt: '2026-10-25',
      },
    ],
    levelRules: [
      { level: 1, titleVi: 'Little Explorer', titleEn: 'Nhà thám hiểm nhí', minStars: 0, icon: 'Compass', badgeColor: '#94A3B8' },
      { level: 2, titleVi: 'Rising Star', titleEn: 'Ngôi sao đang lên', minStars: 20, icon: 'Sparkles', badgeColor: '#38BDF8' },
      { level: 3, titleVi: 'Super Learner', titleEn: 'Siêu học sinh', minStars: 50, icon: 'Zap', badgeColor: '#818CF8' },
      { level: 4, titleVi: 'Star Champion', titleEn: 'Quán quân vương quốc', minStars: 100, icon: 'Trophy', badgeColor: '#F59E0B' },
      { level: 5, titleVi: 'Kingdom Hero', titleEn: 'Anh hùng vương quốc', minStars: 200, icon: 'Crown', badgeColor: '#EF4444' },
    ],
    backups: [],
    kingdomAvatarUrl: '/assets/kingdom/sidebar_logo.png',
    academicConfig: {
      schoolYear: '2026 - 2027',
      startDate: '2026-09-07',
      endDate: '2027-05-31',
      semester1Start: '2026-09-07',
      semester1End: '2027-01-15',
      semester2Start: '2027-01-16',
      semester2End: '2027-05-31',
    },
    finalizedResults: [],
    auditLogs: [],
    notifications: getDefaultNotifications('class_2a5'),
    notificationReads: [],
  };
}

function loadDb(): AppState {
  try {
    if (!fs.existsSync(DB_FILE) && fs.existsSync(path.resolve(DATA_DIR, 'demo_db.json'))) {
      const demoData = fs.readFileSync(path.resolve(DATA_DIR, 'demo_db.json'), 'utf-8');
      fs.writeFileSync(DB_FILE, demoData, 'utf-8');
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.classes && parsed.classes.length > 0) {
        if (!parsed.academicConfig) {
          parsed.academicConfig = {
            schoolYear: '2026 - 2027',
            startDate: '2026-09-05',
            endDate: '2027-05-31',
            semester1Start: '2026-09-05',
            semester1End: '2027-01-15',
            semester2Start: '2027-01-16',
            semester2End: '2027-05-31',
          };
        }
        if (!parsed.finalizedResults) parsed.finalizedResults = [];
        if (!parsed.auditLogs) parsed.auditLogs = [];
        if (!parsed.sidebarMascotUrl) parsed.sidebarMascotUrl = '/assets/kingdom/sidebar_mascot.png';
        let modified = false;
        if (!parsed.notifications || !Array.isArray(parsed.notifications) || parsed.notifications.length === 0) {
          parsed.notifications = getDefaultNotifications(parsed.currentClassId || 'class_2a5');
          modified = true;
        }
        if (!parsed.notificationReads || !Array.isArray(parsed.notificationReads)) {
          parsed.notificationReads = [];
          modified = true;
        }

        // Check if demo students have identical 2018-05-15; if so, distribute across 12 months
        const class2a5Students = (parsed.students || []).filter((s: any) => s.classId === 'class_2a5');
        const allIdenticalDob = class2a5Students.length > 0 && class2a5Students.every((s: any) => s.dob === '2018-05-15');
        if (allIdenticalDob) {
          const freshDemo = getDemoStudents('class_2a5');
          const freshMap = new Map(freshDemo.map(s => [s.studentCode, s.dob]));
          parsed.students.forEach((s: any) => {
            if (s.classId === 'class_2a5' && freshMap.has(s.studentCode)) {
              s.dob = freshMap.get(s.studentCode);
            }
          });
          modified = true;
        }

        if (modified) {
          saveDb(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading DB file, falling back to default:', err);
  }
  const defaultState = getDefaultState();
  saveDb(defaultState);
  return defaultState;
}

function saveDb(state: AppState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

let dbState: AppState = loadDb();

// Automatically synchronize monthly birthday bulletins for classes on start
try {
  (dbState.classes || []).forEach(c => {
    syncMonthlyBirthdayNews(c.id);
  });
  saveDb(dbState);
} catch (e) {
  console.error('Error syncing birthday bulletins on startup:', e);
}

export function recordAuditLog(
  classId: string,
  action: AuditLogEntry['action'],
  actor: string,
  description: string,
  details?: Record<string, any>,
  canUndo = false,
  undoPayload?: any
): AuditLogEntry {
  if (!dbState.auditLogs) dbState.auditLogs = [];
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId,
    action,
    actor: actor || (dbState.classInfo ? dbState.classInfo.teacherName : 'Cô Thảo'),
    timestamp: new Date().toISOString(),
    description,
    details,
    canUndo,
    undoPayload,
    isUndone: false,
  };
  dbState.auditLogs.unshift(entry);
  if (dbState.auditLogs.length > 300) {
    dbState.auditLogs = dbState.auditLogs.slice(0, 300);
  }
  return entry;
}

function calculateLevel(stars: number, rules: AppState['levelRules']): number {
  const sorted = [...rules].sort((a, b) => b.minStars - a.minStars);
  for (const r of sorted) {
    if (stars >= r.minStars) {
      return r.level;
    }
  }
  return 1;
}

// Automatically create or update periodic monthly birthday news bulletins based on students' DOB
// Generates and maintains EXACTLY 1 active bulletin updated for the current month
export function syncMonthlyBirthdayNews(classId: string, specificMonth?: number): { updatedCount: number; affectedMonths: number[] } {
  const currentClass = dbState.classes.find(c => c.id === classId) || dbState.classInfo;
  const className = currentClass?.nameVi || 'Lớp 2A5';
  const teacherName = currentClass?.teacherName || 'Cô Thảo';
  const students = dbState.students.filter(s => s.classId === classId && !s.archived);

  const now = new Date();
  const currentMonth = specificMonth || (now.getMonth() + 1); // 1 to 12

  // Group students by birth month
  const celebrants = students.filter(st => {
    const parsed = parseBirthDate(st.dob);
    return parsed && parsed.month === currentMonth;
  });

  celebrants.sort((a, b) => {
    const pA = parseBirthDate(a.dob)?.day || 0;
    const pB = parseBirthDate(b.dob)?.day || 0;
    return pA - pB;
  });

  // Purge any redundant old monthly birthday bulletins from other months so only 1 bulletin exists
  dbState.news = dbState.news.filter(n => {
    if (n.classId === classId && n.id.startsWith('news_birthday_')) {
      return n.id === `news_birthday_${classId}_m${currentMonth}`;
    }
    return true;
  });

  if (celebrants.length === 0) {
    saveDb(dbState);
    return { updatedCount: 0, affectedMonths: [currentMonth] };
  }

  const title = `🎂 Bản Tin Sinh Nhật Tháng ${currentMonth} – ${className} 🎉`;
  
  const celebrantsListText = celebrants.map(s => {
    const parsed = parseBirthDate(s.dob);
    const team = dbState.teams.find(t => t.id === s.teamId);
    const teamName = team ? team.nameVi.split(':')[0] : 'Vương quốc';
    const dayStr = parsed ? String(parsed.day).padStart(2, '0') : '??';
    const isToday = (parsed && parsed.day === now.getDate());
    const todayBadge = isToday ? ' 🎈 [HÔM NAY SINH NHẬT! / BIRTHDAY TODAY!]' : '';
    return `⭐ Ngày ${dayStr}/${String(currentMonth).padStart(2, '0')}: ${s.fullName} (${s.studentCode} • ${teamName})${todayBadge}\n   ↳ 💌 Lời chúc: Chúc bạn tuổi mới luôn rạng rỡ, chăm ngoan, học giỏi và gặt hái thật nhiều ngôi sao lấp lánh!\n   ↳ 🇬🇧 Wish: Wishing you a bright, happy new age filled with joy and sparkling stars!`;
  }).join('\n\n');

  const content = `🌟 LOA LOA LOA! TIN VUI TỪ VƯƠNG QUỐC NGÔI SAO! / HAPPY BIRTHDAY FROM STAR KINGDOM! 🎈✨
Tháng ${currentMonth} rộn ràng tiếng ca, cô ${teacherName} cùng cả lớp ${className} xin gửi những lời chúc mừng sinh nhật ngọt ngào và ấm áp nhất tới ${celebrants.length} "ngôi sao nhỏ" đáng yêu có ngày sinh trong tháng này:
Warmest birthday wishes from ${teacherName} and ${className} to our ${celebrants.length} shining little stars born in Month ${currentMonth}:

${celebrantsListText}

🎁 ĐẶC QUYỀN SINH NHẬT / BIRTHDAY PRIVILEGES:
• Tặng ngay +10 Ngôi sao danh dự chúc mừng sinh nhật vào tài khoản ngôi sao! (+10 Honorary Birthday Stars!)
• Vinh danh đội Vương miện Sinh nhật của ngày & cả lớp hòa giọng bài hát Happy Birthday! (Birthday Crown & Class Song!)
• Nhận thiệp chúc mừng vương quốc rạng rỡ cùng những cái ôm ấm áp từ cô và các bạn! (Kingdom Greeting Card & Warm Hugs!)

💖 Chúc các thiên thần nhỏ của lớp ${className} tuổi mới ngập tràn niềm vui, luôn tự tin tỏa sáng và chạm tới những ước mơ tuyệt vời nhất! / Wishing our little angels endless joy, confidence, and shining dreams! 🌟🎂🎈`;

  const birthdayImages = [
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80',
  ];

  const targetId = `news_birthday_${classId}_m${currentMonth}`;
  const existingIndex = dbState.news.findIndex(n => 
    n.classId === classId && 
    !n.isDeleted && 
    (n.id === targetId || n.tags?.includes(`Sinh nhật tháng ${currentMonth}`))
  );

  if (existingIndex !== -1) {
    const existing = dbState.news[existingIndex];
    dbState.news[existingIndex] = {
      ...existing,
      id: targetId,
      title,
      content,
      author: teacherName,
      tags: ['Sinh nhật', `Sinh nhật tháng ${currentMonth}`, 'Bản tin tháng', 'Chúc mừng'],
      images: existing.images && existing.images.length > 0 ? existing.images : birthdayImages,
      imageUrl: existing.imageUrl || birthdayImages[0],
      pinned: true,
      isPinned: true,
      isEdited: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Hệ thống tự động',
    };
  } else {
    const newPost: ClassNewsItem = {
      id: targetId,
      classId,
      title,
      content,
      author: teacherName,
      date: new Date().toISOString().slice(0, 10),
      pinned: true,
      isPinned: true,
      tags: ['Sinh nhật', `Sinh nhật tháng ${currentMonth}`, 'Bản tin tháng', 'Chúc mừng'],
      likes: 18 + celebrants.length * 2,
      imageUrl: birthdayImages[0],
      images: birthdayImages,
      visibility: 'all',
      isDeleted: false,
    };
    dbState.news.unshift(newPost);
  }

  saveDb(dbState);
  return { updatedCount: 1, affectedMonths: [currentMonth] };
}

// Initial automatic birthday news synchronization on startup for all classes
try {
  const demoDobMap = new Map(getDemoStudents('class_2a5').map(s => [s.fullName, s.dob]));
  let hasUpdatedDob = false;
  const class2a5Students = dbState.students.filter(s => s.classId === 'class_2a5');
  const allIdentical = class2a5Students.length > 0 && class2a5Students.every(s => s.dob === '2018-05-15');
  if (allIdentical) {
    dbState.students.forEach(st => {
      if (st.classId === 'class_2a5' && demoDobMap.has(st.fullName)) {
        st.dob = demoDobMap.get(st.fullName)!;
        hasUpdatedDob = true;
      }
    });
  }

  (dbState.classes || []).forEach(c => {
    syncMonthlyBirthdayNews(c.id);
  });
  if (hasUpdatedDob) {
    saveDb(dbState);
  }
} catch (err) {
  console.error('Error during startup birthday news sync:', err);
}

// ---------------- API ROUTES ----------------

export function recordNotification(notif: Partial<AppNotification> & { classId: string; titleVi: string }): AppNotification {
  if (!dbState.notifications) dbState.notifications = [];
  const now = new Date().toISOString();
  const entry: AppNotification = {
    id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId: notif.classId,
    type: notif.type || 'system',
    titleVi: notif.titleVi,
    titleEn: notif.titleEn || notif.titleVi,
    messageVi: notif.messageVi || '',
    messageEn: notif.messageEn || notif.messageVi || '',
    timestamp: notif.timestamp || now,
    createdAt: notif.createdAt || now,
    targetRole: notif.targetRole || 'all',
    targetUserId: notif.targetUserId,
    authorName: notif.authorName || (dbState.classInfo ? dbState.classInfo.teacherName : 'Cô Thảo'),
    metadata: notif.metadata,
  };
  dbState.notifications.unshift(entry);
  if (dbState.notifications.length > 200) {
    dbState.notifications = dbState.notifications.slice(0, 200);
  }
  saveDb(dbState);
  return entry;
}

// Global API Role-Based Access Control (RBAC) Middleware
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET') {
    if (req.path === '/audit-logs' || req.path === '/data-health') {
      return requireTeacher(req, res, next);
    }
    return next();
  }
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  if (req.path === '/notifications/mark-read' || req.path === '/notifications/mark-all-read') {
    return next();
  }
  if (req.path === '/rewards/redeem') {
    return requireStudentOrTeacher(req, res, next);
  }
  return requireTeacher(req, res, next);
});

// Get full state (sanitized based on caller's verified session role)
app.get('/api/state', (req: Request, res: Response) => {
  // Sync active classInfo
  const current = dbState.classes.find(c => c.id === dbState.currentClassId) || dbState.classes[0];
  dbState.classInfo = current;
  if (!dbState.notifications || !Array.isArray(dbState.notifications) || dbState.notifications.length === 0) {
    dbState.notifications = getDefaultNotifications(dbState.currentClassId || 'class_2a5');
  }
  if (!dbState.notificationReads || !Array.isArray(dbState.notificationReads)) {
    dbState.notificationReads = [];
  }
  const session = extractSession(req);
  res.json({ success: true, data: sanitizeAppState(dbState, session) });
});

// Notifications: Get list with user read states & unread count
app.get('/api/notifications', (req: Request, res: Response) => {
  const classId = (req.query.classId as string) || dbState.currentClassId;
  const userId = (req.query.userId as string) || 'teacher_thao';

  const classNotifications = (dbState.notifications || []).filter(n => n.classId === classId);
  const userReads = (dbState.notificationReads || []).filter(r => r.userId === userId && r.classId === classId);
  const readMap = new Map<string, NotificationReadRecord>();
  userReads.forEach(r => readMap.set(r.notificationId, r));

  const items = classNotifications.map(notif => {
    const readRecord = readMap.get(notif.id);
    const isRead = !!readRecord && readRecord.isRead;
    return {
      ...notif,
      isRead,
      readAt: readRecord?.readAt || null,
    };
  });

  const unreadCount = items.filter(n => !n.isRead).length;

  res.json({
    success: true,
    notifications: items,
    unreadCount,
    classId,
    userId,
  });
});

// Notifications: Auto mark single notification as read when viewed
app.post('/api/notifications/mark-read', (req: Request, res: Response) => {
  const { notificationId, userId, classId } = req.body;
  if (!notificationId || !userId) {
    res.status(400).json({ success: false, error: 'Thiếu notificationId hoặc userId' });
    return;
  }
  const cId = classId || dbState.currentClassId;
  if (!dbState.notificationReads) dbState.notificationReads = [];

  const now = new Date().toISOString();
  const existingIdx = dbState.notificationReads.findIndex(
    r => r.userId === userId && r.notificationId === notificationId
  );

  if (existingIdx >= 0) {
    dbState.notificationReads[existingIdx].isRead = true;
    dbState.notificationReads[existingIdx].readAt = now;
  } else {
    dbState.notificationReads.push({
      userId,
      notificationId,
      classId: cId,
      isRead: true,
      readAt: now,
      createdAt: now,
    });
  }

  saveDb(dbState);

  // Recalculate unread count for user in this class
  const classNotifs = (dbState.notifications || []).filter(n => n.classId === cId);
  const readIds = new Set(
    dbState.notificationReads
      .filter(r => r.userId === userId && r.classId === cId && r.isRead)
      .map(r => r.notificationId)
  );
  const unreadCount = classNotifs.filter(n => !readIds.has(n.id)).length;

  res.json({
    success: true,
    notificationId,
    userId,
    isRead: true,
    readAt: now,
    unreadCount,
  });
});

// Notifications: Mark all as read
app.post('/api/notifications/mark-all-read', (req: Request, res: Response) => {
  const { userId, classId } = req.body;
  if (!userId) {
    res.status(400).json({ success: false, error: 'Thiếu userId' });
    return;
  }
  const cId = classId || dbState.currentClassId;
  const classNotifs = (dbState.notifications || []).filter(n => n.classId === cId);
  const now = new Date().toISOString();
  if (!dbState.notificationReads) dbState.notificationReads = [];

  classNotifs.forEach(n => {
    const existing = dbState.notificationReads!.find(r => r.userId === userId && r.notificationId === n.id);
    if (existing) {
      existing.isRead = true;
      existing.readAt = now;
    } else {
      dbState.notificationReads!.push({
        userId,
        notificationId: n.id,
        classId: cId,
        isRead: true,
        readAt: now,
        createdAt: now,
      });
    }
  });

  saveDb(dbState);
  res.json({ success: true, unreadCount: 0 });
});

// Notifications: Create new notification
app.post('/api/notifications', (req: Request, res: Response) => {
  const { classId, type, titleVi, titleEn, messageVi, messageEn, targetRole, targetUserId, authorName, metadata } = req.body;
  if (!titleVi) {
    res.status(400).json({ success: false, error: 'Tiêu đề thông báo không được để trống' });
    return;
  }

  const notif = recordNotification({
    classId: classId || dbState.currentClassId,
    type: type || 'system',
    titleVi,
    titleEn,
    messageVi,
    messageEn,
    targetRole,
    targetUserId,
    authorName,
    metadata,
  });

  res.json({ success: true, notification: notif });
});


// MULTI-CLASS: Switch active class
app.post('/api/classes/switch', (req: Request, res: Response) => {
  const { classId } = req.body;
  const target = dbState.classes.find(c => c.id === classId);
  if (!target) {
    res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
    return;
  }
  dbState.currentClassId = target.id;
  dbState.classInfo = target;
  saveDb(dbState);
  res.json({ success: true, currentClassId: target.id, classInfo: target, data: dbState });
});

// MULTI-CLASS: Create new kingdom class
app.post('/api/classes', (req: Request, res: Response) => {
  const body = req.body || {};
  const cInfo = body.classInfo || body;
  const nameVi = cInfo.nameVi;
  if (!nameVi || typeof nameVi !== 'string' || !nameVi.trim()) {
    res.status(400).json({ success: false, error: 'Tên lớp là bắt buộc' });
    return;
  }

  const nameEn = cInfo.nameEn || nameVi;
  const grade = Number(cInfo.grade) || 2;
  const schoolYear = cInfo.schoolYear || '2026 - 2027';
  const teacherName = cInfo.teacherName || 'Cô Thảo';
  const teacherTitleEn = cInfo.teacherTitleEn || 'Teacher Thao';
  const targetSize = Number(cInfo.targetSize) || 28;
  const sloganVi = cInfo.sloganVi || 'Mỗi ngày vui học – Mỗi ngày tỏa sáng!';
  const sloganEn = cInfo.sloganEn || 'Learn Happy, Shine Bright!';
  const coverUrl = cInfo.coverUrl || '';
  const bannerTheme = cInfo.bannerTheme || 'star_kingdom_default';

  const newId = `class_${Date.now()}`;
  const newClass: ClassInfo = {
    id: newId,
    nameVi: nameVi.trim(),
    nameEn: nameEn.trim(),
    grade,
    schoolYear: schoolYear.trim(),
    teacherName: teacherName.trim(),
    teacherTitleEn: teacherTitleEn.trim(),
    teacherAvatar: '/assets/kingdom/teacher_avatar.png',
    targetSize,
    sloganVi: sloganVi.trim(),
    sloganEn: sloganEn.trim(),
    coverUrl,
    bannerTheme,
    isArchived: false,
  };

  dbState.classes.push(newClass);

  // Initialize teams for this class
  if (Array.isArray(body.teams) && body.teams.length > 0) {
    body.teams.forEach((tm: any, idx: number) => {
      dbState.teams.push({
        id: `${newId}_team_${idx + 1}`,
        classId: newId,
        nameVi: tm.nameVi || `Tổ ${idx + 1}`,
        nameEn: tm.nameEn || `Team ${idx + 1}`,
        color: tm.color || '#3B82F6',
        bgColor: tm.bgColor || '#EFF6FF',
        borderColor: tm.borderColor || '#93C5FD',
        flagColor: tm.flagColor || 'blue',
        mascot: tm.mascot || `Linh vật ${idx + 1}`,
        points: 0,
      });
    });
  } else {
    const numTeams = Number(body.teamsCount) || 4;
    const teamConfigs = [
      { nameVi: 'Tổ 1: Ngôi Sao Đỏ', nameEn: 'Team 1: Red Stars', color: '#EF4444', bgColor: '#FEF2F2', borderColor: '#FCA5A5', flagColor: 'red', mascot: 'Lửa Nhiệt Huyết' },
      { nameVi: 'Tổ 2: Ngôi Sao Xanh', nameEn: 'Team 2: Blue Stars', color: '#3B82F6', bgColor: '#EFF6FF', borderColor: '#93C5FD', flagColor: 'blue', mascot: 'Biển Thông Thái' },
      { nameVi: 'Tổ 3: Ngôi Sao Vàng', nameEn: 'Team 3: Golden Stars', color: '#EAB308', bgColor: '#FEFCE8', borderColor: '#FDE047', flagColor: 'gold', mascot: 'Mặt Trời Tỏa Sáng' },
      { nameVi: 'Tổ 4: Ngôi Sao Lá', nameEn: 'Team 4: Green Stars', color: '#22C55E', bgColor: '#F0FDF4', borderColor: '#86EFAC', flagColor: 'green', mascot: 'Mầm Cây Hy Vọng' },
    ];

    for (let i = 0; i < numTeams; i++) {
      const base = teamConfigs[i % teamConfigs.length];
      dbState.teams.push({
        id: `${newId}_team_${i + 1}`,
        classId: newId,
        nameVi: base.nameVi,
        nameEn: base.nameEn,
        color: base.color,
        bgColor: base.bgColor,
        borderColor: base.borderColor,
        flagColor: base.flagColor,
        mascot: base.mascot,
        points: 0,
      });
    }
  }

  // Initial students if provided
  if (Array.isArray(body.initialStudents) && body.initialStudents.length > 0) {
    const classShortCode = nameVi.replace(/\s+/g, '').toUpperCase();
    body.initialStudents.forEach((st: any, idx: number) => {
      const studentCode = st.studentCode || `${classShortCode}${(idx + 1).toString().padStart(2, '0')}`;
      const teamId = `${newId}_team_${(idx % 4) + 1}`;
      dbState.students.push({
        id: `${newId}_student_${Date.now()}_${idx}`,
        classId: newId,
        studentCode,
        fullName: st.fullName || `Học sinh ${idx + 1}`,
        gender: st.gender || (idx % 2 === 0 ? 'male' : 'female'),
        teamId,
        avatarUrl: st.gender === 'female' ? '/assets/kingdom/student_ngoc.png' : '/assets/kingdom/student_minh.png',
        totalEarnedStars: 0,
        spendableStars: 0,
        weeklyStars: 0,
        monthlyStars: 0,
        level: 1,
        badgeIds: [],
        passcode: '2026',
      });
    });
  }

  // Switch to new class
  dbState.currentClassId = newId;
  dbState.classInfo = newClass;
  saveDb(dbState);
  recordAuditLog(newId, 'class_archive', teacherName || 'Cô Thảo', `Tạo lớp mới: ${nameVi} (${schoolYear})`);
  res.json({ success: true, newClass, data: dbState });
});

// Update specific class info
app.put('/api/classes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const target = dbState.classes.find(c => c.id === id);
  if (!target) {
    res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
    return;
  }

  const { nameVi, nameEn, grade, schoolYear, teacherName, sloganVi, sloganEn, coverUrl, targetSize } = req.body;
  if (nameVi) target.nameVi = nameVi.trim();
  if (nameEn) target.nameEn = nameEn.trim();
  if (grade !== undefined) target.grade = Number(grade);
  if (schoolYear) target.schoolYear = schoolYear.trim();
  if (teacherName) target.teacherName = teacherName.trim();
  if (sloganVi) target.sloganVi = sloganVi.trim();
  if (sloganEn) target.sloganEn = sloganEn.trim();
  if (coverUrl !== undefined) target.coverUrl = coverUrl;
  if (targetSize !== undefined) target.targetSize = Number(targetSize);

  if (target.id === dbState.currentClassId) {
    dbState.classInfo = target;
  }

  saveDb(dbState);
  recordAuditLog(target.id, 'student_edit', target.teacherName, `Chỉnh sửa thông tin lớp: ${target.nameVi}`);
  res.json({ success: true, classInfo: target, data: dbState });
});

// Archive class
app.post('/api/classes/archive', (req: Request, res: Response) => {
  const { classId } = req.body;
  const target = dbState.classes.find(c => c.id === classId);
  if (!target) {
    res.status(404).json({ success: false, error: 'Không tìm thấy lớp học để lưu trữ' });
    return;
  }

  target.isArchived = true;
  target.archivedAt = new Date().toISOString();

  // If active class is archived, switch to first unarchived class
  if (dbState.currentClassId === classId) {
    const activeClass = dbState.classes.find(c => !c.isArchived && c.id !== classId);
    if (activeClass) {
      dbState.currentClassId = activeClass.id;
      dbState.classInfo = activeClass;
    }
  }

  saveDb(dbState);
  recordAuditLog(target.id, 'class_archive', target.teacherName, `Lưu trữ lớp: ${target.nameVi}`);
  res.json({ success: true, message: `Đã lưu trữ lớp ${target.nameVi} an toàn`, classInfo: target, data: dbState });
});

// Restore class
app.post('/api/classes/restore', (req: Request, res: Response) => {
  const { classId } = req.body;
  const target = dbState.classes.find(c => c.id === classId);
  if (!target) {
    res.status(404).json({ success: false, error: 'Không tìm thấy lớp học để khôi phục' });
    return;
  }

  target.isArchived = false;
  delete target.archivedAt;

  dbState.currentClassId = target.id;
  dbState.classInfo = target;

  saveDb(dbState);
  recordAuditLog(target.id, 'class_restore', target.teacherName, `Khôi phục lớp hoạt động: ${target.nameVi}`);
  res.json({ success: true, message: `Đã khôi phục lớp ${target.nameVi}`, classInfo: target, data: dbState });
});

// Safe delete / archive / permanent delete class
app.delete('/api/classes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { confirmClassName, permanent } = req.body || {};
  const target = dbState.classes.find(c => c.id === id);

  if (!target) {
    res.status(404).json({ success: false, error: 'Không tìm thấy lớp học' });
    return;
  }

  // Prevent deleting if it's the only class in the kingdom
  if (dbState.classes.length <= 1) {
    res.status(400).json({ success: false, error: 'Không thể xóa lớp duy nhất trong vương quốc. Hãy tạo thêm một lớp mới trước!' });
    return;
  }

  if (confirmClassName && confirmClassName.trim().toLowerCase() !== target.nameVi.trim().toLowerCase()) {
    res.status(400).json({ success: false, error: `Tên lớp xác nhận không khớp. Vui lòng nhập chính xác "${target.nameVi}"` });
    return;
  }

  if (permanent) {
    // 1. Permanent deletion: remove class and all associated data
    dbState.classes = dbState.classes.filter(c => c.id !== id);
    dbState.students = dbState.students.filter(s => s.classId !== id);
    dbState.teams = dbState.teams.filter(t => t.classId !== id);
    dbState.starTransactions = dbState.starTransactions.filter(tx => tx.classId !== id);
    dbState.news = dbState.news.filter(n => n.classId !== id);
    if (dbState.finalizedResults) {
      dbState.finalizedResults = dbState.finalizedResults.filter(r => r.classId !== id);
    }
    // Clean attendance entries
    Object.keys(dbState.attendance).forEach(key => {
      if (dbState.attendance[key]?.classId === id || key.startsWith(`${id}_`)) {
        delete dbState.attendance[key];
      }
    });

    // If deleted class was the active one, switch to next available active class
    if (dbState.currentClassId === id) {
      const nextActive = dbState.classes.find(c => !c.isArchived) || dbState.classes[0];
      if (nextActive) {
        dbState.currentClassId = nextActive.id;
        dbState.classInfo = nextActive;
      }
    }

    saveDb(dbState);
    recordAuditLog(id, 'student_delete', target.teacherName, `Xóa vĩnh viễn lớp: ${target.nameVi}`);
    res.json({ success: true, message: `Đã xóa vĩnh viễn lớp ${target.nameVi} và toàn bộ dữ liệu liên quan`, data: dbState });
  } else {
    // 2. Safe Archive / Soft-delete
    const activeRemaining = dbState.classes.filter(c => !c.isArchived && c.id !== id);
    if (activeRemaining.length === 0 && !target.isArchived) {
      res.status(400).json({ success: false, error: 'Không thể lưu kho lớp duy nhất đang hoạt động. Hãy kích hoạt hoặc tạo thêm một lớp khác trước!' });
      return;
    }

    target.isArchived = true;
    target.archivedAt = new Date().toISOString();

    // If archived was active, switch to next available active class
    if (dbState.currentClassId === id) {
      const nextActive = dbState.classes.find(c => !c.isArchived && c.id !== id) || dbState.classes[0];
      if (nextActive) {
        dbState.currentClassId = nextActive.id;
        dbState.classInfo = nextActive;
      }
    }

    saveDb(dbState);
    recordAuditLog(id, 'class_archive', target.teacherName, `Lưu kho an toàn lớp: ${target.nameVi}`);
    res.json({ success: true, message: `Đã lưu kho lớp ${target.nameVi}`, data: dbState });
  }
});

// Academic year transition (Chuyển năm học)
app.post('/api/classes/transition', (req: Request, res: Response) => {
  const { sourceClassId, newNameVi, newNameEn, newGrade, newSchoolYear, studentIdsToPromote, carryOverStars } = req.body;
  const sourceClass = dbState.classes.find(c => c.id === sourceClassId);
  if (!sourceClass) {
    res.status(404).json({ success: false, error: 'Không tìm thấy lớp nguồn' });
    return;
  }

  const newClassId = `class_${Date.now()}`;
  const newClass: ClassInfo = {
    id: newClassId,
    nameVi: newNameVi || `${sourceClass.nameVi} (${newSchoolYear})`,
    nameEn: newNameEn || newNameVi || `${sourceClass.nameEn} (${newSchoolYear})`,
    grade: Number(newGrade) || sourceClass.grade + 1,
    schoolYear: newSchoolYear || '2027 - 2028',
    teacherName: sourceClass.teacherName,
    teacherTitleEn: sourceClass.teacherTitleEn,
    teacherAvatar: sourceClass.teacherAvatar,
    targetSize: sourceClass.targetSize,
    sloganVi: sourceClass.sloganVi,
    sloganEn: sourceClass.sloganEn,
    coverUrl: sourceClass.coverUrl,
    bannerTheme: sourceClass.bannerTheme,
    isArchived: false,
  };

  dbState.classes.push(newClass);

  // Initialize 4 teams for new class
  const teamConfigs = [
    { nameVi: 'Tổ 1: Ngôi Sao Đỏ', nameEn: 'Team 1: Red Stars', color: '#EF4444', bgColor: '#FEF2F2', borderColor: '#FCA5A5', flagColor: 'red', mascot: 'Lửa Nhiệt Huyết' },
    { nameVi: 'Tổ 2: Ngôi Sao Xanh', nameEn: 'Team 2: Blue Stars', color: '#3B82F6', bgColor: '#EFF6FF', borderColor: '#93C5FD', flagColor: 'blue', mascot: 'Biển Thông Thái' },
    { nameVi: 'Tổ 3: Ngôi Sao Vàng', nameEn: 'Team 3: Golden Stars', color: '#EAB308', bgColor: '#FEFCE8', borderColor: '#FDE047', flagColor: 'gold', mascot: 'Mặt Trời Tỏa Sáng' },
    { nameVi: 'Tổ 4: Ngôi Sao Lá', nameEn: 'Team 4: Green Stars', color: '#22C55E', bgColor: '#F0FDF4', borderColor: '#86EFAC', flagColor: 'green', mascot: 'Mầm Cây Hy Vọng' },
  ];

  for (let i = 0; i < 4; i++) {
    const base = teamConfigs[i];
    dbState.teams.push({
      id: `${newClassId}_team_${i + 1}`,
      classId: newClassId,
      nameVi: base.nameVi,
      nameEn: base.nameEn,
      color: base.color,
      bgColor: base.bgColor,
      borderColor: base.borderColor,
      flagColor: base.flagColor,
      mascot: base.mascot,
      points: 0,
    });
  }

  // Copy or promote selected students
  const sourceStudents = dbState.students.filter(s => s.classId === sourceClassId);
  const toPromote = Array.isArray(studentIdsToPromote) && studentIdsToPromote.length > 0
    ? sourceStudents.filter(s => studentIdsToPromote.includes(s.id))
    : sourceStudents;

  toPromote.forEach((orig, idx) => {
    const baseStars = carryOverStars ? orig.totalEarnedStars : 0;
    const promoted: Student = {
      ...orig,
      id: `${newClassId}_student_${Date.now()}_${idx}`,
      classId: newClassId,
      studentCode: orig.studentCode.replace(sourceClass.nameVi.replace(/\s+/g, ''), newClass.nameVi.replace(/\s+/g, '')),
      teamId: `${newClassId}_team_${(idx % 4) + 1}`,
      totalEarnedStars: baseStars,
      spendableStars: carryOverStars ? orig.spendableStars : 0,
      weeklyStars: 0,
      monthlyStars: 0,
      level: calculateLevel(baseStars, dbState.levelRules),
      badgeIds: carryOverStars ? orig.badgeIds : [],
    };
    dbState.students.push(promoted);
  });

  // Switch to new class
  dbState.currentClassId = newClassId;
  dbState.classInfo = newClass;

  saveDb(dbState);
  recordAuditLog(newClassId, 'class_archive', sourceClass.teacherName, `Chuyển năm học: Khởi tạo ${newClass.nameVi} (${newClass.schoolYear}) từ ${sourceClass.nameVi}`);
  res.json({ success: true, newClass, data: dbState });
});

// Academic Calendar Config
app.get('/api/time-config', (_req: Request, res: Response) => {
  res.json({ success: true, academicConfig: dbState.academicConfig });
});

app.put('/api/time-config', (req: Request, res: Response) => {
  const { academicConfig, role } = req.body;
  const headerRole = req.headers['x-user-role'];
  if (role === 'student' || headerRole === 'student') {
    res.status(403).json({ success: false, error: 'Chỉ giáo viên/quản trị viên mới có quyền cấu hình lịch năm học' });
    return;
  }
  if (academicConfig) {
    const startDate = (academicConfig.week1StartDate || academicConfig.startDate || dbState.academicConfig?.startDate || '2026-09-07').trim();
    const totalWeeks = Math.max(1, Math.min(52, Number(academicConfig.totalWeeks ?? dbState.academicConfig?.totalWeeks ?? 36)));
    dbState.academicConfig = {
      ...dbState.academicConfig,
      ...academicConfig,
      startDate,
      week1StartDate: startDate,
      totalWeeks,
    };
    saveDb(dbState);
    recordAuditLog(dbState.currentClassId, 'student_edit', dbState.classInfo.teacherName, `Cập nhật cấu hình năm học & học kỳ: ${dbState.academicConfig?.schoolYear || ''} (${totalWeeks} tuần, bắt đầu ${startDate})`);
  }
  res.json({ success: true, academicConfig: dbState.academicConfig });
});

// Finalize Results (Chốt thành tích)
app.get('/api/finalize-results', (_req: Request, res: Response) => {
  const list = (dbState.finalizedResults || []).filter(r => r.classId === dbState.currentClassId);
  res.json({ success: true, finalizedResults: list });
});

app.post('/api/finalize-results', (req: Request, res: Response) => {
  const { period, periodLabel, notes, studentRankings, teamRankings } = req.body;
  const cId = dbState.currentClassId;

  const result: FinalizedResult = {
    id: `final_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId: cId,
    period: period || 'week',
    periodLabel: periodLabel || 'Tuần này',
    academicYear: dbState.academicConfig?.schoolYear || dbState.classInfo.schoolYear,
    finalizedAt: new Date().toISOString(),
    finalizedBy: dbState.classInfo.teacherName,
    notes: notes || '',
    summary: {
      totalStarsAwarded: (studentRankings || []).reduce((acc: number, s: any) => acc + (s.stars || 0), 0),
      totalTransactions: dbState.starTransactions.filter(tx => tx.classId === cId).length,
      studentRankings: studentRankings || [],
      teamRankings: teamRankings || [],
    },
  };

  if (!dbState.finalizedResults) dbState.finalizedResults = [];
  dbState.finalizedResults.unshift(result);

  saveDb(dbState);
  recordAuditLog(cId, 'finalize_results', dbState.classInfo.teacherName, `Chốt kết quả thi đua ${result.periodLabel}: ${result.summary.totalStarsAwarded} sao đã vinh danh`);
  res.json({ success: true, finalizedResult: result });
});

// Audit Logs
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  const logs = (dbState.auditLogs || []).filter(a => a.classId === dbState.currentClassId);
  res.json({ success: true, auditLogs: logs });
});

app.post('/api/audit-logs/undo', (req: Request, res: Response) => {
  const { auditLogId } = req.body;
  const log = (dbState.auditLogs || []).find(a => a.id === auditLogId);
  if (!log) {
    res.status(404).json({ success: false, error: 'Không tìm thấy nhật ký thao tác' });
    return;
  }
  if (!log.canUndo || log.isUndone || !log.undoPayload) {
    res.status(400).json({ success: false, error: 'Thao tác này không thể hoàn tác hoặc đã được hoàn tác' });
    return;
  }

  if (log.action === 'team_reset' || log.undoPayload?.type === 'team_reset') {
    const teamsSnapshot = log.undoPayload?.teamsSnapshot;
    if (Array.isArray(teamsSnapshot)) {
      teamsSnapshot.forEach((snap: any) => {
        const team = dbState.teams.find(t => t.id === snap.id);
        if (team) {
          team.points = snap.points ?? team.points;
          team.weeklyPoints = snap.weeklyPoints ?? team.weeklyPoints;
          team.monthlyPoints = snap.monthlyPoints ?? team.monthlyPoints;
          team.semester1Points = snap.semester1Points ?? team.semester1Points;
          team.semester2Points = snap.semester2Points ?? team.semester2Points;
        }
      });
      const revTx: StarTransaction = {
        id: `tx_rev_team_${Date.now()}`,
        classId: log.classId,
        studentId: '',
        studentName: 'Thi đua các tổ',
        deltaStars: 0,
        teamId: '',
        reasonCategory: 'Hoàn tác',
        reasonNote: `Hoàn tác thành công: Phục hồi điểm thi đua các tổ`,
        timestamp: new Date().toISOString(),
        createdBy: log.actor || dbState.classInfo.teacherName,
      };
      dbState.starTransactions.unshift(revTx);
    }
    log.isUndone = true;
    saveDb(dbState);
    res.json({ success: true, message: 'Đã hoàn tác đặt lại điểm tổ thành công!', auditLog: log, data: dbState, teams: dbState.teams });
    return;
  }

  const { studentId, deltaStars } = log.undoPayload;
  const student = dbState.students.find(s => s.id === studentId);
  if (student) {
    // Reverse star delta
    student.totalEarnedStars = Math.max(0, student.totalEarnedStars - deltaStars);
    student.spendableStars = Math.max(0, student.spendableStars - deltaStars);
    student.weeklyStars = Math.max(0, (student.weeklyStars || 0) - deltaStars);
    student.monthlyStars = Math.max(0, (student.monthlyStars || 0) - deltaStars);
    student.level = calculateLevel(student.totalEarnedStars, dbState.levelRules);

    if (student.teamId) {
      const team = dbState.teams.find(t => t.id === student.teamId);
      if (team) {
        team.points = Math.max(0, team.points - deltaStars);
        if (deltaStars > 0) {
          team.weeklyPoints = Math.max(0, (team.weeklyPoints || 0) - deltaStars);
        }
      }
    }

    // Add reversal transaction
    const reversalTx: StarTransaction = {
      id: `tx_rev_${Date.now()}`,
      classId: student.classId,
      studentId: student.id,
      studentName: student.fullName,
      deltaStars: -deltaStars,
      teamId: student.teamId,
      reasonCategory: 'Hoàn tác',
      reasonNote: `Hoàn tác thao tác: ${log.description}`,
      timestamp: new Date().toISOString(),
      createdBy: dbState.classInfo.teacherName,
    };
    dbState.starTransactions.unshift(reversalTx);
  }

  log.isUndone = true;
  saveDb(dbState);
  res.json({ success: true, message: 'Đã hoàn tác thao tác thành công', auditLog: log, data: dbState });
});

// Data Health Check
app.get('/api/data-health', (_req: Request, res: Response) => {
  const cId = dbState.currentClassId;
  const classStudents = dbState.students.filter(s => s.classId === cId);
  const classTeams = dbState.teams.filter(t => t.classId === cId);
  const issues: Array<{ type: 'warning' | 'error' | 'info'; title: string; message: string; count: number; autoFixable: boolean; fixAction?: string }> = [];

  // 1. Check duplicate student codes / names
  const seenCodes = new Set<string>();
  const duplicateCodes: string[] = [];
  classStudents.forEach(s => {
    if (seenCodes.has(s.studentCode)) duplicateCodes.push(s.studentCode);
    else seenCodes.add(s.studentCode);
  });
  if (duplicateCodes.length > 0) {
    issues.push({
      type: 'warning',
      title: 'Mã học sinh trùng lặp',
      message: `Phát hiện ${duplicateCodes.length} mã học sinh bị trùng trong lớp: ${duplicateCodes.join(', ')}`,
      count: duplicateCodes.length,
      autoFixable: false,
    });
  }

  // 2. Check unassigned teams
  const unassigned = classStudents.filter(s => !s.teamId || !classTeams.some(t => t.id === s.teamId));
  if (unassigned.length > 0) {
    issues.push({
      type: 'warning',
      title: 'Học sinh chưa phân tổ',
      message: `Có ${unassigned.length} học sinh chưa được phân vào tổ nào`,
      count: unassigned.length,
      autoFixable: true,
      fixAction: 'assign_teams',
    });
  }

  // 3. Check missing avatars
  const missingAvatars = classStudents.filter(s => !s.avatarUrl || s.avatarUrl.trim() === '');
  if (missingAvatars.length > 0) {
    issues.push({
      type: 'info',
      title: 'Học sinh chưa có ảnh đại diện',
      message: `Có ${missingAvatars.length} học sinh đang dùng hình đại diện mặc định`,
      count: missingAvatars.length,
      autoFixable: false,
    });
  }

  // 4. Check negative or inconsistent stars
  const inconsistent = classStudents.filter(s => s.spendableStars > s.totalEarnedStars);
  if (inconsistent.length > 0) {
    issues.push({
      type: 'error',
      title: 'Số sao khả dụng không hợp lệ',
      message: `Có ${inconsistent.length} học sinh có số sao khả dụng lớn hơn tổng sao tích lũy`,
      count: inconsistent.length,
      autoFixable: true,
      fixAction: 'fix_stars',
    });
  }

  // 5. Check attendance for today
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = dbState.attendance[`${cId}_${today}`] || dbState.attendance[today];
  const hasAttendanceToday = todayAtt && Object.keys(todayAtt.records || {}).length > 0;
  if (!hasAttendanceToday) {
    issues.push({
      type: 'info',
      title: 'Chưa điểm danh hôm nay',
      message: `Lớp ${dbState.classInfo.nameVi} chưa thực hiện điểm danh buổi học hôm nay`,
      count: 1,
      autoFixable: false,
    });
  }

  const healthScore = Math.max(40, 100 - (issues.filter(i => i.type === 'error').length * 25) - (issues.filter(i => i.type === 'warning').length * 10));

  res.json({
    success: true,
    healthScore,
    totalStudents: classStudents.length,
    totalTeams: classTeams.length,
    issues,
  });
});

const DEFAULT_SCHOOL_LOGO = '/assets/kingdom/school_logo_v2.png';

function validateSchoolLogoUrl(logoUrl: unknown): { valid: boolean; normalizedUrl: string; error?: string } {
  if (logoUrl === undefined || logoUrl === null || logoUrl === '' || logoUrl === 'default') {
    return { valid: true, normalizedUrl: DEFAULT_SCHOOL_LOGO };
  }
  if (typeof logoUrl !== 'string') {
    return { valid: false, normalizedUrl: DEFAULT_SCHOOL_LOGO, error: 'Định dạng đường dẫn logo không hợp lệ' };
  }
  const trimmed = logoUrl.trim();
  if (!trimmed) {
    return { valid: true, normalizedUrl: DEFAULT_SCHOOL_LOGO };
  }
  // Reject temporary browser/local filesystem paths
  if (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file://') ||
    /^[a-zA-Z]:\\/.test(trimmed) ||
    trimmed.startsWith('/tmp/')
  ) {
    return {
      valid: false,
      normalizedUrl: DEFAULT_SCHOOL_LOGO,
      error: 'Không được lưu đường dẫn tạm cục bộ (blob:/file://). Vui lòng tải ảnh PNG, JPG hoặc WebP hợp lệ.',
    };
  }
  // Validate data URL (PNG, JPG/JPEG, WebP)
  if (trimmed.startsWith('data:')) {
    const dataMatch = trimmed.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!dataMatch) {
      return {
        valid: false,
        normalizedUrl: DEFAULT_SCHOOL_LOGO,
        error: 'Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh PNG, JPG hoặc WebP hợp lệ.',
      };
    }
    const base64Data = dataMatch[2].replace(/\s+/g, '');
    if (base64Data.length < 16) {
      return {
        valid: false,
        normalizedUrl: DEFAULT_SCHOOL_LOGO,
        error: 'Dữ liệu ảnh bị rỗng hoặc hư hỏng.',
      };
    }
    const approxBytes = Math.floor((base64Data.length * 3) / 4);
    if (approxBytes > 5 * 1024 * 1024) {
      return {
        valid: false,
        normalizedUrl: DEFAULT_SCHOOL_LOGO,
        error: 'Dung lượng ảnh vượt quá giới hạn 5MB. Vui lòng chọn hoặc cắt ảnh nhỏ hơn.',
      };
    }
    return { valid: true, normalizedUrl: trimmed };
  }
  // Allow valid relative public asset path or HTTPS URL
  if (trimmed.startsWith('/assets/') || trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return { valid: true, normalizedUrl: trimmed };
  }
  return {
    valid: false,
    normalizedUrl: DEFAULT_SCHOOL_LOGO,
    error: 'Định dạng logo không hợp lệ. Chỉ chấp nhận PNG, JPG, WebP hoặc đường dẫn tài nguyên hệ thống.',
  };
}

// Update class and school settings
app.put('/api/settings', (req: Request, res: Response) => {
  const { school, classInfo, kingdomAvatarUrl, sidebarMascotUrl, role } = req.body;
  const headerRole = req.headers['x-user-role'];
  if (role === 'student' || headerRole === 'student') {
    res.status(403).json({ success: false, error: 'Chỉ giáo viên/quản trị viên mới có quyền chỉnh sửa cài đặt trường học' });
    return;
  }
  if (school) {
    if (school.logoUrl !== undefined) {
      const check = validateSchoolLogoUrl(school.logoUrl);
      if (!check.valid) {
        res.status(400).json({ success: false, error: check.error });
        return;
      }
      school.logoUrl = check.normalizedUrl;
    }
    dbState.school = { ...dbState.school, ...school };
  }
  if (kingdomAvatarUrl !== undefined) {
    dbState.kingdomAvatarUrl = kingdomAvatarUrl;
  }
  if (sidebarMascotUrl !== undefined) {
    dbState.sidebarMascotUrl = sidebarMascotUrl;
  }
  if (classInfo) {
    const idx = dbState.classes.findIndex(c => c.id === (classInfo.id || dbState.currentClassId));
    if (idx !== -1) {
      dbState.classes[idx] = { ...dbState.classes[idx], ...classInfo };
      if (dbState.classes[idx].id === dbState.currentClassId) {
        dbState.classInfo = dbState.classes[idx];
      }
    }
  }
  saveDb(dbState);
  res.json({
    success: true,
    data: {
      school: dbState.school,
      classInfo: dbState.classInfo,
      kingdomAvatarUrl: dbState.kingdomAvatarUrl,
      sidebarMascotUrl: dbState.sidebarMascotUrl,
    },
  });
});

// Update Kingdom Avatar (circular avatar in sidebar)
app.post('/api/kingdom-avatar', (req: Request, res: Response) => {
  const { avatarUrl } = req.body;
  dbState.kingdomAvatarUrl = avatarUrl || '/assets/kingdom/sidebar_logo.png';
  saveDb(dbState);
  res.json({ success: true, kingdomAvatarUrl: dbState.kingdomAvatarUrl });
});

// Update School Logo
app.post('/api/school-logo', (req: Request, res: Response) => {
  const { logoUrl, role } = req.body;
  const headerRole = req.headers['x-user-role'];
  if (role === 'student' || headerRole === 'student') {
    res.status(403).json({ success: false, error: 'Chỉ giáo viên/quản trị viên mới có quyền thay đổi logo trường học' });
    return;
  }
  const check = validateSchoolLogoUrl(logoUrl);
  if (!check.valid) {
    res.status(400).json({ success: false, error: check.error });
    return;
  }
  dbState.school.logoUrl = check.normalizedUrl;
  saveDb(dbState);
  recordAuditLog(
    dbState.currentClassId,
    'student_edit',
    dbState.classInfo?.teacherName || 'Cô Thảo',
    check.normalizedUrl === DEFAULT_SCHOOL_LOGO
      ? 'Khôi phục logo trường học về mặc định'
      : 'Cập nhật logo trường học mới'
  );
  res.json({
    success: true,
    message:
      check.normalizedUrl === DEFAULT_SCHOOL_LOGO
        ? 'Đã khôi phục logo trường học mặc định thành công!'
        : 'Đã cập nhật và đồng bộ logo trường học thành công!',
    logoUrl: dbState.school.logoUrl,
    school: dbState.school,
  });
});

// Update Sidebar Mascot Card (mascot card in sidebar)
app.post('/api/sidebar-mascot', (req: Request, res: Response) => {
  const { mascotUrl } = req.body;
  dbState.sidebarMascotUrl = mascotUrl || '/assets/kingdom/sidebar_mascot.png';
  saveDb(dbState);
  res.json({ success: true, sidebarMascotUrl: dbState.sidebarMascotUrl });
});


// Reset / Load Demo students for current class
app.post('/api/class/reset-demo', (req: Request, res: Response) => {
  const { mode } = req.body; // 'demo28' or 'empty'
  const cId = dbState.currentClassId;

  if (mode === 'demo28') {
    // Remove existing students for this class and inject 28 demo students
    dbState.students = dbState.students.filter(s => s.classId !== cId).concat(getDemoStudents(cId));
    // Set sample points for class teams
    const classTeams = dbState.teams.filter(t => t.classId === cId);
    if (classTeams.length >= 4) {
      classTeams[0].points = 256;
      classTeams[1].points = 289;
      classTeams[2].points = 241;
      classTeams[3].points = 198;
    }
  } else {
    // Clear students for this class
    dbState.students = dbState.students.filter(s => s.classId !== cId);
    dbState.teams.filter(t => t.classId === cId).forEach(t => { t.points = 0; });
  }
  syncMonthlyBirthdayNews(cId);
  saveDb(dbState);
  res.json({ success: true, count: dbState.students.filter(s => s.classId === cId).length, data: dbState });
});

// Add Student - Automatically syncs periodic monthly birthday news after entering DOB
app.post('/api/students', (req: Request, res: Response) => {
  const newStudent: Partial<Student> = req.body;
  if (!newStudent.fullName) {
    res.status(400).json({ success: false, error: 'Tên học sinh không được để trống' });
    return;
  }

  const cId = newStudent.classId || dbState.currentClassId;
  const currentClassStudents = dbState.students.filter(s => s.classId === cId);
  const id = newStudent.id || `${cId}_student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const code = newStudent.studentCode || `2A5${(currentClassStudents.length + 1).toString().padStart(2, '0')}`;
  
  const student: Student = {
    id,
    classId: cId,
    studentCode: code,
    fullName: newStudent.fullName.trim(),
    gender: newStudent.gender || 'male',
    teamId: newStudent.teamId || '',
    avatarUrl: newStudent.avatarUrl || (newStudent.gender === 'female' ? '/assets/kingdom/student_ngoc.png' : '/assets/kingdom/student_minh.png'),
    dob: newStudent.dob ? newStudent.dob.trim() : '2018-01-01',
    notes: newStudent.notes || '',
    totalEarnedStars: newStudent.totalEarnedStars || 0,
    spendableStars: newStudent.spendableStars || 0,
    weeklyStars: 0,
    monthlyStars: 0,
    level: 1,
    badgeIds: [],
    passcode: newStudent.passcode || '2026',
  };

  dbState.students.push(student);
  // Auto-sync monthly birthday bulletin for the class
  syncMonthlyBirthdayNews(cId);
  saveDb(dbState);
  res.json({ success: true, student, data: dbState });
});

// Import Students from Excel - Automatically syncs periodic monthly birthday news
app.post('/api/students/import', (req: Request, res: Response) => {
  const { studentsList, clearExisting, classId } = req.body;
  if (!Array.isArray(studentsList) || studentsList.length === 0) {
    res.status(400).json({ success: false, error: 'Danh sách học sinh không hợp lệ' });
    return;
  }

  const targetClassId = classId || dbState.currentClassId;
  if (clearExisting) {
    dbState.students = dbState.students.filter(s => s.classId !== targetClassId);
  }

  const classTeams = dbState.teams.filter(t => t.classId === targetClassId);
  let addedCount = 0;

  studentsList.forEach((raw, i) => {
    if (!raw.fullName || typeof raw.fullName !== 'string') return;
    
    let teamId = raw.teamId;
    if (!teamId && classTeams.length > 0) {
      teamId = classTeams[i % classTeams.length].id;
    }

    const currentCount = dbState.students.filter(s => s.classId === targetClassId).length;
    const isFemale = raw.gender === 'female' || String(raw.gender).toLowerCase().includes('nữ');
    const defaultAvatar = isFemale ? '/assets/kingdom/student_ngoc.png' : '/assets/kingdom/student_minh.png';

    const student: Student = {
      id: raw.id || `${targetClassId}_student_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
      classId: targetClassId,
      studentCode: raw.studentCode || `2A5${(currentCount + 1).toString().padStart(2, '0')}`,
      fullName: raw.fullName.trim(),
      gender: isFemale ? 'female' : 'male',
      teamId: teamId || '',
      avatarUrl: raw.avatarUrl || defaultAvatar,
      dob: raw.dob ? String(raw.dob).trim() : '',
      notes: raw.notes || '',
      totalEarnedStars: Number(raw.totalEarnedStars) || 0,
      spendableStars: Number(raw.spendableStars) || Number(raw.totalEarnedStars) || 0,
      weeklyStars: 0,
      monthlyStars: 0,
      level: 1,
      badgeIds: [],
      passcode: raw.passcode || '2026',
    };
    student.level = calculateLevel(student.totalEarnedStars, dbState.levelRules);
    dbState.students.push(student);
    addedCount++;
  });

  // Auto-sync monthly birthday bulletin for the class
  syncMonthlyBirthdayNews(targetClassId);
  saveDb(dbState);
  res.json({ success: true, count: addedCount, students: dbState.students, data: dbState });
});

// Update single student (including DOB change) - Automatically updates periodic monthly birthday bulletin
app.put('/api/students/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = dbState.students.findIndex(s => s.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Không tìm thấy học sinh' });
    return;
  }

  const existing = dbState.students[index];
  const oldTeamId = existing.teamId;
  const newTeamId = req.body.teamId !== undefined ? req.body.teamId : oldTeamId;

  // Log team change audit event if team changed
  if (newTeamId && newTeamId !== oldTeamId) {
    const oldTeam = dbState.teams.find(t => t.id === oldTeamId);
    const newTeam = dbState.teams.find(t => t.id === newTeamId);
    const oldTeamName = oldTeam ? oldTeam.nameVi.split(':')[0].trim() : 'Chưa phân tổ';
    const newTeamName = newTeam ? newTeam.nameVi.split(':')[0].trim() : newTeamId;

    const auditTx: StarTransaction = {
      id: `tx_audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classId: existing.classId,
      studentId: existing.id,
      studentName: req.body.fullName || existing.fullName,
      deltaStars: 0,
      teamId: newTeamId,
      reasonCategory: 'Chuyển tổ',
      reasonNote: `Chuyển từ ${oldTeamName} sang ${newTeamName}`,
      timestamp: new Date().toISOString(),
      createdBy: 'Cô Thảo',
    };
    dbState.starTransactions.unshift(auditTx);
  }

  // Preserve critical historical fields: studentId, classId, stars, levels, badges, etc.
  const updated: Student = {
    ...existing,
    fullName: req.body.fullName !== undefined ? req.body.fullName.trim() : existing.fullName,
    studentCode: req.body.studentCode !== undefined ? req.body.studentCode.trim() : existing.studentCode,
    gender: req.body.gender || existing.gender,
    teamId: newTeamId,
    avatarUrl: req.body.avatarUrl || existing.avatarUrl,
    dob: req.body.dob !== undefined ? req.body.dob : existing.dob,
    notes: req.body.notes !== undefined ? req.body.notes : existing.notes,
    passcode: req.body.passcode || existing.passcode,
    // Strictly preserve cumulative achievements and stars:
    totalEarnedStars: existing.totalEarnedStars,
    spendableStars: existing.spendableStars,
    weeklyStars: existing.weeklyStars,
    monthlyStars: existing.monthlyStars,
    level: calculateLevel(existing.totalEarnedStars, dbState.levelRules),
    badgeIds: existing.badgeIds,
  };

  dbState.students[index] = updated;
  // Automatically update periodic monthly birthday news bulletins after updating student DOB
  syncMonthlyBirthdayNews(existing.classId);
  saveDb(dbState);
  res.json({ success: true, student: updated, data: dbState });
});

// Delete student - re-syncs monthly birthday bulletin
app.delete('/api/students/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const targetStudent = dbState.students.find(s => s.id === id);
  const targetClassId = targetStudent?.classId || dbState.currentClassId;
  const initialLength = dbState.students.length;
  dbState.students = dbState.students.filter(s => s.id !== id);
  if (dbState.students.length === initialLength) {
    res.status(404).json({ success: false, error: 'Không tìm thấy học sinh để xóa' });
    return;
  }
  syncMonthlyBirthdayNews(targetClassId);
  saveDb(dbState);
  res.json({ success: true, deletedId: id, data: dbState });
});

// Explicit endpoint to synchronize periodic monthly birthday bulletins
app.post('/api/news/sync-birthdays', (req: Request, res: Response) => {
  const classId = req.body.classId || dbState.currentClassId;
  const result = syncMonthlyBirthdayNews(classId);
  saveDb(dbState);
  res.json({
    success: true,
    message: `Đã cập nhật bản tin sinh nhật cho ${result.affectedMonths.length} tháng của lớp!`,
    news: dbState.news.filter(n => n.classId === classId),
    data: dbState,
  });
});

// Gift 10 stars to birthday students of a month
app.post('/api/students/gift-birthday-stars', (req: Request, res: Response) => {
  const { month, classId } = req.body;
  const targetClassId = classId || dbState.currentClassId;
  const targetMonth = Number(month) || (new Date().getMonth() + 1);
  const students = dbState.students.filter(s => s.classId === targetClassId && !s.archived);
  
  const birthdayKids = students.filter(s => {
    const parsed = parseBirthDate(s.dob);
    return parsed && parsed.month === targetMonth;
  });

  if (birthdayKids.length === 0) {
    res.status(400).json({ success: false, error: `Không có học sinh nào sinh trong Tháng ${targetMonth}` });
    return;
  }

  const teacherName = dbState.classInfo.teacherName || 'Cô Thảo';
  birthdayKids.forEach(kid => {
    if ((kid as any).baseWeeklyStars === undefined) (kid as any).baseWeeklyStars = kid.weeklyStars || 0;
    if ((kid as any).baseMonthlyStars === undefined) (kid as any).baseMonthlyStars = kid.monthlyStars || 0;
    kid.totalEarnedStars += 10;
    kid.spendableStars += 10;
    kid.monthlyStars = (kid.monthlyStars || 0) + 10;
    kid.weeklyStars = (kid.weeklyStars || 0) + 10;
    kid.level = calculateLevel(kid.totalEarnedStars, dbState.levelRules);

    if (kid.teamId) {
      const team = dbState.teams.find(t => t.id === kid.teamId);
      if (team) {
        if ((team as any).baseWeeklyPoints === undefined) (team as any).baseWeeklyPoints = team.weeklyPoints || 0;
        if ((team as any).baseMonthlyPoints === undefined) (team as any).baseMonthlyPoints = team.monthlyPoints || team.points || 0;
        team.points = (team.points || 0) + 10;
        team.monthlyPoints = (team.monthlyPoints || 0) + 10;
      }
    }

    const tx: StarTransaction = {
      id: `tx_bday_${Date.now()}_${kid.id}`,
      classId: targetClassId,
      studentId: kid.id,
      studentName: kid.fullName,
      deltaStars: 10,
      teamId: kid.teamId,
      reasonCategory: 'Sinh nhật',
      reasonNote: `Chúc mừng sinh nhật Tháng ${targetMonth}! Thưởng 10 sao vương quốc`,
      timestamp: new Date().toISOString(),
      createdBy: teacherName,
    };
    dbState.starTransactions.unshift(tx);
  });

  recordNotification({
    classId: targetClassId,
    type: 'celebration',
    titleVi: `Thưởng 10 sao sinh nhật Tháng ${targetMonth}`,
    titleEn: `10 Birthday Stars Awarded for Month ${targetMonth}`,
    messageVi: `${teacherName} đã thưởng 10 ngôi sao lấp lánh cho ${birthdayKids.length} bạn có sinh nhật trong Tháng ${targetMonth}!`,
    messageEn: `${teacherName} awarded 10 stars to ${birthdayKids.length} students having birthdays in Month ${targetMonth}!`,
    targetRole: 'all',
    authorName: teacherName,
    metadata: {
      severity: 'success',
      linkTab: 'news',
    },
  });

  saveDb(dbState);
  res.json({
    success: true,
    message: `Đã thưởng 10 sao sinh nhật cho ${birthdayKids.length} bạn học sinh sinh Tháng ${targetMonth}!`,
    students: dbState.students,
    teams: dbState.teams,
    data: dbState,
  });
});

// Direct Star Award / Deduct on sticker
app.post('/api/stars/give', (req: Request, res: Response) => {
  const { studentId, deltaStars, reasonCategory, reasonNote, createdBy, timestamp } = req.body;
  if (!studentId || typeof deltaStars !== 'number' || deltaStars === 0) {
    res.status(400).json({ success: false, error: 'Thông tin thưởng sao không hợp lệ' });
    return;
  }

  const student = dbState.students.find(s => s.id === studentId);
  if (!student) {
    res.status(404).json({ success: false, error: 'Không tìm thấy học sinh' });
    return;
  }

  if (deltaStars < 0 && (!reasonNote || reasonNote.trim() === '')) {
    res.status(400).json({ success: false, error: 'Trừ sao bắt buộc phải ghi rõ lý do' });
    return;
  }

  if ((student as any).baseWeeklyStars === undefined) (student as any).baseWeeklyStars = student.weeklyStars || 0;
  if ((student as any).baseMonthlyStars === undefined) (student as any).baseMonthlyStars = student.monthlyStars || 0;

  // Deduct/Add safely
  if (deltaStars < 0 && student.spendableStars + deltaStars < 0) {
    student.spendableStars = 0;
  } else {
    student.spendableStars += deltaStars;
  }

  if (deltaStars > 0) {
    student.totalEarnedStars += deltaStars;
    student.weeklyStars += deltaStars;
    student.monthlyStars += deltaStars;
  } else {
    student.totalEarnedStars = Math.max(0, student.totalEarnedStars + deltaStars);
    student.weeklyStars = Math.max(0, student.weeklyStars + deltaStars);
    student.monthlyStars = Math.max(0, student.monthlyStars + deltaStars);
  }

  student.level = calculateLevel(student.totalEarnedStars, dbState.levelRules);

  // Update Team points
  if (student.teamId) {
    const team = dbState.teams.find(t => t.id === student.teamId);
    if (team) {
      if ((team as any).baseWeeklyPoints === undefined) (team as any).baseWeeklyPoints = team.weeklyPoints || 0;
      if ((team as any).baseMonthlyPoints === undefined) (team as any).baseMonthlyPoints = team.monthlyPoints || team.points || 0;
      team.points = Math.max(0, team.points + deltaStars);
      if (deltaStars > 0) {
        team.weeklyPoints = (team.weeklyPoints || 0) + deltaStars;
      }
    }
  }

  // Audit transaction record
  const tx: StarTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId: student.classId,
    studentId: student.id,
    studentName: student.fullName,
    deltaStars,
    teamId: student.teamId,
    reasonCategory: reasonCategory || 'Khen thưởng',
    reasonNote: reasonNote || `Thưởng ${deltaStars} sao`,
    timestamp: timestamp || new Date().toISOString(),
    createdBy: createdBy || 'Cô Thảo',
  };

  dbState.starTransactions.unshift(tx);
  recordAuditLog(
    student.classId,
    deltaStars > 0 ? 'star_award' : 'star_deduct',
    createdBy || 'Cô Thảo',
    `${deltaStars > 0 ? 'Thưởng' : 'Trừ'} ${Math.abs(deltaStars)} sao cho ${student.fullName} (${reasonCategory}): ${reasonNote}`,
    { txId: tx.id, studentId: student.id, deltaStars, reasonCategory, reasonNote },
    true,
    { txId: tx.id, studentId: student.id, deltaStars }
  );

  const starNotif = recordNotification({
    classId: student.classId,
    type: 'star',
    titleVi: `${deltaStars > 0 ? 'Thưởng' : 'Trừ'} ${Math.abs(deltaStars)} sao cho ${student.fullName}`,
    titleEn: `${deltaStars > 0 ? 'Awarded' : 'Deducted'} ${Math.abs(deltaStars)} stars for ${student.fullName}`,
    messageVi: `${createdBy || 'Cô Thảo'} đã ${deltaStars > 0 ? 'cộng' : 'trừ'} ${Math.abs(deltaStars)} sao cho bạn ${student.fullName} (${reasonCategory}): ${reasonNote}`,
    messageEn: `${createdBy || 'Teacher Thao'} ${deltaStars > 0 ? 'awarded' : 'deducted'} ${Math.abs(deltaStars)} stars for ${student.fullName} (${reasonCategory}): ${reasonNote}`,
    targetRole: 'all',
    authorName: createdBy || 'Cô Thảo',
    metadata: {
      studentId: student.id,
      studentName: student.fullName,
      deltaStars,
      teamId: student.teamId,
      severity: deltaStars > 0 ? 'success' : 'warning',
      linkTab: 'rewards',
    },
  });

  saveDb(dbState);
  res.json({ success: true, student, transaction: tx, teams: dbState.teams, notification: starNotif });
});

// Batch Star Reward
app.post('/api/stars/batch', (req: Request, res: Response) => {
  const { studentIds, deltaStars, reasonCategory, reasonNote, createdBy } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0 || typeof deltaStars !== 'number') {
    res.status(400).json({ success: false, error: 'Dữ liệu thưởng nhóm không hợp lệ' });
    return;
  }

  const updatedStudents: Student[] = [];
  const transactions: StarTransaction[] = [];

  for (const sId of studentIds) {
    const student = dbState.students.find(s => s.id === sId);
    if (!student) continue;

    if ((student as any).baseWeeklyStars === undefined) (student as any).baseWeeklyStars = student.weeklyStars || 0;
    if ((student as any).baseMonthlyStars === undefined) (student as any).baseMonthlyStars = student.monthlyStars || 0;

    if (deltaStars < 0 && student.spendableStars + deltaStars < 0) {
      student.spendableStars = 0;
    } else {
      student.spendableStars += deltaStars;
    }

    if (deltaStars > 0) {
      student.totalEarnedStars += deltaStars;
      student.weeklyStars += deltaStars;
      student.monthlyStars += deltaStars;
    } else {
      student.totalEarnedStars = Math.max(0, student.totalEarnedStars + deltaStars);
      student.weeklyStars = Math.max(0, student.weeklyStars + deltaStars);
      student.monthlyStars = Math.max(0, student.monthlyStars + deltaStars);
    }

    student.level = calculateLevel(student.totalEarnedStars, dbState.levelRules);

    if (student.teamId) {
      const team = dbState.teams.find(t => t.id === student.teamId);
      if (team) {
        if ((team as any).baseWeeklyPoints === undefined) (team as any).baseWeeklyPoints = team.weeklyPoints || 0;
        if ((team as any).baseMonthlyPoints === undefined) (team as any).baseMonthlyPoints = team.monthlyPoints || team.points || 0;
        team.points = Math.max(0, team.points + deltaStars);
        if (deltaStars > 0) {
          team.weeklyPoints = (team.weeklyPoints || 0) + deltaStars;
        }
      }
    }

    const tx: StarTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classId: student.classId,
      studentId: student.id,
      studentName: student.fullName,
      deltaStars,
      teamId: student.teamId,
      reasonCategory: reasonCategory || 'Thưởng nhóm',
      reasonNote: reasonNote || `Thưởng nhóm ${deltaStars} sao`,
      timestamp: new Date().toISOString(),
      createdBy: createdBy || 'Cô Thảo',
    };
    transactions.push(tx);
    dbState.starTransactions.unshift(tx);
    updatedStudents.push(student);
  }

  saveDb(dbState);
  res.json({ success: true, count: updatedStudents.length, students: updatedStudents, transactions, teams: dbState.teams });
});

// Team Bonus Points
app.post('/api/teams/:id/points', (req: Request, res: Response) => {
  const { id } = req.params;
  const { deltaPoints, reason } = req.body;
  const team = dbState.teams.find(t => t.id === id);
  if (!team) {
    res.status(404).json({ success: false, error: 'Không tìm thấy tổ' });
    return;
  }
  if ((team as any).baseWeeklyPoints === undefined) (team as any).baseWeeklyPoints = team.weeklyPoints || 0;
  if ((team as any).baseMonthlyPoints === undefined) (team as any).baseMonthlyPoints = team.monthlyPoints || team.points || 0;
  team.points = Math.max(0, team.points + (Number(deltaPoints) || 0));
  team.weeklyPoints = Math.max(0, (team.weeklyPoints || 0) + (Number(deltaPoints) || 0));
  
  dbState.starTransactions.unshift({
    id: `tx_team_${Date.now()}`,
    classId: team.classId,
    studentId: '',
    studentName: team.nameVi,
    deltaStars: Number(deltaPoints) || 0,
    teamId: team.id,
    reasonCategory: 'Điểm thi đua tổ',
    reasonNote: reason || 'Cộng điểm thi đua tổ',
    timestamp: new Date().toISOString(),
    createdBy: 'Cô Thảo',
  });

  saveDb(dbState);
  res.json({ success: true, team, teams: dbState.teams });
});

// Update Team
app.put('/api/teams/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = dbState.teams.findIndex(t => t.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Không tìm thấy tổ' });
    return;
  }
  dbState.teams[index] = { ...dbState.teams[index], ...req.body };
  saveDb(dbState);
  res.json({ success: true, team: dbState.teams[index] });
});

// Reset Team Points with FULL UNDO capability
app.post('/api/teams/reset', (req: Request, res: Response) => {
  const { teamId, classId, actor, reason } = req.body;
  const cId = classId || dbState.currentClassId;
  const classTeams = dbState.teams.filter(t => t.classId === cId);
  const targetTeams = teamId ? classTeams.filter(t => t.id === teamId) : classTeams;

  if (targetTeams.length === 0) {
    res.status(404).json({ success: false, error: 'Không tìm thấy tổ để đặt lại điểm' });
    return;
  }

  // Create snapshot of previous points for 100% reliable Undo
  const teamsSnapshot = targetTeams.map(t => ({
    id: t.id,
    nameVi: t.nameVi,
    nameEn: t.nameEn,
    points: t.points,
    weeklyPoints: t.weeklyPoints ?? Math.round(t.points * 0.2),
    monthlyPoints: t.monthlyPoints ?? t.points,
    semester1Points: t.semester1Points ?? Math.round(t.points * 1.8),
    semester2Points: t.semester2Points ?? t.points,
  }));

  // Reset target teams points
  targetTeams.forEach(t => {
    t.points = 0;
    t.weeklyPoints = 0;
    t.monthlyPoints = 0;
  });

  const operator = actor || dbState.classInfo?.teacherName || 'Cô Thảo';
  const desc = teamId && targetTeams.length === 1
    ? `Đặt lại điểm thi đua của ${targetTeams[0].nameVi} về 0 (Trước đó: ${teamsSnapshot[0].points} ⭐)`
    : `Đặt lại điểm thi đua của tất cả ${targetTeams.length} tổ về 0`;

  const auditLog = recordAuditLog(
    cId,
    'team_reset',
    operator,
    desc,
    { teamId, reason: reason || 'Đặt lại điểm thi đua định kỳ', teamsSnapshot },
    true, // canUndo = true
    {
      type: 'team_reset',
      teamsSnapshot,
      classId: cId,
      timestamp: new Date().toISOString(),
    }
  );

  recordNotification({
    classId: cId,
    type: 'team',
    titleVi: teamId ? `Đặt lại điểm thi đua: ${targetTeams[0].nameVi}` : 'Đặt lại điểm thi đua các tổ',
    titleEn: teamId ? `Reset Team Points: ${targetTeams[0].nameEn || targetTeams[0].nameVi}` : 'Reset All Teams Points',
    messageVi: `${desc}. Bạn có thể nhấn Hoàn tác bất kỳ lúc nào để khôi phục điểm số.`,
    messageEn: `${desc}. You can click Undo at any time to restore previous points.`,
    targetRole: 'all',
    authorName: operator,
    metadata: {
      teamId: teamId || 'all',
      severity: 'warning',
      linkTab: 'teams',
      auditLogId: auditLog.id,
    },
  });

  saveDb(dbState);
  res.json({
    success: true,
    message: `${desc} thành công. Bạn có thể hoàn tác bất kỳ lúc nào.`,
    teams: dbState.teams,
    auditLog,
    teamsSnapshot,
  });
});

// Quick Undo Team Reset endpoint
app.post('/api/teams/undo-reset', (req: Request, res: Response) => {
  const { auditLogId, classId } = req.body;
  const cId = classId || dbState.currentClassId;

  // Find target log
  let log = (dbState.auditLogs || []).find(a => a.id === auditLogId);
  if (!log) {
    // If no specific logId provided, find the most recent team_reset log that has not been undone
    log = (dbState.auditLogs || []).find(a => a.action === 'team_reset' && a.canUndo && !a.isUndone);
  }

  if (!log || !log.undoPayload?.teamsSnapshot) {
    res.status(400).json({ success: false, error: 'Không tìm thấy lượt đặt lại điểm nào khả dụng để hoàn tác' });
    return;
  }

  const teamsSnapshot = log.undoPayload.teamsSnapshot;
  teamsSnapshot.forEach((snap: any) => {
    const team = dbState.teams.find(t => t.id === snap.id);
    if (team) {
      team.points = snap.points ?? team.points;
      team.weeklyPoints = snap.weeklyPoints ?? team.weeklyPoints;
      team.monthlyPoints = snap.monthlyPoints ?? team.monthlyPoints;
      team.semester1Points = snap.semester1Points ?? team.semester1Points;
      team.semester2Points = snap.semester2Points ?? team.semester2Points;
    }
  });

  log.isUndone = true;

  recordAuditLog(
    cId,
    'team_reset',
    log.actor || 'Cô Thảo',
    `Hoàn tác thành công: Phục hồi lại điểm thi đua các tổ về trạng thái trước đó`,
    { restoredTeams: teamsSnapshot },
    false
  );

  saveDb(dbState);
  res.json({
    success: true,
    message: 'Hoàn tác thành công! Điểm thưởng sao của các tổ đã được phục hồi nguyên vẹn.',
    teams: dbState.teams,
    restoredTeams: teamsSnapshot,
    auditLog: log,
  });
});

// Attendance save
app.post('/api/attendance', (req: Request, res: Response) => {
  const { date, records, note, classId } = req.body;
  const cId = classId || dbState.currentClassId;
  const entry: AttendanceRecord = {
    classId: cId,
    date,
    records,
    note: note || '',
    updatedAt: new Date().toISOString(),
  };
  dbState.attendance[`${cId}_${date}`] = entry;
  saveDb(dbState);
  res.json({ success: true, attendance: entry });
});

// Seating chart save
app.post('/api/seating', (req: Request, res: Response) => {
  const { rows, cols, seats, classId } = req.body;
  const cId = classId || dbState.currentClassId;
  dbState.seatingChart = {
    classId: cId,
    rows: Number(rows) || 4,
    cols: Number(cols) || 7,
    seats: Array.isArray(seats) ? seats : [],
    updatedAt: new Date().toISOString(),
  };
  saveDb(dbState);
  res.json({ success: true, seatingChart: dbState.seatingChart });
});

// Redeem reward
app.post('/api/rewards/redeem', (req: Request, res: Response) => {
  const { rewardId, studentId } = req.body;
  const reward = dbState.rewards.find(r => r.id === rewardId);
  const student = dbState.students.find(s => s.id === studentId);

  if (!reward || !student) {
    res.status(404).json({ success: false, error: 'Không tìm thấy phần thưởng hoặc học sinh' });
    return;
  }

  if (reward.stock <= 0) {
    res.status(400).json({ success: false, error: 'Phần thưởng này đã hết quà trong kho' });
    return;
  }

  if (student.spendableStars < reward.starCost) {
    res.status(400).json({ success: false, error: `Học sinh chỉ còn ${student.spendableStars} sao, không đủ ${reward.starCost} sao để đổi quà` });
    return;
  }

  // Deduct spendable stars ONLY (totalEarnedStars remains preserved!)
  student.spendableStars -= reward.starCost;
  reward.stock -= 1;
  reward.claimedCount = (reward.claimedCount || 0) + 1;

  const redemption = {
    id: `red_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId: student.classId,
    rewardId: reward.id,
    rewardTitle: reward.titleVi,
    studentId: student.id,
    studentName: student.fullName,
    starCost: reward.starCost,
    status: 'approved' as const,
    timestamp: new Date().toISOString(),
  };

  dbState.redemptions.unshift(redemption);

  recordNotification({
    classId: student.classId,
    type: 'reward',
    titleVi: `Đổi quà: ${student.fullName} đổi "${reward.titleVi}"`,
    titleEn: `Reward Claimed: ${student.fullName} claimed "${reward.titleEn || reward.titleVi}"`,
    messageVi: `Học sinh ${student.fullName} đã dùng ${reward.starCost} sao để đổi phần quà "${reward.titleVi}".`,
    messageEn: `Student ${student.fullName} used ${reward.starCost} stars to claim "${reward.titleEn || reward.titleVi}".`,
    targetRole: 'all',
    authorName: 'Hệ thống vương quốc',
    metadata: {
      studentId: student.id,
      studentName: student.fullName,
      rewardId: reward.id,
      rewardTitle: reward.titleVi,
      severity: 'success',
      linkTab: 'rewards',
    },
  });

  saveDb(dbState);
  res.json({ success: true, redemption, student, reward });
});

// Add new reward
app.post('/api/rewards', (req: Request, res: Response) => {
  const { titleVi, titleEn, starCost, stock, description, imageUrl } = req.body;
  const newReward = {
    id: `rew_${Date.now()}`,
    titleVi: (titleVi || 'Phần quà mới').trim(),
    titleEn: (titleEn || titleVi || 'New Reward').trim(),
    starCost: Math.max(1, Number(starCost) || 10),
    stock: Math.max(0, Number(stock) !== undefined ? Number(stock) : 10),
    iconName: 'Gift',
    imageUrl: imageUrl || '',
    description: (description || '').trim(),
    claimedCount: 0,
    isArchived: false,
    isActive: true,
  };
  dbState.rewards.push(newReward);
  saveDb(dbState);
  res.json({ success: true, reward: newReward });
});

// Update reward
app.put('/api/rewards/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = dbState.rewards.findIndex(r => r.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Không tìm thấy phần thưởng' });
    return;
  }
  const existing = dbState.rewards[index];
  const updated = {
    ...existing,
    titleVi: req.body.titleVi !== undefined ? req.body.titleVi.trim() : existing.titleVi,
    titleEn: req.body.titleEn !== undefined ? req.body.titleEn.trim() : existing.titleEn,
    starCost: req.body.starCost !== undefined ? Math.max(1, Number(req.body.starCost)) : existing.starCost,
    stock: req.body.stock !== undefined ? Math.max(0, Number(req.body.stock)) : existing.stock,
    description: req.body.description !== undefined ? req.body.description.trim() : existing.description,
    imageUrl: req.body.imageUrl !== undefined ? req.body.imageUrl : existing.imageUrl,
    isArchived: req.body.isArchived !== undefined ? Boolean(req.body.isArchived) : existing.isArchived,
    isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
  };
  dbState.rewards[index] = updated;
  saveDb(dbState);
  res.json({ success: true, reward: updated, rewards: dbState.rewards });
});

// Soft delete / archive reward (Preserves redemption history and star balances!)
app.delete('/api/rewards/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = dbState.rewards.findIndex(r => r.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Không tìm thấy phần thưởng' });
    return;
  }
  // Soft archive so existing redemption history records remain 100% valid
  dbState.rewards[index].isArchived = true;
  dbState.rewards[index].isActive = false;
  saveDb(dbState);
  res.json({ success: true, message: 'Đã lưu kho phần quà an toàn, lịch sử đổi thưởng được bảo toàn trọn vẹn', reward: dbState.rewards[index] });
});

// Menu Customization save / reset
app.post('/api/menu-customization', (req: Request, res: Response) => {
  const { menuCustomization } = req.body;
  dbState.menuCustomization = menuCustomization || {};
  saveDb(dbState);
  res.json({ success: true, menuCustomization: dbState.menuCustomization });
});

// News post: create
app.post('/api/news', (req: Request, res: Response) => {
  const {
    title,
    content,
    author,
    authorId,
    pinned,
    isPinned,
    tags,
    classId,
    imageUrl,
    images,
    videoUrl,
    attachments,
    visibility,
  } = req.body;
  const cId = classId || dbState.currentClassId;
  const now = new Date();
  const pinState = Boolean(pinned || isPinned);

  const item: ClassNewsItem = {
    id: `news_${Date.now()}`,
    classId: cId,
    title: (title || '').trim(),
    content: (content || '').trim(),
    author: (author || 'Cô Thảo').trim(),
    authorId: authorId || undefined,
    date: now.toISOString().slice(0, 10),
    pinned: pinState,
    isPinned: pinState,
    pinnedAt: pinState ? now.toISOString() : undefined,
    imageUrl: imageUrl || (Array.isArray(images) && images[0]) || undefined,
    images: Array.isArray(images) ? images : (imageUrl ? [imageUrl] : []),
    videoUrl: videoUrl ? videoUrl.trim() : undefined,
    attachments: Array.isArray(attachments) ? attachments : [],
    visibility: visibility || 'all',
    tags: Array.isArray(tags) && tags.length > 0 ? tags : ['Thông báo'],
    likes: 0,
    likedBy: [],
    isDeleted: false,
  };

  dbState.news.unshift(item);

  recordNotification({
    classId: cId,
    type: 'news',
    titleVi: `Bảng tin lớp: ${item.title}`,
    titleEn: `Class News: ${item.title}`,
    messageVi: `${item.author} đã đăng bài viết mới: "${item.title}". Nhấn để xem nội dung chi tiết.`,
    messageEn: `${item.author} published a new post: "${item.title}". Click to view details.`,
    targetRole: item.visibility === 'teachers' ? 'teacher' : 'all',
    authorName: item.author,
    metadata: {
      newsId: item.id,
      severity: 'normal',
      linkTab: 'news',
    },
  });

  saveDb(dbState);
  recordAuditLog(cId, 'student_edit', item.author, `Đăng bài viết mới trên bảng tin: ${item.title}`);
  res.json({ success: true, newsItem: item, news: dbState.news });
});

// Update News post
app.put('/api/news/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = dbState.news.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Không tìm thấy bài viết trên bảng tin' });
    return;
  }

  const existing = dbState.news[index];
  const {
    title,
    content,
    pinned,
    isPinned,
    tags,
    likes,
    author,
    authorId,
    imageUrl,
    images,
    videoUrl,
    attachments,
    visibility,
    updatedBy,
  } = req.body;

  const now = new Date();
  const pinState =
    pinned !== undefined
      ? Boolean(pinned)
      : isPinned !== undefined
      ? Boolean(isPinned)
      : Boolean(existing.pinned);

  const updated: ClassNewsItem = {
    ...existing,
    title: title !== undefined ? title.trim() : existing.title,
    content: content !== undefined ? content.trim() : existing.content,
    pinned: pinState,
    isPinned: pinState,
    pinnedAt: pinState ? (existing.pinned ? existing.pinnedAt : now.toISOString()) : undefined,
    tags: Array.isArray(tags) ? tags : existing.tags,
    likes: likes !== undefined ? Number(likes) : existing.likes,
    author: author !== undefined ? author.trim() : existing.author,
    authorId: authorId !== undefined ? authorId : existing.authorId,
    imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
    images: Array.isArray(images) ? images : existing.images,
    videoUrl: videoUrl !== undefined ? videoUrl : existing.videoUrl,
    attachments: Array.isArray(attachments) ? attachments : existing.attachments,
    visibility: visibility !== undefined ? visibility : existing.visibility,
    isEdited: true,
    updatedAt: now.toISOString(),
    updatedBy: updatedBy || author || existing.author || 'Cô Thảo',
  };

  dbState.news[index] = updated;
  saveDb(dbState);
  recordAuditLog(
    existing.classId || dbState.currentClassId,
    'student_edit',
    updated.updatedBy || updated.author,
    `Chỉnh sửa bài đăng bảng tin: ${updated.title}`
  );
  res.json({ success: true, newsItem: updated, news: dbState.news });
});

// Toggle Pin News post
app.patch('/api/news/:id/pin', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = dbState.news.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    return;
  }

  const existing = dbState.news[index];
  const now = new Date();
  const nextPinned = !existing.pinned;

  existing.pinned = nextPinned;
  existing.isPinned = nextPinned;
  existing.pinnedAt = nextPinned ? now.toISOString() : undefined;

  saveDb(dbState);
  recordAuditLog(
    existing.classId || dbState.currentClassId,
    'student_edit',
    'Cô Thảo',
    `${nextPinned ? 'Ghim' : 'Bỏ ghim'} bài đăng bảng tin: ${existing.title}`
  );
  res.json({ success: true, newsItem: existing, news: dbState.news });
});

// Delete News post (Soft delete by default, or permanent delete if query permanent=true)
app.delete('/api/news/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const isPermanent = req.query.permanent === 'true';
  const index = dbState.news.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Không tìm thấy bài viết để xóa' });
    return;
  }

  const target = dbState.news[index];
  const operator = (req.body?.deletedBy || req.query?.deletedBy || 'Cô Thảo') as string;

  if (isPermanent) {
    dbState.news = dbState.news.filter((n) => n.id !== id);
    saveDb(dbState);
    recordAuditLog(
      target.classId || dbState.currentClassId,
      'student_delete',
      operator,
      `Xóa vĩnh viễn bài đăng bảng tin: ${target.title}`
    );
    res.json({
      success: true,
      message: `Đã xóa vĩnh viễn bài viết "${target.title}"`,
      deletedId: id,
      news: dbState.news,
    });
    return;
  }

  // Soft delete: keep in db, mark isDeleted = true
  target.isDeleted = true;
  target.deletedAt = new Date().toISOString();
  target.deletedBy = operator;

  saveDb(dbState);
  recordAuditLog(
    target.classId || dbState.currentClassId,
    'student_delete',
    operator,
    `Đã chuyển bài đăng vào thùng rác: ${target.title}`
  );
  res.json({
    success: true,
    message: `Đã chuyển bài viết "${target.title}" vào thùng rác`,
    newsItem: target,
    news: dbState.news,
  });
});

// Restore soft-deleted News post
app.post('/api/news/:id/restore', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = dbState.news.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Không tìm thấy bài viết để khôi phục' });
    return;
  }

  const target = dbState.news[index];
  target.isDeleted = false;
  target.deletedAt = undefined;
  target.deletedBy = undefined;

  saveDb(dbState);
  recordAuditLog(
    target.classId || dbState.currentClassId,
    'student_edit',
    'Cô Thảo',
    `Đã khôi phục bài đăng bảng tin: ${target.title}`
  );
  res.json({
    success: true,
    message: `Đã khôi phục bài viết "${target.title}" thành công!`,
    newsItem: target,
    news: dbState.news,
  });
});

// Learning Library: 4 categories (video, image, book, other)
app.post('/api/resources', (req: Request, res: Response) => {
  const { title, category, type, url, thumbnailUrl, description, author, grade } = req.body;
  const resource: LearningResource = {
    id: `res_${Date.now()}`,
    title,
    category: category || 'other',
    type: type || 'video',
    url: url || '',
    thumbnailUrl: thumbnailUrl || '',
    description: description || '',
    author: author || 'Cô Thảo',
    grade: Number(grade) || 2,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  dbState.learningResources.unshift(resource);
  saveDb(dbState);
  res.json({ success: true, resource });
});

app.delete('/api/resources/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  dbState.learningResources = dbState.learningResources.filter(r => r.id !== id);
  saveDb(dbState);
  res.json({ success: true, deletedId: id });
});

// Backup & Restore
app.post('/api/backup', (req: Request, res: Response) => {
  const { type, name } = req.body; // 'class' or 'all'
  const backupPayload = type === 'class'
    ? {
        type: 'class',
        classInfo: dbState.classInfo,
        teams: dbState.teams.filter(t => t.classId === dbState.currentClassId),
        students: dbState.students.filter(s => s.classId === dbState.currentClassId),
        news: dbState.news.filter(n => n.classId === dbState.currentClassId),
        starTransactions: dbState.starTransactions.filter(tx => tx.classId === dbState.currentClassId),
      }
    : dbState;

  const backupRecord = {
    id: `backup_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: type || 'class',
    name: name || `Bản sao lưu ${dbState.classInfo.nameVi}`,
    sizeBytes: JSON.stringify(backupPayload).length,
    data: backupPayload,
  };

  if (!dbState.backups) dbState.backups = [];
  dbState.backups.unshift(backupRecord);
  saveDb(dbState);
  res.json({ success: true, backup: backupRecord });
});

app.post('/api/restore', (req: Request, res: Response) => {
  const { backupData } = req.body;
  if (!backupData) {
    res.status(400).json({ success: false, error: 'Dữ liệu sao lưu không hợp lệ' });
    return;
  }

  try {
    if (backupData.classes && Array.isArray(backupData.classes)) {
      // Full restore
      dbState = backupData;
    } else if (backupData.classInfo) {
      // Single class restore
      const restoredClass = backupData.classInfo;
      const cIdx = dbState.classes.findIndex(c => c.id === restoredClass.id);
      if (cIdx !== -1) {
        dbState.classes[cIdx] = restoredClass;
      } else {
        dbState.classes.push(restoredClass);
      }
      // Replace class students & teams
      dbState.students = dbState.students.filter(s => s.classId !== restoredClass.id).concat(backupData.students || []);
      dbState.teams = dbState.teams.filter(t => t.classId !== restoredClass.id).concat(backupData.teams || []);
      dbState.currentClassId = restoredClass.id;
      dbState.classInfo = restoredClass;
    }
    saveDb(dbState);
    res.json({ success: true, data: dbState });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Lỗi khi khôi phục' });
  }
});

// Public Health Check Endpoint for Cloud Monitoring & Probes (Render/Railway/Fly.io)
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: '2.6.1',
    environment: process.env.NODE_ENV || 'development',
    database: {
      mode: process.env.USE_DEMO_DATA === 'true' ? 'demo' : 'production',
      file: path.basename(DB_FILE),
      studentCount: dbState.students?.length || 0,
      classCount: dbState.classes?.length || 0,
    },
  });
});

// Teacher / Manager Login (Universal Access: Allows ANY user to sign in with their Gmail & Password)
app.post('/api/auth/teacher-login', (req: Request, res: Response) => {
  const { email, password, displayName, isGoogleAuth } = req.body || {};
  const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : 'tpt0208@gmail.com';
  const cleanPassword = typeof password === 'string' ? password.trim() : '';

  // Determine user display name
  let name = displayName || 'Cô Thảo';
  if (cleanEmail === 'tpt0208@gmail.com' || cleanEmail.includes('thao')) {
    name = dbState.classInfo?.teacherName || 'Cô Thảo';
  } else if (!displayName) {
    const prefix = cleanEmail.split('@')[0];
    name = prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'Giáo viên';
  }

  // Issue valid session token granting full manager/teacher access
  const token = createSessionToken({
    role: 'teacher',
    userId: cleanEmail,
    email: cleanEmail,
    name,
  });

  res.json({
    success: true,
    token,
    user: { id: cleanEmail, email: cleanEmail, name, role: 'teacher' as const },
  });
});

// Student Login (Requires Student Code + PIN Passcode with Brute-force Protection)
app.post('/api/auth/student-login', (req: Request, res: Response) => {
  const { studentCode, passcode } = req.body || {};
  if (!studentCode || !passcode || typeof studentCode !== 'string' || typeof passcode !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Vui lòng nhập đầy đủ Mã học sinh và Mã PIN bảo mật. / Please enter both Student Code and Security PIN.',
    });
    return;
  }
  const cleanCode = studentCode.trim().toUpperCase();
  const cleanPass = passcode.trim();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimitKey = `student_${ip}_${cleanCode}`;

  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    res.status(429).json({
      success: false,
      error: `Mã học sinh tạm khóa do nhập sai mã PIN quá 5 lần. Vui lòng thử lại sau ${rateCheck.waitMinutes} phút! / Student login locked. Please retry in ${rateCheck.waitMinutes} minutes.`,
    });
    return;
  }

  const student = dbState.students.find(
    (s) => s.studentCode.toUpperCase() === cleanCode && (s.passcode || '2026') === cleanPass
  );

  if (!student) {
    const failInfo = recordLoginFailure(rateLimitKey);
    const errorMsg = failInfo.locked
      ? `Nhập sai mã PIN quá 5 lần! Tài khoản bị tạm khóa 15 phút. / Locked for 15 minutes due to 5 failed attempts.`
      : 'Mã học sinh hoặc mã PIN bảo mật không đúng. / Invalid Student Code or Security PIN.';
    res.status(401).json({
      success: false,
      error: errorMsg,
    });
    return;
  }

  resetLoginAttempts(rateLimitKey);
  const sessionPayload = {
    role: 'student' as const,
    userId: `student_${student.id}`,
    studentId: student.id,
    studentCode: student.studentCode,
    name: student.fullName,
  };
  const token = createSessionToken(sessionPayload);
  const sanitized = sanitizeStudentRecord(student, { ...sessionPayload, exp: Date.now() + 3600000 });

  res.json({
    success: true,
    token,
    student: sanitized,
    user: sessionPayload,
  });
});

// Guest Read-Only Session
app.post('/api/auth/guest-login', (_req: Request, res: Response) => {
  const sessionPayload = {
    role: 'guest' as const,
    userId: 'student_guest',
    name: 'Khách xem / Guest',
  };
  const token = createSessionToken(sessionPayload, 12);
  res.json({
    success: true,
    token,
    user: sessionPayload,
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || !fs.existsSync(path.resolve(process.cwd(), 'src/main.tsx')) || (fs.existsSync(path.resolve(process.cwd(), 'dist/index.html')) && process.env.npm_lifecycle_event !== 'dev');

  if (isProduction && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Ms. Thao's Star Kingdom running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
