# คู่มือการ Deploy PTN-Student-Care ขึ้น Production (Firebase + LINE LIFF)
โรงเรียนเปรมติณสูลานนท์ องค์การบริหารงานส่วนจังหวัดขอนแก่น · **Dev By Kru.gorthailand**

## 1. ตั้งค่า Firebase Project
1. สร้างโปรเจกต์ที่ [Firebase Console](https://console.firebase.google.com/) และเปิดใช้งาน:
   - **Authentication** (Email/Password และ Google Sign-In)
   - **Cloud Firestore** (เลือก Region `asia-southeast1`)
   - **Cloud Storage**
   - **Firebase Hosting**
2. คัดลอก `.env.example` เป็น `.env` แล้วกรอกค่า `VITE_FIREBASE_*` และ `VITE_LINE_LIFF_ID`
3. Deploy Security Rules:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

## 2. ตั้งค่า LINE LIFF & Rich Menu
1. สร้าง LIFF App ใน LINE Developers Console โดยตั้ง Endpoint URL เป็นโดเมน Firebase Hosting ของโรงเรียน
2. นำไฟล์ `docs/line-rich-menu.json` ไปอัปโหลดผ่าน LINE Messaging API เพื่อสร้างเมนูสำหรับผู้ปกครองและนักเรียน
3. รองรับ Deep-Link อัตโนมัติ เช่น `https://your-school.web.app/?role=parent&code=3649`

## 3. Build และ Deploy
```bash
npm run build
firebase deploy --only hosting
```
