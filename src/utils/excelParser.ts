import * as XLSX from 'xlsx';
import { ImportSummary, RiskConfig, SchoolProfile, Student } from '../types';
import { getEffectiveRisk, getGraduationCriteria, RISK_LABELS } from './riskEngine';
import { formatAdvisorsForRoom, getAdvisorsForRoom } from '../data/advisors';

export function normalizeRoomName(sheetName: string): string {
  const trimmed = sheetName.trim();
  const match = trimmed.match(/^(ม\.\d+)[- ](\d+)$/);
  if (match) return `${match[1]}/${match[2]}`;
  return trimmed;
}

function buildDefaultStudentRecord(no: number, code: string, name: string, room: string): Student {
  const isTransition = room.startsWith('ม.1/') || room.startsWith('ม.4/') ? 1 : 0;
  const creditsReq = room.startsWith('ม.6/') ? 81 : room.startsWith('ม.3/') ? 77 : 41;
  const creditsEarned = Math.max(12, creditsReq - 6);

  return {
    id: code,
    no,
    code,
    name,
    room,
    advisor: formatAdvisorsForRoom(room),
    advisors: getAdvisorsForRoom(room),
    tel4: code.slice(-4).padStart(4, '0'),
    creditsEarned,
    creditsRequired: creditsReq,
    attendancePct: 94,
    lowAttendanceSubjects: 0,
    owedSubjects: 0,
    activitiesPassed: 3,
    readingWriting: 'ผ่าน',
    hasEquitySupport: 0,
    isTransitionGrade: isTransition,
    history: ['g', 'g', 'g'],
    prevTermOutcome: 0,
    plans: [],
    screening7: [0, 0, 0, 0, 0, 0, 0],
    screening9S: '',
    visits: [],
    asks: [],
    goalsDone: {},
    parentVerified: false,
    parentConsent: false,
    lineMessageState: 0,
  };
}

export function parseSchoolRosterWorkbook(
  buffer: ArrayBuffer,
  existingStudents: Student[]
): { students: Student[]; summary: ImportSummary } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const map = new Map<string, Student>();
  existingStudents.forEach((s) => map.set(s.code, { ...s }));

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const roomsImported = new Set<string>();
  const errors: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const cleanSheet = sheetName.trim();
    if (cleanSheet === 'รวม' || cleanSheet.toLowerCase().includes('summary')) {
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
      header: 1,
      defval: '',
    });

    const roomName = normalizeRoomName(cleanSheet);
    let sheetFound = false;

    let startRow = 4;
    for (let r = 0; r < Math.min(8, rows.length); r++) {
      const rowText = (rows[r] || []).map((c) => String(c ?? '').trim()).join(' ');
      if (rowText.includes('เลขประจำตัว') || rowText.includes('ชื่อ')) {
        startRow = r + 1;
        break;
      }
    }

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length < 3) continue;

      const noVal = Number(String(row[0] ?? '').trim());
      const code = String(row[1] ?? '').trim().replace(/\.0$/, '');
      const fullName = String(row[2] ?? '').trim().replace(/\s+/g, ' ');

      if (!code || !fullName || !/^\d{3,}$/.test(code)) {
        if (code || fullName) skipped++;
        continue;
      }

      sheetFound = true;
      const existing = map.get(code);
      if (existing) {
        existing.no = Number.isFinite(noVal) && noVal > 0 ? noVal : existing.no;
        existing.name = fullName;
        existing.room = roomName;
        existing.advisor = formatAdvisorsForRoom(roomName);
        existing.advisors = getAdvisorsForRoom(roomName);
        map.set(code, existing);
        updated++;
      } else {
        const fresh = buildDefaultStudentRecord(
          Number.isFinite(noVal) && noVal > 0 ? noVal : 0,
          code,
          fullName,
          roomName
        );
        map.set(code, fresh);
        added++;
      }
    }

    if (sheetFound) {
      roomsImported.add(roomName);
    }
  });

  return {
    students: Array.from(map.values()),
    summary: {
      added,
      updated,
      skipped,
      rooms: Array.from(roomsImported).sort(),
      errors,
    },
  };
}

