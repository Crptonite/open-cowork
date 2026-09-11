/**
 * Feishu webhook-mode config helpers shared by renderer validation and main IPC.
 *
 * Webhook mode (`useWebSocket === false`) requires a verification token because
 * FeishuChannel.handleWebhook rejects unsigned/unverified requests with HTTP 403.
 */

export const FEISHU_WEBHOOK_VERIFICATION_TOKEN_REQUIRED =
  'Feishu webhook mode requires a verification token';

export function isFeishuWebhookVerificationTokenMissing(config: {
  useWebSocket?: boolean;
  verificationToken?: string;
}): boolean {
  return config.useWebSocket === false && !config.verificationToken?.trim();
}
