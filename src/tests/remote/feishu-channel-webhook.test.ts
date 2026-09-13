import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FeishuChannel } from '../../main/remote/channels/feishu/feishu-channel';
import type { FeishuChannelConfig } from '../../main/remote/types';

vi.mock('../../main/utils/logger', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

/**
 * Official Feishu/Lark event callback signature (larksuite/node-sdk
 * dispatcher/request-handle.ts checkIsEventValidated):
 *   SHA256(timestamp + nonce + encryptKey + rawBody)
 *
 * Fixtures below are precomputed with that formula. Tests must not sign
 * requests with HMAC(verificationToken), which was the incorrect production
 * algorithm.
 */
const ENCRYPT_KEY = 'test_encrypt_key';
const VERIFICATION_TOKEN = 'v_token_example';
const TIMESTAMP = '1710000000';
const NONCE = 'n1QwErTy';

const URL_CHALLENGE_BODY =
  '{"challenge":"ajls384kdjxxxx","token":"v_token_example","type":"url_verification"}';
const URL_CHALLENGE_SIGNATURE = '1bdb129649d0d7cc7e1a4bf5e2150fc9c81bdfac70c5fc570ce884e402578102';

const EVENT_CALLBACK_BODY =
  '{"schema":"2.0","header":{"event_id":"8e6e35bf1b86c6cf2adc15eb1b8d2d2a","token":"v_token_example","create_time":"1603977298000","event_type":"im.message.receive_v1","tenant_key":"2d8a0e17d6c7622d","app_id":"cli_test"},"event":{"sender":{"sender_id":{"open_id":"ou_user"},"sender_type":"user"},"message":{"message_id":"om_msg","chat_id":"oc_chat","chat_type":"p2p","message_type":"text","content":"{\\"text\\":\\"hello\\"}"}}}';
const EVENT_CALLBACK_SIGNATURE = '650715e244b335f72ee1ca040a4d49b643bf0c4e875c22f0368ad5c4ac8221a1';

function officialSha256Signature(rawBody: string): string {
  return createHash('sha256')
    .update(TIMESTAMP + NONCE + ENCRYPT_KEY + rawBody, 'utf8')
    .digest('hex');
}

function signedHeaders(signature: string) {
  return {
    'x-lark-signature': signature,
    'x-lark-request-timestamp': TIMESTAMP,
    'x-lark-request-nonce': NONCE,
  };
}

function channelConfig(overrides: Partial<FeishuChannelConfig> = {}): FeishuChannelConfig {
  return {
    type: 'feishu',
    appId: 'cli_test',
    appSecret: 'secret',
    encryptKey: ENCRYPT_KEY,
    verificationToken: VERIFICATION_TOKEN,
    useWebSocket: false,
    dm: { policy: 'pairing' },
    ...overrides,
  };
}

describe('Feishu official webhook signature fixtures', () => {
  it('matches SHA256(timestamp + nonce + encryptKey + rawBody)', () => {
    expect(officialSha256Signature(URL_CHALLENGE_BODY)).toBe(URL_CHALLENGE_SIGNATURE);
    expect(officialSha256Signature(EVENT_CALLBACK_BODY)).toBe(EVENT_CALLBACK_SIGNATURE);
  });
});

describe('FeishuChannel.handleWebhook', () => {
  it('rejects signed requests when encryptKey is missing', () => {
    const channel = new FeishuChannel(channelConfig({ encryptKey: undefined }));
    const result = channel.handleWebhook(
      signedHeaders(URL_CHALLENGE_SIGNATURE),
      URL_CHALLENGE_BODY
    );
    expect(result.status).toBe(403);
    expect(result.data).toEqual({ error: 'Invalid signature' });
  });

  it('rejects HMAC(verificationToken) signatures used by the old algorithm', () => {
    const hmacSignature = createHmac('sha256', VERIFICATION_TOKEN)
      .update(TIMESTAMP + NONCE + VERIFICATION_TOKEN + URL_CHALLENGE_BODY)
      .digest('hex');
    const channel = new FeishuChannel(channelConfig());
    const result = channel.handleWebhook(signedHeaders(hmacSignature), URL_CHALLENGE_BODY);
    expect(result.status).toBe(403);
    expect(result.data).toEqual({ error: 'Invalid signature' });
  });

  it('accepts a URL challenge signed with encryptKey SHA256', () => {
    const channel = new FeishuChannel(channelConfig());
    const result = channel.handleWebhook(
      signedHeaders(URL_CHALLENGE_SIGNATURE),
      URL_CHALLENGE_BODY
    );
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ challenge: 'ajls384kdjxxxx' });
  });

  it('rejects a URL challenge whose body token does not match verificationToken', () => {
    const mismatchedBody =
      '{"challenge":"ajls384kdjxxxx","token":"wrong-token","type":"url_verification"}';
    const mismatchedSignature = officialSha256Signature(mismatchedBody);
    const channel = new FeishuChannel(channelConfig());
    const result = channel.handleWebhook(signedHeaders(mismatchedSignature), mismatchedBody);
    expect(result.status).toBe(403);
    expect(result.data).toEqual({ error: 'Invalid verification token' });
  });

  it('accepts a v2 im.message.receive_v1 event callback signed with encryptKey SHA256', () => {
    const channel = new FeishuChannel(channelConfig());
    const result = channel.handleWebhook(
      signedHeaders(EVENT_CALLBACK_SIGNATURE),
      EVENT_CALLBACK_BODY
    );
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ code: 0 });
  });
});
