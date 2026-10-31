import React, { useState } from 'react';
import { ClassInfo, Team, Student } from '../types';
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Users,
  Shield,
  Palette,
  School,
  GraduationCap,
} from 'lucide-react';

interface CreateClassModalProps {
  onClose: () => void;
  onSubmit: (classData: {
    classInfo: Partial<ClassInfo>;
    teams: Array<Partial<Team>>;
    initialStudents?: Array<Partial<Student>>;
  }) => Promise<void>;
}

export const CreateClassModal: React.FC<CreateClassModalProps> = ({ onClose, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Thông tin cơ bản
  const [nameVi, setNameVi] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [grade, setGrade] = useState<number>(2);
  const [schoolYear, setSchoolYear] = useState('2026 - 2027');
  const [teacherName, setTeacherName] = useState('Cô Thảo');
  const [teacherTitleEn, setTeacherTitleEn] = useState('Ms. Thao');
  const [targetSize, setTargetSize] = useState<number>(28);

  // Step 2: Chủ đề & Khẩu hiệu
  const [bannerTheme, setBannerTheme] = useState('fairy_castle');
  const [sloganVi, setSloganVi] = useState('Mỗi ngày vui học – Mỗi ngày tỏa sáng!');
  const [sloganEn, setSloganEn] = useState('Learn Happy, Shine Bright!');

  // Step 3: 4 Tổ thi đua
  const [teamsConfig, setTeamsConfig] = useState([
    {
      nameVi: 'Tổ 1: Ngôi Sao Đỏ',
      nameEn: 'Team 1: Red Stars',
      color: '#EF4444',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      flagColor: '#EF4444',
      mascot: 'Phượng Hoàng Lửa',
    },
    {
      nameVi: 'Tổ 2: Ngôi Sao Xanh',
      nameEn: 'Team 2: Blue Stars',
      color: '#3B82F6',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      flagColor: '#3B82F6',
      mascot: 'Kỳ Lân Biển',
    },
    {
      nameVi: 'Tổ 3: Ngôi Sao Vàng',
      nameEn: 'Team 3: Yellow Stars',
      color: '#F59E0B',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      flagColor: '#F59E0B',
      mascot: 'Sư Tử Vàng',
    },
    {
      nameVi: 'Tổ 4: Ngôi Sao Lá',
      nameEn: 'Team 4: Green Stars',
      color: '#10B981',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      flagColor: '#10B981',
      mascot: 'Rồng Xanh',
    },
  ]);

  // Step 4: Học sinh ban đầu
  const [studentMode, setStudentMode] = useState<'empty' | 'quick_input'>('empty');
  const [studentNamesText, setStudentNamesText] = useState('');

  const handleNext = () => {
    if (currentStep === 1) {
      if (!nameVi.trim()) {
        alert('Vui lòng nhập tên lớp học (VD: Lớp 2A6)');
        return;
      }
      if (!nameEn.trim()) {
        setNameEn(nameVi.replace('Lớp', 'Class').trim());
      }
    }
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      let initialStudents: Array<Partial<Student>> | undefined = undefined;

      if (studentMode === 'quick_input' && studentNamesText.trim()) {
        const lines = studentNamesText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        initialStudents = lines.map((name, idx) => ({
          studentCode: `2A${grade}-${String(idx + 1).padStart(2, '0')}`,
          fullName: name,
          gender: idx % 2 === 0 ? 'male' : 'female',
          teamId: `team_${(idx % 4) + 1}`,
        }));
      }

      await onSubmit({
        classInfo: {
          nameVi,
          nameEn: nameEn || nameVi,
          grade,
          schoolYear,
          teacherName,
          teacherTitleEn,
          targetSize,
          sloganVi,
          sloganEn,
          bannerTheme,
        },
        teams: teamsConfig,
        initialStudents,
      });

      onClose();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo lớp mới. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-sky-100 max-h-[92vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white shadow-xs">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#263C72] leading-tight">
                Tạo Vương Quốc Lớp Học Mới
              </h3>
              <p className="text-[11px] font-bold text-sky-600">
                Bước {currentStep} / 4: {
                  currentStep === 1
                    ? 'Thông tin cơ bản'
                    : currentStep === 2
                    ? 'Chủ đề & Khẩu hiệu'
                    : currentStep === 3
                    ? 'Thiết lập 4 Tổ thi đua'
                    : 'Khởi tạo danh sách học sinh'
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-4 gap-2 my-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentStep >= step ? 'bg-gradient-to-r from-sky-400 to-blue-600' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-4">
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Tên lớp (tiếng Việt) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Lớp 2A6, Lớp 1A1..."
                    value={nameVi}
                    onChange={(e) => setNameVi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Tên lớp (English)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Class 2A6"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Khối lớp *</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Năm học *</label>
                  <input
                    type="text"
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Sĩ số mục tiêu</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={targetSize}
                    onChange={(e) => setTargetSize(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Giáo viên chủ nhiệm
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Teacher Title (English)</label>
                  <input
                    type="text"
                    value={teacherTitleEn}
                    onChange={(e) => setTeacherTitleEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Theme & Slogan */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2">
                  Chọn giao diện vương quốc:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'fairy_castle', name: 'Lâu đài cổ tích', desc: 'Mockup chính thức', icon: '🏰' },
                    { id: 'rainbow_sky', name: 'Cầu vồng rực rỡ', desc: 'Tone hồng pastel', icon: '🌈' },
                    { id: 'starry_night', name: 'Dải ngân hà', desc: 'Tone xanh vũ trụ', icon: '⭐' },
                  ].map((theme) => (
                    <div
                      key={theme.id}
                      onClick={() => setBannerTheme(theme.id)}
                      className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition ${
                        bannerTheme === theme.id
                          ? 'border-sky-500 bg-sky-50/80 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{theme.icon}</div>
                      <h4 className="text-xs font-black text-[#263C72]">{theme.name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">{theme.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Khẩu hiệu vương quốc (tiếng Việt)
                </label>
                <input
                  type="text"
                  value={sloganVi}
                  onChange={(e) => setSloganVi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Slogan (English)</label>
                <input
                  type="text"
                  value={sloganEn}
                  onChange={(e) => setSloganEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3: 4 Teams */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600">
                Vương quốc mặc định gồm 4 tổ với 4 màu cờ tượng trưng:
              </p>
              <div className="space-y-2.5">
                {teamsConfig.map((team, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 ${team.bgColor} ${team.borderColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: team.color }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={team.nameVi}
                          onChange={(e) => {
                            const updated = [...teamsConfig];
                            updated[idx].nameVi = e.target.value;
                            setTeamsConfig(updated);
                          }}
                          className="font-black text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none"
                        />
                        <div className="text-[10px] font-semibold text-slate-400">
                          {team.nameEn} • Linh vật: {team.mascot}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-500">0 sao</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Initial Students */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStudentMode('empty')}
                  className={`flex-1 p-3 rounded-2xl border-2 text-left cursor-pointer transition ${
                    studentMode === 'empty'
                      ? 'border-sky-500 bg-sky-50/80 shadow-xs'
                      : 'border-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-black text-[#263C72]">Tạo danh sách trống</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Khởi tạo lớp với 0 học sinh, thêm từng em sau.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setStudentMode('quick_input')}
                  className={`flex-1 p-3 rounded-2xl border-2 text-left cursor-pointer transition ${
                    studentMode === 'quick_input'
                      ? 'border-sky-500 bg-sky-50/80 shadow-xs'
                      : 'border-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-black text-[#263C72]">Nhập nhanh danh sách</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Dán họ tên mỗi em trên một dòng. Tự động chia vào 4 tổ.
                  </p>
                </button>
              </div>

              {studentMode === 'quick_input' && (
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Danh sách họ tên học sinh (mỗi em 1 dòng):
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Nguyễn Gia Bảo&#10;Trần Hà Linh&#10;Lê Minh Khang&#10;Phạm Thùy Chi..."
                    value={studentNamesText}
                    onChange={(e) => setStudentNamesText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hệ thống sẽ tự động gán mã học sinh và phân bổ đều vào 4 tổ thi đua.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-700 flex items-center gap-1 cursor-pointer transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black shadow-md flex items-center gap-1 cursor-pointer transition"
            >
              <span>Tiếp theo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{loading ? 'Đang tạo...' : 'Hoàn tất & Mở lớp mới'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
