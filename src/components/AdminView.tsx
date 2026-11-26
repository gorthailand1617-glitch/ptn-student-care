import React, { useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Clock,
  Sliders,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AuditLog, RiskConfig, RiskLevel, SchoolProfile, Student, TeacherStaff } from '../types';
import {
  addDaysISO,
  computeCalibrationText,
  getEffectiveRisk,
  getGraduationCriteria,
  getRiskReasons,
  PATHWAYS_SHORT,
  RISK_LABELS,
} from '../utils/riskEngine';
import { exportAnonymizedResearchCsv, exportStudentsToExcel, openOfficialPrintReport } from '../utils/excelParser';
import { ConfirmDialogState, RowActionDropdown } from './ui/ClayPrimitives';

interface Props {
  tab: number; // 0=ภาพรวม, 1=อนุมัติ, 2=ความคืบหน้า, 3=ตั้งค่า, 4=บันทึก PDPA, 5=โอนย้ายครู
  students: Student[];
  staff: TeacherStaff[];
  config: RiskConfig;
  school: SchoolProfile;
  auditLogs: AuditLog[];
  roomUpdates: Record<string, number>;
  onUpdateConfig: (next: RiskConfig) => void;
  onApprovePlan: (studentId: string, planId: string, approve: boolean) => void;
  onRequestConfirm: (dialog: Omit<ConfirmDialogState, 'open'>) => void;
  onOpenStudentTimeline: (student: Student) => void;
  onReassignRoomAdvisor: (room: string, newAdvisorName: string) => void;
  onReassignStudentAdvisor: (studentId: string, newAdvisorName: string) => void;
}

const PIE_COLORS = ['#4A7C82', '#92C2C2', '#6488A2', '#9694B8', '#5F9EA0', '#779ECB', '#8FA8B8', '#34495E'];

