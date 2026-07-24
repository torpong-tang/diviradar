# DiviRadar SWOT and Roadmap

เอกสารนี้สรุปสถานะเชิงผลิตภัณฑ์ของ DiviRadar หลังจากเพิ่ม Watchlist, Portfolio, Dividend Calendar, XD History by Month, DCA Plan, LINE OA Flex Message, cron auto price update และ production deployment บน 2Startup Cloud

## Product Positioning

DiviRadar เป็นแอปช่วยติดตามหุ้นปันผลไทย โดยมีเป้าหมายหลักคือช่วยตอบคำถาม:

```text
วันนี้หุ้นปันผลตัวไหนน่าสนใจ เพราะอะไร
```

ระบบเน้นการรวมข้อมูลราคา, dividend yield, fair zone, XD calendar, dividend history, portfolio income และ LINE alert เพื่อช่วยให้ผู้ใช้เห็นภาพรวมเร็วขึ้น

## SWOT

### Strengths

- มี workflow ใช้งานจริงครบตั้งแต่ login, dashboard, watchlist, portfolio, dividend calendar, alerts, settings, cron และ LINE OA
- เหมาะกับแนวลงทุนหุ้นปันผล เพราะมี yield, fair zone, score, XD date, payment date และ dividend history
- ใช้ SQLite ทำให้ deploy ง่ายและดูแล production server ได้ไม่ซับซ้อน
- มี LINE OA Flex Message สำหรับ Daily Radar พร้อมราคา, score, yield, สถานะหุ้น และ DCA Plan
- Dividend Calendar มีทั้ง card view, history modal และ XD History by Month แบบกรองข้อมูลได้
- DCA Plan คำนวณหุ้น score >= 80 สูงสุด 3 ตัว พร้อมราคา/หุ้น จำนวนหุ้นแบบ lot 100 และราคารวม
- มี production deployment flow แยก PM2 process เฉพาะ `diviradar` ลดผลกระทบต่อ app อื่น
- LINE webhook ตรวจ `x-line-signature` ด้วย `LINE_CHANNEL_SECRET` และไม่ส่ง token เดิมกลับ browser
- NotificationLog มี retention policy เพื่อจำกัดอายุและจำนวนแถว

### Weaknesses

- ราคาหุ้นใช้ Yahoo Finance ซึ่งไม่ใช่ official SET real-time feed และอาจ delay
- ข้อมูล Settrade Stock Calendar เป็น best-effort และอาจได้รับผลกระทบหาก endpoint หรือ anti-bot behavior เปลี่ยน
- Scoring ยังเป็น rule-based ไม่ใช่โมเดลเชิงสถิติหรือ AI เต็มระบบ
- ยังไม่มี technical indicators จริง เช่น RSI, MACD, SMA/EMA, Bollinger Band
- ยังไม่มี Playwright test suite ถาวรใน repo
- ยังไม่มี audit log ละเอียดสำหรับ action สำคัญ เช่น update price, update XD, settings change, LINE test
- ยังไม่มี backup/restore drill อัตโนมัติสำหรับ SQLite และ storage
- DCA Plan ยังเป็น rule-based allocation แบบคงที่ 40/35/25 และยังไม่พิจารณา portfolio concentration หรือ risk cap เชิงลึก

### Opportunities

- พัฒนาเป็น Dividend Copilot ที่ตอบคำถามด้วยภาษาธรรมชาติ เช่น “วันนี้ธนาคารตัวไหนน่าสะสม”
- เพิ่ม custom alert rules เฉพาะผู้ใช้ เช่น yield มากกว่าเป้า, ราคาเข้า fair zone, XD ใกล้ถึง, dividend growth เปลี่ยน
- เพิ่ม technical scanner เพื่อให้ score สมบูรณ์ขึ้นจากทั้ง dividend, valuation และ momentum
- เพิ่ม portfolio analytics เช่น sector allocation, dividend income forecast, yield on cost, risk concentration
- เพิ่ม PDF/Excel monthly report สำหรับสรุปหุ้นเด่น, ปันผลคาดการณ์ และ watchlist action
- รองรับ official/paid market data API ในอนาคตเพื่อลดความเสี่ยงเรื่องความแม่นยำของข้อมูล

### Threats

