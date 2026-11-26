import { RiskConfig, RiskLevel, Student, SupportPlan } from '../types';

export const PATHWAYS_SHORT = [
  'ซ่อมเสริม',
  'ปรับวิธีเรียน',
  'โครงงาน/ออนไลน์',
  'เรียนควบคู่ทำงาน',
  'เทียบโอน/Credit Bank',
  'ส่งต่อ สกร./อาชีวะ',
  'ทุน/สวัสดิการ',
  'สหวิชาชีพ',
] as const;

export const PATHWAYS_LONG = [
  'เรียนซ่อมเสริมวิชาที่ค้างตามตารางที่ตกลงกัน',
  'ปรับวิธีเรียน เช่น รวมกลุ่มสัปดาห์ละครั้ง หรือครูไปพบที่บ้าน',
  'เรียนผ่านโครงงานหรือออนไลน์ในเวลาที่สะดวก',
  'เรียนควบคู่การทำงาน มีพี่เลี้ยงและครูติดตาม',
  'นำประสบการณ์หรือผลการเรียนเดิมมาเทียบเป็นหน่วยกิต (Credit Bank)',
  'เรียนต่อที่ สกร. (กศน.) หรืออาชีวะ แล้วนำผลกลับมาเทียบ',
  'ประสานทุนและสวัสดิการที่ครอบครัวมีสิทธิ์',
  'พบครูแนะแนวหรือผู้เชี่ยวชาญ (เป็นความลับ)',
] as const;

// ข้อ 5 (index 4) และ ข้อ 6 (index 5) ต้องส่งผู้บริหารอนุมัติ
export const APPROVAL_REQUIRED_PATHWAYS = [4, 5];

export const SCREENING_DOMAINS = [
  'ข้อมูลการศึกษา',
  'การเรียน',
  'สุขภาพกาย',
  'สุขภาพจิต',
  'เศรษฐกิจ',
  'สวัสดิภาพ',
  'พฤติกรรม',
] as const;

export const SCREENING_LEVELS = ['ปกติ', 'เสี่ยง', 'มีปัญหา'] as const;

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  minAttendancePct: 80,
  yellowThreshold: 2,
  redThreshold: 5,
  equitySupportWeight: 0, // ไม่ตีตราทุนเสมอภาค
  transitionGradeWeight: 1,
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  g: 'ปกติ',
  y: 'เฝ้าระวัง',
  r: 'เสี่ยงสูง',
};

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createSupportPlan(pathwayIndex: number, by = 'ครูที่ปรึกษา'): SupportPlan {
  const needsApproval = APPROVAL_REQUIRED_PATHWAYS.includes(pathwayIndex);
  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    pathwayIndex,
    due: addDaysISO(14),
    by,
    expectedOutcome: '',
    done: false,
    approvalStatus: needsApproval ? 'รออนุมัติ' : '',
    createdAt: new Date().toISOString(),
  };
}

export function computeRiskScore(s: Student, cfg: RiskConfig): number {
  let scrSum = 0;
  let scrMax = 0;
  for (let i = 2; i < 7; i++) {
    const val = s.screening7[i] || 0;
    scrSum += val;
    if (val > scrMax) scrMax = val;
  }

  return (
    (s.attendancePct < cfg.minAttendancePct ? 3 : s.attendancePct < cfg.minAttendancePct + 10 ? 1 : 0) +
    (s.lowAttendanceSubjects >= 2 ? 2 : s.lowAttendanceSubjects > 0 ? 1 : 0) +
    (s.owedSubjects >= 3 ? 3 : s.owedSubjects > 0 ? 1 : 0) +
    (s.readingWriting !== 'ผ่าน' ? 1 : 0) +
    (s.activitiesPassed < 3 ? 1 : 0) +
    s.hasEquitySupport * cfg.equitySupportWeight +
    s.isTransitionGrade * cfg.transitionGradeWeight +
    scrMax +
    (scrSum >= 3 ? 1 : 0)
  );
}

export function getRawRisk(s: Student, cfg: RiskConfig): RiskLevel {
  const score = computeRiskScore(s, cfg);
  if (score >= cfg.redThreshold) return 'r';
  if (score >= cfg.yellowThreshold) return 'y';
  return 'g';
}

export function getEffectiveRisk(s: Student, cfg: RiskConfig): RiskLevel {
  if (s.skipReason) return 'g';
  return getRawRisk(s, cfg);
}

export function getRiskReasons(s: Student, cfg: RiskConfig): string[] {
  const reasons: string[] = [];
  if (s.attendancePct < cfg.minAttendancePct) {
    reasons.push(`เวลาเรียนต่ำกว่า ${cfg.minAttendancePct}%`);
  } else if (s.attendancePct < cfg.minAttendancePct + 10) {
    reasons.push('เวลาเรียนเริ่มลดลง');
  }
  if (s.lowAttendanceSubjects > 0) {
    reasons.push(`${s.lowAttendanceSubjects} วิชาเวลาเรียนไม่ถึงเกณฑ์ (มส)`);
  }
  if (s.owedSubjects > 0) {
    reasons.push(`วิชาค้างแก้ ${s.owedSubjects} วิชา (0/ร/มส/มผ)`);
  }
  if (s.readingWriting !== 'ผ่าน') {
    reasons.push('อ่านคิดวิเคราะห์เขียนต้องปรับปรุง');
  }
  if (s.activitiesPassed < 3) {
    reasons.push('กิจกรรมพัฒนาผู้เรียนยังไม่ครบ');
  }
  return reasons;
}

