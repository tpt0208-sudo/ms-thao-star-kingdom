import { AcademicCalendarConfig, RankingPeriod, StarTransaction, Student, Team } from '../types';

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7 (Asia/Ho_Chi_Minh has no DST)
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_ACADEMIC_CONFIG: AcademicCalendarConfig = {
  schoolYear: '2026 - 2027',
  startDate: '2026-09-07',      // Thứ Hai Tuần 1: 07/09/2026
  week1StartDate: '2026-09-07', // Đồng bộ với startDate
  endDate: '2027-05-31',        // Kết thúc năm học (Tuần 36 kết thúc 16/05/2027)
  totalWeeks: 36,               // Tổng 36 tuần thực học
  semester1Start: '2026-09-07', // Học kỳ 1 bắt đầu
  semester1End: '2027-01-15',   // Học kỳ 1 kết thúc
  semester2Start: '2027-01-16', // Học kỳ 2 bắt đầu
  semester2End: '2027-05-31',   // Học kỳ 2 kết thúc
  holidayWeeks: [],
  scheduleNotes: 'Lịch chuẩn 36 tuần năm học 2026–2027 (Tuần 1: 07/09/2026 – 13/09/2026, Tuần 36: 10/05/2027 – 16/05/2027)',
};

export interface PeriodOption {
  id: RankingPeriod;
  labelVi: string;
  labelEn: string;
  icon: string;
  color: string;
  bgActive: string;
}

export interface SchoolWeekOption {
  weekNumber: number;
  start: Date;
  end: Date;
  startIso: string; // YYYY-MM-DD in Asia/Ho_Chi_Minh
  endIso: string;   // YYYY-MM-DD in Asia/Ho_Chi_Minh
  startFormatted: string; // DD/MM/YYYY
  endFormatted: string;   // DD/MM/YYYY
  labelVi: string;
  labelEn: string;
  isCurrent: boolean;
  isHoliday?: boolean;
}

export interface AcademicWeekStatusInfo {
  rawWeekNumber: number;       // Có thể < 1 hoặc > totalWeeks (ví dụ 37 vào ngày 17/05/2027)
  weekNumber: number;          // Luôn giới hạn trong [1..totalWeeks] (không bao giờ tạo Tuần 37)
  totalWeeks: number;          // Mặc định 36
  isWithinSchoolWeeks: boolean;// true nếu 1 <= rawWeekNumber <= totalWeeks
  isOutOfRange: boolean;       // true nếu ngoài phạm vi 1..totalWeeks
  status: 'before_school_year' | 'in_progress' | 'after_school_year';
  statusLabelVi: string;
  statusLabelEn: string;
  currentWeekRange: {
    start: Date;
    end: Date;
    labelVi: string;
    labelEn: string;
  };
}

export interface AcademicMonthOption {
  key: string; // '2026-09', '2026-10', ..., '2027-05'
  monthKey: string; // Alias for backward compatibility
  month: number; // 9, 10, 11, 12, 1, 2, 3, 4, 5
  year: number;
  labelVi: string;
  labelEn: string;
  shortVi: string;
  semester: 1 | 2;
  isCurrent?: boolean;
}

export const ACADEMIC_MONTHS_2026_2027: AcademicMonthOption[] = [
  { key: '2026-09', monthKey: '2026-09', month: 9, year: 2026, labelVi: 'Tháng 9/2026', labelEn: 'September 2026', shortVi: 'Tháng 9', semester: 1 },
  { key: '2026-10', monthKey: '2026-10', month: 10, year: 2026, labelVi: 'Tháng 10/2026', labelEn: 'October 2026', shortVi: 'Tháng 10', semester: 1 },
  { key: '2026-11', monthKey: '2026-11', month: 11, year: 2026, labelVi: 'Tháng 11/2026', labelEn: 'November 2026', shortVi: 'Tháng 11', semester: 1 },
  { key: '2026-12', monthKey: '2026-12', month: 12, year: 2026, labelVi: 'Tháng 12/2026', labelEn: 'December 2026', shortVi: 'Tháng 12', semester: 1 },
  { key: '2027-01', monthKey: '2027-01', month: 1, year: 2027, labelVi: 'Tháng 1/2027', labelEn: 'January 2027', shortVi: 'Tháng 1', semester: 1 },
  { key: '2027-02', monthKey: '2027-02', month: 2, year: 2027, labelVi: 'Tháng 2/2027', labelEn: 'February 2027', shortVi: 'Tháng 2', semester: 2 },
  { key: '2027-03', monthKey: '2027-03', month: 3, year: 2027, labelVi: 'Tháng 3/2027', labelEn: 'March 2027', shortVi: 'Tháng 3', semester: 2 },
  { key: '2027-04', monthKey: '2027-04', month: 4, year: 2027, labelVi: 'Tháng 4/2027', labelEn: 'April 2027', shortVi: 'Tháng 4', semester: 2 },
  { key: '2027-05', monthKey: '2027-05', month: 5, year: 2027, labelVi: 'Tháng 5/2027', labelEn: 'May 2027', shortVi: 'Tháng 5', semester: 2 },
];