export const AdminView: React.FC<Props> = ({
  tab,
  students,
  staff,
  config,
  school,
  auditLogs,
  roomUpdates,
  onUpdateConfig,
  onApprovePlan,
  onRequestConfirm,
  onOpenStudentTimeline,
  onReassignRoomAdvisor,
  onReassignStudentAdvisor,
}) => {
  const [drillLevel, setDrillLevel] = useState<RiskLevel | null>(null);
  const [adminQuery, setAdminQuery] = useState('');
  const [adminRoom, setAdminRoom] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const [reassignRoom, setReassignRoom] = useState('');
  const [reassignNewAdvisor, setReassignNewAdvisor] = useState('');
  const [reassignStudentId, setReassignStudentId] = useState('');
  const [reassignSingleAdvisor, setReassignSingleAdvisor] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const allRooms = useMemo(
    () => Array.from(new Set(students.map((s) => s.room))).sort((a, b) => a.localeCompare(b, 'th')),
    [students]
  );

  const adminFilteredStudents = useMemo(() => {
    const order = { r: 0, y: 1, g: 2 };
    const q = adminQuery.trim().toLowerCase();
    return students
      .filter((s) => {
        if (drillLevel && getEffectiveRisk(s, config) !== drillLevel) return false;
        if (adminRoom && s.room !== adminRoom) return false;
        if (q && !s.name.toLowerCase().includes(q) && !s.code.includes(q)) return false;
        return true;
      })
      .sort((a, b) => order[getEffectiveRisk(a, config)] - order[getEffectiveRisk(b, config)] || a.no - b.no);
  }, [students, drillLevel, adminRoom, adminQuery, config]);

  const ADMIN_PAGE_SIZE = 15;
  const adminTotalPages = Math.max(1, Math.ceil(adminFilteredStudents.length / ADMIN_PAGE_SIZE));
  const safeAdminPage = Math.min(adminPage, adminTotalPages);
  const adminPaginated = useMemo(() => {
    const start = (safeAdminPage - 1) * ADMIN_PAGE_SIZE;
    return adminFilteredStudents.slice(start, start + ADMIN_PAGE_SIZE);
  }, [adminFilteredStudents, safeAdminPage]);

  const stats = useMemo(() => {
    const counts = { g: 0, y: 0, r: 0 };
    const byGrade: Record<string, { grade: string; r: number; y: number; g: number }> = {};
    const reasonsMap: Record<string, number> = {};
    const pathwayCounts = PATHWAYS_SHORT.map((name) => ({ name, value: 0 }));
    let askCount = 0;
    let passedAll5 = 0;

    students.forEach((s) => {
      const rk = getEffectiveRisk(s, config);
      counts[rk]++;
      if (getGraduationCriteria(s, config).passedCount === 5) passedAll5++;
      const grade = s.room.split('/')[0] || 'อื่นๆ';
      if (!byGrade[grade]) byGrade[grade] = { grade, r: 0, y: 0, g: 0 };
      byGrade[grade][rk]++;
      getRiskReasons(s, config).forEach((r) => {
        reasonsMap[r] = (reasonsMap[r] || 0) + 1;
      });
      s.plans.forEach((p) => {
        if (pathwayCounts[p.pathwayIndex]) pathwayCounts[p.pathwayIndex].value++;
      });
      if (s.asks.length > 0) askCount++;
    });

    const monthlyLabels = ['ก.ค.', 'ส.ค.', 'ก.ย.', 'ปัจจุบัน'];
    const monthlyTrend = monthlyLabels.map((month, i) => {
      const m = { month, r: 0, y: 0, g: 0 };
      students.forEach((s) => {
        const k: RiskLevel = i < 3 ? s.history[i] || 'g' : getEffectiveRisk(s, config);
        m[k]++;
      });
      return m;
    });

    const topReasons = Object.entries(reasonsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const activePathways = pathwayCounts.filter((p) => p.value > 0);

    return {
      counts,
      passedAll5,
      gradeData: Object.values(byGrade).sort((a, b) => a.grade.localeCompare(b.grade, 'th')),
      monthlyTrend,
      topReasons,
      activePathways,
      askCount,
    };
  }, [students, config]);

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: '#CFDCE4' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const width = pdf.internal.pageSize.getWidth() - 16;
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 8, 8, width, Math.min(height, 275));
    pdf.save(`PTN-Student-Care-Summary-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Tab 5: Admin Reassignment (จัดการห้องเรียน / โอนย้ายครูที่ปรึกษา)
  if (tab === 5) {
    const activeTeachers = staff.filter((st) => st.active);
    return (
      <div className="space-y-5">
        <div className="clay-card p-5 space-y-3">
          <h2 className="text-lg font-bold text-[#2B3E50]">โอนย้ายครูที่ปรึกษาทั้งห้อง (Bulk Reassign)</h2>
          <p className="text-xs text-slate-600">
            เมื่อโอนย้ายแล้ว สิทธิ์เข้าถึงข้อมูลอ่อนไหว (PDPA) จะโอนไปยังครูคนใหม่ทันที โดยประวัติ Timeline เดิมยังคงระบุชื่อครูคนเก่าไว้เป็นหลักฐาน และบันทึกลง Audit Log อัตโนมัติ
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              value={reassignRoom}
              onChange={(e) => setReassignRoom(e.target.value)}
              className="clay-input px-3 py-2 text-sm"
            >
              <option value="">-- เลือกห้องเรียน --</option>
              {allRooms.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              value={reassignNewAdvisor}
              onChange={(e) => setReassignNewAdvisor(e.target.value)}
              className="clay-input px-3 py-2 text-sm"
            >
              <option value="">-- เลือกครูที่ปรึกษาคนใหม่ --</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
            <button
              disabled={!reassignRoom || !reassignNewAdvisor}
              onClick={() =>
                onRequestConfirm({
                  title: 'ยืนยันโอนย้ายครูที่ปรึกษาทั้งห้อง',
                  description: `โอนย้ายนักเรียนทุกคนในห้อง ${reassignRoom} ไปอยู่ในการดูแลของ ${reassignNewAdvisor} ใช่หรือไม่? (สิทธิ์ PDPA จะโอนทันทีและบันทึกลง Audit Log)`,
                  confirmLabel: 'ยืนยันโอนย้ายทั้งห้อง',
                  onConfirm: () => {
                    onReassignRoomAdvisor(reassignRoom, reassignNewAdvisor);
                    setReassignRoom('');
                    setReassignNewAdvisor('');
                  },
                })
              }
              className="clay-btn-primary px-4 py-2 text-xs font-bold disabled:opacity-40"
            >
              โอนย้ายครูที่ปรึกษาทั้งห้อง
            </button>
          </div>
        </div>

        <div className="clay-card p-5 space-y-3">
          <h2 className="text-base font-bold text-[#2B3E50]">โอนย้ายครูที่ปรึกษารายบุคคล</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              value={reassignStudentId}
              onChange={(e) => setReassignStudentId(e.target.value)}
              className="clay-input px-3 py-2 text-sm"
            >
              <option value="">-- เลือกนักเรียน --</option>
              {students.slice(0, 80).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.room}) · ปัจจุบัน: {s.advisor}
                </option>
              ))}
            </select>
            <select
              value={reassignSingleAdvisor}
              onChange={(e) => setReassignSingleAdvisor(e.target.value)}
              className="clay-input px-3 py-2 text-sm"
            >
              <option value="">-- เลือกครูที่ปรึกษาคนใหม่ --</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
            <button
              disabled={!reassignStudentId || !reassignSingleAdvisor}
              onClick={() => {
                const stu = students.find((x) => x.id === reassignStudentId);
                if (!stu) return;
                onRequestConfirm({
                  title: 'ยืนยันโอนย้ายครูที่ปรึกษารายบุคคล',
                  description: `โอนย้าย ${stu.name} (${stu.room}) จาก ${stu.advisor} ไปยัง ${reassignSingleAdvisor} ใช่หรือไม่?`,
                  confirmLabel: 'ยืนยันโอนย้าย',
                  onConfirm: () => {
                    onReassignStudentAdvisor(stu.id, reassignSingleAdvisor);
                    setReassignStudentId('');
                    setReassignSingleAdvisor('');
                  },
                });
              }}
              className="clay-btn-soft px-4 py-2 text-xs font-bold disabled:opacity-40"
            >
              โอนย้ายรายบุคคล
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tab 4: PDPA Audit Logs
  if (tab === 4) {
    return (
      <div className="clay-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4A7C82]" />
            บันทึกการเข้าถึงข้อมูล (PDPA Audit Logs)
          </h2>
          <span className="text-xs px-3 py-1 rounded-full bg-white/70 text-slate-600 font-semibold">
            แก้ไข/ลบไม่ได้ (Append-Only)
          </span>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่มีบันทึกการเข้าถึงข้อมูล</p>
        ) : (
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="clay-card-light px-3.5 py-2.5 text-xs flex justify-between gap-2">
                <span className="text-[#2B3E50] font-medium">{log.action}</span>
                <span className="text-slate-500 shrink-0">{log.roleLabel} · {log.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Tab 3: Settings & Calibration
  if (tab === 3) {
    const falseAlarms = students.filter((s) => Boolean(s.skipReason)).length;
    const missedAlerts = students.filter((s) => s.feedback === 'miss').length;

    return (
      <div className="space-y-5">
        <div className="clay-card p-5 space-y-3">
          <h2 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#4A7C82]" /> ตั้งเกณฑ์ Early Warning
          </h2>
          <p className="text-xs text-slate-600">
            สิทธิ์สนับสนุน/ทุนเสมอภาคตั้งน้ำหนักความเสี่ยง = 0 โดยค่าเริ่มต้นเพื่อไม่ตีตรานักเรียน
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'minAttendancePct', label: 'เกณฑ์เวลาเรียนขั้นต่ำ (%)' },
              { key: 'yellowThreshold', label: 'คะแนนเริ่มเฝ้าระวัง (เหลือง)' },
              { key: 'redThreshold', label: 'คะแนนเริ่มเสี่ยงสูง (แดง)' },
              { key: 'equitySupportWeight', label: 'น้ำหนักทุนเสมอภาค (0 = ไม่ตีตรา)' },
              { key: 'transitionGradeWeight', label: 'น้ำหนักช่วงรอยต่อชั้น (ม.1/ม.4)' },
            ].map((item) => (
              <div key={item.key}>
                <label className="text-xs font-semibold text-[#2B3E50] block mb-1">{item.label}</label>
                <input
                  type="number"
                  value={config[item.key as keyof RiskConfig]}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, [item.key]: Number(e.target.value) })
                  }
                  className="clay-input w-full px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="clay-card p-5 space-y-2">
          <h3 className="font-bold text-[#2B3E50]">ความแม่นยำของระบบ (95% Confidence Interval)</h3>
          <p className="text-sm text-slate-700">{computeCalibrationText(students, config)}</p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="clay-card-light p-3 text-center">
              <div className="text-xs text-slate-500">เตือนผิด (ครูข้ามการเตือน)</div>
              <div className="text-2xl font-bold text-[#2B3E50] mt-1">{falseAlarms}</div>
            </div>
            <div className="clay-card-light p-3 text-center">
              <div className="text-xs text-slate-500">เตือนพลาด (ครูแจ้งว่าควรเตือน)</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{missedAlerts}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tab 1: Approvals (Pathways 5 & 6)
  if (tab === 1) {
    const pending = students.flatMap((s) =>
      s.plans
        .filter((p) => p.approvalStatus === 'รออนุมัติ')
        .map((p) => ({ student: s, plan: p }))
    );

    return (
      <div className="clay-card p-5 space-y-3">
        <h2 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-[#4A7C82]" />
          รายการรอผู้บริหารอนุมัติ (เทียบโอน / Credit Bank / ส่งต่อ สกร.-อาชีวะ)
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">ไม่มีรายการรออนุมัติในขณะนี้</p>
        ) : (
          <div className="space-y-3">
            {pending.map(({ student, plan }) => (
              <div key={plan.id} className="clay-card-light p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[#2B3E50]">{student.name} · {student.room}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    เส้นทาง: <b>{PATHWAYS_SHORT[plan.pathwayIndex]}</b> · ผู้เสนอ: {plan.by} · กำหนด {plan.due}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      onRequestConfirm({
                        title: 'ยืนยันการอนุมัติคำร้อง',
                        description: `อนุมัติแผน “${PATHWAYS_SHORT[plan.pathwayIndex]}” สำหรับ ${student.name} (${student.room}) ใช่หรือไม่?`,
                        confirmLabel: 'อนุมัติแผน',
                        onConfirm: () => onApprovePlan(student.id, plan.id, true),
                      })
                    }
                    className="clay-btn-primary px-4 py-1.5 text-xs font-semibold"
                  >
                    อนุมัติ
                  </button>
                  <button
                    onClick={() =>
                      onRequestConfirm({
                        title: 'ยืนยันส่งกลับแก้ไข',
                        description: `ส่งกลับแผน “${PATHWAYS_SHORT[plan.pathwayIndex]}” ของ ${student.name} ให้ครูที่ปรึกษาทบทวนใช่หรือไม่?`,
                        confirmLabel: 'ส่งกลับแก้ไข',
                        danger: true,
                        onConfirm: () => onApprovePlan(student.id, plan.id, false),
                      })
                    }
                    className="clay-btn-soft px-4 py-1.5 text-xs font-semibold"
                  >
                    ส่งกลับแก้ไข
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Tab 2: Progress, Data Freshness & Export
  if (tab === 2) {
    const today = addDaysISO(0);
    let totalPlans = 0;
    let donePlans = 0;
    let overduePlans = 0;
    students.forEach((s) => {
      s.plans.forEach((p) => {
        totalPlans++;
        if (p.done) donePlans++;
        else if (p.due < today) overduePlans++;
      });
    });

    const roomList = Array.from(new Set([...Object.keys(roomUpdates), ...students.map((s) => s.room)])).sort((a, b) =>
      a.localeCompare(b, 'th')
    );

    return (
      <div className="space-y-5" ref={reportRef}>
        <div className="clay-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-[#2B3E50]">ตัวชี้วัดผลลัพธ์ & ส่งออกรายงาน</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportStudentsToExcel(students, config)}
                className="clay-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export Excel (.xlsx)
              </button>
              <button
                onClick={() => openOfficialPrintReport(students, config, school)}
                className="clay-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> รายงานราชการ PDF (มีตรา+ช่องลงนาม)
              </button>
              <button
                onClick={handleExportPdf}
                className="clay-btn-soft px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> แคปหน้าจอ PDF
              </button>
              <button
                onClick={() => exportAnonymizedResearchCsv(students, config)}
                className="clay-btn-soft px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 text-[#2B3E50]"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#4A7C82]" /> ชุดข้อมูลวิจัย (Anonymized CSV)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="clay-kpi-teal p-4">
              <div className="text-xs text-[#1E2E3E]">ผ่านเกณฑ์ครบ 5 ข้อ</div>
              <div className="text-2xl font-bold text-[#1E2E3E] mt-1">{stats.passedAll5}/{students.length}</div>
            </div>
            <div className="clay-kpi-steel p-4">
              <div className="text-xs text-[#1E2E3E]">แผนที่ทำเสร็จ</div>
              <div className="text-2xl font-bold text-[#1E2E3E] mt-1">{donePlans}/{totalPlans}</div>
            </div>
            <div className="clay-kpi-lavender p-4">
              <div className="text-xs text-white/90">แผนเลยกำหนด</div>
              <div className="text-2xl font-bold text-white mt-1">{overduePlans}</div>
            </div>
            <div className="clay-kpi-ice p-4">
              <div className="text-xs text-[#1E2E3E]">รูป นร. + ผปค. ครบแล้ว</div>
              <div className="text-2xl font-bold text-[#1E2E3E] mt-1">
                {students.filter((s) => Boolean(s.studentPhotoUrl) && Boolean(s.guardians?.[0]?.photoUrl)).length}/{students.length}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">ห้องที่ดูแล {roomList.length} ห้อง</div>
            </div>
          </div>
        </div>

        <div className="clay-card p-5">
          <h3 className="font-bold text-[#2B3E50] mb-3">การฟื้นตัวก่อน–หลัง & Longitudinal Cohort Tracking</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {(() => {
              const hadRiskBefore = students.filter((s) => s.history[0] && s.history[0] !== 'g');
              const recovered = hadRiskBefore.filter((s) => getEffectiveRisk(s, config) === 'g').length;
              const rate = hadRiskBefore.length > 0 ? Math.round((recovered / hadRiskBefore.length) * 100) : 0;
              const snapCount = students.reduce((acc, s) => acc + (s.cohortSnapshots?.length || 0), 0);
              return (
                <>
                  <div className="clay-card-light p-3.5">
                    <div className="text-slate-500">อัตราการฟื้นตัว (แดง/เหลือง → เขียว)</div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">{rate}%</div>
                    <div className="text-[11px] text-slate-600">{recovered} จาก {hadRiskBefore.length} คน</div>
                  </div>
                  <div className="clay-card-light p-3.5">
                    <div className="text-slate-500">จำนวน Snapshot ข้ามภาคเรียน</div>
                    <div className="text-2xl font-bold text-[#2B3E50] mt-1">{snapCount}</div>
                    <div className="text-[11px] text-slate-600">บันทึก Cohort ระยะยาว</div>
                  </div>
                  <div className="clay-card-light p-3.5">
                    <div className="text-slate-500">แผนที่ส่งต่อผู้ดูแลเคส</div>
                    <div className="text-2xl font-bold text-[#4A7C82] mt-1">
                      {students.filter((s) => Boolean(s.assignedCaseManagerId)).length}
                    </div>
                    <div className="text-[11px] text-slate-600">เคสที่ดูแลร่วมสหวิชาชีพ</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="clay-card p-5">
          <h3 className="font-bold text-[#2B3E50] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4A7C82]" /> ความสดของข้อมูลรายห้อง (แจ้งเตือนเมื่อเกิน 7 วัน)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {roomList.map((room) => {
              const days = roomUpdates[room] ?? 2;
              const stale = days > 7;
              return (
                <div key={room} className="clay-card-light px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#2B3E50]">{room}</span>
                  <span className={stale ? 'text-rose-600 font-bold' : 'text-emerald-700 font-medium'}>
                    {stale ? `ยังไม่อัปเดต ${days} วัน` : `อัปเดต ${days} วันก่อน`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Tab 0: Executive Overview Dashboard (Soft 3D Claymorphism matching ui-ref.jpg)
  const drillStudents = drillLevel ? students.filter((s) => getEffectiveRisk(s, config) === drillLevel) : [];

  return (
    <div className="space-y-5" ref={reportRef}>
      {/* 4 Pastel 3D KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="clay-kpi-teal p-4 flex flex-col justify-between">
          <div className="clay-icon-tile w-10 h-10 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-[#2B3E50]" />
          </div>
          <div className="text-xs font-medium text-[#1E2E3E]/85">นักเรียนทั้งหมด</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1E2E3E]">{students.length}</div>
          <div className="text-[11px] text-[#1E2E3E]/70 mt-0.5">ม.1 – ม.6 ปีการศึกษา 2569</div>
        </div>

        <button
          onClick={() => setDrillLevel(drillLevel === 'g' ? null : 'g')}
          className="clay-kpi-steel p-4 text-left flex flex-col justify-between hover:brightness-105 transition"
        >
          <div className="clay-icon-tile w-10 h-10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5 text-[#2B3E50]" />
          </div>
          <div className="text-xs font-medium text-[#1E2E3E]/85">ปกติ (แตะดูรายชื่อ)</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1E2E3E]">{stats.counts.g}</div>
          <div className="text-[11px] text-[#1E2E3E]/70 mt-0.5">ผ่านครบ 5 เกณฑ์ {stats.passedAll5} คน</div>
        </button>

        <button
          onClick={() => setDrillLevel(drillLevel === 'y' ? null : 'y')}
          className="clay-kpi-ice p-4 text-left flex flex-col justify-between hover:brightness-105 transition"
        >
          <div className="clay-icon-tile w-10 h-10 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="text-xs font-medium text-[#1E2E3E]/85">เฝ้าระวัง (แตะดูรายชื่อ)</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1E2E3E]">{stats.counts.y}</div>
          <div className="text-[11px] text-[#1E2E3E]/70 mt-0.5">เริ่มดูแลเชิงป้องกัน</div>
        </button>

        <button
          onClick={() => setDrillLevel(drillLevel === 'r' ? null : 'r')}
          className="clay-kpi-lavender p-4 text-left flex flex-col justify-between hover:brightness-105 transition"
        >
          <div className="clay-icon-tile w-10 h-10 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="text-xs font-medium text-white/90">เสี่ยงสูง (แตะดูรายชื่อ)</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{stats.counts.r}</div>
          <div className="text-[11px] text-white/80 mt-0.5">ต้องมีแผนช่วยเหลือเร่งด่วน</div>
        </button>
      </div>

      {/* School-wide Student Data Table + Drill-down + Pagination */}
      <div className="clay-card p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-[#2B3E50]">
              ตารางติดตามนักเรียนทั้งโรงเรียน {drillLevel ? `(กรอง: ${RISK_LABELS[drillLevel]})` : ''}
            </h3>
            <p className="text-xs text-slate-500">คลิกชื่อนักเรียนหรือปุ่มจุด 3 จุด เพื่อเปิดดูไทม์ไลน์การช่วยเหลือรายบุคคล</p>
          </div>
          {drillLevel && (
            <button
              onClick={() => {
                setDrillLevel(null);
                setAdminPage(1);
              }}
              className="clay-btn-soft px-3 py-1.5 text-xs font-semibold text-[#4A7C82]"
            >
              ล้างตัวกรองกลุ่มเสี่ยง
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={adminQuery}
              onChange={(e) => {
                setAdminQuery(e.target.value);
                setAdminPage(1);
              }}
              placeholder="ค้นหาชื่อ-สกุล หรือเลขประจำตัวนักเรียน..."
              className="clay-input w-full pl-10 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={adminRoom}
            onChange={(e) => {
              setAdminRoom(e.target.value);
              setAdminPage(1);
            }}
            className="clay-input px-3 py-2 text-sm"
          >
            <option value="">ทุกห้องเรียน ({allRooms.length} ห้อง)</option>
            {allRooms.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white/45 border border-white/60">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#2B3E50]/10 text-[#2B3E50] text-xs font-bold border-b border-white/60">
                <th className="p-3">นักเรียน / รหัส</th>
                <th className="p-3 hidden sm:table-cell">ห้อง / ครูที่ปรึกษา</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3 text-center">เกณฑ์จบ</th>
                <th className="p-3 text-center hidden md:table-cell">แผนช่วยเหลือ</th>
                <th className="p-3 text-right w-14">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300/40">
              {adminPaginated.map((s) => {
                const rk = getEffectiveRisk(s, config);
                const crit = getGraduationCriteria(s, config);
                const badgeClass =
                  rk === 'r'
                    ? 'bg-rose-100 text-rose-700'
                    : rk === 'y'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800';
                return (
                  <tr
                    key={s.id}
                    onClick={() => onOpenStudentTimeline(s)}
                    className="hover:bg-white/65 transition cursor-pointer"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        {s.studentPhotoUrl ? (
                          <img src={s.studentPhotoUrl} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-white shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#92C2C2]/45 text-[#2B3E50] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {s.name.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-[#2B3E50]">{s.name}</div>
                          <div className="text-[11px] text-slate-500">รหัส {s.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-xs text-slate-600">
                      <div className="font-semibold text-[#2B3E50]">{s.room}</div>
                      <div>{s.advisor}</div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badgeClass}`}>
                        {RISK_LABELS[rk]}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-xs text-[#2B3E50]">{crit.passedCount}/5</td>
                    <td className="p-3 text-center hidden md:table-cell text-xs text-slate-700">{s.plans.length} แผน</td>
                    <td className="p-3 text-right">
                      <RowActionDropdown
                        actions={[
                          {
                            label: 'ดูประวัติการช่วยเหลือ',
                            icon: <Eye className="w-3.5 h-3.5 text-[#4A7C82]" />,
                            onClick: () => onOpenStudentTimeline(s),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            แสดง {adminFilteredStudents.length === 0 ? 0 : (safeAdminPage - 1) * ADMIN_PAGE_SIZE + 1}–
            {Math.min(safeAdminPage * ADMIN_PAGE_SIZE, adminFilteredStudents.length)} จาก <b>{adminFilteredStudents.length}</b> คน
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={safeAdminPage <= 1}
              onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
              className="clay-btn-soft px-3 py-1.5 font-semibold inline-flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> ก่อนหน้า
            </button>
            <span className="font-bold text-[#2B3E50]">
              หน้า {safeAdminPage} / {adminTotalPages}
            </span>
            <button
              disabled={safeAdminPage >= adminTotalPages}
              onClick={() => setAdminPage((p) => Math.min(adminTotalPages, p + 1))}
              className="clay-btn-soft px-3 py-1.5 font-semibold inline-flex items-center gap-1 disabled:opacity-40"
            >
              ถัดไป <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Charts Row: 3D Capsule Bar Chart + Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="clay-card p-5 lg:col-span-2">
          <h3 className="font-bold text-[#2B3E50] mb-3">แนวโน้มสถานะนักเรียนรายระดับชั้น</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.gradeData} barGap={4}>
                <XAxis dataKey="grade" stroke="#34495E" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#34495E" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '14px',
                    border: 'none',
                    background: '#ECF3F7',
                    boxShadow: '0 8px 20px rgba(43,62,80,0.18)',
                  }}
                />
                <Bar dataKey="g" name="ปกติ" fill="#4A7C82" radius={[8, 8, 8, 8]} />
                <Bar dataKey="y" name="เฝ้าระวัง" fill="#92C2C2" radius={[8, 8, 8, 8]} />
                <Bar dataKey="r" name="เสี่ยงสูง" fill="#9694B8" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="clay-card p-5">
          <h3 className="font-bold text-[#2B3E50] mb-3">เส้นทางช่วยเหลือที่ใช้</h3>
          {stats.activePathways.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">ยังไม่มีแผนช่วยเหลือที่เปิดใช้งาน</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.activePathways}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={4}
                  >
                    {stats.activePathways.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Common Causes (Privacy-safe aggregate) */}
      <div className="clay-card p-5">
        <h3 className="font-bold text-[#2B3E50] mb-3">สาเหตุที่พบบ่อย (ภาพรวมโรงเรียน)</h3>
        <div className="space-y-2 text-sm">
          {stats.topReasons.map(([reason, count]) => (
            <div key={reason} className="flex justify-between py-1.5 border-b border-white/40">
              <span className="text-slate-700">{reason}</span>
              <span className="font-bold text-[#2B3E50]">{count} คน</span>
            </div>
          ))}
          <div className="flex justify-between py-1.5">
            <span className="text-slate-700">นักเรียนที่ส่งข้อความขอความช่วยเหลือ (ไม่แสดงเนื้อหาตาม PDPA)</span>
            <span className="font-bold text-[#4A7C82]">{stats.askCount} คน</span>
          </div>
        </div>
      </div>
    </div>
  );
};
