import { useState } from "react";

interface CheckoutOptions {
  amount: number; // in BRL (e.g. 150.00)
  description: string;
  transactionId?: string;
  paymentMethods?: ("card" | "boleto" | "pix" | "apple_pay" | "google_pay")[];
  metadata?: Record<string, string>;
  returnPath?: string;
}

export function useStripeCheckout() {
  const [modalOpen, setModalOpen] = useState(false);
  const [checkoutOptions, setCheckoutOptions] = useState<{
    amount_cents: number;
    description: string;
    transaction_id?: string;
    payment_methods: string[];
    metadata: Record<string, string>;
    return_path?: string;
  } | null>(null);

  const checkout = (options: CheckoutOptions) => {
    setCheckoutOptions({
      amount_cents: Math.round(options.amount * 100),
      description: options.description,
      transaction_id: options.transactionId,
      payment_methods: options.paymentMethods || ["card", "boleto"],
      metadata: options.metadata || {},
      return_path: options.returnPath,
    });
    setModalOpen(true);
  };

  const handleModalChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setCheckoutOptions(null);
    }
  };

  return {
    checkout,
    loading: false,
    modalOpen,
    setModalOpen: handleModalChange,
    checkoutOptions,
  };
}