/**
 * Returns the current Date, supporting an optional mock clock override for automated live-rollover tests
 */
export function getNowVietnamRef(): Date {
  if (typeof window !== 'undefined' && (window as any).__STAR_KINGDOM_MOCK_NOW__) {
    return parseVietnamDate((window as any).__STAR_KINGDOM_MOCK_NOW__);
  }
  return new Date();
}

/**
 * Parses a Date or date string ('YYYY-MM-DD', 'DD/MM/YYYY', or ISO string) into a Date object
 * When a date-only string is provided, it is interpreted at 00:00:00 in Asia/Ho_Chi_Minh (+07:00)
 */
export function parseVietnamDate(input?: Date | string | number): Date {
  if (input === undefined || input === null) {
    return getNowVietnamRef();
  }
  if (input instanceof Date) {
    return new Date(input.getTime());
  }
  if (typeof input === 'number') {
    return new Date(input);
  }
  const str = String(input).trim();
  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00.000+07:00`);
  }
  // DD/MM/YYYY
  const vnMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vnMatch) {
    const dd = vnMatch[1].padStart(2, '0');
    const mm = vnMatch[2].padStart(2, '0');
    const yyyy = vnMatch[3];
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000+07:00`);
  }
  return new Date(str);
}

/**
 * Extracts calendar components strictly in Asia/Ho_Chi_Minh (UTC+7)
 */
export function getVietnamDateParts(input?: Date | string | number): {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  hours: number;
  minutes: number;
  seconds: number;
  isoDate: string; // YYYY-MM-DD
  formattedDate: string; // DD/MM/YYYY
  monthKey: string; // YYYY-MM
} {
  const d = parseVietnamDate(input);
  const vnShifted = new Date(d.getTime() + VN_OFFSET_MS);
  const year = vnShifted.getUTCFullYear();
  const month = vnShifted.getUTCMonth() + 1;
  const day = vnShifted.getUTCDate();
  const dayOfWeek = vnShifted.getUTCDay();
  const hours = vnShifted.getUTCHours();
  const minutes = vnShifted.getUTCMinutes();
  const seconds = vnShifted.getUTCSeconds();
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  return {
    year,
    month,
    day,
    dayOfWeek,
    hours,
    minutes,
    seconds,
    isoDate: `${year}-${mm}-${dd}`,
    formattedDate: `${dd}/${mm}/${year}`,
    monthKey: `${year}-${mm}`,
  };
}

/**
 * Creates a Date representing a specific wall-clock time in Asia/Ho_Chi_Minh (+07:00)
 */
export function createVietnamDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0
): Date {
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds, ms) - VN_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Returns the Monday 00:00:00.000 (in Asia/Ho_Chi_Minh) of the week containing `input`
 */
export function getMondayOfWeekVietnam(input?: Date | string | number): Date {
  const parts = getVietnamDateParts(input);
  // Monday is 1, Sunday is 0 -> offset back to Monday
  const daysFromMonday = parts.dayOfWeek === 0 ? 6 : parts.dayOfWeek - 1;
  const mondayUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day - daysFromMonday, 0, 0, 0, 0) - VN_OFFSET_MS;
  return new Date(mondayUtcMs);
}

/**
 * Formats a Date as DD/MM/YYYY in Asia/Ho_Chi_Minh
 */
export function formatDateVi(input: Date | string, includeYear = true): string {
  const parts = getVietnamDateParts(input);
  const dd = String(parts.day).padStart(2, '0');
  const mm = String(parts.month).padStart(2, '0');
  return includeYear ? `${dd}/${mm}/${parts.year}` : `${dd}/${mm}`;
}

