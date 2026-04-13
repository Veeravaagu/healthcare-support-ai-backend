import { describe, expect, it, vi } from 'vitest';

import { getHealth } from '../src/routes/healthRoutes';

describe('getHealth', () => {
  it('returns a healthy response payload', () => {
    const json = vi.fn();

    getHealth({}, { json });

    expect(json).toHaveBeenCalledWith({ ok: true });
  });
});
