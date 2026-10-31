import React, { useState } from 'react';
import { LearningResource, LibraryCategory } from '../types';
import {
  BookOpen,
  Video,
  Image as ImageIcon,
  FolderOpen,
  Plus,
  Search,
  ExternalLink,
  Play,
  Eye,
  Download,
  X,
  Sparkles,
  FileText,
  FileSpreadsheet,
  Music,
  Gamepad2,
  Trash2,
  Upload,
  Film,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { playStarSound } from '../utils/effects';

// Helper: Extract YouTube video ID
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Helper: Check if resource is video
export function isVideoResource(url: string, type?: string, category?: string): boolean {
  if (category === 'video' || type === 'video') return true;
  if (!url) return false;
  if (getYouTubeVideoId(url)) return true;
  const l = url.toLowerCase();
  return (
    l.endsWith('.mp4') ||
    l.endsWith('.webm') ||
    l.endsWith('.mov') ||
    l.endsWith('.ogg') ||
    l.includes('youtube.com') ||
    l.includes('youtu.be') ||
    l.startsWith('data:video/')
  );
}

// Helper: Generate video thumbnail frame from uploaded video file
export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      const cleanup = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      };

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, (video.duration || 2) / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxW = 640;
          const w = Math.min(video.videoWidth || maxW, maxW);
          const h = (video.videoHeight / (video.videoWidth || 1)) * w || 360;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            cleanup();
            resolve(dataUrl);
            return;
          }
        } catch (e) {
          console.debug('Failed to render video canvas thumbnail:', e);
        }
        cleanup();
        resolve('');
      };

      video.onerror = () => {
        cleanup();
        resolve('');
      };
    } catch {
      resolve('');
    }
  });
}

// Helper: Resolve thumbnail to display for any resource
export function resolveResourceThumbnail(item: LearningResource): string {
  if (item.thumbnailUrl && item.thumbnailUrl.trim()) {
    return item.thumbnailUrl.trim();
  }
  const ytId = getYouTubeVideoId(item.url);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  if (item.category === 'image' && item.url) {
    return item.url;
  }
  return '';
}

