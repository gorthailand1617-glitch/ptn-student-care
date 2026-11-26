import React, { useState } from 'react';
import { Lock, Mail, LogIn, X, ShieldCheck } from 'lucide-react';
import { Role, TeacherStaff } from '../types';
import { isFirebaseConfigured } from '../services/dataService';
import { AuthSession, loginWithEmail, loginWithGoogle } from '../services/authService';

interface Props {
  open: boolean;
  staff: TeacherStaff[];
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

export const LoginModal: React.FC<Props> = ({ open, staff, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await loginWithEmail(email, password, staff);
      onSuccess(session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const session = await loginWithGoogle(staff);
      onSuccess(session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRole = (role: Role, label: string) => {
    onSuccess({ mode: 'demo', displayName: label, role });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#ECF3F7] p-6 shadow-2xl border border-white space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#4A7C82]" /> เข้าสู่ระบบ PTN-Student-Care
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              รองรับ Firebase Auth / Google Workspace โรงเรียน และ Demo Mode
            </p>
          </div>
          <button onClick={onClose} className="clay-btn-soft p-1.5 text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-2.5">
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมลโรงเรียน (เช่น teacher1@ptn.ac.th)"
              className="clay-input w-full pl-10 pr-3 py-2.5 text-sm"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              className="clay-input w-full pl-10 pr-3 py-2.5 text-sm"
            />
          </div>
          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="clay-btn-primary w-full py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" /> {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วยอีเมล'}
          </button>
        </form>

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="clay-btn-soft w-full py-2.5 text-xs font-bold text-[#2B3E50]"
        >
          เข้าสู่ระบบด้วย Google Workspace (@ptn.ac.th) {!isFirebaseConfigured && '· ต้องตั้งค่า .env'}
        </button>

        <div className="pt-3 border-t border-slate-300/60 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase">เข้าใช้งานทันทีแบบ Demo Mode:</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => handleDemoRole('admin', 'ผอ.สิริลักษณ์ พรสุวรรณ์')} className="clay-btn-soft py-1.5 text-xs font-semibold">ผู้บริหาร</button>
            <button onClick={() => handleDemoRole('teacher', 'ครูที่ปรึกษา')} className="clay-btn-soft py-1.5 text-xs font-semibold">ครูที่ปรึกษา</button>
            <button onClick={() => handleDemoRole('student', 'นักเรียน')} className="clay-btn-soft py-1.5 text-xs font-semibold">นักเรียน</button>
            <button onClick={() => handleDemoRole('parent', 'ผู้ปกครอง')} className="clay-btn-soft py-1.5 text-xs font-semibold">ผู้ปกครอง</button>
          </div>
        </div>
      </div>
    </div>
  );
};
