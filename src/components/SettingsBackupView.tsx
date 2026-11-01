import React, { useState, useEffect } from 'react';
import { SchoolInfo, ClassInfo, LevelRule, Student, Team, MenuItemCustomization, AppState, AcademicCalendarConfig, AuditLogEntry } from '../types';
import { api } from '../services/api';
import { audioManager } from '../utils/audioManager';
import { offlineSync } from '../services/offlineSync';
import { uploader } from '../services/uploader';
import { durableStorage, DurableBackupRecord } from '../services/durableStorage';
import { playStarSound, triggerGrandCelebration, stopCelebration } from '../utils/effects';
import { navItems, settingsItem, NavTab } from './Sidebar';
import { MenuIcon } from './MenuIcon';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Save,
  Check,
  AlertCircle,
  School,
  Sparkles,
  Layers,
  Award,
  Database,
  Volume2,
  VolumeX,
  Palette,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sliders,
  Camera,
  Calendar,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Archive,
} from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';
import { DeleteClassModal } from './DeleteClassModal';
import {
  DEFAULT_ACADEMIC_CONFIG,
  getAvailableSchoolWeeks,
  getAcademicWeekInfo,
  getAcademicMonthsForConfig,
  getCurrentAcademicMonthKey,
} from '../utils/timePeriodService';

interface SettingsBackupViewProps {
  school: SchoolInfo;
  classInfo: ClassInfo;
  classes: ClassInfo[];
  levelRules: LevelRule[];
  students: Student[];
  teams: Team[];
  menuCustomization?: Record<string, MenuItemCustomization>;
  kingdomAvatarUrl?: string;
  sidebarMascotUrl?: string;
  fullState?: AppState;
  academicConfig?: AcademicCalendarConfig;
  onUpdateAcademicConfig?: (cfg: Partial<AcademicCalendarConfig>) => Promise<void>;
  auditLogs?: AuditLogEntry[];
  onUndoAuditLog?: (logId: string) => Promise<void>;
  onSaveSettings: (settings: { school?: Partial<SchoolInfo>; classInfo?: Partial<ClassInfo> }) => Promise<void>;
  onUpdateKingdomAvatar?: (avatarUrl: string) => Promise<void>;
  onUpdateSidebarMascot?: (mascotUrl: string) => Promise<void>;
  onUpdateSchoolLogo?: (logoUrl: string) => Promise<void>;
  onSaveMenuCustomization?: (customization: Record<string, MenuItemCustomization>) => Promise<void>;
  onSwitchClass: (classId: string) => void;
  onCreateClass: () => void;
  onDeleteClass?: (classId: string, confirmName?: string, permanent?: boolean) => Promise<void>;
  onArchiveClass?: (classId: string) => Promise<void>;
  onRestoreClass?: (classId: string) => Promise<void>;
  onResetDemo: (mode: 'demo28' | 'empty') => Promise<void>;
  onRefreshState: () => Promise<void>;
}

