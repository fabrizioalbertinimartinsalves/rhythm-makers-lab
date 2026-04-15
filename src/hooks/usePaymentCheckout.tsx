import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CheckoutOptions {
  amount: number; // em BRL (ex: 150.00)
  description: string;
  transactionId?: string;
  paymentMethods?: string[];
  metadata?: Record<string, string>;
  returnPath?: string;
  payerName?: string;
  payerEmail?: string;
}

export function usePaymentCheckout() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutOptions, setCheckoutOptions] = useState<{
    amount: number;
    description: string;
    transaction_id: string;
    metadata: Record<string, string>;
    return_path: string;
    payer_name?: string;
    payer_email?: string;
  } | null>(null);

  const checkout = (options: CheckoutOptions) => {
    setCheckoutOptions({
      amount: options.amount,
      description: options.description,
      transaction_id: options.transactionId || crypto.randomUUID(),
      metadata: options.metadata || {},
      return_path: options.returnPath || "admin/dashboard",
      payer_name: options.payerName,
      payer_email: options.payerEmail
    });
    setModalOpen(true);
  };

  const handleModalChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) setCheckoutOptions(null);
  };

  return {
    checkout,
    loading,
    setLoading,
    modalOpen,
    setModalOpen: handleModalChange,
    checkoutOptions,
  };
}
