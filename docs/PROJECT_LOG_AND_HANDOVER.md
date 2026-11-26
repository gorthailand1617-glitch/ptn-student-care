# บันทึกประวัติการพัฒนาและคู่มือพัฒนาต่อ (Project Log & Handover)
**โปรเจกต์:** PTN-Student-Care — ระบบดูแลช่วยเหลือและติดตามความพร้อมจบการศึกษา (PTN CARE · 1 โรงเรียน 3 รูปแบบ)  
**หน่วยงาน:** โรงเรียนเปรมติณสูลานนท์ องค์การบริหารส่วนจังหวัดขอนแก่น  
**ผู้พัฒนา:** `Dev By Kru.gorthailand`  
**อัปเดตล่าสุด:** 26 พฤศจิกายน 2569

---

## 1. ข้อมูลระบบออนไลน์และ Repository
- **Production URL (Vercel):** https://ptn-student-care.vercel.app
- **Vercel Project ID:** `prj_T0hmuQ97nNVZ91oC1h49Y3n8UwaB` (`gors-projects-fcf77064/ptn-student-care`)
- **GitHub Repository:** https://github.com/gorthailand1617-glitch/ptn-student-care.git (Branch: `main`)
- **Firebase Project ID:** `ptn-student-care`
- **Local Workspace:** `e:\--- Sand Box ---\PTN-Student-Care`
- **Environment Variables:** เก็บไว้ใน `.env.local` (ไม่ขึ้น GitHub) และตั้งค่า Encrypted บน Vercel ครบทั้ง 7 ตัว (`VITE_FIREBASE_*`) เรียบร้อยแล้ว

---

## 2. สรุปประวัติการพัฒนาทั้งหมด (Changelog v1.0 → v3.0)

### ระยะที่ 1: โครงสร้างหลัก & Soft 3D Claymorphism UI (v1.0)
- สร้างโปรเจกต์ **Vite + React + TypeScript + Tailwind CSS v4 + PWA (`vite-plugin-pwa`)**
- ออกแบบสไตล์ **Soft 3D Claymorphism / Tactile Neumorphism** โทน Slate-Blue (`#2B3E50` / `#BDCCD6`) พร้อม 4 Pastel KPI Cards, กราฟ 3D Bar Chart & Donut Chart, ฟอนต์ `IBM Plex Sans Thai`, และ Floating Pill Bottom Navigation บนมือถือ
- พัฒนา `src/utils/excelParser.ts` อ่านไฟล์จริง `รายชื่อ นร. ม.1-6 ปี 69 (11-5-69).xlsx` (ข้ามชีต `รวม`, แปลงชื่อห้อง `ม.1-1` → `ม.1/1`, Upsert ด้วยเลขประจำตัวนักเรียน) และแปลงเป็น Seed Data (`src/data/ptnRoster69.json` จำนวน 253 คน)
- พัฒนาตรรกะ `src/utils/riskEngine.ts` (5 เกณฑ์จบ, Early Warning ไฟจราจร, `ทุนเสมอภาค = 0` ไม่ตีตรา, Decision Support เส้นทางช่วยเหลือ 8 รูปแบบ, Wilson 95% CI เมื่อ $n \ge 30$)
- สร้างกฎความปลอดภัย `firestore.rules`, `storage.rules`, และโครงสร้าง LINE Cloud Function (`functions/lineWebhook.ts`)

