import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Team,
  Student,
  AttendanceRecord,
  SeatingChart,
  SeatPosition,
  AttendanceStatus,
  RankingPeriod,
  ClassInfo,
} from '../types';
import {
  Users,
  Flag,
  CalendarCheck,
  Grid,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  Save,
  Check,
  Trophy,
  Award,
  Camera,
  Sparkles,
  Edit3,
  Image as ImageIcon,
  Star,
  X,
  Printer,
  School,
  GraduationCap,
  Archive,
  RotateCcw,
  Trash2,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
  Undo2,
} from 'lucide-react';
import { playStarSound } from '../utils/effects';
import { EditTeamModal } from './EditTeamModal';
import { DeleteClassModal } from './DeleteClassModal';
import {
  getDynamicPeriodOptions,
  getPeriodRange,
  DEFAULT_ACADEMIC_CONFIG,
  getAvailableSchoolWeeks,
  getAcademicMonthsForConfig,
  getCurrentAcademicMonthKey,
} from '../utils/timePeriodService';
import { api } from '../services/api';
import { AcademicCalendarConfig } from '../types';

interface ClassTeamsViewProps {
  teams: Team[];
  students: Student[];
  attendance: Record<string, AttendanceRecord>;
  seatingChart: SeatingChart;
  classes?: ClassInfo[];
  activeClassId?: string;
  onSelectClass?: (classId: string) => void;
  onCreateClassModalOpen?: () => void;
  onUpdateClass?: (id: string, updates: Partial<ClassInfo>) => Promise<ClassInfo>;
  onArchiveClass?: (id: string) => Promise<void>;
  onRestoreClass?: (id: string) => Promise<void>;
  onDeleteClass?: (id: string, confirmClassName?: string, permanent?: boolean) => Promise<void>;
  onTransitionClass?: (payload: {
    sourceClassId: string;
    newClassName: string;
    newGrade: number;
    newSchoolYear: string;
    studentIds: string[];
  }) => Promise<any>;
  onSaveAttendance: (date: string, records: Record<string, string>, note?: string) => Promise<void>;
  onSaveSeatingChart: (chart: Partial<SeatingChart>) => Promise<void>;
  onAddTeamPoints: (teamId: string, deltaPoints: number, reason: string) => Promise<void>;
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  onRefreshState?: () => Promise<void>;
  academicConfig?: AcademicCalendarConfig;
  isTeacher?: boolean;
}

