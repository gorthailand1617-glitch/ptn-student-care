import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  MapPin,
  Camera,
  ExternalLink,
  MessageCircle,
  Trash2,
  Home,
  Navigation,
  Phone,
  BookOpenCheck,
} from 'lucide-react';
import { HomeVisit, RiskConfig, Student, TeacherStaff } from '../types';
import {
  countOtherScreeningSignals,
  createSupportPlan,
  getEffectiveRisk,
  getGraduationCriteria,
  getRecommendedPathways,
  getRiskReasons,
  getWeeklyGoals,
  PATHWAYS_LONG,
  PATHWAYS_SHORT,
  RISK_LABELS,
  SCREENING_DOMAINS,
  SCREENING_LEVELS,
} from '../utils/riskEngine';
import { compressImageFile } from '../services/dataService';
import { ClayAccordion, ConfirmDialogState } from './ui/ClayPrimitives';
import { FaceCaptureModal } from './FaceCaptureModal';
import { StudentSheetTab } from './TeacherView';

interface Props {
  student: Student;
  staff: TeacherStaff[];
  config: RiskConfig;
  initialTab?: StudentSheetTab;
  onClose: () => void;
  onUpdate: (updated: Student, auditAction?: string, toastMsg?: string) => void;
  onRequestConfirm: (dialog: Omit<ConfirmDialogState, 'open'>) => void;
}

const SHEET_TABS: { id: StudentSheetTab; label: string }[] = [
  { id: 'graduation', label: 'เกณฑ์การจบ' },
  { id: 'screening', label: 'คัดกรอง 7 ด้าน' },
  { id: 'plans', label: 'แผนช่วยเหลือ' },
  { id: 'visits', label: 'เยี่ยมบ้าน' },
];

