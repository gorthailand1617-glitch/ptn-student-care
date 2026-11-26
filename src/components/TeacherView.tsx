import React, { useMemo, useState } from 'react';
import {
  Search,
  Upload,
  FileSpreadsheet,
  Users,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Home,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { ImportSummary, RiskConfig, Student, TeacherStaff } from '../types';
import {
  addDaysISO,
  countOtherScreeningSignals,
  getEffectiveRisk,
  getGraduationCriteria,
  getRiskReasons,
  PATHWAYS_SHORT,
  RISK_LABELS,
} from '../utils/riskEngine';
import {
  downloadWeeklyTemplateExcel,
  parseSchoolRosterWorkbook,
  parseWeeklyAcademicCSV,
  previewWeeklyCsvRows,
  WEEKLY_CSV_HEADER,
} from '../utils/excelParser';
import { RowActionDropdown, SkeletonTable } from './ui/ClayPrimitives';
import { RiskMapView } from './RiskMapView';
import { compressProfileImageFile, storeProfilePhoto } from '../utils/imageCompressor';

export type StudentSheetTab = 'graduation' | 'screening' | 'plans' | 'visits';

interface Props {
  tab: number; // 0=ห้องของฉัน, 1=ติดตามแผน, 2=นำเข้าข้อมูล
  students: Student[];
  staff: TeacherStaff[];
  activeStaffId: string;
  onChangeActiveStaff: (id: string) => void;
  config: RiskConfig;
  onSelectStudent: (s: Student, initialTab?: StudentSheetTab) => void;
  onQuickNotifyLine: (s: Student) => void;
  onBulkAssign: (studentIds: string[], pathwayIndex: number) => void;
  onTogglePlanDone: (studentId: string, planId: string, done: boolean) => void;
  onImportStudents: (nextStudents: Student[], summary: ImportSummary, sourceLabel: string) => void;
  onLoadRealSeed: () => void;
}

const PAGE_SIZE = 15;

export const TeacherView: React.FC<Props> = ({
  tab,
  students,
  staff,
  activeStaffId,
  onChangeActiveStaff,
  config,
  onSelectStudent,
  onQuickNotifyLine,
  onBulkAssign,
  onTogglePlanDone,
  onImportStudents,
  onLoadRealSeed,
}) => {
  const [query, setQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState<'' | 'r' | 'y' | 'g'>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkPathway, setBulkPathway] = useState(0);
  const [csvText, setCsvText] = useState('');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [bulkPhotoSummary, setBulkPhotoSummary] = useState<{ matched: number; unmatched: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const activeStaff = useMemo(
    () => staff.find((st) => st.id === activeStaffId) || null,
    [staff, activeStaffId]
  );

  const scopedStudents = useMemo(() => {
    if (!activeStaff) return students;
    if (activeStaff.staffRole === 'homeroom' && activeStaff.rooms.length > 0) {
      return students.filter((s) => activeStaff.rooms.includes(s.room));
    }
    if (activeStaff.staffRole === 'case_manager') {
      const assigned = students.filter((s) => s.assignedCaseManagerId === activeStaff.id);
      return assigned.length > 0 ? assigned : students;
    }
    return students;
  }, [students, activeStaff]);

  const rooms = useMemo(() => {
    const set = new Set(scopedStudents.map((s) => s.room));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [scopedStudents]);

  const counts = useMemo(() => {
    const c = { r: 0, y: 0, g: 0 };
    scopedStudents.forEach((s) => {
      c[getEffectiveRisk(s, config)]++;
    });
    return c;
  }, [scopedStudents, config]);

  const planAlerts = useMemo(() => {
    const today = addDaysISO(0);
    const soon = addDaysISO(3);
    let overdue = 0;
    let dueSoon = 0;
    scopedStudents.forEach((s) => {
      s.plans.forEach((p) => {
        if (!p.done) {
          if (p.due < today) overdue++;
          else if (p.due <= soon) dueSoon++;
        }
      });
    });
    return { overdue, dueSoon };
  }, [scopedStudents]);

  const filteredStudents = useMemo(() => {
    const order = { r: 0, y: 1, g: 2 };
    const q = query.trim().toLowerCase();
    return scopedStudents
      .filter((s) => {
        if (roomFilter && s.room !== roomFilter) return false;
        if (riskFilter && getEffectiveRisk(s, config) !== riskFilter) return false;
        if (q && !s.name.toLowerCase().includes(q) && !s.code.includes(q)) return false;
        return true;
      })
      .sort((a, b) => order[getEffectiveRisk(a, config)] - order[getEffectiveRisk(b, config)] || a.no - b.no);
  }, [scopedStudents, roomFilter, riskFilter, query, config]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, safePage]);

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  const handleBulkClick = () => {
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (ids.length === 0) return;
    onBulkAssign(ids, bulkPathway);
    setSelectedIds({});
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      await new Promise((r) => setTimeout(r, 450)); // Smooth skeleton feedback
      const { students: next, summary } = parseSchoolRosterWorkbook(buffer, students);
      setImportSummary(summary);
      onImportStudents(next, summary, `นำเข้าไฟล์ Excel (${file.name})`);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    setIsImporting(true);
    await new Promise((r) => setTimeout(r, 350));
    const { students: next, summary } = parseWeeklyAcademicCSV(csvText, students);
    setImportSummary(summary);
    onImportStudents(next, summary, 'อัปเดตผลการเรียน/เวลาเรียนรายสัปดาห์ (CSV)');
    setIsImporting(false);
  };

  const handleBulkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsImporting(true);
    try {
      const codeMap = new Map<string, Student>();
      students.forEach((s) => codeMap.set(s.code, { ...s }));
      let matched = 0;
      const unmatched: string[] = [];

      for (const file of files) {
        const baseName = file.name.replace(/\.[^.]+$/, '').trim();
        const target = codeMap.get(baseName);
        if (!target) {
          unmatched.push(file.name);
          continue;
        }
        const compressed = await compressProfileImageFile(file);
        const storedUrl = await storeProfilePhoto(target.code, 'student.webp', compressed);
        target.studentPhotoUrl = storedUrl;
        codeMap.set(target.code, target);
        matched++;
      }

      setBulkPhotoSummary({ matched, unmatched });
      if (matched > 0) {
        onImportStudents(
          Array.from(codeMap.values()),
          { added: 0, updated: matched, skipped: unmatched.length, rooms: [], errors: [] },
          `นำเข้ารูปถ่ายนักเรียนแบบกลุ่ม (${matched} รูป)`
        );
      }
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  // Tab 3: Risk Map View
  if (tab === 3) {
    return (
      <RiskMapView
        students={scopedStudents}
        config={config}
        onSelectStudent={(s) => onSelectStudent(s, 'visits')}
      />
    );
  }

  // Tab 2: Import Data
  if (tab === 2) {
    return (
      <div className="space-y-5">
        <div className="clay-card p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <h2 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#4A7C82]" />
                นำเข้าไฟล์รายชื่อนักเรียนจริง (.xlsx)
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                รองรับไฟล์ <b>รายชื่อ นร. ม.1-6 ปี 69 (11-5-69).xlsx</b> โดยตรง (อ่านทั้ง 18 ชีตห้องเรียน ข้ามชีต “รวม” อัตโนมัติ ใช้เลขประจำตัวนักเรียนเป็น Primary Key)
              </p>
            </div>
            <button onClick={onLoadRealSeed} className="clay-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5">
              <Download className="w-4 h-4" /> โหลดรายชื่อจริง ม.1-6 ปี 69 (Seed)
            </button>
          </div>

          {isImporting ? (
            <div className="p-4">
              <p className="text-xs font-semibold text-[#4A7C82] mb-2">กำลังประมวลผลไฟล์ Excel...</p>
              <SkeletonTable rows={4} />
            </div>
          ) : (
            <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-[#4A7C82]/50 rounded-2xl p-6 bg-white/40 hover:bg-white/60 transition cursor-pointer">
              <Upload className="w-8 h-8 text-[#4A7C82] mb-2" />
              <span className="text-sm font-semibold text-[#2B3E50]">คลิกเพื่อเลือกไฟล์ Excel (.xlsx) ของโรงเรียน</span>
              <span className="text-xs text-slate-500 mt-1">หัวตารางแถวที่ 4: เลขที่ | เลขประจำตัวนักเรียน | ชื่อ - สกุล</span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFileChange} />
            </label>
          )}
        </div>

        {/* Bulk Photo Upload Card */}
        <div className="clay-card p-5 space-y-3">
          <h2 className="text-base font-bold text-[#2B3E50]">นำเข้ารูปถ่ายนักเรียนแบบกลุ่ม (Bulk Photo Upload)</h2>
          <p className="text-xs text-slate-600">
            เลือกไฟล์รูปภาพหลายไฟล์พร้อมกัน ระบบจะจับคู่ชื่อไฟล์กับ <b>เลขประจำตัวนักเรียน</b> อัตโนมัติ (เช่น <code>3649.jpg</code> → รหัส <code>3649</code>) และบีบอัดเป็น 400×400 px
          </p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#4A7C82]/45 rounded-2xl p-5 bg-white/40 hover:bg-white/60 transition cursor-pointer">
            <Upload className="w-7 h-7 text-[#4A7C82] mb-1.5" />
            <span className="text-xs sm:text-sm font-semibold text-[#2B3E50]">คลิกเพื่อเลือกไฟล์รูปภาพนักเรียนหลายไฟล์พร้อมกัน</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleBulkPhotoUpload} />
          </label>
          {bulkPhotoSummary && (
            <div className="clay-card-light p-3 text-xs">
              จับคู่สำเร็จ <b>{bulkPhotoSummary.matched}</b> รูป · ไม่พบเลขประจำตัว <b>{bulkPhotoSummary.unmatched.length}</b> ไฟล์
              {bulkPhotoSummary.unmatched.length > 0 && (
                <div className="text-rose-700 mt-1">ไฟล์ที่ไม่พบ: {bulkPhotoSummary.unmatched.slice(0, 8).join(', ')}</div>
              )}
            </div>
          )}
        </div>

        <div className="clay-card p-5">
          <h2 className="text-base font-bold text-[#2B3E50] mb-1">อัปเดตผลการเรียน / เวลาเรียนรายสัปดาห์ (CSV / วางจาก Excel)</h2>
          <p className="text-xs text-slate-600 mb-3">
            ระบบจะ Upsert ตามรหัสนักเรียน แผนช่วยเหลือและบันทึกเยี่ยมบ้านเดิมจะไม่หาย
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={5}
            placeholder="วางข้อมูลจาก Excel / SGS / ปพ.5 หรือ CSV ที่นี่..."
            className="clay-input w-full p-3 text-xs font-mono mb-3"
          />

          {/* 5-Row SGS/ปพ.5 Import Preview Table */}
          {csvText.trim() && (
            <div className="mb-3 overflow-x-auto rounded-xl bg-white/60 border border-white p-2.5">
              <div className="text-[11px] font-bold text-[#4A7C82] mb-1.5">
                พรีวิวข้อมูล 5 แถวแรกก่อนนำเข้า (SGS / ปพ.5 Smart Preview)
              </div>
              <table className="w-full text-[11px] text-left border-collapse">
                <tbody>
                  {previewWeeklyCsvRows(csvText).map((cols, rIdx) => (
                    <tr key={rIdx} className={rIdx === 0 ? 'font-bold bg-slate-200/60' : 'border-t border-slate-200'}>
                      {cols.slice(0, 8).map((c, cIdx) => (
                        <td key={cIdx} className="px-2 py-1 truncate max-w-[110px]">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCsvImport} className="clay-btn-primary px-5 py-2 text-xs font-semibold">
              นำเข้าและอัปเดตข้อมูล
            </button>
            <button
              onClick={() => downloadWeeklyTemplateExcel(students[0])}
              className="clay-btn-soft px-4 py-2 text-xs font-semibold inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-[#4A7C82]" /> ดาวน์โหลดเทมเพลต Excel 12 คอลัมน์ (SGS/ปพ.5)
            </button>
            <button
              onClick={() =>
                setCsvText(
                  `${WEEKLY_CSV_HEADER}\n${students[0]?.code || '10001'},${students[0]?.name || 'ตัวอย่าง นักเรียน'},${students[0]?.room || 'ม.6/1'},72,62,81,3,2,2,ปรับปรุง,1,0`
                )
              }
              className="clay-btn-soft px-4 py-2 text-xs font-semibold"
            >
              ใส่ตัวอย่างในช่องข้อความ
            </button>
          </div>
        </div>

        {importSummary && (
          <div className="clay-card-light p-4 border-l-4 border-[#4A7C82]">
            <h3 className="font-bold text-sm text-[#2B3E50] mb-1">สรุปผลการนำเข้า</h3>
            <p className="text-xs text-slate-700">
              เพิ่มใหม่ <b>{importSummary.added}</b> คน · อัปเดต <b>{importSummary.updated}</b> คน · ข้าม <b>{importSummary.skipped}</b> แถว
              {importSummary.rooms.length > 0 && ` · ห้องที่นำเข้า (${importSummary.rooms.length} ห้อง)`}
            </p>
            {importSummary.errors.length > 0 && (
              <ul className="mt-2 text-xs text-rose-700 list-disc pl-5 space-y-0.5">
                {importSummary.errors.slice(0, 8).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  // Tab 1: Plan & Home Visit Tracking
  if (tab === 1) {
    const today = addDaysISO(0);
    const allPlans = scopedStudents.flatMap((s) => s.plans.map((p) => ({ student: s, plan: p })));
    const allVisits = scopedStudents.flatMap((s) => s.visits.map((v) => ({ student: s, visit: v })));

    return (
      <div className="space-y-5">
        <div className="clay-card p-5">
          <h2 className="text-lg font-bold text-[#2B3E50] mb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#4A7C82]" />
            แผนช่วยเหลือที่กำลังติดตาม ({allPlans.length})
          </h2>
          {allPlans.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มีแผนช่วยเหลือ ลองแตะชื่อนักเรียนในหน้า “ห้องของฉัน” เพื่อเพิ่มแผน</p>
          ) : (
            <div className="space-y-2.5">
              {allPlans.map(({ student, plan }) => {
                const overdue = !plan.done && plan.due < today;
                return (
                  <div key={plan.id} className="clay-card-light p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => onSelectStudent(student, 'plans')}
                          className="font-bold text-sm text-[#2B3E50] hover:underline"
                        >
                          {student.name} ({student.room})
                        </button>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#4A7C82]/15 text-[#2B3E50] font-semibold">
                          {PATHWAYS_SHORT[plan.pathwayIndex]}
                        </span>
                        {plan.approvalStatus && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                            {plan.approvalStatus}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        ผู้รับผิดชอบ: {plan.by} · กำหนดเสร็จ: {plan.due}{' '}
                        {overdue && <span className="text-rose-600 font-bold">· เลยกำหนด!</span>}
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2B3E50] shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.done}
                        onChange={(e) => onTogglePlanDone(student.id, plan.id, e.target.checked)}
                        className="w-4 h-4 accent-[#4A7C82]"
                      />
                      เสร็จแล้ว
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="clay-card p-5">
          <h2 className="text-base font-bold text-[#2B3E50] mb-3">บันทึกเยี่ยมบ้าน / พาน้องกลับมาเรียน ({allVisits.length})</h2>
          {allVisits.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มีบันทึกการเยี่ยมบ้าน</p>
          ) : (
            <div className="space-y-2.5">
              {allVisits.map(({ student, visit }) => (
                <div key={visit.id} className="clay-card-light p-3.5 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <div className="font-bold text-sm text-[#2B3E50]">
                      🏠 {student.name} ({student.room}) · <span className="text-[#4A7C82]">{visit.status}</span>
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      {visit.date} · ผู้ติดต่อ: {visit.contactName} {visit.needs && `· ${visit.needs}`}
                    </div>
                    {visit.location && (
                      <a
                        href={`https://www.google.com/maps?q=${visit.location.lat},${visit.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#4A7C82] font-semibold mt-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> นำทาง Google Maps
                      </a>
                    )}
                  </div>
                  {visit.photoDataUrl && (
                    <img src={visit.photoDataUrl} alt="เยี่ยมบ้าน" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tab 0: Data Table + Pagination + Dropdown Menu
  return (
    <div className="space-y-5">
      {/* Room Scoping Bar */}
      <div className="clay-card-light px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[#2B3E50]">มุมมองครูผู้ใช้งาน (Room Scoping):</span>
        <select
          value={activeStaffId}
          onChange={(e) => {
            onChangeActiveStaff(e.target.value);
            setRoomFilter('');
            setPage(1);
          }}
          className="clay-input px-3 py-1.5 text-xs font-semibold"
        >
          <option value="">ครูแนะแนว / ดูทุกห้อง ({students.length} คน)</option>
          {staff
            .filter((st) => st.active)
            .map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} (
                {st.staffRole === 'homeroom'
                  ? `ประจำชั้น ${st.rooms.join(', ') || 'ทุกห้อง'}`
                  : st.staffRole === 'case_manager'
                  ? 'ผู้ดูแลเคส'
                  : 'แนะแนว'}
                )
              </option>
            ))}
        </select>
      </div>

      {(planAlerts.overdue > 0 || planAlerts.dueSoon > 0) && (
        <div className="rounded-2xl bg-amber-100/90 border border-amber-300 px-4 py-3 text-xs text-amber-900 flex items-center gap-2 shadow-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            <b>แจ้งเตือนแผนช่วยเหลือ:</b> เลยกำหนด <b>{planAlerts.overdue}</b> รายการ · ใกล้ครบกำหนดใน 3 วัน{' '}
            <b>{planAlerts.dueSoon}</b> รายการ
          </span>
        </div>
      )}

      {/* Traffic Light KPI Filter Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => {
            setRiskFilter(riskFilter === 'r' ? '' : 'r');
            setPage(1);
          }}
          className={`clay-kpi-lavender p-4 text-left transition ${riskFilter === 'r' ? 'ring-2 ring-[#2B3E50]' : ''}`}
        >
          <div className="text-xs font-semibold text-white/90">เสี่ยงสูง (เร่งด่วน)</div>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-1">{counts.r}</div>
          <div className="text-[11px] text-white/80 mt-0.5">แตะเพื่อกรอง</div>
        </button>

        <button
          onClick={() => {
            setRiskFilter(riskFilter === 'y' ? '' : 'y');
            setPage(1);
          }}
          className={`clay-kpi-steel p-4 text-left transition ${riskFilter === 'y' ? 'ring-2 ring-[#2B3E50]' : ''}`}
        >
          <div className="text-xs font-semibold text-[#1E2E3E]">เฝ้าระวัง</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1E2E3E] mt-1">{counts.y}</div>
          <div className="text-[11px] text-slate-700 mt-0.5">ควรเริ่มคุยผู้ปกครอง</div>
        </button>

        <button
          onClick={() => {
            setRiskFilter(riskFilter === 'g' ? '' : 'g');
            setPage(1);
          }}
          className={`clay-kpi-teal p-4 text-left transition ${riskFilter === 'g' ? 'ring-2 ring-[#2B3E50]' : ''}`}
        >
          <div className="text-xs font-semibold text-[#1E2E3E]">ปกติ</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1E2E3E] mt-1">{counts.g}</div>
          <div className="text-[11px] text-slate-700 mt-0.5">ติดตามตามรอบ</div>
        </button>
      </div>

      {/* Data Table Card */}
      <div className="clay-card p-4 sm:p-5 space-y-3.5">
        {/* Search & Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อ-สกุล หรือเลขประจำตัวนักเรียน..."
              className="clay-input w-full pl-10 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={roomFilter}
            onChange={(e) => {
              setRoomFilter(e.target.value);
              setPage(1);
            }}
            className="clay-input px-3 py-2 text-sm"
          >
            <option value="">ทุกห้องเรียน ({rooms.length} ห้อง)</option>
            {rooms.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Bulk Action Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/40">
          <span className="text-xs font-semibold text-[#2B3E50] inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> เลือกแล้ว {selectedCount} คน:
          </span>
          <select
            value={bulkPathway}
            onChange={(e) => setBulkPathway(Number(e.target.value))}
            className="clay-input px-3 py-1.5 text-xs flex-1 min-w-[160px]"
          >
            {PATHWAYS_SHORT.map((p, i) => (
              <option key={p} value={i}>{i + 1}. {p}</option>
            ))}
          </select>
          <button
            disabled={selectedCount === 0}
            onClick={handleBulkClick}
            className="clay-btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            ใส่แผนพร้อมกัน (Bulk)
          </button>
        </div>

        {/* Responsive Data Table */}
        <div className="overflow-x-auto rounded-2xl bg-white/45 border border-white/60">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#2B3E50]/10 text-[#2B3E50] text-xs font-bold border-b border-white/60">
                <th className="p-3 w-10">เลือก</th>
                <th className="p-3">นักเรียน / รหัส</th>
                <th className="p-3 hidden sm:table-cell">ห้อง</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3 hidden md:table-cell">สัญญาณสำคัญ</th>
                <th className="p-3 text-center">เกณฑ์จบ</th>
                <th className="p-3 text-right w-14">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300/40">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 text-sm">
                    ไม่พบรายชื่อนักเรียนที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => {
                  const risk = getEffectiveRisk(s, config);
                  const crit = getGraduationCriteria(s, config);
                  const reasons = getRiskReasons(s, config);
                  const other = countOtherScreeningSignals(s);
                  const badgeClass =
                    risk === 'r'
                      ? 'bg-rose-100 text-rose-700'
                      : risk === 'y'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800';

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectStudent(s, 'graduation')}
                      className="hover:bg-white/65 transition cursor-pointer"
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedIds[s.id])}
                          onChange={(e) => setSelectedIds((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                          className="w-4 h-4 accent-[#4A7C82]"
                          aria-label={`เลือก ${s.name}`}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {s.studentPhotoUrl ? (
                            <img src={s.studentPhotoUrl} alt={s.name} className="w-9 h-9 rounded-full object-cover border border-white shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#92C2C2]/45 text-[#2B3E50] font-bold text-xs flex items-center justify-center shrink-0">
                              {s.name.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-[#2B3E50]">
                              {s.name} {s.asks.length > 0 && <span title="นักเรียนขอความช่วยเหลือ">🙋</span>}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              รหัส {s.code} <span className="sm:hidden">· {s.room}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell font-medium text-slate-700">{s.room}</td>
                      <td className="p-3">
                        <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeClass}`}>
                          {s.skipReason ? 'ข้ามเตือน' : RISK_LABELS[risk]}
                        </span>
                      </td>
                      <td className="p-3 hidden md:table-cell text-xs text-slate-600 max-w-[200px] truncate">
                        {s.skipReason || reasons[0] || (other > 0 ? `คัดกรองด้านอื่น ${other} ด้าน` : 'ไม่มีสัญญาณเสี่ยง')}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2B3E50] bg-white/80 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7C82]" /> {crit.passedCount}/5
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <RowActionDropdown
                          actions={[
                            {
                              label: 'ดูรายละเอียด',
                              icon: <Eye className="w-3.5 h-3.5 text-[#4A7C82]" />,
                              onClick: () => onSelectStudent(s, 'graduation'),
                            },
                            {
                              label: 'กำหนดแผนช่วยเหลือ',
                              icon: <Sparkles className="w-3.5 h-3.5 text-[#4A7C82]" />,
                              onClick: () => onSelectStudent(s, 'plans'),
                            },
                            {
                              label: 'บันทึกเยี่ยมบ้าน',
                              icon: <Home className="w-3.5 h-3.5 text-[#4A7C82]" />,
                              onClick: () => onSelectStudent(s, 'visits'),
                            },
                            {
                              label: 'แจ้งผู้ปกครองทาง LINE',
                              icon: <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />,
                              onClick: () => onQuickNotifyLine(s),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600">
          <span>
            แสดง {filteredStudents.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredStudents.length)} จากทั้งหมด <b>{filteredStudents.length}</b> คน
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="clay-btn-soft px-3 py-1.5 font-semibold inline-flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> ก่อนหน้า
            </button>
            <span className="font-bold text-[#2B3E50] px-2">
              หน้า {safePage} / {totalPages}
            </span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="clay-btn-soft px-3 py-1.5 font-semibold inline-flex items-center gap-1 disabled:opacity-40"
            >
              ถัดไป <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
