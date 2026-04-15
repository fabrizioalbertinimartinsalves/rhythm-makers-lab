export interface BillingConfig {
  fixed_due_day: number;
  allow_prorata: boolean;
  grace_period_days: number;
}

export interface BillingContext {
  baseValue: number;
  enrollmentDate: Date;
  config: BillingConfig;
}

export interface BillingResult {
  finalValue: number;
  prorataAdjustment: number;
  dueDate: Date;
  isProrated: boolean;
}

export interface IBillingStrategy {
  calculate(context: BillingContext): BillingResult;
}
