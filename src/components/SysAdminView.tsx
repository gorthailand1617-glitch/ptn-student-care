import React, { useMemo, useState } from 'react';
import {
  UserPlus,
  Building2,
  DatabaseBackup,
  Trash2,
  CheckCircle2,
  Shield,
  Download,
  Upload,
  History,
} from 'lucide-react';
import { SchoolProfile, Student, TeacherStaff } from '../types';

interface Props {
  tab: number; // 0=จัดการครู/ผู้ดูแลเคส, 1=ตั้งค่าโรงเรียน/ปีการศึกษา, 2=สำรองข้อมูล/Snapshot
  staff: TeacherStaff[];
  school: SchoolProfile;
  students: Student[];
  onUpdateStaff: (next: TeacherStaff[], auditAction: string) => void;
  onUpdateSchool: (next: SchoolProfile) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonText: string) => void;
  onCreateTermSnapshot: (termLabel: string) => void;
  onSeedToFirestore: () => Promise<void>;
}

const STAFF_ROLE_LABELS: Record<TeacherStaff['staffRole'], string> = {
  homeroom: 'ครูประจำชั้น',
  counselor: 'ครูแนะแนว',
  case_manager: 'ครูผู้ดูแลเคส',
};

export const SysAdminView: React.FC<Props> = ({
  tab,
  staff,
  school,
  students,
  onUpdateStaff,
  onUpdateSchool,
  onExportBackup,
  onImportBackup,
  onCreateTermSnapshot,
  onSeedToFirestore,
}) => {
  const [seedingCloud, setSeedingCloud] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [staffRole, setStaffRole] = useState<TeacherStaff['staffRole']>('homeroom');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [schoolForm, setSchoolForm] = useState<SchoolProfile>(school);
  const [savedNotice, setSavedNotice] = useState('');
  const [snapshotTerm, setSnapshotTerm] = useState(`${school.academicYear}/${school.term}`);

  const allRooms = useMemo(() => {
    const set = new Set(students.map((s) => s.room));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [students]);

  const toggleRoom = (r: string) => {
    setSelectedRooms((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const item: TeacherStaff = {
      id: `staff-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      staffRole,
      rooms: staffRole === 'homeroom' ? selectedRooms : [],
      active: true,
    };
    onUpdateStaff([item, ...staff], `เพิ่มบุคลากร: ${item.name} (${STAFF_ROLE_LABELS[item.staffRole]})`);
    setName('');
    setEmail('');
    setPhone('');
    setSelectedRooms([]);
  };

  const handleToggleActive = (id: string) => {
    const target = staff.find((s) => s.id === id);
    if (!target) return;
    const next = staff.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    onUpdateStaff(next, `${target.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}บัญชีครู ${target.name}`);
  };

  const handleDeleteStaff = (id: string) => {
    const target = staff.find((s) => s.id === id);
    if (!target) return;
    onUpdateStaff(
      staff.filter((s) => s.id !== id),
      `ลบรายชื่อบุคลากร ${target.name}`
    );
  };

  // Tab 1: School Profile & Academic Year
  if (tab === 1) {
    return (
      <div className="clay-card p-5 space-y-4">
        <h2 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#4A7C82]" /> ตั้งค่าข้อมูลโรงเรียน ปีการศึกษา และ LINE LIFF
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-semibold text-[#2B3E50] block mb-1">ชื่อสถานศึกษา</label>
            <input
              type="text"
              value={schoolForm.schoolName}
              onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
              className="clay-input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#2B3E50] block mb-1">สังกัด</label>
            <input
              type="text"
              value={schoolForm.affiliation}
              onChange={(e) => setSchoolForm({ ...schoolForm, affiliation: e.target.value })}
              className="clay-input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#2B3E50] block mb-1">ปีการศึกษา</label>
            <input
              type="text"
              value={schoolForm.academicYear}
              onChange={(e) => setSchoolForm({ ...schoolForm, academicYear: e.target.value })}
              className="clay-input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#2B3E50] block mb-1">ภาคเรียน</label>
            <select
              value={schoolForm.term}
              onChange={(e) => setSchoolForm({ ...schoolForm, term: e.target.value })}
              className="clay-input w-full px-3 py-2 text-sm"
            >
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#2B3E50] block mb-1">ชื่อผู้ลงนามในรายงาน PDF</label>
            <input
              type="text"
              value={schoolForm.directorName}
              onChange={(e) => setSchoolForm({ ...schoolForm, directorName: e.target.value })}
              className="clay-input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#2B3E50] block mb-1">ตำแหน่งผู้ลงนาม</label>
            <input
              type="text"
              value={schoolForm.directorTitle}
              onChange={(e) => setSchoolForm({ ...schoolForm, directorTitle: e.target.value })}
              className="clay-input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#2B3E50] block mb-1">LINE LIFF ID</label>
            <input
              type="text"
              value={schoolForm.lineLiffId}
              onChange={(e) => setSchoolForm({ ...schoolForm, lineLiffId: e.target.value })}
              placeholder="เช่น 2001234567-xxxxxxxx"
              className="clay-input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#2B3E50] block mb-1">LINE Webhook Endpoint</label>
            <input
              type="text"
              value={schoolForm.lineWebhookUrl}
              onChange={(e) => setSchoolForm({ ...schoolForm, lineWebhookUrl: e.target.value })}
              placeholder="https://asia-southeast1-...cloudfunctions.net/..."
              className="clay-input w-full px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              onUpdateSchool(schoolForm);
              setSavedNotice('บันทึกการตั้งค่าโรงเรียนเรียบร้อยแล้ว ✓');
              setTimeout(() => setSavedNotice(''), 3000);
            }}
            className="clay-btn-primary px-6 py-2.5 text-sm font-semibold"
          >
            บันทึกการตั้งค่า
          </button>
          {savedNotice && <span className="text-xs font-semibold text-emerald-700">{savedNotice}</span>}
        </div>
      </div>
    );
  }

  // Tab 2: Backup, Restore & Longitudinal Cohort Snapshot
  if (tab === 2) {
    return (
      <div className="space-y-5">
        <div className="clay-card p-5 space-y-3">
          <h2 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
            <History className="w-5 h-5 text-[#4A7C82]" /> บันทึก Snapshot รายภาคเรียน (Longitudinal Cohort)
          </h2>
          <p className="text-xs text-slate-600">
            บันทึกสถานะความเสี่ยงและจำนวนเกณฑ์ที่ผ่านของนักเรียนทุกคนในภาคเรียนปัจจุบัน เพื่อใช้วิเคราะห์แนวโน้มระยะยาวและประสิทธิผลของแผนช่วยเหลือข้ามภาคเรียน
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={snapshotTerm}
              onChange={(e) => setSnapshotTerm(e.target.value)}
              placeholder="เช่น 2569/1"
              className="clay-input px-3 py-2 text-sm w-44"
            />
            <button
              onClick={() => onCreateTermSnapshot(snapshotTerm)}
              className="clay-btn-primary px-5 py-2 text-xs font-semibold"
            >
              บันทึก Snapshot ภาคเรียนนี้ ({students.length} คน)
            </button>
          </div>
        </div>

        <div className="clay-card p-5 space-y-3">
          <h2 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
            <DatabaseBackup className="w-5 h-5 text-[#4A7C82]" /> สำรองและกู้คืนข้อมูลทั้งระบบ (JSON Backup)
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={seedingCloud}
              onClick={async () => {
                setSeedingCloud(true);
                try {
                  await onSeedToFirestore();
                } finally {
                  setSeedingCloud(false);
                }
              }}
              className="clay-btn-primary px-5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {seedingCloud
                ? 'กำลังอัปโหลดขึ้น Cloud Firestore...'
                : `Seed ข้อมูลนักเรียน (${students.length}) และครู (${staff.length}) ขึ้น Firestore`}
            </button>
            <button
              onClick={onExportBackup}
              className="clay-btn-soft px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> ดาวน์โหลดไฟล์สำรองข้อมูล (.json)
            </button>
            <label className="clay-btn-soft px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4 text-[#4A7C82]" /> กู้คืนจากไฟล์สำรอง (.json)
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => onImportBackup(String(reader.result || ''));
                  reader.readAsText(file, 'utf-8');
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Tab 0: Staff Management (Homeroom Advisors, Counselors, Case Managers)
  return (
    <div className="space-y-5">
      <form onSubmit={handleAddStaff} className="clay-card p-5 space-y-3">
        <h2 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#4A7C82]" /> เพิ่มครูประจำชั้น / ครูแนะแนว / ครูผู้ดูแลเคส
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อ - สกุล (เช่น ครูสมหญิง รักเด็ก)"
            className="clay-input px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="อีเมล (สำหรับ Firebase Auth)"
            className="clay-input px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="เบอร์โทรติดต่อ"
            className="clay-input px-3 py-2 text-sm"
          />
          <select
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as TeacherStaff['staffRole'])}
            className="clay-input px-3 py-2 text-sm"
          >
            <option value="homeroom">ครูประจำชั้น (Homeroom)</option>
            <option value="case_manager">ครูผู้ดูแลเคส (Case Manager)</option>
            <option value="counselor">ครูแนะแนว (Counselor)</option>
          </select>
        </div>

        {staffRole === 'homeroom' && (
          <div>
            <label className="text-xs font-semibold text-[#2B3E50] block mb-1.5">
              เลือกห้องที่ปรึกษาที่รับผิดชอบ (เลือกได้หลายห้อง):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allRooms.map((r) => {
                const active = selectedRooms.includes(r);
                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() => toggleRoom(r)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                      active ? 'bg-[#4A7C82] text-white' : 'bg-white/70 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button type="submit" className="clay-btn-primary px-5 py-2 text-xs font-semibold">
          เพิ่มบุคลากรเข้าสู่ระบบ
        </button>
      </form>

      <div className="clay-card p-5 space-y-3">
        <h3 className="font-bold text-[#2B3E50] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#4A7C82]" /> รายชื่อบุคลากรในระบบ ({staff.length} คน)
        </h3>
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="clay-card-light p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#2B3E50]">{s.name}</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#4A7C82]/15 text-[#2B3E50]">
                    {STAFF_ROLE_LABELS[s.staffRole]}
                  </span>
                  {!s.active && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                      ปิดใช้งาน
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {s.email || 'ยังไม่ระบุอีเมล'} {s.phone && `· ${s.phone}`}
                  {s.rooms.length > 0 && ` · ห้องที่ปรึกษา: ${s.rooms.join(', ')}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(s.id)}
                  className="clay-btn-soft px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7C82]" />
                  {s.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                </button>
                <button
                  onClick={() => handleDeleteStaff(s.id)}
                  className="text-slate-400 hover:text-rose-600 p-1.5"
                  title="ลบ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
