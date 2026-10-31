import React, { useState } from 'react';
import { Team, Student } from '../types';
import { X, Upload, Camera, Sparkles, Check, Crown, Shield } from 'lucide-react';
import { playStarSound } from '../utils/effects';

interface EditTeamModalProps {
  team: Team;
  students: Student[];
  onClose: () => void;
  onSave: (updates: Partial<Team>) => Promise<void>;
}

export const KINGDOM_MASCOT_PRESETS = [
  {
    name: 'Sư Tử Lửa',
    title: 'Sư Tử Vàng Dũng Mãnh',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RedFireLion&backgroundColor=ffadad',
    icon: '🦁',
  },
  {
    name: 'Cá Heo Xanh',
    title: 'Cá Heo Biển Thông Thái',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BlueOcean&backgroundColor=a0c4ff',
    icon: '🐬',
  },
  {
    name: 'Đại Bàng Vàng',
    title: 'Đại Bàng Tinh Anh Hoàng Kim',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GoldenSun&backgroundColor=fdffb6',
    icon: '🦅',
  },
  {
    name: 'Rồng Xanh Lá',
    title: 'Rồng Lửa Mầm Cây Thần Thoại',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GreenSprout&backgroundColor=caffbf',
    icon: '🐉',
  },
  {
    name: 'Kỳ Lân Cầu Vồng',
    title: 'Kỳ Lân Phép Thuật',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RainbowUnicorn&backgroundColor=ffd6a5',
    icon: '🦄',
  },
  {
    name: 'Gấu Dũng Cảm',
    title: 'Gấu Nâu Chăm Chỉ',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BraveBear&backgroundColor=e2e8f0',
    icon: '🐻',
  },
  {
    name: 'Cáo Thông Thái',
    title: 'Cáo Nhỏ Nhanh Nhẹn',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CleverFox&backgroundColor=fed7aa',
    icon: '🦊',
  },
  {
    name: 'Gấu Trúc Vui Vẻ',
    title: 'Panda Đáng Yêu',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=HappyPanda&backgroundColor=f1f5f9',
    icon: '🐼',
  },
  {
    name: 'Ngôi Sao Kỳ Diệu',
    title: 'Ngôi Sao Lấp Lánh',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ShiningStar&backgroundColor=fef08a',
    icon: '⭐',
  },
  {
    name: 'Vương Miện Vàng',
    title: 'Vương Miện Hoàng Gia',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RoyalCrown&backgroundColor=fbcfe8',
    icon: '👑',
  },
  {
    name: 'Tàu Vũ Trụ',
    title: 'Phi Thuyền Khám Phá',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SpaceRocket&backgroundColor=ddd6fe',
    icon: '🚀',
  },
  {
    name: 'Cú Mèo Bác Học',
    title: 'Cú Thông Thái Tri Thức',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=WiseOwl&backgroundColor=bae6fd',
    icon: '🦉',
  },
];

