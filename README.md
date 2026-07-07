# DiviRadar

DiviRadar เป็น Web App สำหรับช่วยวิเคราะห์และติดตามหุ้นปันผลไทย โดยเน้นคำถามหลักว่า “วันนี้ควรซื้อหุ้นตัวไหน เพราะอะไร”

## Features

- Login ภายในระบบสำหรับผู้ใช้หลัก `torpong.t@gmail.com`
- Dashboard สรุปหุ้นที่น่าสะสม / รอดู / แพง
- Watchlist พร้อม Filter ตาม sector, status และ live search
- Stock Detail แสดงราคา Yield, XD, Payment Date, Fair Zone และเหตุผลของคะแนน
- Portfolio คำนวณมูลค่าปัจจุบัน กำไร/ขาดทุน ปันผลต่อปี ต่อเดือน และ Yield on Cost
- Dividend Calendar
- DCA Plan แบบ rule-based เลือกหุ้น score สูงสุด 3 ตัว
- Settings สำหรับ DCA amount และ LINE OA configuration
- API สำหรับ Yahoo Finance price update, radar, portfolio, alert และ LINE push

## Local Development

```bash
cd /home/johnson/projects/diviradar
npm install
npm run db:push
npm run db:seed
npm run dev -- -p 3010
```

เปิดใช้งานที่:

[http://localhost:3010](http://localhost:3010)

Default login:

```text
username: torpong.t@gmail.com
password: Pound1234
```

## Scripts

```bash
npm run lint
npm run build
npm run db:push
npm run db:seed
```

## Data Source

ระบบใช้ Yahoo Finance chart endpoint สำหรับดึงราคาล่าสุดของ `.BK` symbols และมี seed fallback เพื่อให้หน้า app ยังแสดงผลได้เมื่อ data source ไม่ตอบสนอง

## Production Notes

- เปลี่ยน `JWT_SECRET` ก่อน production
- ตั้ง `DATABASE_URL` เป็น path production เช่น `file:/var/lib/2startup/diviradar/diviradar.db`
- ไม่ commit `.env`
- LINE OA token และ target id ต้องอยู่ใน `.env.production` หรือ settings ที่ควบคุมสิทธิ์
- ควรทำ backup SQLite และ PM2 restart เฉพาะ process `diviradar`
