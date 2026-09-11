import { describe, expect, it } from 'vitest';
import {
  FEISHU_WEBHOOK_VERIFICATION_TOKEN_REQUIRED,
  isFeishuWebhookVerificationTokenMissing,
} from '../../shared/feishu-webhook-config';

describe('isFeishuWebhookVerificationTokenMissing', () => {
  it('requires a token when webhook mode is selected', () => {
    expect(
      isFeishuWebhookVerificationTokenMissing({
        useWebSocket: false,
        verificationToken: undefined,
      })
    ).toBe(true);
    expect(
      isFeishuWebhookVerificationTokenMissing({
        useWebSocket: false,
        verificationToken: '   ',
      })
    ).toBe(true);
  });

  it('accepts a non-empty token in webhook mode', () => {
    expect(
      isFeishuWebhookVerificationTokenMissing({
        useWebSocket: false,
        verificationToken: 'feishu-verify-token',
      })
    ).toBe(false);
  });

  it('does not require a token for long-connection mode', () => {
    expect(
      isFeishuWebhookVerificationTokenMissing({
        useWebSocket: true,
        verificationToken: undefined,
      })
    ).toBe(false);
  });
});

describe('FEISHU_WEBHOOK_VERIFICATION_TOKEN_REQUIRED', () => {
  it('describes the webhook save contract', () => {
    expect(FEISHU_WEBHOOK_VERIFICATION_TOKEN_REQUIRED).toContain('verification token');
  });
});
