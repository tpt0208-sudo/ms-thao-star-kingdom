import React, { useState } from 'react';
import { ClassInfo } from '../types';
import {
  AlertTriangle,
  Archive,
  Trash2,
  X,
  CheckCircle2,
  ShieldAlert,
  School,
  Users,
} from 'lucide-react';
import { playStarSound } from '../utils/effects';

interface DeleteClassModalProps {
  classInfo: ClassInfo;
  totalClassesCount: number;
  studentCount?: number;
  onClose: () => void;
  onConfirmArchive: (classId: string) => Promise<void>;
  onConfirmPermanentDelete: (classId: string, confirmName: string) => Promise<void>;
}

export const DeleteClassModal: React.FC<DeleteClassModalProps> = ({
  classInfo,
  totalClassesCount,
  studentCount = 0,
  onClose,
  onConfirmArchive,
  onConfirmPermanentDelete,
}) => {
  const [deleteMode, setDeleteMode] = useState<'archive' | 'permanent'>('archive');
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOnlyClass = totalClassesCount <= 1;
  const isNameMatched = confirmName.trim().toLowerCase() === classInfo.nameVi.trim().toLowerCase();

  const handleAction = async () => {
    setError(null);
    if (isOnlyClass) {
      setError('Không thể xóa hoặc lưu kho lớp duy nhất trong vương quốc. Vui lòng tạo thêm một lớp mới trước!');
      return;
    }

    setLoading(true);
    try {
      if (deleteMode === 'archive') {
        await onConfirmArchive(classInfo.id);
        playStarSound('click');
        onClose();
      } else {
        if (!isNameMatched) {
          setError(`Tên xác nhận không khớp. Vui lòng nhập chính xác "${classInfo.nameVi}"`);
          setLoading(false);
          return;
        }
        await onConfirmPermanentDelete(classInfo.id, confirmName.trim());
        playStarSound('click');
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi thực hiện thao tác xóa lớp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-rose-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-100 text-rose-600 shadow-2xs">
              <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#263C72] leading-tight">
                Xóa hoặc Lưu kho Lớp học
              </h3>
              <p className="text-xs font-bold text-slate-500">
                Thao tác quản lý chu trình lớp học an toàn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Class Overview Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-2xs">
              🏰
            </div>
            <div>
              <h4 className="text-sm font-black text-[#263C72]">{classInfo.nameVi}</h4>
              <p className="text-xs font-semibold text-slate-500">
                {classInfo.nameEn} • Khối {classInfo.grade} • Năm học: {classInfo.schoolYear}
              </p>
              <p className="text-[11px] font-bold text-sky-700">GV: {classInfo.teacherName}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-black">
              <Users className="w-3.5 h-3.5" />
              <span>{studentCount} HS</span>
            </span>
          </div>
        </div>

        {/* Warning if only 1 class */}
        {isOnlyClass && (
          <div className="p-3.5 mb-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-amber-950 mb-0.5">Không thể xóa lớp này</p>
              <p>
                Đây là lớp học duy nhất đang có trong hệ thống Vương quốc. Bạn cần bấm <b>"+ Tạo lớp mới"</b> trước nếu muốn xóa hoặc thay thế lớp này.
              </p>
            </div>
          </div>
        )}

        {/* Options Selection */}
        <div className="space-y-3 mb-4">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
            Chọn hình thức xử lý:
          </label>

          {/* Option 1: Archive (Safe) */}
          <div
            onClick={() => setDeleteMode('archive')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
              deleteMode === 'archive'
                ? 'border-sky-500 bg-sky-50/70 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <input
              type="radio"
              checked={deleteMode === 'archive'}
              onChange={() => setDeleteMode('archive')}
              className="mt-1 accent-sky-600"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-black text-xs text-[#263C72]">
                <Archive className="w-4 h-4 text-sky-600" />
                <span>Lưu kho an toàn (Khuyên dùng)</span>
                <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-extrabold">
                  An toàn
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Lớp sẽ được ẩn khỏi danh sách sử dụng thường ngày. Toàn bộ lịch sử điểm sao, danh sách học sinh và thành tích các tổ đều <b>được bảo toàn trọn vẹn</b> và có thể phục hồi bất kỳ lúc nào.
              </p>
            </div>
          </div>

          {/* Option 2: Permanent Delete */}
          <div
            onClick={() => setDeleteMode('permanent')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
              deleteMode === 'permanent'
                ? 'border-rose-500 bg-rose-50/70 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <input
              type="radio"
              checked={deleteMode === 'permanent'}
              onChange={() => setDeleteMode('permanent')}
              className="mt-1 accent-rose-600"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-black text-xs text-rose-700">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Xóa vĩnh viễn (Xóa hẳn khỏi hệ thống)</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Xóa sạch hoàn toàn lớp học này cùng tất cả học sinh, 4 tổ thi đua, điểm số, lịch sử điểm danh và tin tức liên quan. <b>Hành động này không thể hoàn tác!</b>
              </p>

              {deleteMode === 'permanent' && !isOnlyClass && (
                <div className="mt-3 pt-3 border-t border-rose-200/70 space-y-2 animate-fade-in">
                  <p className="text-[11px] font-black text-rose-900">
                    Để xác nhận, vui lòng nhập chính xác tên lớp: <span className="underline font-extrabold">{classInfo.nameVi}</span>
                  </p>
                  <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={`Nhập đúng "${classInfo.nameVi}" để mở nút xóa`}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Hủy bỏ
          </button>

          {deleteMode === 'archive' ? (
            <button
              type="button"
              onClick={handleAction}
              disabled={loading || isOnlyClass}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Archive className="w-4 h-4" />
              <span>{loading ? 'Đang lưu kho...' : 'Lưu kho an toàn'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAction}
              disabled={loading || isOnlyClass || !isNameMatched}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>{loading ? 'Đang xóa...' : 'Xóa vĩnh viễn lớp'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
