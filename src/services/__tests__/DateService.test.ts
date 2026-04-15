import { describe, it, expect } from 'vitest';
import { DateService } from '../billing/DateService';

describe('DateService', () => {
  it('should push a weekend date to the next business day', () => {
    // 2026-03-28 is a Saturday
    const saturday = new Date(2026, 2, 28);
    const result = DateService.getNextBusinessDay(saturday);

    // Should be Monday, 2026-03-30
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(30);
  });

  it('should not push a weekday to next week', () => {
    // 2026-03-30 is a Monday
    const monday = new Date(2026, 2, 30);
    const result = DateService.getNextBusinessDay(monday);

    expect(result.getDate()).toBe(30);
  });

  it('should correctly calculate remaining days in month', () => {
    // March has 31 days. From March 15th to end of month.
    // 31 - 15 = 16. Plus the current day = 17.
    const midMonth = new Date(2026, 2, 15);
    const days = DateService.getRemainingDaysInMonth(midMonth);
    
    expect(days).toBe(17);
  });
});
