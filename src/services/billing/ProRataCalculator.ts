import { IBillingStrategy, BillingContext, BillingResult } from './IBillingStrategy';
import { DateService } from './DateService';

export class ProRataCalculator implements IBillingStrategy {
  calculate(context: BillingContext): BillingResult {
    const { baseValue, enrollmentDate, config } = context;
    
    if (!config.allow_prorata) {
      return {
        finalValue: baseValue,
        prorataAdjustment: 0,
        dueDate: enrollmentDate, // Or fallback to FixedDate logic depending on the engine
        isProrated: false
      };
    }

    const remainingDays = DateService.getRemainingDaysInMonth(enrollmentDate);
    
    // Formula instructed by the user: (ValorMensal / 30) * DiasRestantes
    const rawProrataVal = (baseValue / 30.0) * remainingDays;
    
    // Ensure we don't charge more than the baseValue or less than 0
    const finalProrataValue = Math.min(Math.max(rawProrataVal, 0), baseValue);
    const adjustment = baseValue - finalProrataValue;

    return {
      finalValue: Number(finalProrataValue.toFixed(2)),
      prorataAdjustment: Number(adjustment.toFixed(2)),
      dueDate: DateService.getNextBusinessDay(enrollmentDate), // Usually payable immediately
      isProrated: true
    };
  }
}
