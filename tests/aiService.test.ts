import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/openai', () => ({
  openai: null,
}));

import { updateMemorySummary } from '../src/services/aiService';

describe('updateMemorySummary', () => {
  it('adds the latest user concern in fallback mode', async () => {
    const result = await updateMemorySummary('- Prefers short check-ins', [
      { role: 'user', content: 'I feel stressed keeping track of specialist appointments.' },
      { role: 'assistant', content: 'We can break that into smaller steps.' },
    ]);

    expect(result).toContain('- Prefers short check-ins');
    expect(result).toContain('Recent concern shared: I feel stressed keeping track of specialist appointments.');
    expect(result).toContain('Prefers supportive, non-diagnostic guidance');
  });

  it('keeps the previous summary when there is no user message', async () => {
    const result = await updateMemorySummary('- Existing memory', [
      { role: 'assistant', content: 'Checking in with you.' },
    ]);

    expect(result).toBe('- Existing memory');
  });
});
