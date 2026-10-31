import React, { useState, useEffect, useRef } from 'react';
import { Student, Team } from '../types';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Star,
  Clock,
  Dice5,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Tv,
  Layers,
  Shuffle,
  Printer,
  Gift,
  Plus,
  Trash2,
  Users,
  Award,
  Crown,
  Smile,
} from 'lucide-react';
import { playStarSound, triggerGrandCelebration, triggerStarConfetti } from '../utils/effects';
import { audioManager } from '../utils/audioManager';

export type ToolId = 'noise' | 'timer' | 'picker' | 'dice' | 'traffic' | 'chest' | 'groups' | 'stage';

interface ClassroomToolsViewProps {
  students: Student[];
  teams: Team[];
  attendance?: Record<string, any>;
  onGiveStars: (payload: {
    studentId: string;
    deltaStars: number;
    reasonCategory: string;
    reasonNote: string;
  }) => Promise<void>;
  initialTab?: ToolId;
}

interface WorkshopToolMeta {
  id: ToolId;
  titleVi: string;
  titleEn: string;
  desc: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badge: string;
}

export const WORKSHOP_TOOLS: WorkshopToolMeta[] = [
  {
    id: 'noise',
    titleVi: 'Ngôi sao giữ trật tự',
    titleEn: 'Noise Meter',
    desc: 'Đo âm thanh lớp học bằng micro, ngôi sao đổi 3 biểu cảm nhắc nhở.',
    icon: '🎙️',
    color: 'text-amber-700',
    bgColor: 'bg-[#FFFBEB]',
    borderColor: 'border-amber-200',
    badge: 'Giữ trật tự',
  },
  {
    id: 'timer',
    titleVi: 'Đồng hồ phép thuật',
    titleEn: 'Magic Timer',
    desc: 'Đồng hồ đếm ngược hoạt hình 1/3/5/10/15 phút, chuông báo kỳ diệu.',
    icon: '⏳',
    color: 'text-sky-700',
    bgColor: 'bg-[#F0F9FF]',
    borderColor: 'border-sky-200',
    badge: 'Quản lý giờ',
  },
  {
    id: 'picker',
    titleVi: 'Vòng quay ngôi sao',
    titleEn: 'Star Picker',
    desc: 'Vòng quay gọi tên ngẫu nhiên học sinh, lọc theo tổ và thưởng sao ngay.',
    icon: '🎡',
    color: 'text-purple-700',
    bgColor: 'bg-[#FAF5FF]',
    borderColor: 'border-purple-200',
    badge: 'Gọi tên vui',
  },
  {
    id: 'dice',
    titleVi: 'Xúc xắc may mắn',
    titleEn: 'Magic Dice',
    desc: 'Tung 1 hoặc 2 viên xúc xắc hoạt hình 3D, tùy biến số, màu sắc, thử thách.',
    icon: '🎲',
    color: 'text-rose-700',
    bgColor: 'bg-[#FFF1F2]',
    borderColor: 'border-rose-200',
    badge: 'Trò chơi nhanh',
  },
  {
    id: 'traffic',
    titleVi: 'Đèn tín hiệu lớp học',
    titleEn: 'Traffic Light',
    desc: 'Bảng đèn Đỏ - Vàng - Xanh điều phối nhịp độ hoạt động học tập.',
    icon: '🚦',
    color: 'text-emerald-700',
    bgColor: 'bg-[#F0FDF4]',
    borderColor: 'border-emerald-200',
    badge: 'Hiệu lệnh lớp',
  },
  {
    id: 'chest',
    titleVi: 'Rương kho báu phép thuật',
    titleEn: 'Treasure Chest',
    desc: 'Mở rương bí mật nhận lời khen, trò chơi khởi động, câu đố thú vị.',
    icon: '🎁',
    color: 'text-yellow-800',
    bgColor: 'bg-[#FEFCE8]',
    borderColor: 'border-yellow-300',
    badge: 'Bí mật vui nhộn',
  },
  {
    id: 'groups',
    titleVi: 'Chia nhóm thần kỳ',
    titleEn: 'Group Maker',
    desc: 'Chia nhóm học tập ngẫu nhiên theo số nhóm hoặc thành viên, in nhóm nhanh.',
    icon: '👥',
    color: 'text-teal-700',
    bgColor: 'bg-[#F0FDFA]',
    borderColor: 'border-teal-200',
    badge: 'Hoạt động nhóm',
  },
  {
    id: 'stage',
    titleVi: 'Sân khấu vinh danh',
    titleEn: 'Celebration Stage',
    desc: 'Màn hình máy chiếu lâu đài vinh danh học sinh/tổ xuất sắc cùng pháo hoa.',
    icon: '🏰',
    color: 'text-indigo-700',
    bgColor: 'bg-[#EEF2FF]',
    borderColor: 'border-indigo-200',
    badge: 'Trình chiếu',
  },
];

