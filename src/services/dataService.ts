import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { AuditLog, RiskConfig, SchoolProfile, Student, TeacherStaff } from '../types';
import { DEFAULT_RISK_CONFIG } from '../utils/riskEngine';
import { ADVISOR_ORDER_DATA, buildRealStaffList } from '../data/advisors';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let firebaseApp = null;
if (isFirebaseConfigured) {
  firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;

const STORAGE_KEYS = {
  STUDENTS: 'ptn_care_students_v3',
  CONFIG: 'ptn_care_config_v3',
  AUDIT: 'ptn_care_audit_v3',
  ROOM_UPDATES: 'ptn_care_room_updates_v3',
  STAFF: 'ptn_care_staff_v3',
  SCHOOL: 'ptn_care_school_v3',
  ETHICS: 'ptn_care_ethics_accepted_v3',
};

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  schoolName: 'โรงเรียนเปรมติณสูลานนท์',
  affiliation: 'องค์การบริหารงานส่วนจังหวัดขอนแก่น',
  academicYear: '2569',
  term: '1',
  directorName: ADVISOR_ORDER_DATA.principal.name,
  directorTitle: ADVISOR_ORDER_DATA.principal.position,
  lineLiffId: import.meta.env.VITE_LINE_LIFF_ID || '',
  lineWebhookUrl: import.meta.env.VITE_LINE_NOTIFY_ENDPOINT || '',
};

export const DEFAULT_STAFF: TeacherStaff[] = buildRealStaffList();

export function loadLocalStudents(): Student[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLocalStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch {
    // ignore
  }
}

export function loadLocalConfig(): RiskConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return DEFAULT_RISK_CONFIG;
    return { ...DEFAULT_RISK_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_RISK_CONFIG;
  }
}

export function saveLocalConfig(cfg: RiskConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export function loadLocalAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalAuditLogs(logs: AuditLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(logs.slice(0, 300)));
  } catch {
    // ignore
  }
}

export function loadLocalRoomUpdates(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROOM_UPDATES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalRoomUpdates(updates: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ROOM_UPDATES, JSON.stringify(updates));
  } catch {
    // ignore
  }
}

export function loadLocalStaff(): TeacherStaff[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STAFF);
    if (!raw) return DEFAULT_STAFF;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STAFF;
  } catch {
    return DEFAULT_STAFF;
  }
}

export function saveLocalStaff(staff: TeacherStaff[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
  } catch {
    // ignore
  }
}

export function loadLocalSchoolProfile(): SchoolProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHOOL);
    if (!raw) return DEFAULT_SCHOOL_PROFILE;
    return { ...DEFAULT_SCHOOL_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SCHOOL_PROFILE;
  }
}

export function saveLocalSchoolProfile(profile: SchoolProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHOOL, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function loadEthicsAccepted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.ETHICS) === 'true';
  } catch {
    return false;
  }
}

export function saveEthicsAccepted(accepted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ETHICS, accepted ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function compressImageFile(file: File, maxWidth = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function initLineLiff(): Promise<{ ready: boolean; isInClient: boolean; displayName?: string }> {
  const liffId = import.meta.env.VITE_LINE_LIFF_ID;
  if (!liffId) return { ready: false, isInClient: false };
  try {
    const liff = (await import('@line/liff')).default;
    await liff.init({ liffId });
    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      return { ready: true, isInClient: liff.isInClient(), displayName: profile.displayName };
    }
    return { ready: true, isInClient: liff.isInClient() };
  } catch {
    return { ready: false, isInClient: false };
  }
}
