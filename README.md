# DiviRadar

DiviRadar เป็น Web App สำหรับช่วยวิเคราะห์และติดตามหุ้นปันผลไทย โดยเน้นคำถามหลักว่า “วันนี้ควรซื้อหุ้นตัวไหน เพราะอะไร”

## Features

- Login ภายในระบบสำหรับผู้ใช้หลัก `torpong.t@gmail.com`
- Dashboard สรุปหุ้นที่น่าสะสม / รอดู / แพง
- Watchlist พร้อม Filter ตาม sector, status และ live search
- Stock Detail แสดงราคา Yield, XD, Payment Date, Fair Zone และเหตุผลของคะแนน
- Portfolio คำนวณมูลค่าปัจจุบัน กำไร/ขาดทุน ปันผลต่อปี ต่อเดือน และ Yield on Cost
- Dividend Calendar พร้อมปุ่ม Update XD Calendar จาก Settrade Stock Calendar
- DCA Plan แบบ rule-based เลือกหุ้น score สูงสุด 3 ตัว
- Settings สำหรับ DCA amount, Auto price update schedule และ LINE OA notification switcher
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

ข้อมูล XD Calendar ใช้ Settrade Stock Calendar แบบ best-effort ผ่านปุ่ม `Update XD Calendar` ในหน้า Dividend Calendar:

- ดึงเฉพาะหุ้นที่อยู่ใน Watchlist
- ดึงข้อมูลทั้งปีปัจจุบันและ upsert ลง SQLite
- แสดง source ในรายการเป็น `Settrade • เงินปันผล`
- หาก Settrade ปิดกั้นหรือเปลี่ยน endpoint ระบบจะแจ้ง error ใน app โดยไม่กระทบข้อมูลเดิม

ในแต่ละ card ของ Dividend Calendar มีปุ่ม `ประวัติปันผล 4 ครั้งล่าสุด` ระบบจะดึงประวัติ XD เฉพาะหุ้นนั้นย้อนหลังจาก Settrade, upsert ลง SQLite แล้วเปิด modal แสดง:

- วันขึ้น XD
- วันจ่ายเงินปันผล
- จำนวนเงินปันผลต่อหุ้น
- แหล่งข้อมูล

## Auto Price Update & LINE OA

ในเมนู Settings สามารถตั้งค่า:

- เปิด/ปิด Auto price update
- เลือกวันทำงาน เช่น Mon-Fri
- เพิ่ม/ลบรอบเวลาด้วย time picker เช่น `10:30`, `12:30`, `16:45`, `18:00`
- กำหนด tolerance ของ schedule เป็นนาที เพื่อรองรับ server cron ที่เรียกทุก 5 นาที
- เปิด/ปิด LINE OA notification
- ตั้งค่า LINE Channel Token และ LINE Target ID

Cron endpoint สำหรับ production:

```text
POST /api/cron/market-update
Authorization: Bearer <CRON_SECRET>
```

ตัวอย่าง cron ฝั่ง server:

```bash
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://2startup.cloud/diviradar/api/cron/market-update >/dev/null
```

ตัว app จะตรวจเองว่าอยู่ในวันที่/เวลาที่ตั้งไว้หรือไม่ ถ้าไม่ตรงเวลาจะบันทึก log เป็น `SKIPPED_SCHEDULE`

## Production Notes

- เปลี่ยน `JWT_SECRET` ก่อน production
- ตั้ง `DATABASE_URL` เป็น path production เช่น `file:/var/lib/2startup/diviradar/diviradar.db`
- ไม่ commit `.env`
- LINE OA token และ target id ต้องอยู่ใน `.env.production` หรือ settings ที่ควบคุมสิทธิ์
- ควรทำ backup SQLite และ PM2 restart เฉพาะ process `diviradar`
