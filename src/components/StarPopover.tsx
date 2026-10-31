import React, { useState } from 'react';
import { Student } from '../types';
import { Star, X, Check, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';
import { REWARD_REASONS_BILINGUAL, DEDUCT_REASONS_BILINGUAL } from '../utils/bilingual';

interface StarPopoverProps {
  student: Student;
  mode: 'add' | 'deduct';
  onClose: () => void;
  onSubmit: (delta: number, category: string, note: string) => Promise<void>;
}

export const StarPopover: React.FC<StarPopoverProps> = ({
  student,
  mode,
  onClose,
  onSubmit,
}) => {
  const reasonsList = mode === 'add' ? REWARD_REASONS_BILINGUAL : DEDUCT_REASONS_BILINGUAL;
  const [selectedDelta, setSelectedDelta] = useState<number>(mode === 'add' ? 1 : 1);
  const [selectedReason, setSelectedReason] = useState<string>(reasonsList[0].vi);
  const [customNote, setCustomNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const delta = mode === 'add' ? selectedDelta : -selectedDelta;
    const finalNote = customNote.trim() ? customNote.trim() : selectedReason;

    if (mode === 'deduct' && !finalNote) {
      setError('Vui lòng chọn hoặc ghi rõ lý do điều chỉnh sao / Please provide a reason');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(delta, selectedReason, finalNote);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật sao / Failed to update stars');
      setLoading(false);
    }
  };

  const deltaOptions = mode === 'add' ? [1, 2, 3, 5] : [1, 2, 3];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl border-2 border-sky-100 w-full max-w-md overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-3.5 flex items-center justify-between text-white ${
            mode === 'add'
              ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500'
              : 'bg-gradient-to-r from-rose-500 to-rose-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {mode === 'add' ? (
              <Sparkles className="w-6 h-6 text-amber-100 fill-amber-100 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-rose-100 shrink-0" />
            )}
            <div>
              <h3 className="font-black text-[16px] leading-tight text-white">
                {mode === 'add' ? 'Thưởng sao cho học sinh' : 'Điều chỉnh trừ sao'}
              </h3>
              <p className="text-[12.5px] font-bold text-white/95 leading-tight">
                {mode === 'add' ? 'Reward Stars to Student' : 'Deduct Stars Adjustment'}
              </p>
              <p className="text-[13px] font-extrabold text-white mt-0.5 truncate max-w-[260px]">
                {student.fullName} ({student.studentCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount selector */}
          <div>
            <div className="mb-1.5">
              <label className="block text-[14px] font-black text-slate-800 leading-tight">
                {mode === 'add' ? 'Chọn số sao khen thưởng:' : 'Chọn số sao trừ:'}
              </label>
              <span className="block text-[12px] font-bold text-slate-600 leading-tight">
                {mode === 'add' ? 'Select Stars to Reward' : 'Select Stars to Deduct'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {deltaOptions.map((opt) => {
                const isSelected = selectedDelta === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedDelta(opt)}
                    className={`py-2 px-1 rounded-2xl font-black text-[15px] flex items-center justify-center gap-1 transition cursor-pointer ${
                      isSelected
                        ? mode === 'add'
                          ? 'bg-amber-400 text-white ring-2 ring-amber-500 shadow-md scale-105'
                          : 'bg-rose-500 text-white ring-2 ring-rose-600 shadow-md scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isSelected
                          ? 'fill-white text-white'
                          : mode === 'add'
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-rose-400 text-rose-500'
                      }`}
                    />
                    <span>{mode === 'add' ? `+${opt}` : `-${opt}`}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason chips */}
          <div>
            <div className="mb-1.5">
              <label className="block text-[14px] font-black text-slate-800 leading-tight">
                {mode === 'add' ? 'Lý do khen thưởng:' : 'Lý do trừ sao (Bắt buộc):'}
              </label>
              <span className="block text-[12px] font-bold text-slate-600 leading-tight">
                {mode === 'add' ? 'Reward Reason' : 'Reason for Deduction (Required)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {reasonsList.map((reason) => {
                const isSelected = selectedReason === reason.vi;
                return (
                  <button
                    key={reason.vi}
                    type="button"
                    onClick={() => {
                      setSelectedReason(reason.vi);
                      setCustomNote(`${reason.vi} (${reason.en})`);
                    }}
                    className={`px-2.5 py-2 rounded-xl transition text-left cursor-pointer flex flex-col justify-center ${
                      isSelected
                        ? mode === 'add'
                          ? 'bg-amber-100 text-amber-950 border-2 border-amber-400 shadow-xs'
                          : 'bg-rose-100 text-rose-950 border-2 border-rose-400 shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span className="text-[13px] font-black leading-tight block">{reason.vi}</span>
                    <span className="text-[11px] font-bold text-slate-600 leading-tight block mt-0.5">{reason.en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Note input */}
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-[13.5px] font-black text-slate-700 leading-tight">Ghi chú chi tiết: </span>
                <span className="text-[12px] font-bold text-slate-600 leading-tight">Detailed Note</span>
              </div>
            </div>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="VD: Trả lời rất nhanh câu đố Toán học... / Quick Math answer..."
              className="w-full px-3.5 py-2.5 text-[13.5px] font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 text-slate-800"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex flex-col items-center leading-tight"
            >
              <span className="text-[13.5px] font-black">Hủy</span>
              <span className="text-[11px] font-bold text-slate-600">Cancel</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-xl text-white flex items-center gap-2 shadow-md transition cursor-pointer ${
                mode === 'add'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600'
                  : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700'
              }`}
            >
              <Check className="w-4.5 h-4.5 stroke-[3]" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[14px] font-black">{loading ? 'Đang lưu...' : 'Xác nhận'}</span>
                <span className="text-[11px] font-bold text-white/95">{loading ? 'Saving...' : 'Confirm'}</span>
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
