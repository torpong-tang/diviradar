# DiviRadar Deployment

แนวทางนี้อิงรูปแบบ production ของ 2Startup Cloud และควรตรวจคู่กับ `/home/johnson/projects/2startup-landing/DEPLOYMENT.md`

## Pre-flight

```bash
cd /home/johnson/projects/diviradar
git status
npm run lint
npm run build
```

## Production Environment

ตัวอย่าง `.env.production`

```env
DATABASE_URL="file:/var/lib/2startup/diviradar/diviradar.db"
JWT_SECRET="CHANGE_TO_STRONG_RANDOM_SECRET_MIN_32_CHARS"
NEXT_PUBLIC_BASE_PATH="/diviradar"
LINE_CHANNEL_ACCESS_TOKEN=""
LINE_TARGET_ID=""
CRON_SECRET="CHANGE_TO_RANDOM_CRON_SECRET"
STANDALONE="true"
```

สร้าง directory สำหรับ SQLite:

```bash
mkdir -p /var/lib/2startup/diviradar
chown -R www-data:www-data /var/lib/2startup/diviradar
```

## Build

```bash
cd /var/www/apps/diviradar
npm ci
npx prisma generate
npx prisma db push
npm run db:seed
NEXT_PUBLIC_BASE_PATH=/diviradar npm run build
```

## PM2

ใช้ process แยก ไม่กระทบ app อื่น:

```bash
pm2 start ecosystem.config.cjs --only diviradar
pm2 save
pm2 status diviradar
```

## Cron: Auto Price Update

ตั้ง server cron ให้เรียก endpoint ทุก 5 นาที แล้วให้ app ตรวจ schedule จากเมนู Settings เอง วิธีนี้ทำให้ปรับวัน/เวลาใน app ได้โดยไม่ต้องแก้ crontab ทุกครั้ง:

```cron
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer CHANGE_TO_RANDOM_CRON_SECRET" https://2startup.cloud/diviradar/api/cron/market-update >/dev/null
```

หมายเหตุ:
- Switch ใน Settings เป็นตัวควบคุมว่า endpoint จะทำงานจริงหรือ skip
- Days/Times ใน Settings เป็นตัวกำหนด schedule จริงของ app
- หากต้องการบังคับรันทันทีสำหรับ admin/debug ใช้ `POST /api/cron/market-update?force=1`

## Settrade XD Calendar

หน้า Dividend Calendar มีปุ่ม `Update XD Calendar` สำหรับดึงข้อมูล XD จาก Settrade Stock Calendar แล้วบันทึกลง SQLite:

```text
POST /api/dividends/settrade/update
```

ค่า default จะดึงข้อมูลทั้งปีปัจจุบันสำหรับหุ้นที่ active ใน Watchlist เท่านั้น ข้อมูลนี้เป็น best-effort เพราะ Settrade มีระบบป้องกัน traffic อัตโนมัติและอาจเปลี่ยน endpoint ได้ ควรตรวจผลหลัง deploy โดยเปิดหน้า Dividend Calendar และดู `Last XD sync`

ปุ่ม `ประวัติปันผล 4 ครั้งล่าสุด` บนแต่ละ card จะเรียก:

```text
POST /api/dividends/settrade/history
```

endpoint นี้จะดึงย้อนหลังเฉพาะ symbol ที่เลือก, upsert ลง SQLite และคืน 4 รายการล่าสุดสำหรับ modal ประวัติ

## Nginx

ตัวอย่าง reverse proxy:

```nginx
location /diviradar/ {
  proxy_pass http://127.0.0.1:3010;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Health Check

```bash
pm2 status diviradar
ss -ltnp | grep 3010
curl -I http://127.0.0.1:3010/diviradar
curl -I https://2startup.cloud/diviradar
```

## Security Checklist

- Git remote ต้องใช้ SSH ไม่ใช้ token ใน URL
- ใช้ SSH key เข้า production server
- ไม่ commit `.env`, database, backup, token หรือ temporary credential
- Rotate/revoke token ที่เคยเปิดเผย
- Backup SQLite ก่อน deploy หรือ migration
- Restart เฉพาะ PM2 process `diviradar`