export function parseWeeklyAcademicCSV(
  text: string,
  existingStudents: Student[]
): { students: Student[]; summary: ImportSummary } {
  const map = new Map<string, Student>();
  existingStudents.forEach((s) => map.set(s.code, { ...s }));

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const rooms = new Set<string>();
  const errors: string[] = [];

  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    const cols = line.split(/\t|,/).map((x) => x.trim());
    if (idx === 0 && isNaN(Number(cols[3]))) return;

    if (cols.length < 12) {
      errors.push(`แถว ${idx + 1}: มี ${cols.length} คอลัมน์ (ต้องมี 12 คอลัมน์)`);
      skipped++;
      return;
    }

    const [code, name, room, attStr, crEarnStr, crReqStr, oweStr, lowStr, actStr, rw, supStr, trStr] = cols;
    const att = Number(attStr);
    const crEarn = Number(crEarnStr);
    const crReq = Number(crReqStr);
    const owe = Number(oweStr);
    const low = Number(lowStr);
    const act = Number(actStr);
    const sup = Number(supStr);
    const tr = Number(trStr);

    const rowErrors: string[] = [];
    if (!code) rowErrors.push('ไม่มีรหัสนักเรียน');
    if (!name) rowErrors.push('ไม่มีชื่อ');
    if (!room) rowErrors.push('ไม่มีห้อง');
    if (isNaN(att) || att < 0 || att > 100) rowErrors.push('เวลาเรียนต้อง 0-100');
    if (isNaN(crEarn) || isNaN(crReq) || crEarn > crReq) rowErrors.push('หน่วยกิตไม่ถูกต้อง');
    if (rw !== 'ผ่าน' && rw !== 'ปรับปรุง') rowErrors.push('อ่านคิดเขียนต้องเป็น ผ่าน หรือ ปรับปรุง');

    if (rowErrors.length > 0) {
      errors.push(`แถว ${idx + 1}: ${rowErrors.join(', ')}`);
      skipped++;
      return;
    }

    const existing = map.get(code);
    if (existing) {
      existing.name = name;
      existing.room = room;
      existing.attendancePct = att;
      existing.creditsEarned = crEarn;
      existing.creditsRequired = crReq;
      existing.owedSubjects = owe;
      existing.lowAttendanceSubjects = low;
      existing.activitiesPassed = act;
      existing.readingWriting = rw as 'ผ่าน' | 'ปรับปรุง';
      existing.hasEquitySupport = sup;
      existing.isTransitionGrade = tr;
      map.set(code, existing);
      updated++;
    } else {
      const fresh = buildDefaultStudentRecord(0, code, name, room);
      fresh.attendancePct = att;
      fresh.creditsEarned = crEarn;
      fresh.creditsRequired = crReq;
      fresh.owedSubjects = owe;
      fresh.lowAttendanceSubjects = low;
      fresh.activitiesPassed = act;
      fresh.readingWriting = rw as 'ผ่าน' | 'ปรับปรุง';
      fresh.hasEquitySupport = sup;
      fresh.isTransitionGrade = tr;
      map.set(code, fresh);
      added++;
    }
    rooms.add(room);
  });

  return {
    students: Array.from(map.values()),
    summary: {
      added,
      updated,
      skipped,
      rooms: Array.from(rooms).sort(),
      errors,
    },
  };
}

export const WEEKLY_CSV_HEADER =
  'รหัส,ชื่อ,ห้อง,เวลาเรียน%,หน่วยกิตผ่าน,หน่วยกิตทั้งหมด,วิชาค้าง,วิชาเวลาต่ำกว่าเกณฑ์,กิจกรรม(0-3),อ่านคิดเขียน(ผ่าน/ปรับปรุง),สิทธิ์สนับสนุน(0/1),รอยต่อชั้น(0/1)';

/**
 * 1-Click Download 12-Column Weekly Update Excel Template (SGS/ปพ.5 compatible)
 */
