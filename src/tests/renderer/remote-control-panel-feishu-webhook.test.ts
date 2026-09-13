import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const panelPath = path.resolve(process.cwd(), 'src/renderer/components/RemoteControlPanel.tsx');
const connectionPath = path.resolve(
  process.cwd(),
  'src/renderer/components/remote/ConnectionConfigStep.tsx'
);
const typesPath = path.resolve(process.cwd(), 'src/renderer/components/remote/types.ts');
const managerPath = path.resolve(process.cwd(), 'src/main/remote/remote-manager.ts');
const enPath = path.resolve(process.cwd(), 'src/renderer/i18n/locales/en.json');
const zhPath = path.resolve(process.cwd(), 'src/renderer/i18n/locales/zh.json');

function normalizeSource(source: string): string {
  return source.replace(/\s+/g, ' ').trim();
}

const panelSource = normalizeSource(readFileSync(panelPath, 'utf8'));
const connectionSource = normalizeSource(readFileSync(connectionPath, 'utf8'));
const typesSource = normalizeSource(readFileSync(typesPath, 'utf8'));
const managerSource = normalizeSource(readFileSync(managerPath, 'utf8'));
const en = JSON.parse(readFileSync(enPath, 'utf8')) as {
  remote: Record<string, string>;
};
const zh = JSON.parse(readFileSync(zhPath, 'utf8')) as {
  remote: Record<string, string>;
};

describe('Feishu webhook verification token settings', () => {
  it('includes verificationToken on the renderer Feishu config type', () => {
    expect(typesSource).toContain('verificationToken?: string');
  });

  it('loads and saves verificationToken through RemoteControlPanel', () => {
    expect(panelSource).toContain('setFeishuVerificationToken');
    expect(panelSource).toContain('channels.feishu.verificationToken');
    expect(panelSource).toContain('verificationToken: feishuVerificationToken.trim()');
    expect(panelSource).toContain('isFeishuWebhookVerificationTokenMissing');
    expect(panelSource).toMatch(/key:\s*['"]remote\.verificationTokenRequired['"]/);
  });

  it('shows the token field only in webhook mode', () => {
    expect(connectionSource).toContain('!useLongConnection');
    expect(connectionSource).toContain("t('remote.verificationToken')");
    expect(connectionSource).toContain('onVerificationTokenChange');
  });

  it('rejects webhook configs without a token in remote-manager', () => {
    expect(managerSource).toContain('isFeishuWebhookVerificationTokenMissing(config)');
    expect(managerSource).toContain('FEISHU_WEBHOOK_VERIFICATION_TOKEN_REQUIRED');
  });

  it('adds bilingual strings for the webhook verification token', () => {
    for (const key of [
      'verificationToken',
      'verificationTokenPlaceholder',
      'verificationTokenHint',
      'verificationTokenRequired',
    ]) {
      expect(en.remote[key]).toBeTruthy();
      expect(zh.remote[key]).toBeTruthy();
    }
  });
});