/**
 * Builds the Academic Months list dynamically for the configured schoolYear (default 2026-2027: Sep to May)
 */
export function getAcademicMonthsForConfig(
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG,
  referenceDate?: Date | string
): AcademicMonthOption[] {
  const startParts = getVietnamDateParts(config.week1StartDate || config.startDate || DEFAULT_ACADEMIC_CONFIG.startDate);
  const actualNowKey = getVietnamDateParts(referenceDate).monthKey;
  const startYear = startParts.year || 2026;
  const endYear = startYear + 1;
  const monthNamesEn: Record<number, string> = {
    9: 'September',
    10: 'October',
    11: 'November',
    12: 'December',
    1: 'January',
    2: 'February',
    3: 'March',
    4: 'April',
    5: 'May',
  };
  return [9, 10, 11, 12, 1, 2, 3, 4, 5].map((m, idx) => {
    const y = m >= 9 ? startYear : endYear;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    return {
      key,
      monthKey: key,
      month: m,
      year: y,
      labelVi: `Tháng ${m}/${y}`,
      labelEn: `${monthNamesEn[m]} ${y}`,
      shortVi: `Tháng ${m}`,
      semester: idx < 5 ? 1 : 2,
      isCurrent: key === actualNowKey,
    };
  });
}

/**
 * Returns the exact calendar month key ('YYYY-MM') in Asia/Ho_Chi_Minh for a given date.
 * If the date falls within the academic months (Sep..May), returns that month key;
 * otherwise clamps safely to the nearest academic month while getActualVietnamMonthKey returns the raw key.
 */
export function getActualVietnamMonthKey(date?: Date | string): string {
  return getVietnamDateParts(date).monthKey;
}

export function getCurrentAcademicMonthKey(
  date?: Date | string,
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG
): string {
  const parts = getVietnamDateParts(date);
  const key = parts.monthKey;
  const months = getAcademicMonthsForConfig(config);
  const found = months.find((m) => m.key === key);
  if (found) return found.key;

  // Fallback by month number (9..12 or 1..5)
  const byMonth = months.find((m) => m.month === parts.month);
  if (byMonth) return byMonth.key;

  // Outside Sep–May (e.g. June–August): clamp to May if after school year, or September if before
  if (parts.month >= 6 && parts.month <= 8) {
    return months[months.length - 1].key;
  }
  return months[0].key;
}

/**
 * Computes the start (Monday 00:00:00.000+07:00) and end (Sunday 23:59:59.999+07:00) of Academic Week N
 */
export function getWeekRangeByNumber(
  weekNum: number,
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG
): {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
  startFormatted: string;
  endFormatted: string;
  labelVi: string;
  labelEn: string;
} {
  const totalWeeks = Math.max(1, config.totalWeeks || 36);
  const safeWeek = Math.max(1, Math.min(totalWeeks, weekNum));
  const week1Monday = getMondayOfWeekVietnam(config.week1StartDate || config.startDate || DEFAULT_ACADEMIC_CONFIG.startDate);

  const start = new Date(week1Monday.getTime() + (safeWeek - 1) * 7 * MS_PER_DAY);
  const end = new Date(start.getTime() + 7 * MS_PER_DAY - 1); // Sunday 23:59:59.999+07:00

  const startParts = getVietnamDateParts(start);
  const endParts = getVietnamDateParts(end);

  const sShort = `${String(startParts.day).padStart(2, '0')}/${String(startParts.month).padStart(2, '0')}`;
  const eShort = `${String(endParts.day).padStart(2, '0')}/${String(endParts.month).padStart(2, '0')}`;

  return {
    start,
    end,
    startIso: startParts.isoDate,
    endIso: endParts.isoDate,
    startFormatted: startParts.formattedDate,
    endFormatted: endParts.formattedDate,
    labelVi: `Tuần ${safeWeek} (${startParts.formattedDate} – ${endParts.formattedDate})`,
    labelEn: `Week ${safeWeek} (${sShort} - ${eShort})`,
  };
}

/**
 * Returns full academic week status for any reference date in Asia/Ho_Chi_Minh,
 * including whether the date is within the configured 36 weeks or outside (e.g. 17/05/2027).
 */
