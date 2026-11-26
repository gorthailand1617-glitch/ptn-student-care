import React from 'react';
import { ShieldCheck, HeartHandshake } from 'lucide-react';

interface Props {
  onAccept: () => void;
}

export const EthicsProtocolModal: React.FC<Props> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-[#ECF3F7] p-6 shadow-2xl border border-white space-y-4">
        <div className="flex items-center gap-3 text-[#2B3E50]">
          <div className="w-11 h-11 rounded-2xl bg-[#92C2C2]/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#4A7C82]" />
          </div>
          <div>
            <h2 className="text-lg font-bold">ข้อตกลงจริยธรรมการใช้ข้อมูล (Teacher Ethics Protocol)</h2>
            <p className="text-xs text-slate-600">มาตรฐาน OBEC CARE & PDPA โรงเรียนเปรมติณสูลานนท์</p>
          </div>
        </div>

        <ul className="text-sm text-slate-700 space-y-2.5 list-disc pl-5 leading-relaxed">
          <li>
            <b>เพื่อช่วยเหลือ ไม่ใช่ตัดสินหรือตีตรา:</b> สัญญาณ Early Warning ใช้เพื่อวางแผนดูแลช่วยเหลือเชิงบวก ห้ามนำไปใช้ประจานหรือกล่าวโทษนักเรียน
          </li>
          <li>
            <b>ความลับข้อมูลอ่อนไหว (PDPA):</b> ผลการคัดกรอง 7 ด้าน, 9S และข้อความขอความช่วยเหลือของนักเรียน เป็นความลับเฉพาะครูที่ปรึกษาและครูแนะแนว/ผู้ดูแลเคส ห้ามแคปหน้าจอหรือเผยแพร่ในกลุ่มแชทสาธารณะ
          </li>
          <li>
            <b>บันทึกการเข้าถึงอัตโนมัติ:</b> การเปิดดูและแก้ไขข้อมูลนักเรียนจะถูกบันทึกใน Audit Log เพื่อความโปร่งใส
          </li>
        </ul>

        <button
          onClick={onAccept}
          className="clay-btn-primary w-full py-3 text-sm font-bold inline-flex items-center justify-center gap-2"
        >
          <HeartHandshake className="w-4 h-4" /> รับทราบและปฏิบัติตามหลักจริยธรรม
        </button>
      </div>
    </div>
  );
};
