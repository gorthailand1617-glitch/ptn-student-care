import React, { useEffect, useState } from 'react';
import { BookOpen, X, CheckCircle2, ShieldCheck, Info } from 'lucide-react';
import { Role } from '../types';

interface Props {
  open: boolean;
  currentRole: Role;
  onClose: () => void;
}

interface GuideSection {
  title: string;
  steps: string[];
  tip?: string;
}

const ROLE_NAMES: Record<Role, string> = {
  sysadmin: 'แอดมินระบบ',
  admin: 'ผู้บริหาร',
  teacher: 'ครูที่ปรึกษา / แนะแนว',
  student: 'นักเรียน',
  parent: 'ผู้ปกครอง',
};

const GUIDES: Record<Role, { intro: string; sections: GuideSection[] }> = {
  sysadmin: {
    intro: 'คู่มือสำหรับผู้ดูแลระบบ (System Admin) เพื่อตั้งค่าโครงสร้างโรงเรียน จัดการบัญชีผู้ใช้ทุกประเภท และสำรองข้อมูล',
    sections: [
      {
        title: '1. จัดการผู้ใช้งานทุกคน (เพิ่ม / เปิด-ปิด / ลบ)',
        steps: [
          'ไปที่เมนู “จัดการครู/เคส” เพื่อเพิ่มบัญชี แอดมินระบบ, ผู้บริหาร, ครูประจำชั้น (ผูกได้หลายห้อง), ครูแนะแนว และครูผู้ดูแลเคส',
          'ส่วนด้านล่างสามารถเพิ่มบัญชีนักเรียนใหม่ หรือค้นหาเพื่อลบนักเรียนออกจากระบบได้ (ระบบจะถามยืนยันและบันทึก Audit Log ทุกครั้ง)',
        ],
      },
      {
        title: '2. ตั้งค่าข้อมูลโรงเรียน ปีการศึกษา และ LINE LIFF',
        steps: [
          'ไปที่เมนู “ข้อมูลโรงเรียน” เพื่อแก้ไขชื่อโรงเรียน, สังกัด, ปีการศึกษา/ภาคเรียน, ชื่อผู้อำนวยการ (แสดงบนหัว/ลายเซ็นรายงาน PDF) และ LINE LIFF ID',
        ],
      },
      {
        title: '3. สำรองข้อมูล / Cohort Snapshot / Seed ขึ้น Firestore',
        steps: [
          'ไปที่เมนู “สำรองข้อมูล” เพื่อกดบันทึก Snapshot รายภาคเรียน (เก็บประวัติ Longitudinal ข้ามปี)',
          'กด “Seed ข้อมูลนักเรียนและครูขึ้น Firestore” เพื่อนำเข้าข้อมูลขึ้น Cloud Firestore จริงในคลิกเดียว หรือดาวน์โหลด/กู้คืนไฟล์ JSON Backup',
        ],
      },
    ],
  },
  admin: {
    intro: 'คู่มือสำหรับผู้บริหารสถานศึกษา เพื่อติดตามภาพรวมความพร้อมจบการศึกษา อนุมัติแผน และออกรายงานราชการ',
    sections: [
      {
        title: '1. ดูภาพรวม & เจาะลึกรายบุคคล (Drill-down & Care Timeline)',
        steps: [
          'แตะการ์ด KPI สีสดด้านบน (ปกติ / เฝ้าระวัง / เสี่ยงสูง) หรือคลิกที่แต่ละแถวใน “สาเหตุที่พบบ่อย” เพื่อดูรายชื่อนักเรียนกลุ่มนั้น',
          'คลิกที่ชื่อนักเรียนหรือกดปุ่มจุด 3 จุด (…) → “ดูประวัติการช่วยเหลือ” เพื่อเปิดไทม์ไลน์ (ใคร / อะไร / ยังไง) และกดส่งออก “รายงานรายบุคคล (PDF)” ได้ทันที',
        ],
        tip: 'ตามมาตรฐาน PDPA ผู้บริหารจะไม่เห็นเนื้อหาอ่อนไหว (ข้อความลับของเด็ก / 9S) แต่จะเห็นแถบแจ้งว่ามีครูผู้รับผิดชอบดูแลอยู่แล้ว',
      },
      {
        title: '2. อนุมัติแผนเทียบโอน (ข้อ 5) และส่งต่อ สกร./อาชีวะ (ข้อ 6)',
        steps: [
          'ไปที่เมนู “อนุมัติ” (หรือกดอนุมัติจากหน้าต่างรายบุคคล) เพื่อตรวจสอบคำร้องและกด “อนุมัติ” หรือ “ส่งกลับแก้ไข”',
        ],
      },
      {
        title: '3. การตั้งเกณฑ์ Early Warning & ส่งออกรายงาน',
        steps: [
          'เมนู “ตั้งค่า”: เกณฑ์เวลาเรียนขั้นต่ำ (80%), คะแนนเริ่มเหลือง (2), คะแนนเริ่มแดง (5), น้ำหนักทุนเสมอภาค (แนะนำคงที่ 0 เพื่อไม่ตีตรา) และน้ำหนักช่วงรอยต่อชั้น ม.1/ม.4 (1)',
          'เมนู “ความคืบหน้า”: ตรวจความสดของข้อมูลรายห้อง (>7 วัน), ความครบถ้วนของรูปถ่าย, ออกรายงานราชการ PDF, Excel (.xlsx) และชุดข้อมูลวิจัย Anonymized CSV',
          'เมนู “โอนย้ายครู”: โอนย้ายครูที่ปรึกษาทั้งห้องหรือรายบุคคลได้ในคลิกเดียวโดยประวัติเดิมไม่หาย',
        ],
      },
    ],
  },
  teacher: {
    intro: 'คู่มือสำหรับครูที่ปรึกษา ครูแนะแนว และครูผู้ดูแลเคส เพื่อติดตามนักเรียน วางแผนช่วยเหลือ และลงพื้นที่เยี่ยมบ้าน',
    sections: [
      {
        title: '1. เลือกห้องที่ปรึกษา & จัดการรายชื่อนักเรียน',
        steps: [
          'เลือกชื่อครูที่แถบ “มุมมองครูผู้ใช้งาน (Room Scoping)” เพื่อแสดงเฉพาะห้องที่ปรึกษาหรือเคสที่รับผิดชอบ',
          'ติ๊กเลือกนักเรียนหลายคนแล้วกด “ใส่แผนพร้อมกัน (Bulk)” หรือกดปุ่มจุด 3 จุด (…) ท้ายแถวเพื่อเข้าทางลัด ดูรายละเอียด / กำหนดแผน / เยี่ยมบ้าน / แจ้ง LINE',
        ],
      },
      {
        title: '2. หน้าข้อมูลนักเรียนรายบุคคล (4 Tabs + Handover Brief)',
        steps: [
          'แท็บเกณฑ์การจบ: ดูเกณฑ์ 5 ข้อ, การ์ด Handover Brief (รูปคู่นักเรียน-ผู้ปกครอง, โทรออกทันที, บันทึกฝากถึงครูคนใหม่), ตอบกลับข้อความลับนักเรียน และแจ้งเตือนผิด/เตือนพลาด',
          'แท็บคัดกรอง 7 ด้าน: กดกางแต่ละด้าน (Accordion) เพื่อประเมินและบันทึก 9S (ข้อมูลอ่อนไหว)',
          'แท็บแผนช่วยเหลือ: เลือกจาก 8 เส้นทาง (⭐ = ระบบแนะนำอัตโนมัติ), ส่งต่อเคสให้ครูแนะแนว และแจ้งผู้ปกครองทาง LINE',
          'แท็บเยี่ยมบ้าน: บันทึกสถานะพบตัว/ไม่พบตัว, ดึงพิกัด GPS, แนบรูปถ่ายเยี่ยมบ้าน และเปิดนำทาง Google Maps',
        ],
      },
      {
        title: '3. นำเข้าข้อมูล Excel / SGS / รูปถ่ายแบบกลุ่ม & แผนที่กลุ่มเสี่ยง',
        steps: [
          'เมนู “นำเข้าข้อมูล”: อัปโหลดไฟล์ Excel รายชื่อ 18 ห้องได้โดยตรง (Upsert ไม่ลบแผนเดิม), ดาวน์โหลดเทมเพลต 12 คอลัมน์ (SGS/ปพ.5) และอัปโหลดรูปนักเรียนหลายไฟล์พร้อมกัน (ตั้งชื่อไฟล์เป็นเลขประจำตัว เช่น 3649.jpg)',
          'เมนู “แผนที่กลุ่มเสี่ยง”: ดูพิกัดบ้านนักเรียนบนแผนที่และกดนำทาง Google Maps เพื่อวางแผนเยี่ยมบ้านในวันเดียวกัน',
        ],
      },
    ],
  },
  student: {
    intro: 'คู่มือสำหรับนักเรียน เพื่อติดตามความพร้อมจบของตัวเอง ทำก้าวต่อไปรายสัปดาห์ และขอความช่วยเหลือจากครูอย่างปลอดภัย',
    sections: [
      {
        title: '1. เข้าดูข้อมูลและถ่ายภาพยืนยันตัวตน',
        steps: [
          'กรอก “เลขประจำตัวนักเรียน” ในช่องด้านบนแล้วกด “เปิดดูข้อมูลของฉัน”',
          'เมื่อเข้าใช้งานครั้งแรก ระบบจะชวนถ่ายภาพยืนยันตัวตน (สามารถเลือกจากคลังภาพหรือกดข้ามไปก่อนได้)',
        ],
      },
      {
        title: '2. ติดตามความก้าวหน้า & ก้าวต่อไปสัปดาห์นี้ (Carousel 3 สไลด์)',
        steps: [
          'กดลูกศรซ้าย-ขวาบนการ์ดด้านบนเพื่อดู 1) วงแหวนความพร้อมจบ 5 ข้อและหน่วยกิต, 2) เช็กลิสต์ก้าวต่อไปสัปดาห์นี้ (ติ๊กแล้วซิงก์ถึงครูทันที), 3) ตราความสำเร็จที่สะสมได้',
          'ดูรายวิชาที่รอส่งงานเพิ่มเติมด้านล่างเพื่อวางแผนเก็บงานทีละวิชา',
        ],
      },
      {
        title: '3. ส่งข้อความขอความช่วยเหลือ (เป็นความลับตาม PDPA)',
        steps: [
          'เลือกหัวข้อและเลือกได้ว่าให้ใครอ่าน (“เฉพาะครูที่ปรึกษาของฉัน” หรือ “ครูที่ปรึกษาและครูแนะแนว”)',
          'เมื่อครูตอบกลับ ข้อความจะแสดงในกล่องแชทด้านล่างทันที โดยผู้บริหารและครูท่านอื่นจะไม่เห็นเนื้อหา',
        ],
      },
    ],
  },
  parent: {
    intro: 'คู่มือสำหรับผู้ปกครอง เพื่อยืนยันตัวตนอย่างปลอดภัย อ่านความก้าวหน้าการเรียนของบุตรหลาน และประสานงานกับครู',
    sections: [
      {
        title: '1. ยืนยันตัวตนและขอความยินยอม PDPA',
        steps: [
          'กรอก “เลขประจำตัวนักเรียน” และ “เลขท้าย 4 ตัวของเบอร์โทรที่ลงทะเบียน” เพื่อเปิดอ่านข้อความ',
          'ระบบเปิดโหมดตัวอักษรใหญ่ให้อัตโนมัติ (ปรับเปิด-ปิดได้ที่สวิตช์ด้านบน) และให้เลือกยินยอมรับข่าวสารทาง LINE หรือเลือกช่องทางอื่นที่สะดวกกว่า (โทรศัพท์ / เอกสาร / เยี่ยมบ้าน)',
        ],
      },
      {
        title: '2. สลับดูบุตรหลานหลายคน & กดรับทราบแผน',
        steps: [
          'หากมีบุตรหลานเรียนอยู่ที่โรงเรียนหลายคน สามารถกดปุ่มสลับชื่อด้านบนได้ในหน้าเดียว',
          'กดปุ่ม “รับทราบและยินยอมแผนช่วยเหลือ”, กด “ขอคุยกับครู (ติดต่อกลับภายใน 2 วันทำการ)” หรือพิมพ์ข้อความตอบกลับครูที่ปรึกษาได้ทันที',
        ],
        tip: 'ข้อความแจ้งเตือนบน LINE จะซ่อนรายละเอียดบนหน้าจอล็อกเสมอ เพื่อความเป็นส่วนตัวของบุตรหลาน',
      },
    ],
  },
};

