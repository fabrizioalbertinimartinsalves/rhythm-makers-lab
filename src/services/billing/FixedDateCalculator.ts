import { IBillingStrategy, BillingContext, BillingResult } from './IBillingStrategy';
import { DateService } from './DateService';

export class FixedDateCalculator implements IBillingStrategy {
  calculate(context: BillingContext): BillingResult {
    const { baseValue, enrollmentDate, config } = context;
    const year = enrollmentDate.getFullYear();
    const month = enrollmentDate.getMonth();
    
    // Create the proposed due date for this month
    let proposedDue = DateService.constructDate(year, month, config.fixed_due_day);
    
    // If enrollment is strictly after the fixed due day, push it to next month
    if (enrollmentDate > proposedDue) {
      proposedDue = DateService.constructDate(year, month + 1, config.fixed_due_day);
    }
    
    // Adjust if it lands on a weekend/holiday
    const finalDueDate = DateService.getNextBusinessDay(proposedDue);

    return {
      finalValue: baseValue, // FixedDateCalculator alone doesn't change the value
      prorataAdjustment: 0,
      dueDate: finalDueDate,
      isProrated: false
    };
  }
}
