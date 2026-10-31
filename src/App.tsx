import React, { useState, useEffect } from 'react';
import { AppState, Role, Student, LibraryCategory, StarTransaction, ClassInfo, AppNotification } from './types';
import { api } from './services/api';
import { offlineSync } from './services/offlineSync';
import { Header } from './components/Header';
import { Sidebar, NavTab, navItems, settingsItem } from './components/Sidebar';
import { HeroBanner } from './components/HeroBanner';
import { NavigationCards } from './components/NavigationCards';
import { HomeDashboard } from './components/HomeDashboard';
import { StudentsView } from './components/StudentsView';
import { ClassTeamsView } from './components/ClassTeamsView';
import { RewardsView } from './components/RewardsView';
import { HallOfFameView } from './components/HallOfFameView';
import { ClassroomToolsView } from './components/ClassroomToolsView';
import { ClassNewsView } from './components/ClassNewsView';
import { LearningLibraryView } from './components/LearningLibraryView';
import { SettingsBackupView } from './components/SettingsBackupView';
import { CreateClassModal } from './components/CreateClassModal';
import { StudentPortalView } from './components/StudentPortalView';
import { LoginPage } from './components/LoginPage';
import { ClassQRCodeModal } from './components/ClassQRCodeModal';
import { MenuIcon } from './components/MenuIcon';
import { DeleteClassModal } from './components/DeleteClassModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { NotificationDetailModal } from './components/NotificationDetailModal';
import { ToastNotification, ActiveToast } from './components/ToastNotification';
import { playStarSound, triggerGrandCelebration, stopCelebration } from './utils/effects';

