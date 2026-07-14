import { prisma } from "@/lib/prisma";

type NotificationLogData = {
  userId?: number | null;
  title: string;
  message: string;
  channel: string;
  status: string;
};

const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
let lastPrunedAt = 0;

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export async function pruneNotificationLogs() {
  const retentionDays = boundedInteger(process.env.NOTIFICATION_LOG_RETENTION_DAYS, 30, 1, 365);
  const maxRows = boundedInteger(process.env.NOTIFICATION_LOG_MAX_ROWS, 1000, 100, 10000);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  await prisma.notificationLog.deleteMany({ where: { sentAt: { lt: cutoff } } });

  const overflowAnchor = await prisma.notificationLog.findFirst({
    orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    skip: maxRows,
    select: { sentAt: true, id: true }
  });

  if (overflowAnchor) {
    await prisma.notificationLog.deleteMany({
      where: {
        OR: [
          { sentAt: { lt: overflowAnchor.sentAt } },
          { sentAt: overflowAnchor.sentAt, id: { lte: overflowAnchor.id } }
        ]
      }
    });
  }
}

async function maybePruneNotificationLogs() {
  const now = Date.now();
  if (now - lastPrunedAt < PRUNE_INTERVAL_MS) return;
  lastPrunedAt = now;
  await pruneNotificationLogs();
}

export async function logNotification(data: NotificationLogData) {
  const row = await prisma.notificationLog.create({ data });
  try {
    await maybePruneNotificationLogs();
  } catch (error) {
    console.error("Unable to prune notification logs", error);
  }
  return row;
}
