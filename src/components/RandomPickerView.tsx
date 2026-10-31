import React, { useState, useEffect } from 'react';
import { Student, Team } from '../types';
import {
  Dice5,
  Sparkles,
  Users,
  Star,
  RotateCw,
  Volume2,
  VolumeX,
  Trophy,
  Filter,
} from 'lucide-react';
import { triggerGrandCelebration, playStarSound } from '../utils/effects';

interface RandomPickerViewProps {
  students: Student[];
  teams: Team[];
  onGiveStars: (payload: {
    studentId: string;
    deltaStars: number;
    reasonCategory: string;
    reasonNote: string;
  }) => Promise<void>;
}

export const RandomPickerView: React.FC<RandomPickerViewProps> = ({
  students,
  teams,
  onGiveStars,
}) => {
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [pickMode, setPickMode] = useState<'single' | 'team4'>('single');
  const [isSpinning, setIsSpinning] = useState(false);
  const [chosenStudent, setChosenStudent] = useState<Student | null>(null);
  const [chosenTeam4, setChosenTeam4] = useState<Student[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rollingIndex, setRollingIndex] = useState(0);

  // Eligible pool
  const pool = students.filter((s) => teamFilter === 'all' || s.teamId === teamFilter);

  // Magic Spin
  const handleSpin = () => {
    if (pool.length === 0) return;
    setIsSpinning(true);
    setChosenStudent(null);
    setChosenTeam4([]);

    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      setRollingIndex(Math.floor(Math.random() * pool.length));
      if (soundEnabled && counter % 3 === 0) {
        playStarSound('spin');
      }

      if (counter > 25) {
        clearInterval(interval);
        setIsSpinning(false);

        if (pickMode === 'single') {
          const winner = pool[Math.floor(Math.random() * pool.length)];
          setChosenStudent(winner);
          if (soundEnabled) playStarSound('win');
          triggerGrandCelebration();
        } else {
          // Pick 1 from each team
          const picked: Student[] = [];
          teams.forEach((t) => {
            const teamMembers = students.filter((s) => s.teamId === t.id);
            if (teamMembers.length > 0) {
              picked.push(teamMembers[Math.floor(Math.random() * teamMembers.length)]);
            }
          });
          setChosenTeam4(picked);
          if (soundEnabled) playStarSound('win');
          triggerGrandCelebration();
        }
      }
    }, 90);
  };

  const handleRewardWinner = async (st: Student) => {
    await onGiveStars({
      studentId: st.id,
      deltaStars: 2,
      reasonCategory: 'Phát biểu ngẫu nhiên',
      reasonNote: 'Được gọi tên và trả lời xuất sắc',
    });
    playStarSound('star');
    triggerGrandCelebration();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-200 via-indigo-100 to-sky-100 rounded-3xl p-5 border border-purple-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500 text-white rounded-2xl shadow-xs">
            <Dice5 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-indigo-950 font-['Fredoka',sans-serif]">
              Vòng quay phép thuật / Random Picker
            </h2>
            <p className="text-xs font-bold text-indigo-700">
              Gọi tên học sinh ngẫu nhiên để phát biểu hoặc tham gia trò chơi
            </p>
          </div>
        </div>

        {/* Sound toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-xl bg-white/80 hover:bg-white text-indigo-900 border border-purple-200 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          <span>{soundEnabled ? 'Âm thanh bật' : 'Âm thanh tắt'}</span>
        </button>
      </div>

      {/* Main Wheel Area */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Controls Column (4 cols) */}
        <div className="md:col-span-4 space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              Phạm vi gọi tên:
            </label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50"
            >
              <option value="all">Toàn bộ Lớp 2A5 ({students.length} học sinh)</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  Chỉ trong {t.nameVi}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              Chế độ gọi:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPickMode('single')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  pickMode === 'single'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                1 Bạn ngẫu nhiên
              </button>
              <button
                type="button"
                onClick={() => setPickMode('team4')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  pickMode === 'team4'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                4 Bạn (1 bạn/tổ)
              </button>
            </div>
          </div>

          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900">
            <p className="font-bold">Số lượng học sinh trong danh sách:</p>
            <p className="text-lg font-black text-purple-700">{pool.length} bạn</p>
          </div>

          <button
            onClick={handleSpin}
            disabled={isSpinning || pool.length === 0}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-600 to-sky-500 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
          >
            <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'Đang quay phép thuật...' : 'QUAY NGAY! 🎲'}</span>
          </button>
        </div>

        {/* Display Podium (8 cols) */}
        <div className="md:col-span-8 flex flex-col items-center justify-center min-h-[300px] p-6 rounded-3xl bg-gradient-to-b from-slate-50 to-purple-50/50 border border-purple-100 text-center">
          {isSpinning && pool.length > 0 ? (
            <div className="animate-pulse space-y-3">
              <div className="w-28 h-28 mx-auto rounded-full overflow-hidden ring-4 ring-purple-400 shadow-xl">
                <img
                  src={
                    pool[rollingIndex]?.avatarUrl ||
                    'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=150'
                  }
                  alt="rolling"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-black text-purple-900">
                {pool[rollingIndex]?.fullName}
              </h3>
              <p className="text-xs font-bold text-purple-600">Đang tìm kiếm ngôi sao may mắn...</p>
            </div>
          ) : chosenStudent ? (
            <div className="space-y-4 animate-scale-in">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full overflow-hidden ring-6 ring-amber-400 shadow-2xl mx-auto">
                  <img
                    src={
                      chosenStudent.avatarUrl ||
                      'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=200'
                    }
                    alt={chosenStudent.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-3 -right-2 bg-amber-400 text-white p-2 rounded-full shadow-lg">
                  <Sparkles className="w-5 h-5 fill-white" />
                </div>
              </div>

              <div>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                  {chosenStudent.studentCode}
                </span>
                <h3 className="text-2xl font-black text-[#263C72] mt-1">
                  {chosenStudent.fullName}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  {teams.find((t) => t.id === chosenStudent.teamId)?.nameVi}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={() => handleRewardWinner(chosenStudent)}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Star className="w-4 h-4 fill-white" />
                  <span>Thưởng 2 sao ngay! ⭐</span>
                </button>
              </div>
            </div>
          ) : chosenTeam4.length > 0 ? (
            <div className="w-full space-y-4">
              <h3 className="text-base font-black text-indigo-900">
                🎉 4 Bạn đại diện cho 4 Tổ:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {chosenTeam4.map((st) => (
                  <div key={st.id} className="p-3 rounded-2xl bg-white border shadow-xs text-center">
                    <img
                      src={st.avatarUrl || 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=100'}
                      alt={st.fullName}
                      className="w-14 h-14 rounded-full mx-auto mb-1.5 object-cover ring-2 ring-purple-300"
                    />
                    <h5 className="text-xs font-black text-slate-800 truncate">{st.fullName}</h5>
                    <p className="text-[10px] text-slate-500">{teams.find((t) => t.id === st.teamId)?.nameVi.split(':')[0]}</p>
                    <button
                      onClick={() => handleRewardWinner(st)}
                      className="mt-2 w-full py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-white text-[10px] font-black cursor-pointer shadow-2xs"
                    >
                      +2 sao
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-slate-400">
              <Dice5 className="w-16 h-16 mx-auto text-purple-300" />
              <p className="text-sm font-bold">Nhấn "QUAY NGAY" để chọn học sinh ngẫu nhiên</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