export const ClassTeamsView: React.FC<ClassTeamsViewProps> = ({
  teams,
  students,
  attendance,
  seatingChart,
  classes = [],
  activeClassId = 'class_2a5',
  onSelectClass,
  onCreateClassModalOpen,
  onUpdateClass,
  onArchiveClass,
  onRestoreClass,
  onDeleteClass,
  onTransitionClass,
  onSaveAttendance,
  onSaveSeatingChart,
  onAddTeamPoints,
  onUpdateTeam,
  onRefreshState,
  academicConfig = DEFAULT_ACADEMIC_CONFIG,
  isTeacher = true,
}) => {
  const [activeTab, setActiveTab] = useState<'classes' | 'teams' | 'attendance' | 'seating'>('teams');
  const [selectedPeriod, setSelectedPeriod] = useState<RankingPeriod>('week');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => getCurrentAcademicMonthKey());
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Class Management State
  const [showArchivedClasses, setShowArchivedClasses] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassInfo | null>(null);
  const [deleteInputName, setDeleteInputName] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Transition Wizard State
  const [transitionModalClass, setTransitionModalClass] = useState<ClassInfo | null>(null);
  const [transitionYear, setTransitionYear] = useState('2027 - 2028');
  const [transitionGrade, setTransitionGrade] = useState<number>(3);
  const [transitionName, setTransitionName] = useState('Lớp 3A5');
  const [transitionSelectedStudents, setTransitionSelectedStudents] = useState<string[]>([]);
  const [transitioning, setTransitioning] = useState(false);

  // Attendance state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentRecords, setCurrentRecords] = useState<Record<string, AttendanceStatus>>(() => {
    return attendance[todayStr]?.records || {};
  });
  const [attendanceNote, setAttendanceNote] = useState<string>(attendance[todayStr]?.note || '');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSavedMessage, setAttendanceSavedMessage] = useState(false);

  // Seating state
  const [seats, setSeats] = useState<SeatPosition[]>(() => {
    if (seatingChart?.seats && seatingChart.seats.length > 0) {
      return seatingChart.seats;
    }
    const initial: SeatPosition[] = [];
    let count = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 7; c++) {
        const studentForSeat = students[count] ? students[count].id : null;
        initial.push({
          seatIndex: count,
          row: r,
          col: c,
          studentId: studentForSeat,
        });
        count++;
      }
    }
    return initial;
  });
  const [savingSeating, setSavingSeating] = useState(false);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);

  // Team Points Bonus modal
  const [bonusModalTeam, setBonusModalTeam] = useState<Team | null>(null);

  // Team Points Reset & Undo State
  const [resetTargetTeam, setResetTargetTeam] = useState<Team | 'all' | null>(null);
  const [isResettingTeam, setIsResettingTeam] = useState(false);
  const [isUndoingReset, setIsUndoingReset] = useState(false);
  const [lastUndoLogId, setLastUndoLogId] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<{ message: string; auditLogId?: string } | null>(null);

  const currentPeriodRange = getPeriodRange(selectedPeriod, academicConfig, new Date(), undefined, selectedMonthKey);

  const handleConfirmResetTeam = async () => {
    if (!resetTargetTeam) return;
    setIsResettingTeam(true);
    try {
      const isAll = resetTargetTeam === 'all';
      const teamId = isAll ? undefined : resetTargetTeam.id;
      const res = await api.resetTeamPoints({
        teamId,
        classId: activeClassId,
        actor: 'Cô Thảo',
      });
      playStarSound('click');
      if (onRefreshState) await onRefreshState();
      const logId = res.auditLog?.id || null;
      setLastUndoLogId(logId);
      setUndoToast({
        message: res.message || (isAll ? 'Đã đặt lại điểm thi đua của 4 tổ về 0 ⭐.' : `Đã đặt lại điểm của ${resetTargetTeam.nameVi} về 0 ⭐.`),
        auditLogId: logId || undefined,
      });
      setResetTargetTeam(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi đặt lại điểm tổ');
    } finally {
      setIsResettingTeam(false);
    }
  };

  const handleExecuteUndo = async (logId?: string) => {
    setIsUndoingReset(true);
    try {
      await api.undoResetTeamPoints({
        auditLogId: logId || lastUndoLogId || undefined,
        classId: activeClassId,
      });
      playStarSound('win');
      if (onRefreshState) await onRefreshState();
      setUndoToast({
        message: 'Hoàn tác thành công! Điểm thưởng sao của tổ đã được phục hồi nguyên vẹn.',
      });
      setLastUndoLogId(null);
      setTimeout(() => setUndoToast(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi hoàn tác đặt lại điểm');
    } finally {
      setIsUndoingReset(false);
    }
  };

  // Edit Class Form states
  const [editClassNameVi, setEditClassNameVi] = useState('');
  const [editClassNameEn, setEditClassNameEn] = useState('');
  const [editGrade, setEditGrade] = useState(2);
  const [editSchoolYear, setEditSchoolYear] = useState('');
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editSloganVi, setEditSloganVi] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // 1-Click All Present
  const handleMarkAllPresent = () => {
    playStarSound('click');
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      next[s.id] = 'present';
    });
    setCurrentRecords(next);
  };

  const handleToggleAttendance = (studentId: string, status: AttendanceStatus) => {
    setCurrentRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    await onSaveAttendance(selectedDate, currentRecords, attendanceNote);
    setSavingAttendance(false);
    setAttendanceSavedMessage(true);
    playStarSound('star');
    setTimeout(() => setAttendanceSavedMessage(false), 3000);
  };

  const handleExportAttendanceExcel = () => {
    try {
      playStarSound('click');
      const rows = students.map((s, idx) => {
        const st = currentRecords[s.id] || 'present';
        const stText = st === 'present' ? 'Có mặt' : st === 'excused' ? 'Vắng có phép' : 'Vắng không phép';
        return {
          'STT': idx + 1,
          'Mã học sinh': s.studentCode,
          'Họ và tên': s.fullName,
          'Ngày': selectedDate,
          'Trạng thái': stText,
          'Ghi chú': attendanceNote || '',
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `Diem_danh_${selectedDate}`);
      XLSX.writeFile(wb, `Diem_danh_${selectedDate}.xlsx`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi xuất điểm danh');
    }
  };

  // Seating click
  const handleSeatClick = (seatIndex: number) => {
    if (selectedSeatIndex === null) {
      setSelectedSeatIndex(seatIndex);
    } else {
      const newSeats = [...seats];
      const idxA = newSeats.findIndex((s) => s.seatIndex === selectedSeatIndex);
      const idxB = newSeats.findIndex((s) => s.seatIndex === seatIndex);
      if (idxA !== -1 && idxB !== -1) {
        const tempStudent = newSeats[idxA].studentId;
        newSeats[idxA].studentId = newSeats[idxB].studentId;
        newSeats[idxB].studentId = tempStudent;
        setSeats(newSeats);
        playStarSound('click');
      }
      setSelectedSeatIndex(null);
    }
  };

  const handleSaveSeating = async () => {
    setSavingSeating(true);
    await onSaveSeatingChart({
      seats,
      updatedAt: new Date().toISOString(),
    });
    setSavingSeating(false);
    playStarSound('star');
  };

  const openEditClassModal = (cls: ClassInfo) => {
    setEditingClass(cls);
    setEditClassNameVi(cls.nameVi);
    setEditClassNameEn(cls.nameEn || cls.nameVi);
    setEditGrade(cls.grade || 2);
    setEditSchoolYear(cls.schoolYear || '2026 - 2027');
    setEditTeacherName(cls.teacherName || 'Cô Thảo');
    setEditSloganVi(cls.sloganVi || 'Mỗi ngày vui học – Mỗi ngày tỏa sáng!');
  };

  const handleSaveClassEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !onUpdateClass) return;
    setEditSaving(true);
    try {
      await onUpdateClass(editingClass.id, {
        nameVi: editClassNameVi.trim(),
        nameEn: editClassNameEn.trim(),
        grade: editGrade,
        schoolYear: editSchoolYear.trim(),
        teacherName: editTeacherName.trim(),
        sloganVi: editSloganVi.trim(),
      });
      playStarSound('star');
      setEditingClass(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi cập nhật thông tin lớp');
    } finally {
      setEditSaving(false);
    }
  };

  const handleConfirmSafeDelete = async () => {
    if (!classToDelete || !onDeleteClass) return;
    if (deleteInputName.trim().toLowerCase() !== classToDelete.nameVi.trim().toLowerCase()) {
      setDeleteError(`Tên lớp nhập vào không khớp. Vui lòng nhập chính xác: "${classToDelete.nameVi}"`);
      return;
    }
    try {
      await onDeleteClass(classToDelete.id);
      playStarSound('click');
      setClassToDelete(null);
      setDeleteInputName('');
      setDeleteError(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Lỗi khi xóa lớp');
    }
  };

  const openTransitionWizard = (cls: ClassInfo) => {
    setTransitionModalClass(cls);
    const nextGrade = (cls.grade || 2) + 1;
    setTransitionGrade(nextGrade);
    setTransitionName(`Lớp ${nextGrade}A5`);
    setTransitionYear('2027 - 2028');
    setTransitionSelectedStudents(students.map((s) => s.id));
  };

  const handleExecuteTransition = async () => {
    if (!transitionModalClass || !onTransitionClass) return;
    setTransitioning(true);
    try {
      await onTransitionClass({
        sourceClassId: transitionModalClass.id,
        newClassName: transitionName.trim(),
        newGrade: transitionGrade,
        newSchoolYear: transitionYear.trim(),
        studentIds: transitionSelectedStudents,
      });
      playStarSound('win');
      setTransitionModalClass(null);
      alert('Chuyển năm học thành công! Lớp mới đã được tạo và học sinh được thăng hạng.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi chuyển năm học');
    } finally {
      setTransitioning(false);
    }
  };

  const presentCount = Object.values(currentRecords).filter((s) => s === 'present').length;
  const excusedCount = Object.values(currentRecords).filter((s) => s === 'excused').length;
  const absentCount = Object.values(currentRecords).filter((s) => s === 'absent').length;

  const displayedClasses = classes.filter((c) => showArchivedClasses || !c.isArchived);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 border border-sky-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 shadow-2xs">
            <Flag className="w-7 h-7" />
          </div>
          <div>
            <h2 className="typo-title-section text-[#263C72] leading-tight">
              Lớp và Tổ Thi Đua
            </h2>
            <p className="text-[13.5px] font-extrabold text-emerald-700 leading-tight">
              Class & Teams Management
            </p>
            <p className="text-[12.5px] font-bold text-slate-600 mt-0.5">
              Quản lý lớp học, 4 tổ thi đua, điểm danh và sơ đồ lớp / Classes, 4 teams, attendance & seating chart
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('classes');
            }}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'classes' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <School className="w-4.5 h-4.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Quản lý lớp ({displayedClasses.length})</span>
              <span className="text-[11px] font-bold text-slate-600">Classes</span>
            </div>
          </button>
          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('teams');
            }}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'teams' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Flag className="w-4.5 h-4.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">4 Tổ thi đua</span>
              <span className="text-[11px] font-bold text-slate-600">4 Teams</span>
            </div>
          </button>
          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('attendance');
            }}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'attendance' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <CalendarCheck className="w-4.5 h-4.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Điểm danh</span>
              <span className="text-[11px] font-bold text-slate-600">Attendance</span>
            </div>
          </button>
          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('seating');
            }}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'seating' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Grid className="w-4.5 h-4.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Sơ đồ lớp</span>
              <span className="text-[11px] font-bold text-slate-600">Seating Chart</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tab 0: Class Lifecycle Management */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
                <School className="w-5 h-5 text-emerald-600" />
                <span>Danh sách lớp học trong hệ thống</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Quản lý thông tin, lưu kho, chuyển năm học và bảo tồn lịch sử điểm sao
              </p>
            </div>

            {isTeacher && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowArchivedClasses(!showArchivedClasses)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    showArchivedClasses ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{showArchivedClasses ? 'Ẩn lớp đã lưu kho' : 'Xem cả lớp lưu kho'}</span>
                </button>

                {onCreateClassModalOpen && (
                  <button
                    onClick={() => {
                      playStarSound('click');
                      onCreateClassModalOpen();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Tạo lớp học mới</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedClasses.map((cls) => {
              const isActive = cls.id === activeClassId;
              return (
                <div
                  key={cls.id}
                  className={`p-5 rounded-3xl border transition flex flex-col justify-between relative ${
                    cls.isArchived
                      ? 'border-dashed border-slate-300 bg-slate-50 opacity-75'
                      : isActive
                      ? 'border-emerald-400 bg-emerald-50/30 shadow-md ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-white hover:border-emerald-300 shadow-2xs'
                  }`}
                >
                  {/* Status Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                          Đang hoạt động
                        </span>
                      )}
                      {cls.isArchived && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-500 text-white text-[10px] font-black uppercase tracking-wider">
                          Đã lưu kho
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-500">{cls.schoolYear}</span>
                  </div>

                  {/* Class Info */}
                  <div className="space-y-1 mb-4">
                    <h4 className="text-lg font-black text-slate-800">{cls.nameVi}</h4>
                    <p className="text-xs text-slate-500">{cls.nameEn} • Khối {cls.grade}</p>
                    <p className="text-xs font-semibold text-emerald-800">GV: {cls.teacherName}</p>
                    <p className="text-[11px] text-slate-600 italic bg-slate-100/80 p-2 rounded-xl mt-2 line-clamp-2">
                      "{cls.sloganVi}"
                    </p>
                  </div>

                  {/* Actions */}
                  {isTeacher && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-2">
                      {!isActive && !cls.isArchived && onSelectClass && (
                        <button
                          onClick={() => {
                            playStarSound('click');
                            onSelectClass(cls.id);
                          }}
                          className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-xs"
                        >
                          Chọn làm lớp hiện tại
                        </button>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditClassModal(cls)}
                          className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                          <span>Sửa</span>
                        </button>

                        {!cls.isArchived && (
                          <button
                            onClick={() => openTransitionWizard(cls)}
                            className="flex-1 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                            title="Chuyển lớp sang năm học mới"
                          >
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Lên lớp</span>
                          </button>
                        )}

                        {cls.isArchived ? (
                          <button
                            onClick={async () => {
                              if (onRestoreClass) {
                                await onRestoreClass(cls.id);
                                playStarSound('star');
                              }
                            }}
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                            title="Phục hồi lớp"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              if (confirm(`Bạn có chắc muốn lưu kho lớp "${cls.nameVi}"?`)) {
                                if (onArchiveClass) await onArchiveClass(cls.id);
                                playStarSound('click');
                              }
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                            title="Lưu kho lớp"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setClassToDelete(cls);
                            setDeleteInputName('');
                            setDeleteError(null);
                          }}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Xóa lớp an toàn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 1: 4 Teams Management */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          {/* Period Selector & Ranking Header */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-sky-100 shadow-xs flex flex-col xl:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full xl:w-auto">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-600 shadow-2xs shrink-0">
                <Trophy className="w-6 h-6 fill-amber-400 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[16px] sm:text-[17px] font-black text-[#263C72]">
                    Thi đua 4 tổ • 4 Teams Competition
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[12.5px] font-black border border-amber-300">
                    {currentPeriodRange.labelVi} / {currentPeriodRange.labelEn}
                  </span>
                </div>
                <p className="text-[12.5px] font-bold text-slate-600 mt-0.5">
                  Xem bảng xếp hạng, điểm thưởng của 4 tổ và hỗ trợ đặt lại / hoàn tác • Team rankings, rewards & reset/undo
                </p>
              </div>
            </div>

            {/* Actions & 5 Period Toggle Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
              {/* Period Options */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
                {getDynamicPeriodOptions(academicConfig).map((p) => {
                  const isCurrent = selectedPeriod === p.id;
                  const displayLabel = p.id === 'month' && isCurrent ? currentPeriodRange.labelVi : p.labelVi;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        playStarSound('click');
                        setSelectedPeriod(p.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                        isCurrent
                          ? p.bgActive
                          : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <span>{p.icon}</span>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-[12.5px] font-black">{displayLabel}</span>
                        <span className={`text-[10.5px] font-bold ${isCurrent ? 'text-white/95' : 'text-slate-600'}`}>{p.labelEn}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Reset All & Undo Reset Buttons for Teacher */}
              {isTeacher && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      playStarSound('click');
                      setResetTargetTeam('all');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 cursor-pointer transition shadow-2xs active:scale-95"
                    title="Đặt lại điểm thi đua của 4 tổ về 0 (Có thể hoàn tác)"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[12.5px] font-black">Reset 4 tổ</span>
                      <span className="text-[10.5px] font-bold text-amber-800">Reset All</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteUndo()}
                    disabled={isUndoingReset}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs active:scale-95 ${
                      lastUndoLogId
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-300 animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                    title="Hoàn tác lần đặt lại điểm thi đua gần nhất của tổ"
                  >
                    <Undo2 className="w-4 h-4" />
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[12.5px] font-black">{isUndoingReset ? 'Đang hoàn tác...' : 'Hoàn tác'}</span>
                      <span className="text-[10.5px] font-bold opacity-85">Undo Reset</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated 9-Month Selector for Teams when selectedPeriod === 'month' */}
          {selectedPeriod === 'month' && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 rounded-3xl p-3.5 sm:p-4 border border-emerald-200 shadow-2xs space-y-2.5 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <span>📅 Chọn tháng thi đua 4 tổ (Năm học 2026 - 2027: Tháng 9/2026 – Tháng 5/2027):</span>
                </span>
                <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  Đang xem: <b className="text-emerald-700">{currentPeriodRange.labelVi}</b>
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                {getAcademicMonthsForConfig(academicConfig).map((m) => {
                  const isSelected = selectedMonthKey === m.monthKey;
                  return (
                    <button
                      key={m.monthKey}
                      type="button"
                      onClick={() => {
                        playStarSound('click');
                        setSelectedMonthKey(m.monthKey);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center border relative ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                          : m.isCurrent
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                          : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div>{m.labelVi}</div>
                      {m.isCurrent && (
                        <span className="absolute -top-1 -right-1 text-[9px]">⭐</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Undo Toast Banner */}
          {undoToast && (
            <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg border-2 border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-black">{undoToast.message}</h4>
                  <p className="text-xs text-amber-100 font-bold mt-0.5">
                    Hệ thống đã lưu lại bản ghi điểm số trước đó. Bạn có thể bấm "Hoàn tác ngay" bất kỳ lúc nào để khôi phục.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExecuteUndo(undoToast.auditLogId)}
                  disabled={isUndoingReset}
                  className="px-4 py-2 rounded-xl bg-white text-amber-950 hover:bg-amber-50 text-xs font-black shadow-md cursor-pointer transition active:scale-95 flex items-center gap-1.5"
                >
                  <Undo2 className="w-4 h-4 text-amber-700" />
                  <span>{isUndoingReset ? 'Đang hoàn tác...' : 'Hoàn tác ngay (Undo)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUndoToast(null)}
                  className="p-1.5 hover:bg-white/20 rounded-xl cursor-pointer text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 4 Team Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teams.map((team, idx) => {
              const members = students.filter((s) => s.teamId === team.id);
              const leader = students.find((s) => s.id === team.leaderId);
              return (
                <div
                  key={team.id}
                  className={`p-4 rounded-3xl border ${team.borderColor || 'border-slate-200'} ${team.bgColor || 'bg-slate-50'} shadow-xs flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-2xs"
                          style={{ backgroundColor: team.color }}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">{team.nameVi}</h4>
                          <span className="text-xs font-bold text-slate-500">{team.nameEn}</span>
                        </div>
                      </div>
                      <span className="text-2xl">{team.mascot}</span>
                    </div>

                    <div className="p-3 bg-white/80 rounded-2xl border border-slate-100 mb-3 space-y-1.5 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-bold">Tổ trưởng / Leader:</span>
                        <span className="font-black text-slate-800">{leader ? leader.fullName : 'Chưa chọn'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-bold">Thành viên / Members:</span>
                        <span className="font-black text-slate-800">{members.length} em / students</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-bold">Điểm thi đua / Points:</span>
                        <span className="font-black text-amber-700 text-[16px]">{team.points} ⭐</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {members.slice(0, 6).map((m) => (
                        <span
                          key={m.id}
                          className="text-[12px] font-bold px-2 py-0.5 rounded-lg bg-white/90 text-slate-700 border border-slate-200"
                        >
                          {m.fullName.split(' ').slice(-2).join(' ')}
                        </span>
                      ))}
                      {members.length > 6 && (
                        <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-lg bg-slate-200 text-slate-600">
                          +{members.length - 6}
                        </span>
                      )}
                    </div>
                  </div>

                  {isTeacher && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                      <button
                        onClick={() => setEditingTeam(team)}
                        className="w-full py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-sky-600" />
                        <div className="flex flex-col items-start leading-tight">
                          <span className="text-[12.5px] font-black">Đổi ảnh & Sửa tổ</span>
                          <span className="text-[10.5px] font-bold text-slate-600">Edit Team & Avatar</span>
                        </div>
                      </button>
                      
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setBonusModalTeam(team)}
                          className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
                          title="Cộng điểm thi đua cho tổ"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-[12.5px] font-black">Thưởng điểm</span>
                            <span className="text-[10.5px] font-bold text-white/95">Bonus Points</span>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            playStarSound('click');
                            setResetTargetTeam(team);
                          }}
                          className="py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
                          title={`Đặt lại điểm thi đua của ${team.nameVi} về 0 (Có thể hoàn tác)`}
                        >
                          <RotateCcw className="w-4 h-4 text-amber-700" />
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-[12.5px] font-black">Reset điểm</span>
                            <span className="text-[10.5px] font-bold text-amber-800">Reset Score</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <label className="text-xs font-black text-slate-700">Ngày điểm danh:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAttendanceExcel}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel (.xlsx)</span>
              </button>

              {isTeacher && (
                <>
                  <button
                    onClick={handleMarkAllPresent}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tất cả có mặt (1 chạm)</span>
                  </button>

                  <button
                    onClick={handleSaveAttendance}
                    disabled={savingAttendance}
                    className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingAttendance ? 'Đang lưu...' : 'Lưu điểm danh'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {attendanceSavedMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Đã lưu kết quả điểm danh ngày {selectedDate} thành công!</span>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-xl font-black text-emerald-950 block">{presentCount}</span>
              <span className="text-xs font-bold text-emerald-700">Có mặt</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-xl font-black text-amber-950 block">{excusedCount}</span>
              <span className="text-xs font-bold text-amber-700">Vắng có phép</span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-xl font-black text-rose-950 block">{absentCount}</span>
              <span className="text-xs font-bold text-rose-700">Vắng không phép</span>
            </div>
          </div>

          {/* Students Attendance List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {students.map((student) => {
              const status = currentRecords[student.id] || 'present';
              return (
                <div
                  key={student.id}
                  className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={student.avatarUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=80'}
                      alt={student.fullName}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{student.fullName}</p>
                      <span className="text-[10px] text-slate-400">{student.studentCode}</span>
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(student.id, 'present')}
                      className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                        status === 'present' ? 'bg-emerald-500 text-white shadow-2xs' : 'bg-slate-200 text-slate-600'
                      }`}
                      title="Có mặt"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(student.id, 'excused')}
                      className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                        status === 'excused' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-200 text-slate-600'
                      }`}
                      title="Vắng có phép"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(student.id, 'absent')}
                      className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                        status === 'absent' ? 'bg-rose-500 text-white shadow-2xs' : 'bg-slate-200 text-slate-600'
                      }`}
                      title="Vắng không phép"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Seating Chart */}
      {activeTab === 'seating' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
                <Grid className="w-5 h-5 text-indigo-600" />
                <span>Sơ đồ chỗ ngồi lớp học (4 dãy x 7 bàn)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Nhấn vào một học sinh, sau đó nhấn vào vị trí khác để hoán đổi chỗ ngồi
              </p>
            </div>

            {isTeacher && (
              <button
                onClick={handleSaveSeating}
                disabled={savingSeating}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingSeating ? 'Đang lưu...' : 'Lưu sơ đồ'}</span>
              </button>
            )}
          </div>

          {/* Teacher Desk Indicator */}
          <div className="w-48 mx-auto py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs text-center shadow-2xs">
            BÀN GIÁO VIÊN (CÔ THẢO) 👩‍🏫
          </div>

          {/* Seating Grid: 4 rows x 7 cols */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 pt-4">
            {seats.map((seat) => {
              const student = students.find((s) => s.id === seat.studentId);
              const isSelected = selectedSeatIndex === seat.seatIndex;
              return (
                <div
                  key={seat.seatIndex}
                  onClick={() => handleSeatClick(seat.seatIndex)}
                  className={`p-2.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[90px] ${
                    isSelected
                      ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300 scale-105'
                      : student
                      ? 'border-slate-200 bg-slate-50 hover:border-sky-300'
                      : 'border-dashed border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-bold block">
                    Bàn {seat.seatIndex + 1}
                  </span>

                  {student ? (
                    <>
                      <img
                        src={student.avatarUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=80'}
                        alt={student.fullName}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 my-1"
                      />
                      <span className="text-[11px] font-black text-slate-800 line-clamp-1">
                        {student.fullName.split(' ').slice(-2).join(' ')}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-300 my-auto">Trống</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-sky-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>Chỉnh sửa thông tin lớp</span>
              </h3>
              <button onClick={() => setEditingClass(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveClassEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp (Tiếng Việt) *</label>
                <input
                  type="text"
                  required
                  value={editClassNameVi}
                  onChange={(e) => setEditClassNameVi(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tiếng Anh (Class Name EN)</label>
                <input
                  type="text"
                  value={editClassNameEn}
                  onChange={(e) => setEditClassNameEn(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp (Grade)</label>
                  <select
                    value={editGrade}
                    onChange={(e) => setEditGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>Khối {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Năm học</label>
                  <input
                    type="text"
                    value={editSchoolYear}
                    onChange={(e) => setEditSchoolYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Giáo viên chủ nhiệm</label>
                <input
                  type="text"
                  value={editTeacherName}
                  onChange={(e) => setEditTeacherName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khẩu hiệu lớp</label>
                <input
                  type="text"
                  value={editSloganVi}
                  onChange={(e) => setEditSloganVi(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs cursor-pointer"
                >
                  {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Class Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-rose-200">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-black">Xác nhận xóa lớp an toàn</h3>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Bạn đang thực hiện xóa lớp <b>"{classToDelete.nameVi}"</b> ({classToDelete.schoolYear}).
            </p>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-semibold mb-3 leading-relaxed">
              ⭐ <b>Bảo toàn lịch sử:</b> Lớp sẽ được đánh dấu lưu kho ẩn để tránh rủi ro mất mát dữ liệu. Mọi điểm sao và lịch sử vinh danh của học sinh luôn được giữ nguyên an toàn.
            </div>

            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Để xác nhận, vui lòng gõ lại chính xác tên lớp: <span className="text-rose-600 font-black">{classToDelete.nameVi}</span>
              </label>
              <input
                type="text"
                placeholder={classToDelete.nameVi}
                value={deleteInputName}
                onChange={(e) => {
                  setDeleteInputName(e.target.value);
                  setDeleteError(null);
                }}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50/30"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-rose-600 font-bold mb-3">{deleteError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmSafeDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs cursor-pointer"
              >
                Xác nhận xóa lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Year Transition Wizard Modal */}
      {transitionModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-indigo-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-indigo-950">
                  Chuyển năm học mới (Academic Year Transition)
                </h3>
              </div>
              <button onClick={() => setTransitionModalClass(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Hệ thống sẽ tạo lớp mới cho năm học kế tiếp, đưa danh sách học sinh được chọn lên lớp mới và lưu kho lớp cũ <b>"{transitionModalClass.nameVi}"</b> để bảo toàn trọn vẹn lịch sử.
            </p>

            <div className="space-y-3 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Năm học mới:</label>
                  <input
                    type="text"
                    value={transitionYear}
                    onChange={(e) => setTransitionYear(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp mới:</label>
                  <select
                    value={transitionGrade}
                    onChange={(e) => setTransitionGrade(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>Khối {g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp mới:</label>
                <input
                  type="text"
                  value={transitionName}
                  onChange={(e) => setTransitionName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Chọn học sinh lên lớp ({transitionSelectedStudents.length}/{students.length}):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (transitionSelectedStudents.length === students.length) {
                        setTransitionSelectedStudents([]);
                      } else {
                        setTransitionSelectedStudents(students.map((s) => s.id));
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {transitionSelectedStudents.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 p-2">
                  {students.map((s) => {
                    const checked = transitionSelectedStudents.includes(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-2 py-1 px-1 text-xs cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTransitionSelectedStudents([...transitionSelectedStudents, s.id]);
                            } else {
                              setTransitionSelectedStudents(transitionSelectedStudents.filter((id) => id !== s.id));
                            }
                          }}
                        />
                        <span className="font-semibold text-slate-800">{s.fullName}</span>
                        <span className="text-[10px] text-slate-400">({s.studentCode})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTransitionModalClass(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteTransition}
                disabled={transitioning || transitionSelectedStudents.length === 0}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs cursor-pointer"
              >
                {transitioning ? 'Đang chuyển lớp...' : 'Bắt đầu năm học mới 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Points Bonus Modal */}
      {bonusModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-sky-100">
            <h3 className="text-base font-black text-slate-800 mb-1">
              Thưởng điểm thi đua: {bonusModalTeam.nameVi}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cộng điểm sao trực tiếp cho toàn thể thành viên tổ
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const pts = Number(form.points.value);
                const reason = form.reason.value;
                await onAddTeamPoints(bonusModalTeam.id, pts, reason);
                playStarSound('win');
                setBonusModalTeam(null);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số sao thưởng:</label>
                <input
                  type="number"
                  name="points"
                  defaultValue={10}
                  required
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lý do khen thưởng tổ:</label>
                <input
                  type="text"
                  name="reason"
                  defaultValue="Hoạt động nhóm sôi nổi, kỷ luật tốt"
                  required
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBonusModalTeam(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs cursor-pointer"
                >
                  Cộng điểm ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Points Reset Confirmation Modal */}
      {resetTargetTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in font-['Nunito',sans-serif]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-2 border-amber-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                <RotateCcw className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#263C72]">
                  {resetTargetTeam === 'all'
                    ? 'Đặt lại điểm thi đua của 4 tổ?'
                    : `Đặt lại điểm thi đua: ${resetTargetTeam.nameVi}?`}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  {resetTargetTeam === 'all'
                    ? 'Điểm thi đua của cả 4 tổ sẽ chuyển về 0 ⭐'
                    : `Điểm hiện tại: ${resetTargetTeam.points} ⭐ sẽ chuyển về 0 ⭐`}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 mb-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Hoàn tác an toàn 100%</span>
              </div>
              <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                Hệ thống tự động lưu bản sao lưu điểm số hiện tại vào nhật ký. Sau khi đặt lại, cô có thể bấm nút <b>"Hoàn tác"</b> bất kỳ lúc nào để khôi phục nguyên vẹn điểm số ban đầu.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetTargetTeam(null)}
                disabled={isResettingTeam}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmResetTeam}
                disabled={isResettingTeam}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md cursor-pointer transition active:scale-95 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isResettingTeam ? 'Đang đặt lại...' : 'Xác nhận đặt lại (Có hoàn tác)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <EditTeamModal
          team={editingTeam}
          students={students}
          onClose={() => setEditingTeam(null)}
          onSave={async (updates) => {
            await onUpdateTeam(editingTeam.id, updates);
            setEditingTeam(null);
          }}
        />
      )}

      {/* Delete / Archive Class Modal */}
      {classToDelete && (
        <DeleteClassModal
          classInfo={classToDelete}
          totalClassesCount={classes.length}
          studentCount={students.filter((s) => s.classId === classToDelete.id).length || classToDelete.targetSize}
          onClose={() => setClassToDelete(null)}
          onConfirmArchive={async (cId) => {
            if (onArchiveClass) {
              await onArchiveClass(cId);
            }
          }}
          onConfirmPermanentDelete={async (cId, confirmName) => {
            if (onDeleteClass) {
              await onDeleteClass(cId, confirmName, true);
            }
          }}
        />
      )}
    </div>
  );
};
