import type { Setting } from "@prisma/client";

export const EDITABLE_SETTING_KEYS = new Set([
  "monthly_dca_amount",
  "auto_price_update_enabled",
  "price_cron_days",
  "price_cron_times",
  "cron_time_tolerance_minutes",
  "line_notify_enabled",
  "line_channel_token",
  "line_target_id"
]);

const SENSITIVE_SETTING_KEYS = new Set(["line_channel_token"]);

export function publicSettings(settings: Setting[]) {
  const tokenConfigured = Boolean(
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      settings.find((setting) => setting.key === "line_channel_token")?.value
  );

  return [
    ...settings
      .filter((setting) => !SENSITIVE_SETTING_KEYS.has(setting.key))
      .map(({ key, value }) => ({ key, value })),
    { key: "line_channel_token_configured", value: tokenConfigured ? "true" : "false" }
  ];
}
