export type Role = 'sysadmin' | 'admin' | 'teacher' | 'student' | 'parent';

export type RiskLevel = 'g' | 'y' | 'r';

export type PlanApprovalStatus = '' | 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ส่งกลับแก้ไข';

export interface TeacherStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  staffRole: 'sysadmin' | 'admin' | 'homeroom' | 'counselor' | 'case_manager';
  rooms: string[]; // e.g. ['ม.1/1', 'ม.1/2']
  active: boolean;
}

export interface SchoolProfile {
  schoolName: string;
  affiliation: string;
  academicYear: string;
  term: string;
  directorName: string;
  directorTitle: string;
  lineLiffId: string;
  lineWebhookUrl: string;
}

export interface OwedSubjectItem {
  subjectCode: string;
  subjectName: string;
  grade: '0' | 'ร' | 'มส' | 'มผ';
  missingTask: string;
}

export interface TermSnapshot {
  termLabel: string; // e.g. "2568/2"
  risk: RiskLevel;
  passedCriteria: number;
  plansCount: number;
}

export interface SupportPlan {
  id: string;
  pathwayIndex: number; // 0..7
  due: string; // YYYY-MM-DD
  by: string;
  expectedOutcome: string;
  done: boolean;
  approvalStatus: PlanApprovalStatus;
  createdAt: string;
  termLabel?: string; // e.g. "1/2569"
}

export interface HomeVisit {
  id: string;
  date: string;
  contactName: string;
  phone: string;
  status: 'พบตัว' | 'ติดตามแล้วไม่พบตัว' | 'ยังไม่ได้ติดตาม';
  needs: string;
  landmarkNote?: string;
  location?: {
    lat: number;
    lng: number;
  };
  photoDataUrl?: string;
  termLabel?: string;
}

export interface StudentAsk {
  id: string;
  category: string;
  text: string;
  visibility: 'private' | 'team';
  createdAt: string;
  fromParent?: boolean;
  teacherReply?: string;
  repliedAt?: string;
}

export type PhotoSource = 'face_scan' | 'teacher_upload' | 'self_upload';

export interface GuardianProfile {
  id: string;
  name: string;
  relation: string; // เช่น บิดา, มารดา, ยาย
  phone: string;
  photoUrl: string;
  photoSource?: PhotoSource;
  photoConsentAt?: string;
}

export interface AdvisorInfo {
  name: string;
  position: string;
}

export interface Student {
  id: string;
  no: number;
  code: string;
  name: string;
  room: string;
  studentPhotoUrl?: string;
  guardians?: GuardianProfile[];
  advisor: string;
  advisors?: AdvisorInfo[];
  assignedCaseManagerId?: string;
  caseHandoffNote?: string;
  // Seamless Handover & GPS Navigation fields
  location?: {
    lat: number;
    lng: number;
  };
  landmarkNote?: string;
  homePhotoUrl?: string;
  handoverNote?: string;
  parentPhone?: string;
  preferredContactTime?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  tel4: string;
  creditsEarned: number;
  creditsRequired: number;
  attendancePct: number;
  lowAttendanceSubjects: number;
  owedSubjects: number;
  owedSubjectDetails?: OwedSubjectItem[];
  activitiesPassed: number;
  readingWriting: 'ผ่าน' | 'ปรับปรุง';
  hasEquitySupport: number; // น้ำหนักเสี่ยง default = 0 ไม่ตีตรา
  isTransitionGrade: number;
  history: RiskLevel[];
  cohortSnapshots?: TermSnapshot[];
  prevTermOutcome: number | null;
  plans: SupportPlan[];
  screening7: number[];
  screening9S: string;
  visits: HomeVisit[];
  asks: StudentAsk[];
  goalsDone: Record<number, boolean>;
  skipReason?: string;
  feedback?: 'miss' | '';
  parentVerified: boolean;
  parentConsent: boolean;
  parentChannel?: string;
  parentAckPlan?: boolean;
  lineMessageState: 0 | 1 | 2;
}

export interface RiskConfig {
  minAttendancePct: number;
  yellowThreshold: number;
  redThreshold: number;
  equitySupportWeight: number;
  transitionGradeWeight: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  role: Role;
  roleLabel: string;
  action: string;
}

export interface ImportSummary {
  added: number;
  updated: number;
  skipped: number;
  rooms: string[];
  errors: string[];
}