import {
  Bell,
  X,
  Star,
  Users,
  Trophy,
  Gift,
  Dice5,
  BookOpen,
  Megaphone,
  Home as HomeIcon,
  Sparkles,
  Briefcase,
  Layers,
} from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation & Role
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [authSessionRole, setAuthSessionRole] = useState<'teacher' | 'student' | 'guest'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('starkingdom_auth');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.token && parsed.role) {
            return parsed.role;
          }
        }
      } catch {}
    }
    return 'guest';
  });
  const [currentRole, setCurrentRole] = useState<Role>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('starkingdom_auth');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.token && parsed.role === 'teacher') {
            return 'teacher';
          }
        }
      } catch {}
    }
    return 'student';
  });
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  // Sub-navigation presets
  const [selectedToolTab, setSelectedToolTab] = useState<'noise' | 'timer' | 'picker'>('noise');
  const [selectedLibraryCategory, setSelectedLibraryCategory] = useState<LibraryCategory | 'all'>('all');

  // Modals & Drawers
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [headerClassToDelete, setHeaderClassToDelete] = useState<ClassInfo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [activeToasts, setActiveToasts] = useState<ActiveToast[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Authentication & Current User State
  const [currentUserInfo, setCurrentUserInfo] = useState<{ id: string; email?: string; name: string }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('starkingdom_auth');
        if (saved) {
          const parsed = JSON.parse(saved);
          const uId = parsed.userId || parsed.email || (parsed.studentId ? `student_${parsed.studentId}` : 'teacher_thao');
          return {
            id: uId,
            email: parsed.email,
            name: parsed.displayName || parsed.fullName || 'Cô Thảo',
          };
        }
      } catch (e) {
        // ignore
      }
    }
    return { id: 'teacher_thao', email: 'tpt0208@gmail.com', name: 'Cô Thảo' };
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') === 'student' || params.get('code') || params.get('student')) {
        return true;
      }
      try {
        const saved = localStorage.getItem('starkingdom_auth');
        if (saved) {
          const parsed = JSON.parse(saved);
          return !!(parsed.authenticated && parsed.token);
        }
      } catch (e) {
        // ignore
      }
    }
    return false;
  });

  // Calculate current active userId strictly for notification read tracking
  const currentUserId =
    currentRole === 'teacher'
      ? currentUserInfo.id || 'teacher_thao'
      : currentStudent
      ? `student_${currentStudent.id}`
      : 'student_guest';

  // Read notification IDs set for current user
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`starkingdom_reads_${currentUserId}`);
        if (cached) {
          return new Set(JSON.parse(cached));
        }
      } catch (e) {}
    }
    return new Set<string>();
  });

  // Keep readNotificationIds in sync with currentUserId & appState
  useEffect(() => {
    if (appState && currentUserId) {
      const serverReads = (appState.notificationReads || [])
        .filter((r) => r.userId === currentUserId && r.isRead)
        .map((r) => r.notificationId);

      let localCached: string[] = [];
      try {
        const item = localStorage.getItem(`starkingdom_reads_${currentUserId}`);
        if (item) localCached = JSON.parse(item);
      } catch (e) {}

      const merged = new Set([...serverReads, ...localCached]);
      setReadNotificationIds(merged);
      try {
        localStorage.setItem(`starkingdom_reads_${currentUserId}`, JSON.stringify(Array.from(merged)));
      } catch (e) {}
    }
  }, [appState?.notificationReads, currentUserId]);

  const isNotificationRead = (notifId: string): boolean => {
    return readNotificationIds.has(notifId);
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    // 1. Optimistic update: mark as read immediately so badge & dot decrease instantly
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(notificationId);
      try {
        localStorage.setItem(`starkingdom_reads_${currentUserId}`, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });

    // 2. Persist to server / database
    try {
      await api.markNotificationAsRead(notificationId, currentUserId, appState?.currentClassId);
    } catch (err) {
      console.warn('Network error marking notification as read; saved to local cache:', err);
    }
  };

  const handleOpenNotification = (notif: AppNotification) => {
    setSelectedNotification(notif);
    handleMarkNotificationAsRead(notif.id);
  };

  const addToast = (notification: AppNotification) => {
    // Never show a toast for a notification that is already marked as read!
    if (readNotificationIds.has(notification.id)) return;
    setActiveToasts((prev) => [
      ...prev.filter((t) => t.notification.id !== notification.id),
      { id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, notification, createdAt: Date.now() },
    ]);
  };

  const handleDismissToast = (toastId: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== toastId));
  };


  // Load state on start
  const fetchState = async () => {
    try {
      setLoading(true);
      const data = await api.getState();
      setAppState(data);
      // Cache fresh state for offline use
      offlineSync.cacheClassState(data);
      setError(null);
    } catch (err: unknown) {
      console.warn('Network error fetching state, checking offline cache:', err);
      const cached = offlineSync.getCachedClassState();
      if (cached && cached.state) {
        setAppState(cached.state);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu lớp học');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();

    // Auto-sync when reconnecting to network
    const handleOnline = async () => {
      const { syncedCount } = await offlineSync.syncPending();
      if (syncedCount > 0) {
        await fetchState();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Listen for direct QR scan parameters (e.g. ?portal=student) -> open Student Portal login screen (requires PIN)
  useEffect(() => {
    if (appState && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal');
      const code = params.get('code') || params.get('student');
      if (portal === 'student' || code) {
        setCurrentRole('student');
        setAuthSessionRole('guest');
        setIsAuthenticated(true);
      }
    }
  }, [appState]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('starkingdom_auth');
    } catch (e) {
      // ignore
    }
    setIsAuthenticated(false);
    setCurrentStudent(null);
    setAuthSessionRole('guest');
    setCurrentRole('student');
    if (window.history.pushState) {
      const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    }
  };

  // Handlers
  const handleGiveStars = async (payload: {
    studentId: string;
    deltaStars: number;
    reasonCategory: string;
    reasonNote: string;
  }) => {
    if (!appState) return;

    if (!navigator.onLine) {
      // Offline mode: queue operation and update local state optimistically
      offlineSync.enqueue('giveStars', {
        ...payload,
        createdBy: appState.classInfo.teacherName,
      });
      setAppState((prev) => {
        if (!prev) return prev;
        const target = prev.students.find((s) => s.id === payload.studentId);
        if (!target) return prev;
        const updatedStudent: Student = {
          ...target,
          totalEarnedStars: Math.max(0, target.totalEarnedStars + payload.deltaStars),
          spendableStars: Math.max(0, target.spendableStars + payload.deltaStars),
          weeklyStars: Math.max(0, (target.weeklyStars || 0) + payload.deltaStars),
        };
        const updatedStudents = prev.students.map((s) => (s.id === target.id ? updatedStudent : s));
        const tx: StarTransaction = {
          id: `tx_offline_${Date.now()}`,
          classId: prev.currentClassId,
          studentId: target.id,
          studentName: target.fullName,
          deltaStars: payload.deltaStars,
          teamId: target.teamId,
          reasonCategory: payload.reasonCategory,
          reasonNote: `[Chờ đồng bộ] ${payload.reasonNote}`,
          timestamp: new Date().toISOString(),
          createdBy: appState.classInfo.teacherName,
        };
        return {
          ...prev,
          students: updatedStudents,
          starTransactions: [tx, ...prev.starTransactions],
        };
      });
      return;
    }

    try {
      const res = await api.giveStars({
        ...payload,
        createdBy: appState.classInfo.teacherName,
      });
      setAppState((prev) => {
        if (!prev) return prev;
        const updatedStudents = prev.students.map((s) => (s.id === res.student.id ? res.student : s));
        return {
          ...prev,
          students: updatedStudents,
          teams: res.teams,
          starTransactions: [res.transaction, ...prev.starTransactions],
        };
      });
    } catch (err) {
      console.warn('api.giveStars failed, queuing offline:', err);
      offlineSync.enqueue('giveStars', {
        ...payload,
        createdBy: appState.classInfo.teacherName,
      });
    }
  };

  const handleBatchGiveStars = async (payload: {
    studentIds: string[];
    deltaStars: number;
    reasonCategory: string;
    reasonNote: string;
  }) => {
    if (!appState) return;
    const res = await api.batchGiveStars({
      ...payload,
      createdBy: appState.classInfo.teacherName,
    });
    setAppState((prev) => {
      if (!prev) return prev;
      const studentMap = new Map(res.students.map((s) => [s.id, s]));
      const updatedStudents = prev.students.map((s) => (studentMap.has(s.id) ? studentMap.get(s.id)! : s));
      return {
        ...prev,
        students: updatedStudents,
        teams: res.teams,
        starTransactions: [...res.transactions, ...prev.starTransactions],
      };
    });
  };

  const handleQuickStarReward = (_delta: number) => {
    setCurrentTab('students');
  };

  const handleResetDemo = async (mode: 'demo28' | 'empty') => {
    const data = await api.resetDemo(mode);
    setAppState(data);
  };

  const handleSaveSettings = async (settings: {
    school?: Partial<AppState['school']>;
    classInfo?: Partial<AppState['classInfo']>;
    kingdomAvatarUrl?: string;
  }) => {
    await api.updateSettings(settings);
    await fetchState();
  };

  const handleSwitchClass = async (classId: string) => {
    try {
      setLoading(true);
      await api.switchClass(classId);
      await fetchState();
    } catch (err) {
      console.error('Error switching class:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (data: any) => {
    try {
      setLoading(true);
      await api.createClass(data);
      await fetchState();
      playStarSound('win');
      triggerGrandCelebration();
      setTimeout(stopCelebration, 4000);
    } catch (err) {
      console.error('Error creating class:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string, confirmName?: string, permanent = false) => {
    try {
      setLoading(true);
      await api.deleteClass(classId, confirmName, permanent);
      await fetchState();
      playStarSound('click');
    } catch (err) {
      console.error('Error deleting class:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveClass = async (classId: string) => {
    try {
      setLoading(true);
      await api.archiveClass(classId);
      await fetchState();
      playStarSound('click');
    } catch (err) {
      console.error('Error archiving class:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClass = async (classId: string) => {
    try {
      setLoading(true);
      await api.restoreClass(classId);
      await fetchState();
      playStarSound('star');
    } catch (err) {
      console.error('Error restoring class:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  if (loading && !appState) {
    return (
      <div className="min-h-screen bg-[#F0F8FF] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full border-4 border-amber-300 border-t-amber-500 animate-spin mb-4"></div>
        <h2 className="text-xl font-black text-[#263C72] font-['Nunito',sans-serif]">
          Ms. Thao's Star Kingdom
        </h2>
        <p className="text-xs text-sky-600 font-bold mt-1">Đang kết nối Vương quốc ngôi sao...</p>
      </div>
    );
  }

  if (error || !appState) {
    return (
      <div className="min-h-screen bg-[#F0F8FF] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-md text-center shadow-lg border border-rose-200">
          <p className="text-sm font-bold text-rose-600 mb-3">{error || 'Không tải được dữ liệu'}</p>
          <button
            onClick={fetchState}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated, show grand Landing & Login Page
  if (!isAuthenticated) {
    return (
      <LoginPage
        students={appState.students}
        currentClass={appState.classInfo}
        school={appState.school}
        onTeacherLoginSuccess={async (userEmail, displayName, token) => {
          const uId = userEmail || 'teacher_thao';
          setCurrentUserInfo({ id: uId, email: userEmail, name: displayName || 'Cô Thảo' });
          try {
            localStorage.setItem(
              'starkingdom_auth',
              JSON.stringify({ authenticated: true, role: 'teacher', email: userEmail, displayName, userId: uId, token })
            );
          } catch (e) {
            // ignore
          }
          setAuthSessionRole('teacher');
          setCurrentRole('teacher');
          setIsAuthenticated(true);
          await fetchState();
        }}
        onStudentLoginSuccess={async (st, token) => {
          const uId = `student_${st.id}`;
          setCurrentUserInfo({ id: uId, name: st.fullName });
          try {
            localStorage.setItem(
              'starkingdom_auth',
              JSON.stringify({ authenticated: true, role: 'student', studentId: st.id, studentCode: st.studentCode, fullName: st.fullName, userId: uId, token })
            );
          } catch (e) {
            // ignore
          }
          setAuthSessionRole('student');
          setCurrentRole('student');
          setCurrentStudent(st);
          setIsAuthenticated(true);
          await fetchState();
        }}
        onGuestStudentAccess={async (token) => {
          const uId = 'student_guest';
          setCurrentUserInfo({ id: uId, name: 'Khách học sinh' });
          try {
            localStorage.setItem(
              'starkingdom_auth',
              JSON.stringify({ authenticated: true, role: 'guest', userId: uId, token })
            );
          } catch (e) {
            // ignore
          }
          setAuthSessionRole('guest');
          setCurrentRole('student');
          setCurrentStudent(null);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Current class notifications and dynamic unread count strictly for active user
  const currentClassNotifications = (appState.notifications || []).filter(
    (n) => n.classId === appState.currentClassId
  );
  const unreadCount = currentClassNotifications.filter((n) => !isNotificationRead(n.id)).length;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#87CEEB]/20 via-[#E0F2FE] to-[#FFF0F5] text-[#263C72]">
      {/* Top Header */}
      <Header
        school={appState.school}
        classInfo={appState.classInfo}
        classes={appState.classes}
        currentRole={currentRole}
        canSwitchRole={authSessionRole === 'teacher'}
        onToggleRole={() => {
          if (authSessionRole !== 'teacher') return;
          if (currentRole === 'teacher') {
            setCurrentRole('student');
          } else {
            setCurrentRole('teacher');
            setCurrentStudent(null);
          }
        }}
        onOpenSettings={() => setCurrentTab('settings')}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        onSwitchClass={authSessionRole === 'teacher' ? handleSwitchClass : undefined}
        onCreateClass={authSessionRole === 'teacher' ? () => setIsCreateClassOpen(true) : undefined}
        onDeleteClass={authSessionRole === 'teacher' ? (cls) => setHeaderClassToDelete(cls) : undefined}
        onOpenClassManagement={authSessionRole === 'teacher' ? () => setCurrentTab('teams') : undefined}
        kingdomAvatarUrl={appState.kingdomAvatarUrl}
        onUpdateKingdomAvatar={
          authSessionRole === 'teacher'
            ? async (avatarUrl: string) => {
                await api.updateKingdomAvatar(avatarUrl);
                setAppState((prev) => (prev ? { ...prev, kingdomAvatarUrl: avatarUrl } : null));
              }
            : undefined
        }
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex w-full min-w-0 p-2 md:p-3 gap-3">
        {/* Left Sidebar (Desktop / Tablet) */}
        {currentRole === 'teacher' && authSessionRole === 'teacher' && (
          <Sidebar
            currentTab={currentTab}
            onSelectTab={(tab) => setCurrentTab(tab)}
            menuCustomization={appState.menuCustomization}
            kingdomAvatarUrl={appState.kingdomAvatarUrl}
            sidebarMascotUrl={appState.sidebarMascotUrl}
            onUpdateKingdomAvatar={async (avatarUrl: string) => {
              await api.updateKingdomAvatar(avatarUrl);
              setAppState((prev) => (prev ? { ...prev, kingdomAvatarUrl: avatarUrl } : prev));
            }}
            onUpdateSidebarMascot={async (mascotUrl: string) => {
              await api.updateSidebarMascot(mascotUrl);
              setAppState((prev) => (prev ? { ...prev, sidebarMascotUrl: mascotUrl } : prev));
            }}
            className="hidden md:flex rounded-3xl overflow-hidden shadow-sm border border-sky-100"
          />
        )}

        {/* Content Area */}
        <main className="flex-1 w-full min-w-0 p-2 sm:p-4 md:p-5 overflow-y-auto pb-24 md:pb-8">
          {currentRole === 'student' || authSessionRole !== 'teacher' ? (
            /* Student Portal View */
            <StudentPortalView
              appState={appState}
              currentStudent={currentStudent}
              onLogin={async (code: string, pin: string) => {
                const res = await api.studentLogin(code, pin);
                const uId = `student_${res.student.id}`;
                setCurrentUserInfo({ id: uId, name: res.student.fullName });
                try {
                  localStorage.setItem(
                    'starkingdom_auth',
                    JSON.stringify({
                      authenticated: true,
                      role: 'student',
                      studentId: res.student.id,
                      studentCode: res.student.studentCode,
                      fullName: res.student.fullName,
                      userId: uId,
                      token: res.token,
                    })
                  );
                } catch {}
                setAuthSessionRole('student');
                setCurrentStudent(res.student);
                await fetchState();
              }}
              onLogout={() => {
                setCurrentStudent(null);
                handleLogout();
              }}
              onRedeemReward={async (rewardId: string, studentId: string) => {
                await api.redeemReward(rewardId, studentId);
                await fetchState();
              }}
              onExitPortal={handleLogout}
            />
          ) : (
            /* Teacher Admin View */
            <div className="space-y-4">
              {/* Grand Fairytale Castle Banner */}
              <HeroBanner
                classInfo={appState.classInfo}
                onChangeCover={() => setCurrentTab('settings')}
              />

              {/* 8 Colorful 3D Navigation Cards */}
              <NavigationCards
                currentTab={currentTab}
                onSelectTab={(tab) => setCurrentTab(tab)}
                menuCustomization={appState.menuCustomization}
              />

              {/* View Routing */}
              {currentTab === 'home' && (
                <HomeDashboard
                  appState={appState}
                  onNavigateTab={(tab) => setCurrentTab(tab)}
                  onNavigateTool={(toolTab) => {
                    setSelectedToolTab(toolTab);
                    setCurrentTab('tools');
                  }}
                  onNavigateLibraryCategory={(cat) => {
                    setSelectedLibraryCategory(cat);
                    setCurrentTab('library');
                  }}
                  onQuickStarReward={handleQuickStarReward}
                  onOpenBatchReward={() => setCurrentTab('students')}
                  onSelectStudent={(_st) => setCurrentTab('students')}
                />
              )}

              {currentTab === 'news' && (
                <ClassNewsView
                  news={appState.news}
                  students={appState.students}
                  onRefreshState={fetchState}
                  classInfo={appState.classInfo}
                  classes={appState.classes}
                  onPostNews={async (item) => {
                    await api.postNews(item);
                    await fetchState();
                  }}
                  onUpdateNews={async (id, updates) => {
                    await api.updateNews(id, updates);
                    await fetchState();
                  }}
                  onTogglePinNews={async (id) => {
                    await api.togglePinNews(id);
                    await fetchState();
                  }}
                  onDeleteNews={async (id, permanent, deletedBy) => {
                    await api.deleteNews(id, permanent, deletedBy);
                    await fetchState();
                  }}
                  onRestoreNews={async (id) => {
                    await api.restoreNews(id);
                    await fetchState();
                  }}
                  isTeacher={currentRole === 'teacher'}
                  currentTeacherName={appState.classInfo.teacherName}
                />
              )}

              {currentTab === 'teams' && (
                <ClassTeamsView
                  teams={appState.teams}
                  students={appState.students}
                  attendance={appState.attendance}
                  seatingChart={appState.seatingChart}
                  classes={appState.classes}
                  activeClassId={appState.currentClassId || appState.classInfo.id}
                  onSelectClass={handleSwitchClass}
                  onCreateClassModalOpen={() => setIsCreateClassOpen(true)}
                  onUpdateClass={async (id, updates) => {
                    const updated = await api.updateClass(id, updates);
                    await fetchState();
                    return updated;
                  }}
                  onArchiveClass={handleArchiveClass}
                  onRestoreClass={handleRestoreClass}
                  onDeleteClass={handleDeleteClass}
                  onTransitionClass={async (payload) => {
                    const res = await api.transitionClass({
                      sourceClassId: payload.sourceClassId,
                      newNameVi: payload.newClassName,
                      newGrade: payload.newGrade,
                      newSchoolYear: payload.newSchoolYear,
                      studentIdsToPromote: payload.studentIds,
                    });
                    await fetchState();
                    return res;
                  }}
                  onSaveAttendance={async (date: string, records: Record<string, string>, note?: string) => {
                    await api.saveAttendance(date, records, note);
                    await fetchState();
                  }}
                  onSaveSeatingChart={async (chart) => {
                    await api.saveSeatingChart(chart);
                    await fetchState();
                  }}
                  onAddTeamPoints={async (teamId, delta, reason) => {
                    await api.addTeamPoints(teamId, delta, reason);
                    await fetchState();
                  }}
                  onUpdateTeam={async (teamId, updates) => {
                    await api.updateTeam(teamId, updates);
                    await fetchState();
                  }}
                  onRefreshState={fetchState}
                  academicConfig={appState.academicConfig}
                  isTeacher={currentRole === 'teacher'}
                />
              )}

              {currentTab === 'students' && (
                <StudentsView
                  students={appState.students}
                  teams={appState.teams}
                  badges={appState.levelRules}
                  onAddStudent={async (st) => {
                    const created = await api.addStudent(st);
                    await fetchState();
                    return created;
                  }}
                  onImportStudents={async (list, clear) => {
                    const imported = await api.importStudents(list, clear);
                    await fetchState();
                    return imported;
                  }}
                  onUpdateStudent={async (id, updates) => {
                    const updated = await api.updateStudent(id, updates);
                    await fetchState();
                    return updated;
                  }}
                  onDeleteStudent={async (id) => {
                    const deletedId = await api.deleteStudent(id);
                    await fetchState();
                    return deletedId;
                  }}
                  onGiveStars={handleGiveStars}
                  onBatchGiveStars={handleBatchGiveStars}
                  onLoadDemoStudents={() => handleResetDemo('demo28')}
                  isTeacher={currentRole === 'teacher'}
                />
              )}

              {currentTab === 'rewards' && (
                <RewardsView
                  rewards={appState.rewards}
                  students={appState.students}
                  teams={appState.teams}
                  levelRules={appState.levelRules}
                  redemptions={appState.redemptions}
                  starTransactions={appState.starTransactions}
                  academicConfig={appState.academicConfig}
                  finalizedResults={appState.finalizedResults}
                  onRedeemReward={async (rewardId, studentId) => {
                    await api.redeemReward(rewardId, studentId);
                    await fetchState();
                  }}
                  onAddReward={async (rew) => {
                    const created = await api.addReward(rew);
                    await fetchState();
                    return created;
                  }}
                  onUpdateReward={async (id, updates) => {
                    const updated = await api.updateReward(id, updates);
                    await fetchState();
                    return updated;
                  }}
                  onDeleteReward={async (id) => {
                    await api.deleteReward(id);
                    await fetchState();
                  }}
                  onFinalizePeriod={async (snapshot) => {
                    const fin = await api.finalizeResults(snapshot);
                    await fetchState();
                    return fin;
                  }}
                  onUndoTransaction={async (txId) => {
                    await api.undoAuditLog(txId);
                    await fetchState();
                  }}
                  isTeacher={currentRole === 'teacher'}
                  currentStudent={currentStudent}
                />
              )}

              {currentTab === 'halloffame' && (
                <HallOfFameView
                  students={appState.students}
                  teams={appState.teams}
                  badges={appState.badges}
                  starTransactions={appState.starTransactions}
                  academicConfig={appState.academicConfig}
                  school={appState.school}
                  classInfo={appState.classInfo}
                />
              )}

              {currentTab === 'tools' && (
                <ClassroomToolsView
                  students={appState.students}
                  teams={appState.teams}
                  onGiveStars={handleGiveStars}
                  initialTab={selectedToolTab}
                />
              )}

              {currentTab === 'library' && (
                <LearningLibraryView
                  resources={appState.learningResources}
                  selectedCategory={selectedLibraryCategory}
                  onAddResource={async (res) => {
                    await api.addResource(res);
                    await fetchState();
                  }}
                  onDeleteResource={async (id) => {
                    await api.deleteResource(id);
                    await fetchState();
                  }}
                  isTeacher={currentRole === 'teacher'}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsBackupView
                  school={appState.school}
                  classInfo={appState.classInfo}
                  classes={appState.classes}
                  levelRules={appState.levelRules}
                  students={appState.students}
                  teams={appState.teams}
                  menuCustomization={appState.menuCustomization}
                  kingdomAvatarUrl={appState.kingdomAvatarUrl}
                  sidebarMascotUrl={appState.sidebarMascotUrl}
                  fullState={appState}
                  academicConfig={appState.academicConfig}
                  onUpdateAcademicConfig={async (cfg) => {
                    await api.updateAcademicConfig(cfg);
                    await fetchState();
                  }}
                  auditLogs={appState.auditLogs}
                  onUndoAuditLog={async (logId) => {
                    await api.undoAuditLog(logId);
                    await fetchState();
                  }}
                  onSaveSettings={handleSaveSettings}
                  onUpdateKingdomAvatar={async (avatarUrl: string) => {
                    await api.updateKingdomAvatar(avatarUrl);
                    setAppState((prev) => (prev ? { ...prev, kingdomAvatarUrl: avatarUrl } : null));
                  }}
                  onUpdateSidebarMascot={async (mascotUrl: string) => {
                    await api.updateSidebarMascot(mascotUrl);
                    setAppState((prev) => (prev ? { ...prev, sidebarMascotUrl: mascotUrl } : null));
                  }}
                  onUpdateSchoolLogo={async (logoUrl: string) => {
                    await api.updateSchoolLogo(logoUrl);
                    setAppState((prev) => (prev ? { ...prev, school: { ...prev.school, logoUrl } } : null));
                  }}
                  onSaveMenuCustomization={async (customs) => {
                    await api.saveMenuCustomization(customs);
                    await fetchState();
                  }}
                  onSwitchClass={handleSwitchClass}
                  onCreateClass={() => setIsCreateClassOpen(true)}
                  onDeleteClass={handleDeleteClass}
                  onArchiveClass={handleArchiveClass}
                  onRestoreClass={handleRestoreClass}
                  onResetDemo={handleResetDemo}
                  onRefreshState={fetchState}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Matching phone mockup exactly: 5 items) */}
      {currentRole === 'teacher' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-sky-100 shadow-lg px-2 py-1.5 flex items-center justify-around">
          {[
            { id: 'home' as NavTab, label: 'Trang chủ', en: 'Home', icon: HomeIcon },
            { id: 'news' as NavTab, label: 'Bảng tin lớp', en: 'News', icon: Megaphone },
            { id: 'teams' as NavTab, label: 'Lớp và tổ', en: 'Teams', icon: Users },
            { id: 'rewards' as NavTab, label: 'Thưởng sao', en: 'Rewards', icon: Star },
            { id: 'tools' as NavTab, label: 'Bộ công cụ', en: 'Tools', icon: Briefcase },
          ].map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            const custom = appState.menuCustomization?.[item.id];
            const labelVi = custom?.titleVi || item.label;
            const labelEn = custom?.titleEn || item.en;

            return (
              <button
                key={item.id}
                onClick={() => {
                  playStarSound('click');
                  setCurrentTab(item.id);
                }}
                className={`flex flex-col items-center justify-center p-1 rounded-xl transition cursor-pointer ${
                  isActive ? 'text-sky-600 font-black' : 'text-slate-400 font-semibold'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] leading-tight mt-0.5 truncate max-w-[65px]">{labelVi}</span>
                <span className="text-[8px] opacity-70 leading-none truncate max-w-[65px]">{labelEn}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile Slide-Out Drawer for 8 menus + Settings */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-2xs animate-fade-in md:hidden">
          <div className="bg-white w-72 h-full shadow-2xl p-4 flex flex-col justify-between animate-scale-in">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white ring-2 ring-sky-300 shadow-xs bg-sky-50 shrink-0">
                    <img
                      src={appState.kingdomAvatarUrl || '/assets/kingdom/sidebar_logo.png'}
                      alt="Kingdom Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/kingdom/sidebar_logo.png';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-[#263C72] truncate">Ms. Thao's Star Kingdom</h3>
                    <p className="text-[10px] text-sky-600 font-bold truncate">
                      {appState.classInfo.nameVi} · {appState.school.nameVi}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* 8 Menus */}
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = currentTab === item.id;
                  const custom = appState.menuCustomization?.[item.id];
                  const titleVi = custom?.titleVi || item.titleVi;
                  const titleEn = custom?.titleEn || item.titleEn;
                  const iconUrl = custom?.iconUrl;
                  const customEmoji = custom?.presetIcon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        playStarSound('click');
                        setCurrentTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl font-bold text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'text-[#263C72] hover:bg-sky-50'
                      }`}
                    >
                      <MenuIcon id={item.iconKey} size={24} customUrl={iconUrl} customEmoji={customEmoji} />
                      <div className="min-w-0">
                        <span className="text-xs font-black block truncate">{titleVi}</span>
                        <span className="text-[9px] block opacity-80 truncate">{titleEn}</span>
                      </div>
                    </button>
                  );
                })}

                {/* Settings in Mobile drawer */}
                {(() => {
                  const customSettings = appState.menuCustomization?.['settings'];
                  const settingsVi = customSettings?.titleVi || settingsItem.titleVi;
                  const settingsEn = customSettings?.titleEn || settingsItem.titleEn;
                  const settingsUrl = customSettings?.iconUrl;
                  const settingsEmoji = customSettings?.presetIcon;

                  return (
                    <button
                      onClick={() => {
                        playStarSound('click');
                        setCurrentTab('settings');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl font-bold text-left transition cursor-pointer mt-2 border-t border-slate-100 pt-2 ${
                        currentTab === 'settings'
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <MenuIcon id="settings" size={24} customUrl={settingsUrl} customEmoji={settingsEmoji} />
                      <div className="min-w-0">
                        <span className="text-xs font-black block truncate">{settingsVi}</span>
                        <span className="text-[9px] block opacity-80 truncate">{settingsEn}</span>
                      </div>
                    </button>
                  );
                })()}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setIsCreateClassOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-black cursor-pointer text-center shadow-xs"
              >
                + Tạo lớp mới / New Class
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Create New Class Modal */}
      {isCreateClassOpen && (
        <CreateClassModal
          onClose={() => setIsCreateClassOpen(false)}
          onSubmit={handleCreateClass}
        />
      )}

      {/* Delete / Archive Class Modal from Header */}
      {headerClassToDelete && appState && (
        <DeleteClassModal
          classInfo={headerClassToDelete}
          totalClassesCount={appState.classes.length}
          studentCount={appState.students.filter((s) => s.classId === headerClassToDelete.id).length || headerClassToDelete.targetSize}
          onClose={() => setHeaderClassToDelete(null)}
          onConfirmArchive={handleArchiveClass}
          onConfirmPermanentDelete={(cId, confirmName) => handleDeleteClass(cId, confirmName, true)}
        />
      )}

      {/* Real-time Toast Notifications with 4-second auto-dismiss for success & manual for error */}
      <ToastNotification
        toasts={activeToasts}
        onDismiss={handleDismissToast}
        onOpenDetail={handleOpenNotification}
      />

      {/* Notifications Drawer (Bell icon side-panel) */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={currentClassNotifications}
        isNotificationRead={isNotificationRead}
        onOpenNotification={handleOpenNotification}
        onMarkAllAsRead={async () => {
          try {
            await api.markAllNotificationsAsRead(currentUserId, appState.currentClassId);
            setReadNotificationIds(new Set(currentClassNotifications.map((n) => n.id)));
          } catch (e) {
            console.error('Failed to mark all as read:', e);
          }
        }}
      />

      {/* Notification Detail Modal (Automatically marks notification as read when viewed) */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={handleMarkNotificationAsRead}
        onNavigateTab={(tab) => {
          setCurrentTab(tab as NavTab);
          setSelectedNotification(null);
          setIsNotificationsOpen(false);
        }}
      />


      {/* Classroom & Student QR Code Generator Modal */}
      {isQrModalOpen && appState && (
        <ClassQRCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          currentClass={appState.classInfo}
          school={appState.school}
          students={appState.students}
        />
      )}
    </div>
  );
}
