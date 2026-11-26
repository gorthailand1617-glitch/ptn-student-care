import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Upload,
  ShieldCheck,
  Sliders,
  TrendingUp,
  CheckSquare,
  Heart,
  MessageCircle,
  GraduationCap,
  Type,
  Database,
  UserCog,
  Building2,
  DatabaseBackup,
  MapPin,
  ArrowRightLeft,
  Bell,
  LogIn,
} from 'lucide-react';
import { AuditLog, ImportSummary, RiskConfig, Role, SchoolProfile, Student, TeacherStaff } from './types';
import { buildInitialRoomUpdates, buildRealSeedStudents } from './data/seedLoader';
import {
  initLineLiff,
  isFirebaseConfigured,
  loadEthicsAccepted,
  loadLocalAuditLogs,
  loadLocalConfig,
  loadLocalRoomUpdates,
  loadLocalSchoolProfile,
  loadLocalStaff,
  loadLocalStudents,
  saveEthicsAccepted,
  saveLocalAuditLogs,
  saveLocalConfig,
  saveLocalRoomUpdates,
  saveLocalSchoolProfile,
  saveLocalStaff,
  saveLocalStudents,
} from './services/dataService';
import { createSupportPlan, getEffectiveRisk, getGraduationCriteria, PATHWAYS_SHORT } from './utils/riskEngine';
import { TeacherView, StudentSheetTab } from './components/TeacherView';
import { AdminView } from './components/AdminView';
import { StudentView } from './components/StudentView';
import { ParentView } from './components/ParentView';
import { SysAdminView } from './components/SysAdminView';
import { StudentDetailModal } from './components/StudentDetailModal';
import { AdminStudentTimelineSheet } from './components/AdminStudentTimelineSheet';
import { EthicsProtocolModal } from './components/EthicsProtocolModal';
import { FaceCaptureModal } from './components/FaceCaptureModal';
import { LoginModal } from './components/LoginModal';
import {
  ClaySwitch,
  ClayToastContainer,
  ConfirmDialog,
  ConfirmDialogState,
  ToastMessage,
} from './components/ui/ClayPrimitives';

const ROLE_LABELS: Record<Role, string> = {
  sysadmin: 'แอดมินระบบ',
  admin: 'ผู้บริหาร',
  teacher: 'ครูที่ปรึกษา',
  student: 'นักเรียน',
  parent: 'ผู้ปกครอง',
};

const ROLE_TABS: Record<Role, { label: string; icon: React.ReactNode }[]> = {
  sysadmin: [
    { label: 'จัดการครู/เคส', icon: <UserCog className="w-4 h-4" /> },
    { label: 'ข้อมูลโรงเรียน', icon: <Building2 className="w-4 h-4" /> },
    { label: 'สำรองข้อมูล', icon: <DatabaseBackup className="w-4 h-4" /> },
  ],
  admin: [
    { label: 'ภาพรวม', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'อนุมัติ', icon: <CheckSquare className="w-4 h-4" /> },
    { label: 'ความคืบหน้า', icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'ตั้งค่า', icon: <Sliders className="w-4 h-4" /> },
    { label: 'บันทึก PDPA', icon: <ShieldCheck className="w-4 h-4" /> },
    { label: 'โอนย้ายครู', icon: <ArrowRightLeft className="w-4 h-4" /> },
  ],
  teacher: [
    { label: 'ห้องของฉัน', icon: <Users className="w-4 h-4" /> },
    { label: 'ติดตามแผน', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'นำเข้าข้อมูล', icon: <Upload className="w-4 h-4" /> },
    { label: 'แผนที่กลุ่มเสี่ยง', icon: <MapPin className="w-4 h-4" /> },
  ],
  student: [{ label: 'ก้าวต่อไปของฉัน', icon: <Heart className="w-4 h-4" /> }],
  parent: [{ label: 'ข้อความจากโรงเรียน', icon: <MessageCircle className="w-4 h-4" /> }],
};