export const EditTeamModal: React.FC<EditTeamModalProps> = ({
  team,
  students,
  onClose,
  onSave,
}) => {
  const [nameVi, setNameVi] = useState(team.nameVi || '');
  const [nameEn, setNameEn] = useState(team.nameEn || '');
  const [mascot, setMascot] = useState(team.mascot || '');
  const [slogan, setSlogan] = useState(team.slogan || '');
  const [avatarUrl, setAvatarUrl] = useState(team.avatarUrl || '');
  const [leaderId, setLeaderId] = useState(team.leaderId || '');
  const [weeklyPoints, setWeeklyPoints] = useState(team.weeklyPoints ?? 40);
  const [monthlyPoints, setMonthlyPoints] = useState(team.monthlyPoints ?? team.points);
  const [semester1Points, setSemester1Points] = useState(team.semester1Points ?? Math.round(team.points * 1.8));
  const [semester2Points, setSemester2Points] = useState(team.semester2Points ?? team.points);
  const [points, setPoints] = useState(team.points ?? 250);

  const [loading, setLoading] = useState(false);
  const [activeAvatarTab, setActiveAvatarTab] = useState<'presets' | 'upload' | 'url'>('presets');

  // Filter team members
  const teamMembers = students.filter((s) => s.teamId === team.id);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setAvatarUrl(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameVi.trim()) return;

    setLoading(true);
    try {
      await onSave({
        nameVi: nameVi.trim(),
        nameEn: nameEn.trim() || team.nameEn,
        mascot: mascot.trim() || team.mascot,
        slogan: slogan.trim(),
        avatarUrl: avatarUrl.trim(),
        leaderId: leaderId || undefined,
        weeklyPoints: Number(weeklyPoints),
        monthlyPoints: Number(monthlyPoints),
        semester1Points: Number(semester1Points),
        semester2Points: Number(semester2Points),
        points: Number(points),
      });
      playStarSound('star');
      onClose();
    } catch (err) {
      console.error('Failed to update team:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-2xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl border border-sky-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: team.color }}
            >
              <Shield className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#263C72]">
                Cập nhật Ảnh đại diện & Thông tin {team.nameVi.split(':')[0]}
              </h3>
              <p className="text-[11px] font-bold text-slate-400">
                Chỉnh sửa linh vật, ảnh đại diện và điểm thi đua các kỳ học
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Preview & Picker */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border border-sky-100">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Avatar circle preview */}
              <div className="relative group shrink-0">
                <div
                  className="w-20 h-20 rounded-3xl overflow-hidden border-3 p-1 bg-white shadow-md flex items-center justify-center"
                  style={{ borderColor: team.color, boxShadow: `0 0 0 3px ${team.color}30` }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Team avatar" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <span className="text-3xl">🦁</span>
                  )}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-white flex items-center justify-center shadow-xs text-xs font-black"
                  style={{ backgroundColor: team.color }}
                >
                  ✓
                </div>
              </div>

              {/* Avatar selection modes */}
              <div className="flex-1 w-full text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1 mb-2 bg-white/80 p-1 rounded-xl border border-slate-200/60 text-xs font-black w-fit">
                  <button
                    type="button"
                    onClick={() => setActiveAvatarTab('presets')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      activeAvatarTab === 'presets' ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Linh vật có sẵn
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAvatarTab('upload')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      activeAvatarTab === 'upload' ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Tải từ thiết bị
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAvatarTab('url')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      activeAvatarTab === 'url' ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Nhập link URL
                  </button>
                </div>

                {activeAvatarTab === 'presets' && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 mb-1.5">
                      Chọn 1 trong 12 linh vật đáng yêu của Vương quốc ngôi sao:
                    </p>
                    <div className="grid grid-cols-6 gap-1.5 max-h-28 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                      {KINGDOM_MASCOT_PRESETS.map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(m.url);
                            setMascot(m.name);
                          }}
                          className={`p-1 rounded-xl text-center border-2 transition cursor-pointer hover:scale-105 flex flex-col items-center justify-center ${
                            avatarUrl === m.url
                              ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-300'
                              : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                          }`}
                          title={m.title}
                        >
                          <img src={m.url} alt={m.name} className="w-8 h-8 rounded-lg object-cover" />
                          <span className="text-[9px] font-bold text-slate-600 truncate w-full block mt-0.5">
                            {m.icon}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeAvatarTab === 'upload' && (
                  <div>
                    <label className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-sky-50 border-2 border-dashed border-sky-300 rounded-xl cursor-pointer transition">
                      <Upload className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-black text-sky-700">
                        Chọn ảnh từ máy tính hoặc điện thoại
                      </span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ JPG, PNG, GIF, SVG</p>
                  </div>
                )}

                {activeAvatarTab === 'url' && (
                  <div>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/mascot.png"
                      className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Dán link ảnh trực tiếp từ internet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">Tên tổ (Tiếng Việt):</label>
              <input
                type="text"
                value={nameVi}
                onChange={(e) => setNameVi(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">Tên tổ (Tiếng Anh):</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">Tên linh vật (Mascot):</label>
              <input
                type="text"
                value={mascot}
                onChange={(e) => setMascot(e.target.value)}
                placeholder="VD: Lửa Nhiệt Huyết"
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">Khẩu hiệu của tổ (Slogan):</label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="VD: Đoàn kết, tự tin, tỏa sáng!"
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Team Leader & Members */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Chọn Tổ trưởng (Team Leader):
            </label>
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white cursor-pointer"
            >
              <option value="">-- Chưa chỉ định Tổ trưởng --</option>
              {teamMembers.map((st) => (
                <option key={st.id} value={st.id}>
                  ⭐ {st.fullName} ({st.studentCode}) - {st.totalEarnedStars} sao
                </option>
              ))}
            </select>
            {teamMembers.length === 0 && (
              <p className="text-[10px] text-amber-600 font-bold mt-1">
                Tổ chưa có học sinh nào. Bạn có thể phân tổ trong mục Hồ sơ măng non.
              </p>
            )}
          </div>

          {/* Points for 4 Periods */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Điểm thi đua theo 4 giai đoạn (Tuần / Tháng / Học kì 1 / Học kì 2)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">🌟 Tuần này:</label>
                <input
                  type="number"
                  value={weeklyPoints}
                  onChange={(e) => setWeeklyPoints(Number(e.target.value))}
                  min={0}
                  className="w-full px-2.5 py-1.5 text-xs font-black rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">📅 Tháng này:</label>
                <input
                  type="number"
                  value={monthlyPoints}
                  onChange={(e) => setMonthlyPoints(Number(e.target.value))}
                  min={0}
                  className="w-full px-2.5 py-1.5 text-xs font-black rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">🏆 Học kì 1:</label>
                <input
                  type="number"
                  value={semester1Points}
                  onChange={(e) => setSemester1Points(Number(e.target.value))}
                  min={0}
                  className="w-full px-2.5 py-1.5 text-xs font-black rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">🎓 Học kì 2:</label>
                <input
                  type="number"
                  value={semester2Points}
                  onChange={(e) => setSemester2Points(Number(e.target.value))}
                  min={0}
                  className="w-full px-2.5 py-1.5 text-xs font-black rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Tổng điểm tích lũy:</span>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                min={0}
                className="w-24 px-2 py-1 text-xs font-black rounded-lg border border-slate-300 text-right bg-white"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{loading ? 'Đang lưu...' : 'Lưu thông tin & Ảnh đại diện'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