export const ClassroomToolsView: React.FC<ClassroomToolsViewProps> = ({
  students,
  teams,
  attendance = {},
  onGiveStars,
  initialTab = 'noise',
}) => {
  const [activeTab, setActiveTab] = useState<ToolId | 'overview'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-4">
      {/* Top Banner: Xưởng phép thuật */}
      <div className="bg-gradient-to-r from-amber-100 via-orange-50 to-amber-200 rounded-3xl p-5 border border-amber-300 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl shadow-xs shrink-0">
            🪄
          </div>
          <div>
            <h2 className="typo-title-section text-amber-950 leading-tight">
              Xưởng Phép Thuật Lớp Học
            </h2>
            <p className="text-[13.5px] font-extrabold text-amber-900 leading-tight">
              Magic Classroom Workshop (8 Interactive Tools)
            </p>
            <p className="text-[12.5px] font-bold text-amber-800 mt-0.5">
              8 công cụ tương tác tiểu học sinh động, hoạt động ngoại tuyến mượt mà / 8 interactive primary classroom tools
            </p>
          </div>
        </div>

        {/* Back to all tools or quick overview button */}
        {activeTab !== 'overview' ? (
          <button
            onClick={() => {
              playStarSound('click');
              setActiveTab('overview');
            }}
            className="px-4 py-2 rounded-2xl bg-white/95 hover:bg-white text-[#263C72] shadow-xs flex items-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-sky-600" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Tất cả 8 công cụ</span>
              <span className="text-[11px] font-bold text-slate-600">All 8 Tools</span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-white/95 px-3.5 py-2 rounded-2xl border border-amber-200 text-[13px] font-black text-amber-950">
            <span>⭐ Ms. Thao's Star Kingdom</span>
          </div>
        )}
      </div>

      {/* Workshop Navigation Bar when a tool is open */}
      {activeTab !== 'overview' && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-2xl p-2.5 border border-sky-100 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {WORKSHOP_TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  playStarSound('click');
                  setActiveTab(t.id);
                }}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition flex items-center gap-2 cursor-pointer ${
                  activeTab === t.id
                    ? `${t.bgColor} ${t.color} ring-2 ring-amber-300 shadow-2xs`
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[13px] font-black">{t.titleVi}</span>
                  <span className="text-[10.5px] font-bold opacity-85">{t.titleEn}</span>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 cursor-pointer shrink-0 flex flex-col items-center leading-tight"
          >
            <span className="text-[12.5px] font-black">Đóng công cụ</span>
            <span className="text-[10.5px] font-bold text-sky-600">Close Tool</span>
          </button>
        </div>
      )}

      {/* 8 Workshop Cards Grid Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {WORKSHOP_TOOLS.map((tool) => (
            <div
              key={tool.id}
              onClick={() => {
                playStarSound('click');
                setActiveTab(tool.id);
              }}
              className={`p-4 rounded-3xl border-2 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-1 flex flex-col justify-between group ${tool.bgColor} ${tool.borderColor}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {tool.icon}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/90 text-[11px] font-black text-slate-700 shadow-2xs">
                    {tool.badge}
                  </span>
                </div>

                <h3 className="text-[15.5px] font-black text-[#263C72] leading-tight mb-0.5">
                  {tool.titleVi}
                </h3>
                <p className="text-[12.5px] font-bold text-slate-600 mb-2">{tool.titleEn}</p>
                <p className="text-[13px] text-slate-700 font-semibold leading-relaxed line-clamp-2">
                  {tool.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                <div className="leading-tight">
                  <span className="text-[13px] font-black text-amber-900 block">Mở công cụ →</span>
                  <span className="text-[11px] font-bold text-amber-800 block">Open Tool</span>
                </div>
                <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-xs shadow-2xs group-hover:bg-amber-400 group-hover:text-white transition-colors">
                  ▶
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TOOL 1: NOISE METER */}
      {activeTab === 'noise' && <NoiseMeterTool />}

      {/* TOOL 2: MAGIC TIMER */}
      {activeTab === 'timer' && <MagicTimerTool />}

      {/* TOOL 3: STAR PICKER */}
      {activeTab === 'picker' && (
        <StarPickerTool students={students} teams={teams} attendance={attendance} onGiveStars={onGiveStars} />
      )}

      {/* TOOL 4: MAGIC DICE */}
      {activeTab === 'dice' && <MagicDiceTool />}

      {/* TOOL 5: TRAFFIC LIGHT */}
      {activeTab === 'traffic' && <ClassroomTrafficLightTool />}

      {/* TOOL 6: TREASURE CHEST */}
      {activeTab === 'chest' && <MagicTreasureChestTool />}

      {/* TOOL 7: GROUP MAKER */}
      {activeTab === 'groups' && <MagicGroupMakerTool students={students} attendance={attendance} />}

      {/* TOOL 8: CELEBRATION STAGE */}
      {activeTab === 'stage' && <CelebrationStageTool students={students} teams={teams} />}
    </div>
  );
};