export function getAcademicWeekInfo(
  date?: Date | string,
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG
): AcademicWeekStatusInfo {
  const totalWeeks = Math.max(1, config.totalWeeks || 36);
  const week1Monday = getMondayOfWeekVietnam(config.week1StartDate || config.startDate || DEFAULT_ACADEMIC_CONFIG.startDate);
  const targetMonday = getMondayOfWeekVietnam(date);

  const diffDays = Math.round((targetMonday.getTime() - week1Monday.getTime()) / MS_PER_DAY);
  const rawWeekNumber = Math.floor(diffDays / 7) + 1;

  if (rawWeekNumber < 1) {
    const range = getWeekRangeByNumber(1, config);
    return {
      rawWeekNumber,
      weekNumber: 1,
      totalWeeks,
      isWithinSchoolWeeks: false,
      isOutOfRange: true,
      status: 'before_school_year',
      statusLabelVi: `Ngoài phạm vi ${totalWeeks} tuần năm học (Chưa bắt đầu Tuần 1)`,
      statusLabelEn: `Outside ${totalWeeks} school weeks (Before Week 1)`,
      currentWeekRange: range,
    };
  }

  if (rawWeekNumber > totalWeeks) {
    const range = getWeekRangeByNumber(totalWeeks, config);
    return {
      rawWeekNumber,
      weekNumber: totalWeeks,
      totalWeeks,
      isWithinSchoolWeeks: false,
      isOutOfRange: true,
      status: 'after_school_year',
      statusLabelVi: `Ngoài phạm vi ${totalWeeks} tuần năm học (Đã kết thúc Tuần ${totalWeeks})`,
      statusLabelEn: `Outside ${totalWeeks} school weeks (Ended after Week ${totalWeeks})`,
      currentWeekRange: range,
    };
  }

  const range = getWeekRangeByNumber(rawWeekNumber, config);
  return {
    rawWeekNumber,
    weekNumber: rawWeekNumber,
    totalWeeks,
    isWithinSchoolWeeks: true,
    isOutOfRange: false,
    status: 'in_progress',
    statusLabelVi: `Đang diễn ra Tuần ${rawWeekNumber}/${totalWeeks}`,
    statusLabelEn: `Week ${rawWeekNumber}/${totalWeeks} in progress`,
    currentWeekRange: range,
  };
}

/**
 * Calculates the clamped academic week number (1..totalWeeks, default 1..36) for a given date.
 * Never returns 37 or < 1.
 */
export function getAcademicWeekNumber(
  date?: Date | string,
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG
): number {
  return getAcademicWeekInfo(date, config).weekNumber;
}

/**
 * Generates the list of school weeks (strictly Week 1 to totalWeeks, default 36) for dropdowns & schedule preview.
 * Never generates Week 37.
 */
export function getAvailableSchoolWeeks(
  maxWeeks?: number,
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG,
  referenceDate?: Date | string
): SchoolWeekOption[] {
  const totalWeeks = Math.max(1, maxWeeks || config.totalWeeks || 36);
  const weekInfo = getAcademicWeekInfo(referenceDate, config);
  const holidays = new Set(config.holidayWeeks || []);
  const weeks: SchoolWeekOption[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const range = getWeekRangeByNumber(w, { ...config, totalWeeks });
    weeks.push({
      weekNumber: w,
      start: range.start,
      end: range.end,
      startIso: range.startIso,
      endIso: range.endIso,
      startFormatted: range.startFormatted,
      endFormatted: range.endFormatted,
      labelVi: range.labelVi,
      labelEn: range.labelEn,
      isCurrent: weekInfo.isWithinSchoolWeeks && w === weekInfo.weekNumber,
      isHoliday: holidays.has(w),
    });
  }
  return weeks;
}

/**
 * Computes the exact start and end Date objects (in Asia/Ho_Chi_Minh) for a given RankingPeriod
 */