export const SettingsBackupView: React.FC<SettingsBackupViewProps> = ({
  school,
  classInfo,
  classes,
  levelRules,
  students,
  teams,
  menuCustomization = {},
  kingdomAvatarUrl,
  sidebarMascotUrl,
  fullState,
  academicConfig = DEFAULT_ACADEMIC_CONFIG,
  onUpdateAcademicConfig,
  auditLogs = [],
  onUndoAuditLog,
  onSaveSettings,
  onUpdateKingdomAvatar,
  onUpdateSidebarMascot,
  onUpdateSchoolLogo,
  onSaveMenuCustomization,
  onSwitchClass,
  onCreateClass,
  onDeleteClass,
  onArchiveClass,
  onRestoreClass,
  onResetDemo,
  onRefreshState,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'classes' | 'academic' | 'health' | 'audio' | 'customize' | 'offline' | 'backup'>('general');
  const [isCropSchoolLogoOpen, setIsCropSchoolLogoOpen] = useState(false);
  const [isCropKingdomAvatarOpen, setIsCropKingdomAvatarOpen] = useState(false);
  const [isCropMascotOpen, setIsCropMascotOpen] = useState(false);

  // Class Management States
  const [classToDelete, setClassToDelete] = useState<ClassInfo | null>(null);
  const [showArchivedClasses, setShowArchivedClasses] = useState(false);

  // Form states - Academic Calendar
  const [cfgSchoolYear, setCfgSchoolYear] = useState(academicConfig.schoolYear || '2026 - 2027');
  const [cfgStartDate, setCfgStartDate] = useState(academicConfig.week1StartDate || academicConfig.startDate || '2026-09-07');
  const [cfgTotalWeeks, setCfgTotalWeeks] = useState<number>(academicConfig.totalWeeks || 36);
  const [cfgEndDate, setCfgEndDate] = useState(academicConfig.endDate || '2027-05-31');
  const [cfgSem1Start, setCfgSem1Start] = useState(academicConfig.semester1Start || '2026-09-07');
  const [cfgSem1End, setCfgSem1End] = useState(academicConfig.semester1End || '2027-01-15');
  const [cfgSem2Start, setCfgSem2Start] = useState(academicConfig.semester2Start || '2027-01-16');
  const [cfgSem2End, setCfgSem2End] = useState(academicConfig.semester2End || '2027-05-31');
  const [cfgHolidayWeeksStr, setCfgHolidayWeeksStr] = useState((academicConfig.holidayWeeks || []).join(', '));
  const [cfgScheduleNotes, setCfgScheduleNotes] = useState(
    academicConfig.scheduleNotes ||
      'Lịch chuẩn 36 tuần năm học 2026–2027 (Tuần 1: 07/09/2026 – 13/09/2026, Tuần 36: 10/05/2027 – 16/05/2027)'
  );
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [academicSavedSuccess, setAcademicSavedSuccess] = useState(false);
  const [academicError, setAcademicError] = useState<string | null>(null);

  // School Logo dedicated states
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string>(
    school.logoUrl || '/assets/kingdom/school_logo_v2.png'
  );
  const [savingSchoolLogo, setSavingSchoolLogo] = useState(false);
  const [schoolLogoFeedback, setSchoolLogoFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    setPendingLogoUrl(school.logoUrl || '/assets/kingdom/school_logo_v2.png');
  }, [school.logoUrl]);

  // Data Health states
  const [dataHealth, setDataHealth] = useState<{
    healthScore: number;
    totalStudents: number;
    totalTeams: number;
    issues: Array<{ type: 'warning' | 'error' | 'info'; title: string; message: string; count: number; autoFixable: boolean; fixAction?: string }>;
  } | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [fixingAction, setFixingAction] = useState<string | null>(null);

  // Audit Logs state
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>(auditLogs);
  const [undoingLogId, setUndoingLogId] = useState<string | null>(null);

  // Form states - General
  const [schoolNameVi, setSchoolNameVi] = useState(school.nameVi);
  const [schoolNameEn, setSchoolNameEn] = useState(school.nameEn);
  const [classNameVi, setClassNameVi] = useState(classInfo.nameVi);
  const [classNameEn, setClassNameEn] = useState(classInfo.nameEn);
  const [schoolYear, setSchoolYear] = useState(classInfo.schoolYear);
  const [teacherName, setTeacherName] = useState(classInfo.teacherName);
  const [teacherTitleEn, setTeacherTitleEn] = useState(classInfo.teacherTitleEn);
  const [sloganVi, setSloganVi] = useState(classInfo.sloganVi);
  const [sloganEn, setSloganEn] = useState(classInfo.sloganEn);
  const [coverUrl, setCoverUrl] = useState(classInfo.coverUrl || '');
  const [targetSize, setTargetSize] = useState(classInfo.targetSize || 28);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Audio settings state
  const [audioSettings, setAudioSettings] = useState(audioManager.getSettings());

  // Menu customization state (local copy for editing)
  const allNavList = [...navItems, settingsItem];
  const [localCustomMenus, setLocalCustomMenus] = useState<Record<string, MenuItemCustomization>>(() => {
    const initial: Record<string, MenuItemCustomization> = {};
    allNavList.forEach((item) => {
      if (menuCustomization[item.id]) {
        initial[item.id] = { ...menuCustomization[item.id] };
      } else {
        initial[item.id] = {
          id: item.id,
          titleVi: item.titleVi,
          titleEn: item.titleEn,
        };
      }
    });
    return initial;
  });
  const [selectedEditMenuId, setSelectedEditMenuId] = useState<string>('home');
  const [menuSaveSuccess, setMenuSaveSuccess] = useState(false);

  // Offline sync state
  const [isOnline, setIsOnline] = useState(offlineSync.isOnline());
  const [offlineQueue, setOfflineQueue] = useState(offlineSync.getQueue());
  const [isCaching, setIsCaching] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Backup states
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    type?: string;
    classCount?: number;
    studentCount?: number;
    teamCount?: number;
    timestamp?: string;
    raw?: any;
  } | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // Local Snapshots & Server Health
  const [localSnapshots, setLocalSnapshots] = useState<DurableBackupRecord[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loadingServerHealth, setLoadingServerHealth] = useState(false);

  const fetchSystemHealth = async () => {
    try {
      setLoadingServerHealth(true);
      const health = await api.getSystemHealth();
      setSystemHealth(health);
    } catch (e) {
      console.debug('Failed to fetch system health:', e);
    } finally {
      setLoadingServerHealth(false);
    }
  };

  const loadLocalSnapshots = async () => {
    try {
      const list = await durableStorage.listLocalSnapshots();
      setLocalSnapshots(list);
    } catch (e) {
      console.debug('Failed to load local snapshots:', e);
    }
  };

  const handleCreateLocalSnapshot = async () => {
    try {
      setBackupLoading(true);
      const stateToSave = fullState || (await api.getState());
      const label = `Bản chụp Lớp ${classInfo.nameVi} (${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')})`;
      await durableStorage.createLocalSnapshot(stateToSave, label);
      await loadLocalSnapshots();
      playStarSound('star');
      alert('Đã lưu bản chụp an toàn vào bộ nhớ bền vững IndexedDB của trình duyệt!');
    } catch (e) {
      alert('Lỗi khi tạo bản chụp!');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreLocalSnapshot = async (snap: DurableBackupRecord) => {
    if (!window.confirm(`Khôi phục toàn bộ dữ liệu từ bản chụp "${snap.label}"?`)) return;
    try {
      setBackupLoading(true);
      await api.hydrateServerFromClient(snap.state);
      await durableStorage.saveState(snap.state);
      await onRefreshState();
      playStarSound('win');
      alert('Đã khôi phục dữ liệu từ bản chụp thành công!');
    } catch (e) {
      alert('Lỗi khi khôi phục bản chụp!');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDeleteLocalSnapshot = async (id: string) => {
    if (!window.confirm('Xóa bản chụp này khỏi trình duyệt?')) return;
    await durableStorage.deleteLocalSnapshot(id);
    await loadLocalSnapshots();
  };

  // Subscribe to audio and offline changes
  useEffect(() => {
    const unsubAudio = audioManager.subscribe((newSettings) => setAudioSettings(newSettings));
    const unsubOffline = offlineSync.subscribe(() => {
      setIsOnline(offlineSync.isOnline());
      setOfflineQueue(offlineSync.getQueue());
    });
    return () => {
      unsubAudio();
      unsubOffline();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'backup' || activeTab === 'health') {
      fetchSystemHealth();
      loadLocalSnapshots();
    }
  }, [activeTab]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings({
        school: { nameVi: schoolNameVi, nameEn: schoolNameEn },
        classInfo: {
          nameVi: classNameVi,
          nameEn: classNameEn,
          schoolYear,
          teacherName,
          teacherTitleEn,
          sloganVi,
          sloganEn,
          coverUrl,
          targetSize,
        },
      });
      setSaveSuccess(true);
      playStarSound('star');
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu cài đặt!');
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploader.uploadFile(file, { compressImage: true, maxDimension: 1920, quality: 0.88 });
      if (res.success && res.url) {
        setCoverUrl(res.url);
        return;
      }
    } catch (err) {
      console.debug('Direct stream upload of cover failed, using fallback:', err);
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setCoverUrl(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Audio toggles
  const handleToggleAudioSetting = (key: keyof typeof audioSettings) => {
    const updated = { ...audioSettings, [key]: !audioSettings[key] };
    setAudioSettings(updated);
    audioManager.updateSettings({ [key]: updated[key] });
    if (key === 'clickSound' && updated.clickSound) {
      audioManager.playClick(true);
    }
  };

  const handleVolumeChange = (vol: number) => {
    const updated = { ...audioSettings, volume: vol };
    setAudioSettings(updated);
    audioManager.updateSettings({ volume: vol });
  };

  // Menu customization handlers
  const handleMenuFieldChange = (field: 'titleVi' | 'titleEn' | 'presetIcon', value: string) => {
    setLocalCustomMenus((prev) => ({
      ...prev,
      [selectedEditMenuId]: {
        ...(prev[selectedEditMenuId] || { id: selectedEditMenuId, titleVi: '', titleEn: '' }),
        [field]: value,
      },
    }));
  };

  const handleMenuIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setLocalCustomMenus((prev) => ({
          ...prev,
          [selectedEditMenuId]: {
            ...(prev[selectedEditMenuId] || { id: selectedEditMenuId, titleVi: '', titleEn: '' }),
            iconUrl: evt.target?.result as string,
            presetIcon: undefined,
          },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMenuCustomization = async () => {
    setSaving(true);
    try {
      if (onSaveMenuCustomization) {
        await onSaveMenuCustomization(localCustomMenus);
      } else {
        await api.saveMenuCustomization(localCustomMenus);
        await onRefreshState();
      }
      playStarSound('star');
      setMenuSaveSuccess(true);
      setTimeout(() => setMenuSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
      alert('Lỗi khi lưu tùy chỉnh menu');
    } finally {
      setSaving(false);
    }
  };

  const handleResetMenuToDefault = async () => {
    if (!window.confirm('Khôi phục toàn bộ tên và biểu tượng 9 menu về giao diện Star Kingdom chuẩn ban đầu?')) {
      return;
    }
    const clean: Record<string, MenuItemCustomization> = {};
    allNavList.forEach((item) => {
      clean[item.id] = { id: item.id, titleVi: item.titleVi, titleEn: item.titleEn };
    });
    setLocalCustomMenus(clean);
    if (onSaveMenuCustomization) {
      await onSaveMenuCustomization({});
    } else {
      await api.saveMenuCustomization({});
      await onRefreshState();
    }
    playStarSound('click');
    setMenuSaveSuccess(true);
    setTimeout(() => setMenuSaveSuccess(false), 2000);
  };

  // Offline handlers
  const handlePrecacheOffline = () => {
    setIsCaching(true);
    if (fullState) {
      offlineSync.cacheClassState(fullState);
      setCacheMessage(`Đã sao lưu đệm toàn bộ lớp ${classInfo.nameVi} và 4 tổ vào bộ nhớ máy thành công!`);
    } else {
      setCacheMessage('Đã ghi nhớ thông tin lớp học vào bộ nhớ thiết bị.');
    }
    setIsCaching(false);
    playStarSound('star');
    setTimeout(() => setCacheMessage(null), 4000);
  };

  const handleSyncOfflineQueue = async () => {
    setSyncingOffline(true);
    try {
      const res = await offlineSync.syncPending();
      await onRefreshState();
      playStarSound('win');
      alert(`Đã hoàn tất đồng bộ! Thành công: ${res.syncedCount}, Lỗi: ${res.errorsCount}`);
    } catch (e) {
      console.error(e);
      alert('Lỗi khi đồng bộ dữ liệu ngoại tuyến');
    } finally {
      setSyncingOffline(false);
    }
  };

  // Backup handlers
  const handleDownloadBackup = async (type: 'class' | 'all') => {
    try {
      setBackupLoading(true);
      const backup = await api.createBackup(type, classInfo.id);
      const blob = new Blob([JSON.stringify(backup.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `star_kingdom_${type}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playStarSound('click');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tải file sao lưu!');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.classes && Array.isArray(parsed.classes)) {
          setRestorePreview({
            type: 'Toàn bộ Vương quốc (All Classes)',
            classCount: parsed.classes.length,
            studentCount: parsed.students ? parsed.students.length : 0,
            teamCount: parsed.teams ? parsed.teams.length : 0,
            timestamp: new Date().toLocaleString('vi-VN'),
            raw: parsed,
          });
        } else if (parsed.classInfo || parsed.students) {
          setRestorePreview({
            type: `Lớp học đơn: ${parsed.classInfo?.nameVi || 'Không rõ'}`,
            classCount: 1,
            studentCount: parsed.students ? parsed.students.length : 0,
            teamCount: parsed.teams ? parsed.teams.length : 0,
            timestamp: new Date().toLocaleString('vi-VN'),
            raw: parsed,
          });
        } else {
          setRestoreMessage('Định dạng file JSON không khớp với cấu trúc Ms. Thao\'s Star Kingdom!');
          setRestorePreview(null);
        }
      } catch (err) {
        setRestoreMessage('File JSON không hợp lệ hoặc bị lỗi cú pháp!');
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restorePreview || !restorePreview.raw) return;
    if (!window.confirm('CẢNH BÁO: Dữ liệu hiện tại sẽ được thay thế bằng dữ liệu từ file sao lưu. Bạn có chắc chắn muốn phục hồi không?')) {
      return;
    }

    try {
      setBackupLoading(true);
      if (restorePreview.raw._isCompleteExport || (restorePreview.raw.classes && restorePreview.raw.students)) {
        await api.importCompleteBackup(restorePreview.raw);
      } else {
        await api.restoreBackup(restorePreview.raw);
      }
      // Also write directly to Durable IndexedDB
      try {
        await durableStorage.saveState(restorePreview.raw);
      } catch (dErr) {
        console.debug('Failed to write restored state to durable storage:', dErr);
      }
      playStarSound('win');
      alert('Phục hồi dữ liệu thành công!');
      setRestorePreview(null);
      setRestoreFile(null);
      await onRefreshState();
      await loadLocalSnapshots();
    } catch (err) {
      console.error(err);
      alert('Lỗi trong quá trình phục hồi dữ liệu!');
    } finally {
      setBackupLoading(false);
    }
  };

  // Cute emoji icon presets for menu customization
  const presetEmojis = ['🏰', '📢', '🚩', '🎒', '🎁', '🏆', '🧰', '📚', '⚙️', '⭐', '👑', '🌈', '🎨', '🚀', '🌟', '📖', '🎯'];

  // Academic Calendar Save
  const handleSaveAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcademicError(null);

    if (!cfgSchoolYear.trim()) {
      setAcademicError('Tên năm học không được để trống.');
      return;
    }
    if (cfgTotalWeeks < 1 || cfgTotalWeeks > 52) {
      setAcademicError('Tổng số tuần năm học phải nằm trong khoảng từ 1 đến 52 tuần.');
      return;
    }
    if (cfgStartDate > cfgEndDate) {
      setAcademicError('Ngày bắt đầu Tuần 1 phải nhỏ hơn hoặc bằng ngày kết thúc năm học.');
      return;
    }
    if (cfgSem1Start > cfgSem1End) {
      setAcademicError('Ngày bắt đầu Học kỳ I phải nhỏ hơn hoặc bằng ngày kết thúc Học kỳ I.');
      return;
    }
    if (cfgSem2Start > cfgSem2End) {
      setAcademicError('Ngày bắt đầu Học kỳ II phải nhỏ hơn hoặc bằng ngày kết thúc Học kỳ II.');
      return;
    }

    const oldStart = academicConfig.week1StartDate || academicConfig.startDate || '2026-09-07';
    const oldWeeks = academicConfig.totalWeeks || 36;
    if (cfgStartDate !== oldStart || cfgTotalWeeks !== oldWeeks) {
      const ok = window.confirm(
        `Xác nhận thay đổi mốc lịch năm học?\n• Ngày bắt đầu Tuần 1: ${oldStart} → ${cfgStartDate}\n• Tổng số tuần: ${oldWeeks} → ${cfgTotalWeeks} tuần\n\nLưu ý: Lịch sử giao dịch sao vẫn được bảo toàn nguyên vẹn theo ngày thực tế.`
      );
      if (!ok) return;
    }

    const parsedHolidays = cfgHolidayWeeksStr
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= cfgTotalWeeks);

    setSavingAcademic(true);
    try {
      const payload: Partial<AcademicCalendarConfig> = {
        schoolYear: cfgSchoolYear.trim(),
        startDate: cfgStartDate,
        week1StartDate: cfgStartDate,
        totalWeeks: cfgTotalWeeks,
        endDate: cfgEndDate,
        semester1Start: cfgSem1Start,
        semester1End: cfgSem1End,
        semester2Start: cfgSem2Start,
        semester2End: cfgSem2End,
        holidayWeeks: parsedHolidays,
        scheduleNotes: cfgScheduleNotes.trim(),
      };
      if (onUpdateAcademicConfig) {
        await onUpdateAcademicConfig(payload);
      } else {
        await api.updateAcademicConfig(payload);
      }
      playStarSound('star');
      setAcademicSavedSuccess(true);
      setTimeout(() => setAcademicSavedSuccess(false), 3000);
    } catch (err: unknown) {
      setAcademicError(err instanceof Error ? err.message : 'Lỗi khi lưu cấu hình năm học');
    } finally {
      setSavingAcademic(false);
    }
  };

  // School Logo Save & Restore Handlers
  const handleSaveSchoolLogoAction = async (urlToSave?: string) => {
    const targetUrl = urlToSave ?? pendingLogoUrl;
    setSavingSchoolLogo(true);
    setSchoolLogoFeedback(null);
    try {
      if (onUpdateSchoolLogo) {
        await onUpdateSchoolLogo(targetUrl);
      } else {
        await api.updateSchoolLogo(targetUrl);
        await onRefreshState();
      }
      setPendingLogoUrl(targetUrl);
      playStarSound('star');
      setSchoolLogoFeedback({
        type: 'success',
        message: 'Đã lưu thay đổi Logo trường và đồng bộ toàn hệ thống (Trang đăng nhập, Header, Thẻ QR, Bằng khen)!',
      });
      setTimeout(() => setSchoolLogoFeedback(null), 4500);
    } catch (err: unknown) {
      setSchoolLogoFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi khi lưu logo trường học. Vui lòng kiểm tra định dạng ảnh.',
      });
    } finally {
      setSavingSchoolLogo(false);
    }
  };

  const handleRestoreDefaultSchoolLogo = async () => {
    const defaultLogo = '/assets/kingdom/school_logo_v2.png';
    setSavingSchoolLogo(true);
    setSchoolLogoFeedback(null);
    try {
      if (onUpdateSchoolLogo) {
        await onUpdateSchoolLogo(defaultLogo);
      } else {
        await api.updateSchoolLogo(defaultLogo);
        await onRefreshState();
      }
      setPendingLogoUrl(defaultLogo);
      playStarSound('click');
      setSchoolLogoFeedback({
        type: 'success',
        message: 'Đã khôi phục Logo trường học mặc định thành công!',
      });
      setTimeout(() => setSchoolLogoFeedback(null), 4000);
    } catch (err: unknown) {
      setSchoolLogoFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi khi khôi phục logo mặc định.',
      });
    } finally {
      setSavingSchoolLogo(false);
    }
  };

  // Fetch Data Health
  const handleRunHealthCheck = async () => {
    setLoadingHealth(true);
    try {
      const health = await api.getDataHealth();
      setDataHealth(health);
      const logs = await api.getAuditLogs();
      setRecentLogs(logs);
      playStarSound('star');
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingHealth(false);
    }
  };

  // Quick fix actions for data integrity
  const handleExecuteQuickFix = async (action: string) => {
    setFixingAction(action);
    try {
      if (action === 'assign_teams') {
        const unassigned = students.filter((s) => !s.teamId);
        for (let i = 0; i < unassigned.length; i++) {
          const team = teams[i % teams.length];
          if (team) {
            await api.updateStudent(unassigned[i].id, { teamId: team.id });
          }
        }
        await onRefreshState();
        playStarSound('win');
      } else if (action === 'fill_avatars') {
        const noAvatar = students.filter((s) => !s.avatarUrl);
        const defaultAvatars = [
          'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=150',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        ];
        for (let i = 0; i < noAvatar.length; i++) {
          await api.updateStudent(noAvatar[i].id, { avatarUrl: defaultAvatars[i % defaultAvatars.length] });
        }
        await onRefreshState();
        playStarSound('win');
      }
      await handleRunHealthCheck();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi sửa dữ liệu');
    } finally {
      setFixingAction(null);
    }
  };

  // Undo Audit Log entry
  const handleUndoAuditEntry = async (logId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hoàn tác hành động này? Dữ liệu sẽ được phục hồi về trước thời điểm đó.')) return;
    setUndoingLogId(logId);
    try {
      if (onUndoAuditLog) {
        await onUndoAuditLog(logId);
      } else {
        await api.undoAuditLog(logId);
        await onRefreshState();
      }
      playStarSound('star');
      const logs = await api.getAuditLogs();
      setRecentLogs(logs);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi hoàn tác hành động');
    } finally {
      setUndoingLogId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-100 via-sky-50 to-blue-100 rounded-3xl p-5 border border-sky-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#47B5FF] text-white shadow-xs">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <h2
              className="typo-title-section text-[#263C72] font-['Nunito',sans-serif]"
              style={{ fontFamily: 'Nunito' }}
            >
              Cài Đặt & Sao Lưu
            </h2>
            <p className="text-[13px] font-bold text-sky-700 leading-tight mt-0.5">
              Settings & Backup • Quản lý vương quốc, năm học & học kỳ, kiểm tra dữ liệu, âm thanh, ngoại tuyến PWA và sao lưu
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-white/90 backdrop-blur-xs p-1.5 rounded-2xl border border-sky-200 font-black">
          <button
            onClick={() => { playStarSound('click'); setActiveTab('general'); }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-left ${
              activeTab === 'general' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            <School className="w-4 h-4 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px]">Thông tin lớp</span>
              <span className={`text-[10.5px] font-bold ${activeTab === 'general' ? 'text-sky-100' : 'text-slate-500'}`}>General</span>
            </span>
          </button>
          <button
            onClick={() => { playStarSound('click'); setActiveTab('classes'); }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-left ${
              activeTab === 'classes' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px]">Đa lớp ({classes.length})</span>
              <span className={`text-[10.5px] font-bold ${activeTab === 'classes' ? 'text-sky-100' : 'text-slate-500'}`}>Classes</span>
            </span>
          </button>
          <button
            onClick={() => { playStarSound('click'); setActiveTab('academic'); }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-left ${
              activeTab === 'academic' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px]">Năm học & Học kỳ</span>
              <span className={`text-[10.5px] font-bold ${activeTab === 'academic' ? 'text-sky-100' : 'text-slate-500'}`}>Academic Year</span>
            </span>
          </button>
          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('health');
              if (!dataHealth) handleRunHealthCheck();
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-left ${
              activeTab === 'health' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px]">Kiểm tra dữ liệu</span>
              <span className={`text-[10.5px] font-bold ${activeTab === 'health' ? 'text-sky-100' : 'text-slate-500'}`}>Data Health</span>
            </span>
          </button>
          <button
            onClick={() => { playStarSound('click'); setActiveTab('audio'); }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-left ${
              activeTab === 'audio' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px]">Âm thanh & Hiệu ứng</span>
              <span className={`text-[10.5px] font-bold ${activeTab === 'audio' ? 'text-sky-100' : 'text-slate-500'}`}>Audio & Effects</span>
            </span>
          </button>
          <button
            onClick={() => { playStarSound('click'); setActiveTab('customize'); }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-left ${
              activeTab === 'customize' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            <Palette className="w-4 h-4 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px]">Cá nhân hóa menu</span>
              <span className={`text-[10.5px] font-bold ${activeTab === 'customize' ? 'text-sky-100' : 'text-slate-500'}`}>Customize Menu</span>
            </span>
          </button>
          <button
            onClick={() => { playStarSound('click'); setActiveTab('offline'); }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-left ${
              activeTab === 'offline' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            <Wifi className="w-4 h-4 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px]">Ngoại tuyến & PWA</span>
              <span className={`text-[10.5px] font-bold ${activeTab === 'offline' ? 'text-sky-100' : 'text-slate-500'}`}>Offline & PWA</span>
            </span>
          </button>
          <button
            onClick={() => { playStarSound('click'); setActiveTab('backup'); }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-left ${
              activeTab === 'backup' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-sky-600'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px]">Sao lưu & Khôi phục</span>
              <span className={`text-[10.5px] font-bold ${activeTab === 'backup' ? 'text-sky-100' : 'text-slate-500'}`}>Backup & Restore</span>
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: GENERAL INFO */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-[15.5px] font-black text-[#263C72] flex items-center gap-2">
              <School className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="flex flex-col leading-tight">
                <span>Thông tin trường học & Lớp {classInfo.nameVi}</span>
                <span className="text-[12px] font-bold text-slate-500">School & Class General Information</span>
              </span>
            </h3>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-fade-in">
                <Check className="w-3.5 h-3.5" /> Đã lưu thành công! / Saved!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Tên trường (tiếng Việt)</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">School Name (Vietnamese)</span>
              </label>
              <input
                type="text"
                value={schoolNameVi}
                onChange={(e) => setSchoolNameVi(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Tên trường (English)</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">School Name (English)</span>
              </label>
              <input
                type="text"
                value={schoolNameEn}
                onChange={(e) => setSchoolNameEn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Tên lớp (tiếng Việt)</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">Class Name (Vietnamese)</span>
              </label>
              <input
                type="text"
                value={classNameVi}
                onChange={(e) => setClassNameVi(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Tên lớp (English)</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">Class Name (English)</span>
              </label>
              <input
                type="text"
                value={classNameEn}
                onChange={(e) => setClassNameEn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Năm học</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">School Year</span>
              </label>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Giáo viên chủ nhiệm</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">Homeroom Teacher</span>
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Chức danh giáo viên (En)</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">Teacher Title (English)</span>
              </label>
              <input
                type="text"
                value={teacherTitleEn}
                onChange={(e) => setTeacherTitleEn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Sĩ số mục tiêu</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">Target Class Size</span>
              </label>
              <input
                type="number"
                value={targetSize}
                onChange={(e) => setTargetSize(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Khẩu hiệu (tiếng Việt)</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">Class Slogan (Vietnamese)</span>
              </label>
              <input
                type="text"
                value={sloganVi}
                onChange={(e) => setSloganVi(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block mb-1">
                <span className="block text-[13.5px] font-black text-slate-800 leading-tight">Khẩu hiệu (English)</span>
                <span className="block text-[11px] font-bold text-slate-500 leading-tight">Class Slogan (English)</span>
              </label>
              <input
                type="text"
                value={sloganEn}
                onChange={(e) => setSloganEn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Dedicated School Logo Management Box (Section II) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-sky-50/90 via-white to-indigo-50/60 border-2 border-sky-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-2.5">
              <div>
                <h4 className="text-[14.5px] font-black text-[#263C72] flex items-center gap-2">
                  <School className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="flex flex-col leading-tight">
                    <span>Logo trường học</span>
                    <span className="text-[11.5px] font-bold text-sky-700">School Logo Management</span>
                  </span>
                </h4>
                <p className="text-[12px] text-slate-600 font-semibold mt-1">
                  Hỗ trợ PNG, JPG, WebP (căn chỉnh, thu phóng, cắt khung tròn). Tự động đồng bộ tới phần đầu Trang đăng nhập, Header chính, Thẻ QR lớp và Bằng khen.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-[11px] font-black border border-sky-200 self-start sm:self-center shrink-0">
                Đồng bộ toàn hệ thống • Synced Globally
              </span>
            </div>

            {schoolLogoFeedback && (
              <div
                className={`p-3 rounded-2xl border text-xs font-black flex items-center gap-2 ${
                  schoolLogoFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {schoolLogoFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{schoolLogoFeedback.message}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-4">
                {/* Khung xem trước logo hình tròn */}
                <div className="w-20 h-20 rounded-full bg-white border-4 border-white ring-4 ring-sky-300 shadow-md flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                  <img
                    src={pendingLogoUrl || school.logoUrl || '/assets/kingdom/school_logo_v2.png'}
                    alt="Logo trường xem trước"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/kingdom/school_logo_v2.png';
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[14px] font-black text-slate-800">
                    {schoolNameVi || school.nameVi}
                  </div>
                  <div className="text-[12px] font-bold text-sky-600">
                    {schoolNameEn || school.nameEn}
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Khung hiển thị: Hình tròn chuẩn • Tự động tách biệt với ảnh đại diện Lớp 2A5
                  </div>
                </div>
              </div>

              {/* 3 Required Buttons: Thay logo / Lưu thay đổi / Khôi phục mặc định */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsCropSchoolLogoOpen(true)}
                  disabled={savingSchoolLogo}
                  className="px-3.5 py-2 rounded-2xl bg-white hover:bg-sky-50 text-sky-700 font-black border-2 border-sky-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition active:scale-95 text-left"
                >
                  <Camera className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[13px]">Thay logo</span>
                    <span className="text-[10.5px] font-bold text-sky-600">Change Logo</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveSchoolLogoAction()}
                  disabled={savingSchoolLogo}
                  className="px-3.5 py-2 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95 disabled:opacity-50 text-left"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[13px]">{savingSchoolLogo ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    <span className="text-[10.5px] font-bold text-sky-100">Save Changes</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleRestoreDefaultSchoolLogo}
                  disabled={savingSchoolLogo}
                  className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-black border border-slate-200 flex items-center gap-1.5 cursor-pointer transition active:scale-95 disabled:opacity-50 text-left"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[13px]">Khôi phục mặc định</span>
                    <span className="text-[10.5px] font-bold text-slate-500">Restore Default</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Visual Identity Section: School Logo & Kingdom Avatar */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black text-[#263C72] mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-sky-600" />
              <span>Biểu tượng & Hình ảnh nhận diện vương quốc</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. School Logo (Circular) */}
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-sky-200 ring-2 ring-sky-300/60 shadow-xs flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                    <img
                      src={school.logoUrl || '/assets/kingdom/school_logo_v2.png'}
                      alt="Logo trường"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/kingdom/school_logo_v2.png';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 block truncate">
                      Logo trường học
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold block truncate">
                      Đăng nhập, Header & QR
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCropSchoolLogoOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 text-xs font-black border border-sky-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Thay logo</span>
                  </button>
                  {school.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRestoreDefaultSchoolLogo}
                      className="text-[10px] text-slate-500 hover:text-rose-600 font-bold text-center cursor-pointer"
                    >
                      Mặc định
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Kingdom Avatar (Circular) */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-amber-200 ring-2 ring-amber-300/60 shadow-xs flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                    <img
                      src={kingdomAvatarUrl || '/assets/kingdom/sidebar_logo.png'}
                      alt="Ảnh đại diện vương quốc"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/kingdom/sidebar_logo.png';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 block truncate">
                      Ảnh đại diện tròn
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold block truncate">
                      Góc trên Sidebar & menu
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCropKingdomAvatarOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 text-xs font-black border border-amber-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Đổi ảnh</span>
                  </button>
                  {kingdomAvatarUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (onUpdateKingdomAvatar) {
                          await onUpdateKingdomAvatar('/assets/kingdom/sidebar_logo.png');
                        }
                      }}
                      className="text-[10px] text-slate-500 hover:text-rose-600 font-bold text-center cursor-pointer"
                    >
                      Mặc định
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Sidebar Mascot Card */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-purple-200 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={sidebarMascotUrl || '/assets/kingdom/sidebar_mascot.png'}
                      alt="Linh vật vương quốc"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/kingdom/sidebar_mascot.png';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 block truncate">
                      Linh vật chân Sidebar
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold block truncate">
                      Thẻ tranh minh họa góc dưới
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCropMascotOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-purple-800 text-xs font-black border border-purple-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Đổi hình</span>
                  </button>
                  {sidebarMascotUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (onUpdateSidebarMascot) {
                          await onUpdateSidebarMascot('/assets/kingdom/sidebar_mascot.png');
                        }
                      }}
                      className="text-[10px] text-slate-500 hover:text-rose-600 font-bold text-center cursor-pointer"
                    >
                      Mặc định
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Banner cover */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Ảnh bìa Banner Lâu đài (Tải lên ảnh tùy chỉnh)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="text-xs font-semibold text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
              />
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Dùng ảnh mặc định mockup
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MULTI-CLASSES */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2">
                <School className="w-4 h-4 text-sky-600" />
                <span>Quản lý các lớp trong Vương quốc ({classes.filter(c => showArchivedClasses || !c.isArchived).length} lớp)</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Tạo lớp mới, chuyển đổi lớp đang chọn, lưu kho hoặc xóa lớp học khỏi hệ thống
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowArchivedClasses(!showArchivedClasses)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  showArchivedClasses
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{showArchivedClasses ? 'Ẩn lớp lưu kho' : 'Xem cả lớp lưu kho'}</span>
              </button>

              <button
                onClick={onCreateClass}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white text-xs font-black shadow-sm transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Tạo lớp mới</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes
              .filter((c) => showArchivedClasses || !c.isArchived)
              .map((cls) => {
                const isCurrent = cls.id === classInfo.id;
                return (
                  <div
                    key={cls.id}
                    className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                      cls.isArchived
                        ? 'border-dashed border-slate-300 bg-slate-50 opacity-80'
                        : isCurrent
                        ? 'border-sky-500 bg-sky-50/60 shadow-md ring-2 ring-sky-300'
                        : 'border-slate-200 bg-white hover:border-sky-200 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">🏰</span>
                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                              Đang hoạt động
                            </span>
                          )}
                          {cls.isArchived && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-500 text-white text-[10px] font-black uppercase tracking-wider">
                              Đã lưu kho
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-400">Khối {cls.grade}</span>
                        </div>
                      </div>

                      <h4 className="text-base font-black text-[#263C72]">{cls.nameVi}</h4>
                      <p className="text-xs font-bold text-slate-500">{cls.nameEn}</p>
                      <p className="text-[11px] text-slate-600 font-semibold mt-1">
                        Năm học: <span className="font-bold text-[#263C72]">{cls.schoolYear}</span> • GV: <span className="font-bold text-sky-800">{cls.teacherName}</span>
                      </p>
                      {cls.sloganVi && (
                        <p className="text-[10px] text-slate-500 italic mt-1.5 line-clamp-1">
                          "{cls.sloganVi}"
                        </p>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Sĩ số:</span>
                        <span className="font-black text-[#263C72]">
                          {isCurrent ? students.length : cls.targetSize} học sinh
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {!isCurrent && !cls.isArchived && (
                          <button
                            onClick={() => {
                              playStarSound('click');
                              onSwitchClass(cls.id);
                            }}
                            className="flex-1 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black transition cursor-pointer shadow-2xs text-center"
                          >
                            Chọn lớp này
                          </button>
                        )}

                        {cls.isArchived ? (
                          <button
                            onClick={async () => {
                              if (onRestoreClass) {
                                await onRestoreClass(cls.id);
                                playStarSound('star');
                              }
                            }}
                            className="flex-1 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                            title="Khôi phục lớp học này"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Khôi phục</span>
                          </button>
                        ) : (
                          !isCurrent && (
                            <button
                              onClick={async () => {
                                if (confirm(`Bạn có muốn lưu kho lớp "${cls.nameVi}"?`)) {
                                  if (onArchiveClass) {
                                    await onArchiveClass(cls.id);
                                    playStarSound('click');
                                  }
                                }
                              }}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition"
                              title="Lưu kho lớp"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )
                        )}

                        {/* Trash Button for deletion */}
                        <button
                          onClick={() => {
                            setClassToDelete(cls);
                            playStarSound('click');
                          }}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer transition"
                          title="Xóa lớp học"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB: ACADEMIC CALENDAR & SEMESTERS */}
      {activeTab === 'academic' && (() => {
        const previewConfig: AcademicCalendarConfig = {
          schoolYear: cfgSchoolYear || '2026 - 2027',
          startDate: cfgStartDate || '2026-09-07',
          week1StartDate: cfgStartDate || '2026-09-07',
          totalWeeks: cfgTotalWeeks || 36,
          endDate: cfgEndDate || '2027-05-31',
          semester1Start: cfgSem1Start || '2026-09-07',
          semester1End: cfgSem1End || '2027-01-15',
          semester2Start: cfgSem2Start || '2027-01-16',
          semester2End: cfgSem2End || '2027-05-31',
          holidayWeeks: cfgHolidayWeeksStr
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n)),
          scheduleNotes: cfgScheduleNotes,
        };
        const previewWeeks = getAvailableSchoolWeeks(cfgTotalWeeks || 36, previewConfig);
        const liveWeekInfo = getAcademicWeekInfo(undefined, previewConfig);
        const previewMonths = getAcademicMonthsForConfig(previewConfig);
        const currentMonthKey = getCurrentAcademicMonthKey(undefined, previewConfig);

        return (
          <form onSubmit={handleSaveAcademic} className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>Cấu hình Năm học & Lịch 36 Tuần / Academic Calendar (Asia/Ho_Chi_Minh)</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Thiết lập tên năm học, ngày bắt đầu Tuần 1, tổng số tuần, Học kỳ I & II và xem trước toàn bộ 36 tuần năm học
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black border ${
                    liveWeekInfo.isOutOfRange
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-sky-50 text-sky-800 border-sky-200'
                  }`}
                >
                  {liveWeekInfo.statusLabelVi}
                </span>
                {academicSavedSuccess && (
                  <span className="text-xs font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <Check className="w-4 h-4" />
                    <span>Đã lưu thành công!</span>
                  </span>
                )}
              </div>
            </div>

            {academicError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{academicError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Tên năm học hiển thị *</label>
                <input
                  type="text"
                  required
                  value={cfgSchoolYear}
                  onChange={(e) => setCfgSchoolYear(e.target.value)}
                  placeholder="2026 - 2027"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Ngày bắt đầu Tuần 1 (Thứ Hai) *</label>
                <input
                  type="date"
                  required
                  value={cfgStartDate}
                  onChange={(e) => setCfgStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Tổng số tuần năm học *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={52}
                  value={cfgTotalWeeks}
                  onChange={(e) => setCfgTotalWeeks(Math.max(1, Math.min(52, Number(e.target.value) || 36)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Ngày kết thúc năm học *</label>
                <input
                  type="date"
                  required
                  value={cfgEndDate}
                  onChange={(e) => setCfgEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-3">
                <h4 className="text-xs font-black text-orange-950 flex items-center gap-1.5">
                  <span>🍁 Học kỳ I (Semester 1)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bắt đầu Học kỳ I:</label>
                    <input
                      type="date"
                      required
                      value={cfgSem1Start}
                      onChange={(e) => setCfgSem1Start(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kết thúc Học kỳ I:</label>
                    <input
                      type="date"
                      required
                      value={cfgSem1End}
                      onChange={(e) => setCfgSem1End(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <span>🌸 Học kỳ II (Semester 2)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bắt đầu Học kỳ II:</label>
                    <input
                      type="date"
                      required
                      value={cfgSem2Start}
                      onChange={(e) => setCfgSem2Start(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kết thúc Học kỳ II:</label>
                    <input
                      type="date"
                      required
                      value={cfgSem2End}
                      onChange={(e) => setCfgSem2End(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Special Holiday Weeks & Schedule Adjustment Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Các tuần nghỉ đặc biệt / điều chỉnh (cách nhau dấu phẩy, nếu có):
                </label>
                <input
                  type="text"
                  value={cfgHolidayWeeksStr}
                  onChange={(e) => setCfgHolidayWeeksStr(e.target.value)}
                  placeholder="Ví dụ: 22, 23 (Nghỉ Tết Nguyên Đán)"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Ghi chú điều chỉnh lịch năm học:
                </label>
                <input
                  type="text"
                  value={cfgScheduleNotes}
                  onChange={(e) => setCfgScheduleNotes(e.target.value)}
                  placeholder="Ghi chú lịch năm học..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* 9 Academic Months Preview */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <span>🗓️ Chu kỳ 9 tháng năm học ({previewMonths[0]?.labelVi} – {previewMonths[previewMonths.length - 1]?.labelVi})</span>
                </h4>
                <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                  Năm học {cfgSchoolYear}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 pt-1">
                {previewMonths.map((m, idx) => {
                  const isCurrentMonth = m.key === currentMonthKey;
                  return (
                    <div
                      key={m.key}
                      className={`p-2 rounded-xl text-center text-xs font-black border ${
                        isCurrentMonth
                          ? 'bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-400'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      <div>{m.labelVi}</div>
                      <div className="text-[10px] font-extrabold text-slate-400">
                        {idx < 5 ? 'Học kỳ I' : 'Học kỳ II'}
                      </div>
                      {isCurrentMonth && (
                        <span className="text-[9px] bg-amber-400 text-amber-950 px-1 rounded-full font-black mt-0.5 block">
                          Tháng này
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full 36-Week Schedule Preview */}
            <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                    <span>📋 Xem trước lịch toàn bộ {previewWeeks.length} tuần năm học ({cfgSchoolYear})</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Tuần 1: {previewWeeks[0]?.startFormatted} – {previewWeeks[0]?.endFormatted} • Tuần {previewWeeks.length}: {previewWeeks[previewWeeks.length - 1]?.startFormatted} – {previewWeeks[previewWeeks.length - 1]?.endFormatted}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCfgSchoolYear('2026 - 2027');
                    setCfgStartDate('2026-09-07');
                    setCfgTotalWeeks(36);
                    setCfgEndDate('2027-05-31');
                    setCfgSem1Start('2026-09-07');
                    setCfgSem1End('2027-01-15');
                    setCfgSem2Start('2027-01-16');
                    setCfgSem2End('2027-05-31');
                    playStarSound('click');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-black cursor-pointer self-start sm:self-center"
                >
                  Đặt chuẩn 36 tuần 2026–2027
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                {previewWeeks.map((w) => (
                  <div
                    key={w.weekNumber}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                      w.isCurrent
                        ? 'bg-amber-100 border-amber-400 text-amber-950 ring-1 ring-amber-400 font-black'
                        : w.isHoliday
                        ? 'bg-rose-50 border-rose-200 text-rose-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 font-bold'
                    }`}
                  >
                    <div>
                      <div className="font-black flex items-center gap-1.5">
                        <span>Tuần {w.weekNumber}</span>
                        {w.isCurrent && (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 text-[9px] font-black">
                            Tuần này
                          </span>
                        )}
                        {w.isHoliday && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-800 text-[9px] font-black">
                            Nghỉ
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        {w.startFormatted} – {w.endFormatted}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {w.weekNumber <= 18 ? 'HK I' : 'HK II'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingAcademic}
                className="px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingAcademic ? 'Đang lưu...' : 'Lưu cấu hình thời gian'}</span>
              </button>
            </div>
          </form>
        );
      })()}

      {/* TAB: DATA HEALTH CHECK & AUDIT TRAIL */}
      {activeTab === 'health' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Trung tâm kiểm tra dữ liệu & Lịch sử thao tác</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Kiểm tra tính toàn vẹn của học sinh, tổ thi đua, điểm danh và hoàn tác thao tác
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunHealthCheck}
              disabled={loadingHealth}
              className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
              <span>{loadingHealth ? 'Đang quét...' : 'Quét kiểm tra lại'}</span>
            </button>
          </div>

          {/* Health Score Meter */}
          {dataHealth && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-center">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
                  Điểm sức khỏe dữ liệu
                </span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-950 font-['Fredoka'] my-1">
                  {dataHealth.healthScore}/100
                </div>
                <span className="text-xs font-bold text-emerald-700">
                  {dataHealth.healthScore >= 90 ? '🌟 Dữ liệu chuẩn xác, an toàn' : '⚠️ Có một số điểm cần xem lại'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200 text-center">
                <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider block">
                  Tổng số học sinh lớp
                </span>
                <div className="text-3xl sm:text-4xl font-black text-sky-950 font-['Fredoka'] my-1">
                  {students.length}
                </div>
                <span className="text-xs font-bold text-sky-700">Đã cập nhật hệ thống</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 text-center">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
                  Số vấn đề phát hiện
                </span>
                <div className="text-3xl sm:text-4xl font-black text-amber-950 font-['Fredoka'] my-1">
                  {dataHealth.issues.length}
                </div>
                <span className="text-xs font-bold text-amber-700">Hạng mục kiểm tra</span>
              </div>
            </div>
          )}

          {/* Issues List */}
          {dataHealth && dataHealth.issues.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Chi tiết các điểm cần lưu ý ({dataHealth.issues.length})</span>
              </h4>

              <div className="space-y-2">
                {dataHealth.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      issue.type === 'error'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : issue.type === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-sky-50 border-sky-200 text-sky-900'
                    }`}
                  >
                    <div>
                      <h5 className="text-xs font-black">{issue.title}</h5>
                      <p className="text-[11px] font-medium opacity-90">{issue.message}</p>
                    </div>

                    {issue.autoFixable && issue.fixAction && (
                      <button
                        type="button"
                        onClick={() => handleExecuteQuickFix(issue.fixAction!)}
                        disabled={fixingAction === issue.fixAction}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-xs font-black shadow-xs border border-slate-200 hover:bg-slate-50 cursor-pointer shrink-0 transition"
                      >
                        {fixingAction === issue.fixAction ? 'Đang xử lý...' : 'Sửa nhanh ngay ⚡'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail with Undo button */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-sky-600" />
              <span>Nhật ký thao tác gần đây & Hoàn tác ({recentLogs.length})</span>
            </h4>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Chưa có bản ghi nhật ký thao tác nào.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {recentLogs.slice(0, 30).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">{log.description}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('vi-VN')} • Thực hiện bởi: {log.actor}
                      </span>
                    </div>

                    {log.canUndo && !log.isUndone && (
                      <button
                        type="button"
                        onClick={() => handleUndoAuditEntry(log.id)}
                        disabled={undoingLogId === log.id}
                        className="px-2.5 py-1 rounded-lg bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-[11px] font-bold cursor-pointer transition shadow-2xs"
                      >
                        {undoingLogId === log.id ? 'Đang hoàn tác...' : 'Hoàn tác'}
                      </button>
                    )}
                    {log.isUndone && (
                      <span className="text-[10px] font-bold text-slate-400 italic">Đã hoàn tác</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO & EFFECTS (Âm thanh & Hiệu ứng tập trung) */}
      {activeTab === 'audio' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-sky-500" />
                <span>Hệ thống Quản lý Âm thanh & Hiệu ứng / Audio & Effects</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Cài đặt âm lượng, bật tắt âm thanh click, tiếng thưởng sao lấp lánh và nhạc vinh danh
              </p>
            </div>
            <button
              onClick={() => handleToggleAudioSetting('masterSound')}
              className={`px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 transition cursor-pointer ${
                audioSettings.masterSound
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-rose-100 text-rose-700 border border-rose-300'
              }`}
            >
              {audioSettings.masterSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{audioSettings.masterSound ? 'Âm thanh: ĐANG BẬT' : 'Âm thanh: ĐÃ TẮT'}</span>
            </button>
          </div>

          {/* Volume Control */}
          <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-800">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-600" />
                <span>Âm lượng tổng thể (Master Volume):</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-sky-700 border border-sky-200">
                {Math.round(audioSettings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audioSettings.volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Sound Channels Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Click Sound */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span>1. Âm thanh click nhẹ, đáng yêu</span>
                  {!audioSettings.clickSound && (
                    <span className="text-[10px] text-slate-400 font-bold">(Mặc định tắt tránh làm phiền)</span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">
                  Tiếng gõ bong bóng mềm mại khi bấm các nút, có chống lặp âm liên tục.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => audioManager.playClick(true)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Thử nghe
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAudioSetting('clickSound')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    audioSettings.clickSound ? 'bg-sky-500 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                </button>
              </div>
            </div>

            {/* Star Reward Sound */}
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>2. Âm thanh thưởng sao (Star Sparkle)</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5 font-semibold">
                  Chuỗi chuông hòa âm ngân vang lấp lánh khi học sinh nhận được sao.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => audioManager.playStarReward(true)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-[11px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                >
                  Thử nghe
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAudioSetting('starSound')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    audioSettings.starSound ? 'bg-amber-500 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                </button>
              </div>
            </div>

            {/* Celebration Sound */}
            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-rose-500" />
                  <span>3. Âm thanh vinh danh & Pháo hoa</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5 font-semibold">
                  Nhạc khúc khải hoàn hoàng gia ăn mừng cùng hiệu ứng pháo hoa rực rỡ.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playCelebration(true);
                    triggerGrandCelebration();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-[11px] font-bold text-rose-900 hover:bg-rose-100 cursor-pointer"
                >
                  Bắn thử pháo hoa
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAudioSetting('celebrationSound')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    audioSettings.celebrationSound ? 'bg-rose-500 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                </button>
              </div>
            </div>

            {/* Classroom Tools Sound */}
            <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/30 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>4. Âm thanh Bộ công cụ lớp học</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5 font-semibold">
                  Âm thanh đồng hồ đếm ngược, tiếng chuông hết giờ và tiếng quay vòng quay.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => audioManager.playToolSound('ding', true)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-purple-200 text-[11px] font-bold text-purple-900 hover:bg-purple-100 cursor-pointer"
                >
                  Tiếng chuông
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAudioSetting('toolsSound')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    audioSettings.toolsSound ? 'bg-purple-500 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MENU CUSTOMIZATION (Cá nhân hóa giao diện 9 menu) */}
      {activeTab === 'customize' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-500" />
                <span>Cá nhân hóa giao diện & Tên 9 Menu / Custom Menu Branding</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Đổi tên song ngữ Anh - Việt và thay đổi icon/hình ảnh đại diện cho từng menu mà vẫn giữ nguyên điều hướng chuẩn.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetMenuToDefault}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Khôi phục mặc định
              </button>
              <button
                type="button"
                onClick={handleSaveMenuCustomization}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu tùy chỉnh menu'}</span>
              </button>
            </div>
          </div>

          {menuSaveSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Đã lưu toàn bộ tùy chỉnh giao diện thành công và đồng bộ trên Sidebar & thanh menu!</span>
            </div>
          )}

          {/* Menu Selector Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {allNavList.map((item) => {
              const isSelected = selectedEditMenuId === item.id;
              const custom = localCustomMenus[item.id];
              const titleVi = custom?.titleVi || item.titleVi;
              const iconUrl = custom?.iconUrl;
              const customEmoji = custom?.presetIcon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playStarSound('click');
                    setSelectedEditMenuId(item.id);
                  }}
                  className={`px-3 py-2 rounded-2xl border-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-xs ring-2 ring-sky-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200'
                  }`}
                >
                  <MenuIcon id={item.iconKey} size={22} customUrl={iconUrl} customEmoji={customEmoji} />
                  <span className="text-xs font-black whitespace-nowrap">{titleVi}</span>
                </button>
              );
            })}
          </div>

          {/* Edit Box for Selected Menu Item */}
          {(() => {
            const currentItem = allNavList.find((i) => i.id === selectedEditMenuId) || allNavList[0];
            const currentCustom = localCustomMenus[selectedEditMenuId] || {
              id: currentItem.id,
              titleVi: currentItem.titleVi,
              titleEn: currentItem.titleEn,
            };

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-3xl bg-slate-50/80 border border-slate-200">
                {/* Inputs Column */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      Mã nội bộ (internalKey): <b className="text-slate-800">{currentItem.id}</b>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        Tên hiển thị tiếng Việt *
                      </label>
                      <input
                        type="text"
                        value={currentCustom.titleVi}
                        onChange={(e) => handleMenuFieldChange('titleVi', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        Tên hiển thị tiếng Anh (English) *
                      </label>
                      <input
                        type="text"
                        value={currentCustom.titleEn}
                        onChange={(e) => handleMenuFieldChange('titleEn', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Icon Customization */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      Chọn biểu tượng hoặc tải ảnh từ máy tính / điện thoại:
                    </label>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {presetEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            playStarSound('click');
                            setLocalCustomMenus((prev) => ({
                              ...prev,
                              [selectedEditMenuId]: {
                                ...(prev[selectedEditMenuId] || { id: selectedEditMenuId, titleVi: '', titleEn: '' }),
                                presetIcon: emoji,
                                iconUrl: undefined,
                              },
                            }));
                          }}
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg cursor-pointer transition ${
                            currentCustom.presetIcon === emoji
                              ? 'bg-sky-500 text-white border-sky-600 scale-110 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Upload Custom Image */}
                    <div className="flex items-center gap-3">
                      <label className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs">
                        <ImageIcon className="w-4 h-4 text-sky-600" />
                        <span>Tải ảnh icon riêng</span>
                        <input type="file" accept="image/*" onChange={handleMenuIconUpload} className="hidden" />
                      </label>

                      {(currentCustom.iconUrl || currentCustom.presetIcon) && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocalCustomMenus((prev) => ({
                              ...prev,
                              [selectedEditMenuId]: {
                                ...(prev[selectedEditMenuId] || { id: selectedEditMenuId, titleVi: '', titleEn: '' }),
                                iconUrl: undefined,
                                presetIcon: undefined,
                              },
                            }));
                          }}
                          className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                        >
                          Dùng icon SVG gốc
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Preview Column */}
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-sky-100 shadow-2xs text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Xem trước trên Sidebar
                  </span>

                  <div className="w-full max-w-[200px] p-3 rounded-2xl bg-gradient-to-r from-[#47B5FF] to-[#2563EB] text-white flex items-center gap-2.5 shadow-md">
                    <div className="p-0.5 rounded-xl shrink-0">
                      <MenuIcon
                        id={currentItem.iconKey}
                        size={28}
                        customUrl={currentCustom.iconUrl}
                        customEmoji={currentCustom.presetIcon}
                      />
                    </div>
                    <div className="min-w-0 text-left">
                      <span className="text-xs font-black block truncate">{currentCustom.titleVi || currentItem.titleVi}</span>
                      <span className="text-[10px] text-sky-100 block font-bold truncate">{currentCustom.titleEn || currentItem.titleEn}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-3 font-semibold">
                    Đảm bảo hiển thị hoàn hảo trên cả desktop và mobile drawer.
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 5: OFFLINE & PWA */}
      {activeTab === 'offline' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2">
                <Wifi className="w-5 h-5 text-sky-600" />
                <span>Chuẩn bị ngoại tuyến & Đồng bộ tự động / Offline & PWA Sync</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Giúp giáo viên tiếp tục chấm sao, điểm danh ngay cả khi mất mạng; tự động đồng bộ khi có kết nối trở lại.
              </p>
            </div>

            <div className={`px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 ${
              isOnline ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
            }`}>
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-rose-600" />}
              <span>{isOnline ? 'Trực tuyến (Online)' : 'Ngoại tuyến (Offline)'}</span>
            </div>
          </div>

          {/* Action to pre-cache class state */}
          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-sky-950">Lưu dữ liệu lớp học vào bộ nhớ đệm (Pre-cache)</h4>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Tải trước thông tin lớp {classInfo.nameVi}, danh sách học sinh và 4 tổ để sẵn sàng làm việc khi ngắt kết nối.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePrecacheOffline}
              disabled={isCaching}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs shadow-xs cursor-pointer shrink-0 transition"
            >
              {isCaching ? 'Đang lưu...' : 'Lưu bộ nhớ đệm ngay'}
            </button>
          </div>

          {cacheMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{cacheMessage}</span>
            </div>
          )}

          {/* Offline Operations Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800">
                Hàng đợi thao tác ngoại tuyến đang chờ đồng bộ ({offlineQueue.length})
              </h4>
              <div className="flex items-center gap-2">
                {offlineQueue.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => offlineSync.clearCompleted()}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Xóa mục đã đồng bộ
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncOfflineQueue}
                      disabled={syncingOffline || !isOnline}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingOffline ? 'animate-spin' : ''}`} />
                      <span>{syncingOffline ? 'Đang gửi...' : 'Đồng bộ ngay'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {offlineQueue.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
                Không có thao tác nào đang chờ đồng bộ. Tất cả dữ liệu đã được cập nhật với máy chủ!
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {offlineQueue.map((op) => (
                  <div key={op.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        Thao tác: <b>{op.type}</b> (Mã: {op.id.slice(0, 10)})
                      </p>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Thời gian: {new Date(op.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                      op.status === 'synced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : op.status === 'syncing'
                        ? 'bg-sky-100 text-sky-800'
                        : op.status === 'failed'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {op.status === 'synced' ? 'Đã đồng bộ' : op.status === 'syncing' ? 'Đang gửi...' : op.status === 'failed' ? 'Thất bại' : 'Đang chờ'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
          {/* Live Persistence & System Health Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-amber-50 border border-sky-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-black text-[#263C72] uppercase tracking-wider">
                  Trạng thái lưu trữ bền vững Render & IndexedDB
                </h4>
              </div>
              <button
                type="button"
                onClick={fetchSystemHealth}
                disabled={loadingServerHealth}
                className="px-3 py-1 rounded-xl bg-white hover:bg-slate-50 border border-sky-200 text-[11px] font-bold text-sky-800 shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3 h-3 ${loadingServerHealth ? 'animate-spin' : ''}`} />
                <span>{loadingServerHealth ? 'Đang kiểm tra...' : 'Kiểm tra máy chủ'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-bold text-slate-700">
              <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Dung lượng Database</span>
                <span className="text-sm font-black text-sky-900">
                  {systemHealth ? `${(systemHealth.dbSizeKb || 0).toLocaleString()} KB` : 'Đang tính...'}
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Kho tệp đã upload</span>
                <span className="text-sm font-black text-indigo-900">
                  {systemHealth ? `${systemHealth.uploadsCount || 0} tệp (${((systemHealth.uploadsSizeKb || 0) / 1024).toFixed(1)} MB)` : 'Đang tính...'}
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Bản chụp tự động</span>
                <span className="text-sm font-black text-emerald-900">
                  {systemHealth ? `${systemHealth.snapshotsCount || 0} bản lưu` : 'Đang tính...'}
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Thời gian hoạt động</span>
                <span className="text-sm font-black text-slate-800">
                  {systemHealth ? `${Math.floor((systemHealth.uptimeSeconds || 0) / 60)} phút` : 'Đang tính...'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
              🛡️ <b>Cơ chế bảo vệ dữ liệu vĩnh viễn:</b> Toàn bộ thao tác thêm học sinh, cộng sao và tạo học liệu được lưu song song vào tệp máy chủ (ghi nguyên tử atomic write) và cơ sở dữ liệu IndexedDB trên thiết bị giáo viên. Ngay cả khi Render ngủ đông hoặc khởi động lại container, hệ thống tự động nhận diện và khôi phục dữ liệu nguyên vẹn 100%.
            </p>
          </div>

          {/* Export Section */}
          <div>
            <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2 mb-1">
              <Download className="w-4 h-4 text-sky-600" />
              <span>Xuất dữ liệu sao lưu (JSON Backup)</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              Tải toàn bộ cơ sở dữ liệu học sinh, sao thưởng, tổ, quà tặng và bài viết về máy tính cá nhân để lưu trữ an toàn.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleDownloadBackup('class')}
                disabled={backupLoading}
                className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Tải sao lưu Lớp {classInfo.nameVi} (.json)</span>
              </button>
              <button
                onClick={() => handleDownloadBackup('all')}
                disabled={backupLoading}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                <span>Tải toàn bộ Vương quốc ({classes.length} lớp) (.json)</span>
              </button>
              <button
                onClick={() => window.open('/api/backup/export', '_blank')}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Xuất bản sao lưu toàn hệ thống (.json)</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* IndexedDB Local Snapshots Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2">
                  <Archive className="w-4 h-4 text-amber-600" />
                  <span>Bản chụp dữ liệu cục bộ trên máy (Local Snapshots)</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Lưu trữ vĩnh viễn trên trình duyệt bằng IndexedDB (dung lượng lên đến hàng trăm MB), hoàn toàn độc lập với Render.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateLocalSnapshot}
                disabled={backupLoading}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition shrink-0 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Tạo bản chụp ngay</span>
              </button>
            </div>

            {localSnapshots.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs font-semibold text-slate-500">
                Chưa có bản chụp cục bộ nào trên trình duyệt này. Nhấn "Tạo bản chụp ngay" để sao lưu an toàn chỉ với 1 cú click!
              </div>
            ) : (
              <div className="space-y-2">
                {localSnapshots.map((snap) => (
                  <div key={snap.id} className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{snap.label}</h5>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {new Date(snap.timestamp).toLocaleString('vi-VN')} • {snap.classCount} lớp • {snap.studentCount} học sinh
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleRestoreLocalSnapshot(snap)}
                        disabled={backupLoading}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs cursor-pointer transition disabled:opacity-50"
                      >
                        Khôi phục
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocalSnapshot(snap.id)}
                        disabled={backupLoading}
                        className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                        title="Xóa bản chụp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Import / Restore Section */}
          <div>
            <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2 mb-1">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Phục hồi dữ liệu từ file JSON (Restore)</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              Chọn file JSON sao lưu hợp lệ để khôi phục dữ liệu vương quốc.
            </p>

            <div className="p-4 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/40 text-center">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="text-xs font-semibold text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-sky-500 file:text-white hover:file:bg-sky-600 cursor-pointer"
              />
            </div>

            {restoreMessage && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{restoreMessage}</span>
              </div>
            )}

            {restorePreview && (
              <div className="mt-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-black">
                  <Check className="w-4 h-4" />
                  <span>Xác nhận thông tin file sao lưu:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-slate-700">
                  <div className="bg-white p-2 rounded-xl">Loại: <b>{restorePreview.type}</b></div>
                  <div className="bg-white p-2 rounded-xl">Số lớp: <b>{restorePreview.classCount}</b></div>
                  <div className="bg-white p-2 rounded-xl">Số học sinh: <b>{restorePreview.studentCount}</b></div>
                  <div className="bg-white p-2 rounded-xl">Thời gian: <b>{restorePreview.timestamp}</b></div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleExecuteRestore}
                    disabled={backupLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer transition disabled:opacity-50"
                  >
                    {backupLoading ? 'Đang phục hồi...' : 'Bắt đầu phục hồi dữ liệu ngay'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Preset / Demo Reset */}
          <div>
            <h3 className="text-sm font-black text-rose-700 flex items-center gap-2 mb-1">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Khôi phục mẫu dữ liệu thử nghiệm</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              Cài lại lớp 2A5 chuẩn (28 học sinh chia đều 4 tổ) hoặc xóa trắng danh sách để nhập lớp thực tế.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (window.confirm('Khôi phục danh sách chuẩn 28 học sinh Lớp 2A5 (7 học sinh/tổ)?')) {
                    onResetDemo('demo28');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black border border-amber-300 transition cursor-pointer"
              >
                Khôi phục chuẩn Lớp 2A5 (28 học sinh / 4 tổ)
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn làm trống danh sách lớp 2A5 không?')) {
                    onResetDemo('empty');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-black border border-slate-300 transition cursor-pointer"
              >
                Đặt lớp 2A5 về danh sách trống
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crop School Logo */}
      <ImageCropModal
        isOpen={isCropSchoolLogoOpen}
        onClose={() => setIsCropSchoolLogoOpen(false)}
        title="Logo Trường học / School Logo"
        subtitle="Tải lên ảnh PNG, JPG hoặc WebP, thu phóng, căn chỉnh khung tròn và lưu đồng bộ"
        currentImage={pendingLogoUrl || school.logoUrl}
        defaultImage="/assets/kingdom/school_logo_v2.png"
        shape="circle"
        onSave={async (dataUrl) => {
          setPendingLogoUrl(dataUrl);
          await handleSaveSchoolLogoAction(dataUrl);
          setIsCropSchoolLogoOpen(false);
        }}
        onResetDefault={async () => {
          await handleRestoreDefaultSchoolLogo();
          setIsCropSchoolLogoOpen(false);
        }}
      />

      {/* Modal Crop Kingdom Avatar */}
      <ImageCropModal
        isOpen={isCropKingdomAvatarOpen}
        onClose={() => setIsCropKingdomAvatarOpen(false)}
        title="Ảnh đại diện Vương quốc"
        subtitle="Tải lên, thu phóng, căn chỉnh vị trí và lưu ảnh đại diện tròn"
        currentImage={kingdomAvatarUrl}
        defaultImage="/assets/kingdom/sidebar_logo.png"
        shape="circle"
        onSave={async (dataUrl) => {
          if (onUpdateKingdomAvatar) {
            await onUpdateKingdomAvatar(dataUrl);
          }
          setIsCropKingdomAvatarOpen(false);
        }}
        onResetDefault={async () => {
          if (onUpdateKingdomAvatar) {
            await onUpdateKingdomAvatar('/assets/kingdom/sidebar_logo.png');
          }
          setIsCropKingdomAvatarOpen(false);
        }}
      />

      {/* Modal Crop Sidebar Mascot Card */}
      <ImageCropModal
        isOpen={isCropMascotOpen}
        onClose={() => setIsCropMascotOpen(false)}
        title="Linh vật / Thẻ chân Sidebar"
        subtitle="Tải ảnh mới từ máy, phóng to / căn chỉnh hoặc chọn các mẫu linh vật có sẵn"
        currentImage={sidebarMascotUrl}
        defaultImage="/assets/kingdom/sidebar_mascot.png"
        shape="card"
        aspectRatio={196 / 260}
        presets={[
          { label: 'Học vui Tỏa sáng (Gốc)', url: '/assets/kingdom/sidebar_mascot.png' },
          { label: 'Vương quốc Ngôi sao V2', url: '/assets/kingdom/sidebar_mascot_v2.png' },
          { label: 'Lâu đài Cổ tích', url: '/assets/kingdom/hero_banner.png' },
          { label: 'Linh vật Di động', url: '/assets/kingdom/mobile_mascot.png' },
          { label: 'Trường học Ngôi sao', url: '/assets/kingdom/school_logo_v2.png' },
        ]}
        onSave={async (dataUrl) => {
          if (onUpdateSidebarMascot) {
            await onUpdateSidebarMascot(dataUrl);
          }
          setIsCropMascotOpen(false);
        }}
        onResetDefault={async () => {
          if (onUpdateSidebarMascot) {
            await onUpdateSidebarMascot('/assets/kingdom/sidebar_mascot.png');
          }
          setIsCropMascotOpen(false);
        }}
      />

      {/* Delete / Archive Class Modal */}
      {classToDelete && (
        <DeleteClassModal
          classInfo={classToDelete}
          totalClassesCount={classes.length}
          studentCount={students.filter((s) => s.classId === classToDelete.id).length || classToDelete.targetSize}
          onClose={() => setClassToDelete(null)}
          onConfirmArchive={async (cId) => {
            if (onArchiveClass) {
              await onArchiveClass(cId);
            }
          }}
          onConfirmPermanentDelete={async (cId, confirmName) => {
            if (onDeleteClass) {
              await onDeleteClass(cId, confirmName, true);
            }
          }}
        />
      )}
    </div>
  );
};
