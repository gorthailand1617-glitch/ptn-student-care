import React, { useState } from 'react';
import { CheckCircle2, Lock, MessageCircle, PhoneCall, ShieldCheck } from 'lucide-react';
import { RiskConfig, Student } from '../types';
import { getGraduationCriteria, getRiskReasons, PATHWAYS_LONG, PATHWAYS_SHORT } from '../utils/riskEngine';

interface Props {
  student: Student;
  childrenList: Student[];
  onSwitchChild: (code: string) => void;
  config: RiskConfig;
  onUpdate: (updated: Student, auditAction?: string) => void;
}

export const ParentView: React.FC<Props> = ({
  student,
  childrenList,
  onSwitchChild,
  config,
  onUpdate,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [tel4Input, setTel4Input] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [callRequested, setCallRequested] = useState(false);
  const [replySent, setReplySent] = useState(false);

  const { passedCount } = getGraduationCriteria(student, config);
  const reasons = getRiskReasons(student, config).slice(0, 2);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim() === student.code && tel4Input.trim() === student.tel4) {
      setVerifyError('');
      onUpdate({ ...student, parentVerified: true }, `ผู้ปกครองยืนยันตัวตนสำเร็จ (${student.code})`);
    } else {
      setVerifyError('ข้อมูลไม่ตรงกับที่ลงทะเบียน กรุณาลองอีกครั้ง');
    }
  };

  // Step 1: Verification Gate
  if (!student.parentVerified) {
    return (
      <div className="max-w-xl mx-auto clay-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#2B3E50]">
          <Lock className="w-6 h-6 text-[#4A7C82]" />
          <h2 className="text-xl font-bold">ยืนยันตัวตนผู้ปกครอง</h2>
        </div>
        <p className="text-slate-700">
          เพื่อความปลอดภัยของข้อมูลนักเรียน กรุณายืนยันตัวตนก่อนเปิดอ่านข้อความจากโรงเรียนเปรมติณสูลานนท์
        </p>
        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-[#2B3E50] mb-1">เลขประจำตัวนักเรียน</label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder={`เช่น ${student.code}`}
              className="clay-input w-full px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#2B3E50] mb-1">เลขท้าย 4 ตัวของเบอร์โทรที่ลงทะเบียน</label>
            <input
              type="text"
              maxLength={4}
              value={tel4Input}
              onChange={(e) => setTel4Input(e.target.value)}
              placeholder={`เช่น ${student.tel4}`}
              className="clay-input w-full px-4 py-3"
            />
          </div>
          {verifyError && <p className="text-sm text-rose-600 font-semibold">{verifyError}</p>}
          <button type="submit" className="clay-btn-primary w-full py-3 font-bold">
            ยืนยันตัวตนเพื่อเปิดอ่าน
          </button>
        </form>
        <p className="text-xs text-slate-500">
          ตัวอย่างสำหรับทดสอบ Demo: รหัสนักเรียน <b>{student.code}</b> · เลขท้าย 4 ตัว <b>{student.tel4}</b>
        </p>
      </div>
    );
  }

  // Step 2: PDPA Consent for LINE
  if (!student.parentConsent) {
    return (
      <div className="max-w-xl mx-auto clay-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#2B3E50]">
          <ShieldCheck className="w-6 h-6 text-[#4A7C82]" />
          <h2 className="text-xl font-bold">ขอความยินยอมรับข่าวสารผ่าน LINE (PDPA)</h2>
        </div>
        <div className="rounded-2xl bg-[#D8F3DC] text-[#1B4332] p-4 leading-relaxed">
          <b>โรงเรียนเปรมติณสูลานนท์ อบจ.ขอนแก่น</b>
          <br />
          โรงเรียนขออนุญาตส่งข่าวความก้าวหน้าการเรียนของ <b>{student.name}</b> ({student.room}) ผ่าน LINE
          ข่าวมีเฉพาะเรื่องการเรียน ไม่มีข้อมูลสุขภาพหรือครอบครัว และจะซ่อนรายละเอียดบนหน้าจอล็อก
        </div>
        <button
          onClick={() =>
            onUpdate(
              { ...student, parentConsent: true, lineMessageState: 2 },
              `ผู้ปกครองยินยอมรับข่าวสารทาง LINE (${student.code})`
            )
          }
          className="clay-btn-line w-full py-3 font-bold inline-flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" /> ยินยอมให้ส่งข่าวทาง LINE
        </button>

        <div className="pt-2">
          <label className="block text-sm font-semibold text-[#2B3E50] mb-1">
            หรือเลือกช่องทางติดต่ออื่นที่สะดวกกว่า:
          </label>
          <select
            value={student.parentChannel || ''}
            onChange={(e) =>
              onUpdate(
                { ...student, parentChannel: e.target.value },
                `ผู้ปกครองเลือกช่องทางอื่น: ${e.target.value}`
              )
            }
            className="clay-input w-full px-4 py-3"
          >
            <option value="">-- เลือกช่องทางอื่น --</option>
            <option value="ขอให้โรงเรียนโทรศัพท์">ขอให้โรงเรียนโทรศัพท์</option>
            <option value="ขอเอกสารส่งผ่านนักเรียน">ขอเอกสารส่งผ่านนักเรียน</option>
            <option value="ขอให้ครูไปพบที่บ้าน">ขอให้ครูไปพบที่บ้าน</option>
          </select>
        </div>
      </div>
    );
  }

  // Step 3: Parent Progress & Support Plan Message
  return (
    <div className="max-w-xl mx-auto clay-card p-6 space-y-4">
      {childrenList.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-white/40">
          <span className="text-sm font-semibold text-[#2B3E50]">สลับดูบุตรหลาน:</span>
          {childrenList.map((ch) => (
            <button
              key={ch.code}
              onClick={() => onSwitchChild(ch.code)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${
                ch.code === student.code ? 'clay-btn-primary' : 'clay-btn-soft'
              }`}
            >
              {ch.name} ({ch.room})
            </button>
          ))}
        </div>
      )}

      <h2 className="text-xl font-bold text-[#2B3E50]">ข้อความความก้าวหน้าการเรียน</h2>

      <div className="rounded-2xl bg-[#D8F3DC] text-[#1B4332] p-5 space-y-3 leading-relaxed">
        <div className="font-bold">โรงเรียนเปรมติณสูลานนท์ อบจ.ขอนแก่น</div>
        <p>
          เรียนผู้ปกครองของ <b>{student.name}</b> ({student.room}) ขณะนี้ผ่านเกณฑ์ความพร้อมจบแล้ว{' '}
          <b>{passedCount} จาก 5 ข้อ</b>
          {reasons.length > 0 && ` เรื่องที่อยากชวนช่วยกันดูแล: ${reasons.join(' และ ')}`}
        </p>

        {student.plans.length > 0 ? (
          <div>
            <div className="font-bold mb-1">สิ่งที่โรงเรียนจะช่วยดำเนินการ:</div>
            <ul className="list-disc pl-5 space-y-1">
              {student.plans.map((p) => (
                <li key={p.id}>
                  <b>{PATHWAYS_SHORT[p.pathwayIndex]}</b> — {PATHWAYS_LONG[p.pathwayIndex]}
                  {p.approvalStatus === 'รออนุมัติ' ? ' (รอโรงเรียนอนุมัติ)' : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>ครูที่ปรึกษากำลังติดตามและดูแลอย่างใกล้ชิด หากมีแผนช่วยเหลือเพิ่มเติมจะแจ้งให้ทราบ</p>
        )}

        <p className="text-sm opacity-90 pt-1">
          <b>ที่บ้านช่วยได้:</b> ชวนคุยเรื่องเรียนวันละ 10 นาที และแจ้งครูเมื่อมีเหตุจำเป็นที่ทำให้มาเรียนไม่ได้
        </p>
      </div>

      {student.plans.length > 0 && (
        <button
          onClick={() =>
            onUpdate({ ...student, parentAckPlan: true }, `ผู้ปกครองกดรับทราบแผนของ ${student.name}`)
          }
          className="clay-btn-primary w-full py-3 font-bold inline-flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          {student.parentAckPlan ? 'รับทราบและยินยอมแผนแล้ว ✓' : 'รับทราบและยินยอมแผนช่วยเหลือ'}
        </button>
      )}

      <button
        onClick={() => {
          setCallRequested(true);
          onUpdate(
            {
              ...student,
              asks: [
                ...student.asks,
                {
                  id: `ask-${Date.now()}`,
                  category: 'ผู้ปกครอง',
                  text: 'ผู้ปกครองขอคุยกับครูที่ปรึกษา',
                  visibility: 'private',
                  createdAt: new Date().toISOString(),
                  fromParent: true,
                },
              ],
            },
            `ผู้ปกครองขอคุยกับครู (${student.code})`
          );
        }}
        className="clay-btn-soft w-full py-3 font-semibold inline-flex items-center justify-center gap-2"
      >
        <PhoneCall className="w-5 h-5 text-[#4A7C82]" />
        {callRequested ? 'แจ้งครูแล้ว ครูจะติดต่อกลับภายใน 2 วันทำการ ✓' : 'ขอคุยกับครู (ติดต่อกลับภายใน 2 วันทำการ)'}
      </button>

      <div className="space-y-2 pt-2">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={3}
          placeholder="พิมพ์ข้อความตอบกลับครูที่ปรึกษา..."
          className="clay-input w-full p-3.5"
        />
        <button
          onClick={() => {
            if (!replyText.trim()) return;
            setReplySent(true);
            onUpdate(
              {
                ...student,
                asks: [
                  ...student.asks,
                  {
                    id: `ask-${Date.now()}`,
                    category: 'ข้อความผู้ปกครอง',
                    text: replyText.trim(),
                    visibility: 'private',
                    createdAt: new Date().toISOString(),
                    fromParent: true,
                  },
                ],
              },
              `ผู้ปกครองส่งข้อความถึงครู (${student.code})`
            );
            setReplyText('');
          }}
          className="clay-btn-soft w-full py-2.5 font-semibold"
        >
          {replySent ? 'ส่งข้อความถึงครูแล้ว ✓' : 'ส่งข้อความถึงครู'}
        </button>
      </div>
    </div>
  );
};
