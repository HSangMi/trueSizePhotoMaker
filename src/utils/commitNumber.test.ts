import { describe, expect, it } from 'vitest';
import { parseCommitNumber } from '../components/CommitNumberInput';

describe('parseCommitNumber', () => {
  it('rejects incomplete or invalid drafts', () => {
    expect(parseCommitNumber('', 0, 1)).toBeNull();
    expect(parseCommitNumber('   ', 0.1, 1)).toBeNull();
    expect(parseCommitNumber('.', 0, 1)).toBeNull();
    expect(parseCommitNumber('-', 0, 1)).toBeNull();
    expect(parseCommitNumber('abc', 0, 1)).toBeNull();
    expect(parseCommitNumber('1e2', 0, 1)).toBeNull();
    expect(parseCommitNumber('3.', 0, 1)).toBeNull();
    expect(parseCommitNumber('-1', 0, 1)).toBeNull();
    expect(parseCommitNumber('0', 0.1, 1)).toBeNull();
  });

  it('accepts valid values and rounds to decimals', () => {
    expect(parseCommitNumber('3', 0.1, 1)).toBe(3);
    expect(parseCommitNumber('3.5', 0.1, 1)).toBe(3.5);
    expect(parseCommitNumber('3.56', 0.1, 1)).toBe(3.6);
    expect(parseCommitNumber('0', 0, 1)).toBe(0);
    expect(parseCommitNumber('2.0', 0, 1)).toBe(2);
  });
});
