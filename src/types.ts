export type Role = 'teacher' | 'student';

export interface SchoolInfo {
  id: string;
  nameVi: string;
  nameEn: string;
  logoUrl?: string;
}

export interface ClassInfo {
  id: string;
  nameVi: string;
  nameEn: string;
  grade: number; // Khối 1-5
  schoolYear: string;
  teacherName: string;
  teacherTitleEn: string;
  teacherAvatar?: string;
  targetSize: number;
  sloganVi: string;
  sloganEn: string;
  coverUrl?: string;
  bannerTheme?: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export type RankingPeriod = 'week' | 'month' | 'semester1' | 'semester2' | 'year';

export interface AcademicCalendarConfig {
  schoolYear: string;
  startDate: string;      // YYYY-MM-DD (Week 1 start date, e.g. 2026-09-07)
  endDate: string;        // YYYY-MM-DD (School year / Week 36 end date, e.g. 2027-05-16 or 2027-05-31)
  semester1Start: string; // YYYY-MM-DD
  semester1End: string;   // YYYY-MM-DD
  semester2Start: string; // YYYY-MM-DD
  semester2End: string;   // YYYY-MM-DD
  totalWeeks?: number;    // Tổng số tuần năm học (mặc định 36 tuần)
  week1StartDate?: string;// Ngày bắt đầu Tuần 1 (YYYY-MM-DD, đồng bộ với startDate)
  holidayWeeks?: number[];// Các tuần nghỉ đặc biệt / điều chỉnh lịch (nếu có)
  scheduleNotes?: string; // Ghi chú điều chỉnh lịch hoặc tuần nghỉ đặc biệt
}

export interface FinalizedResult {
  id: string;
  classId: string;
  period: RankingPeriod;
  periodLabel: string;
  academicYear: string;
  finalizedAt: string;
  finalizedBy: string;
  notes?: string;
  summary: {
    totalStarsAwarded: number;
    totalTransactions: number;
    studentRankings: Array<{
      studentId: string;
      fullName: string;
      studentCode: string;
      teamId: string;
      stars: number;
      rank: number;
      level: number;
    }>;
    teamRankings: Array<{
      teamId: string;
      teamName: string;
      color: string;
      points: number;
      rank: number;
    }>;
  };
}

export interface AuditLogEntry {
  id: string;
  classId: string;
  action: 'star_award' | 'star_deduct' | 'team_change' | 'student_edit' | 'student_delete' | 'seating_change' | 'attendance_update' | 'class_archive' | 'class_restore' | 'reward_redeem' | 'finalize_results' | 'team_reset';
  actor: string;
  timestamp: string;
  description: string;
  details?: Record<string, any>;
  canUndo?: boolean;
  undoPayload?: any;
  isUndone?: boolean;
}

export interface Team {
  id: string;
  classId: string;
  nameVi: string;
  nameEn: string;
  color: string;
  bgColor: string;
  borderColor: string;
  flagColor: string;
  mascot: string;
  points: number;
  leaderId?: string;
  viceLeaderId?: string;
  weeklyPoints?: number;
  monthlyPoints?: number;
  semester1Points?: number;
  semester2Points?: number;
  avatarUrl?: string;
  slogan?: string;
}

export interface Student {
  id: string;
  classId: string;
  studentCode: string;
  fullName: string;
  gender: 'male' | 'female';
  teamId: string; // 'team_1' | 'team_2' | 'team_3' | 'team_4' or ''
  avatarUrl?: string;
  dob?: string;
  notes?: string;
  totalEarnedStars: number; // Tích lũy (never decreases on redemption)
  spendableStars: number;   // Khả dụng để đổi quà
  weeklyStars: number;      // Nhận trong tuần
  monthlyStars: number;     // Nhận trong tháng
  level: number;            // 1 to 5
  badgeIds: string[];
  passcode: string;         // PIN 4 số cho học sinh
  archived?: boolean;
}

export interface StarTransaction {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  deltaStars: number; // e.g. +1, +2, +3, +5, or -1, -2
  teamId: string;
  reasonCategory: string; // 'Phát biểu', 'Làm bài tốt', 'Giúp bạn', 'Sáng tạo', 'Điểm thi đua', etc.
  reasonNote: string;
  timestamp: string;
  createdBy: string;
}

export interface Badge {
  id: string;
  nameVi: string;
  nameEn: string;
  iconName: string;
  descriptionVi: string;
  descriptionEn: string;
  category: 'behavior' | 'academic' | 'creativity' | 'leadership';
  color: string;
}

export interface Reward {
  id: string;
  classId?: string;
  titleVi: string;
  titleEn: string;
  starCost: number;
  stock: number;
  iconName: string;
  imageUrl?: string;
  description: string;
  claimedCount: number;
  isArchived?: boolean;
  isActive?: boolean;
}

export interface RewardRedemption {
  id: string;
  classId: string;
  rewardId: string;
  rewardTitle: string;
  studentId: string;
  studentName: string;
  starCost: number;
  status: 'pending' | 'approved' | 'delivered';
  timestamp: string;
}

export type AttendanceStatus = 'present' | 'excused' | 'absent' | 'late';

export interface AttendanceRecord {
  classId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>; // studentId -> status
  note?: string;
  updatedAt: string;
}

export interface SeatPosition {
  seatIndex: number;
  row: number;
  col: number;
  studentId: string | null;
}

export interface SeatingChart {
  classId: string;
  rows: number;
  cols: number;
  seats: SeatPosition[];
  updatedAt: string;
}

export interface NewsAttachment {
  id?: string;
  name: string;
  url: string;
  size?: string;
  type?: 'pdf' | 'doc' | 'sheet' | 'slide' | 'image' | 'link' | 'other';
}

export interface ClassNewsItem {
  id: string;
  classId: string;
  title: string;
  content: string;
  author: string;
  authorId?: string;
  date: string;
  pinned?: boolean;
  isPinned?: boolean;
  pinnedAt?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  attachments?: NewsAttachment[];
  visibility?: 'all' | 'students' | 'teachers';
  tags: string[];
  likes: number;
  likedBy?: string[];
  isEdited?: boolean;
  updatedAt?: string;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type LibraryCategory = 'video' | 'image' | 'book' | 'other';

export interface LearningResource {
  id: string;
  classId?: string; // Optional: can be shared or specific
  title: string;
  category: LibraryCategory;
  grade: number; // 1-5
  type: 'video' | 'audio' | 'document' | 'game' | 'link' | 'image';
  url: string;
  thumbnailUrl?: string;
  author?: string;
  description: string;
  createdAt: string;
}

export interface LevelRule {
  level: number;
  titleVi: string;
  titleEn: string;
  minStars: number;
  icon: string;
  badgeColor: string;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  type: 'class' | 'all';
  name: string;
  sizeBytes: number;
  data: unknown;
}
export interface AudioSettings {
  masterSound: boolean;
  clickSound: boolean;
  starSound: boolean;
  celebrationSound: boolean;
  toolsSound: boolean;
  volume: number; // 0 to 1
}

export interface MenuItemCustomization {
  id: string; // 'home' | 'news' | 'teams' | 'students' | 'rewards' | 'halloffame' | 'tools' | 'library' | 'settings'
  titleVi: string;
  titleEn: string;
  iconUrl?: string; // custom image url or base64
  presetIcon?: string; // emoji or icon code
}

export interface OfflineOperation {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

export type NotificationType = 'star' | 'news' | 'reward' | 'attendance' | 'system' | 'celebration' | 'team';

export interface NotificationMetadata {
  studentId?: string;
  studentName?: string;
  deltaStars?: number;
  teamId?: string;
  teamName?: string;
  newsId?: string;
  rewardId?: string;
  rewardTitle?: string;
  auditLogId?: string;
  severity?: 'normal' | 'success' | 'warning' | 'error';
  linkTab?: string;
}

export interface AppNotification {
  id: string;
  classId: string;
  type: NotificationType;
  titleVi: string;
  titleEn: string;
  messageVi: string;
  messageEn: string;
  timestamp: string; // ISO string
  createdAt?: string;
  targetRole?: 'all' | 'teacher' | 'student';
  targetUserId?: string;
  authorName?: string;
  metadata?: NotificationMetadata;
}

export interface NotificationReadRecord {
  userId: string;
  notificationId: string;
  classId: string;
  isRead: boolean;
  readAt: string;
  createdAt?: string;
}

export interface AppState {
  school: SchoolInfo;
  classes: ClassInfo[];
  currentClassId: string;
  // Dynamic collections filtered for current class or global:
  classInfo: ClassInfo;
  teams: Team[];
  students: Student[];
  starTransactions: StarTransaction[];
  badges: Badge[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  attendance: Record<string, AttendanceRecord>;
  seatingChart: SeatingChart;
  news: ClassNewsItem[];
  learningResources: LearningResource[];
  levelRules: LevelRule[];
  backups?: BackupRecord[];
  menuCustomization?: Record<string, MenuItemCustomization>;
  audioSettings?: AudioSettings;
  kingdomAvatarUrl?: string;
  sidebarMascotUrl?: string;
  academicConfig?: AcademicCalendarConfig;
  finalizedResults?: FinalizedResult[];
  auditLogs?: AuditLogEntry[];
  notifications?: AppNotification[];
  notificationReads?: NotificationReadRecord[];
}



