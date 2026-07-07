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
LINE_CHANNEL_ACCESS_TOKEN=""
LINE_TARGET_ID=""
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
npm run build
```

## PM2

ใช้ process แยก ไม่กระทบ app อื่น:

```bash
pm2 start ecosystem.config.cjs --only diviradar
pm2 save
pm2 status diviradar
```

## Nginx

ตัวอย่าง reverse proxy:

```nginx
location /diviradar/ {
  proxy_pass http://127.0.0.1:3010/;
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
curl -I http://127.0.0.1:3010
```

## Security Checklist

- Git remote ต้องใช้ SSH ไม่ใช้ token ใน URL
- ใช้ SSH key เข้า production server
- ไม่ commit `.env`, database, backup, token หรือ temporary credential
- Rotate/revoke token ที่เคยเปิดเผย
- Backup SQLite ก่อน deploy หรือ migration
- Restart เฉพาะ PM2 process `diviradar`
