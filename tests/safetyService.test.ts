import { describe, expect, it } from 'vitest';

import { assessMessageSafety } from '../src/services/safetyService';

describe('assessMessageSafety', () => {
  it('flags severe distress phrases conservatively', () => {
    const result = assessMessageSafety('I am overwhelmed and feel out of control today.');

    expect(result.triggered).toBe(true);
    expect(result.triggers).toContain('severe_distress');
  });

  it('flags self-harm risk phrases', () => {
    const result = assessMessageSafety('Sometimes I feel like I want to die.');

    expect(result.triggered).toBe(true);
    expect(result.triggers).toContain('self_harm_risk');
  });

  it('flags urgent medical concern phrases', () => {
    const result = assessMessageSafety('I have chest pain and trouble breathing right now.');

    expect(result.triggered).toBe(true);
    expect(result.triggers).toContain('urgent_medical_concern');
  });

  it('does not trigger on a routine support message', () => {
    const result = assessMessageSafety('I want help keeping track of appointments this month.');

    expect(result).toEqual({
      triggered: false,
      triggers: [],
    });
  });
});
