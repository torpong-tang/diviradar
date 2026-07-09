# DiviRadar Deployment

แนวทางนี้อิงรูปแบบ production ของ 2Startup Cloud และควรตรวจคู่กับ `/home/johnson/projects/2startup-landing/DEPLOYMENT.md`

## Pre-flight

```bash
cd /home/johnson/projects/diviradar
git status
npm run lint
NEXT_PUBLIC_BASE_PATH=/diviradar npm run build
```

ก่อน deploy production ควรตรวจ:

- GitHub remote เป็น SSH ไม่ใช่ token URL
- `ssh -T git@github.com` หรือ SSH-over-443 ใช้งานได้
- ไม่มี `.env`, database, backup, token หรือ temporary credential อยู่ใน `git status`
- อ่าน [SWOT_AND_ROADMAP.md](./SWOT_AND_ROADMAP.md) หากมีการเปลี่ยน data source, cron, LINE OA หรือ scoring logic

GitHub remote should use SSH. If the production server cannot reach `github.com:22`, keep SSH but use GitHub SSH-over-443:

```bash
git remote set-url origin ssh://git@ssh.github.com:443/torpong-tang/diviradar.git
GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new" git pull --ff-only origin main
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
- Cron ที่เรียกทุก 5 นาทีไม่ควรทำให้ server หนัก เพราะ app จะ skip หากอยู่นอกวัน/เวลาที่ตั้งไว้ แต่ควรตรวจ `NotificationLog` เป็นระยะเพื่อไม่ให้ log โตเกินจำเป็น

## LINE OA Verification

หลังตั้งค่า LINE OA ใน Settings:

1. กรอก LINE Channel Access Token และ Target ID
2. เปิด switch LINE notification
3. กดปุ่มทดสอบ LINE
4. ตรวจว่าได้รับ Flex Message ใน LINE OA
5. ตรวจ `NotificationLog` ว่ามีสถานะส่งสำเร็จหรือ error

Daily Radar จะถูกส่งจาก cron เฉพาะเมื่อ:

- Auto price update เปิดอยู่
- เวลาตรงกับ schedule ใน Settings หรือเรียก endpoint ด้วย `force=1`
- LINE notification เปิดอยู่
- token/target id ถูกต้อง

### LINE OA `/id` command

DiviRadar webhook รองรับคำสั่ง `/id` เพื่อช่วยหา LINE Target ID:

```text
Webhook URL: https://2startup.cloud/diviradar/api/line/webhook
Command: /id
```

การตอบกลับ:

- ถ้าพิมพ์ใน group chat จะตอบ `groupId`
- ถ้าพิมพ์ใน room chat จะตอบ `roomId`
- ถ้าพิมพ์ใน private chat จะตอบ `userId`

นำค่าที่ได้ไปกรอกใน Settings > LINE Target ID แล้วกดทดสอบ LINE อีกครั้ง

ข้อกำหนด:

- LINE Developers Console ต้องเปิด `Use webhook`
- ต้องเปิด `Allow bot to join group chats` หากต้องการใช้ใน group
- ต้องตั้ง LINE Channel Access Token ผ่าน env `LINE_CHANNEL_ACCESS_TOKEN` หรือ Settings `line_channel_token`
- ห้าม log หรือ commit channel token จริงลง Git

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

ตาราง `XD History by Month` ใช้ข้อมูล dividend history ที่อยู่ใน SQLite และแสดงเฉพาะ 4 งวดย้อนหลังล่าสุดต่อหุ้นจากวันที่ปัจจุบัน เพื่อป้องกันหน้าจอรกเกินไป หากต้องการให้ตารางครบมากกว่านี้ต้องแก้ logic ใน `src/components/diviradar/xd-history-month-table.tsx`

## Backup and Restore

ควร backup SQLite ก่อน deploy หรือ migration ทุกครั้ง:

```bash
mkdir -p /var/backups/2startup/diviradar
sqlite3 /var/lib/2startup/diviradar/diviradar.db ".backup '/var/backups/2startup/diviradar/diviradar-$(date +%Y%m%d-%H%M%S).db'"
ls -lh /var/backups/2startup/diviradar
```

Restore drill ขั้นต่ำ:

```bash
cp /var/lib/2startup/diviradar/diviradar.db /var/lib/2startup/diviradar/diviradar.db.before-restore-test
sqlite3 /var/backups/2startup/diviradar/<backup-file>.db "pragma integrity_check;"
```

ห้าม restore ทับ production database ขณะ PM2 ยังเขียนข้อมูลอยู่ หากจำเป็นต้อง restore จริง ให้หยุดเฉพาะ process `diviradar`, restore, ตรวจ integrity แล้วค่อย start ใหม่

```bash
pm2 stop diviradar
cp /var/backups/2startup/diviradar/<backup-file>.db /var/lib/2startup/diviradar/diviradar.db
sqlite3 /var/lib/2startup/diviradar/diviradar.db "pragma integrity_check;"
pm2 start diviradar
```

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

หลัง deploy ควรตรวจจาก UI:

- Login ได้
- Dashboard แสดงราคาและ latest price data time
- Watchlist sort/filter ใช้งานได้
- Dividend Calendar แสดง card และ `XD History by Month`
- Settings เปิด/ปิด cron และ LINE switch ได้
- ปุ่มทดสอบ LINE ส่งข้อความได้ หากตั้งค่า LINE OA แล้ว

## Test Checklist

ยังไม่มี Playwright test suite ถาวรใน repo จึงควรทดสอบ manual ก่อน production ทุกครั้ง:

```bash
npm run lint
NEXT_PUBLIC_BASE_PATH=/diviradar npm run build
```

กรณีต่อยอดควรเพิ่ม Playwright test ถาวรสำหรับ:

- Login/logout
- Manual update prices
- Watchlist filter/sort
- Dividend Calendar filter และ XD History by Month
- Portfolio add/delete
- Settings save
- LINE test mock หรือ test mode
- Cron endpoint unauthorized/authorized cases

## Security Checklist

- Git remote ต้องใช้ SSH ไม่ใช้ token ใน URL
- หาก GitHub SSH port 22 timeout บน production ให้ใช้ `ssh://git@ssh.github.com:443/torpong-tang/diviradar.git`
- ใช้ SSH key เข้า production server
- ไม่ commit `.env`, database, backup, token หรือ temporary credential
- Rotate/revoke token ที่เคยเปิดเผย
- Backup SQLite ก่อน deploy หรือ migration
- Restart เฉพาะ PM2 process `diviradar`
- ตั้ง `CRON_SECRET` และ `JWT_SECRET` คนละค่า และต้องเป็น secret ที่เดายาก
- จำกัด permission ของ `/var/lib/2startup/diviradar` และ `/var/backups/2startup/diviradar`
- ตรวจว่า LINE token ไม่ถูก print ใน log หรือ commit history
