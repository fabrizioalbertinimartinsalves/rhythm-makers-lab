import { supabase } from "./supabase";

export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'delinquent' | 'inactive';

export interface Subscription {
  id?: string;
  studio_id: string;
  plan_id: string;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  next_billing_date: string;
  last_payment_status: 'paid' | 'pending' | 'failed';
  created_at: string;
  updated_at: string;
}

export const BILLING_CONFIG = {
  DISCOUNTS: {
    monthly: 0,
    quarterly: 0.1, // 10% off
    annual: 0.2,    // 20% off
  },
  GRACE_PERIOD_DAYS: 3,
};

export const calculateSubscriptionPrice = (baseMonthlyPrice: number, cycle: BillingCycle) => {
  const discount = BILLING_CONFIG.DISCOUNTS[cycle];
  const months = cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : 12;
  
  const pricePerMonth = baseMonthlyPrice * (1 - discount);
  const totalForCycle = pricePerMonth * months;
  
  return {
    pricePerMonth,
    totalForCycle,
    discountApplied: discount * 100
  };
};

export const createInitialSubscription = async (studioId: string, planId: string, cycle: BillingCycle, basePrice: number) => {
  const now = new Date();
  
  // Calculate end date based on cycle
  const endDate = new Date(now);
  if (cycle === 'monthly') endDate.setMonth(now.getMonth() + 1);
  else if (cycle === 'quarterly') endDate.setMonth(now.getMonth() + 3);
  else if (cycle === 'annual') endDate.setFullYear(now.getFullYear() + 1);

  const { error } = await supabase
    .from("saas_subscriptions")
    .insert({
      studio_id: studioId,
      plan_id: planId,
      billing_cycle: cycle,
      status: 'active',
      next_billing_date: endDate.toISOString().split('T')[0],
      last_payment_status: 'paid',
    });

  if (error) throw error;
  return true;
};

export const runDelinquencyCheck = async () => {
  const now = new Date();
  const graceDate = new Date(now);
  graceDate.setDate(now.getDate() - BILLING_CONFIG.GRACE_PERIOD_DAYS);
  const graceStr = graceDate.toISOString().split('T')[0];

  // Identificar assinaturas atrasadas
  const { data: overdue, error } = await supabase
    .from("saas_subscriptions")
    .select("id, studio_id")
    .eq("status", "active")
    .lte("next_billing_date", graceStr);

  if (error) throw error;
  if (!overdue || overdue.length === 0) return 0;

  const studioIds = overdue.map(s => s.studio_id);
  const subIds = overdue.map(s => s.id);

  // Mark subscriptions as delinquent
  await supabase
    .from("saas_subscriptions")
    .update({ status: 'delinquent', updated_at: new Date().toISOString() })
    .in("id", subIds);

  // Block studios
  await supabase
    .from("studios")
    .update({ status_assinatura: 'blocked', ativa: false })
    .in("id", studioIds);

  return overdue.length;
};