export const UserGuideModal: React.FC<Props> = ({ open, currentRole, onClose }) => {
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole);

  useEffect(() => {
    if (open) setSelectedRole(currentRole);
  }, [open, currentRole]);

  if (!open) return null;

  const guide = GUIDES[selectedRole];

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col clay-card overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/15 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#22D3EE]" /> คู่มือการใช้งาน PTN-Student-Care
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกดูขั้นตอนการใช้งานอย่างละเอียดแยกตามบทบาทผู้ใช้
            </p>
          </div>
          <button onClick={onClose} className="clay-btn-soft p-2" aria-label="ปิดคู่มือ">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="px-5 pt-3 pb-2 flex flex-wrap gap-1.5 border-b border-white/10">
          {(Object.keys(ROLE_NAMES) as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                selectedRole === r ? 'clay-btn-primary' : 'clay-btn-soft'
              }`}
            >
              {ROLE_NAMES[r]}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          <div className="clay-card-light p-3.5 text-xs leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-[#22D3EE] shrink-0 mt-0.5" />
            <span>{guide.intro}</span>
          </div>

          {guide.sections.map((sec) => (
            <div key={sec.title} className="clay-card-light p-4 space-y-2.5">
              <h3 className="font-bold text-sm text-[#2B3E50]">{sec.title}</h3>
              <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                {sec.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7C82] shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
              {sec.tip && (
                <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 px-3 py-2 text-[11px] flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{sec.tip}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/15 flex items-center justify-between text-xs">
          <span className="text-slate-500">PTN-Student-Care · Dev By Kru.gorthailand</span>
          <button onClick={onClose} className="clay-btn-primary px-5 py-1.5 font-bold text-xs">
            เข้าใจแล้ว / ปิดคู่มือ
          </button>
        </div>
      </div>
    </div>
  );
};
