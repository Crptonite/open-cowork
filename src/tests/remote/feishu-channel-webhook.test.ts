import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FeishuChannel } from '../../main/remote/channels/feishu/feishu-channel';
import type { FeishuChannelConfig } from '../../main/remote/types';

vi.mock('../../main/utils/logger', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

function signedHeaders(token: string, body: string) {
  const timestamp = '1710000000';
  const nonce = 'nonce-1';
  const signature = createHmac('sha256', token)
    .update(timestamp + nonce + token + body)
    .digest('hex');
  return {
    'x-lark-signature': signature,
    'x-lark-request-timestamp': timestamp,
    'x-lark-request-nonce': nonce,
  };
}

function channelConfig(overrides: Partial<FeishuChannelConfig> = {}): FeishuChannelConfig {
  return {
    type: 'feishu',
    appId: 'cli_test',
    appSecret: 'secret',
    useWebSocket: false,
    dm: { policy: 'pairing' },
    ...overrides,
  };
}

describe('FeishuChannel.handleWebhook', () => {
  it('rejects signed requests when verificationToken is missing', () => {
    const channel = new FeishuChannel(channelConfig());
    const body = JSON.stringify({ type: 'url_verification', challenge: 'abc' });
    const result = channel.handleWebhook(signedHeaders('unused-token', body), body);
    expect(result.status).toBe(403);
    expect(result.data).toEqual({ error: 'Invalid signature' });
  });

  it('accepts a correctly signed request when verificationToken is configured', () => {
    const token = 'feishu-verify-token';
    const channel = new FeishuChannel(channelConfig({ verificationToken: token }));
    const body = JSON.stringify({ type: 'url_verification', challenge: 'abc' });
    const result = channel.handleWebhook(signedHeaders(token, body), body);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ challenge: 'abc' });
  });
});
