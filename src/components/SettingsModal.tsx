import React, { useState } from 'react';
import { SchoolInfo, ClassInfo } from '../types';
import {
  Settings,
  X,
  Save,
  Image,
  Sparkles,
  Trash2,
  School,
  GraduationCap,
  Check,
} from 'lucide-react';

interface SettingsModalProps {
  school: SchoolInfo;
  classInfo: ClassInfo;
  onClose: () => void;
  onSaveSettings: (settings: { school?: Partial<SchoolInfo>; classInfo?: Partial<ClassInfo> }) => Promise<void>;
  onResetDemo: (mode: 'demo28' | 'empty') => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  school,
  classInfo,
  onClose,
  onSaveSettings,
  onResetDemo,
}) => {
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
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSaveSettings({
      school: {
        nameVi: schoolNameVi,
        nameEn: schoolNameEn,
      },
      classInfo: {
        nameVi: classNameVi,
        nameEn: classNameEn,
        schoolYear,
        teacherName,
        teacherTitleEn,
        sloganVi,
        sloganEn,
        coverUrl,
      },
    });
    setLoading(false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setCoverUrl(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-sky-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-600" />
            <span>Cài đặt thông tin Trường & Lớp học</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Đã lưu thành công các thông tin cài đặt!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* School section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
              <School className="w-4 h-4 text-emerald-600" />
              <span>Thông tin nhà trường</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên trường (Tiếng Việt):</label>
                <input
                  type="text"
                  value={schoolNameVi}
                  onChange={(e) => setSchoolNameVi(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên trường (Tiếng Anh):</label>
                <input
                  type="text"
                  value={schoolNameEn}
                  onChange={(e) => setSchoolNameEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Class section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span>Thông tin lớp học</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp:</label>
                <input
                  type="text"
                  value={classNameVi}
                  onChange={(e) => setClassNameVi(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp tiếng Anh:</label>
                <input
                  type="text"
                  value={classNameEn}
                  onChange={(e) => setClassNameEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Năm học:</label>
                <input
                  type="text"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Giáo viên chủ nhiệm:</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chức danh tiếng Anh:</label>
                <input
                  type="text"
                  value={teacherTitleEn}
                  onChange={(e) => setTeacherTitleEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khẩu hiệu lớp (Tiếng Việt):</label>
                <input
                  type="text"
                  value={sloganVi}
                  onChange={(e) => setSloganVi(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khẩu hiệu lớp (Tiếng Anh):</label>
                <input
                  type="text"
                  value={sloganEn}
                  onChange={(e) => setSloganEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Cover Photo */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
              <Image className="w-4 h-4 text-sky-600" />
              <span>Ảnh bìa Banner Star Kingdom</span>
            </h4>
            <div className="flex items-center gap-3">
              <label className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 text-xs font-black rounded-xl cursor-pointer">
                Tải ảnh bìa tùy chỉnh
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Khôi phục lâu đài mặc định
                </button>
              )}
            </div>
            {coverUrl && (
              <div className="h-20 w-full rounded-xl overflow-hidden border border-slate-300">
                <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Quick Data Reset / Demo */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <h4 className="text-xs font-black text-amber-900 uppercase">
              Dữ liệu thử nghiệm Lớp 2A5
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Nạp 28 học sinh mẫu và điểm thi đua 4 tổ cho lớp 2A5?')) {
                    await onResetDemo('demo28');
                    onClose();
                  }
                }}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nạp 28 học sinh mẫu 2A5</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Xóa toàn bộ danh sách học sinh để bắt đầu từ danh sách trống?')) {
                    await onResetDemo('empty');
                    onClose();
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa trắng danh sách</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Đang lưu...' : 'Lưu tất cả'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