// ================= 1. NOISE METER =================
const NoiseMeterTool: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [threshold, setThreshold] = useState(65);
  const [sensitivity, setSensitivity] = useState(1.5);
  const [soundAlert, setSoundAlert] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startListening = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setIsListening(true);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round(average * sensitivity));
        setVolume(normalized);
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err: unknown) {
      setMicError('Vui lòng cấp quyền micro trên trình duyệt để sử dụng công cụ đo tiếng ồn.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsListening(false);
    setVolume(0);
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const getStarExpression = () => {
    if (volume < threshold * 0.7) {
      return { emoji: '😊', text: 'Tuyệt vời! Lớp học rất yên tĩnh', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300' };
    }
    if (volume < threshold) {
      return { emoji: '🙂', text: 'Hơi ồn một chút rồi, giữ trật tự nhé!', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300' };
    }
    return { emoji: '😱', text: 'Quá ồn rồi! Cả lớp cùng giữ im lặng nào!', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-300' };
  };

  const status = getStarExpression();

  return (
    <div className={`bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 p-8 flex flex-col justify-between' : ''}`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#263C72]">Ngôi sao giữ trật tự (Noise Meter)</h3>
            <p className="text-xs text-slate-500">Giám sát độ ồn lớp học, rèn luyện thói quen giữ yên tĩnh khi học tập</p>
          </div>
        </div>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          title="Toàn màn hình"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {micError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* Main Star Visual */}
      <div className={`p-8 rounded-3xl border-2 text-center transition-all duration-300 ${status.bg} ${status.border} max-w-xl mx-auto w-full`}>
        <div className="text-7xl mb-3 animate-bounce">{status.emoji}</div>
        <h4 className={`text-xl font-black ${status.color} mb-1`}>{status.text}</h4>
        <p className="text-xs text-slate-500 font-bold mb-6">Mức âm lượng hiện tại: {volume}% (Ngưỡng cảnh báo: {threshold}%)</p>

        {/* Animated Volume Meter Bar */}
        <div className="w-full h-8 bg-slate-200 rounded-full overflow-hidden p-1 relative shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              volume < threshold * 0.7 ? 'bg-emerald-500' : volume < threshold ? 'bg-amber-400' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, volume)}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-1 bg-red-600 shadow-sm"
            style={{ left: `${threshold}%` }}
            title="Ngưỡng tiếng ồn"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4 max-w-xl mx-auto w-full">
        {!isListening ? (
          <button
            onClick={startListening}
            className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md flex items-center gap-2 transition cursor-pointer"
          >
            <Play className="w-5 h-5" />
            <span>Bắt đầu đo tiếng ồn</span>
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm shadow-md flex items-center gap-2 transition cursor-pointer"
          >
            <Pause className="w-5 h-5" />
            <span>Dừng micro</span>
          </button>
        )}

        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 text-xs font-bold">
          <span>Ngưỡng:</span>
          <input
            type="range"
            min="30"
            max="90"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-24 cursor-pointer"
          />
          <span className="font-black text-sky-700">{threshold}%</span>
        </div>
      </div>
    </div>
  );
};

// ================= 2. MAGIC TIMER =================
const MagicTimerTool: React.FC = () => {
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 min default
  const [initialSeconds, setInitialSeconds] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + secondsLeft * 1000;
      }
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.round(((endTimeRef.current || 0) - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          setIsRunning(false);
          endTimeRef.current = null;
          audioManager.playToolSound('ding', true);
          triggerStarConfetti();
        }
      }, 250);
    } else {
      endTimeRef.current = null;
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const setTimerPreset = (secs: number) => {
    setIsRunning(false);
    endTimeRef.current = null;
    setInitialSeconds(secs);
    setSecondsLeft(secs);
    playStarSound('click');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = initialSeconds > 0 ? ((initialSeconds - secondsLeft) / initialSeconds) * 100 : 0;

  return (
    <div className={`bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 p-8 flex flex-col justify-between' : ''}`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#263C72]">Đồng hồ phép thuật (Magic Timer)</h3>
            <p className="text-xs text-slate-500">Đếm ngược giờ làm bài, thảo luận nhóm hoặc giải lao sinh động</p>
          </div>
        </div>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
        {[
          { label: '1 Phút', secs: 60 },
          { label: '3 Phút', secs: 180 },
          { label: '5 Phút', secs: 300 },
          { label: '10 Phút', secs: 600 },
          { label: '15 Phút', secs: 900 },
        ].map((p) => (
          <button
            key={p.secs}
            onClick={() => setTimerPreset(p.secs)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
              initialSeconds === p.secs
                ? 'bg-sky-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Big Circular Timer Dial */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="50%" cy="50%" r="42%" className="stroke-slate-100" strokeWidth="16" fill="transparent" />
          <circle
            cx="50%"
            cy="50%"
            r="42%"
            className="stroke-amber-400 transition-all duration-300"
            strokeWidth="16"
            strokeDasharray={2 * Math.PI * 110}
            strokeDashoffset={2 * Math.PI * 110 * (1 - progressPercent / 100)}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-4xl sm:text-5xl font-black text-[#263C72] tracking-wider font-mono">
            {formatTime(secondsLeft)}
          </span>
          <span className="text-xs font-bold text-slate-400 mt-1">
            {isRunning ? '⏳ Đang đếm ngược...' : secondsLeft === 0 ? '🎉 Hết giờ rồi!' : 'Sẵn sàng'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => {
            playStarSound('click');
            setIsRunning(!isRunning);
          }}
          className={`px-7 py-3 rounded-2xl text-white font-black text-sm shadow-md flex items-center gap-2 transition cursor-pointer ${
            isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-sky-500 hover:bg-sky-600'
          }`}
        >
          {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          <span>{isRunning ? 'Tạm dừng' : 'Bắt đầu'}</span>
        </button>

        <button
          onClick={() => {
            playStarSound('click');
            setIsRunning(false);
            setSecondsLeft(initialSeconds);
            endTimeRef.current = null;
          }}
          className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
          title="Đặt lại"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ================= 3. STAR PICKER =================
const StarPickerTool: React.FC<{
  students: Student[];
  teams: Team[];
  attendance?: Record<string, any>;
  onGiveStars: (payload: { studentId: string; deltaStars: number; reasonCategory: string; reasonNote: string }) => Promise<void>;
}> = ({ students, teams, attendance = {}, onGiveStars }) => {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [excludeAbsent, setExcludeAbsent] = useState<boolean>(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pickedStudent, setPickedStudent] = useState<Student | null>(null);
  const [recentPicks, setRecentPicks] = useState<string[]>([]);
  const [awardSuccess, setAwardSuccess] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = attendance[today]?.records || {};

  const candidateStudents = students.filter((s) => {
    if (selectedTeam !== 'all' && s.teamId !== selectedTeam) return false;
    if (excludeAbsent && todayRecords[s.id] === 'absent') return false;
    return true;
  });

  const handleSpin = () => {
    if (candidateStudents.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setPickedStudent(null);
    setAwardSuccess(false);

    let counter = 0;
    const totalFlips = 24;
    const interval = setInterval(() => {
      counter++;
      const randomIdx = Math.floor(Math.random() * candidateStudents.length);
      setPickedStudent(candidateStudents[randomIdx]);
      audioManager.playToolSound('tick');

      if (counter >= totalFlips) {
        clearInterval(interval);
        // Exclude recent picks if possible
        const availablePool = candidateStudents.filter((s) => !recentPicks.includes(s.id));
        const finalPool = availablePool.length > 0 ? availablePool : candidateStudents;
        const winner = finalPool[Math.floor(Math.random() * finalPool.length)];

        setPickedStudent(winner);
        setIsSpinning(false);
        setRecentPicks((prev) => [winner.id, ...prev.slice(0, 8)]);
        audioManager.playToolSound('ding', true);
        triggerStarConfetti();
      }
    }, 90);
  };

  const handleRewardPicked = async () => {
    if (!pickedStudent) return;
    await onGiveStars({
      studentId: pickedStudent.id,
      deltaStars: 2,
      reasonCategory: 'Phát biểu',
      reasonNote: 'Gọi tên ngẫu nhiên tham gia trả lời câu hỏi',
    });
    setAwardSuccess(true);
    triggerStarConfetti();
    playStarSound('star');
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
            <Dice5 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#263C72]">Vòng quay gọi tên (Star Picker)</h3>
            <p className="text-xs text-slate-500">Gọi ngẫu nhiên học sinh công bằng, sôi nổi trong giờ học</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
          >
            <option value="all">Tất cả 4 tổ ({candidateStudents.length} em)</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.nameVi}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeAbsent}
              onChange={(e) => setExcludeAbsent(e.target.checked)}
              className="rounded-sm text-sky-500"
            />
            <span>Loại trừ vắng</span>
          </label>
        </div>
      </div>

      {/* Center Winner Box */}
      <div className="max-w-md mx-auto p-8 rounded-3xl bg-gradient-to-br from-purple-50 via-white to-sky-50 border-2 border-purple-200 shadow-sm text-center">
        {pickedStudent ? (
          <div className="space-y-4 animate-scale-in">
            <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden ring-4 ring-purple-300 shadow-md">
              <img
                src={pickedStudent.avatarUrl || '/assets/kingdom/student_minh.png'}
                alt={pickedStudent.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="text-2xl font-black text-[#263C72]">{pickedStudent.fullName}</h4>
              <p className="text-xs font-bold text-purple-700 mt-0.5">
                Mã: {pickedStudent.studentCode} • {teams.find((t) => t.id === pickedStudent.teamId)?.nameVi || 'Lớp 2A5'}
              </p>
            </div>

            {!isSpinning && (
              <div className="pt-2">
                {!awardSuccess ? (
                  <button
                    onClick={handleRewardPicked}
                    className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 mx-auto"
                  >
                    <Star className="w-4 h-4 fill-amber-200" />
                    <span>Thưởng +2 sao cho em</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã thưởng 2 sao thành công!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <span className="text-5xl block animate-pulse">🎡</span>
            <p className="text-xs font-bold">Nhấn "Quay gọi tên" để chọn một bạn bất kỳ!</p>
          </div>
        )}
      </div>

      {/* Spin Button */}
      <div className="text-center">
        <button
          onClick={handleSpin}
          disabled={isSpinning || candidateStudents.length === 0}
          className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black text-sm shadow-md transition cursor-pointer disabled:opacity-50 active:scale-95"
        >
          {isSpinning ? 'Đang quay...' : 'Quay gọi tên ngẫu nhiên 🎲'}
        </button>
      </div>
    </div>
  );
};

// ================= 4. MAGIC DICE (XÚC XẮC MAY MẮN) =================
const MagicDiceTool: React.FC = () => {
  const [diceCount, setDiceCount] = useState<1 | 2>(1);
  const [dice1, setDice1] = useState(6);
  const [dice2, setDice2] = useState(5);
  const [isRolling, setIsRolling] = useState(false);
  const [customMode, setCustomMode] = useState<'numbers' | 'colors' | 'topics' | 'activities'>('numbers');

  const colorFaces = ['Đỏ (Red)', 'Xanh biển (Blue)', 'Vàng (Yellow)', 'Xanh lá (Green)', 'Cam (Orange)', 'Tím (Purple)'];
  const topicFaces = ['Animals (Động vật)', 'Colors (Màu sắc)', 'Food (Đồ ăn)', 'Family (Gia đình)', 'School (Trường học)', 'Sports (Thể thao)'];
  const activityFaces = ['Nhảy tại chỗ 5 cái', 'Hát 1 bài hát ngắn', 'Kể 1 điều em vui', 'Làm mặt cười thật to', 'Đố bạn 1 câu hỏi', 'Tập đếm từ 1 đến 10'];

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    audioManager.playToolSound('spin');

    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);

      if (counter >= 12) {
        clearInterval(interval);
        const final1 = Math.floor(Math.random() * 6) + 1;
        const final2 = Math.floor(Math.random() * 6) + 1;
        setDice1(final1);
        setDice2(final2);
        setIsRolling(false);
        audioManager.playToolSound('ding', true);
      }
    }, 80);
  };

  const getFaceDisplay = (val: number) => {
    if (customMode === 'colors') return colorFaces[val - 1];
    if (customMode === 'topics') return topicFaces[val - 1];
    if (customMode === 'activities') return activityFaces[val - 1];
    return val;
  };

  const dicePipDots: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
            <Dice5 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#263C72]">Xúc xắc may mắn (Magic Dice)</h3>
            <p className="text-xs text-slate-500">Tung xúc xắc 3D vui nhộn, chơi trò chơi nhanh và chọn hoạt động</p>
          </div>
        </div>

        {/* Dice options */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDiceCount(1)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
              diceCount === 1 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            1 Viên
          </button>
          <button
            onClick={() => setDiceCount(2)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
              diceCount === 2 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            2 Viên
          </button>
        </div>
      </div>

      {/* Preset Custom Face Sets */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[
          { id: 'numbers', label: 'Số 1 - 6' },
          { id: 'colors', label: 'Màu sắc (Colors)' },
          { id: 'topics', label: 'Chủ đề từ vựng (Topics)' },
          { id: 'activities', label: 'Hoạt động nhanh' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => {
              playStarSound('click');
              setCustomMode(m.id as any);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              customMode === m.id ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Visual Dice Box */}
      <div className="flex items-center justify-center gap-8 py-6">
        {/* Die 1 */}
        <div
          onClick={handleRoll}
          className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-white to-slate-100 border-4 border-rose-300 shadow-xl flex items-center justify-center cursor-pointer transition-transform ${
            isRolling ? 'rotate-180 scale-95' : 'hover:scale-105 active:scale-95'
          }`}
        >
          {customMode === 'numbers' ? (
            <div className="grid grid-cols-3 grid-rows-3 w-20 h-20 p-2 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                <div key={idx} className="flex items-center justify-center">
                  {dicePipDots[dice1]?.includes(idx) && (
                    <div className="w-4 h-4 rounded-full bg-rose-600 shadow-2xs" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center">
              <span className="text-xs font-black text-rose-900 leading-tight block">
                {getFaceDisplay(dice1)}
              </span>
            </div>
          )}
        </div>

        {/* Die 2 */}
        {diceCount === 2 && (
          <div
            onClick={handleRoll}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-white to-slate-100 border-4 border-amber-300 shadow-xl flex items-center justify-center cursor-pointer transition-transform ${
              isRolling ? '-rotate-180 scale-95' : 'hover:scale-105 active:scale-95'
            }`}
          >
            {customMode === 'numbers' ? (
              <div className="grid grid-cols-3 grid-rows-3 w-20 h-20 p-2 gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <div key={idx} className="flex items-center justify-center">
                    {dicePipDots[dice2]?.includes(idx) && (
                      <div className="w-4 h-4 rounded-full bg-amber-600 shadow-2xs" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center">
                <span className="text-xs font-black text-amber-900 leading-tight block">
                  {getFaceDisplay(dice2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sum / Result Tag */}
      {customMode === 'numbers' && (
        <div className="text-center">
          <span className="inline-block px-5 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-black shadow-2xs">
            Tổng điểm: {diceCount === 1 ? dice1 : dice1 + dice2} điểm 🎲
          </span>
        </div>
      )}

      {/* Roll Action Button */}
      <div className="text-center">
        <button
          onClick={handleRoll}
          disabled={isRolling}
          className="px-8 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm shadow-md transition cursor-pointer active:scale-95"
        >
          {isRolling ? 'Đang tung xúc xắc...' : 'Tung xúc xắc ngay! 🎲'}
        </button>
      </div>
    </div>
  );
};

// ================= 5. CLASSROOM TRAFFIC LIGHT =================
const ClassroomTrafficLightTool: React.FC = () => {
  const [light, setLight] = useState<'red' | 'yellow' | 'green'>('green');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const states = {
    red: {
      color: 'bg-rose-500',
      border: 'border-rose-400',
      glow: 'shadow-[0_0_35px_rgba(244,63,94,0.6)]',
      titleVi: 'ĐỎ – DỪNG LẠI / CHÚ Ý',
      titleEn: 'RED – STOP & LISTEN',
      desc: 'Giữ trật tự tuyệt đối, dừng nói chuyện và hướng mắt lên bảng.',
      icon: '🛑',
    },
    yellow: {
      color: 'bg-amber-400',
      border: 'border-amber-300',
      glow: 'shadow-[0_0_35px_rgba(251,191,36,0.6)]',
      titleVi: 'VÀNG – CHUẨN BỊ / SẴN SÀNG',
      titleEn: 'YELLOW – GET READY',
      desc: 'Mở sách vở, ổn định vị trí, chuẩn bị sẵn sàng cho hoạt động mới.',
      icon: '⚠️',
    },
    green: {
      color: 'bg-emerald-500',
      border: 'border-emerald-400',
      glow: 'shadow-[0_0_35px_rgba(16,185,129,0.6)]',
      titleVi: 'XANH – BẮT ĐẦU / THẢO LUẬN',
      titleEn: 'GREEN – GO & DISCUSS',
      desc: 'Bắt đầu làm bài, thảo luận nhóm sôi nổi và giơ tay phát biểu.',
      icon: '🟢',
    },
  };

  const handleSwitch = (state: 'red' | 'yellow' | 'green') => {
    setLight(state);
    if (soundEnabled) {
      audioManager.playToolSound('ding', true);
    }
  };

  const current = states[light];

  return (
    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <span className="text-lg">🚦</span>
          </div>
          <div>
            <h3 className="text-base font-black text-[#263C72]">Đèn tín hiệu lớp học (Traffic Light)</h3>
            <p className="text-xs text-slate-500">Hiệu lệnh thị giác điều phối nhịp độ lớp học rõ ràng, hiệu quả</p>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
            soundEnabled ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-400'
          }`}
          title="Bật/Tắt chuông hiệu lệnh"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{soundEnabled ? 'Chuông bật' : 'Chuông tắt'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center max-w-2xl mx-auto">
        {/* Traffic Light Physical Box (5 cols) */}
        <div className="md:col-span-5 flex justify-center">
          <div className="w-32 bg-slate-800 rounded-3xl p-4 border-4 border-slate-700 shadow-2xl flex flex-col items-center gap-4">
            {/* Red Lamp */}
            <button
              onClick={() => handleSwitch('red')}
              className={`w-20 h-20 rounded-full transition-all cursor-pointer ${
                light === 'red' ? `${states.red.color} ${states.red.glow} ring-4 ring-rose-200` : 'bg-rose-950 opacity-40 hover:opacity-70'
              }`}
            />
            {/* Yellow Lamp */}
            <button
              onClick={() => handleSwitch('yellow')}
              className={`w-20 h-20 rounded-full transition-all cursor-pointer ${
                light === 'yellow' ? `${states.yellow.color} ${states.yellow.glow} ring-4 ring-amber-200` : 'bg-amber-950 opacity-40 hover:opacity-70'
              }`}
            />
            {/* Green Lamp */}
            <button
              onClick={() => handleSwitch('green')}
              className={`w-20 h-20 rounded-full transition-all cursor-pointer ${
                light === 'green' ? `${states.green.color} ${states.green.glow} ring-4 ring-emerald-200` : 'bg-emerald-950 opacity-40 hover:opacity-70'
              }`}
            />
          </div>
        </div>

        {/* Status Meaning Box (7 cols) */}
        <div className="md:col-span-7 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center md:text-left space-y-3">
          <div className="text-4xl">{current.icon}</div>
          <h4 className="text-lg font-black text-[#263C72]">{current.titleVi}</h4>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{current.titleEn}</p>
          <p className="text-xs text-slate-600 font-semibold leading-relaxed">{current.desc}</p>

          <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
            <button
              onClick={() => handleSwitch('red')}
              className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition cursor-pointer"
            >
              🛑 Dừng lại
            </button>
            <button
              onClick={() => handleSwitch('yellow')}
              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition cursor-pointer"
            >
              ⚠️ Chuẩn bị
            </button>
            <button
              onClick={() => handleSwitch('green')}
              className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition cursor-pointer"
            >
              🟢 Bắt đầu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= 6. MAGIC TREASURE CHEST =================
const MagicTreasureChestTool: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [treasure, setTreasure] = useState<string | null>(null);
  const [treasuresList, setTreasuresList] = useState<string[]>([
    '🌟 Nhận ngay 1 tràng vỗ tay siêu to từ cả lớp!',
    '👑 Làm đội trưởng điều hành trò chơi trong 5 phút.',
    '🎵 Chọn 1 bài hát tiếng Anh yêu thích để cả lớp cùng hát.',
    '🎁 Nhận 1 lời khen đặc biệt từ cô Thảo trước toàn lớp.',
    '✨ Được quyền chọn bạn thân ngồi cùng bàn trong buổi học tiếp theo.',
    '🌈 Được tặng 1 sticker vương miện lấp lánh mang về nhà.',
    '💫 Nhận đặc quyền phát biểu đầu tiên trong phần câu đố.',
  ]);
  const [newItem, setNewItem] = useState('');

  const handleOpenChest = () => {
    if (treasuresList.length === 0) return;
    setIsOpen(true);
    const item = treasuresList[Math.floor(Math.random() * treasuresList.length)];
    setTreasure(item);
    audioManager.playCelebration();
    triggerStarConfetti();
  };

  const handleCloseChest = () => {
    setIsOpen(false);
    setTreasure(null);
    playStarSound('click');
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setTreasuresList([...treasuresList, newItem.trim()]);
    setNewItem('');
    playStarSound('click');
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-yellow-100 text-yellow-800">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#263C72]">Rương kho báu phép thuật (Magic Treasure Chest)</h3>
            <p className="text-xs text-slate-500">Mở rương bất ngờ nhận lời khen, trò chơi, phần thưởng tinh thần thú vị</p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-900 text-xs font-black">
          {treasuresList.length} món quà bí mật
        </div>
      </div>

      {/* Main Chest View */}
      <div className="max-w-md mx-auto text-center space-y-4">
        <div
          onClick={!isOpen ? handleOpenChest : handleCloseChest}
          className="w-48 h-48 mx-auto rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 p-4 border-4 border-amber-400 shadow-xl flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="text-6xl animate-bounce">{isOpen ? '✨' : '📦'}</span>
          <span className="text-2xl mt-2">{isOpen ? '🎁' : '🔒'}</span>
          <span className="text-xs font-black text-amber-950 mt-1">
            {isOpen ? 'Rương đang mở!' : 'Bấm để mở rương!'}
          </span>
        </div>

        {treasure && (
          <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-inner animate-scale-in">
            <span className="text-xs font-extrabold uppercase tracking-widest text-amber-600 block mb-1">
              Phần thưởng bí mật của em:
            </span>
            <p className="text-base font-black text-[#263C72]">{treasure}</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          {!isOpen ? (
            <button
              onClick={handleOpenChest}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition cursor-pointer"
            >
              Mở rương phép thuật! 🎁
            </button>
          ) : (
            <button
              onClick={handleOpenChest}
              className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-sm shadow-md transition cursor-pointer"
            >
              Mở tiếp món khác ✨
            </button>
          )}
        </div>
      </div>

      {/* Add Custom Treasure Item */}
      <div className="max-w-md mx-auto pt-4 border-t border-slate-100">
        <form onSubmit={handleAddCustom} className="flex gap-2">
          <input
            type="text"
            placeholder="Thêm lời khen hoặc phần thưởng tinh thần mới..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Thêm
          </button>
        </form>
      </div>
    </div>
  );
};

// ================= 7. MAGIC GROUP MAKER =================
const MagicGroupMakerTool: React.FC<{
  students: Student[];
  attendance?: Record<string, any>;
}> = ({ students, attendance = {} }) => {
  const [numGroups, setNumGroups] = useState<number>(4);
  const [excludeAbsent, setExcludeAbsent] = useState<boolean>(true);
  const [groups, setGroups] = useState<Array<{ id: number; name: string; color: string; members: Student[] }>>([]);

  const groupThemeConfigs = [
    { name: 'Nhóm Rồng Lửa', color: '#EF4444', bg: 'bg-rose-50', border: 'border-rose-200', icon: '🐉' },
    { name: 'Nhóm Đại Dương', color: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-200', icon: '🐬' },
    { name: 'Nhóm Mặt Trời', color: '#EAB308', bg: 'bg-amber-50', border: 'border-amber-200', icon: '☀️' },
    { name: 'Nhóm Rừng Xanh', color: '#22C55E', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '🌲' },
    { name: 'Nhóm Tinh Tú', color: '#A855F7', bg: 'bg-purple-50', border: 'border-purple-200', icon: '⭐' },
    { name: 'Nhóm Cầu Vồng', color: '#EC4899', bg: 'bg-pink-50', border: 'border-pink-200', icon: '🌈' },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = attendance[today]?.records || {};

  const handleMakeGroups = () => {
    const pool = students.filter((s) => {
      if (excludeAbsent && todayRecords[s.id] === 'absent') return false;
      return true;
    });

    // Shuffle pool
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const newGroupsArr: Array<{ id: number; name: string; color: string; members: Student[] }> = [];

    for (let i = 0; i < numGroups; i++) {
      const cfg = groupThemeConfigs[i % groupThemeConfigs.length];
      newGroupsArr.push({
        id: i + 1,
        name: `${cfg.icon} ${cfg.name}`,
        color: cfg.color,
        members: [],
      });
    }

    shuffled.forEach((student, idx) => {
      newGroupsArr[idx % numGroups].members.push(student);
    });

    setGroups(newGroupsArr);
    audioManager.playToolSound('ding', true);
    triggerStarConfetti();
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#263C72]">Chia nhóm thần kỳ (Group Maker)</h3>
            <p className="text-xs text-slate-500">
              Chia nhóm ngẫu nhiên tạm thời phục vụ thảo luận, trò chơi (Không thay đổi Tổ chính thức)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <span>Số nhóm:</span>
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setNumGroups(n)}
                className={`w-7 h-7 rounded-xl font-black text-xs transition cursor-pointer ${
                  numGroups === n ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={handleMakeGroups}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Chia nhóm ngay</span>
          </button>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="p-4 rounded-3xl border-2 border-slate-200 bg-slate-50/70 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="text-sm font-black text-slate-800" style={{ color: g.color }}>
                    {g.name}
                  </h4>
                  <span className="text-xs font-bold text-slate-500">{g.members.length} em</span>
                </div>

                <div className="space-y-1.5">
                  {g.members.map((m, idx) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 shadow-2xs text-xs font-bold text-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{m.fullName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{m.studentCode}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In danh sách nhóm</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <span className="text-5xl block animate-pulse">👥</span>
          <p className="text-xs font-bold">Chọn số lượng nhóm và nhấn "Chia nhóm ngay" để tạo danh sách nhóm sinh động!</p>
        </div>
      )}
    </div>
  );
};

// ================= 8. CELEBRATION STAGE =================
const CelebrationStageTool: React.FC<{
  students: Student[];
  teams: Team[];
}> = ({ students, teams }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [honorTitle, setHonorTitle] = useState('Ngôi sao rực rỡ nhất tuần');
  const [isLive, setIsLive] = useState(false);

  const student = students.find((s) => s.id === selectedStudentId);

  const startShow = () => {
    setIsLive(true);
    audioManager.playCelebration();
    triggerGrandCelebration();
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#263C72]">Sân khấu vinh danh (Celebration Stage)</h3>
            <p className="text-xs text-slate-500">Màn hình máy chiếu lâu đài cổ tích vinh danh học sinh và tổ xuất sắc</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Chọn học sinh vinh danh:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-800"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.totalEarnedStars} sao)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Danh hiệu vinh danh:</label>
          <select
            value={honorTitle}
            onChange={(e) => setHonorTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
          >
            <option value="Ngôi sao rực rỡ nhất tuần">Ngôi sao rực rỡ nhất tuần</option>
            <option value="Học sinh tiến bộ vượt bậc">Học sinh tiến bộ vượt bậc</option>
            <option value="Quán quân vương quốc sao">Quán quân vương quốc sao</option>
            <option value="Hiệp sĩ chăm ngoan học giỏi">Hiệp sĩ chăm ngoan học giỏi</option>
          </select>
        </div>
      </div>

      {student && (
        <div className="max-w-xl mx-auto p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-2 left-2 text-2xl">✨</div>
          <div className="absolute top-2 right-2 text-2xl">✨</div>

          <div className="relative w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden ring-4 ring-amber-400 shadow-xl">
            <img
              src={student.avatarUrl || '/assets/kingdom/student_minh.png'}
              alt={student.fullName}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black mb-3">
            👑 {honorTitle}
          </div>

          <h4 className="text-3xl font-black text-white font-['Fredoka',sans-serif]">{student.fullName}</h4>
          <p className="text-xs text-amber-300 font-bold mt-1">
            Mã: {student.studentCode} • Thành tích: {student.totalEarnedStars} ⭐ sao vàng
          </p>

          <div className="pt-6">
            <button
              onClick={startShow}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-sm shadow-xl transition cursor-pointer active:scale-95"
            >
              Bắn pháo hoa & Vinh danh! 🎉
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