export function getPeriodRange(
  period: RankingPeriod,
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG,
  referenceDate?: Date | string,
  customWeekNumber?: number,
  customMonthKey?: string
): { start: Date; end: Date; labelVi: string; labelEn: string; weekNumber?: number; monthKey?: string; isOutOfRange?: boolean; outOfRangeLabelVi?: string } {
  const refDate = parseVietnamDate(referenceDate);

  if (period === 'week') {
    const weekInfo = getAcademicWeekInfo(refDate, config);
    const wNum = customWeekNumber
      ? Math.max(1, Math.min(config.totalWeeks || 36, customWeekNumber))
      : weekInfo.weekNumber;
    const range = getWeekRangeByNumber(wNum, config);
    return {
      start: range.start,
      end: range.end,
      labelVi: range.labelVi,
      labelEn: range.labelEn,
      weekNumber: wNum,
      isOutOfRange: !customWeekNumber && weekInfo.isOutOfRange,
      outOfRangeLabelVi: weekInfo.isOutOfRange ? weekInfo.statusLabelVi : undefined,
    };
  }

  if (period === 'month') {
    const months = getAcademicMonthsForConfig(config);
    const activeKey = customMonthKey || getCurrentAcademicMonthKey(refDate, config);
    const matched = months.find((m) => m.key === activeKey);

    let y: number;
    let m: number;
    if (matched) {
      y = matched.year;
      m = matched.month;
    } else {
      const parts = activeKey.split('-');
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        y = Number(parts[0]);
        m = Number(parts[1]);
      } else {
        const vnParts = getVietnamDateParts(refDate);
        y = vnParts.year;
        m = vnParts.month;
      }
    }

    // First day of month 00:00:00.000+07:00
    const start = createVietnamDate(y, m, 1, 0, 0, 0, 0);
    // Last day of month 23:59:59.999+07:00
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const end = createVietnamDate(y, m, lastDay, 23, 59, 59, 999);

    const monthKey = `${y}-${String(m).padStart(2, '0')}`;
    const labelVi = matched ? matched.labelVi : `Tháng ${m}/${y}`;
    const labelEn = matched ? matched.labelEn : `Month ${m}/${y}`;

    return {
      start,
      end,
      labelVi,
      labelEn,
      monthKey,
    };
  }

  if (period === 'semester1') {
    const sParts = getVietnamDateParts(config.semester1Start || DEFAULT_ACADEMIC_CONFIG.semester1Start);
    const eParts = getVietnamDateParts(config.semester1End || DEFAULT_ACADEMIC_CONFIG.semester1End);
    const start = createVietnamDate(sParts.year, sParts.month, sParts.day, 0, 0, 0, 0);
    const end = createVietnamDate(eParts.year, eParts.month, eParts.day, 23, 59, 59, 999);
    return {
      start,
      end,
      labelVi: `Học kỳ I (${sParts.formattedDate} – ${eParts.formattedDate})`,
      labelEn: `Semester 1 (${sParts.formattedDate} - ${eParts.formattedDate})`,
    };
  }

  if (period === 'semester2') {
    const sParts = getVietnamDateParts(config.semester2Start || DEFAULT_ACADEMIC_CONFIG.semester2Start);
    const eParts = getVietnamDateParts(config.semester2End || DEFAULT_ACADEMIC_CONFIG.semester2End);
    const start = createVietnamDate(sParts.year, sParts.month, sParts.day, 0, 0, 0, 0);
    const end = createVietnamDate(eParts.year, eParts.month, eParts.day, 23, 59, 59, 999);
    return {
      start,
      end,
      labelVi: `Học kỳ II (${sParts.formattedDate} – ${eParts.formattedDate})`,
      labelEn: `Semester 2 (${sParts.formattedDate} - ${eParts.formattedDate})`,
    };
  }

  // Full school year
  const sParts = getVietnamDateParts(config.week1StartDate || config.startDate || DEFAULT_ACADEMIC_CONFIG.startDate);
  const eParts = getVietnamDateParts(config.endDate || DEFAULT_ACADEMIC_CONFIG.endDate);
  const start = createVietnamDate(sParts.year, sParts.month, sParts.day, 0, 0, 0, 0);
  const end = createVietnamDate(eParts.year, eParts.month, eParts.day, 23, 59, 59, 999);
  return {
    start,
    end,
    labelVi: `Năm học ${config.schoolYear} (${sParts.formattedDate} – ${eParts.formattedDate})`,
    labelEn: `School Year ${config.schoolYear}`,
  };
}

/**
 * Dynamic period options (never hardcoding Week 8 or Month 10)
 */
