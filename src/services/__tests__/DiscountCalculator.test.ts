import { describe, it, expect } from 'vitest';
import { DiscountCalculator, Partner } from '../DiscountCalculator';

describe('DiscountCalculator Service', () => {

  const activePartnerPercentage: Partner = {
    id: '1', name: 'Empresa A', discount_type: 'percentage', discount_value: 20, is_active: true
  };

  const activePartnerFixed: Partner = {
    id: '2', name: 'Empresa B', discount_type: 'fixed', discount_value: 50, is_active: true
  };

  it('deve aplicar desconto percentual corretamente (20% de 200 = final 160)', () => {
    const result = DiscountCalculator.calculate(200, activePartnerPercentage);
    expect(result.originalPrice).toBe(200);
    expect(result.discountApplied).toBe(40);
    expect(result.finalPrice).toBe(160);
  });

  it('deve aplicar desconto fixo corretamente (50 reais de 120 = final 70)', () => {
    const result = DiscountCalculator.calculate(120, activePartnerFixed);
    expect(result.discountApplied).toBe(50);
    expect(result.finalPrice).toBe(70);
  });

  it('não deve aplicar o desconto se o parceiro estiver inativo', () => {
    const inactivePartner: Partner = { ...activePartnerPercentage, is_active: false };
    const result = DiscountCalculator.calculate(200, inactivePartner);
    expect(result.discountApplied).toBe(0);
    expect(result.finalPrice).toBe(200);
  });

  it('não deve aplicar o desconto se o contrato do parceiro estiver expirado', () => {
    const expiredPartner: Partner = { 
      ...activePartnerFixed, 
      contract_expiry: '2023-01-01' // Data no passado
    };
    const result = DiscountCalculator.calculate(150, expiredPartner);
    expect(result.discountApplied).toBe(0);
    expect(result.finalPrice).toBe(150);
  });

  it('deve aplicar desconto se o contrato vence HOJE ou no FUTURO', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const validContractPartner: Partner = { 
      ...activePartnerFixed, 
      contract_expiry: tomorrow.toISOString().split('T')[0]
    };
    const result = DiscountCalculator.calculate(150, validContractPartner);
    expect(result.discountApplied).toBe(50);
    expect(result.finalPrice).toBe(100);
  });

  it('NUNCA deve retornar um preço final negativo caso o desconto fixo seja maior que o produto', () => {
    const result = DiscountCalculator.calculate(30, activePartnerFixed); // Preço 30, Desconto 50
    expect(result.originalPrice).toBe(30);
    expect(result.discountApplied).toBe(30); // Desconto capado ao preço original
    expect(result.finalPrice).toBe(0);     // Mensalidade grátis, mas não negativa
  });

  it('NUNCA deve permitir desconto percentual maior que 100%', () => {
    const maliciousPartner: Partner = { 
      ...activePartnerPercentage, 
      discount_value: 150 // Tentativa de 150% de desconto
    };
    const result = DiscountCalculator.calculate(200, maliciousPartner);
    expect(result.discountApplied).toBe(200); // Limitado a 100% (200 reais)
    expect(result.finalPrice).toBe(0);
  });
});
