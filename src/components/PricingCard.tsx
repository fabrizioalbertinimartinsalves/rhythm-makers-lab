import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export interface DiscountRules {
  mensal: number;
  trimestral: number;
  anual: number;
}

interface PricingCardProps {
  plan: any;
  isFeatured: boolean;
  discountRules: DiscountRules;
  teal: string;
  ctaText: string;
  ctaLink: string;
  planName: string;
  planPrice: string | number;
  planDesc: string;
  features: string[];
}

export function PricingCard({
  plan,
  isFeatured,
  discountRules,
  teal,
  ctaText,
  ctaLink,
  planName,
  planPrice,
  planDesc,
  features,
}: PricingCardProps) {
  const [cycle, setCycle] = useState<"mensal" | "trimestral" | "anual">("mensal");
  const basePrice = typeof planPrice === "string" ? parseFloat(planPrice.replace(",", ".")) : planPrice;

  const calculatePrice = (type: "mensal" | "trimestral" | "anual") => {
    const discount = discountRules[type] / 100;
    if (type === "mensal") return basePrice;
    if (type === "trimestral") return (basePrice * 3 * (1 - discount));
    if (type === "anual") return (basePrice * 12 * (1 - discount));
    return basePrice;
  };

  const getEquivalentMonthly = (type: "mensal" | "trimestral" | "anual") => {
    const total = calculatePrice(type);
    const months = type === "mensal" ? 1 : type === "trimestral" ? 3 : 12;
    return (total / months).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div
      style={{
        background: isFeatured ? teal : "white",
        borderRadius: 24,
        padding: "40px 32px",
        border: isFeatured ? `2px solid ${teal}` : "1px solid #e8e0d5",
        transform: isFeatured ? "scale(1.04)" : "none",
        boxShadow: isFeatured ? `0 24px 60px ${teal}40` : "0 4px 20px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: isFeatured ? 10 : 1,
        transition: "all 0.3s ease",
      }}
    >
      {isFeatured && (
        <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)" }}>
          <span style={{ background: "#fbbf24", color: "#451a03", fontSize: 11, fontWeight: 900, padding: "6px 14px", borderRadius: 50, boxShadow: "0 4px 12px rgba(251,191,36,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>⭐ MAIS ESCOLHIDO</span>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: isFeatured ? "white" : "#0f172a" }}>{planName}</h3>
        <p style={{ color: isFeatured ? "rgba(255,255,255,0.8)" : "#64748b", fontSize: 14, lineHeight: 1.5 }}>{planDesc}</p>
      </div>

      {/* Accordion Cycles */}
      <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}>
        {(["mensal", "trimestral", "anual"] as const).map((c) => {
          const isActive = cycle === c;
          const discount = discountRules[c];
          
          return (
            <div 
              key={c}
              onClick={() => setCycle(c)}
              style={{
                background: isActive 
                  ? (isFeatured ? "rgba(255,255,255,0.15)" : `${teal}10`) 
                  : (isFeatured ? "rgba(255,255,255,0.05)" : "transparent"),
                border: `1px solid ${isActive ? (isFeatured ? "white" : teal) : (isFeatured ? "rgba(255,255,255,0.1)" : "#e2e8f0")}`,
                borderRadius: 14,
                padding: "12px 16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ 
                  fontSize: 14, 
                  fontWeight: isActive ? 700 : 500, 
                  color: isFeatured ? "white" : (isActive ? teal : "#64748b"),
                  textTransform: "capitalize"
                }}>
                  {c}
                </span>
                {discount > 0 && (
                  <span style={{ 
                    background: "#ef4444", 
                    color: "white", 
                    fontSize: 10, 
                    fontWeight: 800, 
                    padding: "2px 8px", 
                    borderRadius: 50 
                  }}>
                    {discount}% OFF
                  </span>
                )}
              </div>
              
              {isActive && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${isFeatured ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 13, color: isFeatured ? "rgba(255,255,255,0.7)" : "#94a3b8", marginBottom: 4 }}>
                    {c === "mensal" ? "Cobrança mensal" : `Total: R$ ${formatCurrency(calculatePrice(c))} / ${c === "trimestral" ? "trimestre" : "ano"}`}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: isFeatured ? "white" : "#0f172a" }}>
                      R$ {getEquivalentMonthly(c)}
                    </span>
                    <span style={{ fontSize: 12, color: isFeatured ? "rgba(255,255,255,0.6)" : "#64748b" }}>
                      /mês
                    </span>
                  </div>
                  {c !== "mensal" && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: isFeatured ? "white" : teal, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Apenas R$ {(calculatePrice(c) / (c === "trimestral" ? 90 : 365)).toFixed(2)} por dia
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, marginBottom: 32 }}>
        {features.map((f, idx) => (
          <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ 
              background: isFeatured ? "white" : `${teal}15`, 
              borderRadius: "50%", 
              width: 18, 
              height: 18, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2
            }}>
              <Check size={12} color={teal} strokeWidth={4} />
            </div>
            <span style={{ fontSize: 14, color: isFeatured ? "rgba(255,255,255,0.9)" : "#374151", lineHeight: 1.4 }}>{f}</span>
          </div>
        ))}
      </div>

      <a
        href={`${ctaLink}&cycle=${cycle}`}
        className="pricing-cta"
        style={{
          display: "block",
          textAlign: "center",
          padding: "16px",
          borderRadius: 14,
          background: isFeatured ? "white" : teal,
          color: isFeatured ? teal : "white",
          fontWeight: 800,
          fontSize: 16,
          textDecoration: "none",
          boxShadow: isFeatured ? "0 10px 25px rgba(255,255,255,0.2)" : `0 10px 25px ${teal}40`,
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as any).style.transform = "translateY(-2px)";
          (e.currentTarget as any).style.boxShadow = isFeatured ? "0 15px 30px rgba(255,255,255,0.3)" : `0 15px 30px ${teal}60`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as any).style.transform = "translateY(0)";
          (e.currentTarget as any).style.boxShadow = isFeatured ? "0 10px 25px rgba(255,255,255,0.2)" : `0 10px 25px ${teal}40`;
        }}
      >
        {ctaText}
      </a>
    </div>
  );
}