export function countOtherScreeningSignals(s: Student): number {
  let count = 0;
  for (let i = 2; i < 7; i++) {
    if ((s.screening7[i] || 0) > 0) count++;
  }
  return count;
}

export interface GraduationCriterion {
  label: string;
  passed: boolean;
}

export function getGraduationCriteria(
  s: Student,
  cfg: RiskConfig
): { criteria: GraduationCriterion[]; passedCount: number } {
  const criteria: GraduationCriterion[] = [
    { label: `เวลาเรียนรวม ≥ ${cfg.minAttendancePct}%`, passed: s.attendancePct >= cfg.minAttendancePct },
    { label: 'ไม่มีวิชา มส (เวลาเรียนทุกวิชาถึงเกณฑ์)', passed: s.lowAttendanceSubjects === 0 },
    { label: 'ไม่มีวิชาค้าง (0 / ร / มส / มผ)', passed: s.owedSubjects === 0 },
    { label: 'กิจกรรมพัฒนาผู้เรียนครบ 3 ด้าน', passed: s.activitiesPassed >= 3 },
    { label: 'อ่าน คิดวิเคราะห์ และเขียนผ่าน', passed: s.readingWriting === 'ผ่าน' },
  ];
  const passedCount = criteria.filter((c) => c.passed).length;
  return { criteria, passedCount };
}

export function getWeeklyGoals(s: Student, cfg: RiskConfig): string[] {
  const goals: string[] = [];
  if (s.owedSubjects > 0) goals.push('ส่งงานแก้วิชาค้างให้ได้ 1 ชิ้นในสัปดาห์นี้');
  if (s.attendancePct < cfg.minAttendancePct + 10) goals.push('มาเรียนให้ครบ 5 วันในสัปดาห์นี้');
  if (s.activitiesPassed < 3) goals.push('เข้าร่วมกิจกรรมพัฒนาผู้เรียนที่ขาดอีก 1 ครั้ง');
  if (s.readingWriting !== 'ผ่าน') goals.push('ส่งชิ้นงานอ่านคิดเขียนฉบับปรับปรุง');
  return goals.length > 0 ? goals : ['รักษาจังหวะการเรียนที่ดีแบบนี้ไว้ได้เลย เยี่ยมมาก!'];
}

export interface PathwayRecommendation {
  pathwayIndex: number;
  reason: string;
}

export function getRecommendedPathways(s: Student, cfg: RiskConfig): PathwayRecommendation[] {
  const recs: PathwayRecommendation[] = [];
  const used = new Set<number>();
  const add = (pathwayIndex: number, reason: string) => {
    if (!used.has(pathwayIndex)) {
      used.add(pathwayIndex);
      recs.push({ pathwayIndex, reason });
    }
  };

  if ((s.screening7[4] || 0) >= 1) {
    add(6, 'ครอบครัวมีข้อจำกัดด้านเศรษฐกิจ');
    add(3, 'ช่วยรายได้ครอบครัวไปพร้อมเรียน');
  }
  if (s.owedSubjects > 0 || s.lowAttendanceSubjects > 0) {
    add(0, 'มีวิชาค้างหรือเวลาเรียนไม่ถึงเกณฑ์');
  }
  if (s.attendancePct < cfg.minAttendancePct) {
    add(1, 'เวลาเรียนต่ำกว่าเกณฑ์ ลองปรับวิธีเรียน');
  }
  if ((s.screening7[3] || 0) > 0 || (s.screening7[5] || 0) > 0 || (s.screening7[6] || 0) > 0) {
    add(7, 'มีสัญญาณด้านจิตใจ สวัสดิภาพ หรือพฤติกรรม');
  }
  if (s.attendancePct < 60) {
    add(5, 'ขาดเรียนมาก ควรพิจารณาระบบการเรียนทางเลือก');
  }

  return recs;
}

function wilsonCI(k: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [
    Math.max(0, Math.round(((center - margin) / denom) * 100)),
    Math.min(100, Math.round(((center + margin) / denom) * 100)),
  ];
}

export function computeCalibrationText(students: Student[], cfg: RiskConfig): string {
  let total = 0;
  let actualProblems = 0;
  let hits = 0;
  students.forEach((s) => {
    if (s.prevTermOutcome == null) return;
    total++;
    if (s.prevTermOutcome === 1) {
      actualProblems++;
      if (getRawRisk(s, cfg) !== 'g') hits++;
    }
  });
  if (total < 30) {
    return `ยังไม่แสดงความแม่นยำ เพราะมีผลเทอมก่อนเพียง ${total} คน (ต้องมีอย่างน้อย 30 คน เพื่อให้ค่าทางสถิติเชื่อถือได้)`;
  }
  const [low, high] = wilsonCI(hits, actualProblems);
  return `ตรวจพบ ${hits} จาก ${actualProblems} คนที่มีปัญหาจริง (ความแม่นยำ ${low}–${high}% ที่ความเชื่อมั่น 95% CI, n=${total})`;
}