### ระยะที่ 2: ยกระดับสู่ 10/10 ทุกบทบาท & เพิ่มแอดมินระบบ (v2.0)
- เพิ่มบทบาทที่ 5: **แอดมินระบบ (`sysadmin`)** (`src/components/SysAdminView.tsx`) สำหรับจัดการครูประจำชั้น/ครูแนะแนว/ครูผู้ดูแลเคส, ตั้งค่าข้อมูลโรงเรียน/ปีการศึกษา, สำรอง/กู้คืน JSON และสร้าง Longitudinal Cohort Snapshot ข้ามภาคเรียน
- เพิ่ม **รายงานราชการ PDF** (หัวโรงเรียน + ช่องลงนามผู้อำนวยการ), **Room Scoping**, **Case Handoff**, **ปุ่มดาวน์โหลดเทมเพลต Excel 12 คอลัมน์ (SGS/ปพ.5)**, **Multi-Child Switcher** สำหรับผู้ปกครอง, **แชทลับ 2 ทาง** สำหรับนักเรียน-ครู และ **Teacher Ethics Protocol Modal**

### ระยะที่ 3: UI/UX Interaction Upgrade (9 Standard Components)
- สร้าง `src/components/ui/ClayPrimitives.tsx` และติดตั้งครบทั้ง 9 Component: **Data Table + Pagination (15 แถว/หน้า)**, **Dropdown Menu (`...`)**, **Accordion** (คัดกรอง 7 ด้าน & 8 เส้นทาง), **Bottom Sheet + 4 Tabs**, **Confirm Dialog**, **Toast (3 วินาที)**, **Switch Toggle**, **Manual Carousel (3 สไลด์)**, และ **Skeleton Loading**

### ระยะที่ 4: Admin Individual Care Timeline, Seamless Handover & Photo Profiles
- **Admin Individual Care Timeline** (`src/components/AdminStudentTimelineSheet.tsx`): ผู้บริหารดูไทม์ไลน์การช่วยเหลือรายบุคคลแบบ **ใคร / อะไร / ยังไง**, กรองข้ามภาคเรียน (Cross-Semester Archive), ส่งออก PDF รายบุคคล และบังคับใช้ PDPA (ซ่อนข้อความลับ/9S + บันทึก `auditLogs`)
- **Seamless Handover & Risk Map** (`src/components/RiskMapView.tsx`): แผนที่รวมบ้านนักเรียนกลุ่มเสี่ยง (OpenStreetMap), ปุ่มนำทาง Google Maps (`dir/?api=1&destination=lat,lng`), การ์ด **Handover Brief** (บันทึกฝากถึงครูคนใหม่ + ปุ่มโทรด่วน `tel:`) และเมนู **โอนย้ายครูที่ปรึกษา (Bulk/Individual Reassignment)**
- **Student & Guardian Photo Profiles** (`src/components/FaceCaptureModal.tsx`, `src/utils/imageCompressor.ts`): WebRTC Face Capture พร้อมกรอบวงรี + PDPA Consent, บีบอัด 400×400 px WebP/JPEG, **Bulk Photo Upload** จับคู่ชื่อไฟล์กับรหัสนักเรียนอัตโนมัติ และ Avatar ในตาราง

### ระยะที่ 5: ข้อมูลจริงตามคำสั่งที่ 56/2569 & Production Launch (v3.0)
- นำเข้ารายชื่อครูที่ปรึกษาจริงทั้ง 18 ห้อง (รองรับครู 2 ท่านต่อห้อง) และชื่อผู้อำนวยการโรงเรียน **`นางสาวสิริลักษณ์ พรสุวรรณ์`** (`src/data/advisors.ts`)
- เพิ่ม **Firebase Auth / School SSO (`LoginModal.tsx`)**, **SGS / ปพ.5 5-Row Import Preview**, **Notification Bell**, **LINE LIFF Deep-Link (`?role=parent&code=...`)**, **Anonymized Research CSV Export**, และ **1-Click Firestore Seed**
- ปรับแก้ชื่อสังกัดเป็น **"องค์การบริหารส่วนจังหวัดขอนแก่น"**, เปลี่ยน **"OBEC CARE"** เป็น **"PTN CARE"**, เพิ่มตัวเลข + Legend บนกราฟวงกลม, และทำให้ **"สาเหตุที่พบบ่อย"** คลิกดูรายชื่อและเปิด Care Timeline ต่อได้ทันที
- Deploy ขึ้น **Vercel Production** สำเร็จเรียบร้อย