export function getDynamicPeriodOptions(
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG,
  referenceDate?: Date | string
): PeriodOption[] {
  const weekRange = getPeriodRange('week', config, referenceDate);
  const monthRange = getPeriodRange('month', config, referenceDate);
  return [
    {
      id: 'week',
      labelVi: weekRange.labelVi,
      labelEn: weekRange.labelEn,
      icon: '⚡',
      color: 'text-amber-700',
      bgActive: 'bg-amber-400 text-white shadow-xs',
    },
    {
      id: 'month',
      labelVi: monthRange.labelVi,
      labelEn: monthRange.labelEn,
      icon: '📅',
      color: 'text-sky-700',
      bgActive: 'bg-sky-500 text-white shadow-xs',
    },
    {
      id: 'semester1',
      labelVi: 'Học kỳ I',
      labelEn: 'Semester 1',
      icon: '🍁',
      color: 'text-orange-700',
      bgActive: 'bg-orange-500 text-white shadow-xs',
    },
    {
      id: 'semester2',
      labelVi: 'Học kỳ II',
      labelEn: 'Semester 2',
      icon: '🌸',
      color: 'text-emerald-700',
      bgActive: 'bg-emerald-500 text-white shadow-xs',
    },
    {
      id: 'year',
      labelVi: 'Năm học',
      labelEn: 'School Year',
      icon: '👑',
      color: 'text-indigo-700',
      bgActive: 'bg-indigo-600 text-white shadow-xs',
    },
  ];
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  {
    id: 'week',
    labelVi: 'Theo Tuần',
    labelEn: 'Weekly',
    icon: '⚡',
    color: 'text-amber-700',
    bgActive: 'bg-amber-400 text-white shadow-xs',
  },
  {
    id: 'month',
    labelVi: 'Theo Tháng',
    labelEn: 'Monthly',
    icon: '📅',
    color: 'text-sky-700',
    bgActive: 'bg-sky-500 text-white shadow-xs',
  },
  {
    id: 'semester1',
    labelVi: 'Học kỳ I',
    labelEn: 'Semester 1',
    icon: '🍁',
    color: 'text-orange-700',
    bgActive: 'bg-orange-500 text-white shadow-xs',
  },
  {
    id: 'semester2',
    labelVi: 'Học kỳ II',
    labelEn: 'Semester 2',
    icon: '🌸',
    color: 'text-emerald-700',
    bgActive: 'bg-emerald-500 text-white shadow-xs',
  },
  {
    id: 'year',
    labelVi: 'Năm học',
    labelEn: 'School Year',
    icon: '👑',
    color: 'text-indigo-700',
    bgActive: 'bg-indigo-600 text-white shadow-xs',
  },
];

