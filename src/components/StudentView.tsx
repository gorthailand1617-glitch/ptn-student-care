import React, { useState } from 'react';
import { Award, CheckCircle2, ChevronLeft, ChevronRight, HeartHandshake, Lock, Send, Sparkles } from 'lucide-react';
import { RiskConfig, Student } from '../types';
import { getGraduationCriteria, getWeeklyGoals, PATHWAYS_LONG, PATHWAYS_SHORT } from '../utils/riskEngine';

interface Props {
  student: Student;
  allStudents: Student[];
  onSwitchStudent: (code: string) => void;
  config: RiskConfig;
  onToggleGoal: (goalIdx: number, done: boolean) => void;
  onSendAsk: (category: string, text: string, visibility: 'private' | 'team') => void;
}

/**
 * Student Experience:
 * - Positive, encouraging Thai language ONLY.
 * - Never displays "เสี่ยง" or red warning colors.
 */
export const StudentView: React.FC<Props> = ({
  student,
  allStudents,
  onSwitchStudent,
  config,
  onToggleGoal,
  onSendAsk,
}) => {
  const [loginCode, setLoginCode] = useState(student.code);
  const [slideIdx, setSlideIdx] = useState(0);
  const [category, setCategory] = useState('เรื่องเรียน');
  const [visibility, setVisibility] = useState<'private' | 'team'>('private');
  const [askText, setAskText] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  const { criteria, passedCount } = getGraduationCriteria(student, config);
  const goals = getWeeklyGoals(student, config);
  const doneCount = goals.filter((_, i) => student.goalsDone[i]).length;
  const creditPct = Math.min(100, Math.round((student.creditsEarned / Math.max(1, student.creditsRequired)) * 100));

  const badges: string[] = [];
  if (student.attendancePct >= 90) badges.push('มาเรียนสม่ำเสมอ');
  if (student.activitiesPassed >= 3) badges.push('กิจกรรมครบ 3 ด้าน');
  if (passedCount === 5) badges.push('พร้อมจบทุกเกณฑ์');
  if (doneCount === goals.length && goals.length > 0) badges.push('ทำก้าวต่อไปครบสัปดาห์นี้');

  const handleSubmitAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askText.trim()) return;
    onSendAsk(category, askText.trim(), visibility);
    setAskText('');
    setSentNotice(true);
    setTimeout(() => setSentNotice(false), 3500);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Student Login / Switcher Bar */}
      <div className="clay-card-light p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[#2B3E50]">เข้าดูข้อมูลด้วยเลขประจำตัวนักเรียน:</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value)}
            placeholder="กรอกรหัสนักเรียน"
            className="clay-input px-3 py-1.5 text-xs w-36"
          />
          <button
            type="button"
            onClick={() => {
              const found = allStudents.find((s) => s.code === loginCode.trim());
              if (found) onSwitchStudent(found.code);
            }}
            className="clay-btn-primary px-3.5 py-1.5 text-xs font-semibold"
          >
            เปิดดูข้อมูลของฉัน
          </button>
        </div>
      </div>

      {/* Manual Carousel (3 Slides: Progress, Weekly Next Steps, Badges — No Auto-Play) */}
      <div className="clay-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#4A7C82]">
            {slideIdx === 0 ? '1/3 · สรุปความก้าวหน้า' : slideIdx === 1 ? '2/3 · ก้าวต่อไปสัปดาห์นี้' : '3/3 · ตราความสำเร็จของฉัน'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i === 0 ? 2 : i - 1))}
              className="clay-btn-soft p-1.5 text-[#2B3E50]"
              aria-label="สไลด์ก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i === 2 ? 0 : i + 1))}
              className="clay-btn-soft p-1.5 text-[#2B3E50]"
              aria-label="สไลด์ถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide 1: Progress Ring */}
        {slideIdx === 0 && (
          <div className="text-center py-2">
            <h2 className="text-xl font-bold text-[#2B3E50]">{student.name}</h2>
            <p className="text-xs text-slate-600 mb-4">{student.room} · รหัส {student.code}</p>
            <div
              className="w-36 h-36 rounded-full mx-auto flex items-center justify-center shadow-inner"
              style={{ background: `conic-gradient(#4A7C82 ${passedCount * 20}%, #D5E2EA 0)` }}
            >
              <div className="w-28 h-28 rounded-full bg-[#ECF3F7] flex flex-col items-center justify-center shadow-sm">
                <span className="text-3xl font-bold text-[#2B3E50]">{passedCount}/5</span>
                <span className="text-xs text-slate-600">ข้อที่ผ่านแล้ว</span>
              </div>
            </div>
            <p className="text-sm font-medium text-[#2B3E50] mt-4">
              {passedCount === 5
                ? 'เยี่ยมมาก! เธอผ่านเกณฑ์ปัจจุบันครบทุกข้อแล้ว รักษาจังหวะนี้ไว้ได้เลย'
                : `เหลืออีกเพียง ${5 - passedCount} ข้อ ค่อยๆ ทำไปทีละก้าว ครูและเพื่อนพร้อมช่วยเสมอ`}
            </p>
            <div className="mt-4 max-w-sm mx-auto text-left">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>หน่วยกิตสะสม</span>
                <span className="font-bold text-[#2B3E50]">{student.creditsEarned} / {student.creditsRequired}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-300/80 overflow-hidden">
                <div className="h-full rounded-full bg-[#4A7C82]" style={{ width: `${creditPct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Slide 2: Weekly Next Steps */}
        {slideIdx === 1 && (
          <div className="py-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#2B3E50] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4A7C82]" /> ก้าวต่อไปสัปดาห์นี้
              </h3>
              <span className="text-xs font-bold text-[#4A7C82]">{doneCount}/{goals.length} ข้อ</span>
            </div>
            <div className="space-y-2">
              {goals.map((g, i) => (
                <label key={i} className="clay-card-light p-3 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(student.goalsDone[i])}
                    onChange={(e) => onToggleGoal(i, e.target.checked)}
                    className="w-5 h-5 accent-[#4A7C82]"
                  />
                  <span className={`text-sm ${student.goalsDone[i] ? 'line-through text-slate-500' : 'text-[#2B3E50] font-medium'}`}>
                    {g}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">ครูที่ปรึกษาจะเห็นความก้าวหน้าข้อที่เธอติ๊ก เพื่อชื่นชมและช่วยวางแผนต่อให้</p>
          </div>
        )}

        {/* Slide 3: Achievement Badges */}
        {slideIdx === 2 && (
          <div className="py-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#92C2C2]/40 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8 text-[#4A7C82]" />
            </div>
            <h3 className="font-bold text-[#2B3E50]">ตราความสำเร็จที่สะสมได้ ({badges.length})</h3>
            {badges.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {badges.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#92C2C2]/45 text-[#2B3E50]">
                    <Award className="w-3.5 h-3.5 text-[#4A7C82]" /> {b}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600">ลองติ๊กทำ “ก้าวต่อไปสัปดาห์นี้” เพื่อปลดล็อกตราความสำเร็จแรกกันเลย!</p>
            )}
          </div>
        )}

        {/* Carousel Dot Indicators */}
        <div className="flex justify-center gap-2 pt-1">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlideIdx(i)}
              aria-label={`สไลด์ ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                slideIdx === i ? 'w-6 bg-[#4A7C82]' : 'w-2 bg-slate-400/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 5 Graduation Criteria (Friendly Tone) */}
      <div className="clay-card p-5">
        <h3 className="font-bold text-[#2B3E50] mb-3">เช็กลิสต์ความพร้อมจบ (5 ข้อ)</h3>
        <div className="space-y-2">
          {criteria.map((c, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/40 last:border-0">
              <span className="text-slate-700">{c.label}</span>
              {c.passed ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> ผ่านแล้ว
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#4A7C82]">กำลังดำเนินการ</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subject-Level Owed Work Tracker (Positive Tone) */}
      {student.owedSubjectDetails && student.owedSubjectDetails.length > 0 && (
        <div className="clay-card p-5">
          <h3 className="font-bold text-[#2B3E50] mb-3">รายวิชาที่รอส่งงานเพิ่มเติม (ค่อยๆ เก็บทีละวิชาได้)</h3>
          <div className="space-y-2">
            {student.owedSubjectDetails.map((subj, idx) => (
              <div key={idx} className="clay-card-light p-3.5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-[#2B3E50]">
                    {subj.subjectCode} {subj.subjectName}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">สิ่งที่ต้องส่ง: {subj.missingTask}</div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#92C2C2]/40 text-[#2B3E50] shrink-0">
                  สถานะ: {subj.grade}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Support Plans */}
      {student.plans.length > 0 && (
        <div className="clay-card p-5">
          <h3 className="font-bold text-[#2B3E50] mb-3 flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-[#4A7C82]" /> แผนที่ครูกับฉันเลือกไว้ด้วยกัน
          </h3>
          <div className="space-y-2">
            {student.plans.map((p) => (
              <div key={p.id} className="clay-card-light p-3.5">
                <div className="font-bold text-sm text-[#2B3E50]">{PATHWAYS_SHORT[p.pathwayIndex]}</div>
                <div className="text-xs text-slate-600 mt-0.5">{PATHWAYS_LONG[p.pathwayIndex]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Private Help Request Box */}
      <form onSubmit={handleSubmitAsk} className="clay-card p-5 space-y-3">
        <h3 className="font-bold text-[#2B3E50] flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#4A7C82]" /> อยากให้ครูช่วยเรื่องอะไร บอกได้เลย
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="clay-input px-3 py-2 text-sm">
            <option>เรื่องเรียน</option>
            <option>เรื่องที่บ้านหรือการเดินทาง</option>
            <option>เรื่องเงินหรือทุนการศึกษา</option>
            <option>เรื่องอื่นๆ ที่อยากปรึกษา</option>
          </select>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'private' | 'team')}
            className="clay-input px-3 py-2 text-sm"
          >
            <option value="private">เฉพาะครูที่ปรึกษาของฉัน</option>
            <option value="team">ครูที่ปรึกษาและครูแนะแนว</option>
          </select>
        </div>
        <textarea
          value={askText}
          onChange={(e) => setAskText(e.target.value)}
          rows={3}
          placeholder="เล่าสั้นๆ ก็ได้นะ..."
          className="clay-input w-full p-3 text-sm"
        />
        <button type="submit" className="clay-btn-primary w-full py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2">
          <Send className="w-4 h-4" /> ส่งข้อความให้ครู
        </button>
        {sentNotice && (
          <p className="text-xs text-emerald-700 font-semibold text-center">
            ส่งข้อความเรียบร้อยแล้ว ✓ ครูที่ปรึกษาจะดูแลเรื่องนี้เป็นความลับให้เธอ
          </p>
        )}
        <p className="text-xs text-slate-500">
          * ข้อมูลนี้เป็นความลับตาม PDPA ผู้บริหารและครูท่านอื่นจะไม่เห็นเนื้อหาที่เธอเล่า
        </p>

        {/* 2-Way Private Chat History */}
        {student.asks.filter((a) => !a.fromParent).length > 0 && (
          <div className="pt-3 border-t border-white/40 space-y-2">
            <div className="text-xs font-bold text-[#2B3E50]">ข้อความที่คุยกับครู (เป็นความลับ)</div>
            {student.asks
              .filter((a) => !a.fromParent)
              .map((a) => (
                <div key={a.id} className="clay-card-light p-3 text-xs space-y-1.5">
                  <div className="text-slate-700">
                    <b>ฉัน ({a.category}):</b> {a.text}
                  </div>
                  {a.teacherReply ? (
                    <div className="bg-[#E6F3F3] text-[#2B3E50] rounded-lg px-2.5 py-1.5">
                      <b>ครูตอบกลับ:</b> {a.teacherReply}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">รอครูอ่านและตอบกลับ...</div>
                  )}
                </div>
              ))}
          </div>
        )}
      </form>
    </div>
  );
};
