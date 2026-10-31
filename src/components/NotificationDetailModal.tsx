import React, { useEffect } from 'react';
import { AppNotification } from '../types';
import {
  X,
  Star,
  Megaphone,
  Trophy,
  Gift,
  ClipboardList,
  Sparkles,
  Bell,
  CheckCircle2,
  Calendar,
  User,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface NotificationDetailModalProps {
  notification: AppNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onNavigateTab,
}) => {
  // CRITICAL: When the user opens and views the content of a notification,
  // automatically mark it as read immediately without needing to click any extra button!
  useEffect(() => {
    if (isOpen && notification) {
      onMarkAsRead(notification.id);
    }
  }, [isOpen, notification?.id]);

  if (!isOpen || !notification) return null;

  // Render appropriate themed icon based on type
  const renderIcon = () => {
    switch (notification.type) {
      case 'star':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shadow-md shadow-amber-200 ring-4 ring-amber-100">
            <Star className="w-6 h-6 fill-white stroke-amber-600" />
          </div>
        );
      case 'news':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white flex items-center justify-center shadow-md shadow-sky-200 ring-4 ring-sky-100">
            <Megaphone className="w-6 h-6 stroke-[2.5]" />
          </div>
        );
      case 'celebration':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-200 ring-4 ring-emerald-100">
            <Trophy className="w-6 h-6 stroke-[2.5]" />
          </div>
        );
      case 'reward':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-200 ring-4 ring-purple-100">
            <Gift className="w-6 h-6 stroke-[2.5]" />
          </div>
        );
      case 'attendance':
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-teal-200 ring-4 ring-teal-100">
            <ClipboardList className="w-6 h-6 stroke-[2.5]" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-200 ring-4 ring-indigo-100">
            <Sparkles className="w-6 h-6 stroke-[2.5]" />
          </div>
        );
    }
  };

  const formattedTime = new Date(notification.timestamp).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const categoryLabelVi =
    notification.type === 'star'
      ? 'Thưởng sao vương quốc'
      : notification.type === 'news'
      ? 'Bảng tin lớp học'
      : notification.type === 'celebration'
      ? 'Vinh danh & Thi đua'
      : notification.type === 'reward'
      ? 'Đổi quà thưởng'
      : notification.type === 'attendance'
      ? 'Điểm danh chuyên cần'
      : 'Thông báo hệ thống';

  const categoryLabelEn =
    notification.type === 'star'
      ? 'Star Reward'
      : notification.type === 'news'
      ? 'Class News'
      : notification.type === 'celebration'
      ? 'Honors & Contest'
      : notification.type === 'reward'
      ? 'Reward Catalog'
      : notification.type === 'attendance'
      ? 'Attendance Record'
      : 'System Notice';

  const hasTargetTab = notification.metadata?.linkTab;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-sky-100 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Star Kingdom theme */}
        <div className="bg-gradient-to-r from-sky-50 via-amber-50/50 to-pink-50 p-5 border-b border-sky-100 flex items-start justify-between gap-3 relative">
          <div className="flex items-start gap-3.5 min-w-0">
            {renderIcon()}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                  {categoryLabelVi} · {categoryLabelEn}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Đã đọc · Read</span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#263C72] leading-snug">
                {notification.titleVi}
              </h3>
              {notification.titleEn && notification.titleEn !== notification.titleVi && (
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  {notification.titleEn}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0 shadow-2xs"
            title="Đóng / Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Main Message (Vietnamese) */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
            <p className="text-sm font-bold text-[#263C72] leading-relaxed whitespace-pre-wrap">
              {notification.messageVi}
            </p>
            {notification.messageEn && (
              <p className="text-xs font-semibold text-slate-500 leading-relaxed mt-2.5 pt-2.5 border-t border-slate-200/70 whitespace-pre-wrap">
                {notification.messageEn}
              </p>
            )}
          </div>

          {/* Metadata Cards */}
          {notification.metadata && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {notification.metadata.studentName && (
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                    ⭐
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-amber-700 block uppercase tracking-wider">
                      Học sinh · Student
                    </span>
                    <span className="text-xs font-black text-slate-800 truncate block">
                      {notification.metadata.studentName}
                    </span>
                  </div>
                </div>
              )}

              {notification.metadata.deltaStars !== undefined && (
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                    +{notification.metadata.deltaStars}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-amber-700 block uppercase tracking-wider">
                      Điểm sao · Stars
                    </span>
                    <span className="text-xs font-black text-amber-900 block">
                      {notification.metadata.deltaStars > 0 ? `+${notification.metadata.deltaStars}` : notification.metadata.deltaStars} Sao vương quốc
                    </span>
                  </div>
                </div>
              )}

              {notification.metadata.teamName && (
                <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200/70 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs shrink-0">
                    🚩
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-sky-700 block uppercase tracking-wider">
                      Tổ thi đua · Team
                    </span>
                    <span className="text-xs font-black text-slate-800 truncate block">
                      {notification.metadata.teamName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info footer metadata: Time & Author */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedTime}</span>
            </div>
            {notification.authorName && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-600">{notification.authorName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition cursor-pointer shadow-2xs"
          >
            Đóng · Close
          </button>

          {hasTargetTab && onNavigateTab && (
            <button
              onClick={() => {
                onNavigateTab(notification.metadata!.linkTab!);
                onClose();
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-xs transition cursor-pointer shadow-md shadow-sky-200 flex items-center gap-1.5"
            >
              <span>Xem chi tiết · View Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