- Data source ภายนอกอาจเปลี่ยน format, rate limit, block request หรือให้ข้อมูลล่าช้า
- ผู้ใช้อาจเข้าใจผิดว่าราคาเป็น real-time ทั้งที่ data source อาจ delay
- LINE Channel Access Token และ Target ID เป็นข้อมูลอ่อนไหว หากรั่วไหลอาจถูกนำไปใช้ผิดวัตถุประสงค์
- SQLite production หากไม่มี backup/restore อาจเสี่ยงเมื่อ server, disk หรือ deployment ผิดพลาด
- Rule-based recommendation อาจถูกตีความเป็นคำแนะนำการลงทุนโดยตรง จึงต้องมี disclaimer ชัดเจน

## Current Capability Checklist

| Area | Status | Notes |
| --- | --- | --- |
| Login | Ready | Basic internal login with JWT session |
| Watchlist | Ready | Sort/filter/search and price/yield/score view |
| Portfolio | Ready | Calculates value, gain/loss, annual/monthly dividend |
| Dividend Calendar | Ready | Settrade update, cards, history modal, monthly XD table |
| XD History by Month | Ready | Filterable table, limited to last 4 historical XD periods per stock |
| XD Sync Integrity | Ready | Shared service, validation, transaction, compound unique key and partial-sync status |
| XD Unit Tests | Ready | Duplicate, conflict, invalid data, idempotency and partial failure coverage |
| DCA Plan | Ready | Top score >= 80, max 3 stocks, 40/35/25 allocation, lot 100 shares, +/-5% tolerance |
| LINE OA | Ready | Test button and scheduled Daily Radar Flex Message |
| LINE Webhook Security | Ready | Signature verification with `LINE_CHANNEL_SECRET`, `/id` command supported |
| Cron | Ready | Server cron every 5 minutes, app-level schedule gate in Settings |
| Notification Retention | Ready | Controlled by `NOTIFICATION_LOG_RETENTION_DAYS` and `NOTIFICATION_LOG_MAX_ROWS` |
| Production PM2 | Ready | `diviradar` process separated from other apps |
| Backup/Restore | Gap | Need automation and restore drill |
| Audit Log | Gap | Need structured log for settings, cron, line, price and XD updates |
| Playwright Tests | Gap | Need persistent test suite |
| Technical Scanner | Gap | RSI/MACD/SMA/EMA not implemented yet |
| Official Data Source | Gap | Yahoo/Settrade best-effort only |

## Recommended Roadmap

### Phase 1: Reliability and Operations

1. Add SQLite backup script to `/var/backups/2startup/diviradar`
2. Add restore drill script and document verification steps
3. Add audit log table for important user/system actions
4. Add health endpoint for authenticated/system status checks
5. Add automated verification for notification retention and cron log cleanup

### Phase 2: Alert Engine

1. Add configurable alert rules:
   - price below target/fair price
   - dividend yield above target
   - XD within N days
   - score above threshold
2. Add LINE OA alert summary by rule
3. Add alert history and last-triggered timestamp with retention policy
4. Prevent duplicate alerts within the same configured period
5. Add DCA Plan alert summary with portfolio concentration checks

### Phase 3: Technical and Fundamental Scanner

1. Store daily price snapshots
2. Calculate SMA/EMA, RSI, MACD, volume trend and 52-week position
3. Add technical score into radar score
4. Add scanner page with filters and explanation

### Phase 4: AI Copilot

1. Add structured prompt using current watchlist, portfolio and dividend data
2. Provide answers with cited data points from the app database
3. Include “data may be delayed” disclaimer in AI answers
4. Add questions such as:
   - วันนี้หุ้นตัวไหนน่าสะสม
   - หุ้นตัวไหนใกล้ XD
   - พอร์ตนี้ได้ปันผลต่อเดือนเท่าไร

### Phase 5: Data Source Upgrade

1. Evaluate official SET/Settrade API or broker API
2. Add source status page and last successful sync per source
3. Add fallback strategy when a source fails
4. Add data quality checks for stale price, missing XD and suspicious dividend amount

## Security Notes

- Do not commit `.env`, SQLite database, backup files, LINE token, GitHub token or temporary credentials
- Use SSH remote for GitHub, not token in URL
- Use SSH key for production server access
- Rotate/revoke any token that was pasted in chat or terminal history
- Keep `CRON_SECRET` strong and separate from `JWT_SECRET`
- Restrict production database and backup directory permissions

## Investment Disclaimer

DiviRadar provides analytical support only. Scores, statuses and LINE alerts are generated from available data and rule-based logic. They are not financial advice. Always verify information with official SET/Settrade/broker sources before making investment decisions.
