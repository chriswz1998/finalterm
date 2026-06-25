import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { resolveLlmConfig, getLlmStatus } from './llmProvider';

describe('llmProvider', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.HUNYUAN_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('prefers dashscope when LLM_PROVIDER=dashscope', () => {
    process.env.LLM_PROVIDER = 'dashscope';
    process.env.DASHSCOPE_API_KEY = 'sk-real-key';
    expect(resolveLlmConfig()?.provider).toBe('dashscope');
  });

  it('prefers hunyuan when LLM_PROVIDER=hunyuan', () => {
    process.env.LLM_PROVIDER = 'hunyuan';
    process.env.HUNYUAN_API_KEY = 'hy-real-key';
    expect(resolveLlmConfig()?.provider).toBe('hunyuan');
  });

  it('auto order picks dashscope before gemini', () => {
    process.env.DASHSCOPE_API_KEY = 'sk-real';
    process.env.GEMINI_API_KEY = 'gem-real';
    expect(resolveLlmConfig()?.provider).toBe('dashscope');
  });

  it('ignores placeholder keys', () => {
    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    expect(resolveLlmConfig()).toBeNull();
    expect(getLlmStatus().configured).toBe(false);
  });

  it('ignores dashscope example key from .env.example', () => {
    process.env.DASHSCOPE_API_KEY = 'sk-your-dashscope-key';
    process.env.HUNYUAN_API_KEY = 'sk-你的TokenHub密钥';
    expect(resolveLlmConfig()).toBeNull();
  });
});