export function App() {
  const [role, setRole] = useState<Role>('admin');
  const [tab, setTab] = useState(0);
  const [bigText, setBigText] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [demoMode, setDemoMode] = useState(!isFirebaseConfigured);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const [selectedStudentTab, setSelectedStudentTab] = useState<StudentSheetTab>('graduation');

  const showToast = (text: string, variant: ToastMessage['variant'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, variant }]);
    if (notificationsEnabled) {
      setNotifications((prev) => [
        { id, text, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), read: false },
        ...prev.slice(0, 14),
      ]);
    }
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const requestConfirm = (dialog: Omit<ConfirmDialogState, 'open'>) => {
    setConfirmState({ ...dialog, open: true });
  };

  const [students, setStudents] = useState<Student[]>(() => loadLocalStudents() ?? buildRealSeedStudents());
  const [config, setConfig] = useState<RiskConfig>(() => loadLocalConfig());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadLocalAuditLogs());
  const [staff, setStaff] = useState<TeacherStaff[]>(() => loadLocalStaff());
  const [school, setSchool] = useState<SchoolProfile>(() => loadLocalSchoolProfile());
  const [ethicsAccepted, setEthicsAccepted] = useState<boolean>(() => loadEthicsAccepted());
  const [roomUpdates, setRoomUpdates] = useState<Record<string, number>>(() => {
    const cached = loadLocalRoomUpdates();
    return Object.keys(cached).length > 0 ? cached : buildInitialRoomUpdates(students);
  });

  const [activeStaffId, setActiveStaffId] = useState<string>('');
  const [activeStudentCode, setActiveStudentCode] = useState<string>(() => students[0]?.code || '');
  const [activeParentChildCode, setActiveParentChildCode] = useState<string>(() => students[0]?.code || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [adminTimelineStudentId, setAdminTimelineStudentId] = useState<string | null>(null);
  const [skippedOnboardingKeys, setSkippedOnboardingKeys] = useState<Record<string, boolean>>({});
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number; text: string; time: string; read: boolean }[]>([
    { id: 1, text: 'ยินดีต้อนรับสู่ PTN-Student-Care v3.0 (คำสั่ง รร. ที่ 56/2569)', time: 'เมื่อสักครู่', read: false },
  ]);
  const [liffStatus, setLiffStatus] = useState<string>('');

  // LINE LIFF / URL Deep-Link Auto-Routing (e.g. ?role=parent&code=3649)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role') as Role | null;
    const code = params.get('code');
    if (r && ['sysadmin', 'admin', 'teacher', 'student', 'parent'].includes(r)) {
      setRole(r);
      setTab(0);
    }
    if (code) {
      setActiveStudentCode(code);
      setActiveParentChildCode(code);
    }
  }, []);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const adminTimelineStudent = useMemo(
    () => students.find((s) => s.id === adminTimelineStudentId) || null,
    [students, adminTimelineStudentId]
  );

  const activeStudent = useMemo(
    () => students.find((s) => s.code === activeStudentCode) || students[0],
    [students, activeStudentCode]
  );

  const parentChildren = useMemo(() => students.slice(0, 2), [students]);
  const activeParentChild = useMemo(
    () => students.find((s) => s.code === activeParentChildCode) || students[0],
    [students, activeParentChildCode]
  );

  useEffect(() => { saveLocalStudents(students); }, [students]);
  useEffect(() => { saveLocalConfig(config); }, [config]);
  useEffect(() => { saveLocalAuditLogs(auditLogs); }, [auditLogs]);
  useEffect(() => { saveLocalRoomUpdates(roomUpdates); }, [roomUpdates]);
  useEffect(() => { saveLocalStaff(staff); }, [staff]);
  useEffect(() => { saveLocalSchoolProfile(school); }, [school]);

  useEffect(() => {
    document.body.classList.toggle('big-text', bigText || role === 'parent');
  }, [bigText, role]);

  useEffect(() => {
    initLineLiff().then((res) => {
      if (res.ready) {
        setLiffStatus(res.displayName ? `LINE: ${res.displayName}` : 'LINE LIFF Ready');
      }
    });
  }, []);

  const appendAudit = (action: string, actorRole: Role = role) => {
    const entry: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('th-TH'),
      role: actorRole,
      roleLabel: ROLE_LABELS[actorRole],
      action,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const handleRoleSwitch = (nextRole: Role) => {
    setRole(nextRole);
    setTab(0);
  };

  const handleUpdateStudent = (updated: Student, auditAction?: string, toastMsg?: string) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (auditAction) appendAudit(auditAction);
    if (toastMsg) showToast(toastMsg);
  };

  const handleBulkAssign = (studentIds: string[], pathwayIndex: number) => {
    let addedCount = 0;
    setStudents((prev) =>
      prev.map((s) => {
        if (!studentIds.includes(s.id)) return s;
        if (s.plans.some((p) => p.pathwayIndex === pathwayIndex)) return s;
        addedCount++;
        return { ...s, plans: [...s.plans, createSupportPlan(pathwayIndex, s.advisor)] };
      })
    );
    appendAudit(`ใส่แผนแบบกลุ่ม (${PATHWAYS_SHORT[pathwayIndex]}) ให้ ${addedCount} คน`);
    showToast(`เพิ่มแผน “${PATHWAYS_SHORT[pathwayIndex]}” ให้ ${addedCount} คนเรียบร้อยแล้ว`);
  };

  const handleTogglePlanDone = (studentId: string, planId: string, done: boolean) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id !== studentId
          ? s
          : { ...s, plans: s.plans.map((p) => (p.id === planId ? { ...p, done } : p)) }
      )
    );
    appendAudit(`อัปเดตสถานะแผนช่วยเหลือ (${done ? 'เสร็จแล้ว' : 'กำลังดำเนินการ'})`);
  };

  const handleApprovePlan = (studentId: string, planId: string, approve: boolean) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id !== studentId
          ? s
          : {
              ...s,
              plans: s.plans.map((p) =>
                p.id === planId
                  ? { ...p, approvalStatus: approve ? 'อนุมัติแล้ว' : 'ส่งกลับแก้ไข' }
                  : p
              ),
            }
      )
    );
    appendAudit(approve ? 'อนุมัติแผนเทียบโอน/ส่งต่อ' : 'ส่งกลับแก้ไขแผนเทียบโอน/ส่งต่อ', 'admin');
    showToast(approve ? 'อนุมัติแผนช่วยเหลือเรียบร้อยแล้ว' : 'ส่งกลับแผนให้ครูที่ปรึกษาแก้ไขแล้ว', approve ? 'success' : 'info');
  };

  const handleImportStudents = (nextStudents: Student[], summary: ImportSummary, sourceLabel: string) => {
    setStudents(nextStudents);
    setRoomUpdates((prev) => {
      const next = { ...prev };
      summary.rooms.forEach((r) => { next[r] = 0; });
      return next;
    });
    appendAudit(`${sourceLabel} — เพิ่ม ${summary.added} · อัปเดต ${summary.updated} · ผิดพลาด ${summary.errors.length}`);
    showToast(`นำเข้าสำเร็จ: เพิ่ม ${summary.added} · อัปเดต ${summary.updated} คน`);
  };

  const handleLoadRealSeed = () => {
    const fresh = buildRealSeedStudents();
    setStudents(fresh);
    setRoomUpdates(buildInitialRoomUpdates(fresh));
    appendAudit(`โหลดข้อมูลรายชื่อจริง ม.1–ม.6 ปี 69 (${fresh.length} คน)`);
    showToast(`โหลดรายชื่อจริง ม.1–ม.6 ปี 69 (${fresh.length} คน) เรียบร้อยแล้ว`);
  };

  const handleExportBackup = () => {
    const payload = { exportedAt: new Date().toISOString(), school, config, staff, students, auditLogs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PTN-Student-Care-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    appendAudit('ดาวน์โหลดไฟล์สำรองข้อมูลทั้งระบบ (.json)', 'sysadmin');
  };

  const handleImportBackup = (jsonText: string) => {
    try {
      const data = JSON.parse(jsonText);
      if (Array.isArray(data.students)) setStudents(data.students);
      if (Array.isArray(data.staff)) setStaff(data.staff);
      if (data.school) setSchool(data.school);
      if (data.config) setConfig(data.config);
      appendAudit('กู้คืนข้อมูลทั้งระบบจากไฟล์สำรอง (.json)', 'sysadmin');
    } catch {
      alert('ไฟล์สำรองข้อมูลไม่ถูกต้อง');
    }
  };

  const handleCreateTermSnapshot = (termLabel: string) => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        cohortSnapshots: [
          ...(s.cohortSnapshots || []),
          {
            termLabel,
            risk: getEffectiveRisk(s, config),
            passedCriteria: getGraduationCriteria(s, config).passedCount,
            plansCount: s.plans.length,
          },
        ],
      }))
    );
    appendAudit(`บันทึก Longitudinal Cohort Snapshot ภาคเรียน ${termLabel}`, 'sysadmin');
  };

  const currentTabs = ROLE_TABS[role];

  return (
    <div className="min-h-screen flex flex-col md:flex-row p-3 sm:p-5 gap-5 pb-24 md:pb-5 max-w-[1440px] mx-auto">
      {/* Desktop / Tablet Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 clay-sidebar rounded-[28px] p-5 text-[#E6EEF2] justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#92C2C2] to-[#4A7C82] flex items-center justify-center shadow-lg shrink-0">
              <GraduationCap className="w-7 h-7 text-[#1E2E3E]" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base leading-tight tracking-tight">PTN-Student-Care</h1>
              <p className="text-[11px] text-[#92C2C2] truncate">{school.schoolName}</p>
            </div>
          </div>

          {/* 5-Role Switcher */}
          <div className="mb-6">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 px-2">
              มุมมองบทบาท (RBAC 5 สิทธิ์)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSwitch(r)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
                    r === 'sysadmin' ? 'col-span-2' : ''
                  } ${role === r ? 'clay-sidebar-pill-active' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 px-2">
              เมนูหลัก
            </div>
            {currentTabs.map((item, idx) => (
              <button
                key={item.label}
                onClick={() => setTab(idx)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition ${
                  tab === idx ? 'clay-sidebar-pill-active' : 'text-slate-200/85 hover:bg-white/10'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
          <div className="rounded-2xl bg-white/8 p-3 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-[#92C2C2]">
                <Database className="w-3.5 h-3.5" />
                {demoMode ? 'Demo Mode' : 'Live Firebase'}
              </span>
              <ClaySwitch
                checked={!demoMode}
                onChange={(live) => {
                  if (live && !isFirebaseConfigured) {
                    showToast('ยังไม่ได้ตั้งค่า Firebase .env จึงใช้งาน Demo Mode ต่อ', 'warning');
                    return;
                  }
                  setDemoMode(!live);
                  showToast(live ? 'สลับเป็นโหมด Live Firebase' : 'สลับเป็นโหมด Demo (Local)', 'info');
                }}
              />
            </div>
            <div className="flex items-center justify-between text-slate-200">
              <span>แจ้งเตือนอัตโนมัติ</span>
              <ClaySwitch
                checked={notificationsEnabled}
                onChange={(v) => {
                  setNotificationsEnabled(v);
                  showToast(v ? 'เปิดการแจ้งเตือนแล้ว' : 'ปิดการแจ้งเตือนแล้ว', 'info');
                }}
              />
            </div>
            <div className="text-[11px] text-slate-300">
              นร. {students.length} คน · ครู {staff.filter((s) => s.active).length} คน
              {liffStatus && ` · ${liffStatus}`}
            </div>
          </div>
          <div className="text-center text-[11px] text-slate-300/80">
            Dev By <span className="font-bold text-[#92C2C2]">Kru.gorthailand</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col gap-5">
        <header className="clay-hero p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#92C2C2] font-semibold">
              <span>{school.schoolName} {school.affiliation}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1">
              ระบบดูแลช่วยเหลือและติดตามความพร้อมจบการศึกษา
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              ปีการศึกษา {school.academicYear} ภาคเรียนที่ {school.term} · OBEC CARE · 1 โรงเรียน 3 รูปแบบ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={role}
              onChange={(e) => handleRoleSwitch(e.target.value as Role)}
              className="md:hidden rounded-full bg-white/15 text-white text-xs font-semibold px-3 py-2 border border-white/20"
            >
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <option key={r} value={r} className="text-slate-900">
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>

            <div className="rounded-full bg-white/12 px-3.5 py-1.5 border border-white/15 flex items-center gap-2">
              <Type className="w-4 h-4 text-[#92C2C2]" />
              <ClaySwitch
                checked={bigText || role === 'parent'}
                onChange={(v) => {
                  setBigText(v);
                  showToast(v ? 'เปิดโหมดตัวอักษรใหญ่แล้ว' : 'ปิดโหมดตัวอักษรใหญ่แล้ว', 'info');
                }}
                label="ตัวอักษรใหญ่"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                }}
                className="relative rounded-full bg-white/12 p-2 border border-white/15 hover:bg-white/20 transition"
                aria-label="ศูนย์แจ้งเตือน"
              >
                <Bell className="w-4 h-4 text-[#92C2C2]" />
                {notifications.some((n) => !n.read) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#2B3E50]" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#ECF3F7] text-[#2B3E50] shadow-2xl border border-white p-3 z-50 space-y-2">
                  <div className="text-xs font-bold flex justify-between">
                    <span>ศูนย์แจ้งเตือน</span>
                    <button onClick={() => setNotifOpen(false)} className="text-[#4A7C82]">ปิด</button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 text-xs">
                    {notifications.map((n) => (
                      <div key={n.id} className="rounded-xl bg-white/80 p-2">
                        <div className="font-medium">{n.text}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* School SSO / Firebase Login Button */}
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="clay-btn-primary px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" /> เข้าสู่ระบบ
            </button>
          </div>
        </header>

        <div className="flex-1">
          {role === 'sysadmin' && (
            <SysAdminView
              tab={tab}
              staff={staff}
              school={school}
              students={students}
              onUpdateStaff={(next, action) => {
                setStaff(next);
                appendAudit(action, 'sysadmin');
              }}
              onUpdateSchool={(next) => {
                setSchool(next);
                appendAudit('อัปเดตข้อมูลโรงเรียนและปีการศึกษา', 'sysadmin');
              }}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onCreateTermSnapshot={handleCreateTermSnapshot}
            />
          )}

          {role === 'teacher' && (
            <TeacherView
              tab={tab}
              students={students}
              staff={staff}
              activeStaffId={activeStaffId}
              onChangeActiveStaff={setActiveStaffId}
              config={config}
              onSelectStudent={(s, initialTab = 'graduation') => {
                setSelectedStudentTab(initialTab);
                setSelectedStudentId(s.id);
                appendAudit(`เปิดดูข้อมูลนักเรียน ${s.name} (${s.code})`);
              }}
              onQuickNotifyLine={(s) =>
                requestConfirm({
                  title: 'ยืนยันส่งข้อความ LINE หาผู้ปกครอง',
                  description: `ส่งข้อความแจ้งเตือนความก้าวหน้า (ซ่อนรายละเอียดบนหน้าจอล็อก) ถึงผู้ปกครองของ ${s.name} (${s.room}) ใช่หรือไม่?`,
                  confirmLabel: 'ส่งข้อความ LINE',
                  onConfirm: () =>
                    handleUpdateStudent(
                      { ...s, lineMessageState: s.parentConsent ? 2 : 1 },
                      `ส่งการแจ้งเตือน LINE ให้ผู้ปกครองของ ${s.name}`,
                      `ส่งข้อความ LINE ถึงผู้ปกครองของ ${s.name} แล้ว`
                    ),
                })
              }
              onBulkAssign={handleBulkAssign}
              onTogglePlanDone={handleTogglePlanDone}
              onImportStudents={handleImportStudents}
              onLoadRealSeed={handleLoadRealSeed}
            />
          )}

          {role === 'admin' && (
            <AdminView
              tab={tab}
              students={students}
              staff={staff}
              config={config}
              school={school}
              auditLogs={auditLogs}
              roomUpdates={roomUpdates}
              onUpdateConfig={(next) => {
                setConfig(next);
                appendAudit('ปรับปรุงเกณฑ์ Early Warning', 'admin');
                showToast('บันทึกเกณฑ์ Early Warning แล้ว');
              }}
              onApprovePlan={handleApprovePlan}
              onRequestConfirm={requestConfirm}
              onOpenStudentTimeline={(s) => {
                setAdminTimelineStudentId(s.id);
                appendAudit(`ผู้บริหารเข้าดูประวัติการช่วยเหลือรายบุคคล: ${s.name} (รหัส ${s.code})`, 'admin');
              }}
              onReassignRoomAdvisor={(room, newAdvisorName) => {
                setStudents((prev) =>
                  prev.map((s) => (s.room === room ? { ...s, advisor: newAdvisorName } : s))
                );
                appendAudit(`โอนย้ายครูที่ปรึกษาทั้งห้อง ${room} ไปยัง ${newAdvisorName} (โอนสิทธิ์ PDPA แล้ว)`, 'admin');
                showToast(`โอนย้ายห้อง ${room} ให้ ${newAdvisorName} เรียบร้อยแล้ว`);
              }}
              onReassignStudentAdvisor={(studentId, newAdvisorName) => {
                const target = students.find((x) => x.id === studentId);
                setStudents((prev) =>
                  prev.map((s) => (s.id === studentId ? { ...s, advisor: newAdvisorName } : s))
                );
                appendAudit(
                  `โอนย้ายครูที่ปรึกษารายบุคคล: ${target?.name || studentId} ไปยัง ${newAdvisorName}`,
                  'admin'
                );
                showToast(`โอนย้าย ${target?.name || 'นักเรียน'} ให้ ${newAdvisorName} เรียบร้อยแล้ว`);
              }}
            />
          )}

          {role === 'student' && activeStudent && (
            <StudentView
              student={activeStudent}
              allStudents={students}
              onSwitchStudent={setActiveStudentCode}
              config={config}
              onToggleGoal={(goalIdx, done) =>
                handleUpdateStudent({
                  ...activeStudent,
                  goalsDone: { ...activeStudent.goalsDone, [goalIdx]: done },
                })
              }
              onSendAsk={(category, text, visibility) =>
                handleUpdateStudent(
                  {
                    ...activeStudent,
                    asks: [
                      ...activeStudent.asks,
                      {
                        id: `ask-${Date.now()}`,
                        category,
                        text,
                        visibility,
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  },
                  'นักเรียนส่งข้อความขอความช่วยเหลือ (ไม่บันทึกเนื้อหาใน Audit Log ตาม PDPA)'
                )
              }
            />
          )}

          {role === 'parent' && activeParentChild && (
            <ParentView
              student={activeParentChild}
              childrenList={parentChildren}
              onSwitchChild={setActiveParentChildCode}
              config={config}
              onUpdate={handleUpdateStudent}
            />
          )}
        </div>

        <footer className="text-center text-xs text-slate-600 py-3">
          PTN-Student-Care v2.0 · {school.schoolName} {school.affiliation} ·{' '}
          <span className="font-bold text-[#2B3E50]">Dev By Kru.gorthailand</span>
        </footer>
      </main>

      {/* Mobile Floating Pill Bottom Nav */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 clay-bottom-nav px-3 py-2 flex items-center justify-around">
        {currentTabs.map((item, idx) => (
          <button
            key={item.label}
            onClick={() => setTab(idx)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
              tab === idx ? 'clay-sidebar-pill-active' : 'text-slate-300'
            }`}
          >
            {item.icon}
            <span className="truncate max-w-[72px]">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Teacher Ethics Protocol Modal (shown once before teacher views sensitive data) */}
      {role === 'teacher' && !ethicsAccepted && (
        <EthicsProtocolModal
          onAccept={() => {
            setEthicsAccepted(true);
            saveEthicsAccepted(true);
            appendAudit('ครูยอมรับข้อตกลงจริยธรรมการใช้ข้อมูล (Teacher Ethics Protocol)', 'teacher');
          }}
        />
      )}

      {/* Student Detail Bottom Sheet */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          staff={staff}
          config={config}
          initialTab={selectedStudentTab}
          onClose={() => setSelectedStudentId(null)}
          onUpdate={handleUpdateStudent}
          onRequestConfirm={requestConfirm}
        />
      )}

      {/* Admin Individual Student Care Timeline Sheet */}
      {adminTimelineStudent && (
        <AdminStudentTimelineSheet
          student={adminTimelineStudent}
          staff={staff}
          config={config}
          school={school}
          onClose={() => setAdminTimelineStudentId(null)}
          onApprovePlan={handleApprovePlan}
          onRequestConfirm={requestConfirm}
        />
      )}

      {/* First-Time Face Capture Onboarding for Student & Parent */}
      {role === 'student' &&
        activeStudent &&
        !activeStudent.studentPhotoUrl &&
        !skippedOnboardingKeys[`stu-${activeStudent.code}`] && (
          <FaceCaptureModal
            open={true}
            title="ถ่ายภาพยืนยันตัวตนนักเรียน (ครั้งแรก)"
            subtitle="ช่วยให้งานดูแลช่วยเหลือและครูที่ปรึกษาจำใบหน้าเธอได้ง่ายขึ้น"
            studentCode={activeStudent.code}
            storageFileName="student.webp"
            onSkip={() =>
              setSkippedOnboardingKeys((prev) => ({ ...prev, [`stu-${activeStudent.code}`]: true }))
            }
            onComplete={(photoUrl) => {
              handleUpdateStudent(
                { ...activeStudent, studentPhotoUrl: photoUrl },
                `นักเรียนถ่ายภาพยืนยันตัวตนครั้งแรก (${activeStudent.code})`,
                'บันทึกรูปโปรไฟล์นักเรียนเรียบร้อยแล้ว'
              );
            }}
          />
        )}

      {role === 'parent' &&
        activeParentChild &&
        activeParentChild.parentVerified &&
        !(activeParentChild.guardians?.[0]?.photoUrl) &&
        !skippedOnboardingKeys[`par-${activeParentChild.code}`] && (
          <FaceCaptureModal
            open={true}
            title="ถ่ายภาพยืนยันตัวตนผู้ปกครอง (ครั้งแรก)"
            subtitle={`สำหรับผู้ปกครองของ ${activeParentChild.name} เพื่อความสะดวกในการติดต่อและเยี่ยมบ้าน`}
            studentCode={activeParentChild.code}
            storageFileName={`guardian_${activeParentChild.guardians?.[0]?.id || 'primary'}.webp`}
            onSkip={() =>
              setSkippedOnboardingKeys((prev) => ({ ...prev, [`par-${activeParentChild.code}`]: true }))
            }
            onComplete={(photoUrl, source) => {
              const first = activeParentChild.guardians?.[0] || {
                id: `g-${activeParentChild.code}-1`,
                name: `ผู้ปกครองของ ${activeParentChild.name.split(' ')[0]}`,
                relation: 'ผู้ปกครองหลัก',
                phone: activeParentChild.parentPhone || '',
                photoUrl: '',
              };
              const rest = (activeParentChild.guardians || []).slice(1);
              handleUpdateStudent(
                {
                  ...activeParentChild,
                  guardians: [
                    { ...first, photoUrl, photoSource: source, photoConsentAt: new Date().toISOString() },
                    ...rest,
                  ],
                },
                `ผู้ปกครองถ่ายภาพยืนยันตัวตนครั้งแรก (${activeParentChild.code})`,
                'บันทึกรูปผู้ปกครองเรียบร้อยแล้ว'
              );
            }}
          />
        )}

      {/* School SSO / Firebase Auth Login Modal */}
      <LoginModal
        open={loginModalOpen}
        staff={staff}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={(session) => {
          setRole(session.role);
          setTab(0);
          if (session.staffId) setActiveStaffId(session.staffId);
          appendAudit(`เข้าสู่ระบบ (${session.mode}): ${session.displayName}`, session.role);
          showToast(`ยินดีต้อนรับ ${session.displayName}`);
        }}
      />

      {/* Global Confirm Dialog */}
      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />

      {/* Global Toast (Snackbar) */}
      <ClayToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}

export default App;
