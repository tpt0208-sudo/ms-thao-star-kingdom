import React, { useEffect } from 'react';
import { AppNotification } from '../types';
import {
  Star,
  Megaphone,
  Trophy,
  Gift,
  ClipboardList,
  Sparkles,
  AlertTriangle,
  X,
  ArrowRight,
} from 'lucide-react';

export interface ActiveToast {
  id: string;
  notification: AppNotification;
  createdAt: number;
}

interface ToastNotificationProps {
  toasts: ActiveToast[];
  onDismiss: (toastId: string) => void;
  onOpenDetail: (notification: AppNotification) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toasts,
  onDismiss,
  onOpenDetail,
}) => {
  return (
    <aside
      aria-label="Thông báo nổi"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((toast) => (
        <SingleToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </aside>
  );
};

interface SingleToastItemProps {
  toast: ActiveToast;
  onDismiss: (toastId: string) => void;
  onOpenDetail: (notification: AppNotification) => void;
}

const SingleToastItem: React.FC<SingleToastItemProps> = ({
  toast,
  onDismiss,
  onOpenDetail,
}) => {
  const { notification, id } = toast;
  const severity = notification.metadata?.severity || 'normal';
  const isCritical = severity === 'error' || severity === 'warning';

  // Rule: Success / Normal notifications automatically disappear after ~4 seconds (4000ms).
  // Critical errors or confirmations do NOT auto-dismiss.
  useEffect(() => {
    if (!isCritical) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [id, isCritical, onDismiss]);

  const renderIcon = () => {
    switch (notification.type) {
      case 'star':
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-amber-200">
            <Star className="w-4 h-4 fill-white stroke-amber-600" />
          </div>
        );
      case 'news':
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-sky-200">
            <Megaphone className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case 'celebration':
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-emerald-200">
            <Trophy className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case 'reward':
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-purple-200">
            <Gift className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      default:
        if (severity === 'error') {
          return (
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
          );
        }
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
    }
  };

  return (
    <div
      onClick={() => {
        onOpenDetail(notification);
        onDismiss(id);
      }}
      className={`pointer-events-auto rounded-2xl shadow-xl p-3.5 border transition cursor-pointer group animate-fade-in relative overflow-hidden backdrop-blur-md ${
        severity === 'error'
          ? 'bg-rose-50/95 border-rose-300 text-rose-950'
          : severity === 'warning'
          ? 'bg-amber-50/95 border-amber-300 text-amber-950'
          : 'bg-white/95 border-sky-200 text-[#263C72] hover:border-sky-400 hover:shadow-2xl'
      }`}
    >
      {/* 4-second animated progress bar for auto-closing notifications */}
      {!isCritical && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-sky-400"
          style={{
            animation: 'shrinkWidth 4s linear forwards',
          }}
        />
      )}

      <div className="flex items-start gap-3">
        {renderIcon()}

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.2 rounded-full border border-sky-100">
              Thông báo mới · New
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>

          <h5 className="text-xs font-black truncate leading-snug group-hover:text-sky-600 transition-colors">
            {notification.titleVi}
          </h5>

          <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 font-medium leading-tight">
            {notification.messageVi}
          </p>

          <div className="flex items-center gap-1 text-[10px] font-bold text-sky-600 mt-1.5">
            <span>Mở xem chi tiết · Click to view</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Close 'X' button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
        className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        title="Đóng / Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
