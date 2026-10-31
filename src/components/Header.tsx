import React, { useState, useRef, useEffect } from 'react';
import { SchoolInfo, ClassInfo, Role } from '../types';
import { Bell, Settings, UserCircle, Calendar, Menu, Plus, ChevronDown, Check, Camera, Trash2, QrCode, LogOut } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';

interface HeaderProps {
  school: SchoolInfo;
  classInfo: ClassInfo;
  classes?: ClassInfo[];
  currentRole: Role;
  canSwitchRole?: boolean;
  onToggleRole: () => void;
  onOpenSettings: () => void;
  unreadCount?: number;
  onOpenNotifications: () => void;
  onOpenQuickDemo?: () => void;
  onToggleMobileMenu?: () => void;
  onSwitchClass?: (classId: string) => void;
  onCreateClass?: () => void;
  onDeleteClass?: (cls: ClassInfo) => void;
  onOpenClassManagement?: () => void;
  kingdomAvatarUrl?: string;
  onUpdateKingdomAvatar?: (avatarUrl: string) => Promise<void>;
  onOpenQrModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  school,
  classInfo,
  classes = [],
  currentRole,
  canSwitchRole = false,
  onToggleRole,
  onOpenSettings,
  unreadCount = 1,
  onOpenNotifications,
  onToggleMobileMenu,
  onSwitchClass,
  onCreateClass,
  onDeleteClass,
  onOpenClassManagement,
  kingdomAvatarUrl,
  onUpdateKingdomAvatar,
  onOpenQrModal,
  onLogout,
}) => {
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsClassDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs px-3 sm:px-6 py-2.5 transition-all">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left: Mobile Menu Button & School Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Hamburger Button */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-2xl bg-sky-50 hover:bg-sky-100 text-[#263C72] transition cursor-pointer"
              title="Menu vương quốc"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}

          {/* School Emblem (Logo) */}
          <div className="relative shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shadow-xs ring-2 ring-emerald-500/30 bg-white flex items-center justify-center p-0.5">
            <img
              src={school.logoUrl || '/assets/kingdom/school_logo_v2.png'}
              alt={school.nameVi}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/kingdom/school_logo_v2.png';
              }}
            />
          </div>

          {/* School Title */}
          <div className="min-w-0 leading-tight">
            <h1 className="text-[13.5px] sm:text-[15px] font-black text-[#263C72] tracking-tight truncate">
              {school.nameVi}
            </h1>
            <p className="text-[11.5px] sm:text-[12.5px] text-slate-600 font-bold truncate hidden sm:block mt-0.5">
              {school.nameEn}
            </p>
          </div>

          <div className="h-7 w-[1px] bg-slate-200 hidden md:block mx-1"></div>

          {/* Class Selector Dropdown matching Mockup */}
          <div className="relative hidden md:block" ref={dropdownRef}>
            <button
              onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#EBF7FF] border border-sky-200 hover:border-sky-400 shadow-2xs transition cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center text-xs shadow-2xs shrink-0">
                🎒
              </div>
              <div className="text-left leading-tight">
                <span className="text-[14px] font-black text-[#263C72] flex items-center gap-1">
                  {classInfo.nameVi}
                  <ChevronDown className={`w-3.5 h-3.5 text-sky-600 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                </span>
                <span className="text-[12px] text-sky-700 font-bold block">{classInfo.nameEn}</span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isClassDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-sky-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3.5 py-1.5 border-b border-slate-100 leading-tight">
                  <span className="block text-[13px] font-black uppercase tracking-wider text-slate-700">
                    Danh sách lớp học ({classes.length || 1})
                  </span>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Classroom List ({classes.length || 1})
                  </span>
                </div>
                {classes.map((cls) => {
                  const isSelected = cls.id === classInfo.id;
                  return (
                    <div
                      key={cls.id}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-bold transition group ${
                        isSelected ? 'bg-sky-50 text-sky-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <button
                        onClick={() => {
                          onSwitchClass?.(cls.id);
                          setIsClassDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 flex-1 text-left cursor-pointer min-w-0"
                      >
                        <span className="text-sm shrink-0">🏰</span>
                        <div className="min-w-0 leading-tight">
                          <div className="text-[14px] font-black text-[#263C72] truncate">{cls.nameVi}</div>
                          <div className="text-[12px] text-slate-600 font-bold truncate">{cls.nameEn} • Khối/Grade {cls.grade}</div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {isSelected ? (
                          <Check className="w-4 h-4 text-sky-600" />
                        ) : (
                          onDeleteClass && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsClassDropdownOpen(false);
                                onDeleteClass(cls);
                              }}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title={`Xóa hoặc lưu kho ${cls.nameVi} / Delete or Archive`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="p-2 border-t border-slate-100 mt-1 space-y-1.5">
                  {onCreateClass && (
                    <button
                      onClick={() => {
                        setIsClassDropdownOpen(false);
                        onCreateClass();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-2xs transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3] shrink-0" />
                      <div className="text-left leading-tight">
                        <span className="block text-[13.5px] font-black text-white">Thêm lớp mới</span>
                        <span className="block text-[11.5px] font-bold text-sky-100">Create New Class</span>
                      </div>
                    </button>
                  )}

                  {onOpenClassManagement && (
                    <button
                      onClick={() => {
                        setIsClassDropdownOpen(false);
                        onOpenClassManagement();
                      }}
                      className="w-full flex flex-col items-center justify-center px-2 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-sky-700 transition cursor-pointer leading-tight"
                    >
                      <span className="text-[13px] font-black">Quản lý & xóa các lớp</span>
                      <span className="text-[11.5px] font-bold text-slate-500">Manage & Delete Classes</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* "+ Tạo lớp mới / Create New Class" Blue Button directly matching mockup */}
          {currentRole === 'teacher' && onCreateClass && (
            <button
              onClick={onCreateClass}
              className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white shadow-sm shadow-blue-300/50 hover:shadow-md transition active:scale-95 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
              </div>
              <div className="text-left leading-tight">
                <span className="text-[14px] font-black text-white block">Tạo lớp mới</span>
                <span className="text-[11.5px] text-blue-100 font-bold block">Create New Class</span>
              </div>
            </button>
          )}

          {/* School Year Badge matching mockup */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-sky-50/90 border border-sky-200 shadow-2xs">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <div className="text-left leading-tight">
              <span className="text-[13.5px] font-black text-sky-950 block">Năm học {classInfo.schoolYear}</span>
              <span className="text-[11.5px] text-sky-700 font-bold block">School Year: {classInfo.schoolYear}</span>
            </div>
          </div>
        </div>

        {/* Right Controls: Notifications, Teacher Avatar & Portal Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Notification Bell with dynamic unread badge */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full hover:bg-slate-100 text-slate-700 transition cursor-pointer"
            title={`Thông báo / Notifications${unreadCount > 0 ? ` (${unreadCount} chưa đọc / unread)` : ''}`}
            aria-label="Thông báo / Notifications"
          >
            <Bell className="w-5 h-5 text-[#263C72]" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-white shadow-xs animate-scale-in">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Portal Switch (Only available when authenticated as Teacher so Students/Guests cannot elevate privileges) */}
          {canSwitchRole && (
            <button
              onClick={onToggleRole}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl transition shadow-2xs cursor-pointer ${
                currentRole === 'teacher'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200'
                  : 'bg-emerald-100 text-emerald-950 border border-emerald-300 hover:bg-emerald-200'
              }`}
            >
              <UserCircle className="w-4 h-4 shrink-0" />
              <div className="hidden sm:block text-left leading-tight">
                <span className="block text-[13px] font-black">
                  {currentRole === 'teacher' ? 'Cổng Giáo Viên' : 'Cổng Học Sinh'}
                </span>
                <span className="block text-[11px] font-bold opacity-85">
                  {currentRole === 'teacher' ? 'Teacher Portal' : 'Student Portal'}
                </span>
              </div>
            </button>
          )}

          {/* Kingdom Avatar & Teacher Name (Circular, matching Sidebar Kingdom Avatar) */}
          {currentRole === 'teacher' ? (
            <div className="flex items-center gap-2 pl-1">
              <div
                onClick={() => onUpdateKingdomAvatar && setIsAvatarCropOpen(true)}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-amber-400 shadow-xs cursor-pointer group shrink-0"
                title="Thay đổi ảnh đại diện vương quốc / Change Kingdom Avatar"
              >
                <img
                  src={kingdomAvatarUrl || '/assets/kingdom/teacher_avatar.png'}
                  alt={classInfo.teacherName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/kingdom/teacher_avatar.png';
                  }}
                />
                {onUpdateKingdomAvatar && (
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <div className="text-left hidden md:block leading-tight">
                <p className="text-[14px] font-black text-[#263C72]">{classInfo.teacherName}</p>
                <p className="text-[12px] font-bold text-slate-600">{classInfo.teacherTitleEn}</p>
              </div>
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 leading-tight">
              <span className="block text-[13px] font-black">Em học sinh</span>
              <span className="block text-[11px] font-bold text-emerald-700">Student</span>
            </div>
          )}

          {/* Class QR Code Generator Modal button */}
          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 transition cursor-pointer shadow-2xs"
              title="Mã QR Cổng Học Sinh & Thẻ Học Sinh / Student Portal & Card QR"
            >
              <QrCode className="w-4 h-4 text-sky-700 shrink-0" />
              <div className="hidden md:block text-left leading-tight">
                <span className="block text-[13px] font-black text-sky-950">Mã QR Lớp</span>
                <span className="block text-[11px] font-bold text-sky-700">Class QR</span>
              </div>
            </button>
          )}

          {/* Settings */}
          {currentRole === 'teacher' && (
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition cursor-pointer ml-0.5"
              title="Cài đặt lớp học"
            >
              <Settings className="w-5 h-5 text-slate-600 hover:rotate-45 transition-transform" />
            </button>
          )}

          {/* Logout / Back to Login Page */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer ml-0.5"
              title="Đăng xuất / Trang đầu đăng nhập"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Kingdom Avatar Crop Modal for Header */}
      {onUpdateKingdomAvatar && (
        <ImageCropModal
          isOpen={isAvatarCropOpen}
          onClose={() => setIsAvatarCropOpen(false)}
          title="Ảnh đại diện Vương quốc"
          subtitle="Tải ảnh lên, thu phóng, căn chỉnh vị trí và lưu ảnh đại diện tròn đồng bộ Header & Sidebar"
          currentImage={kingdomAvatarUrl}
          defaultImage="/assets/kingdom/teacher_avatar.png"
          shape="circle"
          onSave={async (dataUrl) => {
            await onUpdateKingdomAvatar(dataUrl);
            setIsAvatarCropOpen(false);
          }}
          onResetDefault={async () => {
            await onUpdateKingdomAvatar('/assets/kingdom/teacher_avatar.png');
            setIsAvatarCropOpen(false);
          }}
        />
      )}
    </header>
  );
};
