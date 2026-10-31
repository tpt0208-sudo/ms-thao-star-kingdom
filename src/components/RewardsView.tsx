import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Reward,
  Student,
  Team,
  LevelRule,
  RewardRedemption,
  StarTransaction,
  RankingPeriod,
  AcademicCalendarConfig,
  FinalizedResult,
} from '../types';
import {
  Gift,
  Star,
  Award,
  Sparkles,
  History,
  CheckCircle,
  Plus,
  Shield,
  Clock,
  X,
  AlertCircle,
  Pencil,
  Trash2,
  Archive,
  Image as ImageIcon,
  Check,
  FileSpreadsheet,
  Printer,
  Calendar,
  Lock,
  RotateCcw,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { triggerGrandCelebration, playStarSound } from '../utils/effects';
import {
  getDynamicPeriodOptions,
  getPeriodRange,
  filterTransactionsByPeriod,
  getStudentPeriodStars,
  getTeamPeriodPoints,
  DEFAULT_ACADEMIC_CONFIG,
} from '../utils/timePeriodService';

interface RewardsViewProps {
  rewards: Reward[];
  students: Student[];
  teams?: Team[];
  levelRules: LevelRule[];
  redemptions: RewardRedemption[];
  starTransactions: StarTransaction[];
  academicConfig?: AcademicCalendarConfig;
  finalizedResults?: FinalizedResult[];
  onRedeemReward: (rewardId: string, studentId: string) => Promise<void>;
  onAddReward: (reward: Partial<Reward>) => Promise<Reward>;
  onUpdateReward?: (id: string, updates: Partial<Reward>) => Promise<Reward>;
  onDeleteReward?: (id: string) => Promise<void>;
  onFinalizePeriod?: (snapshot: {
    period: RankingPeriod;
    periodLabel: string;
    notes?: string;
    studentRankings: any[];
    teamRankings: any[];
  }) => Promise<FinalizedResult>;
  onUndoTransaction?: (transactionId: string) => Promise<void>;
  isTeacher?: boolean;
  currentStudent?: Student | null;
}

export const RewardsView: React.FC<RewardsViewProps> = ({
  rewards,
  students,
  teams = [],
  levelRules,
  redemptions,
  starTransactions,
  academicConfig = DEFAULT_ACADEMIC_CONFIG,
  finalizedResults = [],
  onRedeemReward,
  onAddReward,
  onUpdateReward,
  onDeleteReward,
  onFinalizePeriod,
  onUndoTransaction,
  isTeacher = true,
  currentStudent = null,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'shop' | 'levels' | 'history'>('stats');
  const [selectedPeriod, setSelectedPeriod] = useState<RankingPeriod>('week');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeemStudentId, setRedeemStudentId] = useState<string>(currentStudent?.id || students[0]?.id || '');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editReward, setEditReward] = useState<Reward | null>(null);
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);

  // Finalize Results Modal
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [finalizeNotes, setFinalizeNotes] = useState('');
  const [finalizing, setFinalizing] = useState(false);

  // Search in transactions
  const [txSearch, setTxSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states for Add/Edit
  const [formTitleVi, setFormTitleVi] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formStarCost, setFormStarCost] = useState(15);
  const [formStock, setFormStock] = useState(10);
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  const periodRange = useMemo(() => {
    return getPeriodRange(selectedPeriod, academicConfig);
  }, [selectedPeriod, academicConfig]);

  // Filter transactions for current period
  const periodTransactions = useMemo(() => {
    return filterTransactionsByPeriod(starTransactions, selectedPeriod, academicConfig);
  }, [starTransactions, selectedPeriod, academicConfig]);

  // Aggregate stats in period
  const periodStats = useMemo(() => {
    let awarded = 0;
    let deducted = 0;
    for (const tx of periodTransactions) {
      if (tx.deltaStars > 0) awarded += tx.deltaStars;
      else deducted += Math.abs(tx.deltaStars);
    }
    return {
      awarded,
      deducted,
      net: Math.max(0, awarded - deducted),
      count: periodTransactions.length,
    };
  }, [periodTransactions]);

  // Students stats in period
  const rankedStudentsInPeriod = useMemo(() => {
    const list = students.map((st) => {
      const pStats = getStudentPeriodStars(st, starTransactions, selectedPeriod, academicConfig);
      const team = teams.find((t) => t.id === st.teamId);
      return {
        student: st,
        earned: pStats.earned,
        deducted: pStats.deducted,
        net: pStats.net,
        team,
      };
    });

    list.sort((a, b) => b.net - a.net || b.earned - a.earned);
    return list;
  }, [students, starTransactions, selectedPeriod, academicConfig, teams]);

  // Team stats in period
  const rankedTeamsInPeriod = useMemo(() => {
    const list = teams.map((tm) => {
      const points = getTeamPeriodPoints(tm, starTransactions, selectedPeriod, academicConfig);
      return {
        team: tm,
        points,
      };
    });
    list.sort((a, b) => b.points - a.points);
    return list;
  }, [teams, starTransactions, selectedPeriod, academicConfig]);

  // Check if current period has already been finalized
  const existingFinalized = useMemo(() => {
    return finalizedResults.find((f) => f.period === selectedPeriod);
  }, [finalizedResults, selectedPeriod]);

  // Filtered transactions with search
  const filteredTxs = useMemo(() => {
    if (!txSearch.trim()) return periodTransactions;
    const q = txSearch.toLowerCase().trim();
    return periodTransactions.filter(
      (tx) =>
        tx.reasonCategory.toLowerCase().includes(q) ||
        tx.reasonNote.toLowerCase().includes(q) ||
        tx.studentName?.toLowerCase().includes(q) ||
        students.find((s) => s.id === tx.studentId)?.studentCode.toLowerCase().includes(q)
    );
  }, [periodTransactions, txSearch]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const openAddModal = () => {
    playStarSound('click');
    setFormTitleVi('');
    setFormTitleEn('');
    setFormStarCost(15);
    setFormStock(10);
    setFormDescription('');
    setFormImageUrl('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (reward: Reward) => {
    playStarSound('click');
    setEditReward(reward);
    setFormTitleVi(reward.titleVi);
    setFormTitleEn(reward.titleEn || reward.titleVi);
    setFormStarCost(reward.starCost);
    setFormStock(reward.stock);
    setFormDescription(reward.description || '');
    setFormImageUrl(reward.imageUrl || '');
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !redeemStudentId) return;
    setError(null);
    setLoading(true);
    try {
      await onRedeemReward(selectedReward.id, redeemStudentId);
      playStarSound('win');
      triggerGrandCelebration();
      setSelectedReward(null);
      showToast('Đổi quà thành công! Học sinh đã nhận phần thưởng.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi đổi quà');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleVi.trim()) return;
    setLoading(true);
    try {
      await onAddReward({
        titleVi: formTitleVi.trim(),
        titleEn: formTitleEn.trim() || formTitleVi.trim(),
        starCost: formStarCost,
        stock: formStock,
        description: formDescription.trim(),
        imageUrl: formImageUrl.trim() || undefined,
      });
      playStarSound('star');
      setIsAddModalOpen(false);
      showToast('Đã thêm phần quà mới vào kho!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo phần quà');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReward || !onUpdateReward) return;
    setLoading(true);
    try {
      await onUpdateReward(editReward.id, {
        titleVi: formTitleVi.trim(),
        titleEn: formTitleEn.trim() || formTitleVi.trim(),
        starCost: formStarCost,
        stock: formStock,
        description: formDescription.trim(),
        imageUrl: formImageUrl.trim() || undefined,
      });
      playStarSound('star');
      setEditReward(null);
      showToast('Đã cập nhật phần quà!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi cập nhật phần quà');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!rewardToDelete) return;
    setLoading(true);
    try {
      if (onDeleteReward) {
        await onDeleteReward(rewardToDelete.id);
      } else if (onUpdateReward) {
        await onUpdateReward(rewardToDelete.id, { isArchived: true });
      }
      playStarSound('click');
      setRewardToDelete(null);
      showToast('Đã lưu kho phần quà an toàn.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu kho phần quà');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreReward = async (reward: Reward) => {
    if (!onUpdateReward) return;
    try {
      await onUpdateReward(reward.id, { isArchived: false, isActive: true });
      playStarSound('star');
      showToast(`Đã phục hồi phần quà "${reward.titleVi}"!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi phục hồi quà');
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setFormImageUrl(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Finalize Result submission
  const handleFinalizeCurrentPeriod = async () => {
    if (!onFinalizePeriod) return;
    setFinalizing(true);
    try {
      const studentRankings = rankedStudentsInPeriod.map((item, idx) => ({
        studentId: item.student.id,
        fullName: item.student.fullName,
        studentCode: item.student.studentCode,
        teamId: item.student.teamId || '',
        stars: item.net,
        rank: idx + 1,
        level: item.student.level || 1,
      }));

      const teamRankings = rankedTeamsInPeriod.map((t, idx) => ({
        teamId: t.team.id,
        teamName: t.team.nameVi,
        color: t.team.color,
        points: t.points,
        rank: idx + 1,
      }));

      await onFinalizePeriod({
        period: selectedPeriod,
        periodLabel: periodRange.labelVi,
        notes: finalizeNotes.trim() || undefined,
        studentRankings,
        teamRankings,
      });

      playStarSound('win');
      triggerGrandCelebration();
      setIsFinalizeModalOpen(false);
      setFinalizeNotes('');
      showToast(`Đã chốt thành tích kỳ ${periodRange.labelVi} thành công!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi chốt thành tích');
    } finally {
      setFinalizing(false);
    }
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    playStarSound('click');
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Bảng xếp hạng học sinh
      const studentData = rankedStudentsInPeriod.map((r, i) => ({
        'Hạng': i + 1,
        'Họ và tên': r.student.fullName,
        'Mã học sinh': r.student.studentCode,
        'Tổ thi đua': r.team?.nameVi || 'Chưa xếp tổ',
        'Sao được tặng': r.earned,
        'Sao điều chỉnh': r.deducted,
        'Sao thực nhận (Ròng)': r.net,
        'Cấp bậc hiện tại': `Cấp ${r.student.level || 1} - ${levelRules.find((l) => l.level === r.student.level)?.titleVi || 'Ngôi sao nhỏ'}`,
        'Tổng tích lũy': r.student.totalEarnedStars,
      }));
      const wsStudents = XLSX.utils.json_to_sheet(studentData);
      XLSX.utils.book_append_sheet(wb, wsStudents, 'Xếp hạng học sinh');

      // Sheet 2: Thi đua tổ
      const teamData = rankedTeamsInPeriod.map((t, i) => ({
        'Hạng': i + 1,
        'Tên tổ': t.team.nameVi,
        'Linh vật': t.team.mascot,
        'Điểm sao thi đua': t.points,
      }));
      const wsTeams = XLSX.utils.json_to_sheet(teamData);
      XLSX.utils.book_append_sheet(wb, wsTeams, 'Thi đua tổ');

      // Sheet 3: Chi tiết giao dịch
      const txData = periodTransactions.map((tx) => ({
        'Thời gian': new Date(tx.timestamp).toLocaleString('vi-VN'),
        'Học sinh': tx.studentName || tx.studentId,
        'Mã số': students.find((s) => s.id === tx.studentId)?.studentCode || '',
        'Thay đổi': tx.deltaStars > 0 ? `+${tx.deltaStars}` : `${tx.deltaStars}`,
        'Lý do / Hạng mục': tx.reasonCategory,
        'Ghi chú': tx.reasonNote,
        'Người thực hiện': tx.createdBy || 'Cô Thảo',
      }));
      const wsTxs = XLSX.utils.json_to_sheet(txData);
      XLSX.utils.book_append_sheet(wb, wsTxs, 'Lịch sử giao dịch sao');

      const fileName = `Bao_cao_Sao_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast('Đã tải xuống file báo cáo Excel (.xlsx)!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi xuất file Excel');
    }
  };

  const handlePrintReport = () => {
    playStarSound('click');
    window.print();
  };

  const handleUndoTx = async (txId: string) => {
    if (!onUndoTransaction) return;
    if (!confirm('Bạn có chắc chắn muốn hoàn tác giao dịch sao này?')) return;
    try {
      await onUndoTransaction(txId);
      playStarSound('star');
      showToast('Đã hoàn tác giao dịch sao thành công!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi hoàn tác');
    }
  };

  const displayedRewards = rewards.filter((r) => {
    if (showArchived) return true;
    return !r.isArchived;
  });

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header banner */}
      <div className="bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-200 rounded-3xl p-5 border border-amber-300 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-400 text-white shadow-xs">
            <Gift className="w-7 h-7 fill-amber-100" />
          </div>
          <div>
            <h2 className="typo-title-section text-amber-950 leading-tight">
              Thưởng Sao & Cửa Hàng Quà Tặng
            </h2>
            <p className="text-[13.5px] font-extrabold text-amber-900 leading-tight">
              Star Rewards & Gift Shop
            </p>
            <p className="text-[12.5px] font-bold text-amber-800 mt-0.5">
              Quản lý sao thi đua, thống kê theo kỳ học, chốt kết quả và đổi quà tặng / Star stats, period snapshots & gift redemption
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-2xl border border-amber-200 shadow-2xs">
          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('stats');
            }}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'stats' ? 'bg-amber-400 text-white shadow-xs' : 'text-slate-700 hover:bg-amber-50'
            }`}
          >
            <BarChart3 className="w-4.5 h-4.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Thống kê & Chốt kỳ</span>
              <span className={`text-[11px] font-bold ${activeTab === 'stats' ? 'text-white/95' : 'text-slate-600'}`}>Stats & Finalize</span>
            </div>
          </button>

          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('shop');
            }}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'shop' ? 'bg-amber-400 text-white shadow-xs' : 'text-slate-700 hover:bg-amber-50'
            }`}
          >
            <Gift className="w-4.5 h-4.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Cửa hàng quà ({displayedRewards.length})</span>
              <span className={`text-[11px] font-bold ${activeTab === 'shop' ? 'text-white/95' : 'text-slate-600'}`}>Gift Shop</span>
            </div>
          </button>

          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('levels');
            }}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'levels' ? 'bg-amber-400 text-white shadow-xs' : 'text-slate-700 hover:bg-amber-50'
            }`}
          >
            <Shield className="w-4.5 h-4.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Hệ thống cấp độ</span>
              <span className={`text-[11px] font-bold ${activeTab === 'levels' ? 'text-white/95' : 'text-slate-600'}`}>Level System</span>
            </div>
          </button>

          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('history');
            }}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-amber-400 text-white shadow-xs' : 'text-slate-700 hover:bg-amber-50'
            }`}
          >
            <History className="w-4.5 h-4.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Lịch sử đổi quà</span>
              <span className={`text-[11px] font-bold ${activeTab === 'history' ? 'text-white/95' : 'text-slate-600'}`}>Redemption Log</span>
            </div>
          </button>
        </div>
      </div>

      {/* 5-Period Segmented Control - Available in Stats tab */}
      {activeTab === 'stats' && (
        <div className="bg-white rounded-3xl p-5 border border-sky-100 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4.5 h-4.5 text-sky-600" />
                <h3 className="text-[15.5px] font-black text-slate-800">
                  Bộ lọc thời gian thống kê • Period Filter ({periodRange.labelVi})
                </h3>
              </div>
              <p className="text-[12.5px] font-bold text-slate-600">
                Lịch cấu hình năm học: {academicConfig.schoolYear} • Academic Calendar ({periodRange.labelEn})
              </p>
            </div>

            {/* 5-Period Segmented Control Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
              {getDynamicPeriodOptions(academicConfig).map((opt) => {
                const isActive = selectedPeriod === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      playStarSound('click');
                      setSelectedPeriod(opt.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? opt.bgActive
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[12.5px] font-black">{opt.labelVi}</span>
                      <span className={`text-[10.5px] font-bold ${isActive ? 'text-white/95' : 'text-slate-600'}`}>{opt.labelEn}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Toolbar: Finalize Status + Export Excel + Print PDF */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {existingFinalized ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-[13px] font-black">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Đã chốt kết quả / Finalized ({new Date(existingFinalized.finalizedAt).toLocaleDateString('vi-VN')})</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px] font-bold">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Kỳ học đang diễn ra / In Progress</span>
                </div>
              )}

              {isTeacher && onFinalizePeriod && (
                <button
                  onClick={() => {
                    playStarSound('click');
                    setIsFinalizeModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Lock className="w-4 h-4" />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[13px] font-black">{existingFinalized ? 'Cập nhật lại chốt kỳ' : 'Chốt thành tích kỳ này'}</span>
                    <span className="text-[10.5px] font-bold text-white/95">Finalize Period Results</span>
                  </div>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[13px] font-black">Xuất Excel (.xlsx)</span>
                  <span className="text-[10.5px] font-bold text-white/95">Export Excel</span>
                </div>
              </button>

              <button
                onClick={handlePrintReport}
                className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white shadow-xs flex items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[13px] font-black">In báo cáo (PDF)</span>
                  <span className="text-[10.5px] font-bold text-white/95">Print Report</span>
                </div>
              </button>
            </div>
          </div>

          {/* 4 Stat Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[13px] font-black text-amber-900 block leading-tight">
                Tổng sao trao tặng
              </span>
              <span className="text-[11px] font-bold text-amber-700 block leading-tight">
                Total Stars Awarded
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="typo-stat-number text-amber-900">
                  +{periodStats.awarded}
                </span>
                <span className="text-sm font-bold text-amber-600">⭐</span>
              </div>
              <span className="text-[11.5px] text-amber-800 font-bold">Trong {periodRange.labelVi}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-[13px] font-black text-rose-900 block leading-tight">
                Sao điều chỉnh
              </span>
              <span className="text-[11px] font-bold text-rose-700 block leading-tight">
                Stars Deducted / Adjusted
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="typo-stat-number text-rose-900">
                  -{periodStats.deducted}
                </span>
                <span className="text-sm font-bold text-rose-600">⭐</span>
              </div>
              <span className="text-[11.5px] text-rose-800 font-bold">Trừ / điều chỉnh</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
              <span className="text-[13px] font-black text-sky-900 block leading-tight">
                Sao thực nhận (Ròng)
              </span>
              <span className="text-[11px] font-bold text-sky-700 block leading-tight">
                Net Stars Earned
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="typo-stat-number text-sky-900">
                  {periodStats.net}
                </span>
                <span className="text-sm font-bold text-sky-600">⭐</span>
              </div>
              <span className="text-[11.5px] text-sky-800 font-bold">Hiệu số tăng trưởng</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
              <span className="text-[13px] font-black text-purple-900 block leading-tight">
                Lượt tương tác sao
              </span>
              <span className="text-[11px] font-bold text-purple-700 block leading-tight">
                Star Transactions
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="typo-stat-number text-purple-900">
                  {periodStats.count}
                </span>
                <span className="text-xs font-bold text-purple-700">giao dịch</span>
              </div>
              <span className="text-[11.5px] text-purple-800 font-bold">Lịch sử minh bạch</span>
            </div>
          </div>

          {/* 2-Column: Team Competition in Period + Top Students in Period */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Team competition in period (5 cols) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl p-4 border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Thi đua 4 tổ trong kỳ</span>
              </h4>

              <div className="space-y-3">
                {rankedTeamsInPeriod.map((t, idx) => {
                  const maxPts = Math.max(...rankedTeamsInPeriod.map((p) => p.points), 1);
                  const pct = Math.min(100, Math.round((t.points / maxPts) * 100));
                  return (
                    <div key={t.team.id} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] text-white" style={{ backgroundColor: t.team.color }}>
                            {idx + 1}
                          </span>
                          <span className="font-black text-slate-800">{t.team.nameVi}</span>
                          <span className="text-[11px]">{t.team.mascot}</span>
                        </div>
                        <span className="font-black text-indigo-900">{t.points} sao</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: t.team.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Student Table in Period (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-4 border border-slate-200">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Bảng sao học sinh trong kỳ ({rankedStudentsInPeriod.length})</span>
              </h4>

              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2">Hạng</th>
                      <th className="py-2 px-2">Học sinh</th>
                      <th className="py-2 px-2">Tổ</th>
                      <th className="py-2 px-2 text-right">Được tặng</th>
                      <th className="py-2 px-2 text-right">Điều chỉnh</th>
                      <th className="py-2 px-2 text-right">Ròng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankedStudentsInPeriod.map((item, idx) => (
                      <tr key={item.student.id} className="hover:bg-amber-50/40">
                        <td className="py-2 px-2 font-black">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={item.student.avatarUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=60'}
                              alt={item.student.fullName}
                              className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block leading-tight">{item.student.fullName}</span>
                              <span className="text-[10px] text-slate-400">{item.student.studentCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: item.team?.bgColor || '#f1f5f9', color: item.team?.color || '#334155' }}
                          >
                            {item.team?.nameVi || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-emerald-600">+{item.earned}</td>
                        <td className="py-2 px-2 text-right font-bold text-rose-500">{item.deducted > 0 ? `-${item.deducted}` : '0'}</td>
                        <td className="py-2 px-2 text-right font-black text-amber-700">{item.net} ⭐</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Period Transaction Log with Search and Undo */}
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-sky-600" />
                <span>Nhật ký giao dịch sao trong kỳ ({filteredTxs.length})</span>
              </h4>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm học sinh, lý do..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>
            </div>

            {filteredTxs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Chưa có giao dịch sao nào trong khoảng thời gian này.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredTxs.slice(0, 50).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                        tx.deltaStars > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.deltaStars > 0 ? `+${tx.deltaStars}` : tx.deltaStars}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{tx.studentName || tx.studentId}</span>
                          <span className="text-[10px] text-slate-400">({tx.reasonCategory})</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{tx.reasonNote}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(tx.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(tx.timestamp).toLocaleDateString('vi-VN')}
                      </span>

                      {isTeacher && onUndoTransaction && (
                        <button
                          onClick={() => handleUndoTx(tx.id)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                          title="Hoàn tác giao dịch này"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Hoàn tác</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Reward Shop */}
      {activeTab === 'shop' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-black text-[#263C72] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-300" />
              <span>Các món quà sẵn sàng trong kho ({displayedRewards.length})</span>
            </h3>

            {isTeacher && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    showArchived ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{showArchived ? 'Ẩn quà đã lưu kho' : 'Xem cả quà đã lưu kho'}</span>
                </button>

                <button
                  onClick={openAddModal}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Thêm phần quà mới</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedRewards.map((reward) => (
              <div
                key={reward.id}
                className={`bg-white rounded-3xl p-4 border transition flex flex-col justify-between group relative ${
                  reward.isArchived
                    ? 'border-dashed border-slate-300 bg-slate-50/70 opacity-75'
                    : 'border-amber-200/80 shadow-xs hover:shadow-md'
                }`}
              >
                {reward.isArchived && (
                  <div className="absolute top-3 left-3 bg-slate-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider z-10">
                    Đã lưu kho
                  </div>
                )}

                {/* Teacher Action Menu */}
                {isTeacher && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 z-10 bg-white/90 backdrop-blur-2xs p-1 rounded-xl shadow-xs border border-slate-200">
                    <button
                      onClick={() => openEditModal(reward)}
                      className="p-1 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition"
                      title="Chỉnh sửa quà"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {reward.isArchived ? (
                      <button
                        onClick={() => handleRestoreReward(reward)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition"
                        title="Phục hồi quà"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setRewardToDelete(reward)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                        title="Lưu kho/Ẩn phần quà"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <div className="w-full h-36 rounded-2xl bg-amber-50/50 mb-3 flex items-center justify-center overflow-hidden border border-amber-100">
                    {reward.imageUrl ? (
                      <img
                        src={reward.imageUrl}
                        alt={reward.titleVi}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <Gift className="w-16 h-16 text-amber-300" />
                    )}
                  </div>

                  <h4 className="text-[15.5px] font-black text-slate-800 line-clamp-1 leading-tight">{reward.titleVi}</h4>
                  <p className="text-[12.5px] font-bold text-slate-600 mb-2 line-clamp-1 leading-tight">{reward.titleEn || reward.description}</p>

                  <div className="flex items-center justify-between text-[13px] mb-3">
                    <span className="font-black text-amber-700 flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      {reward.starCost} sao / stars
                    </span>
                    <span className="text-[12px] font-bold text-slate-600">
                      Kho / Stock: <b className="text-slate-900">{reward.stock}</b>
                    </span>
                  </div>
                </div>

                <button
                  disabled={reward.stock <= 0 || reward.isArchived}
                  onClick={() => {
                    playStarSound('click');
                    setSelectedReward(reward);
                  }}
                  className={`w-full py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                    reward.stock > 0 && !reward.isArchived
                      ? 'bg-amber-400 hover:bg-amber-500 text-white shadow-xs active:scale-95'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Gift className="w-4.5 h-4.5" />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[13.5px] font-black">{reward.stock > 0 ? 'Đổi quà ngay' : 'Tạm hết quà'}</span>
                    <span className="text-[11px] font-bold opacity-95">{reward.stock > 0 ? 'Redeem Gift' : 'Out of Stock'}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Level Rules */}
      {activeTab === 'levels' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span>Hệ thống cấp bậc Vương quốc ngôi sao</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              Càng chăm ngoan, cấp bậc vương triều càng cao!
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {levelRules.map((lvl) => (
              <div
                key={lvl.level}
                className="p-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-amber-300 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-400 text-white font-black text-sm flex items-center justify-center shadow-2xs">
                    {lvl.level}
                  </span>
                  <span className="text-xs font-black text-amber-600">{lvl.minStars} ⭐</span>
                </div>
                <h4 className="text-sm font-black text-slate-800">{lvl.titleVi}</h4>
                <p className="text-xs text-slate-500 mb-1">{lvl.titleEn}</p>
                <p className="text-[11px] text-slate-600">Yêu cầu: Từ {lvl.minStars} sao vàng trở lên</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Redemption History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-[#263C72] flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            <span>Lịch sử đổi quà ({redemptions.length})</span>
          </h3>

          {redemptions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Chưa có lượt đổi quà nào được ghi nhận.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {redemptions.map((redemption) => {
                const st = students.find((s) => s.id === redemption.studentId);
                return (
                  <div key={redemption.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800">{redemption.rewardTitle}</h4>
                        <p className="text-slate-500 text-[11px]">
                          Người nhận: <b className="text-slate-700">{st?.fullName || redemption.studentId}</b> ({st?.studentCode})
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-amber-600 block">-{redemption.starCost} ⭐</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(redemption.timestamp).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Redeem Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-sky-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" />
                <span>Xác nhận đổi phần quà</span>
              </h3>
              <button
                onClick={() => setSelectedReward(null)}
                className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 mb-4 flex items-center gap-3">
              {selectedReward.imageUrl ? (
                <img
                  src={selectedReward.imageUrl}
                  alt={selectedReward.titleVi}
                  className="w-14 h-14 rounded-xl object-cover border border-amber-300"
                />
              ) : (
                <Gift className="w-10 h-10 text-amber-400" />
              )}
              <div>
                <h4 className="font-black text-sm text-amber-950">{selectedReward.titleVi}</h4>
                <p className="text-xs font-black text-amber-600">{selectedReward.starCost} sao vàng ⭐</p>
                <p className="text-[11px] text-slate-500">Còn {selectedReward.stock} món trong kho</p>
              </div>
            </div>

            {/* Select student to redeem if teacher, or show current student */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Học sinh đổi quà:</label>
              {isTeacher ? (
                <select
                  value={redeemStudentId}
                  onChange={(e) => setRedeemStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} ({st.studentCode}) • Khả dụng: {st.spendableStars || st.totalEarnedStars} sao
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-800">
                  {currentStudent?.fullName} ({currentStudent?.studentCode}) • Khả dụng: {currentStudent?.spendableStars || currentStudent?.totalEarnedStars} sao
                </div>
              )}
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReward(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-black text-xs shadow-md cursor-pointer transition active:scale-95"
              >
                {loading ? 'Đang thực hiện...' : 'Xác nhận đổi quà'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Results Modal */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-indigo-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-indigo-950">
                  Chốt thành tích kỳ: {periodRange.labelVi}
                </h3>
              </div>
              <button
                onClick={() => setIsFinalizeModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Khi chốt kỳ, hệ thống sẽ lưu lại bản ghi nhận thành tích (snapshot) chính thức của{' '}
              <b>{students.length} học sinh</b> và <b>{teams.length} tổ</b>.
            </p>

            <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200 mb-4 space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-slate-600">Tổng sao thưởng trong kỳ:</span>
                <span className="text-amber-700">+{periodStats.awarded} ⭐</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-600">Học sinh dẫn đầu:</span>
                <span className="text-indigo-900">{rankedStudentsInPeriod[0]?.student.fullName} ({rankedStudentsInPeriod[0]?.net} sao)</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-600">Tổ dẫn đầu thi đua:</span>
                <span className="text-indigo-900">{rankedTeamsInPeriod[0]?.team.nameVi} ({rankedTeamsInPeriod[0]?.points} sao)</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú / Nhận xét tổng kết của cô Thảo (tùy chọn):
              </label>
              <textarea
                rows={3}
                value={finalizeNotes}
                onChange={(e) => setFinalizeNotes(e.target.value)}
                placeholder="VD: Cả lớp hoàn thành xuất sắc đợt thi đua chào mừng ngày 20/11..."
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleFinalizeCurrentPeriod}
                disabled={finalizing}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md cursor-pointer transition active:scale-95"
              >
                {finalizing ? 'Đang lưu bản chốt...' : 'Xác nhận chốt kỳ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Reward Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-sky-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                <span>Thêm phần quà mới vào kho</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên phần quà (Tiếng Việt) *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Hộp bút màu nước Star Kingdom"
                  value={formTitleVi}
                  onChange={(e) => setFormTitleVi(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tiếng Anh (English Title)</label>
                <input
                  type="text"
                  placeholder="VD: Watercolor Pen Set"
                  value={formTitleEn}
                  onChange={(e) => setFormTitleEn(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giá sao *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formStarCost}
                    onChange={(e) => setFormStarCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng trong kho *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả quà tặng</label>
                <input
                  type="text"
                  placeholder="Mô tả công dụng hoặc phần thưởng..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh minh họa phần quà</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 cursor-pointer"
                  />
                  {formImageUrl && (
                    <img src={formImageUrl} alt="preview" className="w-8 h-8 rounded-lg object-cover border border-amber-300" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  {loading ? 'Đang lưu...' : 'Lưu phần quà'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reward Modal */}
      {editReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-sky-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-500" />
                <span>Chỉnh sửa phần quà</span>
              </h3>
              <button onClick={() => setEditReward(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên phần quà (Tiếng Việt) *</label>
                <input
                  type="text"
                  required
                  value={formTitleVi}
                  onChange={(e) => setFormTitleVi(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tiếng Anh</label>
                <input
                  type="text"
                  value={formTitleEn}
                  onChange={(e) => setFormTitleEn(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giá sao *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formStarCost}
                    onChange={(e) => setFormStarCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng tồn kho *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh phần quà</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 cursor-pointer"
                  />
                  {formImageUrl && (
                    <img src={formImageUrl} alt="preview" className="w-8 h-8 rounded-lg object-cover border border-amber-300" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditReward(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  {loading ? 'Đang cập nhật...' : 'Cập nhật phần quà'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive / Delete Confirmation Modal */}
      {rewardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-sky-100">
            <h3 className="text-base font-black text-rose-700 mb-1">Lưu kho phần quà</h3>
            <p className="text-xs text-slate-600 mb-3">
              Bạn có chắc chắn muốn lưu kho/ẩn phần quà <b>"{rewardToDelete.titleVi}"</b> không?
            </p>
            <div className="p-3 mb-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 leading-relaxed">
              ⭐ <b>Bảo toàn lịch sử:</b> Thao tác này sẽ ẩn món quà khỏi danh sách đổi của học sinh mà <b>tuyệt đối không</b> làm thay đổi số sao đã tích lũy hoặc xóa lịch sử đổi quà trước đây.
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRewardToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md cursor-pointer"
              >
                {loading ? 'Đang lưu...' : 'Xác nhận lưu kho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
