import React, { useState, useRef, useEffect } from 'react';
import { ClassNewsItem, ClassInfo, NewsAttachment, Student } from '../types';
import {
  Megaphone,
  Pin,
  Heart,
  Plus,
  Calendar,
  Search,
  X,
  Edit3,
  Trash2,
  Check,
  AlertTriangle,
  Tag,
  Save,
  MessageSquare,
  Sparkles,
  MoreVertical,
  MoreHorizontal,
  RotateCcw,
  Eye,
  FileText,
  Video,
  Image as ImageIcon,
  Paperclip,
  Clock,
  User,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  Filter,
  Cake,
  Gift,
  RefreshCw,
  Users,
} from 'lucide-react';
import { playStarSound, triggerStarConfetti, triggerGrandCelebration } from '../utils/effects';
import { api } from '../services/api';

interface ClassNewsViewProps {
  news: ClassNewsItem[];
  classInfo?: ClassInfo;
  classes?: ClassInfo[];
  students?: Student[];
  onPostNews: (item: Partial<ClassNewsItem>) => Promise<void>;
  onUpdateNews?: (id: string, updates: Partial<ClassNewsItem>) => Promise<void>;
  onTogglePinNews?: (id: string) => Promise<void>;
  onDeleteNews?: (id: string, permanent?: boolean, deletedBy?: string) => Promise<void>;
  onRestoreNews?: (id: string) => Promise<void>;
  onRefreshState?: () => Promise<void>;
  isTeacher?: boolean;
  currentTeacherName?: string;
}