export function downloadWeeklyTemplateExcel(sampleStudent?: Student) {
  const rows = [
    [
      'รหัส',
      'ชื่อ',
      'ห้อง',
      'เวลาเรียน%',
      'หน่วยกิตผ่าน',
      'หน่วยกิตทั้งหมด',
      'วิชาค้าง',
      'วิชาเวลาต่ำกว่าเกณฑ์',
      'กิจกรรม(0-3)',
      'อ่านคิดเขียน(ผ่าน/ปรับปรุง)',
      'สิทธิ์สนับสนุน(0/1)',
      'รอยต่อชั้น(0/1)',
    ],
    [
      sampleStudent?.code || '10001',
      sampleStudent?.name || 'เด็กชายตัวอย่าง รักเรียน',
      sampleStudent?.room || 'ม.1/1',
      85,
      36,
      41,
      1,
      0,
      3,
      'ผ่าน',
      0,
      1,
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'WeeklyUpdateTemplate');
  XLSX.writeFile(wb, 'PTN-Weekly-Update-Template-12Col.xlsx');
}

export function exportStudentsToExcel(students: Student[], cfg: RiskConfig) {
  const data = students.map((s) => {
    const risk = getEffectiveRisk(s, cfg);
    const crit = getGraduationCriteria(s, cfg);
    return {
      ห้อง: s.room,
      เลขที่: s.no,
      เลขประจำตัวนักเรียน: s.code,
      'ชื่อ - สกุล': s.name,
      ครูที่ปรึกษา: s.advisor,
      ระดับความเสี่ยง: RISK_LABELS[risk],
      'ผ่านเกณฑ์จบ (จาก 5)': crit.passedCount,
      'เวลาเรียน (%)': s.attendancePct,
      หน่วยกิตสะสม: `${s.creditsEarned}/${s.creditsRequired}`,
      วิชาค้าง: s.owedSubjects,
      วิชาเวลาไม่ถึงเกณฑ์: s.lowAttendanceSubjects,
      กิจกรรมผ่าน: `${s.activitiesPassed}/3`,
      อ่านคิดเขียน: s.readingWriting,
      จำนวนแผนช่วยเหลือ: s.plans.length,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PTN-Student-Care');
  XLSX.writeFile(wb, `PTN-Student-Care-Report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Generates an official Thai school report HTML for clean printing / Save as PDF
 * with School Header, Grade Breakdown Table, and Director Signature Block.
 */
export function openOfficialPrintReport(
  students: Student[],
  cfg: RiskConfig,
  school: SchoolProfile
) {
  const counts = { g: 0, y: 0, r: 0 };
  const byGrade: Record<string, { g: number; y: number; r: number; total: number }> = {};
  let passedAll5 = 0;

  students.forEach((s) => {
    const rk = getEffectiveRisk(s, cfg);
    counts[rk]++;
    if (getGraduationCriteria(s, cfg).passedCount === 5) passedAll5++;
    const grade = s.room.split('/')[0] || 'อื่นๆ';
    if (!byGrade[grade]) byGrade[grade] = { g: 0, y: 0, r: 0, total: 0 };
    byGrade[grade][rk]++;
    byGrade[grade].total++;
  });

  const todayThai = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const rowsHtml = Object.keys(byGrade)
    .sort((a, b) => a.localeCompare(b, 'th'))
    .map(
      (g) => `
      <tr>
        <td style="text-align:center">${g}</td>
        <td style="text-align:center">${byGrade[g].total}</td>
        <td style="text-align:center;color:#1b6b45;font-weight:600">${byGrade[g].g}</td>
        <td style="text-align:center;color:#a16207;font-weight:600">${byGrade[g].y}</td>
        <td style="text-align:center;color:#be123c;font-weight:600">${byGrade[g].r}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>รายงานสรุป PTN-Student-Care</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body { font-family: 'IBM Plex Sans Thai', sans-serif; color: #1e293b; padding: 28px 36px; line-height: 1.6; }
  .header { text-align: center; border-bottom: 2px solid #2B3E50; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0; color: #2B3E50; }
  h2 { font-size: 15px; margin: 4px 0 0; font-weight: 600; color: #475569; }
  .meta { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 16px; }
  .kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .kpi div { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; text-align: center; }
  .kpi b { display: block; font-size: 22px; color: #2B3E50; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { border: 1px solid #94a3b8; padding: 8px; }
  th { background: #e2e8f0; color: #1e293b; }
  .sig { margin-top: 48px; display: flex; justify-content: flex-end; }
  .sig-box { text-align: center; width: 260px; font-size: 13px; }
  .footer { margin-top: 32px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:12px;">
    <button onclick="window.print()" style="background:#2B3E50;color:#fff;border:0;padding:8px 18px;border-radius:99px;cursor:pointer;font-family:inherit;font-weight:600">พิมพ์ / บันทึกเป็น PDF</button>
  </div>
  <div class="header">
    <h1>รายงานสรุปผลการดูแลช่วยเหลือและติดตามความพร้อมจบการศึกษา</h1>
    <h2>${school.schoolName} ${school.affiliation}</h2>
  </div>
  <div class="meta">
    <span>ภาคเรียนที่ ${school.term} ปีการศึกษา ${school.academicYear}</span>
    <span>วันที่ออกรายงาน: ${todayThai}</span>
  </div>
  <div class="kpi">
    <div><span>นักเรียนทั้งหมด</span><b>${students.length} คน</b></div>
    <div><span>ผ่านเกณฑ์ครบ 5 ข้อ</span><b>${passedAll5} คน</b></div>
    <div><span>เฝ้าระวัง</span><b style="color:#a16207">${counts.y} คน</b></div>
    <div><span>เสี่ยงสูง (เร่งด่วน)</span><b style="color:#be123c">${counts.r} คน</b></div>
  </div>
  <h3 style="font-size:15px;margin:12px 0 4px;">ตารางสรุปสถานะนักเรียนแยกตามระดับชั้น</h3>
  <table>
    <thead>
      <tr>
        <th>ระดับชั้น</th>
        <th>จำนวนทั้งหมด</th>
        <th>ปกติ</th>
        <th>เฝ้าระวัง</th>
        <th>เสี่ยงสูง</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="sig">
    <div class="sig-box">
      <p>ลงชื่อ .......................................................</p>
      <p>(${school.directorName})</p>
      <p>${school.directorTitle}</p>
    </div>
  </div>
  <div class="footer">ออกรายงานโดยระบบ PTN-Student-Care · Dev By Kru.gorthailand</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=720');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

/**
 * Generates an official PDPA-safe Individual Student Care Report (printable / Save as PDF)
 * Never includes raw sensitive screening text or private student asks.
 */
export function openIndividualStudentPdfReport(
  student: Student,
  cfg: RiskConfig,
  school: SchoolProfile,
  careTimeline: { date: string; actor: string; action: string; detail: string; status: string }[],
  hasSensitiveCare: boolean,
  caseManagerName?: string
) {
  const risk = getEffectiveRisk(student, cfg);
  const { criteria, passedCount } = getGraduationCriteria(student, cfg);
  const todayThai = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const criteriaRows = criteria
    .map(
      (c) => `<tr><td>${c.label}</td><td style="text-align:center;font-weight:600;color:${c.passed ? '#1b6b45' : '#be123c'}">${c.passed ? '✓ ผ่าน' : 'ยังไม่ผ่าน'}</td></tr>`
    )
    .join('');

  const timelineRows = careTimeline.length
    ? careTimeline
        .map(
          (t) => `
      <tr>
        <td style="white-space:nowrap">${t.date}</td>
        <td><b>${t.actor}</b></td>
        <td>${t.action}</td>
        <td>${t.detail}</td>
        <td style="text-align:center;font-weight:600">${t.status}</td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="5" style="text-align:center;color:#64748b">ยังไม่มีประวัติการดำเนินการช่วยเหลือ</td></tr>`;

  const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>รายงานประวัติการช่วยเหลือนักเรียนรายบุคคล - ${student.code}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body { font-family: 'IBM Plex Sans Thai', sans-serif; color: #1e293b; padding: 26px 34px; line-height: 1.55; }
  .header { text-align: center; border-bottom: 2px solid #2B3E50; padding-bottom: 10px; margin-bottom: 16px; }
  h1 { font-size: 18px; margin: 0; color: #2B3E50; }
  h2 { font-size: 14px; margin: 4px 0 0; font-weight: 600; color: #475569; }
  .box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; font-size: 13px; }
  .pdpa { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #92400e; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 12.5px; }
  th, td { border: 1px solid #94a3b8; padding: 7px 8px; vertical-align: top; }
  th { background: #e2e8f0; color: #1e293b; }
  .sig { margin-top: 36px; display: flex; justify-content: space-between; font-size: 13px; }
  .sig-col { text-align: center; width: 45%; }
  .footer { margin-top: 28px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:10px;">
    <button onclick="window.print()" style="background:#2B3E50;color:#fff;border:0;padding:8px 18px;border-radius:99px;cursor:pointer;font-family:inherit;font-weight:600">พิมพ์ / บันทึกเป็น PDF</button>
  </div>
  <div class="header">
    <h1>รายงานประวัติการดูแลช่วยเหลือนักเรียนรายบุคคล (PTN-Student-Care)</h1>
    <h2>${school.schoolName} ${school.affiliation} · ภาคเรียนที่ ${school.term}/${school.academicYear}</h2>
  </div>
  <div class="box">
    <b>ชื่อ - สกุล:</b> ${student.name} &nbsp;|&nbsp; <b>รหัสนักเรียน:</b> ${student.code} &nbsp;|&nbsp; <b>ห้องเรียน:</b> ${student.room}<br/>
    <b>ครูที่ปรึกษา:</b> ${student.advisor} &nbsp;|&nbsp; <b>สถานะปัจจุบัน:</b> ${RISK_LABELS[risk]} &nbsp;|&nbsp; <b>เกณฑ์การจบ:</b> ผ่าน ${passedCount}/5 ข้อ (หน่วยกิต ${student.creditsEarned}/${student.creditsRequired})<br/>
    <b>วันที่ออกรายงาน:</b> ${todayThai}
  </div>
  ${
    hasSensitiveCare
      ? `<div class="pdpa">🔒 มีการดูแลด้านจิตใจ/สวัสดิภาพโดย ${caseManagerName || student.advisor} (สงวนสิทธิ์รายละเอียดตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล PDPA)</div>`
      : ''
  }
  <h3 style="font-size:14px;margin:0 0 4px;">1. สถานะเกณฑ์ความพร้อมจบการศึกษา (5 ข้อ)</h3>
  <table>
    <thead><tr><th>เกณฑ์การจบ</th><th style="width:120px">สถานะ</th></tr></thead>
    <tbody>${criteriaRows}</tbody>
  </table>
  <h3 style="font-size:14px;margin:0 0 4px;">2. ไทม์ไลน์การช่วยเหลือ (ใคร / อะไร / ยังไง)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:90px">วันที่</th>
        <th style="width:130px">ใคร (ผู้ดำเนินการ)</th>
        <th style="width:150px">อะไร (การดำเนินการ)</th>
        <th>ยังไง (รายละเอียด/ผลลัพธ์)</th>
        <th style="width:105px">สถานะ</th>
      </tr>
    </thead>
    <tbody>${timelineRows}</tbody>
  </table>
  <div class="sig">
    <div class="sig-col">
      <p>ลงชื่อ .......................................................</p>
      <p>(${student.advisor})</p>
      <p>ครูที่ปรึกษา / ผู้รายงาน</p>
    </div>
    <div class="sig-col">
      <p>ลงชื่อ .......................................................</p>
      <p>(${school.directorName})</p>
      <p>${school.directorTitle}</p>
    </div>
  </div>
  <div class="footer">เอกสารราชการจากระบบ PTN-Student-Care (สงวนสิทธิ์ข้อมูลอ่อนไหวตาม PDPA) · Dev By Kru.gorthailand</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=940,height=740');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

/**
 * Parses first 5 rows of weekly CSV/SGS text for Import Preview before committing.
 */
export function previewWeeklyCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(0, 6)
    .map((line) => line.split(/\t|,/).map((c) => c.trim()));
}

/**
 * Exports De-identified / Anonymized Research Dataset (CSV, UTF-8 BOM for Excel/SPSS/R/Python)
 * Strips all PII (names, student codes, phone numbers, sensitive text) to comply with PDPA.
 */
export function exportAnonymizedResearchCsv(students: Student[], cfg: RiskConfig) {
  const header = [
    'anon_id',
    'grade_level',
    'attendance_pct',
    'credits_ratio',
    'owed_subjects',
    'low_att_subjects',
    'activities_passed',
    'reading_writing_pass',
    'equity_support',
    'transition_grade',
    'criteria_passed_of_5',
    'risk_level',
    'plans_count',
    'plans_done',
    'recovered_from_initial',
    'cohort_snapshots_count',
  ];

  const rows = students.map((s, idx) => {
    const anonId = `PTN-ANON-${String(idx + 1).padStart(4, '0')}`;
    const grade = s.room.split('/')[0] || 'NA';
    const rk = getEffectiveRisk(s, cfg);
    const crit = getGraduationCriteria(s, cfg).passedCount;
    const creditsRatio = (s.creditsEarned / Math.max(1, s.creditsRequired)).toFixed(3);
    const plansDone = s.plans.filter((p) => p.done).length;
    const recovered = s.history[0] && s.history[0] !== 'g' && rk === 'g' ? 1 : 0;

    return [
      anonId,
      grade,
      s.attendancePct,
      creditsRatio,
      s.owedSubjects,
      s.lowAttendanceSubjects,
      s.activitiesPassed,
      s.readingWriting === 'ผ่าน' ? 1 : 0,
      s.hasEquitySupport,
      s.isTransitionGrade,
      crit,
      rk,
      s.plans.length,
      plansDone,
      recovered,
      s.cohortSnapshots?.length || 0,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PTN-Research-Anonymized-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
