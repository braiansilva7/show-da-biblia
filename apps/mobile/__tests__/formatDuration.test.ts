import { formatDuration } from '../utils/formatDuration';

describe('formatDuration', () => {
  it('formats durations as minutes and seconds', () => {
    expect(formatDuration(127)).toBe('02:07');
    expect(formatDuration(9)).toBe('00:09');
  });

  it('uses a neutral value when there is no eligible game', () => {
    expect(formatDuration(null)).toBe('--');
    expect(formatDuration(-1)).toBe('--');
  });
});
