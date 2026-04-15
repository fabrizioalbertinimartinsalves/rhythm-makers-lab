import { describe, it, expect } from 'vitest';
import { BillingEngine } from '../billing/BillingEngine';

describe('BillingEngine - Fintech Rule Testing', () => {
  const engine = new BillingEngine();

  const standardConfig = {
    fixed_due_day: 10,
    allow_prorata: true,
    grace_period_days: 0
  };

  it('FixedDate: Matrícula exata no dia ou antes do vencimento cobra no mês atual', () => {
    // Enrolled on Mach 5th
    const enrollmentDate = new Date(2026, 2, 5);
    const result = engine.processEnrollmentInvoice(100, enrollmentDate, standardConfig, 'a_combinar');

    // Due date should be March 10th
    expect(result.dueDate.getDate()).toBe(10);
    expect(result.dueDate.getMonth()).toBe(2);
    expect(result.finalValue).toBe(100);
    expect(result.isProrated).toBe(false);
  });

  it('FixedDate: Matrícula após o vencimento transfere fatura para mês subsequente', () => {
    // Enrolled on March 15th
    const enrollmentDate = new Date(2026, 2, 15);
    const result = engine.processEnrollmentInvoice(100, enrollmentDate, standardConfig, 'a_combinar');

    // Due Date should be April 10th
    expect(result.dueDate.getDate()).toBe(10);
    expect(result.dueDate.getMonth()).toBe(3); // April
    expect(result.finalValue).toBe(100);
  });

  it('ProRata: Cálculo Pro Rata de matrícula distribui proporcionalmente', () => {
    // Enrolled on Mach 15th. March has 31 days. Remaining: 17.
    // Base value 300. Formula: (300 / 30) = 10 per day. 10 * 17 = 170.
    const enrollmentDate = new Date(2026, 2, 15);
    const result = engine.processEnrollmentInvoice(300, enrollmentDate, standardConfig, 'imediato');

    expect(result.isProrated).toBe(true);
    // Adjustment = 300 - 170 = 130
    expect(result.prorataAdjustment).toBe(130);
    expect(result.finalValue).toBe(170);
    
    // Due Date is immediate (meaning the next business day from enrollmentDate, which is March 16th if weekend or 15th if weekday)
    // 2026-03-15 is Sunday. So it should push to March 16th (Monday)
    expect(result.dueDate.getDate()).toBe(16);
  });

  it('ProRata: Ignora pro-rata se desabilitado na configuração', () => {
    const enrollmentDate = new Date(2026, 2, 15);
    const configSemProRata = { ...standardConfig, allow_prorata: false };

    const result = engine.processEnrollmentInvoice(300, enrollmentDate, configSemProRata, 'imediato');

    expect(result.isProrated).toBe(false);
    expect(result.finalValue).toBe(300);
    expect(result.prorataAdjustment).toBe(0);
  });

});