---

## 3. โครงสร้างไฟล์สำคัญในโปรเจกต์
| ไฟล์ / โฟลเดอร์ | หน้าที่หลัก |
| :--- | :--- |
| `src/App.tsx` | โครงสร้างหลัก 5 บทบาท (RBAC), Sidebar/Mobile Nav, Toast, Confirm Dialog, Deep-Link |
| `src/components/AdminView.tsx` | Dashboard ผู้บริหาร, กราฟ 3D, Drill-down, อนุมัติแผน, โอนย้ายครู, Export Excel/PDF/Research CSV |
| `src/components/AdminStudentTimelineSheet.tsx` | ไทม์ไลน์การช่วยเหลือรายบุคคล (ใคร/อะไร/ยังไง) + PDPA Shield + Export PDF รายบุคคล |
| `src/components/TeacherView.tsx` | Data Table + Pagination, Room Scoping, Bulk Action, นำเข้า Excel/SGS/Bulk Photo, Risk Map |
| `src/components/StudentDetailModal.tsx` | Bottom Sheet 4 Tabs, Handover Brief, รูปคู่นักเรียน-ผู้ปกครอง, Accordion, GPS & เยี่ยมบ้าน |
| `src/components/StudentView.tsx` | มุมมองนักเรียนเชิงบวก, Carousel 3 สไลด์, วิชาค้างละเอียด, แชทลับ 2 ทาง |
| `src/components/ParentView.tsx` | มุมมองผู้ปกครอง Big Text, ยืนยันตัวตน, PDPA Consent LINE, Multi-Child Switcher |
| `src/components/SysAdminView.tsx` | จัดการครู/ผู้ดูแลเคส, ตั้งค่าโรงเรียน, สำรอง/กู้คืน JSON, Seed ขึ้น Firestore |
| `src/data/advisors.ts` | รายชื่อผู้อำนวยการและครูที่ปรึกษาจริง 18 ห้อง (คำสั่งที่ 56/2569) |
| `src/lib/firebase.ts` | เชื่อมต่อ Firebase (`auth`, `db`, `storage`) + ฟังก์ชัน `seedAllDataToFirestore()` |
| `firestore.rules` / `storage.rules` | กฎความปลอดภัย PDPA ระดับ Database และ Storage |

---

## 4. แนวทางพัฒนาต่อในอนาคต (Future Roadmap)
1. **อัปโหลด Firebase Security Rules:** รัน `npx firebase-tools login` และ `npx firebase-tools deploy --only firestore:rules,storage` จากนั้นกดปุ่ม **Seed ขึ้น Firestore** ในหน้าแอดมินระบบ
2. **เชื่อมต่อ Firestore Real-time Sync เต็มรูปแบบ:** เปลี่ยน State หลักใน `App.tsx` ให้ Subscribe `onSnapshot` จาก Cloud Firestore เมื่ออยู่ในโหมด Live
3. **LINE OA & LIFF Production:** นำ `docs/line-rich-menu.json` ไปตั้งค่าบน LINE OA โรงเรียน และ Deploy `functions/lineWebhook.ts` บน Firebase Cloud Functions v2
4. **เชื่อมต่อระบบ SGS / ปพ.5 อัตโนมัติ:** เพิ่ม Preset จับคู่คอลัมน์เฉพาะของไฟล์ Export จากระบบงานทะเบียนวัดผลของโรงเรียน
5. **งานวิจัยเชิงประจักษ์ (Action Research):** ใช้ไฟล์ **Anonymized Research CSV** หลังเก็บข้อมูลครบ 1–2 ภาคเรียน เพื่อวิเคราะห์ประสิทธิผลของ 8 เส้นทางช่วยเหลือและตีพิมพ์ผลงานวิชาการ
