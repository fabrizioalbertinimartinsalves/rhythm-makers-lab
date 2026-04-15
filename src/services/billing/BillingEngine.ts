import { BillingConfig, BillingContext, BillingResult } from './IBillingStrategy';
import { FixedDateCalculator } from './FixedDateCalculator';
import { ProRataCalculator } from './ProRataCalculator';
import { DateService } from './DateService';

export type PaymentMethodType = 'imediato' | 'a_combinar';

export class BillingEngine {
  private fixedStrategy: FixedDateCalculator;
  private prorataStrategy: ProRataCalculator;

  constructor() {
    this.fixedStrategy = new FixedDateCalculator();
    this.prorataStrategy = new ProRataCalculator();
  }

  /**
   * Orchestrates the billing rule based on the selected payment method.
   * If "a_combinar" -> Posterior -> Uses FixedDateCalculator.
   * If "imediato" -> Ato da Matricula -> Uses ProRataCalculator (if config allows it).
   */
  processEnrollmentInvoice(
    baseValue: number,
    enrollmentDate: Date,
    config: BillingConfig,
    paymentMethod: PaymentMethodType
  ): BillingResult {
    const context: BillingContext = { baseValue, enrollmentDate, config };

    if (paymentMethod === 'a_combinar') {
      // Payment happens on the fixed date (Posterior)
      const result = this.fixedStrategy.calculate(context);
      return result;
    } else {
      // Payment happens immediately (Ato da Matrícula)
      if (config.allow_prorata) {
        return this.prorataStrategy.calculate(context);
      } else {
        // Immediate but no pro-rata means they pay full price today
        return {
          finalValue: baseValue,
          prorataAdjustment: 0,
          dueDate: DateService.getNextBusinessDay(enrollmentDate),
          isProrated: false,
        };
      }
    }
  }
}