export const ClassNewsView: React.FC<ClassNewsViewProps> = ({
  news,
  classInfo,
  classes = [],
  students = [],
  onPostNews,
  onUpdateNews,
  onTogglePinNews,
  onDeleteNews,
  onRestoreNews,
  onRefreshState,
  isTeacher = true,
  currentTeacherName = 'Cô Thảo',
}) => {
  // Navigation & views
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'pinned' | 'birthday' | 'my' | 'trash'>('all');
  const [selectedBirthdayMonth, setSelectedBirthdayMonth] = useState<number | 'all'>('all');
  const [syncingBirthdays, setSyncingBirthdays] = useState(false);
  const [giftingStars, setGiftingStars] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>(classInfo?.id || 'all');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'likes'>('newest');

  // Interactive Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassNewsItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ item: ClassNewsItem; permanent: boolean } | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Form states for creating / editing
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAuthor, setFormAuthor] = useState(currentTeacherName);
  const [formPinned, setFormPinned] = useState(false);
  const [formTags, setFormTags] = useState<string[]>(['Thông báo']);
  const [newTagInput, setNewTagInput] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formVisibility, setFormVisibility] = useState<'all' | 'students' | 'teachers'>('all');
  const [formAttachments, setFormAttachments] = useState<NewsAttachment[]>([]);
  const [attachmentNameInput, setAttachmentNameInput] = useState('');
  const [attachmentUrlInput, setAttachmentUrlInput] = useState('');
  const [formClassId, setFormClassId] = useState<string>(classInfo?.id || 'class_2a5');

  // Like counters (optimistic locally)
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.post-menu-container')) {
        setOpenMenuPostId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync selectedClassId with classInfo change
  useEffect(() => {
    if (classInfo?.id) {
      setSelectedClassId(classInfo.id);
      setFormClassId(classInfo.id);
    }
  }, [classInfo?.id]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleLike = (id: string) => {
    playStarSound('click');
    setLocalLikes((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  // Open Edit Modal
  const openEditModal = (item: ClassNewsItem) => {
    setOpenMenuPostId(null);
    setEditingItem(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormAuthor(item.author || currentTeacherName);
    setFormPinned(Boolean(item.pinned || item.isPinned));
    setFormTags(item.tags && item.tags.length > 0 ? item.tags : ['Thông báo']);
    setFormImages(item.images || (item.imageUrl ? [item.imageUrl] : []));
    setFormVideoUrl(item.videoUrl || '');
    setFormVisibility(item.visibility || 'all');
    setFormAttachments(item.attachments || []);
    setFormClassId(item.classId || classInfo?.id || 'class_2a5');
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormTitle('');
    setFormContent('');
    setFormAuthor(currentTeacherName);
    setFormPinned(false);
    setFormTags(['Thông báo']);
    setFormImages([]);
    setImageUrlInput('');
    setFormVideoUrl('');
    setFormVisibility('all');
    setFormAttachments([]);
    setFormClassId(classInfo?.id || 'class_2a5');
    setIsAddModalOpen(true);
  };

  // Sync birthday news across months
  const handleSyncBirthdays = async () => {
    setSyncingBirthdays(true);
    playStarSound('click');
    try {
      const res = await api.syncBirthdayNews(classInfo?.id);
      showToast(res.message || 'Đã đồng bộ và cập nhật bản tin sinh nhật các tháng!');
      playStarSound('star');
      if (onRefreshState) await onRefreshState();
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi đồng bộ bản tin sinh nhật: ' + (err.message || ''), 'error');
    } finally {
      setSyncingBirthdays(false);
    }
  };

  // Gift 10 stars to birthday students of a month
  const handleGiftBirthdayStars = async (month: number) => {
    setGiftingStars(true);
    try {
      const res = await api.giftBirthdayStars(month, classInfo?.id);
      showToast(res.message || `Đã thưởng 10 sao sinh nhật Tháng ${month}!`);
      playStarSound('win');
      triggerGrandCelebration();
      if (onRefreshState) await onRefreshState();
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi thưởng sao sinh nhật: ' + (err.message || ''), 'error');
    } finally {
      setGiftingStars(false);
    }
  };

  // Quick Pin Toggle
  const handleTogglePin = async (item: ClassNewsItem) => {
    setOpenMenuPostId(null);
    playStarSound('click');
    try {
      if (onTogglePinNews) {
        await onTogglePinNews(item.id);
      } else if (onUpdateNews) {
        const nextPinned = !item.pinned;
        await onUpdateNews(item.id, {
          pinned: nextPinned,
          isPinned: nextPinned,
          pinnedAt: nextPinned ? new Date().toISOString() : undefined,
        });
      }
      showToast(item.pinned ? 'Đã bỏ ghim bài viết!' : 'Đã ghim bài viết lên đầu bảng tin! ⭐');
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi thay đổi trạng thái ghim: ' + (err.message || ''), 'error');
    }
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !onUpdateNews) return;
    if (!formTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề bài viết', 'error');
      return;
    }
    if (!formContent.trim()) {
      showToast('Vui lòng nhập nội dung bài viết', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const updates: Partial<ClassNewsItem> = {
        title: formTitle.trim(),
        content: formContent.trim(),
        author: formAuthor.trim() || currentTeacherName,
        pinned: formPinned,
        isPinned: formPinned,
        tags: formTags.length > 0 ? formTags : ['Thông báo'],
        images: formImages,
        imageUrl: formImages[0] || undefined,
        videoUrl: formVideoUrl.trim() || undefined,
        visibility: formVisibility,
        attachments: formAttachments,
        classId: formClassId,
        isEdited: true,
        updatedAt: new Date().toISOString(),
        updatedBy: currentTeacherName,
      };

      await onUpdateNews(editingItem.id, updates);
      playStarSound('star');
      setEditingItem(null);
      showToast('Đã lưu bài viết và cập nhật thành công!');
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi cập nhật bài viết: ' + (err.message || ''), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề bài viết', 'error');
      return;
    }
    if (!formContent.trim()) {
      showToast('Vui lòng nhập nội dung bài viết', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await onPostNews({
        title: formTitle.trim(),
        content: formContent.trim(),
        author: formAuthor.trim() || currentTeacherName,
        pinned: formPinned,
        isPinned: formPinned,
        tags: formTags.length > 0 ? formTags : ['Thông báo'],
        images: formImages,
        imageUrl: formImages[0] || undefined,
        videoUrl: formVideoUrl.trim() || undefined,
        visibility: formVisibility,
        attachments: formAttachments,
        classId: formClassId,
      });

      playStarSound('star');
      setIsAddModalOpen(false);
      showToast('Đã đăng bài viết mới lên bảng tin thành công!');
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi đăng bài viết: ' + (err.message || ''), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Soft Delete or Permanent Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem || !onDeleteNews) return;
    setSubmitting(true);
    try {
      await onDeleteNews(deletingItem.item.id, deletingItem.permanent, currentTeacherName);
      playStarSound('click');
      showToast(
        deletingItem.permanent
          ? `Đã xóa vĩnh viễn bài viết "${deletingItem.item.title}"!`
          : `Đã chuyển bài viết "${deletingItem.item.title}" vào Thùng rác!`
      );
      setDeletingItem(null);
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi xóa bài viết: ' + (err.message || ''), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Restore
  const handleRestore = async (item: ClassNewsItem) => {
    if (!onRestoreNews) return;
    setSubmitting(true);
    try {
      await onRestoreNews(item.id);
      playStarSound('star');
      showToast(`Đã khôi phục bài viết "${item.title}" thành công!`);
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi khi khôi phục bài viết: ' + (err.message || ''), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers for tags & image management in form
  const handleAddTag = (tag: string) => {
    const clean = tag.trim().replace(/^#/, '');
    if (clean && !formTags.includes(clean)) {
      setFormTags([...formTags, clean]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setFormTags(formTags.filter((t) => t !== tag));
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFormImages([...formImages, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setFormImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormImages(formImages.filter((_, i) => i !== index));
  };

  const handleAddAttachment = () => {
    if (!attachmentNameInput.trim() || !attachmentUrlInput.trim()) return;
    setFormAttachments([
      ...formAttachments,
      {
        name: attachmentNameInput.trim(),
        url: attachmentUrlInput.trim(),
        type: 'other',
      },
    ]);
    setAttachmentNameInput('');
    setAttachmentUrlInput('');
  };

  const handleRemoveAttachment = (index: number) => {
    setFormAttachments(formAttachments.filter((_, i) => i !== index));
  };

  // Filter and Partition News
  // 1. Separate regular active posts vs deleted posts
  const activeClassTargetId = classInfo?.id || 'class_2a5';

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1 to 12
  const currentDay = now.getDate();

  // Find students belonging to current class
  const classStudents = students.filter((s) => !classInfo?.id || s.classId === classInfo.id);

  // Parse birth info helper for students
  const studentBirthdays = React.useMemo(() => {
    return classStudents.map((s) => {
      let bDay: number | null = null;
      let bMonth: number | null = null;
      if (s.dob) {
        const parts = s.dob.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (parts) {
          bDay = parseInt(parts[3], 10);
          bMonth = parseInt(parts[2], 10);
        } else {
          const vnParts = s.dob.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
          if (vnParts) {
            bDay = parseInt(vnParts[1], 10);
            bMonth = parseInt(vnParts[2], 10);
          }
        }
      }
      return {
        student: s,
        day: bDay,
        month: bMonth,
        isThisMonth: bMonth === currentMonth,
        isToday: bMonth === currentMonth && bDay === currentDay,
      };
    });
  }, [classStudents, currentMonth, currentDay]);

  const thisMonthCelebrants = studentBirthdays.filter((b) => b.isThisMonth && b.day !== null);
  thisMonthCelebrants.sort((a, b) => (a.day || 0) - (b.day || 0));

  const classScopedNews = news.filter((item) => {
    if (selectedClassId === 'all') return true;
    return item.classId === selectedClassId;
  });

  const activePosts = classScopedNews.filter((item) => !item.isDeleted);
  const trashPosts = classScopedNews.filter((item) => Boolean(item.isDeleted));

  const birthdayPostsCount = activePosts.filter(
    (p) =>
      p.tags?.some((t) => t.toLowerCase().includes('sinh nhật')) ||
      p.title?.toLowerCase().includes('sinh nhật')
  ).length;

  // 2. Filter active posts by view tab, search, tags, and author
  let displayedPosts: ClassNewsItem[] = [];

  if (activeViewTab === 'trash') {
    displayedPosts = trashPosts;
  } else {
    displayedPosts = activePosts.filter((item) => {
      // Tab filter
      if (activeViewTab === 'pinned' && !item.pinned && !item.isPinned) return false;
      if (activeViewTab === 'birthday') {
        const isBday =
          item.tags?.some((t) => t.toLowerCase().includes('sinh nhật')) ||
          item.title?.toLowerCase().includes('sinh nhật');
        if (!isBday) return false;

        if (selectedBirthdayMonth !== 'all') {
          const matchMonthTag = item.tags?.includes(`Sinh nhật tháng ${selectedBirthdayMonth}`);
          const matchTitle = item.title?.includes(`Tháng ${selectedBirthdayMonth}`);
          const matchContent = item.content?.includes(`Tháng ${selectedBirthdayMonth}`);
          if (!matchMonthTag && !matchTitle && !matchContent) return false;
        }
      }
      if (activeViewTab === 'my') {
        const authorMatch =
          item.author?.toLowerCase().includes(currentTeacherName.toLowerCase()) ||
          item.updatedBy?.toLowerCase().includes(currentTeacherName.toLowerCase());
        if (!authorMatch) return false;
      }

      // Tag filter
      if (tagFilter !== 'all' && !item.tags?.includes(tagFilter)) return false;

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesContent = item.content?.toLowerCase().includes(query);
        const matchesAuthor = item.author?.toLowerCase().includes(query);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesContent && !matchesAuthor && !matchesTags) return false;
      }

      return true;
    });

    // 3. Sorting: Pinned posts ALWAYS on top, then sorted by chosen order
    displayedPosts.sort((a, b) => {
      const aPinned = a.pinned || a.isPinned ? 1 : 0;
      const bPinned = b.pinned || b.isPinned ? 1 : 0;

      if (aPinned !== bPinned) {
        return bPinned - aPinned; // Pinned first
      }

      if (sortOrder === 'likes') {
        const likesA = (a.likes || 0) + (localLikes[a.id] || 0);
        const likesB = (b.likes || 0) + (localLikes[b.id] || 0);
        return likesB - likesA;
      }

      const dateA = new Date(a.date || a.updatedAt || 0).getTime();
      const dateB = new Date(b.date || b.updatedAt || 0).getTime();
      return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }

  // Extract all unique tags from active posts
  const allAvailableTags = Array.from(new Set(activePosts.flatMap((n) => n.tags || [])));

  return (
    <div className="space-y-4">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-fade-in transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border-2 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-2 border-emerald-300 text-emerald-800'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Banner Header */}
      <div className="bg-gradient-to-r from-pink-100 via-rose-50 to-pink-200 rounded-3xl p-5 border border-pink-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-xs">
            <Megaphone className="w-7 h-7" />
          </div>
          <div>
            <h2 className="typo-title-section text-pink-950 leading-tight">
              Bảng Tin Lớp Học
            </h2>
            <p className="text-[13.5px] font-extrabold text-pink-800 leading-tight">
              Class News & Announcements • {classInfo?.nameVi || 'Lớp 2A5'}
            </p>
            <p className="text-[12.5px] font-bold text-pink-700 mt-0.5">
              Nhật ký hoạt động, thông báo bài tập & lời chúc mừng / Daily activities, homework & birthday wishes
            </p>
          </div>
        </div>

        {isTeacher && (
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleSyncBirthdays}
              disabled={syncingBirthdays}
              title="Tự động quét danh sách ngày sinh và cập nhật bản tin sinh nhật định kỳ 12 tháng"
              className="px-3.5 py-2 rounded-2xl bg-white/95 hover:bg-white text-pink-800 hover:text-pink-950 border-2 border-pink-300 shadow-sm flex items-center gap-2 transition active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${syncingBirthdays ? 'animate-spin text-pink-600' : 'text-pink-600'}`} />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13.5px] font-black">{syncingBirthdays ? 'Đang cập nhật...' : 'Đồng bộ sinh nhật'}</span>
                <span className="text-[11px] font-bold text-pink-700">Sync Birthdays</span>
              </div>
            </button>

            <button
              onClick={() => {
                playStarSound('click');
                openCreateModal();
              }}
              className="px-4 py-2 rounded-2xl bg-pink-500 hover:bg-pink-600 active:scale-95 text-white shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5 stroke-[3]" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[14px] font-black">+ Đăng bài mới</span>
                <span className="text-[11px] font-bold text-white/95">New Post</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* View Tabs & Trash Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveViewTab('all')}
            className={`px-3.5 py-1.5 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'all'
                ? 'bg-[#1E3A8A] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-sky-50 hover:text-sky-800 border border-slate-200'
            }`}
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Tất cả ({activePosts.length})</span>
              <span className={`text-[11px] font-bold ${activeViewTab === 'all' ? 'text-white/90' : 'text-slate-600'}`}>All Posts</span>
            </div>
          </button>

          <button
            onClick={() => setActiveViewTab('birthday')}
            className={`px-3.5 py-1.5 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'birthday'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                : 'bg-white text-pink-700 hover:bg-pink-50 border border-pink-200'
            }`}
          >
            <Cake className="w-4 h-4 shrink-0" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">🎂 Bản tin sinh nhật ({birthdayPostsCount})</span>
              <span className={`text-[11px] font-bold ${activeViewTab === 'birthday' ? 'text-white/95' : 'text-pink-600'}`}>Birthday Bulletins</span>
            </div>
            {thisMonthCelebrants.length > 0 && (
              <span className="px-2 py-0.5 text-[11px] bg-rose-600 text-white rounded-full font-black animate-pulse">
                T.{currentMonth}: {thisMonthCelebrants.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveViewTab('pinned')}
            className={`px-3.5 py-1.5 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'pinned'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 border border-slate-200'
            }`}
          >
            <Pin className="w-4 h-4 fill-current shrink-0" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-black">Đã ghim ({activePosts.filter((p) => p.pinned || p.isPinned).length})</span>
              <span className={`text-[11px] font-bold ${activeViewTab === 'pinned' ? 'text-white/95' : 'text-slate-600'}`}>Pinned Posts</span>
            </div>
          </button>

          {isTeacher && (
            <button
              onClick={() => setActiveViewTab('my')}
              className={`px-3.5 py-1.5 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
                activeViewTab === 'my'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-800 border border-slate-200'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13.5px] font-black">Bài của tôi</span>
                <span className={`text-[11px] font-bold ${activeViewTab === 'my' ? 'text-white/95' : 'text-slate-600'}`}>My Posts</span>
              </div>
            </button>
          )}

          {isTeacher && (
            <button
              onClick={() => setActiveViewTab('trash')}
              className={`px-3.5 py-1.5 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
                activeViewTab === 'trash'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[13.5px] font-black">Thùng rác ({trashPosts.length})</span>
                <span className={`text-[11px] font-bold ${activeViewTab === 'trash' ? 'text-white/95' : 'text-rose-600'}`}>Trash</span>
              </div>
            </button>
          )}
        </div>

        {/* Class Filter Selector */}
        {classes.length > 1 && (
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="font-bold text-slate-600">Lớp / Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-sky-900 outline-none"
            >
              <option value="all">Tất cả các lớp / All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameVi}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Birthday Spotlight & Month Selector (When Birthday Tab is active or general showcase) */}
      {activeViewTab === 'birthday' && (
        <div className="space-y-3 animate-fade-in">
          {/* Spotlight Hero Card for Birthday Month */}
          <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden border-2 border-pink-300">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-15 pointer-events-none text-9xl">
              🎂
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[12.5px] font-black shadow-xs">
                  <Cake className="w-4 h-4 text-yellow-300" />
                  <span>
                    BẢN TIN SINH NHẬT • BIRTHDAY BULLETIN (THÁNG {selectedBirthdayMonth === 'all' ? currentMonth : selectedBirthdayMonth})
                  </span>
                  {selectedBirthdayMonth === 'all' && (
                    <span className="text-[11px] bg-yellow-400 text-pink-900 px-2 py-0.5 rounded-full font-black">
                      Hiện tại / Current
                    </span>
                  )}
                </div>

                <h3 className="text-[20px] sm:text-[23px] font-black tracking-tight leading-tight">
                  Chúc Mừng Sinh Nhật Tháng {selectedBirthdayMonth === 'all' ? currentMonth : selectedBirthdayMonth}! 🎉
                </h3>
                <p className="text-[14px] font-extrabold text-yellow-100 leading-tight">
                  Happy Birthday to Our Little Stars Born in Month {selectedBirthdayMonth === 'all' ? currentMonth : selectedBirthdayMonth}!
                </p>

                <p className="text-[13.5px] text-white/95 font-semibold leading-relaxed">
                  Hệ thống tự động đồng bộ ngày sinh của học sinh vào bản tin hàng tháng. Mỗi bạn đón sinh nhật được tặng{' '}
                  <b className="text-yellow-300 font-black">+10 Sao Vương Quốc (+10 Kingdom Stars)</b> cùng vương miện danh dự!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 w-full md:w-auto">
                {isTeacher && (
                  <button
                    onClick={() => handleGiftBirthdayStars(selectedBirthdayMonth === 'all' ? currentMonth : selectedBirthdayMonth)}
                    disabled={giftingStars}
                    className="px-4 py-2.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-pink-950 shadow-md flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    <Gift className={`w-4.5 h-4.5 ${giftingStars ? 'animate-bounce' : ''}`} />
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[13.5px] font-black">
                        {giftingStars
                          ? 'Đang trao thưởng...'
                          : `Thưởng +10 Sao Tháng ${selectedBirthdayMonth === 'all' ? currentMonth : selectedBirthdayMonth}`}
                      </span>
                      <span className="text-[11px] font-bold text-pink-900">
                        Gift +10 Birthday Stars
                      </span>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => triggerGrandCelebration()}
                  className="px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white shadow-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4.5 h-4.5 text-yellow-300" />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[13.5px] font-black">Bắn pháo hoa chúc mừng 🎉</span>
                    <span className="text-[11px] font-bold text-white/90">Launch Celebration Fireworks</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Celebrants Grid for Selected Month */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="text-xs font-extrabold text-pink-100 mb-2.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>
                  Danh sách học sinh đón sinh nhật{' '}
                  <b>
                    {selectedBirthdayMonth === 'all'
                      ? `Tháng ${currentMonth} (${thisMonthCelebrants.length} bạn)`
                      : `Tháng ${selectedBirthdayMonth} (${studentBirthdays.filter((b) => b.month === selectedBirthdayMonth).length} bạn)`}
                  </b>
                  :
                </span>
              </div>

              {(() => {
                const targetMonthNum = selectedBirthdayMonth === 'all' ? currentMonth : selectedBirthdayMonth;
                const celebrants = studentBirthdays.filter((b) => b.month === targetMonthNum && b.day !== null);
                celebrants.sort((a, b) => (a.day || 0) - (b.day || 0));

                if (celebrants.length === 0) {
                  return (
                    <div className="p-3 bg-white/10 rounded-2xl text-xs text-pink-100 font-semibold text-center">
                      Tháng {targetMonthNum} lớp chưa có bạn nào có ngày sinh nhật được ghi nhận. Khi cập nhật ngày sinh cho học sinh, bản tin sẽ tự động xuất hiện!
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {celebrants.map(({ student: s, day, isToday }) => (
                      <div
                        key={s.id}
                        className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2.5 ${
                          isToday
                            ? 'bg-yellow-300 text-pink-950 border-yellow-400 ring-2 ring-white shadow-md'
                            : 'bg-white/95 text-slate-800 border-white/80 shadow-xs'
                        }`}
                      >
                        <div className="relative shrink-0">
                          {s.avatarUrl ? (
                            <img
                              src={s.avatarUrl}
                              alt={s.fullName}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 font-black text-xs flex items-center justify-center">
                              {s.fullName.charAt(0)}
                            </div>
                          )}
                          {isToday && (
                            <span className="absolute -top-1.5 -right-1 text-xs animate-bounce" title="Sinh nhật hôm nay!">
                              👑
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black truncate">{s.fullName}</div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-pink-800">
                            <span>🎂 {day}/{targetMonthNum}</span>
                            {isToday && (
                              <span className="text-[10px] font-black text-rose-600 animate-pulse">
                                • Hôm nay!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 12-Month Selector Bar */}
          <div className="bg-white p-3 rounded-2xl border border-pink-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-pink-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-pink-600" />
                <span>Xem bản tin sinh nhật theo 12 tháng:</span>
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Tự động tạo & cập nhật theo ngày sinh
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-13 gap-1.5">
              <button
                onClick={() => setSelectedBirthdayMonth('all')}
                className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center ${
                  selectedBirthdayMonth === 'all'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-pink-50 text-pink-800 hover:bg-pink-100'
                }`}
              >
                Tất cả
              </button>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const countInMonth = studentBirthdays.filter((b) => b.month === m).length;
                const isCurMonth = m === currentMonth;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedBirthdayMonth(m)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-extrabold transition cursor-pointer text-center relative ${
                      selectedBirthdayMonth === m
                        ? 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-xs'
                        : isCurMonth
                        ? 'bg-yellow-100 text-pink-900 border border-yellow-300 hover:bg-yellow-200'
                        : 'bg-slate-50 text-slate-700 hover:bg-pink-50 hover:text-pink-800 border border-slate-100'
                    }`}
                  >
                    <span>Th.{m}</span>
                    {countInMonth > 0 && (
                      <span
                        className={`ml-1 text-[10px] font-black px-1 rounded-full ${
                          selectedBirthdayMonth === m
                            ? 'bg-white text-pink-700'
                            : 'bg-pink-200 text-pink-900'
                        }`}
                      >
                        {countInMonth}
                      </span>
                    )}
                    {isCurMonth && selectedBirthdayMonth !== m && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar (Active Posts View) */}
      {activeViewTab !== 'trash' && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold text-slate-400 mr-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Chủ đề:
            </span>
            <button
              onClick={() => setTagFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                tagFilter === 'all'
                  ? 'bg-sky-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            {allAvailableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  tagFilter === tag
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm tiêu đề, nội dung..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-400 focus:bg-white transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="likes">Nhiều tim</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Trash View Header Notice */}
      {activeViewTab === 'trash' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-800 font-bold">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            <span>
              Thùng rác chứa các bài viết đã xóa mềm. Bạn có thể khôi phục lại bảng tin hoặc xóa vĩnh viễn.
            </span>
          </div>
          <button
            onClick={() => setActiveViewTab('all')}
            className="text-xs font-extrabold text-sky-700 hover:underline"
          >
            ← Về bảng tin
          </button>
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {displayedPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-sky-100 shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-8 h-8 text-sky-300" />
            </div>
            <h4 className="text-sm font-black text-slate-700 mb-1">
              {activeViewTab === 'trash'
                ? 'Thùng rác hiện đang trống'
                : 'Chưa có bài viết nào phù hợp bộ lọc'}
            </h4>
            <p className="text-xs text-slate-400 mb-4 font-semibold">
              {activeViewTab === 'trash'
                ? 'Không có bài đăng nào bị xóa'
                : 'Hãy đăng bài viết đầu tiên để chia sẻ niềm vui cùng cả lớp!'}
            </p>
            {isTeacher && activeViewTab !== 'trash' && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Đăng bài mới ngay</span>
              </button>
            )}
          </div>
        ) : (
          displayedPosts.map((item) => {
            const isPinned = Boolean(item.pinned || item.isPinned);
            const isMenuOpen = openMenuPostId === item.id;
            const currentLikes = (item.likes || 0) + (localLikes[item.id] || 0);
            const isBirthdayPost =
              item.tags?.some((t) => t.toLowerCase().includes('sinh nhật')) ||
              item.title?.toLowerCase().includes('sinh nhật');

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl p-5 border transition-all duration-200 hover:shadow-md relative ${
                  isBirthdayPost
                    ? 'border-pink-300 ring-2 ring-pink-200/70 bg-gradient-to-br from-pink-50/60 via-white to-amber-50/40 shadow-xs'
                    : isPinned
                    ? 'border-amber-300 ring-2 ring-amber-200/70 bg-gradient-to-b from-amber-50/30 to-white shadow-xs'
                    : 'border-slate-200 shadow-2xs'
                }`}
              >
                {/* Header Row: Title, Badges, Date, and 3-Dot Management Menu */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {/* Birthday Post Badge */}
                      {isBirthdayPost && (
                        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[11.5px] font-black flex items-center gap-1 shrink-0 shadow-2xs">
                          <Cake className="w-3.5 h-3.5 text-yellow-300" />
                          <span>Bản tin sinh nhật / Birthday Bulletin</span>
                        </span>
                      )}

                      {/* Pinned Badge */}
                      {isPinned && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[11.5px] font-black flex items-center gap-1 shrink-0 shadow-2xs">
                          <Pin className="w-3.5 h-3.5 fill-amber-950" />
                          <span>Đã ghim / Pinned</span>
                        </span>
                      )}

                      {/* Edited Badge */}
                      {(item.isEdited || item.updatedAt) && (
                        <span
                          className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center gap-1"
                          title={`Chỉnh sửa lần cuối bởi ${item.updatedBy || 'giáo viên'} lúc ${item.updatedAt || ''}`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>Đã sửa / Edited</span>
                        </span>
                      )}

                      {/* Visibility Badge if restricted */}
                      {item.visibility === 'teachers' && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-black">
                          Chỉ giáo viên / Teachers Only
                        </span>
                      )}

                      <span className="text-[12px] font-bold text-slate-600 flex items-center gap-1 ml-auto sm:ml-0">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.date}</span>
                      </span>
                    </div>

                    <h3 className="text-[17px] sm:text-[18.5px] font-black text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  {/* 3-Dot Menu Button (⋯) & Quick Action Controls for Teacher */}
                  {isTeacher && (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {/* Direct Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition shadow-2xs cursor-pointer"
                        title="Chỉnh sửa bài đăng / Edit Post"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                        <div className="hidden sm:flex flex-col items-start leading-tight">
                          <span className="text-[12px] font-black">Sửa</span>
                          <span className="text-[10px] font-bold text-sky-600">Edit</span>
                        </div>
                      </button>

                      {/* Direct Pin Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePin(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition shadow-2xs cursor-pointer ${
                          isPinned
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                        }`}
                        title={isPinned ? 'Bỏ ghim / Unpin' : 'Ghim bài / Pin'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-600 text-amber-600' : 'text-slate-500'}`} />
                        <div className="hidden sm:flex flex-col items-start leading-tight">
                          <span className="text-[12px] font-black">{isPinned ? 'Bỏ ghim' : 'Ghim'}</span>
                          <span className="text-[10px] font-bold opacity-85">{isPinned ? 'Unpin' : 'Pin'}</span>
                        </div>
                      </button>

                      {/* 3-Dot (⋯) Management Menu Button */}
                      <div className="relative post-menu-container">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuPostId(isMenuOpen ? null : item.id);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black transition cursor-pointer shadow-xs ${
                            isMenuOpen
                              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                              : 'bg-pink-50 hover:bg-pink-100 text-[#1E3A8A] hover:text-pink-900 border-pink-200'
                          }`}
                          title="Menu quản lý bài đăng: Sửa, Ghim, Xóa"
                        >
                          <MoreHorizontal className="w-4 h-4 stroke-[3]" />
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-[12px] font-black">Quản lý ⋯</span>
                            <span className="text-[10px] font-bold opacity-85">Manage</span>
                          </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-2xl border-2 border-sky-100 p-2 z-40 animate-scale-in">
                            <div className="px-3 py-1 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                              Quản lý bài đăng (⋯)
                            </div>
                            {activeViewTab !== 'trash' ? (
                              <>
                                {/* Edit Post */}
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-800 transition cursor-pointer text-left"
                                >
                                  <Edit3 className="w-4 h-4 text-sky-600" />
                                  <span>Chỉnh sửa bài đăng – Edit</span>
                                </button>

                                {/* Toggle Pin */}
                                <button
                                  type="button"
                                  onClick={() => handleTogglePin(item)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition cursor-pointer text-left"
                                >
                                  <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                                  <span>{isPinned ? 'Bỏ ghim bài đăng' : 'Ghim lên đầu bảng tin'}</span>
                                </button>

                                <div className="h-[1px] bg-slate-100 my-1" />

                                {/* Soft Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPostId(null);
                                    setDeletingItem({ item, permanent: false });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500" />
                                  <span>Xóa bài đăng (Vào thùng rác)</span>
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Restore from trash */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPostId(null);
                                    handleRestore(item);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer text-left"
                                >
                                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                                  <span>Khôi phục bài đăng</span>
                                </button>

                                {/* Permanent Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuPostId(null);
                                    setDeletingItem({ item, permanent: true });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500" />
                                  <span>Xóa vĩnh viễn</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Body */}
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed mb-3.5 whitespace-pre-line">
                  {item.content}
                </p>

                {/* Attached Images Grid */}
                {((item.images && item.images.length > 0) || item.imageUrl) && (
                  <div className="mb-3.5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {(item.images || (item.imageUrl ? [item.imageUrl] : [])).map((imgUrl, imgIdx) => (
                        <div
                          key={imgIdx}
                          onClick={() => setPreviewImageModal(imgUrl)}
                          className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer shadow-2xs"
                        >
                          <img
                            src={imgUrl}
                            alt={`Đính kèm ${imgIdx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-5 h-5 drop-shadow" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached Video Embed or Link */}
                {item.videoUrl && (
                  <div className="mb-3.5 p-3 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-800 truncate">Video đính kèm bài học</div>
                        <div className="text-[10px] text-slate-500 truncate">{item.videoUrl}</div>
                      </div>
                    </div>
                    <a
                      href={item.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem video</span>
                    </a>
                  </div>
                )}

                {/* Attached Documents / Files */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="mb-3.5 space-y-1.5">
                    <div className="text-[11px] font-extrabold text-slate-400 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> Tệp đính kèm ({item.attachments.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.attachments.map((att, aIdx) => (
                        <a
                          key={aIdx}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-800 text-xs font-bold flex items-center gap-2 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-600" />
                          <span>{att.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Footer: Author, Tags & Like Button */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">
                      Đăng bởi <b className="text-[#263C72]">{item.author || currentTeacherName}</b>
                    </span>
                    {(item.tags || []).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {activeViewTab === 'trash' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestore(item)}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-emerald-200"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Khôi phục</span>
                        </button>
                        <button
                          onClick={() => setDeletingItem({ item, permanent: true })}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center gap-1 border border-rose-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa hẳn</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isBirthdayPost && (
                          <button
                            type="button"
                            onClick={() => {
                              playStarSound('click');
                              triggerGrandCelebration();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-white font-black text-xs transition cursor-pointer shadow-xs active:scale-95"
                            title="Bắn pháo hoa chúc mừng sinh nhật!"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                            <span>Chúc mừng 🎉</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleLike(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-black transition cursor-pointer shadow-2xs"
                        >
                          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                          <span>{currentLikes}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE POST MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-4 border-[#BAE6FD] relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-sky-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-['Fredoka',sans-serif] text-xl font-bold text-[#1E3A8A]">
                    Đăng thông báo mới lên bảng tin
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Chia sẻ bài tập, hoạt động STEM và chúc mừng các bạn nhỏ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề bài đăng <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Hoạt động chế tạo kính vạn hoa thứ Sáu..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-400 focus:bg-white rounded-xl text-sm font-semibold outline-none"
                />
              </div>

              {/* Author & Visibility & Pin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tác giả:</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quyền xem:</label>
                  <select
                    value={formVisibility}
                    onChange={(e) => setFormVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="all">Công khai cả lớp</option>
                    <option value="students">Học sinh & Phụ huynh</option>
                    <option value="teachers">Chỉ giáo viên</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formPinned}
                      onChange={(e) => setFormPinned(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded accent-amber-500 cursor-pointer"
                    />
                    <span>Ghim lên đầu bảng tin ⭐</span>
                  </label>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung chi tiết <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  required
                  rows={5}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Nhập nội dung thông báo hoặc hoạt động lớp..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-sky-400 focus:bg-white rounded-xl text-xs font-medium outline-none leading-relaxed"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chủ đề / Nhãn tags:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pink-100 text-pink-800 text-xs font-bold"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-pink-950"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Thêm nhãn (VD: STEM, Thi đua, Nhắc nhở)..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newTagInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(newTagInput)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    + Thêm nhãn
                  </button>
                </div>
              </div>

              {/* Images Manager */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-sky-600" />
                  <span>Hình ảnh đính kèm ({formImages.length}):</span>
                </label>
                {formImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                    {formImages.map((img, iIdx) => (
                      <div key={iIdx} className="relative aspect-video rounded-xl overflow-hidden border bg-slate-100">
                        <img src={img} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(iIdx)}
                          className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Nhập đường dẫn URL ảnh..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl text-xs font-bold"
                  >
                    + Thêm URL
                  </button>
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer text-center">
                    <span>Chọn ảnh từ máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageFileUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-500" />
                  <span>Đường dẫn Video (YouTube, MP4, Drive):</span>
                </label>
                <input
                  type="text"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span>Tệp đính kèm ({formAttachments.length}):</span>
                </label>
                {formAttachments.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {formAttachments.map((att, aIdx) => (
                      <div
                        key={aIdx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-sky-600" />
                          <span className="font-bold truncate">{att.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(aIdx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={attachmentNameInput}
                    onChange={(e) => setAttachmentNameInput(e.target.value)}
                    placeholder="Tên tài liệu..."
                    className="sm:col-span-5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={attachmentUrlInput}
                    onChange={(e) => setAttachmentUrlInput(e.target.value)}
                    placeholder="Đường dẫn file (Drive / link)..."
                    className="sm:col-span-5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="sm:col-span-2 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl text-xs font-bold"
                  >
                    + Thêm tệp
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-sky-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? 'Đang đăng...' : 'Đăng bài viết'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT POST MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-4 border-[#BAE6FD] relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-sky-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#1E3A8A] flex items-center justify-center shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-['Fredoka',sans-serif] text-xl font-bold text-[#1E3A8A]">
                    Chỉnh sửa bài đăng – Edit Post
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Cập nhật tiêu đề, nội dung, ảnh đính kèm và trạng thái ghim
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề bài đăng <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-400 focus:bg-white rounded-xl text-sm font-semibold outline-none"
                />
              </div>

              {/* Author & Visibility & Pin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tác giả:</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quyền xem:</label>
                  <select
                    value={formVisibility}
                    onChange={(e) => setFormVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="all">Công khai cả lớp</option>
                    <option value="students">Học sinh & Phụ huynh</option>
                    <option value="teachers">Chỉ giáo viên</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formPinned}
                      onChange={(e) => setFormPinned(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded accent-amber-500 cursor-pointer"
                    />
                    <span>Ghim lên đầu bảng tin ⭐</span>
                  </label>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung chi tiết <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  required
                  rows={5}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-sky-400 focus:bg-white rounded-xl text-xs font-medium outline-none leading-relaxed"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chủ đề / Nhãn tags:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-100 text-sky-800 text-xs font-bold"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-sky-950"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Thêm nhãn mới..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newTagInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(newTagInput)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    + Thêm nhãn
                  </button>
                </div>
              </div>

              {/* Images Manager */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-sky-600" />
                  <span>Hình ảnh đính kèm ({formImages.length}):</span>
                </label>
                {formImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                    {formImages.map((img, iIdx) => (
                      <div key={iIdx} className="relative aspect-video rounded-xl overflow-hidden border bg-slate-100">
                        <img src={img} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(iIdx)}
                          className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Nhập đường dẫn URL ảnh mới..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl text-xs font-bold"
                  >
                    + Thêm URL
                  </button>
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer text-center">
                    <span>Tải ảnh từ máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageFileUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-500" />
                  <span>Đường dẫn Video:</span>
                </label>
                <input
                  type="text"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span>Tệp đính kèm ({formAttachments.length}):</span>
                </label>
                {formAttachments.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {formAttachments.map((att, aIdx) => (
                      <div
                        key={aIdx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-sky-600" />
                          <span className="font-bold truncate">{att.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(aIdx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={attachmentNameInput}
                    onChange={(e) => setAttachmentNameInput(e.target.value)}
                    placeholder="Tên tài liệu..."
                    className="sm:col-span-5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={attachmentUrlInput}
                    onChange={(e) => setAttachmentUrlInput(e.target.value)}
                    placeholder="Đường dẫn file (Drive / link)..."
                    className="sm:col-span-5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="sm:col-span-2 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl text-xs font-bold"
                  >
                    + Thêm tệp
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-sky-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-4 border-rose-200 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="font-['Fredoka',sans-serif] text-lg font-bold text-slate-900 mb-1">
              {deletingItem.permanent
                ? 'Xóa vĩnh viễn bài đăng?'
                : 'Bạn có chắc chắn muốn xóa bài đăng này không?'}
            </h3>

            <p className="text-xs text-slate-600 mb-4 font-semibold px-2">
              "{deletingItem.item.title}"
            </p>

            <p className="text-[11px] text-slate-400 mb-6 font-medium">
              {deletingItem.permanent
                ? 'Cảnh báo: Hành động này sẽ xóa vĩnh viễn dữ liệu bài viết khỏi cơ sở dữ liệu và không thể khôi phục.'
                : 'Bài đăng sẽ được chuyển vào Thùng rác. Bạn có thể khôi phục lại bất cứ lúc nào trong mục "Thùng rác".'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{submitting ? 'Đang xóa...' : deletingItem.permanent ? 'Xóa vĩnh viễn' : 'Xóa bài đăng'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL IMAGE LIGHTBOX MODAL */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2 bg-white rounded-3xl shadow-2xl">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageModal}
              alt="Ảnh phóng to"
              className="max-h-[82vh] w-auto rounded-2xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
