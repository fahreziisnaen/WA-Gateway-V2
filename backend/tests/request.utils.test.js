import { describe, it, expect } from 'vitest';
import { getSourceIp } from '../src/utils/request.utils.js';

function makeReq({ forwarded = '', remoteAddress = '' } = {}) {
  return {
    headers: { 'x-forwarded-for': forwarded },
    socket: { remoteAddress },
  };
}

describe('getSourceIp', () => {
  it('returns first IP from x-forwarded-for', () => {
    expect(getSourceIp(makeReq({ forwarded: '203.0.113.1, 10.0.0.1' }))).toBe('203.0.113.1');
  });

  it('falls back to socket remoteAddress when no forwarded header', () => {
    expect(getSourceIp(makeReq({ remoteAddress: '10.0.0.5' }))).toBe('10.0.0.5');
  });

  it('returns "unknown" when neither source is available', () => {
    expect(getSourceIp(makeReq())).toBe('unknown');
  });

  it('strips leading/trailing whitespace from forwarded IP', () => {
    expect(getSourceIp(makeReq({ forwarded: '  192.168.1.1  ' }))).toBe('192.168.1.1');
  });
});
