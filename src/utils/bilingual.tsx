import React from 'react';

export interface BilingualPair {
  vi: string;
  en: string;
}

export type BilingualVariant =
  | 'hero'
  | 'section'
  | 'cardTitle'
  | 'menu'
  | 'button'
  | 'label'
  | 'body'
  | 'modalTitle'
  | 'caption'
  | 'badge';

interface BilingualTextProps {
  vi: React.ReactNode;
  en: React.ReactNode;
  variant?: BilingualVariant;
  align?: 'left' | 'center' | 'right';
  className?: string;
  viClassName?: string;
  enClassName?: string;
  truncate?: boolean;
}

const VARIANT_CLASSES: Record<BilingualVariant, { vi: string; en: string; gap: string }> = {
  hero: {
    vi: 'typo-title-main font-black leading-tight',
    en: 'text-sm sm:text-base font-bold leading-snug',
    gap: 'gap-1',
  },
  section: {
    vi: 'typo-title-section font-black leading-snug',
    en: 'text-xs sm:text-sm font-bold leading-snug',
    gap: 'gap-0.5',
  },
  cardTitle: {
    vi: 'text-base sm:text-[17px] font-black leading-snug',
    en: 'text-xs sm:text-[13px] font-bold leading-tight',
    gap: 'gap-0.5',
  },
  menu: {
    vi: 'bi-vi block',
    en: 'bi-en block',
    gap: 'gap-0.5',
  },
  button: {
    vi: 'text-[14px] sm:text-[15px] font-black leading-tight block',
    en: 'text-[11.5px] sm:text-[12.5px] font-bold leading-tight block opacity-90',
    gap: 'gap-0.5',
  },
  label: {
    vi: 'text-[14.5px] sm:text-[15.5px] font-extrabold leading-snug block text-slate-800',
    en: 'text-[12px] sm:text-[13px] font-bold leading-tight block text-slate-600',
    gap: 'gap-0.5',
  },
  body: {
    vi: 'bi-body-vi block',
    en: 'bi-body-en block',
    gap: 'gap-0.5',
  },
  modalTitle: {
    vi: 'bi-modal-vi block',
    en: 'bi-modal-en block',
    gap: 'gap-0.5',
  },
  caption: {
    vi: 'text-[13.5px] font-bold leading-tight block',
    en: 'text-[12px] font-semibold leading-tight block opacity-85',
    gap: 'gap-0.5',
  },
  badge: {
    vi: 'text-[12.5px] font-black leading-tight block',
    en: 'text-[11px] font-bold leading-tight block opacity-90',
    gap: 'gap-0',
  },
};

/**
 * Standard 2-line Bilingual Component:
 * Always renders Vietnamese on top (larger, bolder) and English directly below (clear & readable).
 */
export const BilingualText: React.FC<BilingualTextProps> = ({
  vi,
  en,
  variant = 'body',
  align = 'left',
  className = '',
  viClassName = '',
  enClassName = '',
  truncate = false,
}) => {
  const styles = VARIANT_CLASSES[variant];
  const alignClass =
    align === 'center'
      ? 'items-center text-center'
      : align === 'right'
      ? 'items-end text-right'
      : 'items-start text-left';
  const truncClass = truncate ? 'truncate w-full' : '';

  return (
    <span className={`inline-flex flex-col min-w-0 ${styles.gap} ${alignClass} ${className}`}>
      <span className={`${styles.vi} ${truncClass} ${viClassName}`}>{vi}</span>
      <span className={`${styles.en} ${truncClass} ${enClassName}`}>{en}</span>
    </span>
  );
};

// ================= CENTRALIZED BILINGUAL DICTIONARY =================

export const REWARD_REASONS_BILINGUAL: BilingualPair[] = [
  { vi: 'Hăng hái phát biểu', en: 'Active Participation in Class' },
  { vi: 'Làm bài tập xuất sắc', en: 'Excellent Homework Completion' },
  { vi: 'Giúp đỡ bạn bè', en: 'Helping Classmates Kindheartedly' },
  { vi: 'Giữ gìn vệ sinh lớp', en: 'Keeping the Classroom Clean' },
  { vi: 'Nói tiếng Anh tự tin', en: 'Speaking English Confidently' },
  { vi: 'Tiến bộ vượt bậc', en: 'Outstanding Academic Progress' },
  { vi: 'Tập trung lắng nghe', en: 'Attentive & Focused Listening' },
  { vi: 'Sáng tạo trong học tập', en: 'Creative Thinking in Learning' },
];

export const DEDUCT_REASONS_BILINGUAL: BilingualPair[] = [
  { vi: 'Điều chỉnh do chấm nhầm', en: 'Score Adjustment / Correction' },
  { vi: 'Chưa hoàn thành bài tập về nhà', en: 'Incomplete Homework Assignment' },
  { vi: 'Nói chuyện riêng trong giờ học', en: 'Talking During Lesson Time' },
  { vi: 'Chưa giữ trật tự khi xếp hàng', en: 'Not Keeping Order in Line' },
];