interface LearningLibraryViewProps {
  resources: LearningResource[];
  selectedCategory?: LibraryCategory | 'all';
  onAddResource?: (resource: Omit<LearningResource, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteResource?: (id: string) => Promise<void>;
  isTeacher?: boolean;
}

export const LearningLibraryView: React.FC<LearningLibraryViewProps> = ({
  resources,
  selectedCategory = 'all',
  onAddResource,
  onDeleteResource,
  isTeacher = true,
}) => {
  const [activeCategory, setActiveCategory] = useState<LibraryCategory | 'all'>(selectedCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number>(2); // Default to Grade 2
  const [previewResource, setPreviewResource] = useState<LearningResource | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New resource form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<LibraryCategory>('video');
  const [newGrade, setNewGrade] = useState<number>(2);
  const [newType, setNewType] = useState<'video' | 'audio' | 'document' | 'game' | 'link' | 'image'>('video');
  const [newUrl, setNewUrl] = useState('');
  const [newThumbnail, setNewThumbnail] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedThumbnailName, setUploadedThumbnailName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  // 4 Categories specification (Video, Hình ảnh, Sách truyện, Khác)
  const categories: Array<{
    id: LibraryCategory;
    titleVi: string;
    titleEn: string;
    icon: typeof Video;
    color: string;
    bg: string;
    border: string;
  }> = [
    { id: 'video', titleVi: 'Video', titleEn: 'Videos', icon: Video, color: 'text-rose-600', bg: 'bg-[#FFF1F2]', border: 'border-rose-200' },
    { id: 'image', titleVi: 'Hình ảnh', titleEn: 'Images', icon: ImageIcon, color: 'text-emerald-600', bg: 'bg-[#F0FDF4]', border: 'border-emerald-200' },
    { id: 'book', titleVi: 'Sách truyện', titleEn: 'Books & Stories', icon: BookOpen, color: 'text-orange-600', bg: 'bg-[#FFF7ED]', border: 'border-orange-200' },
    { id: 'other', titleVi: 'Khác', titleEn: 'Other Resources', icon: FolderOpen, color: 'text-amber-600', bg: 'bg-[#FFFBEB]', border: 'border-amber-200' },
  ];

  // Filtering
  const filteredResources = resources.filter((res) => {
    const matchesCat = activeCategory === 'all' || res.category === activeCategory;
    const matchesGrade = gradeFilter === 0 || res.grade === gradeFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesGrade && matchesSearch;
  });

  // Handle URL change with smart YouTube auto-detection
  const handleUrlChange = (val: string) => {
    setNewUrl(val);
    const ytId = getYouTubeVideoId(val);
    if (ytId) {
      setNewType('video');
      setNewCategory('video');
      if (!newThumbnail) {
        setNewThumbnail(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
      }
    }
  };

  // Handle Main File Upload (Video, PDF, Word, PowerPoint, Audio, Image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadedFileName(file.name);
    const fileNameLower = file.name.toLowerCase();

    // Auto-detect type & category based on file extension
    if (fileNameLower.endsWith('.pdf')) {
      setNewType('document');
      setNewCategory('book');
    } else if (
      fileNameLower.endsWith('.doc') ||
      fileNameLower.endsWith('.docx') ||
      fileNameLower.endsWith('.ppt') ||
      fileNameLower.endsWith('.pptx')
    ) {
      setNewType('document');
      setNewCategory('other');
    } else if (
      fileNameLower.endsWith('.png') ||
      fileNameLower.endsWith('.jpg') ||
      fileNameLower.endsWith('.jpeg') ||
      fileNameLower.endsWith('.webp')
    ) {
      setNewType('image');
      setNewCategory('image');
    } else if (fileNameLower.endsWith('.mp3') || fileNameLower.endsWith('.wav') || fileNameLower.endsWith('.m4a')) {
      setNewType('audio');
      setNewCategory('other');
    } else if (fileNameLower.endsWith('.mp4') || fileNameLower.endsWith('.webm') || fileNameLower.endsWith('.mov')) {
      setNewType('video');
      setNewCategory('video');

      // Auto-extract thumbnail frame from video file if no thumbnail chosen yet
      try {
        const frameThumb = await generateVideoThumbnail(file);
        if (frameThumb && !newThumbnail) {
          setNewThumbnail(frameThumb);
          setUploadedThumbnailName('Ảnh bìa trích xuất từ video');
        }
      } catch (err) {
        console.debug('Could not extract video thumbnail:', err);
      }
    }

    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setNewUrl(evt.target.result);
      }
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle Thumbnail / Cover Image File Upload
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailLoading(true);
    setUploadedThumbnailName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        const rawData = evt.target.result;
        // Optimize thumbnail dimension via canvas
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 800;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h / w) * maxDim);
                w = maxDim;
              } else {
                w = Math.round((w / h) * maxDim);
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              setNewThumbnail(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              setNewThumbnail(rawData);
            }
          } catch {
            setNewThumbnail(rawData);
          }
          setThumbnailLoading(false);
        };
        img.onerror = () => {
          setNewThumbnail(rawData);
          setThumbnailLoading(false);
        };
        img.src = rawData;
      } else {
        setThumbnailLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    if (onAddResource) {
      await onAddResource({
        title: newTitle.trim(),
        category: newCategory,
        grade: newGrade,
        type: newType,
        url: newUrl.trim(),
        thumbnailUrl: newThumbnail.trim() || undefined,
        description: newDescription.trim(),
      });
      playStarSound('star');
    }

    // Reset & close
    setNewTitle('');
    setNewUrl('');
    setNewThumbnail('');
    setNewDescription('');
    setUploadedFileName('');
    setUploadedThumbnailName('');
    setIsAddModalOpen(false);
  };

  const isDocFile = (url: string) => {
    const l = url.toLowerCase();
    return l.includes('.doc') || l.includes('.ppt') || l.includes('officedocument') || l.includes('powerpoint');
  };

  const isPdf = (url: string) => {
    return url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf');
  };

  const isAudio = (url: string) => {
    return url.toLowerCase().includes('.mp3') || url.toLowerCase().includes('.wav') || url.startsWith('data:audio');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-100 via-blue-50 to-indigo-100 rounded-3xl p-5 border border-sky-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h2
              className="typo-title-section text-[#263C72] font-['Nunito',sans-serif]"
              style={{ fontFamily: 'Nunito' }}
            >
              Kho Học Liệu Số
            </h2>
            <p className="text-[13px] font-bold text-sky-700 leading-tight mt-0.5">
              Digital Learning Library • Video bài giảng, hình ảnh hoạt động, sách truyện & tài liệu STEM
            </p>
          </div>
        </div>

        {isTeacher && (
          <button
            onClick={() => {
              playStarSound('click');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black shadow-sm transition cursor-pointer shrink-0 active:scale-95 text-left"
          >
            <Plus className="w-4 h-4 stroke-[3] shrink-0" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13.5px]">+ Thêm học liệu mới</span>
              <span className="text-[11px] font-bold text-sky-100">Add Resource</span>
            </span>
          </button>
        )}
      </div>

      {/* 4 Category Cards Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.id;
          const CatIcon = cat.icon;
          const count = resources.filter((r) => r.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => {
                playStarSound('click');
                setActiveCategory(isSelected ? 'all' : cat.id);
              }}
              className={`p-3.5 rounded-3xl border-2 text-left transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between ${
                cat.bg
              } ${cat.border} ${isSelected ? 'ring-3 ring-sky-500 shadow-md scale-102' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-2xl bg-white shadow-2xs ${cat.color}`}>
                  <CatIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14.5px] font-black text-slate-900 leading-tight truncate">
                    {cat.titleVi}
                  </h4>
                  <p className="text-[12px] font-bold text-slate-600 leading-tight truncate mt-0.5">
                    {cat.titleEn}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-[12px] font-black text-slate-800 shadow-2xs">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Grade Filter Bar */}
      <div className="bg-white rounded-3xl p-3.5 border border-sky-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm video, bài giảng, PDF, PowerPoint... / Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-[13.5px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex flex-col leading-tight mr-1">
              <span className="text-[12.5px] font-black text-slate-700">Khối:</span>
              <span className="text-[10.5px] font-bold text-slate-500">Grade</span>
            </span>
            {[0, 1, 2, 3, 4, 5].map((g) => (
              <button
                key={g}
                onClick={() => {
                  playStarSound('click');
                  setGradeFilter(g);
                }}
                className={`px-2.5 py-1 rounded-xl font-black transition cursor-pointer leading-tight text-center ${
                  gradeFilter === g
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {g === 0 ? (
                  <span className="flex flex-col leading-tight">
                    <span className="text-[12.5px]">Tất cả</span>
                    <span className={`text-[10.5px] font-bold ${gradeFilter === g ? 'text-sky-100' : 'text-slate-500'}`}>All</span>
                  </span>
                ) : (
                  <span className="flex flex-col leading-tight">
                    <span className="text-[12.5px]">Khối {g}</span>
                    <span className={`text-[10.5px] font-bold ${gradeFilter === g ? 'text-sky-100' : 'text-slate-500'}`}>G{g}</span>
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeCategory !== 'all' && (
            <button
              onClick={() => {
                playStarSound('click');
                setActiveCategory('all');
              }}
              className="text-xs font-black text-sky-600 hover:text-sky-800 underline cursor-pointer"
            >
              Hiện tất cả / Show All
            </button>
          )}
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-sky-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-400 mx-auto flex items-center justify-center text-2xl mb-3">
            📚
          </div>
          <h3 className="text-sm font-black text-[#263C72] mb-1">Chưa có tài liệu nào phù hợp</h3>
          <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
            Thầy cô có thể nhấn "Thêm học liệu mới" để tải lên video bài giảng, hình ảnh hoặc tài liệu học tập.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredResources.map((item) => {
            const cat = categories.find((c) => c.id === item.category) || categories[0];
            const CatIcon = cat.icon;
            const thumbUrl = resolveResourceThumbnail(item);
            const isVideo = isVideoResource(item.url, item.type, item.category);

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-sky-100 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between group"
              >
                {/* Thumbnail / Header */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback if thumbnail fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center ${cat.bg}`}>
                      <CatIcon className={`w-10 h-10 ${cat.color} opacity-70`} />
                      <span className="text-[10px] font-black text-slate-500 mt-1 uppercase">{cat.titleVi}</span>
                    </div>
                  )}

                  {/* Badge Category */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs flex items-center gap-1 ${cat.bg} ${cat.color} border ${cat.border}`}>
                      <CatIcon className="w-3 h-3" />
                      <span>{cat.titleVi}</span>
                    </span>
                  </div>

                  {/* Grade Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black/60 text-white backdrop-blur-xs">
                      Khối {item.grade}
                    </span>
                  </div>

                  {/* Play Indicator Overlay for Video */}
                  {isVideo && (
                    <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-black flex items-center gap-1">
                      <Film className="w-3 h-3 text-rose-400" />
                      <span>Video</span>
                    </div>
                  )}

                  {/* Play / View Overlay Button */}
                  <button
                    onClick={() => {
                      playStarSound('click');
                      setPreviewResource(item);
                    }}
                    className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-20"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/95 text-sky-600 shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform">
                      {isVideo ? (
                        <Play className="w-6 h-6 fill-rose-500 text-rose-500 ml-0.5" />
                      ) : (
                        <Eye className="w-6 h-6 text-sky-600" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-[#263C72] line-clamp-2 leading-tight group-hover:text-sky-600 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 line-clamp-2 mt-1 leading-snug">
                      {item.description || 'Học liệu số phục vụ giảng dạy & học tập Lớp 2A5.'}
                    </p>
                  </div>

                  {/* Footer actions */}
                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </span>

                    <div className="flex items-center gap-1">
                      {isTeacher && onDeleteResource && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Xóa học liệu "${item.title}"?`)) {
                              await onDeleteResource(item.id);
                            }
                          }}
                          className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Xóa học liệu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          playStarSound('click');
                          setPreviewResource(item);
                        }}
                        className="px-3 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-black flex items-center gap-1.5 transition cursor-pointer text-left"
                      >
                        <span className="flex flex-col leading-tight">
                          <span className="text-[12.5px]">{isVideo ? 'Xem video' : 'Mở xem'}</span>
                          <span className="text-[10.5px] font-bold text-sky-600">{isVideo ? 'Play' : 'Open'}</span>
                        </span>
                        {isVideo ? (
                          <Play className="w-3.5 h-3.5 fill-sky-600 shrink-0" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resource Preview / Video Player Modal */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-3xl shadow-2xl border border-sky-100 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800 shrink-0">
                  {categories.find((c) => c.id === previewResource.category)?.titleVi || 'Học liệu'}
                </span>
                <h3 className="text-sm sm:text-base font-black text-[#263C72] truncate">
                  {previewResource.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewResource(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Presentation: Video, Image, PDF, Audio, Document */}
            <div className="mb-4 rounded-2xl overflow-hidden bg-black flex items-center justify-center relative shadow-inner">
              {/* 1. VIDEO (YouTube, MP4 file, or Data URL) */}
              {isVideoResource(previewResource.url, previewResource.type, previewResource.category) ? (
                <div className="w-full aspect-video flex items-center justify-center bg-black">
                  {getYouTubeVideoId(previewResource.url) ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${getYouTubeVideoId(previewResource.url)}?autoplay=1&rel=0`}
                      title={previewResource.title}
                      className="w-full h-full border-0 rounded-2xl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : previewResource.url.startsWith('data:video') ||
                    previewResource.url.includes('.mp4') ||
                    previewResource.url.includes('.webm') ||
                    previewResource.url.includes('.mov') ? (
                    <video
                      controls
                      autoPlay
                      playsInline
                      poster={resolveResourceThumbnail(previewResource)}
                      src={previewResource.url}
                      className="w-full h-full object-contain rounded-2xl"
                    >
                      Trình duyệt không hỗ trợ phát trực tiếp định dạng video này.
                    </video>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white p-6 text-center">
                      {resolveResourceThumbnail(previewResource) && (
                        <img
                          src={resolveResourceThumbnail(previewResource)}
                          alt={previewResource.title}
                          className="absolute inset-0 w-full h-full object-cover opacity-30"
                        />
                      )}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center mb-3 shadow-lg">
                          <Play className="w-8 h-8 fill-white ml-1" />
                        </div>
                        <h4 className="text-base font-black">{previewResource.title}</h4>
                        <p className="text-xs text-white/80 max-w-sm mt-1 mb-4">
                          Video bài giảng trực tuyến dành cho các em học sinh vương quốc!
                        </p>
                        <a
                          href={previewResource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-md flex items-center gap-2 transition"
                        >
                          <span>Mở xem video trên tab mới</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : previewResource.category === 'image' || previewResource.type === 'image' ? (
                /* 2. IMAGE LIGHTBOX */
                <div className="p-2 w-full flex items-center justify-center bg-slate-900">
                  <img
                    src={previewResource.url || previewResource.thumbnailUrl}
                    alt={previewResource.title}
                    className="max-h-[65vh] object-contain rounded-xl"
                  />
                </div>
              ) : isAudio(previewResource.url) ? (
                /* 3. AUDIO PLAYER */
                <div className="w-full p-8 flex flex-col items-center justify-center text-white bg-gradient-to-br from-indigo-950 to-slate-900">
                  <Music className="w-16 h-16 text-sky-400 mb-4 animate-bounce" />
                  <h4 className="text-base font-black mb-3">{previewResource.title}</h4>
                  <audio controls src={previewResource.url} className="w-full max-w-md rounded-xl" />
                </div>
              ) : isPdf(previewResource.url) ? (
                /* 4. PDF DOCUMENT VIEWER */
                <div className="w-full h-[60vh] flex flex-col bg-white">
                  <iframe
                    src={previewResource.url}
                    title={previewResource.title}
                    className="w-full flex-1 border-0 rounded-t-xl"
                  />
                  <div className="p-2 bg-slate-800 flex justify-between items-center text-xs text-white px-4">
                    <span>Xem tài liệu PDF trực tiếp</span>
                    <a
                      href={previewResource.url}
                      download={`${previewResource.title}.pdf`}
                      className="px-3 py-1 bg-sky-500 hover:bg-sky-600 rounded-lg font-bold flex items-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về PDF</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* 5. WORD / PPT / OTHER */
                <div className="w-full min-h-[300px] bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center p-6 text-center text-amber-950">
                  <BookOpen className="w-16 h-16 text-amber-600 mb-3" />
                  <h4 className="text-base font-black">{previewResource.title}</h4>
                  <p className="text-xs font-semibold text-amber-800 max-w-md mt-1 mb-4">
                    {previewResource.description || 'Tài liệu hỗ trợ giảng dạy và ôn tập kiến thức.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={previewResource.url}
                      download
                      className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md flex items-center gap-2 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải tài liệu về máy (Word / PPT / File)</span>
                    </a>
                    <a
                      href={previewResource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-2xl bg-white border border-amber-300 text-amber-900 font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <span>Mở liên kết</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Description & metadata */}
            <div className="space-y-2">
              <h5 className="text-xs font-black text-slate-800">Mô tả bài học & hướng dẫn:</h5>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {previewResource.description || 'Không có mô tả chi tiết.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add New Resource Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-sky-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-[#263C72] flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-600 stroke-[3]" />
                <span>Thêm học liệu & video bài giảng mới</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Upload File Area (Video MP4, PDF, Word, PowerPoint, Audio, Image) */}
            <div className="mb-4 p-4 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 text-center">
              <Upload className="w-8 h-8 text-sky-500 mx-auto mb-2" />
              <p className="text-xs font-black text-[#263C72] mb-1">
                Tải lên video hoặc tệp từ thiết bị (MP4, PDF, Word, PowerPoint, Ảnh, Âm thanh)
              </p>
              <p className="text-[10px] text-slate-500 mb-2">
                Hỗ trợ định dạng: .mp4, .webm, .pdf, .doc, .docx, .ppt, .pptx, .png, .jpg, .mp3
              </p>
              <label className="inline-block px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black shadow-xs cursor-pointer transition">
                <span>{uploadLoading ? 'Đang đọc tệp video/tài liệu...' : '📁 Chọn tệp từ máy'}</span>
                <input
                  type="file"
                  accept=".mp4,.webm,.mov,.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.mp3,.wav"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadedFileName && (
                <p className="text-xs font-bold text-emerald-700 mt-2 bg-emerald-50 py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã chọn: {uploadedFileName}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleCreateResource} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Tiêu đề học liệu / video *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Video bài giảng: Phonics Tiếng Anh Tuần 4 / Slide PowerPoint STEM..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Nhóm học liệu *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as LibraryCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="video">Video (Videos)</option>
                    <option value="image">Hình ảnh (Images)</option>
                    <option value="book">Sách truyện (Books & Stories)</option>
                    <option value="other">Khác (Other Resources)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Khối lớp
                  </label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value={1}>Khối 1</option>
                    <option value={2}>Khối 2 (2A5)</option>
                    <option value={3}>Khối 3</option>
                    <option value={4}>Khối 4</option>
                    <option value={5}>Khối 5</option>
                  </select>
                </div>
              </div>

              {/* 2. URL or Video Link */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Đường dẫn Video / URL học liệu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Dán link YouTube (VD: https://www.youtube.com/watch?v=...) hoặc tải file phía trên"
                  value={newUrl.length > 80 && newUrl.startsWith('data:') ? `[Dữ liệu tệp đính kèm: ${uploadedFileName}]` : newUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* 3. THUMBNAIL / ẢNH BÌA SECTION */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>Ảnh bìa / Thumbnail học liệu</span>
                  </label>
                  {newThumbnail && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewThumbnail('');
                        setUploadedThumbnailName('');
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                    >
                      Xóa ảnh bìa
                    </button>
                  )}
                </div>

                {/* Upload Thumbnail Button or Paste URL */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs cursor-pointer transition flex items-center justify-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{thumbnailLoading ? 'Đang nén ảnh...' : 'Tải ảnh bìa từ máy'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    placeholder="Hoặc dán URL ảnh bìa (https://...)"
                    value={newThumbnail.startsWith('data:image') ? '[Ảnh bìa tải lên từ máy]' : newThumbnail}
                    onChange={(e) => setNewThumbnail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Thumbnail Preview Card */}
                {newThumbnail && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-amber-200">
                    <img
                      src={newThumbnail}
                      alt="Thumbnail Preview"
                      className="w-20 h-14 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Ảnh bìa sẵn sàng hiển thị</span>
                      </p>
                      <p className="text-[10.5px] text-slate-500 font-semibold truncate">
                        {uploadedThumbnailName || 'Ảnh bìa hợp lệ cho thẻ học liệu'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Mô tả & Hướng dẫn học
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú hướng dẫn cho các em học sinh..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-700 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || thumbnailLoading || !newUrl}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  Lưu học liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
