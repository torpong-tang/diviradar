import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const initialSettings = [
  { key: "monthly_dca_amount", value: "20000" },
  { key: "line_channel_token", value: "" },
  { key: "line_target_id", value: "" },
  { key: "auto_price_update_enabled", value: "false" },
  { key: "price_cron_days", value: "1,2,3,4,5" },
  { key: "price_cron_times", value: "10:30,12:30,16:45,18:00" },
  { key: "cron_time_tolerance_minutes", value: "3" },
  { key: "line_notify_enabled", value: "false" }
];

async function main() {
  for (const setting of initialSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("Production-safe seed completed without changing existing users or data.");
    return;
  }

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (minimum 12 characters) before the first production seed.");
  }

  await prisma.user.create({
    data: {
      email,
      name: process.env.INITIAL_ADMIN_NAME?.trim() || "DiviRadar Admin",
      password: await bcrypt.hash(password, 12)
    }
  });
  console.log("Initial administrator created. Password was not printed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
