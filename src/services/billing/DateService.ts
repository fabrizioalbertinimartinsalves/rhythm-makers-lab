import { format, isWeekend, addDays, getDaysInMonth, endOfMonth, startOfMonth, differenceInDays } from 'date-fns';

export class DateService {
  /**
   * Pushes the date to the next business day if it lands on a weekend.
   * Can be extended to support an external holidays API if necessary.
   */
  static getNextBusinessDay(date: Date): Date {
    let cursor = new Date(date);
    while (isWeekend(cursor)) {
      cursor = addDays(cursor, 1);
    }
    return cursor;
  }

  /**
   * Calculates how many days are remaining in the month starting from the given date.
   */
  static getRemainingDaysInMonth(date: Date): number {
    const end = endOfMonth(date);
    // Include the current day
    return differenceInDays(end, date) + 1;
  }

  /**
   * Constructs an exact date object for a given day in a specific month and year.
   */
  static constructDate(year: number, month: number, day: number): Date {
    return new Date(year, month, day);
  }

  /**
   * Formats date for Supabase YYYY-MM-DD
   */
  static toSupabaseDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }
}
