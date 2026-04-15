export type DiscountType = 'percentage' | 'fixed';

export interface Partner {
  id: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  is_active: boolean;
  contract_expiry?: string | null;
}

export interface DiscountResult {
  originalPrice: number;
  discountApplied: number;
  finalPrice: number;
}

export class DiscountCalculator {
  /**
   * Valida se o parceiro está ativo e com contrato vigente
   */
  public static isPartnerValid(partner: Partner): boolean {
    if (!partner.is_active) return false;
    
    if (partner.contract_expiry) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas datas
      const expiry = new Date(partner.contract_expiry + 'T00:00:00'); // Evita bug de timezone
      
      if (today > expiry) return false;
    }
    
    return true;
  }

  /**
   * Calcula o preço final com base no tipo de desconto do parceiro.
   * Não permite valores finais negativos.
   */
  public static calculate(originalPrice: number, partner?: Partner | null): DiscountResult {
    // Se não houver parceiro ou for inválido, o preço final é o original
    if (!partner || !this.isPartnerValid(partner)) {
      return {
        originalPrice,
        discountApplied: 0,
        finalPrice: originalPrice
      };
    }

    let discountApplied = 0;

    if (partner.discount_type === 'percentage') {
      // Garantia defensiva extra (apesar do DB check)
      const safePercentage = Math.min(Math.max(partner.discount_value, 0), 100);
      discountApplied = originalPrice * (safePercentage / 100);
    } else if (partner.discount_type === 'fixed') {
      discountApplied = partner.discount_value;
    }

    // Evita valores absurdos: o desconto não pode ser maior que o preço original
    discountApplied = Math.min(discountApplied, originalPrice);
    
    const finalPrice = Number(Math.max(originalPrice - discountApplied, 0).toFixed(2));
    
    return {
      originalPrice: Number(originalPrice.toFixed(2)),
      discountApplied: Number(discountApplied.toFixed(2)),
      finalPrice
    };
  }
}
