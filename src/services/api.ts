import { AppState, Student, StarTransaction, Team, ClassInfo, SchoolInfo, AttendanceRecord, SeatingChart, Reward, RewardRedemption, LearningResource, BackupRecord, AcademicCalendarConfig, FinalizedResult, AuditLogEntry, ClassNewsItem, AppNotification } from '../types';

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('starkingdom_auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getStoredAuthToken();
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, {
    ...init,
    headers,
  });
}

export const api = {
  async teacherLogin(payload: {
    email: string;
    password?: string;
    firebaseUid?: string;
    displayName?: string;
    isGoogleAuth?: boolean;
  }): Promise<{ token: string; user: { id: string; email: string; name: string; role: 'teacher' } }> {
    const res = await fetch('/api/auth/teacher-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Teacher login failed');
    return json;
  },

  async guestLogin(): Promise<{ token: string; user: { role: 'guest'; userId: string; name: string } }> {
    const res = await fetch('/api/auth/guest-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Guest login failed');
    return json;
  },

  async getState(): Promise<AppState> {
    const res = await authFetch('/api/state');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch state');
    return json.data;
  },

  async switchClass(classId: string): Promise<AppState> {
    const res = await authFetch('/api/classes/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to switch class');
    return json.data;
  },

  async createClass(payload: any): Promise<{ newClass: ClassInfo; data: AppState }> {
    const res = await authFetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create class');
    return json;
  },

  async updateSettings(settings: {
    school?: Partial<SchoolInfo>;
    classInfo?: Partial<ClassInfo>;
    kingdomAvatarUrl?: string;
    sidebarMascotUrl?: string;
  }): Promise<void> {
    const res = await authFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update settings');
  },

  async updateKingdomAvatar(avatarUrl: string): Promise<string> {
    const res = await authFetch('/api/kingdom-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarUrl }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update kingdom avatar');
    return json.kingdomAvatarUrl;
  },

  async updateSidebarMascot(mascotUrl: string): Promise<string> {
    const res = await authFetch('/api/sidebar-mascot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mascotUrl }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update sidebar mascot');
    return json.sidebarMascotUrl;
  },

  async updateSchoolLogo(logoUrl: string): Promise<string> {
    const res = await authFetch('/api/school-logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logoUrl }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update school logo');
    return json.logoUrl;
  },

  async resetDemo(mode: 'demo28' | 'empty'): Promise<AppState> {
    const res = await authFetch('/api/class/reset-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to reset demo');
    return json.data;
  },

  async addStudent(student: Partial<Student>): Promise<Student> {
    const res = await authFetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to add student');
    return json.student;
  },

  async importStudents(studentsList: Partial<Student>[], clearExisting = false, classId?: string): Promise<Student[]> {
    const res = await authFetch('/api/students/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentsList, clearExisting, classId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to import students');
    return json.students;
  },

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const res = await authFetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update student');
    return json.student;
  },

  async deleteStudent(id: string): Promise<string> {
    const res = await authFetch(`/api/students/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete student');
    return json.deletedId;
  },

  async giveStars(payload: {
    studentId: string;
    deltaStars: number;
    reasonCategory: string;
    reasonNote: string;
    createdBy?: string;
  }): Promise<{ student: Student; transaction: StarTransaction; teams: Team[] }> {
    const res = await authFetch('/api/stars/give', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to award stars');
    return json;
  },

  async batchGiveStars(payload: {
    studentIds: string[];
    deltaStars: number;
    reasonCategory: string;
    reasonNote: string;
    createdBy?: string;
  }): Promise<{ count: number; students: Student[]; transactions: StarTransaction[]; teams: Team[] }> {
    const res = await authFetch('/api/stars/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to batch award stars');
    return json;
  },

  async addTeamPoints(teamId: string, deltaPoints: number, reason: string): Promise<{ team: Team; teams: Team[] }> {
    const res = await authFetch(`/api/teams/${teamId}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deltaPoints, reason }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to award team points');
    return json;
  },

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    const res = await authFetch(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update team');
    return json.team;
  },

  async resetTeamPoints(payload?: {
    teamId?: string;
    classId?: string;
    actor?: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string; teams: Team[]; auditLog: any; teamsSnapshot: any[] }> {
    const res = await authFetch('/api/teams/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi đặt lại điểm tổ');
    return json;
  },

  async undoResetTeamPoints(payload?: {
    auditLogId?: string;
    classId?: string;
  }): Promise<{ success: boolean; message: string; teams: Team[]; restoredTeams: any[]; auditLog: any }> {
    const res = await authFetch('/api/teams/undo-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi hoàn tác đặt lại điểm tổ');
    return json;
  },

  async saveAttendance(date: string, records: Record<string, string>, note?: string, classId?: string): Promise<AttendanceRecord> {
    const res = await authFetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, records, note, classId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to save attendance');
    return json.attendance;
  },

  async saveSeatingChart(chart: Partial<SeatingChart>): Promise<SeatingChart> {
    const res = await authFetch('/api/seating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chart),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to save seating');
    return json.seatingChart;
  },

  async redeemReward(rewardId: string, studentId: string): Promise<{ redemption: RewardRedemption; student: Student; reward: Reward }> {
    const res = await authFetch('/api/rewards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId, studentId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to redeem reward');
    return json;
  },

  async addReward(reward: Partial<Reward>): Promise<Reward> {
    const res = await authFetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reward),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to add reward');
    return json.reward;
  },

  async updateReward(id: string, updates: Partial<Reward>): Promise<Reward> {
    const res = await authFetch(`/api/rewards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update reward');
    return json.reward;
  },

  async deleteReward(id: string): Promise<void> {
    const res = await authFetch(`/api/rewards/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to archive reward');
  },

  async saveMenuCustomization(menuCustomization: Record<string, any>): Promise<void> {
    const res = await authFetch('/api/menu-customization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuCustomization }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to save menu customization');
  },

  async postNews(item: Partial<ClassNewsItem>): Promise<ClassNewsItem> {
    const res = await authFetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to post news');
    return json.newsItem;
  },

  async updateNews(id: string, updates: Partial<ClassNewsItem>): Promise<ClassNewsItem> {
    const res = await authFetch(`/api/news/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update news');
    return json.newsItem;
  },

  async togglePinNews(id: string): Promise<ClassNewsItem> {
    const res = await authFetch(`/api/news/${id}/pin`, {
      method: 'PATCH',
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to toggle pin');
    return json.newsItem;
  },

  async deleteNews(id: string, permanent: boolean = false, deletedBy?: string): Promise<string> {
    const url = `/api/news/${id}${permanent ? '?permanent=true' : ''}`;
    const res = await authFetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletedBy }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete news');
    return id;
  },

  async restoreNews(id: string): Promise<ClassNewsItem> {
    const res = await authFetch(`/api/news/${id}/restore`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to restore news');
    return json.newsItem;
  },

  async addResource(resource: Partial<LearningResource>): Promise<LearningResource> {
    const res = await authFetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to add resource');
    return json.resource;
  },

  async deleteResource(id: string): Promise<string> {
    const res = await authFetch(`/api/resources/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete resource');
    return json.deletedId;
  },

  async createBackup(type: 'class' | 'all', name?: string): Promise<BackupRecord> {
    const res = await authFetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, name }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create backup');
    return json.backup;
  },

  async restoreBackup(backupData: unknown): Promise<AppState> {
    const res = await authFetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupData }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to restore backup');
    return json.data;
  },

  async studentLogin(studentCode: string, passcode: string): Promise<{ student: Student; token?: string }> {
    const res = await fetch('/api/auth/student-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCode, passcode }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Student login failed');
    return { student: json.student, token: json.token };
  },

  async updateClass(id: string, updates: Partial<ClassInfo>): Promise<ClassInfo> {
    const res = await authFetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update class');
    return json.classInfo;
  },

  async archiveClass(classId: string): Promise<void> {
    const res = await authFetch('/api/classes/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to archive class');
  },

  async restoreClass(classId: string): Promise<void> {
    const res = await authFetch('/api/classes/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to restore class');
  },

  async deleteClass(id: string, confirmClassName?: string, permanent = false): Promise<void> {
    const res = await authFetch(`/api/classes/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmClassName, permanent }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete class');
  },

  async transitionClass(payload: {
    sourceClassId: string;
    newNameVi: string;
    newNameEn?: string;
    newGrade: number;
    newSchoolYear: string;
    studentIdsToPromote?: string[];
    carryOverStars?: boolean;
  }): Promise<{ newClass: ClassInfo; data: AppState }> {
    const res = await authFetch('/api/classes/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to transition class');
    return json;
  },

  async getAcademicConfig(): Promise<AcademicCalendarConfig> {
    const res = await authFetch('/api/time-config');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch academic config');
    return json.academicConfig;
  },

  async updateAcademicConfig(academicConfig: Partial<AcademicCalendarConfig>): Promise<AcademicCalendarConfig> {
    const res = await authFetch('/api/time-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ academicConfig }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update academic config');
    return json.academicConfig;
  },

  async getFinalizedResults(): Promise<FinalizedResult[]> {
    const res = await authFetch('/api/finalize-results');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch finalized results');
    return json.finalizedResults;
  },

  async finalizeResults(payload: {
    period: string;
    periodLabel: string;
    notes?: string;
    studentRankings: any[];
    teamRankings: any[];
  }): Promise<FinalizedResult> {
    const res = await authFetch('/api/finalize-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to finalize results');
    return json.finalizedResult;
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await authFetch('/api/audit-logs');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch audit logs');
    return json.auditLogs;
  },

  async undoAuditLog(auditLogId: string): Promise<AppState> {
    const res = await authFetch('/api/audit-logs/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditLogId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to undo action');
    return json.data;
  },

  async getDataHealth(): Promise<{
    healthScore: number;
    totalStudents: number;
    totalTeams: number;
    issues: Array<{ type: 'warning' | 'error' | 'info'; title: string; message: string; count: number; autoFixable: boolean; fixAction?: string }>;
  }> {
    const res = await authFetch('/api/data-health');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch data health');
    return json;
  },

  async getNotifications(classId?: string, userId?: string): Promise<{
    notifications: (AppNotification & { isRead: boolean; readAt: string | null })[];
    unreadCount: number;
    classId: string;
    userId: string;
  }> {
    const params = new URLSearchParams();
    if (classId) params.append('classId', classId);
    if (userId) params.append('userId', userId);
    const res = await authFetch(`/api/notifications?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch notifications');
    return json;
  },

  async markNotificationAsRead(notificationId: string, userId: string, classId?: string): Promise<{
    isRead: boolean;
    readAt: string;
    unreadCount: number;
  }> {
    const res = await authFetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, userId, classId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to mark notification as read');
    return json;
  },

  async markAllNotificationsAsRead(userId: string, classId?: string): Promise<{ unreadCount: number }> {
    const res = await authFetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, classId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to mark all notifications as read');
    return json;
  },

  async createNotification(notif: Partial<AppNotification>): Promise<AppNotification> {
    const res = await authFetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create notification');
    return json.notification;
  },

  async syncBirthdayNews(classId?: string): Promise<{ success: boolean; message: string; news: ClassNewsItem[]; data: AppState }> {
    const res = await authFetch('/api/news/sync-birthdays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi cập nhật bản tin sinh nhật');
    return json;
  },

  async giftBirthdayStars(month?: number, classId?: string): Promise<{ success: boolean; message: string; data: AppState }> {
    const res = await authFetch('/api/students/gift-birthday-stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, classId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi tặng sao sinh nhật');
    return json;
  },
};