export function getStarReasonBilingual(reasonVi: string): BilingualPair {
  const clean = (reasonVi || '').trim();
  const foundReward = REWARD_REASONS_BILINGUAL.find(
    (r) => clean.toLowerCase().includes(r.vi.toLowerCase())
  );
  if (foundReward) return foundReward;

  const foundDeduct = DEDUCT_REASONS_BILINGUAL.find(
    (r) => clean.toLowerCase().includes(r.vi.toLowerCase())
  );
  if (foundDeduct) return foundDeduct;

  if (clean.toLowerCase().includes('sinh nhật')) {
    return { vi: clean, en: 'Birthday Star Gift (+10 Stars)' };
  }
  if (clean.toLowerCase().includes('thưởng nhanh') || clean.toLowerCase().includes('tập thể')) {
    return { vi: clean, en: 'Quick Star Reward' };
  }
  if (clean.toLowerCase().includes('phát biểu')) {
    return { vi: clean, en: 'Active Class Participation' };
  }
  return { vi: clean || 'Khen thưởng sao', en: 'Star Achievement / Adjustment' };
}

export const LEVEL_TITLES_BILINGUAL: Record<number, BilingualPair> = {
  1: { vi: 'Hiệp Sĩ Đồng', en: 'Bronze Knight' },
  2: { vi: 'Hiệp Sĩ Bạc', en: 'Silver Knight' },
  3: { vi: 'Hiệp Sĩ Vàng', en: 'Gold Knight' },
  4: { vi: 'Tinh Tú Bạc', en: 'Silver Star' },
  5: { vi: 'Tinh Tú Vàng', en: 'Golden Star' },
};

export const CERTIFICATE_HONORS_BILINGUAL: Array<{ value: string; vi: string; en: string }> = [
  {
    value: 'Ngôi sao xuất sắc tuần – Tinh tú tỏa sáng',
    vi: 'Ngôi sao xuất sắc tuần – Tinh tú tỏa sáng',
    en: 'Star of the Week – Shining Bright Star',
  },
  {
    value: 'Học sinh tiến bộ vượt bậc tuần này',
    vi: 'Học sinh tiến bộ vượt bậc tuần này',
    en: 'Most Improved Student of the Week',
  },
  {
    value: 'Chiến binh chăm chỉ – Chăm ngoan học giỏi',
    vi: 'Chiến binh chăm chỉ – Chăm ngoan học giỏi',
    en: 'Diligent Learner – Hardworking & Polite',
  },
  {
    value: 'Quán quân vương quốc sao – Star Champion',
    vi: 'Quán quân vương quốc sao – Star Champion',
    en: 'Star Kingdom Champion – Top Achiever',
  },
  {
    value: 'Thủ lĩnh gương mẫu – Tinh thần đồng đội',
    vi: 'Thủ lĩnh gương mẫu – Tinh thần đồng đội',
    en: 'Role Model Leader – Great Team Spirit',
  },
  {
    value: 'Vua sáng tạo – Khám phá tri thức mới',
    vi: 'Vua sáng tạo – Khám phá tri thức mới',
    en: 'Creative Explorer – Discovering New Knowledge',
  },
];

export const BILINGUAL_DICT = {
  brand: {
    schoolDefaultVi: 'Trường Tiểu học và THCS Thư Lâm',
    schoolDefaultEn: 'THU LAM PRIMARY & LOWER SECONDARY SCHOOL',
    kingdomVi: 'Vương quốc ngôi sao',
    kingdomEn: "Ms. Thao's Star Kingdom",
    sloganVi: 'Mỗi ngày vui học – Mỗi ngày tỏa sáng!',
    sloganEn: 'Learn Happy, Shine Bright Every Day!',
  },
  nav: {
    home: { vi: 'Trang chủ', en: 'Home' },
    news: { vi: 'Bảng tin lớp', en: 'Class News' },
    teams: { vi: 'Lớp và tổ', en: 'Class & Teams' },
    students: { vi: 'Hồ sơ măng non', en: 'Little Learners' },
    rewards: { vi: 'Thưởng sao', en: 'Star Rewards' },
    halloffame: { vi: 'Vinh danh', en: 'Hall of Fame' },
    tools: { vi: 'Bộ công cụ', en: 'Classroom Tools' },
    library: { vi: 'Kho học liệu', en: 'Learning Library' },
    settings: { vi: 'Cài đặt & Sao lưu', en: 'Settings & Backup' },
  },
  commonActions: {
    save: { vi: 'Lưu thay đổi', en: 'Save Changes' },
    cancel: { vi: 'Hủy bỏ', en: 'Cancel' },
    close: { vi: 'Đóng lại', en: 'Close' },
    confirm: { vi: 'Xác nhận', en: 'Confirm' },
    edit: { vi: 'Chỉnh sửa', en: 'Edit' },
    delete: { vi: 'Xóa', en: 'Delete' },
    restore: { vi: 'Khôi phục', en: 'Restore' },
    undo: { vi: 'Hoàn tác', en: 'Undo' },
    viewAll: { vi: 'Xem tất cả', en: 'View All' },
    viewDetails: { vi: 'Xem chi tiết', en: 'View Details' },
    exportExcel: { vi: 'Xuất file Excel', en: 'Export Excel (.xlsx)' },
    importExcel: { vi: 'Nhập từ Excel', en: 'Import Excel' },
    printPdf: { vi: 'In báo cáo / PDF', en: 'Print Report / PDF' },
  },
} as const;
