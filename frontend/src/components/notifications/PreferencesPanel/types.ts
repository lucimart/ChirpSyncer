/**
 * PreferencesPanel Types
 */

export type EmailDigestFrequency = 'daily' | 'weekly';

export interface NotificationChannelPreferences {
  in_app_enabled: boolean;
  push_enabled: boolean;
  telegram_enabled: boolean;
  telegram_chat_id?: string;
  discord_enabled: boolean;
  discord_webhook_url?: string;
  email_digest_enabled: boolean;
  email_digest_frequency: EmailDigestFrequency;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
}

export interface PreferencesPanelProps {
  className?: string;
}

// Hours for quiet hours select
export const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, '0')}:00`,
}));

// Email digest frequency options
export const DIGEST_FREQUENCIES: { value: EmailDigestFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

/**
 * Validates Discord webhook URL format
 */
export function isValidDiscordWebhookUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/.test(url);
}
