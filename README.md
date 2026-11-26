# PTN-Student-Care
**ระบบดูแลช่วยเหลือและติดตามความพร้อมจบการศึกษา (PWA + LINE LIFF + Firebase)**  
โรงเรียนเปรมติณสูลานนท์ องค์การบริหารงานส่วนจังหวัดขอนแก่น  
**Dev By Kru.gorthailand**

## คุณสมบัติหลัก
- **Soft 3D Claymorphism UI/UX:** รองรับทั้ง Desktop Dashboard (Left Slate Sidebar) และ Mobile PWA (Floating Pill Bottom Navigation) พร้อมโหมดตัวอักษรใหญ่ (Big Text Mode) สำหรับผู้ปกครอง
- **รองรับไฟล์รายชื่อนักเรียนจริง (.xlsx):** อ่านไฟล์ `รายชื่อ นร. ม.1-6 ปี 69 (11-5-69).xlsx` ทั้ง 18 ห้องเรียน (`ม.1/1`–`ม.6/3`) ข้ามชีต `รวม` อัตโนมัติ และ Upsert ด้วย `เลขประจำตัวนักเรียน`
- **4 บทบาท (RBAC + PDPA):** ผู้บริหาร (`admin`), ครูที่ปรึกษา (`teacher`), นักเรียน (`student`), ผู้ปกครอง (`parent`) พร้อม `firestore.rules`, `storage.rules` และ Immutable `auditLogs`
- **Graduation Tracker (5 เกณฑ์) & Early Warning:** ไฟจราจร เขียว/เหลือง/แดง (ทุนเสมอภาคตั้งน้ำหนักเสี่ยง = 0 ไม่ตีตรา), Decision Support เส้นทางช่วยเหลือ 8 รูปแบบ (1 โรงเรียน 3 รูปแบบ), ระบบอนุมัติข้อ 5–6, เยี่ยมบ้านพร้อมพิกัด GPS + ภาพถ่ายบีบอัด
- **Demo Mode & Firebase Ready:** รันทดสอบได้ทันทีผ่าน `localStorage` พร้อมข้อมูลตั้งต้นจากไฟล์จริง และเชื่อมต่อ Firebase / LINE LIFF ได้ทันทีเมื่อตั้งค่า `.env`

## วิธีรันบนเครื่อง
```bash
npm install
npm run dev
```

## Build สำหรับ Production
```bash
npm run build
```