export function isDateInPeriod(
  dateStr: string | Date,
  period: RankingPeriod,
  config?: AcademicCalendarConfig,
  customWeekNumber?: number,
  customMonthKey?: string,
  referenceDate?: Date | string
): boolean {
  if (!dateStr) return false;
  const d = parseVietnamDate(dateStr);
  const { start, end } = getPeriodRange(period, config, referenceDate, customWeekNumber, customMonthKey);
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

export function filterTransactionsByPeriod(
  transactions: StarTransaction[],
  period: RankingPeriod,
  config?: AcademicCalendarConfig,
  customWeekNumber?: number,
  customMonthKey?: string,
  referenceDate?: Date | string
): StarTransaction[] {
  const { start, end } = getPeriodRange(period, config, referenceDate, customWeekNumber, customMonthKey);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return transactions.filter((tx) => {
    if (!tx.timestamp) return false;
    const txMs = parseVietnamDate(tx.timestamp).getTime();
    return txMs >= startMs && txMs <= endMs;
  });
}

/**
 * Calculates a student's real star earnings strictly inside the selected period.
 * - Cross-month weeks (e.g. Week 8: 26/10/2026 - 01/11/2026):
 *   * When filtering by Week 8: includes all transactions from 26/10/2026 to 01/11/2026.
 *   * When filtering by Month 10 (2026-10): strictly includes only transactions in October 2026 (excludes 01/11/2026).
 *   * When filtering by Month 11 (2026-11): strictly includes transactions in November 2026 (includes 01/11/2026).
 */
export function getStudentPeriodStars(
  student: Student,
  transactions: StarTransaction[],
  period: RankingPeriod,
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG,
  customWeekNumber?: number,
  customMonthKey?: string,
  referenceDate?: Date | string
): { earned: number; deducted: number; net: number } {
  const refDate = parseVietnamDate(referenceDate);
  const periodTxs = filterTransactionsByPeriod(
    transactions,
    period,
    config,
    customWeekNumber,
    customMonthKey,
    refDate
  ).filter((tx) => tx.studentId === student.id && tx.deltaStars !== 0 && !tx.id.startsWith('tx_init_'));

  let txEarned = 0;
  let txDeducted = 0;

  for (const tx of periodTxs) {
    if (tx.deltaStars > 0) {
      txEarned += tx.deltaStars;
    } else if (tx.deltaStars < 0) {
      txDeducted += Math.abs(tx.deltaStars);
    }
  }

  // Initial seeded demo baseline in data/db.json belongs to Week 8 (26/10/2026 - 01/11/2026) and Month 10 (2026-10)
  const baseWeek8 =
    (student as any).baseWeeklyStars !== undefined
      ? Number((student as any).baseWeeklyStars)
      : student.id.startsWith('class_2a5_student_') && (student.weeklyStars || 0) >= 8
      ? 8
      : 0;

  const baseMonth10 =
    (student as any).baseMonthlyStars !== undefined
      ? Number((student as any).baseMonthlyStars)
      : student.id.startsWith('class_2a5_student_')
      ? student.monthlyStars || 0
      : 0;

  let baseline = 0;
  if (period === 'week') {
    const weekInfo = getAcademicWeekInfo(refDate, config);
    const targetWeek = customWeekNumber || (weekInfo.isOutOfRange ? 0 : weekInfo.weekNumber);
    if (targetWeek === 8) {
      baseline = baseWeek8;
    }
  } else if (period === 'month') {
    const targetMonthKey = customMonthKey || getCurrentAcademicMonthKey(refDate, config);
    if (targetMonthKey === '2026-10') {
      baseline = baseMonth10;
    }
  } else if (period === 'semester1') {
    baseline = baseMonth10;
  } else if (period === 'semester2') {
    baseline = 0;
  } else if (period === 'year') {
    baseline = baseMonth10 || student.totalEarnedStars || 0;
  }

  const earned = baseline + txEarned;
  const deducted = txDeducted;
  return {
    earned,
    deducted,
    net: Math.max(0, earned - deducted),
  };
}

/**
 * Calculates team competition points strictly inside the selected period
 */
export function getTeamPeriodPoints(
  team: Team,
  transactions: StarTransaction[],
  period: RankingPeriod,
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CONFIG,
  customWeekNumber?: number,
  customMonthKey?: string,
  referenceDate?: Date | string
): number {
  const refDate = parseVietnamDate(referenceDate);
  const periodTxs = filterTransactionsByPeriod(
    transactions,
    period,
    config,
    customWeekNumber,
    customMonthKey,
    refDate
  ).filter((tx) => tx.teamId === team.id && tx.deltaStars !== 0 && !tx.id.startsWith('tx_init_'));

  let txDelta = 0;
  for (const tx of periodTxs) {
    txDelta += tx.deltaStars;
  }

  const isSeededClass2A5Team = team.classId === 'class_2a5' || ['team_1', 'team_2', 'team_3', 'team_4'].includes(team.id);
  const baseWeek8 =
    (team as any).baseWeeklyPoints !== undefined
      ? Number((team as any).baseWeeklyPoints)
      : isSeededClass2A5Team
      ? team.weeklyPoints ?? 0
      : 0;

  const baseMonth10 =
    (team as any).baseMonthlyPoints !== undefined
      ? Number((team as any).baseMonthlyPoints)
      : isSeededClass2A5Team
      ? team.monthlyPoints ?? team.points ?? 0
      : 0;

  let baseline = 0;
  if (period === 'week') {
    const weekInfo = getAcademicWeekInfo(refDate, config);
    const targetWeek = customWeekNumber || (weekInfo.isOutOfRange ? 0 : weekInfo.weekNumber);
    if (targetWeek === 8) {
      baseline = baseWeek8;
    }
  } else if (period === 'month') {
    const targetMonthKey = customMonthKey || getCurrentAcademicMonthKey(refDate, config);
    if (targetMonthKey === '2026-10') {
      baseline = baseMonth10;
    }
  } else if (period === 'semester1') {
    baseline = isSeededClass2A5Team ? team.semester1Points ?? baseMonth10 : 0;
  } else if (period === 'semester2') {
    baseline = 0;
  } else if (period === 'year') {
    baseline = baseMonth10 || team.points || 0;
  }

  return Math.max(0, baseline + txDelta);
}
