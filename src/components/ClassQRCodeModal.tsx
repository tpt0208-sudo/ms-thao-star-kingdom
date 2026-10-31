import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Student, ClassInfo, SchoolInfo } from '../types';
import { X, QrCode, Download, Printer, Copy, Check, Sparkles, ExternalLink, User } from 'lucide-react';

interface ClassQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClass: ClassInfo | null;
  students: Student[];
  school?: SchoolInfo;
}

export const ClassQRCodeModal: React.FC<ClassQRCodeModalProps> = ({
  isOpen,
  onClose,
  currentClass,
  students,
  school,
}) => {
  const [classQrUrl, setClassQrUrl] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentQrUrl, setStudentQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'class' | 'individual'>('class');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const classPortalUrl = `${origin}?portal=student&classId=${currentClass?.id || 'class_2a5'}`;

  // Generate Class QR
  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(classPortalUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1E3A8A',
          light: '#FFFFFF',
        },
      }).then(setClassQrUrl).catch(console.error);
    }
  }, [isOpen, classPortalUrl]);

  // Generate Student QR if selected
  useEffect(() => {
    if (selectedStudent) {
      const studentUrl = `${origin}?portal=student&classId=${selectedStudent.classId}&code=${selectedStudent.studentCode || selectedStudent.id}`;
      QRCode.toDataURL(studentUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0369A1',
          light: '#FFFFFF',
        },
      }).then(setStudentQrUrl).catch(console.error);
    }
  }, [selectedStudent, origin]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const targetUrl = activeTab === 'class' 
      ? classPortalUrl 
      : (selectedStudent ? `${origin}?portal=student&classId=${selectedStudent.classId}&code=${selectedStudent.studentCode || selectedStudent.id}` : classPortalUrl);
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-4 border-[#BAE6FD] relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sky-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-200">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-['Fredoka',sans-serif] text-xl font-bold text-[#1E3A8A]">
                Mã QR Vào Cổng Học Sinh
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {currentClass?.nameVi || 'Lớp 2A5'} • Quét để học tập & xem sao vinh danh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-sky-50 rounded-2xl mt-4">
          <button
            onClick={() => setActiveTab('class')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'class'
                ? 'bg-white text-sky-700 shadow-sm border border-sky-100'
                : 'text-slate-600 hover:text-sky-700'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Mã QR Cả Lớp (Dán Cửa Lớp / Gửi Nhóm)
          </button>
          <button
            onClick={() => {
              setActiveTab('individual');
              if (!selectedStudent && students.length > 0) {
                setSelectedStudent(students[0]);
              }
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'individual'
                ? 'bg-white text-sky-700 shadow-sm border border-sky-100'
                : 'text-slate-600 hover:text-sky-700'
            }`}
          >
            <User className="w-4 h-4" />
            Thẻ QR Từng Học Sinh ({students.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === 'class' ? (
            <div className="flex flex-col items-center text-center">
              <div className="bg-gradient-to-b from-sky-50 to-white p-5 rounded-3xl border-2 border-sky-100 shadow-inner max-w-sm w-full flex flex-col items-center">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-white shadow-md border-2 border-sky-200 mb-2">
                  <img
                    src={school?.logoUrl || '/assets/kingdom/school_logo_v2.png'}
                    alt="School Logo"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/kingdom/school_logo_v2.png';
                    }}
                  />
                </div>
                <h4 className="font-['Fredoka',sans-serif] text-base font-bold text-[#1E3A8A]">
                  Vương Quốc Ngôi Sao • {currentClass?.nameVi || 'Lớp 2A5'}
                </h4>
                <p className="text-xs text-sky-600 font-semibold mb-3">
                  Quét mã để vào thẳng Cổng Học Sinh
                </p>

                {classQrUrl ? (
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-sky-200">
                    <img src={classQrUrl} alt="Class QR Code" className="w-56 h-56 object-contain" />
                  </div>
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-2xl animate-pulse">
                    <span className="text-xs text-slate-400">Đang tạo mã QR...</span>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Học sinh không cần mật khẩu, tự do xem sao & học tập
                </div>
              </div>

              {/* Link copy */}
              <div className="w-full max-w-md mt-4 flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 text-xs">
                <input
                  type="text"
                  readOnly
                  value={classPortalUrl}
                  className="bg-transparent flex-1 px-2 font-mono text-slate-600 outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl flex items-center gap-1 text-xs shrink-0 shadow-sm transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Student selector */}
              <div className="w-full md:w-1/2 max-h-[340px] overflow-y-auto pr-1 space-y-1.5">
                <p className="text-xs font-bold text-slate-500 px-1 mb-1">
                  Chọn học sinh để xem thẻ QR cá nhân:
                </p>
                {students.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStudent(st)}
                    className={`w-full flex items-center gap-3 p-2 rounded-2xl border text-left transition-all ${
                      selectedStudent?.id === st.id
                        ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                        : 'bg-white hover:bg-sky-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <img
                      src={st.avatarUrl || '/assets/kingdom/student_minh.png'}
                      alt={st.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-white shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{st.fullName}</div>
                      <div className={`text-xs ${selectedStudent?.id === st.id ? 'text-sky-100' : 'text-slate-400'}`}>
                        Mã: {st.studentCode || 'Chưa cấp'} • ⭐ {st.totalEarnedStars} sao
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Individual Student QR Card */}
              <div className="w-full md:w-1/2 flex flex-col items-center text-center">
                {selectedStudent ? (
                  <div className="bg-gradient-to-b from-sky-50 to-white p-4 rounded-3xl border-2 border-sky-200 shadow-md w-full max-w-[280px]">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <img
                        src={selectedStudent.avatarUrl || '/assets/kingdom/student_minh.png'}
                        alt={selectedStudent.fullName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-sm"
                      />
                      <div className="text-left">
                        <div className="font-['Fredoka',sans-serif] text-sm font-bold text-[#1E3A8A] leading-tight">
                          {selectedStudent.fullName}
                        </div>
                        <div className="text-[11px] font-bold text-sky-600">
                          Mã số: {selectedStudent.studentCode || selectedStudent.id}
                        </div>
                      </div>
                    </div>

                    {studentQrUrl ? (
                      <div className="bg-white p-2 rounded-2xl shadow-inner border border-sky-100 inline-block">
                        <img src={studentQrUrl} alt="Student QR" className="w-44 h-44 object-contain mx-auto" />
                      </div>
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center bg-slate-100 rounded-2xl mx-auto">
                        <span className="text-xs text-slate-400">Đang tạo...</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 font-medium mt-2">
                      Quét để đăng nhập trực tiếp bạn {selectedStudent.fullName}
                    </p>
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm py-12">
                    Vui lòng chọn một học sinh
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-sky-100 flex items-center justify-between gap-3">
          <a
            href={activeTab === 'class' ? classPortalUrl : (selectedStudent ? `${origin}?portal=student&code=${selectedStudent.studentCode || selectedStudent.id}` : classPortalUrl)}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            Mở thử liên kết trên tab mới
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'class' && classQrUrl) {
                  handleDownload(classQrUrl, `QR_Lop_${currentClass?.nameVi || '2A5'}.png`);
                } else if (activeTab === 'individual' && studentQrUrl && selectedStudent) {
                  handleDownload(studentQrUrl, `QR_${selectedStudent.studentCode || selectedStudent.fullName}.png`);
                }
              }}
              className="px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              Tải ảnh QR
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#263C72] hover:bg-[#1E3A8A] text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              In mã QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
