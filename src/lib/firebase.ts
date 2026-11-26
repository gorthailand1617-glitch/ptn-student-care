import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, writeBatch } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { RiskConfig, SchoolProfile, Student, TeacherStaff } from '../types';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

/**
 * Automatically falls back to Demo Mode (localStorage) when VITE_FIREBASE_* env vars are not configured.
 */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export const firebaseApp: FirebaseApp | null = app;
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

/**
 * 1-Click Seed: Uploads all students (18 rooms), staff (20 real advisors), school profile,
 * and risk config to Cloud Firestore using batched writes (max 400 ops per batch).
 */
export async function seedAllDataToFirestore(
  students: Student[],
  staff: TeacherStaff[],
  school: SchoolProfile,
  config: RiskConfig
): Promise<{ studentsCount: number; staffCount: number }> {
  if (!db) {
    throw new Error('Firebase ยังไม่พร้อมใช้งาน กรุณาตรวจสอบไฟล์ .env.local');
  }

  // 1. Seed school profile, risk config, and staff
  const metaBatch = writeBatch(db);
  metaBatch.set(doc(db, 'schoolProfile', 'main'), school, { merge: true });
  metaBatch.set(doc(db, 'settings', 'riskConfig'), config, { merge: true });
  staff.forEach((st) => {
    metaBatch.set(doc(db!, 'staff', st.id), st, { merge: true });
  });
  await metaBatch.commit();

  // 2. Seed students in chunks of 400
  const CHUNK_SIZE = 400;
  for (let i = 0; i < students.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const slice = students.slice(i, i + CHUNK_SIZE);
    slice.forEach((s) => {
      const { screening7, screening9S, asks, ...publicAcademicData } = s;
      batch.set(doc(db!, 'students', s.code), publicAcademicData, { merge: true });
      batch.set(
        doc(db!, 'students', s.code, 'sensitive', 'pdpa'),
        { screening7, screening9S, asks },
        { merge: true }
      );
    });
    await batch.commit();
  }

  return { studentsCount: students.length, staffCount: staff.length };
}
