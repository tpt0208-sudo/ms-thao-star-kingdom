import React, { useState } from 'react';
import { AppNotification } from '../types';
import {
  Bell,
  X,
  Star,
  Megaphone,
  Trophy,
  Gift,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  Inbox,
  Filter,
  Eye,
  ChevronRight,
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  isNotificationRead: (notificationId: string) => boolean;
  onOpenNotification: (notification: AppNotification) => void;
  onMarkAllAsRead?: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  isNotificationRead,
  onOpenNotification,
  onMarkAllAsRead,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  if (!isOpen) return null;

  // Compute unread and read lists
  const unreadCount = notifications.filter((n) => !isNotificationRead(n.id)).length;
  const readCount = notifications.length - unreadCount;

  const filteredNotifications = notifications.filter((n) => {
    const isRead = isNotificationRead(n.id);
    if (filter === 'unread') return !isRead;
    if (filter === 'read') return isRead;
    return true; // 'all'
  });

  const renderIcon = (type: string, isRead: boolean) => {
    const sizeClasses = 'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs';
    switch (type) {
      case 'star':
        return (
          <div className={`${sizeClasses} ${isRead ? 'bg-amber-100/70 text-amber-700' : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white ring-2 ring-amber-200 shadow-sm'}`}>
            <Star className={`w-4 h-4 ${isRead ? 'fill-amber-400 stroke-amber-500' : 'fill-white stroke-amber-600'}`} />
          </div>
        );
      case 'news':
        return (
          <div className={`${sizeClasses} ${isRead ? 'bg-sky-100/70 text-sky-700' : 'bg-gradient-to-br from-sky-400 to-blue-500 text-white ring-2 ring-sky-200 shadow-sm'}`}>
            <Megaphone className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case 'celebration':
        return (
          <div className={`${sizeClasses} ${isRead ? 'bg-emerald-100/70 text-emerald-700' : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white ring-2 ring-emerald-200 shadow-sm'}`}>
            <Trophy className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case 'reward':
        return (
          <div className={`${sizeClasses} ${isRead ? 'bg-purple-100/70 text-purple-700' : 'bg-gradient-to-br from-purple-400 to-pink-500 text-white ring-2 ring-purple-200 shadow-sm'}`}>
            <Gift className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case 'attendance':
        return (
          <div className={`${sizeClasses} ${isRead ? 'bg-teal-100/70 text-teal-700' : 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white ring-2 ring-teal-200 shadow-sm'}`}>
            <ClipboardList className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      default:
        return (
          <div className={`${sizeClasses} ${isRead ? 'bg-slate-100 text-slate-600' : 'bg-gradient-to-br from-indigo-400 to-blue-500 text-white ring-2 ring-indigo-200 shadow-sm'}`}>
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Vừa xong · Just now';
      if (diffMins < 60) return `${diffMins} phút trước · ${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours} giờ trước · ${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays} ngày trước · ${diffDays}d ago`;
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-fade-in">
      <div
        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-amber-50/50">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-white flex items-center justify-center shadow-xs">
                <Bell className="w-5 h-5 fill-white stroke-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#263C72] flex items-center gap-2 leading-tight">
                  <span>Thông báo</span>
                  <span className="text-xs font-bold text-slate-400">/ Notifications</span>
                </h3>
                <p className="text-[11px] text-sky-700 font-bold">
                  {unreadCount > 0 ? (
                    <span className="text-amber-600">Có {unreadCount} thông báo chưa đọc · {unreadCount} unread</span>
                  ) : (
                    <span className="text-emerald-600">Đã cập nhật tất cả thông báo · All caught up!</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition cursor-pointer"
              title="Đóng / Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-sky-50/80 border border-sky-100 text-xs font-black">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                filter === 'all'
                  ? 'bg-white text-[#263C72] shadow-xs'
                  : 'text-slate-500 hover:text-[#263C72]'
              }`}
            >
              <span>Xem tất cả</span>
              <span className="text-[10px] opacity-70">/ All</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                {notifications.length}
              </span>
            </button>

            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                filter === 'unread'
                  ? 'bg-white text-amber-900 shadow-xs ring-1 ring-amber-200'
                  : 'text-slate-500 hover:text-amber-800'
              }`}
            >
              <span>Chưa đọc</span>
              <span className="text-[10px] opacity-70">/ Unread</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-black animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilter('read')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                filter === 'read'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Đã đọc</span>
              <span className="text-[10px] opacity-70">/ Read</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                {readCount}
              </span>
            </button>
          </div>
        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-400 flex items-center justify-center ring-8 ring-sky-50/50">
                <Inbox className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#263C72]">
                  {filter === 'unread'
                    ? 'Không có thông báo chưa đọc'
                    : 'Không có thông báo mới'}
                </h4>
                <p className="text-xs text-slate-400 font-bold mt-1 max-w-xs">
                  {filter === 'unread'
                    ? 'Bạn đã đọc toàn bộ thông báo. / You have read all notifications.'
                    : 'Chưa có thông báo nào được ghi nhận. / No notifications found.'}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isRead = isNotificationRead(notif.id);

              return (
                <div
                  key={notif.id}
                  onClick={() => onOpenNotification(notif)}
                  className={`w-full text-left p-3.5 rounded-2xl transition cursor-pointer group relative ${
                    isRead
                      ? 'bg-white/80 border border-slate-200/80 hover:bg-slate-50/90 text-slate-600'
                      : 'bg-gradient-to-r from-amber-50/95 via-sky-50/50 to-amber-50/80 border-2 border-amber-300/80 hover:border-amber-400 shadow-xs hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Themed Icon */}
                    {renderIcon(notif.type, isRead)}

                    {/* Content text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 truncate">
                          {formatRelativeTime(notif.timestamp)}
                        </span>

                        {/* Unread indicator / Read status tag */}
                        {isRead ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                            Đã đọc · Read
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Prominent glowing/pulsing amber or emerald dot for unread */}
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-200 animate-pulse shrink-0"
                              title="Chưa đọc / Unread"
                            />
                            <span className="text-[10px] font-black text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full">
                              Chưa đọc · Unread
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notification Title */}
                      <h4
                        className={`text-xs leading-snug line-clamp-1 group-hover:text-sky-700 transition-colors ${
                          isRead ? 'font-bold text-slate-800' : 'font-black text-[#263C72]'
                        }`}
                      >
                        {notif.titleVi}
                      </h4>

                      {/* Snippet message */}
                      <p
                        className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${
                          isRead ? 'text-slate-500 font-normal' : 'text-slate-700 font-medium'
                        }`}
                      >
                        {notif.messageVi}
                      </p>

                      {/* Hint to open details */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/80 text-[10px]">
                        <span className="text-slate-400 font-semibold truncate">
                          {notif.authorName || 'Vương quốc sao'}
                        </span>
                        <span className="text-sky-600 font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                          <span>Xem chi tiết · View</span>
                          <ChevronRight className="w-3 h-3 stroke-[3]" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          {onMarkAllAsRead && unreadCount > 0 ? (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs font-bold text-sky-700 hover:text-sky-900 transition cursor-pointer px-2 py-1 rounded-xl hover:bg-sky-100"
            >
              Đánh dấu tất cả đã đọc
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 font-medium px-2">
              Lịch sử được lưu tự động
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer transition shadow-2xs"
          >
            Đóng · Close
          </button>
        </div>
      </div>
    </div>
  );
};
