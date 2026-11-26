import React, { useMemo, useState } from 'react';
import {
  X,
  FileText,
  Lock,
  Clock,
  CheckCircle2,
  ClipboardList,
  Home,
  ExternalLink,
  MessageCircle,
  UserCheck,
} from 'lucide-react';
import { RiskConfig, SchoolProfile, Student, TeacherStaff } from '../types';
import {
  addDaysISO,
  countOtherScreeningSignals,
  getEffectiveRisk,
  getGraduationCriteria,
  PATHWAYS_LONG,
  PATHWAYS_SHORT,
  RISK_LABELS,
} from '../utils/riskEngine';
import { openIndividualStudentPdfReport } from '../utils/excelParser';
import { ConfirmDialogState } from './ui/ClayPrimitives';

interface Props {
  student: Student;
  staff: TeacherStaff[];
  config: RiskConfig;
  school: SchoolProfile;
  onClose: () => void;
  onApprovePlan: (studentId: string, planId: string, approve: boolean) => void;
  onRequestConfirm: (dialog: Omit<ConfirmDialogState, 'open'>) => void;
}

interface TimelineEntry {
  id: string;
  date: string;
  actor: string;
  actorRole: string;
  action: string;
  detail: string;
  status: string;
  statusColor: string;
}

export const AdminStudentTimelineSheet: React.FC<Props> = ({
  student,
  staff,
  config,
  school,
  onClose,
  onApprovePlan,
  onRequestConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'plans' | 'visits'>('timeline');
  const [termFilter, setTermFilter] = useState<string>('ALL');

  const risk = getEffectiveRisk(student, config);
  const { passedCount } = getGraduationCriteria(student, config);
  const today = addDaysISO(0);

  const caseManager = useMemo(
    () => staff.find((st) => st.id === student.assignedCaseManagerId),
    [staff, student.assignedCaseManagerId]
  );

  const hasSensitiveCare =
    countOtherScreeningSignals(student) > 0 ||
    Boolean(student.screening9S?.trim()) ||
    student.asks.some((a) => !a.fromParent);

  // Build chronological Vertical Care Timeline (ใคร / อะไร / ยังไง) — newest first, PDPA-safe
  const timeline = useMemo<TimelineEntry[]>(() => {
    const items: TimelineEntry[] = [];

    // 1. Support plans
    student.plans.forEach((p) => {
      const overdue = !p.done && p.due < today;
      const status = p.done
        ? 'เสร็จสิ้น'
        : p.approvalStatus === 'รออนุมัติ'
        ? 'รออนุมัติ'
        : p.approvalStatus === 'อนุมัติแล้ว'
        ? 'อนุมัติแล้ว'
        : overdue
        ? 'เลยกำหนด'
        : 'กำลังดำเนินการ';

      const statusColor = p.done
        ? 'bg-emerald-100 text-emerald-800'
        : overdue
        ? 'bg-rose-100 text-rose-700'
        : p.approvalStatus === 'รออนุมัติ'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-sky-100 text-sky-800';

      items.push({
        id: `plan-${p.id}`,
        date: p.createdAt ? p.createdAt.slice(0, 10) : today,
        actor: p.by || student.advisor,
        actorRole: 'ครูที่ปรึกษา / ผู้รับผิดชอบแผน',
        action: `เปิดแผนเส้นทางที่ ${p.pathwayIndex + 1}: ${PATHWAYS_SHORT[p.pathwayIndex]}`,
        detail: `${PATHWAYS_LONG[p.pathwayIndex]}${p.expectedOutcome ? ` · ผลที่คาดหวัง: ${p.expectedOutcome}` : ''} (กำหนดเสร็จ ${p.due})`,
        status,
        statusColor,
      });
    });

    // 2. Home visits
    student.visits.forEach((v) => {
      items.push({
        id: `visit-${v.id}`,
        date: v.date,
        actor: student.advisor,
        actorRole: 'ครูที่ปรึกษา (ลงพื้นที่)',
        action: `ลงพื้นที่เยี่ยมบ้าน / ติดตาม (${v.status})`,
        detail: `ติดต่อ ${v.contactName}${v.needs ? ` · ประเด็นช่วยเหลือ: ${v.needs}` : ''}${v.location ? ` · บันทึกพิกัด GPS แล้ว` : ''}`,
        status: v.status === 'พบตัว' ? 'พบตัวแล้ว' : v.status,
        statusColor: v.status === 'พบตัว' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
      });
    });

    // 3. Case Manager handoff
    if (caseManager) {
      items.push({
        id: `handoff-${caseManager.id}`,
        date: today,
        actor: caseManager.name,
        actorRole: caseManager.staffRole === 'counselor' ? 'ครูแนะแนว' : 'ครูผู้ดูแลเคส',
        action: 'รับส่งต่อเคสดูแลร่วมสหวิชาชีพ',
        detail: student.caseHandoffNote || 'อยู่ระหว่างการติดตามและประสานความช่วยเหลือร่วมกับครูที่ปรึกษา',
        status: 'กำลังดูแลร่วม',
        statusColor: 'bg-purple-100 text-purple-800',
      });
    }

    // 4. LINE Parent Notification & Acknowledgement
    if (student.lineMessageState > 0) {
      items.push({
        id: 'line-notice',
        date: today,
        actor: student.advisor,
        actorRole: 'ครูที่ปรึกษา → ผู้ปกครอง',
        action: 'ส่งข้อความแจ้งเตือนผ่าน LINE (ซ่อนรายละเอียดบนหน้าจอล็อก)',
        detail: student.parentAckPlan
          ? 'ผู้ปกครองยืนยันตัวตนและกดรับทราบแผนช่วยเหลือเรียบร้อยแล้ว'
          : student.parentConsent
          ? 'ผู้ปกครองยินยอมรับข่าวสารทาง LINE แล้ว รอการกดรับทราบแผน'
          : 'ส่งคำขอความยินยอม PDPA ก่อนแจ้งความก้าวหน้าการเรียน',
        status: student.parentAckPlan ? 'ผู้ปกครองรับทราบแล้ว' : 'ส่งข้อความแล้ว',
        statusColor: student.parentAckPlan ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800',
      });
    }

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [student, caseManager, today]);

  const riskBadgeClass =
    risk === 'r'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : risk === 'y'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

  const handleExportPdf = () => {
    openIndividualStudentPdfReport(
      student,
      config,
      school,
      timeline.map((t) => ({
        date: t.date,
        actor: `${t.actor} (${t.actorRole})`,
        action: t.action,
        detail: t.detail,
        status: t.status,
      })),
      hasSensitiveCare,
      caseManager?.name
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-slate-900/55 backdrop-blur-xs">
      {/* Side Drawer on Desktop / Bottom Sheet on Mobile */}
      <div className="w-full sm:max-w-2xl h-[92vh] sm:h-full flex flex-col rounded-t-[28px] sm:rounded-t-none sm:rounded-l-[28px] bg-[#CFDCE4] shadow-2xl border-l border-white/70">
        {/* Header */}
        <div className="p-5 border-b border-white/50 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#4A7C82]">
                ประวัติการดูแลช่วยเหลือนักเรียนรายบุคคล (มุมมองผู้บริหาร)
              </div>
              <h2 className="text-xl font-bold text-[#2B3E50] mt-0.5">
                {student.name} <span className="text-sm font-medium text-slate-600">· {student.room}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${riskBadgeClass}`}>
                  {RISK_LABELS[risk]}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/75 text-[#2B3E50]">
                  รหัส {student.code}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/75 text-[#4A7C82]">
                  เกณฑ์จบ: ผ่าน {passedCount}/5 ข้อ
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/60 text-slate-700">
                  {student.advisor}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="clay-btn-soft p-2 text-slate-700" aria-label="ปิด">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Export Individual PDF Button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid grid-cols-3 gap-1.5 flex-1">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-2 px-2.5 rounded-full text-xs font-bold transition ${
                  activeTab === 'timeline' ? 'clay-btn-primary' : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                ไทม์ไลน์ (ใคร/อะไร/ยังไง)
              </button>
              <button
                onClick={() => setActiveTab('plans')}
                className={`py-2 px-2.5 rounded-full text-xs font-bold transition ${
                  activeTab === 'plans' ? 'clay-btn-primary' : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                สรุปแผน ({student.plans.length})
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`py-2 px-2.5 rounded-full text-xs font-bold transition ${
                  activeTab === 'visits' ? 'clay-btn-primary' : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                เยี่ยมบ้าน/ผู้ปกครอง
              </button>
            </div>
            <button
              onClick={handleExportPdf}
              className="clay-btn-soft px-3.5 py-2 text-xs font-bold text-[#2B3E50] inline-flex items-center gap-1.5 shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-[#4A7C82]" /> ส่งออกรายงานรายบุคคล (PDF)
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Strict PDPA Shield Notice (Never shows raw sensitive text) */}
          {hasSensitiveCare && (
            <div className="rounded-2xl bg-amber-100/90 border border-amber-300 px-4 py-3 text-xs text-amber-900 flex items-start gap-2.5">
              <Lock className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
              <span>
                <b>🔒 มีการดูแลด้านจิตใจ/สวัสดิภาพโดย {caseManager ? caseManager.name : student.advisor}</b>{' '}
                (สงวนสิทธิ์รายละเอียดข้อความขอความช่วยเหลือและผลคัดกรอง 9S ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล PDPA)
              </span>
            </div>
          )}

          {/* TAB 1: Care Timeline (Vertical Stepper — ใคร / อะไร / ยังไง) + Cross-Semester Filter */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#2B3E50]">กรองตามปีการศึกษา / ภาคเรียน:</span>
                <select
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  className="clay-input px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="ALL">ทุกภาคเรียน (ประวัติต่อเนื่อง)</option>
                  <option value={`${school.term}/${school.academicYear}`}>ภาคเรียนปัจจุบัน ({school.term}/{school.academicYear})</option>
                  <option value="2/2568">ภาคเรียนที่ 2/2568 (ย้อนหลัง)</option>
                  <option value="1/2568">ภาคเรียนที่ 1/2568 (ย้อนหลัง)</option>
                </select>
              </div>

              {termFilter !== 'ALL' && termFilter !== `${school.term}/${school.academicYear}` ? (
                <div className="clay-card-light p-4 text-xs space-y-1.5">
                  <div className="font-bold text-[#2B3E50]">ประวัติย้อนหลังภาคเรียน {termFilter} (Cross-Semester Archive)</div>
                  {(student.cohortSnapshots || [])
                    .filter((snap) => snap.termLabel === termFilter || `${snap.termLabel.split('/')[1]}/${snap.termLabel.split('/')[0]}` === termFilter)
                    .map((snap, idx) => (
                      <div key={idx} className="text-slate-700">
                        สถานะปลายภาค: <b>{RISK_LABELS[snap.risk]}</b> · ผ่านเกณฑ์จบ <b>{snap.passedCriteria}/5 ข้อ</b> · แผนช่วยเหลือ <b>{snap.plansCount} แผน</b>
                      </div>
                    ))}
                  {!(student.cohortSnapshots || []).length && (
                    <div className="text-slate-500">ยังไม่มีข้อมูล Snapshot ในภาคเรียนนี้</div>
                  )}
                </div>
              ) : timeline.length === 0 ? (
                <div className="clay-card-light p-6 text-center text-sm text-slate-500">
                  ยังไม่มีประวัติการดำเนินการช่วยเหลือสำหรับนักเรียนคนนี้
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#4A7C82]/35">
                  {timeline.map((item) => (
                    <div key={item.id} className="relative clay-card-light p-4 space-y-2">
                      <span className="absolute -left-[22px] top-4 w-3.5 h-3.5 rounded-full bg-[#4A7C82] ring-4 ring-[#CFDCE4]" />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.date}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${item.statusColor}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="font-bold text-[#4A7C82]">ใคร: </span>
                          <span className="font-semibold text-[#2B3E50]">{item.actor}</span>{' '}
                          <span className="text-slate-500">({item.actorRole})</span>
                        </div>
                        <div>
                          <span className="font-bold text-[#4A7C82]">อะไร: </span>
                          <span className="font-bold text-[#2B3E50]">{item.action}</span>
                        </div>
                        <div>
                          <span className="font-bold text-[#4A7C82]">ยังไง: </span>
                          <span className="text-slate-700">{item.detail}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Active Plans & Instant Admin Approval */}
          {activeTab === 'plans' && (
            <div className="space-y-3">
              {student.plans.length === 0 ? (
                <div className="clay-card-light p-6 text-center text-sm text-slate-500">
                  ยังไม่มีแผนช่วยเหลือที่เปิดใช้งาน
                </div>
              ) : (
                student.plans.map((p) => {
                  const overdue = !p.done && p.due < today;
                  return (
                    <div key={p.id} className="clay-card-light p-4 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-sm text-[#2B3E50] flex items-center gap-1.5">
                          <ClipboardList className="w-4 h-4 text-[#4A7C82]" />
                          เส้นทางที่ {p.pathwayIndex + 1}: {PATHWAYS_SHORT[p.pathwayIndex]}
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            p.done
                              ? 'bg-emerald-100 text-emerald-800'
                              : overdue
                              ? 'bg-rose-100 text-rose-700'
                              : p.approvalStatus === 'รออนุมัติ'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {p.done ? 'เสร็จสิ้น' : p.approvalStatus || (overdue ? 'เลยกำหนด' : 'กำลังดำเนินการ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{PATHWAYS_LONG[p.pathwayIndex]}</p>
                      <div className="text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#4A7C82]" /> ผู้รับผิดชอบ: <b>{p.by}</b>
                        </span>
                        <span>กำหนดเสร็จ: <b>{p.due}</b></span>
                      </div>

                      {p.approvalStatus === 'รออนุมัติ' && (
                        <div className="flex gap-2 pt-2 border-t border-slate-200/70">
                          <button
                            onClick={() =>
                              onRequestConfirm({
                                title: 'ยืนยันการอนุมัติแผน',
                                description: `อนุมัติแผน “${PATHWAYS_SHORT[p.pathwayIndex]}” สำหรับ ${student.name} (${student.room}) ใช่หรือไม่?`,
                                confirmLabel: 'อนุมัติแผน',
                                onConfirm: () => onApprovePlan(student.id, p.id, true),
                              })
                            }
                            className="clay-btn-primary px-4 py-1.5 text-xs font-semibold"
                          >
                            อนุมัติคำร้อง
                          </button>
                          <button
                            onClick={() =>
                              onRequestConfirm({
                                title: 'ยืนยันส่งกลับแก้ไข',
                                description: `ส่งกลับแผน “${PATHWAYS_SHORT[p.pathwayIndex]}” ให้ครูที่ปรึกษาแก้ไขใช่หรือไม่?`,
                                confirmLabel: 'ส่งกลับแก้ไข',
                                danger: true,
                                onConfirm: () => onApprovePlan(student.id, p.id, false),
                              })
                            }
                            className="clay-btn-soft px-4 py-1.5 text-xs font-semibold"
                          >
                            ส่งกลับแก้ไข
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: Home Visits & Parent Contact */}
          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="clay-card-light p-4 space-y-2 text-xs">
                <h3 className="font-bold text-sm text-[#2B3E50] flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#4A7C82]" /> สถานะการติดต่อผู้ปกครอง
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>การยินยอม LINE (PDPA): <b>{student.parentConsent ? 'ยินยอมแล้ว ✓' : 'ยังไม่ยินยอม'}</b></div>
                  <div>การรับทราบแผน: <b>{student.parentAckPlan ? 'รับทราบแล้ว ✓' : 'รอการรับทราบ'}</b></div>
                  <div>ช่องทางอื่นที่ผู้ปกครองเลือก: <b>{student.parentChannel || 'ใช้ LINE ปกติ'}</b></div>
                  <div>สถานะการส่งแจ้งเตือน: <b>{student.lineMessageState > 0 ? 'ส่งข้อความแล้ว' : 'ยังไม่เคยส่ง'}</b></div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="font-bold text-sm text-[#2B3E50] flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-[#4A7C82]" /> ประวัติการเยี่ยมบ้าน ({student.visits.length} ครั้ง)
                </h3>
                {student.visits.length === 0 ? (
                  <div className="clay-card-light p-5 text-center text-xs text-slate-500">
                    ยังไม่มีบันทึกการเยี่ยมบ้านสำหรับนักเรียนคนนี้
                  </div>
                ) : (
                  student.visits.map((v) => (
                    <div key={v.id} className="clay-card-light p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-[#2B3E50] flex items-center gap-2">
                          <span>{v.date}</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#4A7C82]/15 text-[#2B3E50]">{v.status}</span>
                        </div>
                        <div className="text-slate-600">
                          ผู้ติดต่อ: {v.contactName} {v.phone && `(${v.phone})`} {v.needs && `· ${v.needs}`}
                        </div>
                        {v.location && (
                          <a
                            href={`https://www.google.com/maps?q=${v.location.lat},${v.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#4A7C82] font-semibold hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> เปิดพิกัด Google Maps ({v.location.lat}, {v.location.lng})
                          </a>
                        )}
                      </div>
                      {v.photoDataUrl && (
                        <img src={v.photoDataUrl} alt="เยี่ยมบ้าน" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/50 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7C82]" /> บันทึกการเข้าดูใน PDPA Audit Log แล้ว
          </span>
          <span className="font-bold text-[#2B3E50]">Dev By Kru.gorthailand</span>
        </div>
      </div>
    </div>
  );
};