export const StudentDetailModal: React.FC<Props> = ({
  student,
  staff,
  config,
  initialTab = 'graduation',
  onClose,
  onUpdate,
  onRequestConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<StudentSheetTab>(initialTab);
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [needs, setNeeds] = useState('');
  const [visitStatus, setVisitStatus] = useState<HomeVisit['status']>('พบตัว');
  const [gps, setGps] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [gpsMsg, setGpsMsg] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [skipChoice, setSkipChoice] = useState('ขาดเรียนเพราะป่วยชั่วคราว');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [handoffNote, setHandoffNote] = useState(student.caseHandoffNote || '');
  const [handoverDraft, setHandoverDraft] = useState(student.handoverNote || '');
  const [landmarkDraft, setLandmarkDraft] = useState(student.landmarkNote || '');
  const [photoCaptureTarget, setPhotoCaptureTarget] = useState<'student' | 'guardian' | null>(null);

  const primaryGuardian = student.guardians?.[0] || {
    id: `g-${student.code}-1`,
    name: `ผู้ปกครองของ ${student.name.split(' ')[0]}`,
    relation: 'ผู้ปกครองหลัก',
    phone: student.parentPhone || '',
    photoUrl: '',
  };

  const pendingPlans = student.plans.filter((p) => !p.done);
  const nearestDue = pendingPlans.length > 0 ? pendingPlans.map((p) => p.due).sort()[0] : null;

  const risk = getEffectiveRisk(student, config);
  const reasons = getRiskReasons(student, config);
  const otherSignals = countOtherScreeningSignals(student);
  const { criteria, passedCount } = getGraduationCriteria(student, config);
  const goals = getWeeklyGoals(student, config);
  const goalsDoneCount = goals.filter((_, i) => student.goalsDone[i]).length;
  const recs = getRecommendedPathways(student, config);
  const creditPct = Math.min(100, Math.round((student.creditsEarned / Math.max(1, student.creditsRequired)) * 100));

  const riskBadgeClass =
    risk === 'r'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : risk === 'y'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

  const handleAddPathway = (idx: number) => {
    if (student.plans.some((p) => p.pathwayIndex === idx)) return;
    const plan = createSupportPlan(idx, student.advisor || 'ครูที่ปรึกษา');
    onUpdate(
      { ...student, plans: [...student.plans, plan] },
      `เพิ่มแผน ${PATHWAYS_SHORT[idx]} ให้ ${student.name} (${student.code})`,
      `เพิ่มแผน “${PATHWAYS_SHORT[idx]}” เรียบร้อยแล้ว`
    );
  };

  const handleRemovePlan = (planId: string, pathwayName: string) => {
    onRequestConfirm({
      title: 'ยืนยันการลบแผนช่วยเหลือ',
      description: `ต้องการลบแผน “${pathwayName}” ของ ${student.name} ใช่หรือไม่?`,
      confirmLabel: 'ลบแผนนี้',
      danger: true,
      onConfirm: () => {
        onUpdate(
          { ...student, plans: student.plans.filter((p) => p.id !== planId) },
          `ลบแผนช่วยเหลือของ ${student.name}`,
          'ลบแผนช่วยเหลือเรียบร้อยแล้ว'
        );
      },
    });
  };

  const handlePlanField = (planId: string, field: 'due' | 'by' | 'expectedOutcome', value: string) => {
    onUpdate({
      ...student,
      plans: student.plans.map((p) => (p.id === planId ? { ...p, [field]: value } : p)),
    });
  };

  const handleScreeningChange = (domainIdx: number, level: number) => {
    const next = [...student.screening7];
    next[domainIdx] = level;
    onUpdate(
      { ...student, screening7: next },
      `อัปเดตคัดกรองด้าน${SCREENING_DOMAINS[domainIdx]} ของ ${student.name}`,
      `บันทึกคัดกรองด้าน${SCREENING_DOMAINS[domainIdx]} แล้ว`
    );
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGpsMsg('อุปกรณ์นี้ไม่รองรับ GPS');
      return;
    }
    setGpsMsg('กำลังระบุพิกัด...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        };
        setGps(coords);
        setGpsMsg(`พิกัด: ${coords.lat}, ${coords.lng}`);
      },
      () => {
        setGpsMsg('ไม่ได้รับอนุญาตใช้ตำแหน่ง (สามารถบันทึกได้โดยไม่ระบุพิกัด)');
      }
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    setPhotoDataUrl(compressed);
  };

  const handleSaveVisit = () => {
    const visit: HomeVisit = {
      id: `visit-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      contactName: contactName.trim() || 'ผู้ปกครอง',
      phone: phone.trim(),
      status: visitStatus,
      needs: needs.trim(),
      location: gps,
      photoDataUrl,
    };
    onUpdate(
      {
        ...student,
        location: gps || student.location,
        landmarkNote: landmarkDraft.trim() || student.landmarkNote,
        homePhotoUrl: photoDataUrl || student.homePhotoUrl,
        visits: [visit, ...student.visits],
      },
      `บันทึกเยี่ยมบ้าน/ติดตาม ${student.name} (${visitStatus})`,
      'บันทึกข้อมูลการเยี่ยมบ้านและพิกัดบ้านเรียบร้อยแล้ว'
    );
    setContactName('');
    setPhone('');
    setNeeds('');
    setGps(undefined);
    setGpsMsg('');
    setPhotoDataUrl(undefined);
  };

  const handleNotifyParentLine = () => {
    onRequestConfirm({
      title: 'ยืนยันส่งข้อความ LINE หาผู้ปกครอง',
      description: `ระบบจะส่งข้อความแจ้งเตือนแบบซ่อนรายละเอียดบนหน้าจอล็อกให้ผู้ปกครองของ ${student.name} (${student.room}) ตามมาตรฐาน PDPA`,
      confirmLabel: 'ส่งข้อความ LINE',
      onConfirm: () => {
        const nextState: 1 | 2 = student.parentConsent ? 2 : 1;
        onUpdate(
          { ...student, lineMessageState: nextState },
          `ส่งการแจ้งเตือน LINE ให้ผู้ปกครองของ ${student.name}`,
          `ส่งข้อความ LINE ถึงผู้ปกครองของ ${student.name} แล้ว`
        );
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs">
      {/* Bottom Sheet / Drawer */}
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-t-[28px] bg-[#CFDCE4] shadow-2xl border-t border-x border-white/70">
        {/* Drag Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-slate-400/60" />
        </div>

        {/* Sticky Sheet Header + Tabs */}
        <div className="px-5 pb-3 border-b border-white/50">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#2B3E50]">
                {student.name} <span className="text-sm font-medium text-slate-600">· {student.room}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${riskBadgeClass}`}>
                  {student.skipReason ? 'ข้ามการเตือน' : RISK_LABELS[risk]}
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/70 text-[#2B3E50]">
                  รหัส {student.code}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="clay-btn-soft p-2 text-slate-700" aria-label="ปิด">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4 Sheet Tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {SHEET_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2 px-2 rounded-full text-xs font-bold transition ${
                  activeTab === t.id
                    ? 'clay-btn-primary'
                    : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Sheet Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: เกณฑ์การจบ + Handover Brief */}
          {activeTab === 'graduation' && (
            <>
              {/* Handover Brief Card (สรุปสำหรับผู้รับช่วงต่อ) */}
              <div className="clay-card-light p-4 space-y-3 border-l-4 border-[#4A7C82]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-[#2B3E50] flex items-center gap-1.5">
                    <BookOpenCheck className="w-4 h-4 text-[#4A7C82]" /> สรุปสำหรับผู้รับช่วงต่อ (Handover Brief)
                  </h3>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#4A7C82]/15 text-[#2B3E50]">
                    งานค้าง {pendingPlans.length} แผน {nearestDue ? `· ส่ง ${nearestDue}` : ''}
                  </span>
                </div>

                {/* Dual Photo Profiles: Student + Primary Guardian */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPhotoCaptureTarget('student')}
                    className="rounded-2xl bg-white/75 p-2.5 flex items-center gap-2.5 text-left hover:bg-white transition border border-white"
                  >
                    {student.studentPhotoUrl ? (
                      <img src={student.studentPhotoUrl} alt={student.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#92C2C2]/45 flex items-center justify-center text-[#2B3E50] font-bold text-sm shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[#2B3E50] truncate">รูปนักเรียน</div>
                      <div className="text-[10px] text-[#4A7C82] font-semibold">
                        {student.studentPhotoUrl ? 'แตะเพื่อเปลี่ยนรูป' : 'แตะถ่าย/อัปโหลด'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhotoCaptureTarget('guardian')}
                    className="rounded-2xl bg-white/75 p-2.5 flex items-center gap-2.5 text-left hover:bg-white transition border border-white"
                  >
                    {primaryGuardian.photoUrl ? (
                      <img src={primaryGuardian.photoUrl} alt={primaryGuardian.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[#2B3E50] truncate">
                        {primaryGuardian.relation}
                      </div>
                      {primaryGuardian.photoUrl ? (
                        <div className="text-[10px] text-emerald-700 font-semibold">มีรูปแล้ว · แตะเปลี่ยน</div>
                      ) : (
                        <div className="text-[10px] text-amber-700 font-bold truncate">ยังไม่มีรูปผู้ปกครอง</div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Quick Contacts */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {student.parentPhone && (
                    <a
                      href={`tel:${student.parentPhone}`}
                      className="clay-btn-primary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" /> โทรผู้ปกครอง ({student.parentPhone})
                    </a>
                  )}
                  {student.emergencyContactPhone && (
                    <a
                      href={`tel:${student.emergencyContactPhone}`}
                      className="clay-btn-soft px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#4A7C82]" /> {student.emergencyContactName || 'สำรอง'} ({student.emergencyContactPhone})
                    </a>
                  )}
                  {student.location && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${student.location.lat},${student.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="clay-btn-soft px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 text-[#2B3E50]"
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#4A7C82]" /> เปิดแผนที่นำทาง (Google Maps)
                    </a>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>ช่วงเวลาที่สะดวก: <b>{student.preferredContactTime || 'ไม่ระบุ'}</b></span>
                  <span>ช่องทางที่ยินยอม: <b>{student.parentChannel || (student.parentConsent ? 'LINE' : 'รอความยินยอม')}</b></span>
                  {student.landmarkNote && <span>จุดสังเกตบ้าน: <b>{student.landmarkNote}</b></span>}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#2B3E50] block mb-1">
                    บันทึกฝากถึงครูคนใหม่ (Handover Note):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={handoverDraft}
                      onChange={(e) => setHandoverDraft(e.target.value)}
                      placeholder="สรุปสั้นๆ ว่าต้องดูแลพิเศษเรื่องอะไร หรือคุยกับใครในบ้านจะได้ผลที่สุด..."
                      className="clay-input flex-1 px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate(
                          { ...student, handoverNote: handoverDraft.trim() },
                          `อัปเดตบันทึกฝากถึงครูคนใหม่ของ ${student.name}`,
                          'บันทึก Handover Note เรียบร้อยแล้ว'
                        )
                      }
                      className="clay-btn-primary px-3.5 py-1.5 text-xs font-semibold shrink-0"
                    >
                      บันทึก
                    </button>
                  </div>
                </div>
              </div>

              <div className="clay-card-light p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-[#2B3E50]">เกณฑ์ความพร้อมจบการศึกษา</h3>
                  <span className="text-sm font-bold text-[#4A7C82]">ผ่าน {passedCount}/5 ข้อ</span>
                </div>
                <div className="space-y-1.5">
                  {criteria.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-slate-200/70 last:border-0">
                      <span className="text-slate-700">{c.label}</span>
                      {c.passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                          <CheckCircle2 className="w-4 h-4" /> ผ่าน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-xs">
                          <AlertCircle className="w-4 h-4" /> ยังไม่ผ่าน
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>หน่วยกิตสะสม</span>
                    <span className="font-semibold">
                      {student.creditsEarned} / {student.creditsRequired} ({creditPct}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-300/80 overflow-hidden">
                    <div className="h-full rounded-full bg-[#4A7C82]" style={{ width: `${creditPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="clay-card-light p-4">
                <h3 className="font-bold text-[#2B3E50] mb-2">สัญญาณที่พบ & ก้าวต่อไปของนักเรียน</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {reasons.length > 0 ? (
                    reasons.map((r, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-emerald-700 font-medium">✓ ยังไม่พบสัญญาณเสี่ยงด้านการเรียน</span>
                  )}
                  {otherSignals > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-medium">
                      สัญญาณคัดกรองด้านอื่น {otherSignals} ด้าน
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  นักเรียนติ๊กทำ “ก้าวต่อไปสัปดาห์นี้” แล้ว <b>{goalsDoneCount}/{goals.length}</b> ข้อ
                </p>

                {student.asks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-300/60 space-y-1.5">
                    <div className="text-xs font-semibold text-[#2B3E50] flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      ข้อความขอความช่วยเหลือ (เฉพาะครูที่ปรึกษา/แนะแนว)
                    </div>
                    {student.asks.map((a) => (
                      <div key={a.id} className="text-xs bg-white/80 rounded-xl p-2.5 text-slate-800 space-y-1.5">
                        <div className="flex justify-between gap-2">
                          <span>🙋 [{a.category}] {a.text}</span>
                          <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {a.visibility === 'private' ? 'เฉพาะครูที่ปรึกษา' : 'รวมครูแนะแนว'}
                          </span>
                        </div>
                        {a.teacherReply ? (
                          <div className="bg-[#E6F3F3] text-[#2B3E50] rounded-lg px-2.5 py-1.5 text-[11px]">
                            <b>ครูตอบกลับ:</b> {a.teacherReply}
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={replyDrafts[a.id] || ''}
                              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                              placeholder="พิมพ์ข้อความตอบกลับนักเรียนแบบเป็นความลับ..."
                              className="clay-input flex-1 px-2.5 py-1 text-[11px]"
                            />
                            <button
                              onClick={() => {
                                const txt = (replyDrafts[a.id] || '').trim();
                                if (!txt) return;
                                onUpdate(
                                  {
                                    ...student,
                                    asks: student.asks.map((x) =>
                                      x.id === a.id
                                        ? { ...x, teacherReply: txt, repliedAt: new Date().toLocaleTimeString('th-TH') }
                                        : x
                                    ),
                                  },
                                  `ครูตอบกลับข้อความนักเรียน ${student.name} (เป็นความลับ)`,
                                  'ส่งข้อความตอบกลับนักเรียนแล้ว'
                                );
                                setReplyDrafts((prev) => ({ ...prev, [a.id]: '' }));
                              }}
                              className="clay-btn-primary px-3 py-1 text-[11px] font-semibold"
                            >
                              ตอบกลับ
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alert Calibration Feedback */}
              <div className="clay-card-light p-4">
                <h3 className="font-bold text-[#2B3E50] mb-2">ปรับผลการเตือน (Feedback)</h3>
                {student.skipReason ? (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700">ข้ามการเตือนเพราะ: <b>{student.skipReason}</b></span>
                    <button
                      onClick={() => onUpdate({ ...student, skipReason: '' }, `ยกเลิกการข้ามเตือน ${student.name}`, 'ยกเลิกการข้ามการเตือนแล้ว')}
                      className="clay-btn-soft px-3 py-1.5 text-xs font-semibold"
                    >
                      ยกเลิกการข้าม
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={skipChoice}
                        onChange={(e) => setSkipChoice(e.target.value)}
                        className="clay-input flex-1 px-3 py-2 text-xs"
                      >
                        <option value="ขาดเรียนเพราะป่วยชั่วคราว">ขาดเรียนเพราะป่วยชั่วคราว</option>
                        <option value="มีเหตุจำเป็นที่โรงเรียนทราบและแก้แล้ว">มีเหตุจำเป็นที่โรงเรียนทราบและแก้แล้ว</option>
                        <option value="ข้อมูลนำเข้าคลาดเคลื่อน">ข้อมูลนำเข้าคลาดเคลื่อน</option>
                      </select>
                      <button
                        onClick={() => onUpdate({ ...student, skipReason: skipChoice }, `เตือนผิด: ข้ามการเตือน ${student.name}`, 'บันทึกการข้ามการเตือนแล้ว')}
                        className="clay-btn-soft px-4 py-2 text-xs font-semibold"
                      >
                        เตือนผิด: ข้ามการเตือน
                      </button>
                    </div>
                    {risk === 'g' && (
                      <button
                        onClick={() => onUpdate({ ...student, feedback: 'miss' }, `แจ้งเตือนพลาด: ควรเตือน ${student.name}`, 'บันทึก Feedback เตือนพลาดแล้ว')}
                        className="clay-btn-soft w-full py-2 text-xs font-semibold text-amber-800"
                      >
                        {student.feedback === 'miss' ? 'บันทึกแล้ว: แจ้งระบบว่าควรเตือนเด็กคนนี้ ✓' : 'ระบบเตือนพลาด: ควรเตือนเด็กคนนี้'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: คัดกรอง 7 ด้าน (Accordion) */}
          {activeTab === 'screening' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#2B3E50]">แบบคัดกรอง 7 ด้าน (PTN CARE) & 9S</h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  ข้อมูลอ่อนไหว (PDPA)
                </span>
              </div>

              <ClayAccordion
                defaultOpenIds={['domain-4']}
                items={SCREENING_DOMAINS.map((domain, idx) => ({
                  id: `domain-${idx}`,
                  title: `${idx + 1}. ด้าน${domain}`,
                  subtitle: idx < 2 ? 'ดึงจากข้อมูลเรียนอัตโนมัติ' : `สถานะปัจจุบัน: ${SCREENING_LEVELS[student.screening7[idx] || 0]}`,
                  content:
                    idx < 2 ? (
                      <p className="text-slate-600">ระบบคำนวณอัตโนมัติจากเวลาเรียน หน่วยกิต และวิชาค้าง</p>
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span>เลือกระดับผลการคัดกรอง:</span>
                        <select
                          value={student.screening7[idx] || 0}
                          onChange={(e) => handleScreeningChange(idx, Number(e.target.value))}
                          className="clay-input px-3 py-1.5 text-xs w-36"
                        >
                          {SCREENING_LEVELS.map((lvl, j) => (
                            <option key={lvl} value={j}>{lvl}</option>
                          ))}
                        </select>
                      </div>
                    ),
                }))}
              />

              <div className="clay-card-light p-4">
                <label className="text-xs font-bold text-[#2B3E50] block mb-1.5">
                  บันทึกคัดกรอง 9S (เฉพาะครูที่ปรึกษา/แนะแนว)
                </label>
                <textarea
                  rows={2}
                  value={student.screening9S || ''}
                  onChange={(e) => onUpdate({ ...student, screening9S: e.target.value })}
                  placeholder="บันทึกผลการคัดกรอง 9S หรือข้อสังเกตเพิ่มเติม..."
                  className="clay-input w-full px-3 py-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 3: แผนช่วยเหลือ (Accordion + Confirm Dialog) */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              {student.plans.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="font-bold text-sm text-[#2B3E50]">แผนช่วยเหลือที่ใช้งานอยู่ ({student.plans.length})</h3>
                  {student.plans.map((p) => (
                    <div key={p.id} className="clay-card-light p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#2B3E50]">{PATHWAYS_SHORT[p.pathwayIndex]}</span>
                          {p.approvalStatus && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                              {p.approvalStatus}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemovePlan(p.id, PATHWAYS_SHORT[p.pathwayIndex])}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="ลบแผน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-500">กำหนดเสร็จ</label>
                          <input
                            type="date"
                            value={p.due}
                            onChange={(e) => handlePlanField(p.id, 'due', e.target.value)}
                            className="clay-input w-full px-2.5 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500">ผู้รับผิดชอบ</label>
                          <input
                            type="text"
                            value={p.by}
                            onChange={(e) => handlePlanField(p.id, 'by', e.target.value)}
                            className="clay-input w-full px-2.5 py-1 text-xs"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={p.expectedOutcome}
                        onChange={(e) => handlePlanField(p.id, 'expectedOutcome', e.target.value)}
                        placeholder="ผลที่คาดว่าจะได้ (เช่น เทียบโอน 1 หน่วยกิต / ส่งงานครบ)"
                        className="clay-input w-full px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-[#2B3E50] mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#4A7C82]" />
                  คำอธิบายและเลือกเส้นทางช่วยเหลือ 8 รูปแบบ (⭐ = ระบบแนะนำ)
                </p>
                <ClayAccordion
                  items={PATHWAYS_SHORT.map((title, idx) => {
                    const rec = recs.find((r) => r.pathwayIndex === idx);
                    const exists = student.plans.some((p) => p.pathwayIndex === idx);
                    return {
                      id: `pw-${idx}`,
                      title: `${rec ? '⭐ ' : ''}${idx + 1}. ${title}`,
                      subtitle: rec ? `แนะนำ: ${rec.reason}` : exists ? 'เลือกไว้แล้ว' : undefined,
                      content: (
                        <div className="space-y-2 pt-1">
                          <p>{PATHWAYS_LONG[idx]}</p>
                          <button
                            disabled={exists}
                            onClick={() => handleAddPathway(idx)}
                            className="clay-btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-40"
                          >
                            {exists ? 'เพิ่มแผนนี้แล้ว ✓' : '+ เพิ่มเส้นทางนี้ให้ผู้เรียน'}
                          </button>
                        </div>
                      ),
                    };
                  })}
                />
              </div>

              {/* Case Handoff */}
              <div className="clay-card-light p-4 space-y-2">
                <h3 className="font-bold text-[#2B3E50] text-xs">ส่งต่อเคสให้ครูแนะแนว / ครูผู้ดูแลเคส (Case Handoff)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={student.assignedCaseManagerId || ''}
                    onChange={(e) => {
                      const cm = staff.find((x) => x.id === e.target.value);
                      onUpdate(
                        { ...student, assignedCaseManagerId: e.target.value || undefined, caseHandoffNote: handoffNote },
                        cm ? `ส่งต่อเคส ${student.name} ให้ ${cm.name}` : `ยกเลิกการส่งต่อเคส ${student.name}`,
                        cm ? `ส่งต่อเคสให้ ${cm.name} แล้ว` : 'ยกเลิกการส่งต่อเคสแล้ว'
                      );
                    }}
                    className="clay-input px-3 py-2 text-xs"
                  >
                    <option value="">-- ยังไม่ส่งต่อเคส --</option>
                    {staff
                      .filter((st) => st.active && (st.staffRole === 'case_manager' || st.staffRole === 'counselor'))
                      .map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.staffRole === 'counselor' ? 'ครูแนะแนว' : 'ครูผู้ดูแลเคส'})
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    value={handoffNote}
                    onChange={(e) => setHandoffNote(e.target.value)}
                    onBlur={() => onUpdate({ ...student, caseHandoffNote: handoffNote })}
                    placeholder="หมายเหตุการส่งต่อเคส..."
                    className="clay-input px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* LINE Parent Notification */}
              <div className="clay-card-light p-4">
                <button
                  onClick={handleNotifyParentLine}
                  className="clay-btn-line w-full py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> แจ้งผู้ปกครองทาง LINE
                </button>
                {student.lineMessageState > 0 && (
                  <div className="mt-3 rounded-2xl bg-[#D8F3DC] text-[#1B4332] p-3 text-xs leading-relaxed">
                    <b>โรงเรียนเปรมติณสูลานนท์:</b>{' '}
                    {student.lineMessageState === 1
                      ? `ขออนุญาตส่งข่าวความก้าวหน้าการเรียนของ ${student.name} ผ่าน LINE`
                      : 'มีข้อความใหม่เกี่ยวกับการเรียนของบุตรหลาน กรุณาเปิดอ่านในแอป (ซ่อนรายละเอียดบนหน้าจอล็อก)'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: เยี่ยมบ้าน */}
          {activeTab === 'visits' && (
            <div className="clay-card-light p-4 space-y-3">
              <h3 className="font-bold text-[#2B3E50] flex items-center gap-1.5">
                <Home className="w-4 h-4 text-[#4A7C82]" /> บันทึกเยี่ยมบ้าน / ติดตาม (พาน้องกลับมาเรียน)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="ชื่อผู้ติดต่อ"
                  className="clay-input px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เบอร์โทรศัพท์"
                  className="clay-input px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={visitStatus}
                  onChange={(e) => setVisitStatus(e.target.value as HomeVisit['status'])}
                  className="clay-input px-3 py-2 text-xs"
                >
                  <option value="พบตัว">พบตัว</option>
                  <option value="ติดตามแล้วไม่พบตัว">ติดตามแล้วไม่พบตัว</option>
                  <option value="ยังไม่ได้ติดตาม">ยังไม่ได้ติดตาม</option>
                </select>
                <input
                  type="text"
                  value={needs}
                  onChange={(e) => setNeeds(e.target.value)}
                  placeholder="ความต้องการช่วยเหลือ / ข้อสังเกต"
                  className="clay-input px-3 py-2 text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleCaptureGps} className="clay-btn-soft px-3 py-1.5 text-xs inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#4A7C82]" /> ดึงพิกัด GPS
                </button>
                <label className="clay-btn-soft px-3 py-1.5 text-xs inline-flex items-center gap-1 cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-[#4A7C82]" /> ถ่ายภาพ/แนบรูปเยี่ยมบ้าน
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                </label>
                {gpsMsg && <span className="text-xs text-slate-600">{gpsMsg}</span>}
              </div>
              {photoDataUrl && (
                <img src={photoDataUrl} alt="ภาพเยี่ยมบ้าน" className="w-32 h-24 object-cover rounded-xl border border-white" />
              )}
              <button onClick={handleSaveVisit} className="clay-btn-primary w-full py-2.5 text-sm font-semibold">
                บันทึกการเยี่ยมบ้าน / ติดตาม
              </button>

              {student.visits.length > 0 && (
                <div className="pt-2 space-y-2">
                  {student.visits.map((v) => (
                    <div key={v.id} className="rounded-xl bg-white/80 p-2.5 text-xs flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-[#2B3E50]">{v.date} · {v.status}</div>
                        <div className="text-slate-600">{v.contactName} {v.phone && `(${v.phone})`} {v.needs && `· ${v.needs}`}</div>
                        {v.location && (
                          <a
                            href={`https://www.google.com/maps?q=${v.location.lat},${v.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#4A7C82] font-semibold mt-1 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> นำทาง Google Maps
                          </a>
                        )}
                      </div>
                      {v.photoDataUrl && (
                        <img src={v.photoDataUrl} alt="เยี่ยมบ้าน" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <FaceCaptureModal
        open={photoCaptureTarget !== null}
        title={photoCaptureTarget === 'guardian' ? `ถ่าย/อัปโหลดรูปผู้ปกครอง (${primaryGuardian.relation})` : `ถ่าย/อัปโหลดรูปนักเรียน (${student.name})`}
        subtitle="ภาพจะถูกย่อและครอปเป็น 400×400 px อัตโนมัติ"
        studentCode={student.code}
        storageFileName={photoCaptureTarget === 'guardian' ? `guardian_${primaryGuardian.id}.webp` : 'student.webp'}
        onSkip={() => setPhotoCaptureTarget(null)}
        onComplete={(photoUrl, source) => {
          if (photoCaptureTarget === 'student') {
            onUpdate(
              { ...student, studentPhotoUrl: photoUrl },
              `อัปเดตรูปถ่ายนักเรียน ${student.name} (${student.code})`,
              'บันทึกรูปถ่ายนักเรียนเรียบร้อยแล้ว'
            );
          } else {
            const updatedGuardian = {
              ...primaryGuardian,
              photoUrl,
              photoSource: source,
              photoConsentAt: new Date().toISOString(),
            };
            const rest = (student.guardians || []).slice(1);
            onUpdate(
              { ...student, guardians: [updatedGuardian, ...rest] },
              `อัปเดตรูปถ่ายผู้ปกครองของ ${student.name} (${student.code})`,
              'บันทึกรูปถ่ายผู้ปกครองเรียบร้อยแล้ว'
            );
          }
          setPhotoCaptureTarget(null);
        }}
      />
    </div>
  );
};
