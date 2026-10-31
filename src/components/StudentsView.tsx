import React, { useState } from 'react';
import { Student, Team, Badge, LevelRule } from '../types';
import { StudentCard } from './StudentCard';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Star,
  Sparkles,
  CheckSquare,
  Square,
  Shield,
  Award,
  Calendar,
  X,
  Plus,
  Trash2,
  Lock,
  Camera,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface StudentsViewProps {
  students: Student[];
  teams: Team[];
  badges: LevelRule[];
  onAddStudent: (student: Partial<Student>) => Promise<Student>;
  onImportStudents: (students: Partial<Student>[], clearExisting?: boolean) => Promise<Student[]>;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<Student>;
  onDeleteStudent: (id: string) => Promise<string>;
  onGiveStars: (payload: {
    studentId: string;
    deltaStars: number;
    reasonCategory: string;
    reasonNote: string;
  }) => Promise<void>;
  onBatchGiveStars: (payload: {
    studentIds: string[];
    deltaStars: number;
    reasonCategory: string;
    reasonNote: string;
  }) => Promise<void>;
  onLoadDemoStudents: () => void;
  isTeacher?: boolean;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  teams,
  badges,
  onAddStudent,
  onImportStudents,
  onUpdateStudent,
  onDeleteStudent,
  onGiveStars,
  onBatchGiveStars,
  onLoadDemoStudents,
  isTeacher = true,
}) => {
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [avatarChangeStudent, setAvatarChangeStudent] = useState<Student | null>(null);
  const [isBatchRewardModalOpen, setIsBatchRewardModalOpen] = useState(false);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesTeam = selectedTeamFilter === 'all' || s.teamId === selectedTeamFilter;
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((item) => item !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  // Export excel
  const handleExportExcel = () => {
    const dataToExport = students.map((s, idx) => ({
      STT: idx + 1,
      'Mã Học Sinh': s.studentCode,
      'Họ và Tên': s.fullName,
      'Giới Tính': s.gender === 'female' ? 'Nữ' : 'Nam',
      Tổ: teams.find((t) => t.id === s.teamId)?.nameVi || 'Chưa chia tổ',
      'Tổng Sao Tích Lũy': s.totalEarnedStars,
      'Sao Khả Dụng': s.spendableStars,
      'Cấp Độ': `Level ${s.level}`,
      'Mã Đăng Nhập': s.passcode,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lop_2A5');
    XLSX.writeFile(workbook, 'Danh_Sach_Hoc_Sinh_2A5.xlsx');
  };

  // Download sample template
  const handleDownloadTemplate = () => {
    const sample = [
      { 'Mã Học Sinh': '2A501', 'Họ và Tên': 'Nguyễn Văn An', 'Giới Tính': 'Nam', 'Tổ (1-4)': '1', 'Ngày sinh': '15/10/2018', 'Tổng Sao Ban Đầu': 10 },
      { 'Mã Học Sinh': '2A502', 'Họ và Tên': 'Trần Thị Bình', 'Giới Tính': 'Nữ', 'Tổ (1-4)': '2', 'Ngày sinh': '27/10/2018', 'Tổng Sao Ban Đầu': 10 },
      { 'Mã Học Sinh': '2A503', 'Họ và Tên': 'Lê Hoàng Cường', 'Giới Tính': 'Nam', 'Tổ (1-4)': '3', 'Ngày sinh': '12/11/2018', 'Tổng Sao Ban Đầu': 10 },
      { 'Mã Học Sinh': '2A504', 'Họ và Tên': 'Phạm Thu Dung', 'Giới Tính': 'Nữ', 'Tổ (1-4)': '4', 'Ngày sinh': '05/12/2018', 'Tổng Sao Ban Đầu': 10 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Hoc_Sinh');
    XLSX.writeFile(wb, 'Mau_Nhap_Lop_2A5.xlsx');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="typo-title-section text-[#263C72] leading-tight">
                Hồ sơ măng non
              </h2>
              <p className="text-[13px] font-bold text-slate-600 leading-tight">
                Little Learners Profiles • Sĩ số / Total: <span className="text-sky-600 font-black">{students.length}</span> học sinh / students
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {isTeacher && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
                isMultiSelectMode
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isMultiSelectMode ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5" />}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13.5px] font-black">{isMultiSelectMode ? 'Đang chọn nhiều' : 'Chọn nhiều'}</span>
                <span className={`text-[11px] font-bold ${isMultiSelectMode ? 'text-white/95' : 'text-slate-600'}`}>Multi-select</span>
              </div>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white shadow-xs flex items-center gap-2 transition cursor-pointer"
            >
              <UserPlus className="w-4.5 h-4.5" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13.5px] font-black">Thêm học sinh</span>
                <span className="text-[11px] font-bold text-white/95">Add Student</span>
              </div>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13.5px] font-black">Nhập Excel</span>
                <span className="text-[11px] font-bold text-emerald-700">Import Excel</span>
              </div>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 transition cursor-pointer"
              title="Xuất file danh sách học sinh / Export Excel"
            >
              <Download className="w-4.5 h-4.5 text-slate-600" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13.5px] font-black">Xuất file</span>
                <span className="text-[11px] font-bold text-slate-600">Export Excel</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Batch Action Bar (Appears when in multi-select mode) */}
      {isMultiSelectMode && (
        <div className="bg-sky-50 rounded-2xl p-3.5 border-2 border-sky-300 flex flex-wrap items-center justify-between gap-2 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-white border border-sky-200 text-sky-800 hover:bg-sky-100 flex flex-col items-start leading-tight cursor-pointer"
            >
              <span className="text-[13px] font-black">
                {selectedStudentIds.length === filteredStudents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </span>
              <span className="text-[11px] font-bold text-sky-600">
                {selectedStudentIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            <div className="leading-tight">
              <span className="text-[14px] font-black text-[#263C72] block">
                Đã chọn: <span className="text-rose-600">{selectedStudentIds.length}</span> / {filteredStudents.length} học sinh
              </span>
              <span className="text-[12px] font-bold text-slate-600 block">
                Selected: {selectedStudentIds.length} / {filteredStudents.length} students
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={selectedStudentIds.length === 0}
              onClick={() => setIsBatchRewardModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Star className="w-4.5 h-4.5 fill-white" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13.5px] font-black">Thưởng sao nhóm đã chọn</span>
                <span className="text-[11px] font-bold text-white/95">Reward Selected Students</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
        {/* Team Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setSelectedTeamFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex flex-col items-center leading-tight ${
              selectedTeamFilter === 'all'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="text-[13.5px] font-black">Tất cả ({students.length})</span>
            <span className={`text-[11px] font-bold ${selectedTeamFilter === 'all' ? 'text-white/90' : 'text-slate-600'}`}>
              All Students
            </span>
          </button>
          {teams.map((t) => {
            const count = students.filter((s) => s.teamId === t.id).length;
            const isSelected = selectedTeamFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTeamFilter(t.id)}
                className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex flex-col items-center leading-tight ${
                  isSelected
                    ? 'text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
                style={isSelected ? { backgroundColor: t.color } : {}}
              >
                <span className="text-[13.5px] font-black">
                  {t.nameVi.split(':')[0]} ({count})
                </span>
                <span className={`text-[11px] font-bold ${isSelected ? 'text-white/90' : 'text-slate-600'}`}>
                  {t.nameEn?.split(':')[0] || 'Team'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4.5 h-4.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên hoặc mã học sinh... / Search student..."
            className="w-full pl-9 pr-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 text-slate-800"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredStudents.length === 0 && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed border-sky-200 shadow-sm max-w-xl mx-auto my-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <Sparkles className="w-10 h-10 fill-amber-300" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#263C72] mb-1">
            Chào mừng đến Lớp 2A5!
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mb-6">
            Thêm học sinh hoặc nhập danh sách Excel để bắt đầu xây dựng Vương quốc ngôi sao rực rỡ cùng cô Thảo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onLoadDemoStudents}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white font-black text-xs shadow-md hover:from-amber-500 hover:to-amber-600 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-white" />
              <span>Nạp 28 học sinh mẫu 2A5 (Trải nghiệm nhanh)</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Nhập file Excel thực tế</span>
            </button>
          </div>
        </div>
      )}

      {/* 4-6 Cards Grid on Desktop, 3-4 on Tablet, 2 on Mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredStudents.map((student) => {
          const team = teams.find((t) => t.id === student.teamId);
          const isSelected = selectedStudentIds.includes(student.id);

          return (
            <StudentCard
              key={student.id}
              student={student}
              team={team}
              isSelected={isSelected}
              onSelect={handleToggleSelect}
              isMultiSelectMode={isMultiSelectMode}
              onOpenDetails={(st) => setDetailStudent(st)}
              onGiveStars={onGiveStars}
              onChangeAvatar={(st) => setAvatarChangeStudent(st)}
              isTeacher={isTeacher}
            />
          );
        })}
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <AddStudentModal
          teams={teams}
          existingCount={students.length}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={async (newSt) => {
            await onAddStudent(newSt);
            setIsAddModalOpen(false);
          }}
        />
      )}

      {/* Import Excel Modal */}
      {isImportModalOpen && (
        <ImportExcelModal
          onClose={() => setIsImportModalOpen(false)}
          onDownloadTemplate={handleDownloadTemplate}
          onImport={async (list, clear) => {
            await onImportStudents(list, clear);
            setIsImportModalOpen(false);
          }}
        />
      )}

      {/* Change Avatar Modal */}
      {avatarChangeStudent && (
        <ChangeAvatarModal
          student={avatarChangeStudent}
          onClose={() => setAvatarChangeStudent(null)}
          onSave={async (url) => {
            await onUpdateStudent(avatarChangeStudent.id, { avatarUrl: url });
            setAvatarChangeStudent(null);
          }}
        />
      )}

      {/* Student Details Modal */}
      {detailStudent && (
        <StudentDetailsModal
          student={detailStudent}
          team={teams.find((t) => t.id === detailStudent.teamId)}
          teams={teams}
          onClose={() => setDetailStudent(null)}
          onUpdate={async (updates) => {
            const updated = await onUpdateStudent(detailStudent.id, updates);
            setDetailStudent(updated);
          }}
          onDelete={async () => {
            if (confirm(`Bạn có chắc chắn muốn xóa học sinh ${detailStudent.fullName}?`)) {
              await onDeleteStudent(detailStudent.id);
              setDetailStudent(null);
            }
          }}
          isTeacher={isTeacher}
        />
      )}

      {/* Batch Reward Modal */}
      {isBatchRewardModalOpen && (
        <BatchRewardModal
          count={selectedStudentIds.length}
          onClose={() => setIsBatchRewardModalOpen(false)}
          onSubmit={async (delta, category, note) => {
            await onBatchGiveStars({
              studentIds: selectedStudentIds,
              deltaStars: delta,
              reasonCategory: category,
              reasonNote: note,
            });
            setIsBatchRewardModalOpen(false);
            setSelectedStudentIds([]);
            setIsMultiSelectMode(false);
          }}
        />
      )}
    </div>
  );
};

// ----------------- SUB-MODALS -----------------

// Add Student Modal
interface AddStudentModalProps {
  teams: Team[];
  existingCount: number;
  onClose: () => void;
  onAdd: (student: Partial<Student>) => Promise<void>;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({
  teams,
  existingCount,
  onClose,
  onAdd,
}) => {
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [teamId, setTeamId] = useState(teams[0]?.id || 'team_1');
  const [studentCode, setStudentCode] = useState(`2A5${(existingCount + 1).toString().padStart(2, '0')}`);
  const [dob, setDob] = useState('2018-01-01');
  const [passcode, setPasscode] = useState('2026');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);
    await onAdd({
      fullName: fullName.trim(),
      gender,
      teamId,
      studentCode,
      dob,
      passcode,
      totalEarnedStars: 0,
      spendableStars: 0,
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-sky-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5.5 h-5.5 text-sky-600" />
            <div>
              <h3 className="text-[16px] font-black text-[#263C72] leading-tight">
                Thêm học sinh mới
              </h3>
              <p className="text-[12.5px] font-bold text-slate-600 leading-tight">
                Add New Student
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[13.5px] font-black text-slate-700 mb-1">
              Mã học sinh / Student Code:
            </label>
            <input
              type="text"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200 bg-slate-50"
              required
            />
          </div>

          <div>
            <label className="block text-[13.5px] font-black text-slate-700 mb-1">
              Họ và tên học sinh / Full Name:
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Bảo Long"
              className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1">
                Giới tính / Gender:
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200"
              >
                <option value="male">Nam / Boy</option>
                <option value="female">Nữ / Girl</option>
              </select>
            </div>

            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1">
                Phân vào tổ / Assign Team:
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameVi} ({t.nameEn})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1 flex items-center justify-between">
                <span>Ngày sinh / Date of Birth:</span>
                {dob && (
                  <span className="text-[11px] text-pink-600 font-extrabold">
                    🎂 Tháng {parseInt(dob.split('-')[1] || dob.split('/')[1] || '0', 10) || ''}
                  </span>
                )}
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200"
              />
              <p className="text-[11.5px] text-slate-600 mt-1 font-semibold leading-tight">
                🎂 Tự động cập nhật bản tin sinh nhật / Auto-syncs to monthly birthday news
              </p>
            </div>
            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1">
                Mã PIN học sinh / Student PIN:
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex flex-col items-center leading-tight cursor-pointer"
            >
              <span className="text-[13.5px] font-black">Hủy</span>
              <span className="text-[11px] font-bold text-slate-600">Cancel</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-md flex flex-col items-center leading-tight cursor-pointer"
            >
              <span className="text-[14px] font-black">{loading ? 'Đang thêm...' : 'Lưu học sinh'}</span>
              <span className="text-[11px] font-bold text-white/95">{loading ? 'Adding...' : 'Save Student'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Import Excel Modal
interface ImportExcelModalProps {
  onClose: () => void;
  onDownloadTemplate: () => void;
  onImport: (list: Partial<Student>[], clearExisting: boolean) => Promise<void>;
}

const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  onClose,
  onDownloadTemplate,
  onImport,
}) => {
  const [parsedData, setParsedData] = useState<Partial<Student>[]>([]);
  const [clearExisting, setClearExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          setError('File Excel rỗng, không tìm thấy dữ liệu.');
          return;
        }

        const converted: Partial<Student>[] = rows.map((r, i) => {
          const name = r['Họ và Tên'] || r['Họ tên'] || r['FullName'] || r['Tên'] || `Học sinh ${i + 1}`;
          const rawGender = String(r['Giới Tính'] || r['Gender'] || '').toLowerCase();
          const gender = rawGender.includes('nữ') || rawGender.includes('female') ? 'female' : 'male';
          const rawTeam = String(r['Tổ (1-4)'] || r['Tổ'] || r['Team'] || '');
          let teamId = 'team_1';
          if (rawTeam.includes('2')) teamId = 'team_2';
          else if (rawTeam.includes('3')) teamId = 'team_3';
          else if (rawTeam.includes('4')) teamId = 'team_4';
          else {
            teamId = `team_${(i % 4) + 1}`;
          }

          const stars = Number(r['Tổng Sao Ban Đầu'] || r['Sao'] || 0) || 0;

          // Parse Ngày sinh from Excel columns
          const rawDob = r['Ngày sinh'] || r['Ngày sinh (DD/MM/YYYY)'] || r['Ngày tháng năm sinh'] || r['DOB'] || r['BirthDate'] || r['Birth Date'] || r['NgaySinh'];
          let dob = '';
          if (rawDob) {
            if (typeof rawDob === 'number') {
              const d = new Date(Math.round((rawDob - 25569) * 86400 * 1000));
              if (!isNaN(d.getTime())) {
                dob = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              }
            } else {
              const str = String(rawDob).trim();
              const ddmmyyyy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
              if (ddmmyyyy) {
                dob = `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
              } else {
                const yyyymmdd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
                if (yyyymmdd) {
                  dob = `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
                } else {
                  dob = str;
                }
              }
            }
          }

          return {
            studentCode: r['Mã Học Sinh'] || `2A5${(i + 1).toString().padStart(2, '0')}`,
            fullName: name,
            gender,
            teamId,
            dob: dob || undefined,
            totalEarnedStars: stars,
            spendableStars: stars,
            passcode: '2026',
          };
        });

        setParsedData(converted);
      } catch (err: unknown) {
        setError('Không đọc được file Excel. Vui lòng kiểm tra định dạng .xlsx hoặc .csv.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    await onImport(parsedData, clearExisting);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-sky-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Nhập danh sách học sinh từ Excel</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
            <div>
              <p className="font-bold">Chưa có file mẫu chuẩn?</p>
              <p className="text-[11px] text-amber-700">Tải file mẫu Excel 2A5 để điền thông tin nhanh nhất.</p>
            </div>
            <button
              onClick={onDownloadTemplate}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 rounded-xl font-black text-amber-800 border border-amber-300 text-xs shrink-0 cursor-pointer"
            >
              Tải file mẫu
            </button>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-sky-300 rounded-2xl p-6 text-center hover:bg-sky-50 transition cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <FileSpreadsheet className="w-10 h-10 text-sky-500 mx-auto mb-2" />
            <p className="text-xs font-black text-slate-700">
              {fileName ? fileName : 'Kéo thả hoặc nhấn để chọn file Excel (.xlsx, .csv)'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ các cột: Họ và Tên, Giới Tính, Tổ, Mã Học Sinh</p>
          </div>

          {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

          {/* Preview Parsed */}
          {parsedData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-700">
                  Đã đọc được {parsedData.length} học sinh:
                </span>
                <label className="flex items-center gap-1.5 text-xs font-bold text-rose-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                  />
                  <span>Xóa học sinh hiện tại trước khi nhập</span>
                </label>
              </div>

              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50 space-y-1 text-xs">
                {parsedData.slice(0, 10).map((st, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="font-bold text-slate-800">
                      {st.studentCode} - {st.fullName}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                      {st.dob && (
                        <span className="px-1.5 py-0.5 rounded-md bg-pink-100 text-pink-700 font-extrabold flex items-center gap-0.5">
                          🎂 {st.dob}
                        </span>
                      )}
                      <span>{st.gender === 'female' ? 'Nữ' : 'Nam'} • {st.teamId}</span>
                    </span>
                  </div>
                ))}
                {parsedData.length > 10 && (
                  <p className="text-[10px] text-slate-400 text-center pt-1 font-bold">
                    ...và {parsedData.length - 10} học sinh khác (Tất cả ngày sinh sẽ tự động cập nhật vào bản tin sinh nhật)
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={parsedData.length === 0 || loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md cursor-pointer"
            >
              {loading ? 'Đang nhập...' : `Xác nhận nhập (${parsedData.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Change Avatar Modal
interface ChangeAvatarModalProps {
  student: Student;
  onClose: () => void;
  onSave: (url: string) => Promise<void>;
}

const ChangeAvatarModal: React.FC<ChangeAvatarModalProps> = ({
  student,
  onClose,
  onSave,
}) => {
  const [url, setUrl] = useState(student.avatarUrl || '');
  const [loading, setLoading] = useState(false);

  const presets = [
    'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1545696968-1a5245650b36?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setUrl(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    await onSave(url);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-sky-100 text-center">
        <h3 className="text-sm font-black text-[#263C72] mb-1">Thay ảnh đại diện cho {student.fullName}</h3>
        <p className="text-xs text-slate-500 mb-4">Chọn từ danh mục mẫu hoặc tải ảnh học sinh từ thiết bị</p>

        {/* Preview */}
        <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden ring-4 ring-amber-300 shadow-md">
          <img src={url || presets[0]} alt="Avatar preview" className="w-full h-full object-cover" />
        </div>

        {/* Upload from device */}
        <label className="block mb-4">
          <span className="px-4 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-black cursor-pointer inline-block">
            Tải ảnh từ máy tính / điện thoại
          </span>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>

        {/* Preset selections */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-slate-400 mb-2">Hoặc chọn avatar hoạt hình dễ thương:</p>
          <div className="flex items-center justify-center gap-2">
            {presets.map((preset, idx) => (
              <img
                key={idx}
                src={preset}
                alt="preset"
                onClick={() => setUrl(preset)}
                className={`w-9 h-9 rounded-full object-cover cursor-pointer transition ${
                  url === preset ? 'ring-3 ring-sky-500 scale-110' : 'opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs shadow-md cursor-pointer"
          >
            {loading ? 'Đang lưu...' : 'Lưu ảnh'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Student Details & Edit Modal
interface StudentDetailsModalProps {
  student: Student;
  team?: Team;
  teams: Team[];
  onClose: () => void;
  onUpdate: (updates: Partial<Student>) => Promise<void>;
  onDelete: () => Promise<void>;
  isTeacher?: boolean;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  team,
  teams,
  onClose,
  onUpdate,
  onDelete,
  isTeacher = true,
}) => {
  const [fullName, setFullName] = useState(student.fullName || '');
  const [studentCode, setStudentCode] = useState(student.studentCode || '');
  const [gender, setGender] = useState<'male' | 'female'>(student.gender || 'male');
  const [teamId, setTeamId] = useState(student.teamId || '');
  const [avatarUrl, setAvatarUrl] = useState(student.avatarUrl || '');
  const [dob, setDob] = useState(student.dob || '');
  const [passcode, setPasscode] = useState(student.passcode || '2026');
  const [notes, setNotes] = useState(student.notes || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedTeam = teams.find((t) => t.id === teamId) || team;
  const isTeamChanged = teamId !== student.teamId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Vui lòng nhập họ và tên học sinh');
      return;
    }
    setSaving(true);
    try {
      await onUpdate({
        fullName: fullName.trim(),
        studentCode: studentCode.trim() || student.studentCode,
        gender,
        teamId,
        avatarUrl: avatarUrl.trim() || student.avatarUrl,
        dob,
        passcode: passcode.trim() || '2026',
        notes: notes.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Error updating student:', err);
      alert('Lỗi khi cập nhật thông tin học sinh!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fade-in">
      <div className="bg-white rounded-[28px] p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-sky-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <img
                src={avatarUrl || student.avatarUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=150'}
                alt={student.fullName}
                className="w-13 h-13 rounded-full object-cover ring-3 ring-amber-300 shadow-xs"
              />
              <label
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-full flex items-center justify-center cursor-pointer text-white"
                title="Tải ảnh mới từ thiết bị"
              >
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      if (typeof evt.target?.result === 'string') {
                        setAvatarUrl(evt.target.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {selectedTeam && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-2xs flex items-center justify-center text-[8px]"
                  style={{ backgroundColor: selectedTeam.color }}
                  title={selectedTeam.nameVi}
                >
                  🚩
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-[#263C72]">{student.fullName}</h3>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>{student.studentCode}</span>
                <span>•</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-2xs"
                  style={{ backgroundColor: selectedTeam?.color || '#94A3B8' }}
                >
                  {selectedTeam ? selectedTeam.nameVi.split(':')[0] : 'Chưa phân tổ'}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-[20px] sm:text-[22px] font-black text-amber-900 block leading-tight">
              {student.totalEarnedStars}
            </span>
            <span className="text-[12.5px] font-black text-amber-800 block leading-tight">Sao tích lũy</span>
            <span className="text-[11px] font-bold text-amber-700 block leading-tight">Total Stars</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-[20px] sm:text-[22px] font-black text-emerald-900 block leading-tight">
              {student.spendableStars}
            </span>
            <span className="text-[12.5px] font-black text-emerald-800 block leading-tight">Sao khả dụng</span>
            <span className="text-[11px] font-bold text-emerald-700 block leading-tight">Spendable</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200">
            <span className="text-[20px] sm:text-[22px] font-black text-sky-900 block leading-tight">
              Lv.{student.level}
            </span>
            <span className="text-[12.5px] font-black text-sky-800 block leading-tight">Cấp bậc</span>
            <span className="text-[11px] font-bold text-sky-700 block leading-tight">Level</span>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Full Name & Student Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1">
                Họ và tên học sinh / Full Name *
              </label>
              <input
                type="text"
                required
                disabled={!isTeacher}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1">
                Mã học sinh / Student Code
              </label>
              <input
                type="text"
                disabled={!isTeacher}
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Gender & TEAM (TỔ THI ĐUA - CORE FIELD) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1">
                Giới tính / Gender
              </label>
              <select
                disabled={!isTeacher}
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-sky-500"
              >
                <option value="male">Nam / Boy</option>
                <option value="female">Nữ / Girl</option>
              </select>
            </div>

            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1 flex items-center justify-between">
                <span>Tổ thi đua / Team *</span>
                {isTeamChanged && (
                  <span className="text-[11px] text-amber-600 font-extrabold animate-pulse">
                    Đã chọn tổ mới!
                  </span>
                )}
              </label>
              <select
                disabled={!isTeacher}
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className={`w-full px-3 py-2 text-[13.5px] font-black rounded-xl border transition-all ${
                  isTeamChanged
                    ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-200 text-amber-950'
                    : 'border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-sky-500'
                }`}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameVi} ({t.nameEn})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notice when changing team */}
          {isTeamChanged && (
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[12px] font-bold text-amber-900 flex items-center gap-2">
              <span className="text-base">🚩</span>
              <span>
                Khi lưu, học sinh sẽ chuyển sang <b>{selectedTeam?.nameVi}</b>. Sĩ số hai tổ và nhãn màu trên sơ đồ lớp sẽ tự động cập nhật, đồng thời giữ nguyên vị trí ngồi và thành tích.
              </span>
            </div>
          )}

          {/* Date of Birth & Student Passcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1 flex items-center justify-between">
                <span>Ngày sinh / Date of Birth</span>
                {dob && (
                  <span className="text-[11px] text-pink-600 font-extrabold">
                    🎂 Tháng {parseInt(dob.split('-')[1] || dob.split('/')[1] || '0', 10) || ''}
                  </span>
                )}
              </label>
              <input
                type="date"
                disabled={!isTeacher}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11.5px] text-slate-600 mt-1 font-semibold leading-tight">
                🎂 Hệ thống tự động cập nhật bản tin sinh nhật theo tháng ngay khi lưu!
              </p>
            </div>
            <div>
              <label className="block text-[13.5px] font-black text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Mã PIN học sinh / Student PIN</span>
              </label>
              <input
                type="text"
                maxLength={6}
                disabled={!isTeacher}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3 py-2 text-[13.5px] font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Teacher Notes */}
          <div>
            <label className="block text-[13.5px] font-black text-slate-700 mb-1">
              Nhận xét của giáo viên / Teacher Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isTeacher}
              rows={2}
              className="w-full px-3 py-2 text-[13.5px] font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-sky-500"
              placeholder="Ghi chú về học tập, rèn luyện... / Notes on learning & behavior..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {isTeacher ? (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer transition"
              >
                <Trash2 className="w-4 h-4" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[13px] font-black">Xóa học sinh</span>
                  <span className="text-[11px] font-bold text-rose-500">Delete Student</span>
                </div>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition flex flex-col items-center leading-tight"
              >
                <span className="text-[13.5px] font-black">Hủy</span>
                <span className="text-[11px] font-bold text-slate-600">Cancel</span>
              </button>
              {isTeacher && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-md cursor-pointer transition disabled:opacity-50 flex flex-col items-center leading-tight"
                >
                  <span className="text-[14px] font-black">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                  <span className="text-[11px] font-bold text-white/95">{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Batch Reward Modal
interface BatchRewardModalProps {
  count: number;
  onClose: () => void;
  onSubmit: (delta: number, category: string, note: string) => Promise<void>;
}

const BatchRewardModal: React.FC<BatchRewardModalProps> = ({ count, onClose, onSubmit }) => {
  const [delta, setDelta] = useState(1);
  const [category, setCategory] = useState('Thưởng tập thể');
  const [note, setNote] = useState('Khen thưởng hoạt động nhóm xuất sắc');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(delta, category, note);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-sky-100">
        <h3 className="text-sm font-black text-[#263C72] mb-1">Thưởng sao cho {count} học sinh đã chọn</h3>
        <p className="text-xs text-slate-500 mb-4">Mỗi học sinh sẽ nhận được số sao tương ứng và ghi nhận vào lịch sử.</p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Chọn mức sao thưởng:</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDelta(val)}
                  className={`py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                    delta === val ? 'bg-amber-400 text-white ring-2 ring-amber-500 shadow-sm' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>+{val}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lý do khen thưởng:</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200"
              required
            />
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs shadow-md cursor-pointer"
            >
              {loading ? 'Đang thưởng...' : `Thưởng +${delta} sao`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
