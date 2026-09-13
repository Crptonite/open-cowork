import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildAgentRuntimeSignature } from '../src/main/config/agent-runtime-signature';
import type { AppConfig } from '../src/main/config/config-store';

const baseConfig = {
  provider: 'ollama',
  apiKey: '',
  baseUrl: 'http://localhost:11434/v1',
  customProtocol: 'openai',
  model: 'llama3.3',
  contextWindow: 32000,
  maxTokens: 8000,
  enableThinking: false,
  memoryEnabled: true,
  memoryRuntime: { useEmbedding: false },
} as AppConfig;

describe('buildAgentRuntimeSignature', () => {
  it('changes when only contextWindow changes', () => {
    const original = buildAgentRuntimeSignature(baseConfig);
    const updated = buildAgentRuntimeSignature({
      ...baseConfig,
      contextWindow: 64000,
    });

    expect(updated).not.toBe(original);
  });

  it('changes when only maxTokens changes', () => {
    const original = buildAgentRuntimeSignature(baseConfig);
    const updated = buildAgentRuntimeSignature({
      ...baseConfig,
      maxTokens: 16000,
    });

    expect(updated).not.toBe(original);
  });

  it('stays the same when unrelated fields change', () => {
    const original = buildAgentRuntimeSignature(baseConfig);
    const updated = buildAgentRuntimeSignature({
      ...baseConfig,
      theme: 'dark',
      sandboxEnabled: true,
    } as AppConfig);

    expect(updated).toBe(original);
  });

  it('is used by the main-process config reload path', () => {
    const indexPath = path.resolve(process.cwd(), 'src/main/index.ts');
    const source = fs.readFileSync(indexPath, 'utf8');

    expect(source).toContain("from './config/agent-runtime-signature'");
    expect(source).toContain(
      'buildAgentRuntimeSignature(previousConfig) !== buildAgentRuntimeSignature(updatedConfig)'
    );
  });
});
