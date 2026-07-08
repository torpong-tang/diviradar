# DiviRadar

DiviRadar เป็น Web App สำหรับช่วยวิเคราะห์และติดตามหุ้นปันผลไทย โดยเน้นคำถามหลักว่า “วันนี้ควรซื้อหุ้นตัวไหน เพราะอะไร”

## Features

- Login ภายในระบบสำหรับผู้ใช้หลัก `torpong.t@gmail.com`
- Dashboard สรุปหุ้นที่น่าสะสม / รอดู / แพง
- Watchlist พร้อม Filter ตาม sector, status และ live search
- Stock Detail แสดงราคา Yield, XD, Payment Date, Fair Zone และเหตุผลของคะแนน
- Portfolio คำนวณมูลค่าปัจจุบัน กำไร/ขาดทุน ปันผลต่อปี ต่อเดือน และ Yield on Cost
- Dividend Calendar พร้อมปุ่ม Update XD Calendar จาก Settrade Stock Calendar
- XD History by Month แสดงประวัติ XD รายเดือน โดยจำกัดข้อมูลเฉพาะ 4 งวดย้อนหลังล่าสุดต่อหุ้น เพื่อไม่ให้ตารางรกเกินไป
- DCA Plan แบบ rule-based เลือกหุ้น score สูงสุด 3 ตัว
- Settings สำหรับ DCA amount, Auto price update schedule และ LINE OA notification switcher
- LINE OA Flex Message สำหรับ Daily Radar พร้อมราคา, score, yield และสถานะหุ้น
- API สำหรับ Yahoo Finance price update, radar, portfolio, alert, dividend calendar และ LINE push

## Important Disclaimer

DiviRadar เป็นเครื่องมือช่วยติดตามและวิเคราะห์หุ้นปันผลเพื่อใช้ประกอบการตัดสินใจเท่านั้น ไม่ใช่คำแนะนำการลงทุนโดยตรง ข้อมูลราคาและข้อมูล XD/Dividend อาจล่าช้า ไม่ครบถ้วน หรือคลาดเคลื่อนได้ตามข้อจำกัดของ data source ผู้ใช้ควรตรวจสอบข้อมูลจากแหล่งทางการ เช่น SET/Settrade หรือ broker ก่อนตัดสินใจลงทุนจริง

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

ข้อควรทราบ:

- Yahoo Finance ไม่ใช่ official SET real-time feed และราคาอาจ delay
- ค่า `Latest price data time` คือเวลาของข้อมูลราคาล่าสุดจาก data source ไม่ใช่นาฬิกาปัจจุบัน
- หากต้องการใช้งานเชิง production ที่ต้องการความแม่นยำสูง ควรพิจารณา official/paid market data API เพิ่มเติม

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

ตาราง `XD History by Month` ใช้ข้อมูล dividend history ที่อยู่ใน SQLite แล้วนำมาแสดงเป็นรายเดือน โดยจำกัดเฉพาะ 4 งวดย้อนหลังล่าสุดต่อหุ้นจากวันที่ปัจจุบัน เพื่อให้หน้าจออ่านง่ายและไม่หนาแน่นเกินไป

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

LINE OA จะส่งข้อความเฉพาะเมื่อ:

- `auto_price_update_enabled=true`
- วัน/เวลาตรงกับ Settings หรือเรียกด้วย `force=1`
- `line_notify_enabled=true`
- มี LINE Channel Access Token และ Target ID ถูกต้อง

Manual `Update Prices` ในหน้า app ใช้สำหรับอัปเดตราคาในระบบเท่านั้น และไม่ส่ง LINE OA

## Recommended Improvements

ดูรายละเอียด SWOT และ roadmap ได้ที่ [SWOT_AND_ROADMAP.md](./SWOT_AND_ROADMAP.md)

ลำดับที่ควรทำต่อ:

1. เพิ่ม backup/restore automation สำหรับ SQLite และทดสอบ restore จริง
2. เพิ่ม audit log สำหรับ update price, update XD, settings, LINE test และ cron run
3. เพิ่ม custom alert rules เช่น price <= fair price, yield >= target, XD within 7 days
4. เพิ่ม Playwright test suite สำหรับ login, dashboard, watchlist, dividend calendar, settings และ LINE test mock
5. เพิ่ม technical scanner เช่น RSI, MACD, SMA/EMA และ volume trend
6. เพิ่ม official/paid data source option หากต้องการความแม่นยำระดับ production investment workflow

## Production Notes

- เปลี่ยน `JWT_SECRET` ก่อน production
- ตั้ง `DATABASE_URL` เป็น path production เช่น `file:/var/lib/2startup/diviradar/diviradar.db`
- ไม่ commit `.env`
- LINE OA token และ target id ต้องอยู่ใน `.env.production` หรือ settings ที่ควบคุมสิทธิ์
- ควรทำ backup SQLite และ PM2 restart เฉพาะ process `diviradar`
- ตรวจ cron และ LINE OA หลัง deploy โดยดู `NotificationLog` และกดทดสอบ LINE ใน Settings
