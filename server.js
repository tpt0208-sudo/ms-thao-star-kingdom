// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import crypto from "crypto";
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
var DATA_DIR = path.resolve(process.cwd(), "data");
var DB_FILE = process.env.DB_FILE ? path.resolve(process.cwd(), process.env.DB_FILE) : process.env.USE_DEMO_DATA === "true" ? path.resolve(DATA_DIR, "demo_db.json") : path.resolve(DATA_DIR, "db.json");
var SESSION_SECRET = process.env.SESSION_SECRET || "starkingdom-hmac-secret-key-2026-thulam";
var ALLOWED_TEACHER_EMAILS = (process.env.TEACHER_EMAILS || (process.env.NODE_ENV === "production" ? "" : "thaonguyen.gv@thulam.edu.vn,cothao@gmail.com,admin@starkingdom.edu.vn")).split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
var TEACHER_PASSWORDS = (process.env.TEACHER_PASSWORD || process.env.TEACHER_PASSWORDS || (process.env.NODE_ENV === "production" ? "" : "StarKingdomDemo@2026,Thao2A5@2026")).split(",").map((p) => p.trim()).filter(Boolean);
var loginAttempts = /* @__PURE__ */ new Map();
function checkRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true };
  if (record.lockedUntil > now) {
    const waitMinutes = Math.ceil((record.lockedUntil - now) / 6e4);
    return { allowed: false, waitMinutes };
  }
  if (record.lockedUntil && record.lockedUntil <= now) {
    loginAttempts.delete(key);
  }
  return { allowed: true };
}
function recordLoginFailure(key) {
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1e3;
    loginAttempts.set(key, record);
    return { locked: true, waitMinutes: 15 };
  }
  loginAttempts.set(key, record);
  return { locked: false };
}
function resetLoginAttempts(key) {
  loginAttempts.delete(key);
}
function createSessionToken(payload, ttlHours = 24 * 7) {
  const fullPayload = {
    ...payload,
    exp: Date.now() + ttlHours * 3600 * 1e3
  };
  const dataB64 = Buffer.from(JSON.stringify(fullPayload), "utf-8").toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(dataB64).digest("base64url");
  return `${dataB64}.${sig}`;
}
function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [dataB64, sig] = token.split(".");
  if (!dataB64 || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(dataB64).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(dataB64, "base64url").toString("utf-8"));
    if (!parsed || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
function extractSession(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return verifySessionToken(authHeader.slice(7).trim());
  }
  const tokenHeader = req.headers["x-auth-token"];
  if (typeof tokenHeader === "string") {
    return verifySessionToken(tokenHeader.trim());
  }
  return null;
}
function sanitizeStudentRecord(st, session) {
  const { passcode: _passcode, ...rest } = st;
  const copy = { ...rest };
  if (session?.role === "teacher") {
    return copy;
  }
  if (session?.role === "student" && session.studentId === st.id) {
    copy.notes = "";
    return copy;
  }
  copy.notes = "";
  copy.dob = "";
  return copy;
}
function sanitizeAppState(state, session) {
  const isTeacher = session?.role === "teacher";
  return {
    ...state,
    students: (state.students || []).map((st) => sanitizeStudentRecord(st, session)),
    news: isTeacher ? state.news : (state.news || []).filter((n) => !n.isDeleted && n.visibility !== "teachers"),
    backups: isTeacher ? state.backups : [],
    auditLogs: isTeacher ? state.auditLogs : []
  };
}
function requireTeacher(req, res, next) {
  const session = extractSession(req);
  const explicitRole = req.body?.role || req.headers["x-user-role"];
  if (explicitRole === "student" || explicitRole === "guest") {
    res.status(403).json({
      success: false,
      error: "T\u1EEB ch\u1ED1i truy c\u1EADp: T\xE0i kho\u1EA3n h\u1ECDc sinh/kh\xE1ch kh\xF4ng c\xF3 quy\u1EC1n ch\u1EC9nh s\u1EEDa d\u1EEF li\u1EC7u qu\u1EA3n tr\u1ECB. / Access Denied: Teacher privileges required."
    });
    return;
  }
  if (!session || session.role !== "teacher") {
    res.status(403).json({
      success: false,
      error: "T\u1EEB ch\u1ED1i truy c\u1EADp: Vui l\xF2ng \u0111\u0103ng nh\u1EADp t\xE0i kho\u1EA3n Gi\xE1o vi\xEAn h\u1EE3p l\u1EC7 \u0111\u1EC3 th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y. / Access Denied: Authenticated Teacher required."
    });
    return;
  }
  next();
}
function requireStudentOrTeacher(req, res, next) {
  const session = extractSession(req);
  if (!session || session.role !== "teacher" && session.role !== "student") {
    res.status(403).json({
      success: false,
      error: "T\u1EEB ch\u1ED1i truy c\u1EADp: Kh\xE1ch xem kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p \u0111\u1ED5i qu\xE0 ho\u1EB7c thay \u0111\u1ED5i d\u1EEF li\u1EC7u. / Access Denied: Guests cannot redeem rewards."
    });
    return;
  }
  if (session.role === "student" && req.body?.studentId && req.body.studentId !== session.studentId) {
    res.status(403).json({
      success: false,
      error: "H\u1ECDc sinh ch\u1EC9 \u0111\u01B0\u1EE3c ph\xE9p \u0111\u1ED5i qu\xE0 b\u1EB1ng t\xE0i kho\u1EA3n ng\xF4i sao c\u1EE7a ch\xEDnh m\xECnh. / Students can only redeem rewards for their own account."
    });
    return;
  }
  next();
}
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
function getDemoStudents(classId) {
  const names = [
    { name: "Nguy\u1EC5n Minh", gender: "male", teamId: "team_2", stars: 25, dob: "2018-10-15" },
    { name: "Tr\u1EA7n B\u1EA3o Ng\u1ECDc", gender: "female", teamId: "team_2", stars: 24, dob: "2018-10-27" },
    { name: "L\xEA Gia Huy", gender: "male", teamId: "team_1", stars: 22, dob: "2018-10-08" },
    { name: "Ph\u1EA1m H\xE0 Anh", gender: "female", teamId: "team_3", stars: 21, dob: "2018-11-12" },
    { name: "B\xF9i Quang Minh", gender: "male", teamId: "team_1", stars: 20, dob: "2018-11-20" },
    { name: "\u0110\u1ED7 Th\u1EA3o Linh", gender: "female", teamId: "team_2", stars: 19, dob: "2018-12-05" },
    { name: "Ho\xE0ng Qu\u1ED1c Tu\u1EA5n", gender: "male", teamId: "team_4", stars: 18, dob: "2018-12-24" },
    { name: "V\u0169 Ng\u1ECDc Di\u1EC7p", gender: "female", teamId: "team_4", stars: 17, dob: "2018-01-18" },
    { name: "Ng\xF4 \u0110\u1EE9c Anh", gender: "male", teamId: "team_3", stars: 16, dob: "2018-02-14" },
    { name: "L\xFD Mai Ph\u01B0\u01A1ng", gender: "female", teamId: "team_1", stars: 15, dob: "2018-03-08" },
    { name: "\u0110\u1EB7ng Tu\u1EA5n Khang", gender: "male", teamId: "team_2", stars: 18, dob: "2018-03-26" },
    { name: "Phan Th\xF9y Chi", gender: "female", teamId: "team_3", stars: 14, dob: "2018-04-19" },
    { name: "Tr\u1ECBnh Ho\xE0ng Long", gender: "male", teamId: "team_4", stars: 16, dob: "2018-05-15" },
    { name: "D\u01B0\u01A1ng Kh\xE1nh Linh", gender: "female", teamId: "team_2", stars: 22, dob: "2018-05-30" },
    { name: "B\xF9i Anh Tu\u1EA5n", gender: "male", teamId: "team_1", stars: 17, dob: "2018-06-01" },
    { name: "L\xEA Minh H\u1EB1ng", gender: "female", teamId: "team_3", stars: 15, dob: "2018-06-25" },
    { name: "Nguy\u1EC5n T\u1EA5n \u0110\u1EA1t", gender: "male", teamId: "team_4", stars: 13, dob: "2018-07-10" },
    { name: "Tr\u1EA7n Qu\u1EF3nh Nga", gender: "female", teamId: "team_2", stars: 19, dob: "2018-08-15" },
    { name: "Chu B\u1EA3o Nam", gender: "male", teamId: "team_1", stars: 18, dob: "2018-09-02" },
    { name: "Mai Ph\u01B0\u01A1ng Uy\xEAn", gender: "female", teamId: "team_4", stars: 16, dob: "2018-09-20" },
    { name: "H\u1ED3 \u0110\xECnh Tr\u1ECDng", gender: "male", teamId: "team_3", stars: 15, dob: "2018-10-02" },
    { name: "V\xF5 Minh Ch\xE2u", gender: "female", teamId: "team_3", stars: 17, dob: "2018-10-30" },
    { name: "\u0110inh Ph\xFAc Khang", gender: "male", teamId: "team_4", stars: 14, dob: "2018-11-05" },
    { name: "Nguy\u1EC5n Lan H\u01B0\u01A1ng", gender: "female", teamId: "team_1", stars: 16, dob: "2018-12-18" },
    { name: "T\u1EA1 Minh Kh\xF4i", gender: "male", teamId: "team_2", stars: 17, dob: "2018-01-09" },
    { name: "L\u01B0\u01A1ng Y\u1EBFn Nhi", gender: "female", teamId: "team_3", stars: 15, dob: "2018-02-28" },
    { name: "Cao H\u1EA3i \u0110\u0103ng", gender: "male", teamId: "team_1", stars: 14, dob: "2018-03-15" },
    { name: "V\u01B0\u01A1ng Th\u1EA3o Nguy\xEAn", gender: "female", teamId: "team_4", stars: 15, dob: "2018-04-04" }
  ];
  return names.map((item, index) => {
    const code = `2A5${(index + 1).toString().padStart(2, "0")}`;
    const level = item.stars >= 100 ? 4 : item.stars >= 50 ? 3 : item.stars >= 20 ? 2 : 1;
    const avatar = item.gender === "female" ? "/assets/kingdom/student_ngoc.png" : "/assets/kingdom/student_minh.png";
    return {
      id: `${classId}_student_${index + 1}`,
      classId,
      studentCode: code,
      fullName: item.name,
      gender: item.gender,
      teamId: item.teamId,
      avatarUrl: avatar,
      dob: item.dob || "2018-05-15",
      notes: "H\u1ECDc sinh ngoan, ch\u0103m ch\u1EC9 h\u1ECDc t\u1EADp.",
      totalEarnedStars: item.stars,
      spendableStars: item.stars,
      weeklyStars: Math.min(item.stars, 8),
      monthlyStars: item.stars,
      level,
      badgeIds: index < 4 ? ["badge_reading", "badge_kindness"] : ["badge_teamwork"],
      passcode: "2026"
    };
  });
}
function parseBirthDate(dobStr) {
  if (!dobStr || typeof dobStr !== "string") return null;
  const trimmed = dobStr.trim();
  if (!trimmed) return null;
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        year,
        month,
        day,
        formatted: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
      };
    }
  }
  const vnMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10);
    const year = parseInt(vnMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        year,
        month,
        day,
        formatted: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
      };
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = parsed.getDate();
    const month = parsed.getMonth() + 1;
    const year = parsed.getFullYear();
    if (year >= 1990 && year <= 2030) {
      return {
        year,
        month,
        day,
        formatted: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
      };
    }
  }
  return null;
}
function getDefaultNotifications(classId) {
  return [
    {
      id: `${classId}_notif_1`,
      classId,
      type: "star",
      titleVi: "Th\u01B0\u1EDFng 5 ng\xF4i sao cho Nguy\u1EC5n Minh",
      titleEn: "5 Stars Awarded to Nguyen Minh",
      messageVi: "C\xF4 Th\u1EA3o \u0111\xE3 th\u01B0\u1EDFng 5 ng\xF4i sao l\u1EA5p l\xE1nh cho b\u1EA1n Nguy\u1EC5n Minh (T\u1ED5 2 - Ng\xF4i Sao Xanh) v\xEC ph\xE1t bi\u1EC3u x\xE2y d\u1EF1ng b\xE0i s\xF4i n\u1ED5i.",
      messageEn: "Teacher Thao awarded 5 sparkling stars to Nguyen Minh (Team 2 - Blue Stars) for active and enthusiastic class participation.",
      timestamp: new Date(Date.now() - 10 * 60 * 1e3).toISOString(),
      createdAt: new Date(Date.now() - 10 * 60 * 1e3).toISOString(),
      targetRole: "all",
      authorName: "C\xF4 Th\u1EA3o",
      metadata: {
        studentId: `${classId}_student_1`,
        studentName: "Nguy\u1EC5n Minh",
        deltaStars: 5,
        teamId: "team_2",
        teamName: "T\u1ED5 2: Ng\xF4i Sao Xanh",
        severity: "success",
        linkTab: "rewards"
      }
    },
    {
      id: `${classId}_notif_2`,
      classId,
      type: "news",
      titleVi: "B\u1EA3ng tin l\u1EDBp: Ho\u1EA1t \u0111\u1ED9ng STEM tu\u1EA7n n\xE0y",
      titleEn: "Class News: This Week STEM Workshop",
      messageVi: 'B\xE0i vi\u1EBFt m\u1EDBi: "Ch\u1EBF t\u1EA1o k\xEDnh v\u1EA1n hoa v\u01B0\u01A1ng qu\u1ED1c l\u1EA5p l\xE1nh v\u1EDBi nh\u1EEFng ng\xF4i sao k\u1EF3 di\u1EC7u" \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u0103ng tr\xEAn b\u1EA3ng tin l\u1EDBp.',
      messageEn: 'New article: "Crafting sparkling kingdom kaleidoscopes with magical stars" is now live on Class news board.',
      timestamp: new Date(Date.now() - 45 * 60 * 1e3).toISOString(),
      createdAt: new Date(Date.now() - 45 * 60 * 1e3).toISOString(),
      targetRole: "all",
      authorName: "C\xF4 Th\u1EA3o",
      metadata: {
        newsId: "news_1",
        severity: "normal",
        linkTab: "news"
      }
    },
    {
      id: `${classId}_notif_3`,
      classId,
      type: "celebration",
      titleVi: "Vinh danh T\u1ED5 2: T\u1EA1m d\u1EABn \u0111\u1EA7u b\u1EA3ng thi \u0111ua tu\u1EA7n",
      titleEn: "Honoring Team 2: Weekly Competition Leader",
      messageVi: "T\u1ED5 2 - Ng\xF4i Sao Xanh xu\u1EA5t s\u1EAFc d\u1EABn \u0111\u1EA7u tu\u1EA7n v\u1EDBi 289 sao v\xE0 nh\u1EADn c\u1EDD v\xE0ng danh d\u1EF1 t\u1EEB c\xF4 Th\u1EA3o!",
      messageEn: "Team 2 - Blue Stars outstandingly leads the week with 289 stars and receives the golden honor flag from Teacher Thao!",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString(),
      targetRole: "all",
      authorName: "C\xF4 Th\u1EA3o",
      metadata: {
        teamId: "team_2",
        teamName: "T\u1ED5 2: Ng\xF4i Sao Xanh",
        severity: "success",
        linkTab: "teams"
      }
    }
  ];
}
function getDefaultState() {
  const defaultClass = {
    id: "class_2a5",
    nameVi: "L\u1EDBp 2A5",
    nameEn: "Class 2A5",
    grade: 2,
    schoolYear: "2026 - 2027",
    teacherName: "C\xF4 Th\u1EA3o",
    teacherTitleEn: "Teacher Thao",
    teacherAvatar: "/assets/kingdom/teacher_avatar.png",
    targetSize: 28,
    sloganVi: "M\u1ED7i ng\xE0y vui h\u1ECDc \u2013 M\u1ED7i ng\xE0y t\u1ECFa s\xE1ng!",
    sloganEn: "Learn Happy, Shine Bright!",
    coverUrl: "",
    bannerTheme: "star_kingdom_default"
  };
  const sampleClass2 = {
    id: "class_1a1",
    nameVi: "L\u1EDBp 1A1",
    nameEn: "Class 1A1",
    grade: 1,
    schoolYear: "2026 - 2027",
    teacherName: "C\xF4 Th\u1EA3o",
    teacherTitleEn: "Teacher Thao",
    teacherAvatar: "/assets/kingdom/teacher_avatar.png",
    targetSize: 25,
    sloganVi: "T\u1EF1 tin b\u01B0\u1EDBc v\xE0o v\u01B0\u01A1ng qu\u1ED1c tri th\u1EE9c!",
    sloganEn: "Confident step into the Kingdom of Knowledge!",
    coverUrl: "",
    bannerTheme: "star_kingdom_default"
  };
  return {
    school: {
      id: "school_thulam",
      nameVi: "Tr\u01B0\u1EDDng Ti\u1EC3u h\u1ECDc v\xE0 THCS TH\u01AF L\xC2M",
      nameEn: "THU LAM PRIMARY AND LOWER SECONDARY SCHOOL",
      logoUrl: "/assets/kingdom/school_logo_v2.png"
    },
    classes: [defaultClass, sampleClass2],
    currentClassId: "class_2a5",
    classInfo: defaultClass,
    teams: [
      {
        id: "team_1",
        classId: "class_2a5",
        nameVi: "T\u1ED5 1: Ng\xF4i Sao \u0110\u1ECF",
        nameEn: "Team 1: Red Stars",
        color: "#EF4444",
        bgColor: "#FEF2F2",
        borderColor: "#FCA5A5",
        flagColor: "red",
        mascot: "L\u1EEDa Nhi\u1EC7t Huy\u1EBFt",
        points: 256,
        leaderId: "class_2a5_student_3",
        weeklyPoints: 42,
        monthlyPoints: 256,
        semester1Points: 520,
        semester2Points: 256,
        avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=RedFireLion&backgroundColor=ffadad",
        slogan: "Nhi\u1EC7t huy\u1EBFt b\xF9ng ch\xE1y, t\u1EF1 tin t\u1ECFa s\xE1ng!"
      },
      {
        id: "team_2",
        classId: "class_2a5",
        nameVi: "T\u1ED5 2: Ng\xF4i Sao Xanh",
        nameEn: "Team 2: Blue Stars",
        color: "#3B82F6",
        bgColor: "#EFF6FF",
        borderColor: "#93C5FD",
        flagColor: "blue",
        mascot: "Bi\u1EC3n Th\xF4ng Th\xE1i",
        points: 289,
        leaderId: "class_2a5_student_1",
        weeklyPoints: 54,
        monthlyPoints: 289,
        semester1Points: 580,
        semester2Points: 289,
        avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=BlueOcean&backgroundColor=a0c4ff",
        slogan: "V\u1EEFng v\xE0ng tri th\u1EE9c, bay cao \u01B0\u1EDBc m\u01A1!"
      },
      {
        id: "team_3",
        classId: "class_2a5",
        nameVi: "T\u1ED5 3: Ng\xF4i Sao V\xE0ng",
        nameEn: "Team 3: Golden Stars",
        color: "#EAB308",
        bgColor: "#FEFCE8",
        borderColor: "#FDE047",
        flagColor: "gold",
        mascot: "M\u1EB7t Tr\u1EDDi T\u1ECFa S\xE1ng",
        points: 241,
        leaderId: "class_2a5_student_4",
        weeklyPoints: 38,
        monthlyPoints: 241,
        semester1Points: 490,
        semester2Points: 241,
        avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=GoldenSun&backgroundColor=fdffb6",
        slogan: "\u0110o\xE0n k\u1EBFt y\xEAu th\u01B0\u01A1ng, c\xF9ng nhau ti\u1EBFn b\u01B0\u1EDBc!"
      },
      {
        id: "team_4",
        classId: "class_2a5",
        nameVi: "T\u1ED5 4: Ng\xF4i Sao L\xE1",
        nameEn: "Team 4: Green Stars",
        color: "#22C55E",
        bgColor: "#F0FDF4",
        borderColor: "#86EFAC",
        flagColor: "green",
        mascot: "M\u1EA7m C\xE2y Hy V\u1ECDng",
        points: 198,
        leaderId: "class_2a5_student_7",
        weeklyPoints: 31,
        monthlyPoints: 198,
        semester1Points: 410,
        semester2Points: 198,
        avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=GreenSprout&backgroundColor=caffbf",
        slogan: "\u01AF\u01A1m m\u1EA7m hy v\u1ECDng, g\u1EB7t h\xE1i th\xE0nh c\xF4ng!"
      }
    ],
    students: getDemoStudents("class_2a5"),
    starTransactions: [
      {
        id: "tx_init_1",
        classId: "class_2a5",
        studentId: "class_2a5_student_1",
        studentName: "Nguy\u1EC5n Minh",
        deltaStars: 5,
        teamId: "team_2",
        reasonCategory: "Ph\xE1t bi\u1EC3u",
        reasonNote: "C\xF4 Th\u1EA3o \u0111\xE3 th\u01B0\u1EDFng 5 sao cho Nguy\u1EC5n Minh",
        timestamp: new Date(Date.now() - 2 * 60 * 1e3).toISOString(),
        createdBy: "C\xF4 Th\u1EA3o"
      },
      {
        id: "tx_init_2",
        classId: "class_2a5",
        studentId: "",
        studentName: "T\u1ED5 2",
        deltaStars: 10,
        teamId: "team_2",
        reasonCategory: "Thi \u0111ua t\u1ED5",
        reasonNote: "T\u1ED5 2 \u0111\u1EA1t th\xE0nh t\xEDch cao nh\u1EA5t tu\u1EA7n!",
        timestamp: new Date(Date.now() - 30 * 60 * 1e3).toISOString(),
        createdBy: "C\xF4 Th\u1EA3o"
      }
    ],
    badges: [
      { id: "badge_english", nameVi: "English Speaker", nameEn: "English Champion", iconName: "Languages", descriptionVi: "T\u1EF1 tin ph\xE1t \xE2m v\xE0 giao ti\u1EBFp ti\u1EBFng Anh chu\u1EA9n m\u1EF1c", descriptionEn: "Confident English speaker", category: "academic", color: "#3B82F6" },
      { id: "badge_kindness", nameVi: "Kind Friend", nameEn: "Kind Heart", iconName: "HeartHandshake", descriptionVi: "Lu\xF4n t\u1ED1t b\u1EE5ng, th\xE2n thi\u1EC7n v\xE0 gi\xFAp \u0111\u1EE1 b\u1EA1n b\xE8", descriptionEn: "Always kind and helpful", category: "behavior", color: "#EC4899" },
      { id: "badge_reading", nameVi: "Reading Hero", nameEn: "Reading Hero", iconName: "BookOpen", descriptionVi: "Ch\u0103m ch\u1EC9 \u0111\u1ECDc s\xE1ch v\xE0 chia s\u1EBB c\xE2u chuy\u1EC7n hay", descriptionEn: "Passionate reader", category: "academic", color: "#8B5CF6" },
      { id: "badge_teamwork", nameVi: "Team Player", nameEn: "Great Team Player", iconName: "Users", descriptionVi: "H\u1EE3p t\xE1c tuy\u1EC7t v\u1EDDi, c\u1ED1ng hi\u1EBFn v\xEC t\u1EADp th\u1EC3 t\u1ED5", descriptionEn: "Outstanding teamwork", category: "leadership", color: "#10B981" },
      { id: "badge_star_week", nameVi: "Star of the Week", nameEn: "Star of the Week", iconName: "Award", descriptionVi: "Ng\xF4i sao r\u1EA1ng r\u1EE1 nh\u1EA5t tu\u1EA7n c\u1EE7a l\u1EDBp", descriptionEn: "Shining star of the week", category: "leadership", color: "#F59E0B" },
      { id: "badge_progress", nameVi: "Great Progress", nameEn: "Great Progress", iconName: "TrendingUp", descriptionVi: "Ti\u1EBFn b\u1ED9 v\u01B0\u1EE3t b\u1EADc trong h\u1ECDc t\u1EADp v\xE0 r\xE8n luy\u1EC7n", descriptionEn: "Remarkable progress", category: "academic", color: "#06B6D4" },
      { id: "badge_super_learner", nameVi: "Super Learner", nameEn: "Super Learner", iconName: "Zap", descriptionVi: "H\u1ECDc t\u1EADp h\u0103ng say, lu\xF4n n\u1ED7 l\u1EF1c \u0111\u1EA1t k\u1EBFt qu\u1EA3 t\u1ED1t nh\u1EA5t", descriptionEn: "Dedicated learner", category: "creativity", color: "#F97316" }
    ],
    rewards: [
      { id: "rew_1", titleVi: "B\xFAt ch\xEC h\xECnh ng\xF4i sao ma thu\u1EADt", titleEn: "Magic Star Pencil", starCost: 5, stock: 30, iconName: "Sparkles", description: "B\xFAt ch\xEC d\u1EA1 quang c\xF3 t\u1EA9y ng\xF4i sao d\u1EC5 th\u01B0\u01A1ng", claimedCount: 4 },
      { id: "rew_2", titleVi: "Th\u01B0\u1EDBc k\u1EBB c\u1EA7u v\u1ED3ng Star Kingdom", titleEn: "Rainbow Kingdom Ruler", starCost: 10, stock: 25, iconName: "Ruler", description: "Th\u01B0\u1EDBc k\u1EBB \u0111a n\u0103ng h\u1ECDa ti\u1EBFt v\u01B0\u01A1ng qu\u1ED1c l\xE2u \u0111\xE0i", claimedCount: 2 },
      { id: "rew_3", titleVi: "B\u1ED9 sticker 3D v\u01B0\u01A1ng mi\u1EC7n l\u1EA5p l\xE1nh", titleEn: "3D Crown Stickers Set", starCost: 8, stock: 40, iconName: "Smile", description: "T\u1EADp sticker n\u1ED5i 3D ch\u1EE7 \u0111\u1EC1 ho\xE0ng t\u1EED c\xF4ng ch\xFAa", claimedCount: 7 },
      { id: "rew_4", titleVi: "V\xE9 ch\u1ECDn ch\u1ED7 ng\u1ED3i y\xEAu th\xEDch (1 ng\xE0y)", titleEn: "Pick Favorite Seat Day Pass", starCost: 20, stock: 10, iconName: "Armchair", description: "\u0110\u01B0\u1EE3c quy\u1EC1n ch\u1ECDn ng\u1ED3i c\xF9ng b\u1EA1n th\xE2n trong 1 ng\xE0y", claimedCount: 3 },
      { id: "rew_5", titleVi: "Th\u1EBB mi\u1EC5n b\xE0i t\u1EADp v\u1EC1 nh\xE0 m\xF4n Ti\u1EBFng Anh", titleEn: "Homework Pass (English)", starCost: 30, stock: 8, iconName: "FileCheck", description: "\u0110\u01B0\u1EE3c ngh\u1EC9 1 l\u1EA7n l\xE0m b\xE0i t\u1EADp v\u1EC1 nh\xE0 nh\u01B0ng v\u1EABn \u0111\u01B0\u1EE3c khen", claimedCount: 1 },
      { id: "rew_6", titleVi: "L\xE0m T\u1ED5 tr\u01B0\u1EDFng danh d\u1EF1 1 tu\u1EA7n", titleEn: "Honorary Team Leader for 1 Week", starCost: 40, stock: 4, iconName: "Crown", description: "Tr\u1EDF th\xE0nh \u0111\u1ED9i tr\u01B0\u1EDFng \u0111i\u1EC1u h\xE0nh ho\u1EA1t \u0111\u1ED9ng thi \u0111ua", claimedCount: 1 }
    ],
    redemptions: [],
    attendance: {
      [(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)]: {
        classId: "class_2a5",
        date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        records: {},
        note: "\u0110i\u1EC3m danh bu\u1ED5i s\xE1ng L\u1EDBp 2A5",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    },
    seatingChart: {
      classId: "class_2a5",
      rows: 4,
      cols: 7,
      seats: [],
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    news: [
      {
        id: "news_1",
        classId: "class_2a5",
        title: "Ho\u1EA1t \u0111\u1ED9ng STEM tu\u1EA7n n\xE0y: Ch\u1EBF t\u1EA1o k\xEDnh v\u1EA1n hoa v\u01B0\u01A1ng qu\u1ED1c",
        content: "C\xE1c b\u1EA1n nh\u1ECF l\u1EDBp 2A5 th\xE2n m\u1EBFn! Th\u1EE9 S\xE1u n\xE0y ch\xFAng m\xECnh s\u1EBD c\xF9ng c\xF4 Th\u1EA3o l\xE0m k\xEDnh v\u1EA1n hoa l\u1EA5p l\xE1nh v\u1EDBi nh\u1EEFng ng\xF4i sao k\u1EF3 di\u1EC7u.",
        author: "C\xF4 Th\u1EA3o",
        date: "2026-10-28",
        pinned: true,
        tags: ["STEM", "Ho\u1EA1t \u0111\u1ED9ng l\u1EDBp", "Khoa h\u1ECDc vui"],
        likes: 24
      },
      {
        id: "news_2",
        classId: "class_2a5",
        title: "Ch\xFAc m\u1EEBng sinh nh\u1EADt b\u1EA1n Tr\u1EA7n B\u1EA3o Ng\u1ECDc (T\u1ED5 2)! \u{1F382}\u{1F389}",
        content: "C\u1EA3 l\u1EDBp c\xF9ng g\u1EEDi nh\u1EEFng l\u1EDDi ch\xFAc m\u1EEBng ng\u1ECDt ng\xE0o nh\u1EA5t t\u1EDBi b\u1EA1n B\u1EA3o Ng\u1ECDc. Ch\xFAc B\u1EA3o Ng\u1ECDc lu\xF4n vui t\u01B0\u01A1i, ch\u0103m ngoan v\xE0 t\u1ECFa s\xE1ng nh\u01B0 ng\xF4i sao!",
        author: "C\xF4 Th\u1EA3o",
        date: "2026-10-27",
        pinned: false,
        tags: ["Sinh nh\u1EADt", "Ni\u1EC1m vui"],
        likes: 28
      },
      {
        id: "news_3",
        classId: "class_2a5",
        title: "B\u1EA3ng thi \u0111ua tu\u1EA7n 3: T\u1ED5 2 - Ng\xF4i Sao Xanh d\u1EABn \u0111\u1EA7u!",
        content: "Tu\u1EA7n qua 4 t\u1ED5 \u0111\xE3 thi \u0111ua v\xF4 c\xF9ng s\xF4i n\u1ED5i. T\u1ED5 2 \u0111\u1EA1t 289 sao v\xE0 t\u1EA1m th\u1EDDi gi\u1EEF c\u1EDD v\xE0ng d\u1EABn \u0111\u1EA7u!",
        author: "C\xF4 Th\u1EA3o",
        date: "2026-10-25",
        pinned: false,
        tags: ["Thi \u0111ua", "Vinh danh"],
        likes: 19
      }
    ],
    // 4 Learning Library categories: Video, Hình ảnh, Sách truyện, Khác
    learningResources: [
      {
        id: "res_1",
        title: "Phonics Grade 2: Letter Sounds and Blends (Th\u1EBF gi\u1EDBi ng\u1EEF \xE2m)",
        category: "video",
        grade: 2,
        type: "video",
        url: "https://www.youtube.com/watch?v=saF3-f0XWAY",
        description: "Video luy\u1EC7n ph\xE1t \xE2m chu\u1EA9n c\xE1c \xE2m gh\xE9p Ti\u1EBFng Anh l\u1EDBp 2.",
        createdAt: "2026-10-20"
      },
      {
        id: "res_2",
        title: "Album: Gi\u1EDD h\u1ECDc STEM Ch\u1EBF t\u1EA1o ng\xF4i sao ph\xE9p thu\u1EADt 2A5",
        category: "image",
        grade: 2,
        type: "image",
        url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600",
        description: "B\u1ED9 s\u01B0u t\u1EADp h\xECnh \u1EA3nh c\xE1c t\u1ED5 h\xE0o h\u1EE9ng l\xE0m th\xED nghi\u1EC7m khoa h\u1ECDc vui.",
        createdAt: "2026-10-22"
      },
      {
        id: "res_3",
        title: "Truy\u1EC7n tranh song ng\u1EEF: The Little Star Who Wanted to Learn",
        category: "book",
        grade: 2,
        type: "document",
        author: "Ms. Thao",
        url: "https://example.com/books/little-star.pdf",
        description: "Truy\u1EC7n tranh ng\u1EAFn b\u1ED3i d\u01B0\u1EE1ng t\xECnh y\xEAu \u0111\u1ECDc s\xE1ch v\xE0 v\u1ED1n t\u1EEB v\u1EF1ng c\u01A1 b\u1EA3n.",
        createdAt: "2026-10-23"
      },
      {
        id: "res_4",
        title: "Tr\xF2 ch\u01A1i t\u01B0\u01A1ng t\xE1c: Star Math Quiz - Ph\xE9p t\xEDnh k\u1EF3 di\u1EC7u",
        category: "other",
        grade: 2,
        type: "game",
        url: "https://example.com/game/star-math-2a5",
        description: "Tr\xF2 ch\u01A1i t\xEDnh nh\u1EA9m nhanh gi\xE0nh huy hi\u1EC7u sao v\u01B0\u01A1ng qu\u1ED1c.",
        createdAt: "2026-10-25"
      }
    ],
    levelRules: [
      { level: 1, titleVi: "Little Explorer", titleEn: "Nh\xE0 th\xE1m hi\u1EC3m nh\xED", minStars: 0, icon: "Compass", badgeColor: "#94A3B8" },
      { level: 2, titleVi: "Rising Star", titleEn: "Ng\xF4i sao \u0111ang l\xEAn", minStars: 20, icon: "Sparkles", badgeColor: "#38BDF8" },
      { level: 3, titleVi: "Super Learner", titleEn: "Si\xEAu h\u1ECDc sinh", minStars: 50, icon: "Zap", badgeColor: "#818CF8" },
      { level: 4, titleVi: "Star Champion", titleEn: "Qu\xE1n qu\xE2n v\u01B0\u01A1ng qu\u1ED1c", minStars: 100, icon: "Trophy", badgeColor: "#F59E0B" },
      { level: 5, titleVi: "Kingdom Hero", titleEn: "Anh h\xF9ng v\u01B0\u01A1ng qu\u1ED1c", minStars: 200, icon: "Crown", badgeColor: "#EF4444" }
    ],
    backups: [],
    kingdomAvatarUrl: "/assets/kingdom/sidebar_logo.png",
    academicConfig: {
      schoolYear: "2026 - 2027",
      startDate: "2026-09-07",
      endDate: "2027-05-31",
      semester1Start: "2026-09-07",
      semester1End: "2027-01-15",
      semester2Start: "2027-01-16",
      semester2End: "2027-05-31"
    },
    finalizedResults: [],
    auditLogs: [],
    notifications: getDefaultNotifications("class_2a5"),
    notificationReads: []
  };
}
function loadDb() {
  try {
    if (!fs.existsSync(DB_FILE) && fs.existsSync(path.resolve(DATA_DIR, "demo_db.json"))) {
      const demoData = fs.readFileSync(path.resolve(DATA_DIR, "demo_db.json"), "utf-8");
      fs.writeFileSync(DB_FILE, demoData, "utf-8");
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.classes && parsed.classes.length > 0) {
        if (!parsed.academicConfig) {
          parsed.academicConfig = {
            schoolYear: "2026 - 2027",
            startDate: "2026-09-05",
            endDate: "2027-05-31",
            semester1Start: "2026-09-05",
            semester1End: "2027-01-15",
            semester2Start: "2027-01-16",
            semester2End: "2027-05-31"
          };
        }
        if (!parsed.finalizedResults) parsed.finalizedResults = [];
        if (!parsed.auditLogs) parsed.auditLogs = [];
        if (!parsed.sidebarMascotUrl) parsed.sidebarMascotUrl = "/assets/kingdom/sidebar_mascot.png";
        let modified = false;
        if (!parsed.notifications || !Array.isArray(parsed.notifications) || parsed.notifications.length === 0) {
          parsed.notifications = getDefaultNotifications(parsed.currentClassId || "class_2a5");
          modified = true;
        }
        if (!parsed.notificationReads || !Array.isArray(parsed.notificationReads)) {
          parsed.notificationReads = [];
          modified = true;
        }
        const class2a5Students = (parsed.students || []).filter((s) => s.classId === "class_2a5");
        const allIdenticalDob = class2a5Students.length > 0 && class2a5Students.every((s) => s.dob === "2018-05-15");
        if (allIdenticalDob) {
          const freshDemo = getDemoStudents("class_2a5");
          const freshMap = new Map(freshDemo.map((s) => [s.studentCode, s.dob]));
          parsed.students.forEach((s) => {
            if (s.classId === "class_2a5" && freshMap.has(s.studentCode)) {
              s.dob = freshMap.get(s.studentCode);
            }
          });
          modified = true;
        }
        if (modified) {
          saveDb(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error loading DB file, falling back to default:", err);
  }
  const defaultState = getDefaultState();
  saveDb(defaultState);
  return defaultState;
}
function saveDb(state) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving DB file:", err);
  }
}
var dbState = loadDb();
try {
  (dbState.classes || []).forEach((c) => {
    syncMonthlyBirthdayNews(c.id);
  });
  saveDb(dbState);
} catch (e) {
  console.error("Error syncing birthday bulletins on startup:", e);
}
function recordAuditLog(classId, action, actor, description, details, canUndo = false, undoPayload) {
  if (!dbState.auditLogs) dbState.auditLogs = [];
  const entry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId,
    action,
    actor: actor || (dbState.classInfo ? dbState.classInfo.teacherName : "C\xF4 Th\u1EA3o"),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    description,
    details,
    canUndo,
    undoPayload,
    isUndone: false
  };
  dbState.auditLogs.unshift(entry);
  if (dbState.auditLogs.length > 300) {
    dbState.auditLogs = dbState.auditLogs.slice(0, 300);
  }
  return entry;
}
function calculateLevel(stars, rules) {
  const sorted = [...rules].sort((a, b) => b.minStars - a.minStars);
  for (const r of sorted) {
    if (stars >= r.minStars) {
      return r.level;
    }
  }
  return 1;
}
function syncMonthlyBirthdayNews(classId, specificMonth) {
  const currentClass = dbState.classes.find((c) => c.id === classId) || dbState.classInfo;
  const className = currentClass?.nameVi || "L\u1EDBp 2A5";
  const teacherName = currentClass?.teacherName || "C\xF4 Th\u1EA3o";
  const students = dbState.students.filter((s) => s.classId === classId && !s.archived);
  const monthMap = {};
  for (let m = 1; m <= 12; m++) {
    monthMap[m] = [];
  }
  students.forEach((st) => {
    const parsed = parseBirthDate(st.dob);
    if (parsed) {
      monthMap[parsed.month].push(st);
    }
  });
  const now = /* @__PURE__ */ new Date();
  const currentMonth = now.getMonth() + 1;
  const affectedMonths = [];
  let updatedCount = 0;
  const monthsToProcess = specificMonth ? [specificMonth] : Array.from({ length: 12 }, (_, i) => i + 1);
  monthsToProcess.forEach((m) => {
    const celebrants = monthMap[m];
    celebrants.sort((a, b) => {
      const pA = parseBirthDate(a.dob)?.day || 0;
      const pB = parseBirthDate(b.dob)?.day || 0;
      return pA - pB;
    });
    if (celebrants.length === 0) {
      return;
    }
    affectedMonths.push(m);
    updatedCount++;
    const title = `\u{1F382} B\u1EA3n Tin Sinh Nh\u1EADt Th\xE1ng ${m} / Month ${m} Birthday Bulletin \u2013 ${className} \u{1F389}`;
    const celebrantsListText = celebrants.map((s) => {
      const parsed = parseBirthDate(s.dob);
      const team = dbState.teams.find((t) => t.id === s.teamId);
      const teamName = team ? team.nameVi.split(":")[0] : "V\u01B0\u01A1ng qu\u1ED1c";
      const dayStr = parsed ? String(parsed.day).padStart(2, "0") : "??";
      const isToday = m === currentMonth && parsed && parsed.day === now.getDate();
      const todayBadge = isToday ? " \u{1F388} [H\xD4M NAY SINH NH\u1EACT! / BIRTHDAY TODAY!]" : "";
      return `\u2B50 Ng\xE0y ${dayStr}/${String(m).padStart(2, "0")}: ${s.fullName} (${s.studentCode} \u2022 ${teamName})${todayBadge}
   \u21B3 \u{1F48C} L\u1EDDi ch\xFAc: Ch\xFAc b\u1EA1n tu\u1ED5i m\u1EDBi lu\xF4n r\u1EA1ng r\u1EE1, ch\u0103m ngoan, h\u1ECDc gi\u1ECFi v\xE0 g\u1EB7t h\xE1i th\u1EADt nhi\u1EC1u ng\xF4i sao l\u1EA5p l\xE1nh!
   \u21B3 \u{1F1EC}\u{1F1E7} Wish: Wishing you a bright, happy new age filled with joy and sparkling stars!`;
    }).join("\n\n");
    const content = `\u{1F31F} LOA LOA LOA! TIN VUI T\u1EEA V\u01AF\u01A0NG QU\u1ED0C NG\xD4I SAO! / HAPPY BIRTHDAY FROM STAR KINGDOM! \u{1F388}\u2728
Th\xE1ng ${m} r\u1ED9n r\xE0ng ti\u1EBFng ca, c\xF4 ${teacherName} c\xF9ng c\u1EA3 l\u1EDBp ${className} xin g\u1EEDi nh\u1EEFng l\u1EDDi ch\xFAc m\u1EEBng sinh nh\u1EADt ng\u1ECDt ng\xE0o v\xE0 \u1EA5m \xE1p nh\u1EA5t t\u1EDBi ${celebrants.length} "ng\xF4i sao nh\u1ECF" \u0111\xE1ng y\xEAu c\xF3 ng\xE0y sinh trong th\xE1ng n\xE0y:
Warmest birthday wishes from ${teacherName} and ${className} to our ${celebrants.length} shining little stars born in Month ${m}:

${celebrantsListText}

\u{1F381} \u0110\u1EB6C QUY\u1EC0N SINH NH\u1EACT / BIRTHDAY PRIVILEGES:
\u2022 T\u1EB7ng ngay +10 Ng\xF4i sao danh d\u1EF1 ch\xFAc m\u1EEBng sinh nh\u1EADt v\xE0o t\xE0i kho\u1EA3n ng\xF4i sao! (+10 Honorary Birthday Stars!)
\u2022 Vinh danh \u0111\u1ED9i V\u01B0\u01A1ng mi\u1EC7n Sinh nh\u1EADt c\u1EE7a ng\xE0y & c\u1EA3 l\u1EDBp h\xF2a gi\u1ECDng b\xE0i h\xE1t Happy Birthday! (Birthday Crown & Class Song!)
\u2022 Nh\u1EADn thi\u1EC7p ch\xFAc m\u1EEBng v\u01B0\u01A1ng qu\u1ED1c r\u1EA1ng r\u1EE1 c\xF9ng nh\u1EEFng c\xE1i \xF4m \u1EA5m \xE1p t\u1EEB c\xF4 v\xE0 c\xE1c b\u1EA1n! (Kingdom Greeting Card & Warm Hugs!)

\u{1F496} Ch\xFAc c\xE1c thi\xEAn th\u1EA7n nh\u1ECF c\u1EE7a l\u1EDBp ${className} tu\u1ED5i m\u1EDBi ng\u1EADp tr\xE0n ni\u1EC1m vui, lu\xF4n t\u1EF1 tin t\u1ECFa s\xE1ng v\xE0 ch\u1EA1m t\u1EDBi nh\u1EEFng \u01B0\u1EDBc m\u01A1 tuy\u1EC7t v\u1EDDi nh\u1EA5t! / Wishing our little angels endless joy, confidence, and shining dreams! \u{1F31F}\u{1F382}\u{1F388}`;
    const birthdayImages = [
      "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80"
    ];
    const existingIndex = dbState.news.findIndex(
      (n) => n.classId === classId && !n.isDeleted && (n.tags?.includes(`Sinh nh\u1EADt th\xE1ng ${m}`) || n.title.includes(`B\u1EA3n Tin Sinh Nh\u1EADt Th\xE1ng ${m}`) || n.title.includes(`B\u1EA3n tin sinh nh\u1EADt Th\xE1ng ${m}`))
    );
    if (existingIndex !== -1) {
      const existing = dbState.news[existingIndex];
      dbState.news[existingIndex] = {
        ...existing,
        title,
        content,
        author: teacherName,
        tags: Array.from(/* @__PURE__ */ new Set([...existing.tags || [], "Sinh nh\u1EADt", `Sinh nh\u1EADt th\xE1ng ${m}`, "B\u1EA3n tin th\xE1ng", "Ch\xFAc m\u1EEBng"])),
        images: existing.images && existing.images.length > 0 ? existing.images : birthdayImages,
        imageUrl: existing.imageUrl || birthdayImages[0],
        pinned: m === currentMonth ? true : existing.pinned,
        isPinned: m === currentMonth ? true : existing.isPinned,
        isEdited: true,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: "H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng"
      };
    } else {
      const newPost = {
        id: `news_birthday_${classId}_m${m}`,
        classId,
        title,
        content,
        author: teacherName,
        date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        pinned: m === currentMonth,
        isPinned: m === currentMonth,
        tags: ["Sinh nh\u1EADt", `Sinh nh\u1EADt th\xE1ng ${m}`, "B\u1EA3n tin th\xE1ng", "Ch\xFAc m\u1EEBng"],
        likes: 16 + celebrants.length * 2,
        imageUrl: birthdayImages[0],
        images: birthdayImages,
        visibility: "all",
        isDeleted: false
      };
      dbState.news.unshift(newPost);
    }
  });
  saveDb(dbState);
  return { updatedCount, affectedMonths };
}
try {
  const demoDobMap = new Map(getDemoStudents("class_2a5").map((s) => [s.fullName, s.dob]));
  let hasUpdatedDob = false;
  const class2a5Students = dbState.students.filter((s) => s.classId === "class_2a5");
  const allIdentical = class2a5Students.length > 0 && class2a5Students.every((s) => s.dob === "2018-05-15");
  if (allIdentical) {
    dbState.students.forEach((st) => {
      if (st.classId === "class_2a5" && demoDobMap.has(st.fullName)) {
        st.dob = demoDobMap.get(st.fullName);
        hasUpdatedDob = true;
      }
    });
  }
  (dbState.classes || []).forEach((c) => {
    syncMonthlyBirthdayNews(c.id);
  });
  if (hasUpdatedDob) {
    saveDb(dbState);
  }
} catch (err) {
  console.error("Error during startup birthday news sync:", err);
}
function recordNotification(notif) {
  if (!dbState.notifications) dbState.notifications = [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const entry = {
    id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId: notif.classId,
    type: notif.type || "system",
    titleVi: notif.titleVi,
    titleEn: notif.titleEn || notif.titleVi,
    messageVi: notif.messageVi || "",
    messageEn: notif.messageEn || notif.messageVi || "",
    timestamp: notif.timestamp || now,
    createdAt: notif.createdAt || now,
    targetRole: notif.targetRole || "all",
    targetUserId: notif.targetUserId,
    authorName: notif.authorName || (dbState.classInfo ? dbState.classInfo.teacherName : "C\xF4 Th\u1EA3o"),
    metadata: notif.metadata
  };
  dbState.notifications.unshift(entry);
  if (dbState.notifications.length > 200) {
    dbState.notifications = dbState.notifications.slice(0, 200);
  }
  saveDb(dbState);
  return entry;
}
app.use("/api", (req, res, next) => {
  if (req.method === "GET") {
    if (req.path === "/audit-logs" || req.path === "/data-health") {
      return requireTeacher(req, res, next);
    }
    return next();
  }
  if (req.path.startsWith("/auth/")) {
    return next();
  }
  if (req.path === "/notifications/mark-read" || req.path === "/notifications/mark-all-read") {
    return next();
  }
  if (req.path === "/rewards/redeem") {
    return requireStudentOrTeacher(req, res, next);
  }
  return requireTeacher(req, res, next);
});
app.get("/api/state", (req, res) => {
  const current = dbState.classes.find((c) => c.id === dbState.currentClassId) || dbState.classes[0];
  dbState.classInfo = current;
  if (!dbState.notifications || !Array.isArray(dbState.notifications) || dbState.notifications.length === 0) {
    dbState.notifications = getDefaultNotifications(dbState.currentClassId || "class_2a5");
  }
  if (!dbState.notificationReads || !Array.isArray(dbState.notificationReads)) {
    dbState.notificationReads = [];
  }
  const session = extractSession(req);
  res.json({ success: true, data: sanitizeAppState(dbState, session) });
});
app.get("/api/notifications", (req, res) => {
  const classId = req.query.classId || dbState.currentClassId;
  const userId = req.query.userId || "teacher_thao";
  const classNotifications = (dbState.notifications || []).filter((n) => n.classId === classId);
  const userReads = (dbState.notificationReads || []).filter((r) => r.userId === userId && r.classId === classId);
  const readMap = /* @__PURE__ */ new Map();
  userReads.forEach((r) => readMap.set(r.notificationId, r));
  const items = classNotifications.map((notif) => {
    const readRecord = readMap.get(notif.id);
    const isRead = !!readRecord && readRecord.isRead;
    return {
      ...notif,
      isRead,
      readAt: readRecord?.readAt || null
    };
  });
  const unreadCount = items.filter((n) => !n.isRead).length;
  res.json({
    success: true,
    notifications: items,
    unreadCount,
    classId,
    userId
  });
});
app.post("/api/notifications/mark-read", (req, res) => {
  const { notificationId, userId, classId } = req.body;
  if (!notificationId || !userId) {
    res.status(400).json({ success: false, error: "Thi\u1EBFu notificationId ho\u1EB7c userId" });
    return;
  }
  const cId = classId || dbState.currentClassId;
  if (!dbState.notificationReads) dbState.notificationReads = [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existingIdx = dbState.notificationReads.findIndex(
    (r) => r.userId === userId && r.notificationId === notificationId
  );
  if (existingIdx >= 0) {
    dbState.notificationReads[existingIdx].isRead = true;
    dbState.notificationReads[existingIdx].readAt = now;
  } else {
    dbState.notificationReads.push({
      userId,
      notificationId,
      classId: cId,
      isRead: true,
      readAt: now,
      createdAt: now
    });
  }
  saveDb(dbState);
  const classNotifs = (dbState.notifications || []).filter((n) => n.classId === cId);
  const readIds = new Set(
    dbState.notificationReads.filter((r) => r.userId === userId && r.classId === cId && r.isRead).map((r) => r.notificationId)
  );
  const unreadCount = classNotifs.filter((n) => !readIds.has(n.id)).length;
  res.json({
    success: true,
    notificationId,
    userId,
    isRead: true,
    readAt: now,
    unreadCount
  });
});
app.post("/api/notifications/mark-all-read", (req, res) => {
  const { userId, classId } = req.body;
  if (!userId) {
    res.status(400).json({ success: false, error: "Thi\u1EBFu userId" });
    return;
  }
  const cId = classId || dbState.currentClassId;
  const classNotifs = (dbState.notifications || []).filter((n) => n.classId === cId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (!dbState.notificationReads) dbState.notificationReads = [];
  classNotifs.forEach((n) => {
    const existing = dbState.notificationReads.find((r) => r.userId === userId && r.notificationId === n.id);
    if (existing) {
      existing.isRead = true;
      existing.readAt = now;
    } else {
      dbState.notificationReads.push({
        userId,
        notificationId: n.id,
        classId: cId,
        isRead: true,
        readAt: now,
        createdAt: now
      });
    }
  });
  saveDb(dbState);
  res.json({ success: true, unreadCount: 0 });
});
app.post("/api/notifications", (req, res) => {
  const { classId, type, titleVi, titleEn, messageVi, messageEn, targetRole, targetUserId, authorName, metadata } = req.body;
  if (!titleVi) {
    res.status(400).json({ success: false, error: "Ti\xEAu \u0111\u1EC1 th\xF4ng b\xE1o kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    return;
  }
  const notif = recordNotification({
    classId: classId || dbState.currentClassId,
    type: type || "system",
    titleVi,
    titleEn,
    messageVi,
    messageEn,
    targetRole,
    targetUserId,
    authorName,
    metadata
  });
  res.json({ success: true, notification: notif });
});
app.post("/api/classes/switch", (req, res) => {
  const { classId } = req.body;
  const target = dbState.classes.find((c) => c.id === classId);
  if (!target) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp h\u1ECDc" });
    return;
  }
  dbState.currentClassId = target.id;
  dbState.classInfo = target;
  saveDb(dbState);
  res.json({ success: true, currentClassId: target.id, classInfo: target, data: dbState });
});
app.post("/api/classes", (req, res) => {
  const body = req.body || {};
  const cInfo = body.classInfo || body;
  const nameVi = cInfo.nameVi;
  if (!nameVi || typeof nameVi !== "string" || !nameVi.trim()) {
    res.status(400).json({ success: false, error: "T\xEAn l\u1EDBp l\xE0 b\u1EAFt bu\u1ED9c" });
    return;
  }
  const nameEn = cInfo.nameEn || nameVi;
  const grade = Number(cInfo.grade) || 2;
  const schoolYear = cInfo.schoolYear || "2026 - 2027";
  const teacherName = cInfo.teacherName || "C\xF4 Th\u1EA3o";
  const teacherTitleEn = cInfo.teacherTitleEn || "Teacher Thao";
  const targetSize = Number(cInfo.targetSize) || 28;
  const sloganVi = cInfo.sloganVi || "M\u1ED7i ng\xE0y vui h\u1ECDc \u2013 M\u1ED7i ng\xE0y t\u1ECFa s\xE1ng!";
  const sloganEn = cInfo.sloganEn || "Learn Happy, Shine Bright!";
  const coverUrl = cInfo.coverUrl || "";
  const bannerTheme = cInfo.bannerTheme || "star_kingdom_default";
  const newId = `class_${Date.now()}`;
  const newClass = {
    id: newId,
    nameVi: nameVi.trim(),
    nameEn: nameEn.trim(),
    grade,
    schoolYear: schoolYear.trim(),
    teacherName: teacherName.trim(),
    teacherTitleEn: teacherTitleEn.trim(),
    teacherAvatar: "/assets/kingdom/teacher_avatar.png",
    targetSize,
    sloganVi: sloganVi.trim(),
    sloganEn: sloganEn.trim(),
    coverUrl,
    bannerTheme,
    isArchived: false
  };
  dbState.classes.push(newClass);
  if (Array.isArray(body.teams) && body.teams.length > 0) {
    body.teams.forEach((tm, idx) => {
      dbState.teams.push({
        id: `${newId}_team_${idx + 1}`,
        classId: newId,
        nameVi: tm.nameVi || `T\u1ED5 ${idx + 1}`,
        nameEn: tm.nameEn || `Team ${idx + 1}`,
        color: tm.color || "#3B82F6",
        bgColor: tm.bgColor || "#EFF6FF",
        borderColor: tm.borderColor || "#93C5FD",
        flagColor: tm.flagColor || "blue",
        mascot: tm.mascot || `Linh v\u1EADt ${idx + 1}`,
        points: 0
      });
    });
  } else {
    const numTeams = Number(body.teamsCount) || 4;
    const teamConfigs = [
      { nameVi: "T\u1ED5 1: Ng\xF4i Sao \u0110\u1ECF", nameEn: "Team 1: Red Stars", color: "#EF4444", bgColor: "#FEF2F2", borderColor: "#FCA5A5", flagColor: "red", mascot: "L\u1EEDa Nhi\u1EC7t Huy\u1EBFt" },
      { nameVi: "T\u1ED5 2: Ng\xF4i Sao Xanh", nameEn: "Team 2: Blue Stars", color: "#3B82F6", bgColor: "#EFF6FF", borderColor: "#93C5FD", flagColor: "blue", mascot: "Bi\u1EC3n Th\xF4ng Th\xE1i" },
      { nameVi: "T\u1ED5 3: Ng\xF4i Sao V\xE0ng", nameEn: "Team 3: Golden Stars", color: "#EAB308", bgColor: "#FEFCE8", borderColor: "#FDE047", flagColor: "gold", mascot: "M\u1EB7t Tr\u1EDDi T\u1ECFa S\xE1ng" },
      { nameVi: "T\u1ED5 4: Ng\xF4i Sao L\xE1", nameEn: "Team 4: Green Stars", color: "#22C55E", bgColor: "#F0FDF4", borderColor: "#86EFAC", flagColor: "green", mascot: "M\u1EA7m C\xE2y Hy V\u1ECDng" }
    ];
    for (let i = 0; i < numTeams; i++) {
      const base = teamConfigs[i % teamConfigs.length];
      dbState.teams.push({
        id: `${newId}_team_${i + 1}`,
        classId: newId,
        nameVi: base.nameVi,
        nameEn: base.nameEn,
        color: base.color,
        bgColor: base.bgColor,
        borderColor: base.borderColor,
        flagColor: base.flagColor,
        mascot: base.mascot,
        points: 0
      });
    }
  }
  if (Array.isArray(body.initialStudents) && body.initialStudents.length > 0) {
    const classShortCode = nameVi.replace(/\s+/g, "").toUpperCase();
    body.initialStudents.forEach((st, idx) => {
      const studentCode = st.studentCode || `${classShortCode}${(idx + 1).toString().padStart(2, "0")}`;
      const teamId = `${newId}_team_${idx % 4 + 1}`;
      dbState.students.push({
        id: `${newId}_student_${Date.now()}_${idx}`,
        classId: newId,
        studentCode,
        fullName: st.fullName || `H\u1ECDc sinh ${idx + 1}`,
        gender: st.gender || (idx % 2 === 0 ? "male" : "female"),
        teamId,
        avatarUrl: st.gender === "female" ? "/assets/kingdom/student_ngoc.png" : "/assets/kingdom/student_minh.png",
        totalEarnedStars: 0,
        spendableStars: 0,
        weeklyStars: 0,
        monthlyStars: 0,
        level: 1,
        badgeIds: [],
        passcode: "2026"
      });
    });
  }
  dbState.currentClassId = newId;
  dbState.classInfo = newClass;
  saveDb(dbState);
  recordAuditLog(newId, "class_archive", teacherName || "C\xF4 Th\u1EA3o", `T\u1EA1o l\u1EDBp m\u1EDBi: ${nameVi} (${schoolYear})`);
  res.json({ success: true, newClass, data: dbState });
});
app.put("/api/classes/:id", (req, res) => {
  const { id } = req.params;
  const target = dbState.classes.find((c) => c.id === id);
  if (!target) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp h\u1ECDc" });
    return;
  }
  const { nameVi, nameEn, grade, schoolYear, teacherName, sloganVi, sloganEn, coverUrl, targetSize } = req.body;
  if (nameVi) target.nameVi = nameVi.trim();
  if (nameEn) target.nameEn = nameEn.trim();
  if (grade !== void 0) target.grade = Number(grade);
  if (schoolYear) target.schoolYear = schoolYear.trim();
  if (teacherName) target.teacherName = teacherName.trim();
  if (sloganVi) target.sloganVi = sloganVi.trim();
  if (sloganEn) target.sloganEn = sloganEn.trim();
  if (coverUrl !== void 0) target.coverUrl = coverUrl;
  if (targetSize !== void 0) target.targetSize = Number(targetSize);
  if (target.id === dbState.currentClassId) {
    dbState.classInfo = target;
  }
  saveDb(dbState);
  recordAuditLog(target.id, "student_edit", target.teacherName, `Ch\u1EC9nh s\u1EEDa th\xF4ng tin l\u1EDBp: ${target.nameVi}`);
  res.json({ success: true, classInfo: target, data: dbState });
});
app.post("/api/classes/archive", (req, res) => {
  const { classId } = req.body;
  const target = dbState.classes.find((c) => c.id === classId);
  if (!target) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp h\u1ECDc \u0111\u1EC3 l\u01B0u tr\u1EEF" });
    return;
  }
  target.isArchived = true;
  target.archivedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (dbState.currentClassId === classId) {
    const activeClass = dbState.classes.find((c) => !c.isArchived && c.id !== classId);
    if (activeClass) {
      dbState.currentClassId = activeClass.id;
      dbState.classInfo = activeClass;
    }
  }
  saveDb(dbState);
  recordAuditLog(target.id, "class_archive", target.teacherName, `L\u01B0u tr\u1EEF l\u1EDBp: ${target.nameVi}`);
  res.json({ success: true, message: `\u0110\xE3 l\u01B0u tr\u1EEF l\u1EDBp ${target.nameVi} an to\xE0n`, classInfo: target, data: dbState });
});
app.post("/api/classes/restore", (req, res) => {
  const { classId } = req.body;
  const target = dbState.classes.find((c) => c.id === classId);
  if (!target) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp h\u1ECDc \u0111\u1EC3 kh\xF4i ph\u1EE5c" });
    return;
  }
  target.isArchived = false;
  delete target.archivedAt;
  dbState.currentClassId = target.id;
  dbState.classInfo = target;
  saveDb(dbState);
  recordAuditLog(target.id, "class_restore", target.teacherName, `Kh\xF4i ph\u1EE5c l\u1EDBp ho\u1EA1t \u0111\u1ED9ng: ${target.nameVi}`);
  res.json({ success: true, message: `\u0110\xE3 kh\xF4i ph\u1EE5c l\u1EDBp ${target.nameVi}`, classInfo: target, data: dbState });
});
app.delete("/api/classes/:id", (req, res) => {
  const { id } = req.params;
  const { confirmClassName, permanent } = req.body || {};
  const target = dbState.classes.find((c) => c.id === id);
  if (!target) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp h\u1ECDc" });
    return;
  }
  if (dbState.classes.length <= 1) {
    res.status(400).json({ success: false, error: "Kh\xF4ng th\u1EC3 x\xF3a l\u1EDBp duy nh\u1EA5t trong v\u01B0\u01A1ng qu\u1ED1c. H\xE3y t\u1EA1o th\xEAm m\u1ED9t l\u1EDBp m\u1EDBi tr\u01B0\u1EDBc!" });
    return;
  }
  if (confirmClassName && confirmClassName.trim().toLowerCase() !== target.nameVi.trim().toLowerCase()) {
    res.status(400).json({ success: false, error: `T\xEAn l\u1EDBp x\xE1c nh\u1EADn kh\xF4ng kh\u1EDBp. Vui l\xF2ng nh\u1EADp ch\xEDnh x\xE1c "${target.nameVi}"` });
    return;
  }
  if (permanent) {
    dbState.classes = dbState.classes.filter((c) => c.id !== id);
    dbState.students = dbState.students.filter((s) => s.classId !== id);
    dbState.teams = dbState.teams.filter((t) => t.classId !== id);
    dbState.starTransactions = dbState.starTransactions.filter((tx) => tx.classId !== id);
    dbState.news = dbState.news.filter((n) => n.classId !== id);
    if (dbState.finalizedResults) {
      dbState.finalizedResults = dbState.finalizedResults.filter((r) => r.classId !== id);
    }
    Object.keys(dbState.attendance).forEach((key) => {
      if (dbState.attendance[key]?.classId === id || key.startsWith(`${id}_`)) {
        delete dbState.attendance[key];
      }
    });
    if (dbState.currentClassId === id) {
      const nextActive = dbState.classes.find((c) => !c.isArchived) || dbState.classes[0];
      if (nextActive) {
        dbState.currentClassId = nextActive.id;
        dbState.classInfo = nextActive;
      }
    }
    saveDb(dbState);
    recordAuditLog(id, "student_delete", target.teacherName, `X\xF3a v\u0129nh vi\u1EC5n l\u1EDBp: ${target.nameVi}`);
    res.json({ success: true, message: `\u0110\xE3 x\xF3a v\u0129nh vi\u1EC5n l\u1EDBp ${target.nameVi} v\xE0 to\xE0n b\u1ED9 d\u1EEF li\u1EC7u li\xEAn quan`, data: dbState });
  } else {
    const activeRemaining = dbState.classes.filter((c) => !c.isArchived && c.id !== id);
    if (activeRemaining.length === 0 && !target.isArchived) {
      res.status(400).json({ success: false, error: "Kh\xF4ng th\u1EC3 l\u01B0u kho l\u1EDBp duy nh\u1EA5t \u0111ang ho\u1EA1t \u0111\u1ED9ng. H\xE3y k\xEDch ho\u1EA1t ho\u1EB7c t\u1EA1o th\xEAm m\u1ED9t l\u1EDBp kh\xE1c tr\u01B0\u1EDBc!" });
      return;
    }
    target.isArchived = true;
    target.archivedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (dbState.currentClassId === id) {
      const nextActive = dbState.classes.find((c) => !c.isArchived && c.id !== id) || dbState.classes[0];
      if (nextActive) {
        dbState.currentClassId = nextActive.id;
        dbState.classInfo = nextActive;
      }
    }
    saveDb(dbState);
    recordAuditLog(id, "class_archive", target.teacherName, `L\u01B0u kho an to\xE0n l\u1EDBp: ${target.nameVi}`);
    res.json({ success: true, message: `\u0110\xE3 l\u01B0u kho l\u1EDBp ${target.nameVi}`, data: dbState });
  }
});
app.post("/api/classes/transition", (req, res) => {
  const { sourceClassId, newNameVi, newNameEn, newGrade, newSchoolYear, studentIdsToPromote, carryOverStars } = req.body;
  const sourceClass = dbState.classes.find((c) => c.id === sourceClassId);
  if (!sourceClass) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp ngu\u1ED3n" });
    return;
  }
  const newClassId = `class_${Date.now()}`;
  const newClass = {
    id: newClassId,
    nameVi: newNameVi || `${sourceClass.nameVi} (${newSchoolYear})`,
    nameEn: newNameEn || newNameVi || `${sourceClass.nameEn} (${newSchoolYear})`,
    grade: Number(newGrade) || sourceClass.grade + 1,
    schoolYear: newSchoolYear || "2027 - 2028",
    teacherName: sourceClass.teacherName,
    teacherTitleEn: sourceClass.teacherTitleEn,
    teacherAvatar: sourceClass.teacherAvatar,
    targetSize: sourceClass.targetSize,
    sloganVi: sourceClass.sloganVi,
    sloganEn: sourceClass.sloganEn,
    coverUrl: sourceClass.coverUrl,
    bannerTheme: sourceClass.bannerTheme,
    isArchived: false
  };
  dbState.classes.push(newClass);
  const teamConfigs = [
    { nameVi: "T\u1ED5 1: Ng\xF4i Sao \u0110\u1ECF", nameEn: "Team 1: Red Stars", color: "#EF4444", bgColor: "#FEF2F2", borderColor: "#FCA5A5", flagColor: "red", mascot: "L\u1EEDa Nhi\u1EC7t Huy\u1EBFt" },
    { nameVi: "T\u1ED5 2: Ng\xF4i Sao Xanh", nameEn: "Team 2: Blue Stars", color: "#3B82F6", bgColor: "#EFF6FF", borderColor: "#93C5FD", flagColor: "blue", mascot: "Bi\u1EC3n Th\xF4ng Th\xE1i" },
    { nameVi: "T\u1ED5 3: Ng\xF4i Sao V\xE0ng", nameEn: "Team 3: Golden Stars", color: "#EAB308", bgColor: "#FEFCE8", borderColor: "#FDE047", flagColor: "gold", mascot: "M\u1EB7t Tr\u1EDDi T\u1ECFa S\xE1ng" },
    { nameVi: "T\u1ED5 4: Ng\xF4i Sao L\xE1", nameEn: "Team 4: Green Stars", color: "#22C55E", bgColor: "#F0FDF4", borderColor: "#86EFAC", flagColor: "green", mascot: "M\u1EA7m C\xE2y Hy V\u1ECDng" }
  ];
  for (let i = 0; i < 4; i++) {
    const base = teamConfigs[i];
    dbState.teams.push({
      id: `${newClassId}_team_${i + 1}`,
      classId: newClassId,
      nameVi: base.nameVi,
      nameEn: base.nameEn,
      color: base.color,
      bgColor: base.bgColor,
      borderColor: base.borderColor,
      flagColor: base.flagColor,
      mascot: base.mascot,
      points: 0
    });
  }
  const sourceStudents = dbState.students.filter((s) => s.classId === sourceClassId);
  const toPromote = Array.isArray(studentIdsToPromote) && studentIdsToPromote.length > 0 ? sourceStudents.filter((s) => studentIdsToPromote.includes(s.id)) : sourceStudents;
  toPromote.forEach((orig, idx) => {
    const baseStars = carryOverStars ? orig.totalEarnedStars : 0;
    const promoted = {
      ...orig,
      id: `${newClassId}_student_${Date.now()}_${idx}`,
      classId: newClassId,
      studentCode: orig.studentCode.replace(sourceClass.nameVi.replace(/\s+/g, ""), newClass.nameVi.replace(/\s+/g, "")),
      teamId: `${newClassId}_team_${idx % 4 + 1}`,
      totalEarnedStars: baseStars,
      spendableStars: carryOverStars ? orig.spendableStars : 0,
      weeklyStars: 0,
      monthlyStars: 0,
      level: calculateLevel(baseStars, dbState.levelRules),
      badgeIds: carryOverStars ? orig.badgeIds : []
    };
    dbState.students.push(promoted);
  });
  dbState.currentClassId = newClassId;
  dbState.classInfo = newClass;
  saveDb(dbState);
  recordAuditLog(newClassId, "class_archive", sourceClass.teacherName, `Chuy\u1EC3n n\u0103m h\u1ECDc: Kh\u1EDFi t\u1EA1o ${newClass.nameVi} (${newClass.schoolYear}) t\u1EEB ${sourceClass.nameVi}`);
  res.json({ success: true, newClass, data: dbState });
});
app.get("/api/time-config", (_req, res) => {
  res.json({ success: true, academicConfig: dbState.academicConfig });
});
app.put("/api/time-config", (req, res) => {
  const { academicConfig, role } = req.body;
  const headerRole = req.headers["x-user-role"];
  if (role === "student" || headerRole === "student") {
    res.status(403).json({ success: false, error: "Ch\u1EC9 gi\xE1o vi\xEAn/qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n c\u1EA5u h\xECnh l\u1ECBch n\u0103m h\u1ECDc" });
    return;
  }
  if (academicConfig) {
    const startDate = (academicConfig.week1StartDate || academicConfig.startDate || dbState.academicConfig?.startDate || "2026-09-07").trim();
    const totalWeeks = Math.max(1, Math.min(52, Number(academicConfig.totalWeeks ?? dbState.academicConfig?.totalWeeks ?? 36)));
    dbState.academicConfig = {
      ...dbState.academicConfig,
      ...academicConfig,
      startDate,
      week1StartDate: startDate,
      totalWeeks
    };
    saveDb(dbState);
    recordAuditLog(dbState.currentClassId, "student_edit", dbState.classInfo.teacherName, `C\u1EADp nh\u1EADt c\u1EA5u h\xECnh n\u0103m h\u1ECDc & h\u1ECDc k\u1EF3: ${dbState.academicConfig?.schoolYear || ""} (${totalWeeks} tu\u1EA7n, b\u1EAFt \u0111\u1EA7u ${startDate})`);
  }
  res.json({ success: true, academicConfig: dbState.academicConfig });
});
app.get("/api/finalize-results", (_req, res) => {
  const list = (dbState.finalizedResults || []).filter((r) => r.classId === dbState.currentClassId);
  res.json({ success: true, finalizedResults: list });
});
app.post("/api/finalize-results", (req, res) => {
  const { period, periodLabel, notes, studentRankings, teamRankings } = req.body;
  const cId = dbState.currentClassId;
  const result = {
    id: `final_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId: cId,
    period: period || "week",
    periodLabel: periodLabel || "Tu\u1EA7n n\xE0y",
    academicYear: dbState.academicConfig?.schoolYear || dbState.classInfo.schoolYear,
    finalizedAt: (/* @__PURE__ */ new Date()).toISOString(),
    finalizedBy: dbState.classInfo.teacherName,
    notes: notes || "",
    summary: {
      totalStarsAwarded: (studentRankings || []).reduce((acc, s) => acc + (s.stars || 0), 0),
      totalTransactions: dbState.starTransactions.filter((tx) => tx.classId === cId).length,
      studentRankings: studentRankings || [],
      teamRankings: teamRankings || []
    }
  };
  if (!dbState.finalizedResults) dbState.finalizedResults = [];
  dbState.finalizedResults.unshift(result);
  saveDb(dbState);
  recordAuditLog(cId, "finalize_results", dbState.classInfo.teacherName, `Ch\u1ED1t k\u1EBFt qu\u1EA3 thi \u0111ua ${result.periodLabel}: ${result.summary.totalStarsAwarded} sao \u0111\xE3 vinh danh`);
  res.json({ success: true, finalizedResult: result });
});
app.get("/api/audit-logs", (_req, res) => {
  const logs = (dbState.auditLogs || []).filter((a) => a.classId === dbState.currentClassId);
  res.json({ success: true, auditLogs: logs });
});
app.post("/api/audit-logs/undo", (req, res) => {
  const { auditLogId } = req.body;
  const log = (dbState.auditLogs || []).find((a) => a.id === auditLogId);
  if (!log) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y nh\u1EADt k\xFD thao t\xE1c" });
    return;
  }
  if (!log.canUndo || log.isUndone || !log.undoPayload) {
    res.status(400).json({ success: false, error: "Thao t\xE1c n\xE0y kh\xF4ng th\u1EC3 ho\xE0n t\xE1c ho\u1EB7c \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n t\xE1c" });
    return;
  }
  if (log.action === "team_reset" || log.undoPayload?.type === "team_reset") {
    const teamsSnapshot = log.undoPayload?.teamsSnapshot;
    if (Array.isArray(teamsSnapshot)) {
      teamsSnapshot.forEach((snap) => {
        const team = dbState.teams.find((t) => t.id === snap.id);
        if (team) {
          team.points = snap.points ?? team.points;
          team.weeklyPoints = snap.weeklyPoints ?? team.weeklyPoints;
          team.monthlyPoints = snap.monthlyPoints ?? team.monthlyPoints;
          team.semester1Points = snap.semester1Points ?? team.semester1Points;
          team.semester2Points = snap.semester2Points ?? team.semester2Points;
        }
      });
      const revTx = {
        id: `tx_rev_team_${Date.now()}`,
        classId: log.classId,
        studentId: "",
        studentName: "Thi \u0111ua c\xE1c t\u1ED5",
        deltaStars: 0,
        teamId: "",
        reasonCategory: "Ho\xE0n t\xE1c",
        reasonNote: `Ho\xE0n t\xE1c th\xE0nh c\xF4ng: Ph\u1EE5c h\u1ED3i \u0111i\u1EC3m thi \u0111ua c\xE1c t\u1ED5`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: log.actor || dbState.classInfo.teacherName
      };
      dbState.starTransactions.unshift(revTx);
    }
    log.isUndone = true;
    saveDb(dbState);
    res.json({ success: true, message: "\u0110\xE3 ho\xE0n t\xE1c \u0111\u1EB7t l\u1EA1i \u0111i\u1EC3m t\u1ED5 th\xE0nh c\xF4ng!", auditLog: log, data: dbState, teams: dbState.teams });
    return;
  }
  const { studentId, deltaStars } = log.undoPayload;
  const student = dbState.students.find((s) => s.id === studentId);
  if (student) {
    student.totalEarnedStars = Math.max(0, student.totalEarnedStars - deltaStars);
    student.spendableStars = Math.max(0, student.spendableStars - deltaStars);
    student.weeklyStars = Math.max(0, (student.weeklyStars || 0) - deltaStars);
    student.monthlyStars = Math.max(0, (student.monthlyStars || 0) - deltaStars);
    student.level = calculateLevel(student.totalEarnedStars, dbState.levelRules);
    if (student.teamId) {
      const team = dbState.teams.find((t) => t.id === student.teamId);
      if (team) {
        team.points = Math.max(0, team.points - deltaStars);
        if (deltaStars > 0) {
          team.weeklyPoints = Math.max(0, (team.weeklyPoints || 0) - deltaStars);
        }
      }
    }
    const reversalTx = {
      id: `tx_rev_${Date.now()}`,
      classId: student.classId,
      studentId: student.id,
      studentName: student.fullName,
      deltaStars: -deltaStars,
      teamId: student.teamId,
      reasonCategory: "Ho\xE0n t\xE1c",
      reasonNote: `Ho\xE0n t\xE1c thao t\xE1c: ${log.description}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: dbState.classInfo.teacherName
    };
    dbState.starTransactions.unshift(reversalTx);
  }
  log.isUndone = true;
  saveDb(dbState);
  res.json({ success: true, message: "\u0110\xE3 ho\xE0n t\xE1c thao t\xE1c th\xE0nh c\xF4ng", auditLog: log, data: dbState });
});
app.get("/api/data-health", (_req, res) => {
  const cId = dbState.currentClassId;
  const classStudents = dbState.students.filter((s) => s.classId === cId);
  const classTeams = dbState.teams.filter((t) => t.classId === cId);
  const issues = [];
  const seenCodes = /* @__PURE__ */ new Set();
  const duplicateCodes = [];
  classStudents.forEach((s) => {
    if (seenCodes.has(s.studentCode)) duplicateCodes.push(s.studentCode);
    else seenCodes.add(s.studentCode);
  });
  if (duplicateCodes.length > 0) {
    issues.push({
      type: "warning",
      title: "M\xE3 h\u1ECDc sinh tr\xF9ng l\u1EB7p",
      message: `Ph\xE1t hi\u1EC7n ${duplicateCodes.length} m\xE3 h\u1ECDc sinh b\u1ECB tr\xF9ng trong l\u1EDBp: ${duplicateCodes.join(", ")}`,
      count: duplicateCodes.length,
      autoFixable: false
    });
  }
  const unassigned = classStudents.filter((s) => !s.teamId || !classTeams.some((t) => t.id === s.teamId));
  if (unassigned.length > 0) {
    issues.push({
      type: "warning",
      title: "H\u1ECDc sinh ch\u01B0a ph\xE2n t\u1ED5",
      message: `C\xF3 ${unassigned.length} h\u1ECDc sinh ch\u01B0a \u0111\u01B0\u1EE3c ph\xE2n v\xE0o t\u1ED5 n\xE0o`,
      count: unassigned.length,
      autoFixable: true,
      fixAction: "assign_teams"
    });
  }
  const missingAvatars = classStudents.filter((s) => !s.avatarUrl || s.avatarUrl.trim() === "");
  if (missingAvatars.length > 0) {
    issues.push({
      type: "info",
      title: "H\u1ECDc sinh ch\u01B0a c\xF3 \u1EA3nh \u0111\u1EA1i di\u1EC7n",
      message: `C\xF3 ${missingAvatars.length} h\u1ECDc sinh \u0111ang d\xF9ng h\xECnh \u0111\u1EA1i di\u1EC7n m\u1EB7c \u0111\u1ECBnh`,
      count: missingAvatars.length,
      autoFixable: false
    });
  }
  const inconsistent = classStudents.filter((s) => s.spendableStars > s.totalEarnedStars);
  if (inconsistent.length > 0) {
    issues.push({
      type: "error",
      title: "S\u1ED1 sao kh\u1EA3 d\u1EE5ng kh\xF4ng h\u1EE3p l\u1EC7",
      message: `C\xF3 ${inconsistent.length} h\u1ECDc sinh c\xF3 s\u1ED1 sao kh\u1EA3 d\u1EE5ng l\u1EDBn h\u01A1n t\u1ED5ng sao t\xEDch l\u0169y`,
      count: inconsistent.length,
      autoFixable: true,
      fixAction: "fix_stars"
    });
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const todayAtt = dbState.attendance[`${cId}_${today}`] || dbState.attendance[today];
  const hasAttendanceToday = todayAtt && Object.keys(todayAtt.records || {}).length > 0;
  if (!hasAttendanceToday) {
    issues.push({
      type: "info",
      title: "Ch\u01B0a \u0111i\u1EC3m danh h\xF4m nay",
      message: `L\u1EDBp ${dbState.classInfo.nameVi} ch\u01B0a th\u1EF1c hi\u1EC7n \u0111i\u1EC3m danh bu\u1ED5i h\u1ECDc h\xF4m nay`,
      count: 1,
      autoFixable: false
    });
  }
  const healthScore = Math.max(40, 100 - issues.filter((i) => i.type === "error").length * 25 - issues.filter((i) => i.type === "warning").length * 10);
  res.json({
    success: true,
    healthScore,
    totalStudents: classStudents.length,
    totalTeams: classTeams.length,
    issues
  });
});
var DEFAULT_SCHOOL_LOGO = "/assets/kingdom/school_logo_v2.png";
function validateSchoolLogoUrl(logoUrl) {
  if (logoUrl === void 0 || logoUrl === null || logoUrl === "" || logoUrl === "default") {
    return { valid: true, normalizedUrl: DEFAULT_SCHOOL_LOGO };
  }
  if (typeof logoUrl !== "string") {
    return { valid: false, normalizedUrl: DEFAULT_SCHOOL_LOGO, error: "\u0110\u1ECBnh d\u1EA1ng \u0111\u01B0\u1EDDng d\u1EABn logo kh\xF4ng h\u1EE3p l\u1EC7" };
  }
  const trimmed = logoUrl.trim();
  if (!trimmed) {
    return { valid: true, normalizedUrl: DEFAULT_SCHOOL_LOGO };
  }
  if (trimmed.startsWith("blob:") || trimmed.startsWith("file://") || /^[a-zA-Z]:\\/.test(trimmed) || trimmed.startsWith("/tmp/")) {
    return {
      valid: false,
      normalizedUrl: DEFAULT_SCHOOL_LOGO,
      error: "Kh\xF4ng \u0111\u01B0\u1EE3c l\u01B0u \u0111\u01B0\u1EDDng d\u1EABn t\u1EA1m c\u1EE5c b\u1ED9 (blob:/file://). Vui l\xF2ng t\u1EA3i \u1EA3nh PNG, JPG ho\u1EB7c WebP h\u1EE3p l\u1EC7."
    };
  }
  if (trimmed.startsWith("data:")) {
    const dataMatch = trimmed.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!dataMatch) {
      return {
        valid: false,
        normalizedUrl: DEFAULT_SCHOOL_LOGO,
        error: "\u0110\u1ECBnh d\u1EA1ng \u1EA3nh kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3. Vui l\xF2ng ch\u1ECDn \u1EA3nh PNG, JPG ho\u1EB7c WebP h\u1EE3p l\u1EC7."
      };
    }
    const base64Data = dataMatch[2].replace(/\s+/g, "");
    if (base64Data.length < 16) {
      return {
        valid: false,
        normalizedUrl: DEFAULT_SCHOOL_LOGO,
        error: "D\u1EEF li\u1EC7u \u1EA3nh b\u1ECB r\u1ED7ng ho\u1EB7c h\u01B0 h\u1ECFng."
      };
    }
    const approxBytes = Math.floor(base64Data.length * 3 / 4);
    if (approxBytes > 5 * 1024 * 1024) {
      return {
        valid: false,
        normalizedUrl: DEFAULT_SCHOOL_LOGO,
        error: "Dung l\u01B0\u1EE3ng \u1EA3nh v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n 5MB. Vui l\xF2ng ch\u1ECDn ho\u1EB7c c\u1EAFt \u1EA3nh nh\u1ECF h\u01A1n."
      };
    }
    return { valid: true, normalizedUrl: trimmed };
  }
  if (trimmed.startsWith("/assets/") || trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return { valid: true, normalizedUrl: trimmed };
  }
  return {
    valid: false,
    normalizedUrl: DEFAULT_SCHOOL_LOGO,
    error: "\u0110\u1ECBnh d\u1EA1ng logo kh\xF4ng h\u1EE3p l\u1EC7. Ch\u1EC9 ch\u1EA5p nh\u1EADn PNG, JPG, WebP ho\u1EB7c \u0111\u01B0\u1EDDng d\u1EABn t\xE0i nguy\xEAn h\u1EC7 th\u1ED1ng."
  };
}
app.put("/api/settings", (req, res) => {
  const { school, classInfo, kingdomAvatarUrl, sidebarMascotUrl, role } = req.body;
  const headerRole = req.headers["x-user-role"];
  if (role === "student" || headerRole === "student") {
    res.status(403).json({ success: false, error: "Ch\u1EC9 gi\xE1o vi\xEAn/qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n ch\u1EC9nh s\u1EEDa c\xE0i \u0111\u1EB7t tr\u01B0\u1EDDng h\u1ECDc" });
    return;
  }
  if (school) {
    if (school.logoUrl !== void 0) {
      const check = validateSchoolLogoUrl(school.logoUrl);
      if (!check.valid) {
        res.status(400).json({ success: false, error: check.error });
        return;
      }
      school.logoUrl = check.normalizedUrl;
    }
    dbState.school = { ...dbState.school, ...school };
  }
  if (kingdomAvatarUrl !== void 0) {
    dbState.kingdomAvatarUrl = kingdomAvatarUrl;
  }
  if (sidebarMascotUrl !== void 0) {
    dbState.sidebarMascotUrl = sidebarMascotUrl;
  }
  if (classInfo) {
    const idx = dbState.classes.findIndex((c) => c.id === (classInfo.id || dbState.currentClassId));
    if (idx !== -1) {
      dbState.classes[idx] = { ...dbState.classes[idx], ...classInfo };
      if (dbState.classes[idx].id === dbState.currentClassId) {
        dbState.classInfo = dbState.classes[idx];
      }
    }
  }
  saveDb(dbState);
  res.json({
    success: true,
    data: {
      school: dbState.school,
      classInfo: dbState.classInfo,
      kingdomAvatarUrl: dbState.kingdomAvatarUrl,
      sidebarMascotUrl: dbState.sidebarMascotUrl
    }
  });
});
app.post("/api/kingdom-avatar", (req, res) => {
  const { avatarUrl } = req.body;
  dbState.kingdomAvatarUrl = avatarUrl || "/assets/kingdom/sidebar_logo.png";
  saveDb(dbState);
  res.json({ success: true, kingdomAvatarUrl: dbState.kingdomAvatarUrl });
});
app.post("/api/school-logo", (req, res) => {
  const { logoUrl, role } = req.body;
  const headerRole = req.headers["x-user-role"];
  if (role === "student" || headerRole === "student") {
    res.status(403).json({ success: false, error: "Ch\u1EC9 gi\xE1o vi\xEAn/qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n thay \u0111\u1ED5i logo tr\u01B0\u1EDDng h\u1ECDc" });
    return;
  }
  const check = validateSchoolLogoUrl(logoUrl);
  if (!check.valid) {
    res.status(400).json({ success: false, error: check.error });
    return;
  }
  dbState.school.logoUrl = check.normalizedUrl;
  saveDb(dbState);
  recordAuditLog(
    dbState.currentClassId,
    "student_edit",
    dbState.classInfo?.teacherName || "C\xF4 Th\u1EA3o",
    check.normalizedUrl === DEFAULT_SCHOOL_LOGO ? "Kh\xF4i ph\u1EE5c logo tr\u01B0\u1EDDng h\u1ECDc v\u1EC1 m\u1EB7c \u0111\u1ECBnh" : "C\u1EADp nh\u1EADt logo tr\u01B0\u1EDDng h\u1ECDc m\u1EDBi"
  );
  res.json({
    success: true,
    message: check.normalizedUrl === DEFAULT_SCHOOL_LOGO ? "\u0110\xE3 kh\xF4i ph\u1EE5c logo tr\u01B0\u1EDDng h\u1ECDc m\u1EB7c \u0111\u1ECBnh th\xE0nh c\xF4ng!" : "\u0110\xE3 c\u1EADp nh\u1EADt v\xE0 \u0111\u1ED3ng b\u1ED9 logo tr\u01B0\u1EDDng h\u1ECDc th\xE0nh c\xF4ng!",
    logoUrl: dbState.school.logoUrl,
    school: dbState.school
  });
});
app.post("/api/sidebar-mascot", (req, res) => {
  const { mascotUrl } = req.body;
  dbState.sidebarMascotUrl = mascotUrl || "/assets/kingdom/sidebar_mascot.png";
  saveDb(dbState);
  res.json({ success: true, sidebarMascotUrl: dbState.sidebarMascotUrl });
});
app.post("/api/class/reset-demo", (req, res) => {
  const { mode } = req.body;
  const cId = dbState.currentClassId;
  if (mode === "demo28") {
    dbState.students = dbState.students.filter((s) => s.classId !== cId).concat(getDemoStudents(cId));
    const classTeams = dbState.teams.filter((t) => t.classId === cId);
    if (classTeams.length >= 4) {
      classTeams[0].points = 256;
      classTeams[1].points = 289;
      classTeams[2].points = 241;
      classTeams[3].points = 198;
    }
  } else {
    dbState.students = dbState.students.filter((s) => s.classId !== cId);
    dbState.teams.filter((t) => t.classId === cId).forEach((t) => {
      t.points = 0;
    });
  }
  syncMonthlyBirthdayNews(cId);
  saveDb(dbState);
  res.json({ success: true, count: dbState.students.filter((s) => s.classId === cId).length, data: dbState });
});
app.post("/api/students", (req, res) => {
  const newStudent = req.body;
  if (!newStudent.fullName) {
    res.status(400).json({ success: false, error: "T\xEAn h\u1ECDc sinh kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    return;
  }
  const cId = newStudent.classId || dbState.currentClassId;
  const currentClassStudents = dbState.students.filter((s) => s.classId === cId);
  const id = newStudent.id || `${cId}_student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const code = newStudent.studentCode || `2A5${(currentClassStudents.length + 1).toString().padStart(2, "0")}`;
  const student = {
    id,
    classId: cId,
    studentCode: code,
    fullName: newStudent.fullName.trim(),
    gender: newStudent.gender || "male",
    teamId: newStudent.teamId || "",
    avatarUrl: newStudent.avatarUrl || (newStudent.gender === "female" ? "/assets/kingdom/student_ngoc.png" : "/assets/kingdom/student_minh.png"),
    dob: newStudent.dob ? newStudent.dob.trim() : "2018-01-01",
    notes: newStudent.notes || "",
    totalEarnedStars: newStudent.totalEarnedStars || 0,
    spendableStars: newStudent.spendableStars || 0,
    weeklyStars: 0,
    monthlyStars: 0,
    level: 1,
    badgeIds: [],
    passcode: newStudent.passcode || "2026"
  };
  dbState.students.push(student);
  syncMonthlyBirthdayNews(cId);
  saveDb(dbState);
  res.json({ success: true, student, data: dbState });
});
app.post("/api/students/import", (req, res) => {
  const { studentsList, clearExisting, classId } = req.body;
  if (!Array.isArray(studentsList) || studentsList.length === 0) {
    res.status(400).json({ success: false, error: "Danh s\xE1ch h\u1ECDc sinh kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  const targetClassId = classId || dbState.currentClassId;
  if (clearExisting) {
    dbState.students = dbState.students.filter((s) => s.classId !== targetClassId);
  }
  const classTeams = dbState.teams.filter((t) => t.classId === targetClassId);
  let addedCount = 0;
  studentsList.forEach((raw, i) => {
    if (!raw.fullName || typeof raw.fullName !== "string") return;
    let teamId = raw.teamId;
    if (!teamId && classTeams.length > 0) {
      teamId = classTeams[i % classTeams.length].id;
    }
    const currentCount = dbState.students.filter((s) => s.classId === targetClassId).length;
    const isFemale = raw.gender === "female" || String(raw.gender).toLowerCase().includes("n\u1EEF");
    const defaultAvatar = isFemale ? "/assets/kingdom/student_ngoc.png" : "/assets/kingdom/student_minh.png";
    const student = {
      id: raw.id || `${targetClassId}_student_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
      classId: targetClassId,
      studentCode: raw.studentCode || `2A5${(currentCount + 1).toString().padStart(2, "0")}`,
      fullName: raw.fullName.trim(),
      gender: isFemale ? "female" : "male",
      teamId: teamId || "",
      avatarUrl: raw.avatarUrl || defaultAvatar,
      dob: raw.dob ? String(raw.dob).trim() : "",
      notes: raw.notes || "",
      totalEarnedStars: Number(raw.totalEarnedStars) || 0,
      spendableStars: Number(raw.spendableStars) || Number(raw.totalEarnedStars) || 0,
      weeklyStars: 0,
      monthlyStars: 0,
      level: 1,
      badgeIds: [],
      passcode: raw.passcode || "2026"
    };
    student.level = calculateLevel(student.totalEarnedStars, dbState.levelRules);
    dbState.students.push(student);
    addedCount++;
  });
  syncMonthlyBirthdayNews(targetClassId);
  saveDb(dbState);
  res.json({ success: true, count: addedCount, students: dbState.students, data: dbState });
});
app.put("/api/students/:id", (req, res) => {
  const { id } = req.params;
  const index = dbState.students.findIndex((s) => s.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ECDc sinh" });
    return;
  }
  const existing = dbState.students[index];
  const oldTeamId = existing.teamId;
  const newTeamId = req.body.teamId !== void 0 ? req.body.teamId : oldTeamId;
  if (newTeamId && newTeamId !== oldTeamId) {
    const oldTeam = dbState.teams.find((t) => t.id === oldTeamId);
    const newTeam = dbState.teams.find((t) => t.id === newTeamId);
    const oldTeamName = oldTeam ? oldTeam.nameVi.split(":")[0].trim() : "Ch\u01B0a ph\xE2n t\u1ED5";
    const newTeamName = newTeam ? newTeam.nameVi.split(":")[0].trim() : newTeamId;
    const auditTx = {
      id: `tx_audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classId: existing.classId,
      studentId: existing.id,
      studentName: req.body.fullName || existing.fullName,
      deltaStars: 0,
      teamId: newTeamId,
      reasonCategory: "Chuy\u1EC3n t\u1ED5",
      reasonNote: `Chuy\u1EC3n t\u1EEB ${oldTeamName} sang ${newTeamName}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "C\xF4 Th\u1EA3o"
    };
    dbState.starTransactions.unshift(auditTx);
  }
  const updated = {
    ...existing,
    fullName: req.body.fullName !== void 0 ? req.body.fullName.trim() : existing.fullName,
    studentCode: req.body.studentCode !== void 0 ? req.body.studentCode.trim() : existing.studentCode,
    gender: req.body.gender || existing.gender,
    teamId: newTeamId,
    avatarUrl: req.body.avatarUrl || existing.avatarUrl,
    dob: req.body.dob !== void 0 ? req.body.dob : existing.dob,
    notes: req.body.notes !== void 0 ? req.body.notes : existing.notes,
    passcode: req.body.passcode || existing.passcode,
    // Strictly preserve cumulative achievements and stars:
    totalEarnedStars: existing.totalEarnedStars,
    spendableStars: existing.spendableStars,
    weeklyStars: existing.weeklyStars,
    monthlyStars: existing.monthlyStars,
    level: calculateLevel(existing.totalEarnedStars, dbState.levelRules),
    badgeIds: existing.badgeIds
  };
  dbState.students[index] = updated;
  syncMonthlyBirthdayNews(existing.classId);
  saveDb(dbState);
  res.json({ success: true, student: updated, data: dbState });
});
app.delete("/api/students/:id", (req, res) => {
  const { id } = req.params;
  const targetStudent = dbState.students.find((s) => s.id === id);
  const targetClassId = targetStudent?.classId || dbState.currentClassId;
  const initialLength = dbState.students.length;
  dbState.students = dbState.students.filter((s) => s.id !== id);
  if (dbState.students.length === initialLength) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ECDc sinh \u0111\u1EC3 x\xF3a" });
    return;
  }
  syncMonthlyBirthdayNews(targetClassId);
  saveDb(dbState);
  res.json({ success: true, deletedId: id, data: dbState });
});
app.post("/api/news/sync-birthdays", (req, res) => {
  const classId = req.body.classId || dbState.currentClassId;
  const result = syncMonthlyBirthdayNews(classId);
  saveDb(dbState);
  res.json({
    success: true,
    message: `\u0110\xE3 c\u1EADp nh\u1EADt b\u1EA3n tin sinh nh\u1EADt cho ${result.affectedMonths.length} th\xE1ng c\u1EE7a l\u1EDBp!`,
    news: dbState.news.filter((n) => n.classId === classId),
    data: dbState
  });
});
app.post("/api/students/gift-birthday-stars", (req, res) => {
  const { month, classId } = req.body;
  const targetClassId = classId || dbState.currentClassId;
  const targetMonth = Number(month) || (/* @__PURE__ */ new Date()).getMonth() + 1;
  const students = dbState.students.filter((s) => s.classId === targetClassId && !s.archived);
  const birthdayKids = students.filter((s) => {
    const parsed = parseBirthDate(s.dob);
    return parsed && parsed.month === targetMonth;
  });
  if (birthdayKids.length === 0) {
    res.status(400).json({ success: false, error: `Kh\xF4ng c\xF3 h\u1ECDc sinh n\xE0o sinh trong Th\xE1ng ${targetMonth}` });
    return;
  }
  const teacherName = dbState.classInfo.teacherName || "C\xF4 Th\u1EA3o";
  birthdayKids.forEach((kid) => {
    if (kid.baseWeeklyStars === void 0) kid.baseWeeklyStars = kid.weeklyStars || 0;
    if (kid.baseMonthlyStars === void 0) kid.baseMonthlyStars = kid.monthlyStars || 0;
    kid.totalEarnedStars += 10;
    kid.spendableStars += 10;
    kid.monthlyStars = (kid.monthlyStars || 0) + 10;
    kid.weeklyStars = (kid.weeklyStars || 0) + 10;
    kid.level = calculateLevel(kid.totalEarnedStars, dbState.levelRules);
    if (kid.teamId) {
      const team = dbState.teams.find((t) => t.id === kid.teamId);
      if (team) {
        if (team.baseWeeklyPoints === void 0) team.baseWeeklyPoints = team.weeklyPoints || 0;
        if (team.baseMonthlyPoints === void 0) team.baseMonthlyPoints = team.monthlyPoints || team.points || 0;
        team.points = (team.points || 0) + 10;
        team.monthlyPoints = (team.monthlyPoints || 0) + 10;
      }
    }
    const tx = {
      id: `tx_bday_${Date.now()}_${kid.id}`,
      classId: targetClassId,
      studentId: kid.id,
      studentName: kid.fullName,
      deltaStars: 10,
      teamId: kid.teamId,
      reasonCategory: "Sinh nh\u1EADt",
      reasonNote: `Ch\xFAc m\u1EEBng sinh nh\u1EADt Th\xE1ng ${targetMonth}! Th\u01B0\u1EDFng 10 sao v\u01B0\u01A1ng qu\u1ED1c`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: teacherName
    };
    dbState.starTransactions.unshift(tx);
  });
  recordNotification({
    classId: targetClassId,
    type: "celebration",
    titleVi: `Th\u01B0\u1EDFng 10 sao sinh nh\u1EADt Th\xE1ng ${targetMonth}`,
    titleEn: `10 Birthday Stars Awarded for Month ${targetMonth}`,
    messageVi: `${teacherName} \u0111\xE3 th\u01B0\u1EDFng 10 ng\xF4i sao l\u1EA5p l\xE1nh cho ${birthdayKids.length} b\u1EA1n c\xF3 sinh nh\u1EADt trong Th\xE1ng ${targetMonth}!`,
    messageEn: `${teacherName} awarded 10 stars to ${birthdayKids.length} students having birthdays in Month ${targetMonth}!`,
    targetRole: "all",
    authorName: teacherName,
    metadata: {
      severity: "success",
      linkTab: "news"
    }
  });
  saveDb(dbState);
  res.json({
    success: true,
    message: `\u0110\xE3 th\u01B0\u1EDFng 10 sao sinh nh\u1EADt cho ${birthdayKids.length} b\u1EA1n h\u1ECDc sinh sinh Th\xE1ng ${targetMonth}!`,
    students: dbState.students,
    teams: dbState.teams,
    data: dbState
  });
});
app.post("/api/stars/give", (req, res) => {
  const { studentId, deltaStars, reasonCategory, reasonNote, createdBy, timestamp } = req.body;
  if (!studentId || typeof deltaStars !== "number" || deltaStars === 0) {
    res.status(400).json({ success: false, error: "Th\xF4ng tin th\u01B0\u1EDFng sao kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  const student = dbState.students.find((s) => s.id === studentId);
  if (!student) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ECDc sinh" });
    return;
  }
  if (deltaStars < 0 && (!reasonNote || reasonNote.trim() === "")) {
    res.status(400).json({ success: false, error: "Tr\u1EEB sao b\u1EAFt bu\u1ED9c ph\u1EA3i ghi r\xF5 l\xFD do" });
    return;
  }
  if (student.baseWeeklyStars === void 0) student.baseWeeklyStars = student.weeklyStars || 0;
  if (student.baseMonthlyStars === void 0) student.baseMonthlyStars = student.monthlyStars || 0;
  if (deltaStars < 0 && student.spendableStars + deltaStars < 0) {
    student.spendableStars = 0;
  } else {
    student.spendableStars += deltaStars;
  }
  if (deltaStars > 0) {
    student.totalEarnedStars += deltaStars;
    student.weeklyStars += deltaStars;
    student.monthlyStars += deltaStars;
  } else {
    student.totalEarnedStars = Math.max(0, student.totalEarnedStars + deltaStars);
    student.weeklyStars = Math.max(0, student.weeklyStars + deltaStars);
    student.monthlyStars = Math.max(0, student.monthlyStars + deltaStars);
  }
  student.level = calculateLevel(student.totalEarnedStars, dbState.levelRules);
  if (student.teamId) {
    const team = dbState.teams.find((t) => t.id === student.teamId);
    if (team) {
      if (team.baseWeeklyPoints === void 0) team.baseWeeklyPoints = team.weeklyPoints || 0;
      if (team.baseMonthlyPoints === void 0) team.baseMonthlyPoints = team.monthlyPoints || team.points || 0;
      team.points = Math.max(0, team.points + deltaStars);
      if (deltaStars > 0) {
        team.weeklyPoints = (team.weeklyPoints || 0) + deltaStars;
      }
    }
  }
  const tx = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId: student.classId,
    studentId: student.id,
    studentName: student.fullName,
    deltaStars,
    teamId: student.teamId,
    reasonCategory: reasonCategory || "Khen th\u01B0\u1EDFng",
    reasonNote: reasonNote || `Th\u01B0\u1EDFng ${deltaStars} sao`,
    timestamp: timestamp || (/* @__PURE__ */ new Date()).toISOString(),
    createdBy: createdBy || "C\xF4 Th\u1EA3o"
  };
  dbState.starTransactions.unshift(tx);
  recordAuditLog(
    student.classId,
    deltaStars > 0 ? "star_award" : "star_deduct",
    createdBy || "C\xF4 Th\u1EA3o",
    `${deltaStars > 0 ? "Th\u01B0\u1EDFng" : "Tr\u1EEB"} ${Math.abs(deltaStars)} sao cho ${student.fullName} (${reasonCategory}): ${reasonNote}`,
    { txId: tx.id, studentId: student.id, deltaStars, reasonCategory, reasonNote },
    true,
    { txId: tx.id, studentId: student.id, deltaStars }
  );
  const starNotif = recordNotification({
    classId: student.classId,
    type: "star",
    titleVi: `${deltaStars > 0 ? "Th\u01B0\u1EDFng" : "Tr\u1EEB"} ${Math.abs(deltaStars)} sao cho ${student.fullName}`,
    titleEn: `${deltaStars > 0 ? "Awarded" : "Deducted"} ${Math.abs(deltaStars)} stars for ${student.fullName}`,
    messageVi: `${createdBy || "C\xF4 Th\u1EA3o"} \u0111\xE3 ${deltaStars > 0 ? "c\u1ED9ng" : "tr\u1EEB"} ${Math.abs(deltaStars)} sao cho b\u1EA1n ${student.fullName} (${reasonCategory}): ${reasonNote}`,
    messageEn: `${createdBy || "Teacher Thao"} ${deltaStars > 0 ? "awarded" : "deducted"} ${Math.abs(deltaStars)} stars for ${student.fullName} (${reasonCategory}): ${reasonNote}`,
    targetRole: "all",
    authorName: createdBy || "C\xF4 Th\u1EA3o",
    metadata: {
      studentId: student.id,
      studentName: student.fullName,
      deltaStars,
      teamId: student.teamId,
      severity: deltaStars > 0 ? "success" : "warning",
      linkTab: "rewards"
    }
  });
  saveDb(dbState);
  res.json({ success: true, student, transaction: tx, teams: dbState.teams, notification: starNotif });
});
app.post("/api/stars/batch", (req, res) => {
  const { studentIds, deltaStars, reasonCategory, reasonNote, createdBy } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0 || typeof deltaStars !== "number") {
    res.status(400).json({ success: false, error: "D\u1EEF li\u1EC7u th\u01B0\u1EDFng nh\xF3m kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  const updatedStudents = [];
  const transactions = [];
  for (const sId of studentIds) {
    const student = dbState.students.find((s) => s.id === sId);
    if (!student) continue;
    if (student.baseWeeklyStars === void 0) student.baseWeeklyStars = student.weeklyStars || 0;
    if (student.baseMonthlyStars === void 0) student.baseMonthlyStars = student.monthlyStars || 0;
    if (deltaStars < 0 && student.spendableStars + deltaStars < 0) {
      student.spendableStars = 0;
    } else {
      student.spendableStars += deltaStars;
    }
    if (deltaStars > 0) {
      student.totalEarnedStars += deltaStars;
      student.weeklyStars += deltaStars;
      student.monthlyStars += deltaStars;
    } else {
      student.totalEarnedStars = Math.max(0, student.totalEarnedStars + deltaStars);
      student.weeklyStars = Math.max(0, student.weeklyStars + deltaStars);
      student.monthlyStars = Math.max(0, student.monthlyStars + deltaStars);
    }
    student.level = calculateLevel(student.totalEarnedStars, dbState.levelRules);
    if (student.teamId) {
      const team = dbState.teams.find((t) => t.id === student.teamId);
      if (team) {
        if (team.baseWeeklyPoints === void 0) team.baseWeeklyPoints = team.weeklyPoints || 0;
        if (team.baseMonthlyPoints === void 0) team.baseMonthlyPoints = team.monthlyPoints || team.points || 0;
        team.points = Math.max(0, team.points + deltaStars);
        if (deltaStars > 0) {
          team.weeklyPoints = (team.weeklyPoints || 0) + deltaStars;
        }
      }
    }
    const tx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classId: student.classId,
      studentId: student.id,
      studentName: student.fullName,
      deltaStars,
      teamId: student.teamId,
      reasonCategory: reasonCategory || "Th\u01B0\u1EDFng nh\xF3m",
      reasonNote: reasonNote || `Th\u01B0\u1EDFng nh\xF3m ${deltaStars} sao`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: createdBy || "C\xF4 Th\u1EA3o"
    };
    transactions.push(tx);
    dbState.starTransactions.unshift(tx);
    updatedStudents.push(student);
  }
  saveDb(dbState);
  res.json({ success: true, count: updatedStudents.length, students: updatedStudents, transactions, teams: dbState.teams });
});
app.post("/api/teams/:id/points", (req, res) => {
  const { id } = req.params;
  const { deltaPoints, reason } = req.body;
  const team = dbState.teams.find((t) => t.id === id);
  if (!team) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\u1ED5" });
    return;
  }
  if (team.baseWeeklyPoints === void 0) team.baseWeeklyPoints = team.weeklyPoints || 0;
  if (team.baseMonthlyPoints === void 0) team.baseMonthlyPoints = team.monthlyPoints || team.points || 0;
  team.points = Math.max(0, team.points + (Number(deltaPoints) || 0));
  team.weeklyPoints = Math.max(0, (team.weeklyPoints || 0) + (Number(deltaPoints) || 0));
  dbState.starTransactions.unshift({
    id: `tx_team_${Date.now()}`,
    classId: team.classId,
    studentId: "",
    studentName: team.nameVi,
    deltaStars: Number(deltaPoints) || 0,
    teamId: team.id,
    reasonCategory: "\u0110i\u1EC3m thi \u0111ua t\u1ED5",
    reasonNote: reason || "C\u1ED9ng \u0111i\u1EC3m thi \u0111ua t\u1ED5",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    createdBy: "C\xF4 Th\u1EA3o"
  });
  saveDb(dbState);
  res.json({ success: true, team, teams: dbState.teams });
});
app.put("/api/teams/:id", (req, res) => {
  const { id } = req.params;
  const index = dbState.teams.findIndex((t) => t.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\u1ED5" });
    return;
  }
  dbState.teams[index] = { ...dbState.teams[index], ...req.body };
  saveDb(dbState);
  res.json({ success: true, team: dbState.teams[index] });
});
app.post("/api/teams/reset", (req, res) => {
  const { teamId, classId, actor, reason } = req.body;
  const cId = classId || dbState.currentClassId;
  const classTeams = dbState.teams.filter((t) => t.classId === cId);
  const targetTeams = teamId ? classTeams.filter((t) => t.id === teamId) : classTeams;
  if (targetTeams.length === 0) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\u1ED5 \u0111\u1EC3 \u0111\u1EB7t l\u1EA1i \u0111i\u1EC3m" });
    return;
  }
  const teamsSnapshot = targetTeams.map((t) => ({
    id: t.id,
    nameVi: t.nameVi,
    nameEn: t.nameEn,
    points: t.points,
    weeklyPoints: t.weeklyPoints ?? Math.round(t.points * 0.2),
    monthlyPoints: t.monthlyPoints ?? t.points,
    semester1Points: t.semester1Points ?? Math.round(t.points * 1.8),
    semester2Points: t.semester2Points ?? t.points
  }));
  targetTeams.forEach((t) => {
    t.points = 0;
    t.weeklyPoints = 0;
    t.monthlyPoints = 0;
  });
  const operator = actor || dbState.classInfo?.teacherName || "C\xF4 Th\u1EA3o";
  const desc = teamId && targetTeams.length === 1 ? `\u0110\u1EB7t l\u1EA1i \u0111i\u1EC3m thi \u0111ua c\u1EE7a ${targetTeams[0].nameVi} v\u1EC1 0 (Tr\u01B0\u1EDBc \u0111\xF3: ${teamsSnapshot[0].points} \u2B50)` : `\u0110\u1EB7t l\u1EA1i \u0111i\u1EC3m thi \u0111ua c\u1EE7a t\u1EA5t c\u1EA3 ${targetTeams.length} t\u1ED5 v\u1EC1 0`;
  const auditLog = recordAuditLog(
    cId,
    "team_reset",
    operator,
    desc,
    { teamId, reason: reason || "\u0110\u1EB7t l\u1EA1i \u0111i\u1EC3m thi \u0111ua \u0111\u1ECBnh k\u1EF3", teamsSnapshot },
    true,
    // canUndo = true
    {
      type: "team_reset",
      teamsSnapshot,
      classId: cId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  );
  recordNotification({
    classId: cId,
    type: "team",
    titleVi: teamId ? `\u0110\u1EB7t l\u1EA1i \u0111i\u1EC3m thi \u0111ua: ${targetTeams[0].nameVi}` : "\u0110\u1EB7t l\u1EA1i \u0111i\u1EC3m thi \u0111ua c\xE1c t\u1ED5",
    titleEn: teamId ? `Reset Team Points: ${targetTeams[0].nameEn || targetTeams[0].nameVi}` : "Reset All Teams Points",
    messageVi: `${desc}. B\u1EA1n c\xF3 th\u1EC3 nh\u1EA5n Ho\xE0n t\xE1c b\u1EA5t k\u1EF3 l\xFAc n\xE0o \u0111\u1EC3 kh\xF4i ph\u1EE5c \u0111i\u1EC3m s\u1ED1.`,
    messageEn: `${desc}. You can click Undo at any time to restore previous points.`,
    targetRole: "all",
    authorName: operator,
    metadata: {
      teamId: teamId || "all",
      severity: "warning",
      linkTab: "teams",
      auditLogId: auditLog.id
    }
  });
  saveDb(dbState);
  res.json({
    success: true,
    message: `${desc} th\xE0nh c\xF4ng. B\u1EA1n c\xF3 th\u1EC3 ho\xE0n t\xE1c b\u1EA5t k\u1EF3 l\xFAc n\xE0o.`,
    teams: dbState.teams,
    auditLog,
    teamsSnapshot
  });
});
app.post("/api/teams/undo-reset", (req, res) => {
  const { auditLogId, classId } = req.body;
  const cId = classId || dbState.currentClassId;
  let log = (dbState.auditLogs || []).find((a) => a.id === auditLogId);
  if (!log) {
    log = (dbState.auditLogs || []).find((a) => a.action === "team_reset" && a.canUndo && !a.isUndone);
  }
  if (!log || !log.undoPayload?.teamsSnapshot) {
    res.status(400).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y l\u01B0\u1EE3t \u0111\u1EB7t l\u1EA1i \u0111i\u1EC3m n\xE0o kh\u1EA3 d\u1EE5ng \u0111\u1EC3 ho\xE0n t\xE1c" });
    return;
  }
  const teamsSnapshot = log.undoPayload.teamsSnapshot;
  teamsSnapshot.forEach((snap) => {
    const team = dbState.teams.find((t) => t.id === snap.id);
    if (team) {
      team.points = snap.points ?? team.points;
      team.weeklyPoints = snap.weeklyPoints ?? team.weeklyPoints;
      team.monthlyPoints = snap.monthlyPoints ?? team.monthlyPoints;
      team.semester1Points = snap.semester1Points ?? team.semester1Points;
      team.semester2Points = snap.semester2Points ?? team.semester2Points;
    }
  });
  log.isUndone = true;
  recordAuditLog(
    cId,
    "team_reset",
    log.actor || "C\xF4 Th\u1EA3o",
    `Ho\xE0n t\xE1c th\xE0nh c\xF4ng: Ph\u1EE5c h\u1ED3i l\u1EA1i \u0111i\u1EC3m thi \u0111ua c\xE1c t\u1ED5 v\u1EC1 tr\u1EA1ng th\xE1i tr\u01B0\u1EDBc \u0111\xF3`,
    { restoredTeams: teamsSnapshot },
    false
  );
  saveDb(dbState);
  res.json({
    success: true,
    message: "Ho\xE0n t\xE1c th\xE0nh c\xF4ng! \u0110i\u1EC3m th\u01B0\u1EDFng sao c\u1EE7a c\xE1c t\u1ED5 \u0111\xE3 \u0111\u01B0\u1EE3c ph\u1EE5c h\u1ED3i nguy\xEAn v\u1EB9n.",
    teams: dbState.teams,
    restoredTeams: teamsSnapshot,
    auditLog: log
  });
});
app.post("/api/attendance", (req, res) => {
  const { date, records, note, classId } = req.body;
  const cId = classId || dbState.currentClassId;
  const entry = {
    classId: cId,
    date,
    records,
    note: note || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbState.attendance[`${cId}_${date}`] = entry;
  saveDb(dbState);
  res.json({ success: true, attendance: entry });
});
app.post("/api/seating", (req, res) => {
  const { rows, cols, seats, classId } = req.body;
  const cId = classId || dbState.currentClassId;
  dbState.seatingChart = {
    classId: cId,
    rows: Number(rows) || 4,
    cols: Number(cols) || 7,
    seats: Array.isArray(seats) ? seats : [],
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveDb(dbState);
  res.json({ success: true, seatingChart: dbState.seatingChart });
});
app.post("/api/rewards/redeem", (req, res) => {
  const { rewardId, studentId } = req.body;
  const reward = dbState.rewards.find((r) => r.id === rewardId);
  const student = dbState.students.find((s) => s.id === studentId);
  if (!reward || !student) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ph\u1EA7n th\u01B0\u1EDFng ho\u1EB7c h\u1ECDc sinh" });
    return;
  }
  if (reward.stock <= 0) {
    res.status(400).json({ success: false, error: "Ph\u1EA7n th\u01B0\u1EDFng n\xE0y \u0111\xE3 h\u1EBFt qu\xE0 trong kho" });
    return;
  }
  if (student.spendableStars < reward.starCost) {
    res.status(400).json({ success: false, error: `H\u1ECDc sinh ch\u1EC9 c\xF2n ${student.spendableStars} sao, kh\xF4ng \u0111\u1EE7 ${reward.starCost} sao \u0111\u1EC3 \u0111\u1ED5i qu\xE0` });
    return;
  }
  student.spendableStars -= reward.starCost;
  reward.stock -= 1;
  reward.claimedCount = (reward.claimedCount || 0) + 1;
  const redemption = {
    id: `red_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    classId: student.classId,
    rewardId: reward.id,
    rewardTitle: reward.titleVi,
    studentId: student.id,
    studentName: student.fullName,
    starCost: reward.starCost,
    status: "approved",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbState.redemptions.unshift(redemption);
  recordNotification({
    classId: student.classId,
    type: "reward",
    titleVi: `\u0110\u1ED5i qu\xE0: ${student.fullName} \u0111\u1ED5i "${reward.titleVi}"`,
    titleEn: `Reward Claimed: ${student.fullName} claimed "${reward.titleEn || reward.titleVi}"`,
    messageVi: `H\u1ECDc sinh ${student.fullName} \u0111\xE3 d\xF9ng ${reward.starCost} sao \u0111\u1EC3 \u0111\u1ED5i ph\u1EA7n qu\xE0 "${reward.titleVi}".`,
    messageEn: `Student ${student.fullName} used ${reward.starCost} stars to claim "${reward.titleEn || reward.titleVi}".`,
    targetRole: "all",
    authorName: "H\u1EC7 th\u1ED1ng v\u01B0\u01A1ng qu\u1ED1c",
    metadata: {
      studentId: student.id,
      studentName: student.fullName,
      rewardId: reward.id,
      rewardTitle: reward.titleVi,
      severity: "success",
      linkTab: "rewards"
    }
  });
  saveDb(dbState);
  res.json({ success: true, redemption, student, reward });
});
app.post("/api/rewards", (req, res) => {
  const { titleVi, titleEn, starCost, stock, description, imageUrl } = req.body;
  const newReward = {
    id: `rew_${Date.now()}`,
    titleVi: (titleVi || "Ph\u1EA7n qu\xE0 m\u1EDBi").trim(),
    titleEn: (titleEn || titleVi || "New Reward").trim(),
    starCost: Math.max(1, Number(starCost) || 10),
    stock: Math.max(0, Number(stock) !== void 0 ? Number(stock) : 10),
    iconName: "Gift",
    imageUrl: imageUrl || "",
    description: (description || "").trim(),
    claimedCount: 0,
    isArchived: false,
    isActive: true
  };
  dbState.rewards.push(newReward);
  saveDb(dbState);
  res.json({ success: true, reward: newReward });
});
app.put("/api/rewards/:id", (req, res) => {
  const { id } = req.params;
  const index = dbState.rewards.findIndex((r) => r.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ph\u1EA7n th\u01B0\u1EDFng" });
    return;
  }
  const existing = dbState.rewards[index];
  const updated = {
    ...existing,
    titleVi: req.body.titleVi !== void 0 ? req.body.titleVi.trim() : existing.titleVi,
    titleEn: req.body.titleEn !== void 0 ? req.body.titleEn.trim() : existing.titleEn,
    starCost: req.body.starCost !== void 0 ? Math.max(1, Number(req.body.starCost)) : existing.starCost,
    stock: req.body.stock !== void 0 ? Math.max(0, Number(req.body.stock)) : existing.stock,
    description: req.body.description !== void 0 ? req.body.description.trim() : existing.description,
    imageUrl: req.body.imageUrl !== void 0 ? req.body.imageUrl : existing.imageUrl,
    isArchived: req.body.isArchived !== void 0 ? Boolean(req.body.isArchived) : existing.isArchived,
    isActive: req.body.isActive !== void 0 ? Boolean(req.body.isActive) : existing.isActive
  };
  dbState.rewards[index] = updated;
  saveDb(dbState);
  res.json({ success: true, reward: updated, rewards: dbState.rewards });
});
app.delete("/api/rewards/:id", (req, res) => {
  const { id } = req.params;
  const index = dbState.rewards.findIndex((r) => r.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ph\u1EA7n th\u01B0\u1EDFng" });
    return;
  }
  dbState.rewards[index].isArchived = true;
  dbState.rewards[index].isActive = false;
  saveDb(dbState);
  res.json({ success: true, message: "\u0110\xE3 l\u01B0u kho ph\u1EA7n qu\xE0 an to\xE0n, l\u1ECBch s\u1EED \u0111\u1ED5i th\u01B0\u1EDFng \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n tr\u1ECDn v\u1EB9n", reward: dbState.rewards[index] });
});
app.post("/api/menu-customization", (req, res) => {
  const { menuCustomization } = req.body;
  dbState.menuCustomization = menuCustomization || {};
  saveDb(dbState);
  res.json({ success: true, menuCustomization: dbState.menuCustomization });
});
app.post("/api/news", (req, res) => {
  const {
    title,
    content,
    author,
    authorId,
    pinned,
    isPinned,
    tags,
    classId,
    imageUrl,
    images,
    videoUrl,
    attachments,
    visibility
  } = req.body;
  const cId = classId || dbState.currentClassId;
  const now = /* @__PURE__ */ new Date();
  const pinState = Boolean(pinned || isPinned);
  const item = {
    id: `news_${Date.now()}`,
    classId: cId,
    title: (title || "").trim(),
    content: (content || "").trim(),
    author: (author || "C\xF4 Th\u1EA3o").trim(),
    authorId: authorId || void 0,
    date: now.toISOString().slice(0, 10),
    pinned: pinState,
    isPinned: pinState,
    pinnedAt: pinState ? now.toISOString() : void 0,
    imageUrl: imageUrl || Array.isArray(images) && images[0] || void 0,
    images: Array.isArray(images) ? images : imageUrl ? [imageUrl] : [],
    videoUrl: videoUrl ? videoUrl.trim() : void 0,
    attachments: Array.isArray(attachments) ? attachments : [],
    visibility: visibility || "all",
    tags: Array.isArray(tags) && tags.length > 0 ? tags : ["Th\xF4ng b\xE1o"],
    likes: 0,
    likedBy: [],
    isDeleted: false
  };
  dbState.news.unshift(item);
  recordNotification({
    classId: cId,
    type: "news",
    titleVi: `B\u1EA3ng tin l\u1EDBp: ${item.title}`,
    titleEn: `Class News: ${item.title}`,
    messageVi: `${item.author} \u0111\xE3 \u0111\u0103ng b\xE0i vi\u1EBFt m\u1EDBi: "${item.title}". Nh\u1EA5n \u0111\u1EC3 xem n\u1ED9i dung chi ti\u1EBFt.`,
    messageEn: `${item.author} published a new post: "${item.title}". Click to view details.`,
    targetRole: item.visibility === "teachers" ? "teacher" : "all",
    authorName: item.author,
    metadata: {
      newsId: item.id,
      severity: "normal",
      linkTab: "news"
    }
  });
  saveDb(dbState);
  recordAuditLog(cId, "student_edit", item.author, `\u0110\u0103ng b\xE0i vi\u1EBFt m\u1EDBi tr\xEAn b\u1EA3ng tin: ${item.title}`);
  res.json({ success: true, newsItem: item, news: dbState.news });
});
app.put("/api/news/:id", (req, res) => {
  const { id } = req.params;
  const index = dbState.news.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt tr\xEAn b\u1EA3ng tin" });
    return;
  }
  const existing = dbState.news[index];
  const {
    title,
    content,
    pinned,
    isPinned,
    tags,
    likes,
    author,
    authorId,
    imageUrl,
    images,
    videoUrl,
    attachments,
    visibility,
    updatedBy
  } = req.body;
  const now = /* @__PURE__ */ new Date();
  const pinState = pinned !== void 0 ? Boolean(pinned) : isPinned !== void 0 ? Boolean(isPinned) : Boolean(existing.pinned);
  const updated = {
    ...existing,
    title: title !== void 0 ? title.trim() : existing.title,
    content: content !== void 0 ? content.trim() : existing.content,
    pinned: pinState,
    isPinned: pinState,
    pinnedAt: pinState ? existing.pinned ? existing.pinnedAt : now.toISOString() : void 0,
    tags: Array.isArray(tags) ? tags : existing.tags,
    likes: likes !== void 0 ? Number(likes) : existing.likes,
    author: author !== void 0 ? author.trim() : existing.author,
    authorId: authorId !== void 0 ? authorId : existing.authorId,
    imageUrl: imageUrl !== void 0 ? imageUrl : existing.imageUrl,
    images: Array.isArray(images) ? images : existing.images,
    videoUrl: videoUrl !== void 0 ? videoUrl : existing.videoUrl,
    attachments: Array.isArray(attachments) ? attachments : existing.attachments,
    visibility: visibility !== void 0 ? visibility : existing.visibility,
    isEdited: true,
    updatedAt: now.toISOString(),
    updatedBy: updatedBy || author || existing.author || "C\xF4 Th\u1EA3o"
  };
  dbState.news[index] = updated;
  saveDb(dbState);
  recordAuditLog(
    existing.classId || dbState.currentClassId,
    "student_edit",
    updated.updatedBy || updated.author,
    `Ch\u1EC9nh s\u1EEDa b\xE0i \u0111\u0103ng b\u1EA3ng tin: ${updated.title}`
  );
  res.json({ success: true, newsItem: updated, news: dbState.news });
});
app.patch("/api/news/:id/pin", (req, res) => {
  const { id } = req.params;
  const index = dbState.news.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt" });
    return;
  }
  const existing = dbState.news[index];
  const now = /* @__PURE__ */ new Date();
  const nextPinned = !existing.pinned;
  existing.pinned = nextPinned;
  existing.isPinned = nextPinned;
  existing.pinnedAt = nextPinned ? now.toISOString() : void 0;
  saveDb(dbState);
  recordAuditLog(
    existing.classId || dbState.currentClassId,
    "student_edit",
    "C\xF4 Th\u1EA3o",
    `${nextPinned ? "Ghim" : "B\u1ECF ghim"} b\xE0i \u0111\u0103ng b\u1EA3ng tin: ${existing.title}`
  );
  res.json({ success: true, newsItem: existing, news: dbState.news });
});
app.delete("/api/news/:id", (req, res) => {
  const { id } = req.params;
  const isPermanent = req.query.permanent === "true";
  const index = dbState.news.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt \u0111\u1EC3 x\xF3a" });
    return;
  }
  const target = dbState.news[index];
  const operator = req.body?.deletedBy || req.query?.deletedBy || "C\xF4 Th\u1EA3o";
  if (isPermanent) {
    dbState.news = dbState.news.filter((n) => n.id !== id);
    saveDb(dbState);
    recordAuditLog(
      target.classId || dbState.currentClassId,
      "student_delete",
      operator,
      `X\xF3a v\u0129nh vi\u1EC5n b\xE0i \u0111\u0103ng b\u1EA3ng tin: ${target.title}`
    );
    res.json({
      success: true,
      message: `\u0110\xE3 x\xF3a v\u0129nh vi\u1EC5n b\xE0i vi\u1EBFt "${target.title}"`,
      deletedId: id,
      news: dbState.news
    });
    return;
  }
  target.isDeleted = true;
  target.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
  target.deletedBy = operator;
  saveDb(dbState);
  recordAuditLog(
    target.classId || dbState.currentClassId,
    "student_delete",
    operator,
    `\u0110\xE3 chuy\u1EC3n b\xE0i \u0111\u0103ng v\xE0o th\xF9ng r\xE1c: ${target.title}`
  );
  res.json({
    success: true,
    message: `\u0110\xE3 chuy\u1EC3n b\xE0i vi\u1EBFt "${target.title}" v\xE0o th\xF9ng r\xE1c`,
    newsItem: target,
    news: dbState.news
  });
});
app.post("/api/news/:id/restore", (req, res) => {
  const { id } = req.params;
  const index = dbState.news.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt \u0111\u1EC3 kh\xF4i ph\u1EE5c" });
    return;
  }
  const target = dbState.news[index];
  target.isDeleted = false;
  target.deletedAt = void 0;
  target.deletedBy = void 0;
  saveDb(dbState);
  recordAuditLog(
    target.classId || dbState.currentClassId,
    "student_edit",
    "C\xF4 Th\u1EA3o",
    `\u0110\xE3 kh\xF4i ph\u1EE5c b\xE0i \u0111\u0103ng b\u1EA3ng tin: ${target.title}`
  );
  res.json({
    success: true,
    message: `\u0110\xE3 kh\xF4i ph\u1EE5c b\xE0i vi\u1EBFt "${target.title}" th\xE0nh c\xF4ng!`,
    newsItem: target,
    news: dbState.news
  });
});
app.post("/api/resources", (req, res) => {
  const { title, category, type, url, description, author, grade } = req.body;
  const resource = {
    id: `res_${Date.now()}`,
    title,
    category: category || "other",
    type: type || "video",
    url: url || "",
    description: description || "",
    author: author || "C\xF4 Th\u1EA3o",
    grade: Number(grade) || 2,
    createdAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
  };
  dbState.learningResources.unshift(resource);
  saveDb(dbState);
  res.json({ success: true, resource });
});
app.delete("/api/resources/:id", (req, res) => {
  const { id } = req.params;
  dbState.learningResources = dbState.learningResources.filter((r) => r.id !== id);
  saveDb(dbState);
  res.json({ success: true, deletedId: id });
});
app.post("/api/backup", (req, res) => {
  const { type, name } = req.body;
  const backupPayload = type === "class" ? {
    type: "class",
    classInfo: dbState.classInfo,
    teams: dbState.teams.filter((t) => t.classId === dbState.currentClassId),
    students: dbState.students.filter((s) => s.classId === dbState.currentClassId),
    news: dbState.news.filter((n) => n.classId === dbState.currentClassId),
    starTransactions: dbState.starTransactions.filter((tx) => tx.classId === dbState.currentClassId)
  } : dbState;
  const backupRecord = {
    id: `backup_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    type: type || "class",
    name: name || `B\u1EA3n sao l\u01B0u ${dbState.classInfo.nameVi}`,
    sizeBytes: JSON.stringify(backupPayload).length,
    data: backupPayload
  };
  if (!dbState.backups) dbState.backups = [];
  dbState.backups.unshift(backupRecord);
  saveDb(dbState);
  res.json({ success: true, backup: backupRecord });
});
app.post("/api/restore", (req, res) => {
  const { backupData } = req.body;
  if (!backupData) {
    res.status(400).json({ success: false, error: "D\u1EEF li\u1EC7u sao l\u01B0u kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  try {
    if (backupData.classes && Array.isArray(backupData.classes)) {
      dbState = backupData;
    } else if (backupData.classInfo) {
      const restoredClass = backupData.classInfo;
      const cIdx = dbState.classes.findIndex((c) => c.id === restoredClass.id);
      if (cIdx !== -1) {
        dbState.classes[cIdx] = restoredClass;
      } else {
        dbState.classes.push(restoredClass);
      }
      dbState.students = dbState.students.filter((s) => s.classId !== restoredClass.id).concat(backupData.students || []);
      dbState.teams = dbState.teams.filter((t) => t.classId !== restoredClass.id).concat(backupData.teams || []);
      dbState.currentClassId = restoredClass.id;
      dbState.classInfo = restoredClass;
    }
    saveDb(dbState);
    res.json({ success: true, data: dbState });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "L\u1ED7i khi kh\xF4i ph\u1EE5c" });
  }
});
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: Math.round(process.uptime()),
    version: "2.6.1",
    environment: process.env.NODE_ENV || "development",
    database: {
      mode: process.env.USE_DEMO_DATA === "true" ? "demo" : "production",
      file: path.basename(DB_FILE),
      studentCount: dbState.students?.length || 0,
      classCount: dbState.classes?.length || 0
    }
  });
});
app.post("/api/auth/teacher-login", (req, res) => {
  const { email, password, firebaseUid, displayName, isGoogleAuth } = req.body || {};
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const rateLimitKey = `teacher_${ip}_${cleanEmail}`;
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    res.status(429).json({
      success: false,
      error: `T\xE0i kho\u1EA3n t\u1EA1m kh\xF3a do nh\u1EADp sai qu\xE1 5 l\u1EA7n. Vui l\xF2ng th\u1EED l\u1EA1i sau ${rateCheck.waitMinutes} ph\xFAt! / Account temporarily locked. Please retry in ${rateCheck.waitMinutes} minutes.`
    });
    return;
  }
  if (!cleanEmail || !ALLOWED_TEACHER_EMAILS.includes(cleanEmail)) {
    recordLoginFailure(rateLimitKey);
    res.status(401).json({
      success: false,
      error: "Email kh\xF4ng c\xF3 quy\u1EC1n Qu\u1EA3n tr\u1ECB Gi\xE1o vi\xEAn trong h\u1EC7 th\u1ED1ng. / Email is not authorized as a Classroom Teacher."
    });
    return;
  }
  if (isGoogleAuth === true || firebaseUid && typeof firebaseUid === "string" && firebaseUid.length >= 10) {
    resetLoginAttempts(rateLimitKey);
    const name2 = displayName || dbState.classInfo?.teacherName || "C\xF4 Th\u1EA3o";
    const token2 = createSessionToken({
      role: "teacher",
      userId: cleanEmail,
      email: cleanEmail,
      name: name2
    });
    res.json({
      success: true,
      token: token2,
      user: { id: cleanEmail, email: cleanEmail, name: name2, role: "teacher" }
    });
    return;
  }
  const cleanPassword = typeof password === "string" ? password.trim() : "";
  if (!cleanPassword || !TEACHER_PASSWORDS.includes(cleanPassword)) {
    const failInfo = recordLoginFailure(rateLimitKey);
    const errorMsg = failInfo.locked ? `\u0110\u0103ng nh\u1EADp sai qu\xE1 5 l\u1EA7n! T\xE0i kho\u1EA3n b\u1ECB t\u1EA1m kh\xF3a 15 ph\xFAt. / Account locked for 15 minutes due to 5 failed attempts.` : "M\u1EADt kh\u1EA9u gi\xE1o vi\xEAn kh\xF4ng ch\xEDnh x\xE1c. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i! / Incorrect teacher password.";
    res.status(401).json({
      success: false,
      error: errorMsg
    });
    return;
  }
  resetLoginAttempts(rateLimitKey);
  const name = displayName || dbState.classInfo?.teacherName || "C\xF4 Th\u1EA3o";
  const token = createSessionToken({
    role: "teacher",
    userId: cleanEmail,
    email: cleanEmail,
    name
  });
  res.json({
    success: true,
    token,
    user: { id: cleanEmail, email: cleanEmail, name, role: "teacher" }
  });
});
app.post("/api/auth/student-login", (req, res) => {
  const { studentCode, passcode } = req.body || {};
  if (!studentCode || !passcode || typeof studentCode !== "string" || typeof passcode !== "string") {
    res.status(400).json({
      success: false,
      error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 M\xE3 h\u1ECDc sinh v\xE0 M\xE3 PIN b\u1EA3o m\u1EADt. / Please enter both Student Code and Security PIN."
    });
    return;
  }
  const cleanCode = studentCode.trim().toUpperCase();
  const cleanPass = passcode.trim();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const rateLimitKey = `student_${ip}_${cleanCode}`;
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    res.status(429).json({
      success: false,
      error: `M\xE3 h\u1ECDc sinh t\u1EA1m kh\xF3a do nh\u1EADp sai m\xE3 PIN qu\xE1 5 l\u1EA7n. Vui l\xF2ng th\u1EED l\u1EA1i sau ${rateCheck.waitMinutes} ph\xFAt! / Student login locked. Please retry in ${rateCheck.waitMinutes} minutes.`
    });
    return;
  }
  const student = dbState.students.find(
    (s) => s.studentCode.toUpperCase() === cleanCode && (s.passcode || "2026") === cleanPass
  );
  if (!student) {
    const failInfo = recordLoginFailure(rateLimitKey);
    const errorMsg = failInfo.locked ? `Nh\u1EADp sai m\xE3 PIN qu\xE1 5 l\u1EA7n! T\xE0i kho\u1EA3n b\u1ECB t\u1EA1m kh\xF3a 15 ph\xFAt. / Locked for 15 minutes due to 5 failed attempts.` : "M\xE3 h\u1ECDc sinh ho\u1EB7c m\xE3 PIN b\u1EA3o m\u1EADt kh\xF4ng \u0111\xFAng. / Invalid Student Code or Security PIN.";
    res.status(401).json({
      success: false,
      error: errorMsg
    });
    return;
  }
  resetLoginAttempts(rateLimitKey);
  const sessionPayload = {
    role: "student",
    userId: `student_${student.id}`,
    studentId: student.id,
    studentCode: student.studentCode,
    name: student.fullName
  };
  const token = createSessionToken(sessionPayload);
  const sanitized = sanitizeStudentRecord(student, { ...sessionPayload, exp: Date.now() + 36e5 });
  res.json({
    success: true,
    token,
    student: sanitized,
    user: sessionPayload
  });
});
app.post("/api/auth/guest-login", (_req, res) => {
  const sessionPayload = {
    role: "guest",
    userId: "student_guest",
    name: "Kh\xE1ch xem / Guest"
  };
  const token = createSessionToken(sessionPayload, 12);
  res.json({
    success: true,
    token,
    user: sessionPayload
  });
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || !fs.existsSync(path.resolve(process.cwd(), "src/main.tsx")) || fs.existsSync(path.resolve(process.cwd(), "dist/index.html")) && process.env.npm_lifecycle_event !== "dev";
  if (isProduction && fs.existsSync(path.resolve(process.cwd(), "dist"))) {
    app.use(express.static(path.resolve(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Ms. Thao's Star Kingdom running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
export {
  checkRateLimit,
  createSessionToken,
  extractSession,
  getDefaultNotifications,
  getDemoStudents,
  parseBirthDate,
  recordAuditLog,
  recordLoginFailure,
  recordNotification,
  requireStudentOrTeacher,
  requireTeacher,
  resetLoginAttempts,
  sanitizeAppState,
  sanitizeStudentRecord,
  syncMonthlyBirthdayNews,
  verifySessionToken
};
