import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './dataService';
import { Role, TeacherStaff } from '../types';

export interface AuthSession {
  mode: 'firebase' | 'demo';
  email?: string;
  displayName: string;
  role: Role;
  staffId?: string;
}

export function resolveRoleFromEmail(email: string, staff: TeacherStaff[]): { role: Role; staffId?: string } {
  const lower = email.toLowerCase();
  if (lower.startsWith('sysadmin@') || lower.startsWith('it@')) {
    return { role: 'sysadmin' };
  }
  if (lower.startsWith('director@') || lower.startsWith('admin@')) {
    return { role: 'admin' };
  }
  const matched = staff.find((s) => s.email.toLowerCase() === lower && s.active);
  if (matched) {
    return { role: 'teacher', staffId: matched.id };
  }
  return { role: 'teacher' };
}

export async function loginWithEmail(
  email: string,
  password: string,
  staff: TeacherStaff[]
): Promise<AuthSession> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('ยังไม่ได้ตั้งค่า Firebase Auth (.env) กรุณาใช้ Demo Mode');
  }
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const resolved = resolveRoleFromEmail(cred.user.email || email, staff);
  return {
    mode: 'firebase',
    email: cred.user.email || email,
    displayName: cred.user.displayName || email.split('@')[0],
    role: resolved.role,
    staffId: resolved.staffId,
  };
}

export async function loginWithGoogle(staff: TeacherStaff[]): Promise<AuthSession> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('ยังไม่ได้ตั้งค่า Firebase Auth (.env) กรุณาใช้ Demo Mode');
  }
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const user: User = cred.user;
  const resolved = resolveRoleFromEmail(user.email || '', staff);
  return {
    mode: 'firebase',
    email: user.email || undefined,
    displayName: user.displayName || user.email || 'ผู้ใช้งาน',
    role: resolved.role,
    staffId: resolved.staffId,
  };
}

export async function logoutFirebase(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
}
