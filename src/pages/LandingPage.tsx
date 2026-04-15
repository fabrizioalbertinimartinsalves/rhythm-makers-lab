import { useState } from "react";
import { Link } from "react-router-dom";
import { useLandingContent } from "@/hooks/useLandingContent";
import { useSaaSPlans, SaaSPlan, MODULE_LABELS } from "@/hooks/useSaaSPlans";
import { ChevronDown, ChevronUp, Check, Menu, X, Play, ArrowRight, Star } from "lucide-react";
import { PricingCard, DiscountRules } from "@/components/PricingCard";

export default function LandingPage() {
  const { data: c } = useLandingContent();
  const { data: saasPlans = [] } = useSaaSPlans();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const discountRules: DiscountRules = {
    mensal: 0,
    trimestral: 10,
    anual: 20
  };

  const teal = c?.primary_color || "#008080";
  const bg = "#F7F3EC"; // Mantendo fixo ou pegando de outra chave se necessário

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: bg, color: "#1a1a2e" }}>
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── NAVBAR ── */}
      <nav style={{ background: "white", borderBottom: "1px solid #e8e0d5", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {c?.header_logo_square_url ? (
              <img src={c.header_logo_square_url} alt="Logo" style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 8 }} />
            ) : (
              <div style={{ width: 36, height: 36, background: teal, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: 800, fontSize: 18 }}>
                  {c?.brand_name ? c.brand_name.charAt(0).toUpperCase() : "K"}
                </span>
              </div>
            )}
            
            {c?.header_logo_rect_url ? (
              <img src={c.header_logo_rect_url} alt={c?.brand_name || "Kineos"} style={{ height: 32, width: "auto", objectFit: "contain" }} />
            ) : (
              <span style={{ fontWeight: 800, fontSize: 20, color: "#1a1a2e" }}>
                {c?.brand_name || "Kineos"}
              </span>
            )}
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex" style={{ alignItems: "center", gap: 32 }}>
            <a href={c?.header_link1_url || "#features"} style={{ color: "#555", fontWeight: 500, textDecoration: "none", fontSize: 15 }}>
              {c?.header_link1_text || "Funcionalidades"}
            </a>
            {[["Como Funciona","#how"],["Depoimentos","#testimonials"],["Planos","#pricing"]].map(([label, href]) => (
              <a key={href} href={href} style={{ color: "#555", fontWeight: 500, textDecoration: "none", fontSize: 15 }}
                onMouseEnter={e => (e.target as any).style.color = teal}
                onMouseLeave={e => (e.target as any).style.color = "#555"}>
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex" style={{ gap: 12, alignItems: "center" }}>
            <Link to="/login" style={{ color: teal, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>Entrar</Link>
            <a href={c?.header_cta_url || "/login"} style={{ background: teal, color: "white", padding: "10px 22px", borderRadius: 8, fontWeight: 700, textDecoration: "none", fontSize: 15, boxShadow: `0 4px 12px ${teal}40` }}>
              {c?.header_cta_text || "Acessar o Painel"}
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div style={{ background: "white", padding: "16px 24px", borderTop: "1px solid #e8e0d5" }}>
            {[["Funcionalidades","#features"],["Como Funciona","#how"],["Depoimentos","#testimonials"],["Planos","#pricing"]].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "12px 0", color: "#555", fontWeight: 500, textDecoration: "none", borderBottom: "1px solid #f0e8dc" }}>{label}</a>
            ))}
            <div style={{ paddingTop: 16, display: "flex", gap: 12 }}>
              <Link to="/login" style={{ flex: 1, textAlign: "center", padding: "10px", border: `1px solid ${teal}`, color: teal, borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>Entrar</Link>
              <a href="#pricing" style={{ flex: 1, textAlign: "center", padding: "10px", background: teal, color: "white", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>Começar Grátis</a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: "white", padding: "80px 24px 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="hero-grid">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", background: `${teal}15`, border: `1px solid ${teal}30`, borderRadius: 50, padding: "6px 16px", marginBottom: 24 }}>
              <span style={{ color: teal, fontWeight: 600, fontSize: 13 }}>🏆 O sistema #1 para Estúdios de Pilates</span>
            </div>
            <h1 style={{ fontSize: "clamp(38px, 5vw, 58px)", fontWeight: 900, lineHeight: 1.1, color: "#0f172a", marginBottom: 24 }}>
              {c?.hero_title || "Gestão simples e fluida para o seu estúdio crescer."}
              <span style={{ color: teal, textDecoration: "underline", textDecorationColor: `${teal}60`, textUnderlineOffset: 6, display: "block" }}>
                {c?.hero_highlight_text || ""}
              </span>
            </h1>
            <p style={{ fontSize: 18, color: "#64748b", lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
              {c?.hero_subtitle || "Automatize agendamentos, controle o financeiro sem dores de cabeça e encante seus alunos com o app exclusivo do Kineos."}
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <a href={c?.hero_cta_primary_url || "/cadastro"} style={{ background: teal, color: "white", padding: "16px 36px", borderRadius: 12, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 10, transition: "all 0.3s", boxShadow: `0 20px 40px ${teal}40` }}>
                  {c?.hero_cta_primary_text || "Começar Gratuitamente"} <ArrowRight size={20} />
                </a>
              <a href={c?.hero_cta_secondary_link || "#"} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#1a1a2e", padding: "15px 28px", borderRadius: 10, fontWeight: 700, fontSize: 16, border: "2px solid #e2e8f0", cursor: "pointer", textDecoration: "none" }}>
                <Play size={16} fill="currentColor" /> {c?.hero_cta_secondary || "Ver Demonstração"}
              </a>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {["Sem cartão de crédito", "Cancele quando quiser"].map(txt => (
                <span key={txt} style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 14 }}>
                  <Check size={14} color={teal} strokeWidth={3} /> {txt}
                </span>
              ))}
            </div>
          </div>
          {/* Hero Visual */}
          <div style={{ position: "relative" }}>
            {c?.hero_placeholder_img ? (
              <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.15)" }}>
                <img src={c.hero_placeholder_img} alt="Plataforma Kineos" style={{ width: "100%", height: "auto", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.1) 0%, transparent 100%)" }} />
              </div>
            ) : (
              <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)", borderRadius: 20, padding: 32, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0", position: "relative", overflow: "hidden" }}>
                {/* Mock Dashboard */}
                <div style={{ width: "100%", background: "white", borderRadius: 12, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[teal, "#f59e0b", "#3b82f6"].map((col, i) => (
                      <div key={i} style={{ flex: 1, background: `${col}15`, borderRadius: 8, padding: "12px 16px", borderLeft: `3px solid ${col}` }}>
                        <div style={{ height: 8, background: col, borderRadius: 4, width: "60%", marginBottom: 6 }} />
                        <div style={{ height: 6, background: "#e2e8f0", borderRadius: 4, width: "80%" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 120, background: "#f8fafc", borderRadius: 8, marginBottom: 12, display: "flex", alignItems: "flex-end", padding: "12px 16px", gap: 6 }}>
                    {[60,80,45,95,70,85,55,100,75,90].map((h, i) => (
                      <div key={i} style={{ flex: 1, background: i === 7 ? teal : `${teal}40`, borderRadius: "4px 4px 0 0", height: `${h}%`, transition: "height 0.3s" }} />
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[["Alunos Ativos", c?.stats_students_count || "127", teal],["Aulas Hoje","8","#f59e0b"],["Faturamento","R$ 4.2k","#3b82f6"],["Inadimplência","2%","#ef4444"]].map(([l,v,col]) => (
                      <div key={l} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: col as string }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Floating Card */}
                <div style={{ position: "absolute", bottom: 20, right: -10, background: "white", borderRadius: 12, padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
                  <div style={{ width: 36, height: 36, background: `${teal}20`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={18} color={teal} strokeWidth={3} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Pagamento Recebido</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Plano Mensal — R$ 250,00</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <style>{`@media (max-width: 768px) { .hero-grid { grid-template-columns: 1fr !important; } }`}</style>
      </section>

      {/* ── NUMBERS BAR ── */}
      <section style={{ background: teal, padding: "48px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, textAlign: "center" }} className="numbers-grid">
          {[
            {n: c?.stats_students_count || "127", l: c?.stats_students_text || "Alunos Ativos"},
            {n: c?.stats_studios_count || "15", l: c?.stats_studios_text || "Estúdios Cadastrados"},
            {n: "98%", l: "Taxa de satisfação"},
            {n: "14 dias", l: "Teste gratuito"},
          ].map(({n, l}) => (
            <div key={l}>
              <div style={{ fontSize: 40, fontWeight: 900, color: "white", marginBottom: 4 }}>{n}</div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)" }}>{l}</div>
            </div>
          ))}
        </div>
        <style>{`@media (max-width: 600px) { .numbers-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "96px 24px", background: bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", background: `${teal}15`, color: teal, borderRadius: 50, padding: "6px 16px", fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>
              {c?.features_tag || "TUDO QUE VOCÊ PRECISA"}
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#0f172a", marginBottom: 16 }}>
              {c?.features_title || "Funcionalidades desenhadas para a realidade do Pilates"}
            </h2>
            <p style={{ fontSize: 18, color: "#64748b", maxWidth: 600, margin: "0 auto" }}>
              {c?.features_subtitle || "Esqueça planilhas confusas. O Kineos unifica sua gestão para você focar no que importa: seus alunos."}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              { icon: c?.func_feature1_icon || "🗓️", title: c?.func_feature1_title || "Agenda & Grade Inteligente", desc: c?.func_feature1_desc || "Fácil agendamento e reposição com app para alunos." },
              { icon: "💳", title: "Faturamento 100% Automático", desc: "Motor de cobrança recorrente com geração de faturas automática." },
              { icon: "🛡️", title: "Contratos & Inteligência", desc: "Contratos gerados em segundos e controle total de vagas do estúdio." },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: "white", borderRadius: 16, padding: 28, border: "1px solid #e8e0d5", transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
                onMouseEnter={e => { (e.currentTarget as any).style.transform = "translateY(-4px)"; (e.currentTarget as any).style.boxShadow = "0 16px 40px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as any).style.transform = "none"; (e.currentTarget as any).style.boxShadow = "none"; }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{title}</h3>
                <p style={{ color: "#64748b", lineHeight: 1.6, fontSize: 15 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: "96px 24px", background: "white" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", background: `${teal}15`, color: teal, borderRadius: 50, padding: "6px 16px", fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>
              {c?.how_tag || "COMO FUNCIONA"}
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#0f172a", marginBottom: 16 }}>
              {c?.how_title || "Três passos para a liberdade na gestão"}
            </h2>
            <p style={{ fontSize: 18, color: "#64748b", maxWidth: 560, margin: "0 auto" }}>
              {c?.how_subtitle || "A transição para o Kineos é suave e intuitiva. Nossa equipe ajuda na migração dos seus dados."}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {[
              { n: "01", title: c?.how_1_title || "Cadastre seu Estúdio", desc: c?.how_1_desc || "Crie sua conta em menos de 2 minutos. Insira os dados básicos e configure seus planos e horários." },
              { n: "02", title: c?.how_2_title || "Convide seus Alunos", desc: c?.how_2_desc || "Importe sua lista de alunos ou envie um link para que eles baixem o app e façam o próprio cadastro." },
              { n: "03", title: c?.how_3_title || "Gerencie com Facilidade", desc: c?.how_3_desc || "Pronto! Agora você tem controle total. Foque nas aulas enquanto o sistema cuida das cobranças e agendamentos." },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
                <div style={{ width: 64, height: 64, background: `${teal}15`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${teal}30` }}>
                  <span style={{ fontWeight: 900, fontSize: 20, color: teal }}>{n}</span>
                </div>
                <div style={{ paddingTop: 8 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{title}</h3>
                  <p style={{ color: "#64748b", lineHeight: 1.7, fontSize: 16 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: "96px 24px", background: bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", background: `${teal}15`, color: teal, borderRadius: 50, padding: "6px 16px", fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>
              {c?.testimonials_tag || "DEPOIMENTOS"}
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#0f172a" }}>
              {c?.testimonials_title || "Histórias reais de estúdios reais"}
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              { quote: c?.testim_quote1_text || "O Kineos mudou a gestão do meu estúdio.", name: c?.testim_quote1_name || "Ana Luiza" },
            ].map(({ quote, name }) => (
              <div key={name} style={{ background: "white", borderRadius: 16, padding: 28, border: "1px solid #e8e0d5" }}>
                <div style={{ color: "#fbbf24", fontSize: 18, marginBottom: 16 }}>★★★★★</div>
                <blockquote style={{ color: "#374151", lineHeight: 1.7, fontSize: 15, marginBottom: 20, fontStyle: "italic" }}>"{quote}"</blockquote>
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "96px 24px", background: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", background: `${teal}15`, color: teal, borderRadius: 50, padding: "6px 16px", fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>
              {c?.pricing_tag || "PLANOS E PREÇOS"}
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#0f172a", marginBottom: 16 }}>
              {c?.pricing_title || "Investimento que se paga logo no primeiro mês"}
            </h2>
            <p style={{ fontSize: 18, color: "#64748b" }}>
              {c?.pricing_subtitle || "Comece grátis por 14 dias em qualquer plano. Sem cartão de crédito."}
            </p>
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
            gap: 24, 
            alignItems: "stretch",
            justifyContent: "center",
            maxWidth: saasPlans.length === 2 ? 800 : 1100,
            margin: "0 auto"
          }}>
            {saasPlans
              .filter(p => p.ativo)
              .sort((a, b) => {
                const orderA = parseInt(c?.[`plan_${a.id}_order`] || "0");
                const orderB = parseInt(c?.[`plan_${b.id}_order`] || "0");
                return orderA - orderB;
              })
              .map((plan) => {
                const isFeatured = c?.[`plan_${plan.id}_featured`] === "true";
                const ctaText = c?.[`plan_${plan.id}_cta_text`] || "Começar Agora";
                const ctaLink = c?.[`plan_${plan.id}_cta_link`] || `/cadastro?plan=${plan.id}`;
                
                // Overrides
                const planName = c?.[`plan_${plan.id}_name`] || plan.nome;
                const planPrice = c?.[`plan_${plan.id}_price`] || plan.valor_mensal;
                const planDesc = c?.[`plan_${plan.id}_desc`] || plan.descricao;
                const limitStudents = c?.[`plan_${plan.id}_limit_students`] ?? plan.limite_alunos;
                const limitInstructors = c?.[`plan_${plan.id}_limit_instructors`] ?? plan.limite_instrutores;
                const limitClasses = c?.[`plan_${plan.id}_limit_classes`] ?? plan.limite_turmas;
                const planModules = (c?.[`plan_${plan.id}_modules`] || (Array.isArray(plan.modulos) ? plan.modulos.join(",") : "")).split(",").filter(Boolean);

                const features = [
                  `Até ${limitStudents || "∞"} alunos ativos`,
                  `Até ${limitInstructors || "∞"} instrutores`,
                  `Até ${limitClasses || "∞"} turmas`,
                  ...planModules.map(m => MODULE_LABELS[m] || m)
                ];

                return (
                  <PricingCard
                    key={plan.id}
                    plan={plan}
                    isFeatured={isFeatured}
                    discountRules={discountRules}
                    teal={teal}
                    ctaText={ctaText}
                    ctaLink={ctaLink}
                    planName={planName}
                    planPrice={planPrice}
                    planDesc={planDesc}
                    features={features}
                  />
                );
              })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "96px 24px", background: bg }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#0f172a", marginBottom: 12 }}>
              {c?.faq_title || "Perguntas Frequentes"}
            </h2>
            <p style={{ fontSize: 18, color: "#64748b" }}>{c?.faq_subtitle || "Ainda com dúvidas? Nós respondemos as mais comuns."}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { q: c?.faq_q1_title || "Preciso instalar algum programa?", a: c?.faq_q1_answer || "Não, o Kineos é 100% online." },
            ].map(({ q, a }, i) => (
              <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e8e0d5", overflow: "hidden" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 16 }}>{q}</span>
                  {openFaq === i ? <ChevronUp color={teal} size={20} /> : <ChevronDown color="#94a3b8" size={20} />}
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 20px", color: "#64748b", lineHeight: 1.7 }}>{a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "96px 24px", background: teal }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, color: "white", marginBottom: 20 }}>
            {c?.cta_title || "Pronto para transformar seu estúdio?"}
          </h2>
          <p style={{ fontSize: 20, color: "rgba(255,255,255,0.85)", marginBottom: 40, lineHeight: 1.6 }}>
            {c?.cta_subtitle || "Junte-se a centenas de estúdios que já simplificaram sua gestão. Comece seu teste gratuito hoje, sem cartão de crédito."}
          </p>
          <a href={c?.cta_button_link || "#pricing"} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "white", color: teal, padding: "18px 36px", borderRadius: 12, fontWeight: 800, fontSize: 18, textDecoration: "none", boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}>
            {c?.cta_button || "Começar Grátis Agora"} <ArrowRight size={20} />
          </a>
          <p style={{ marginTop: 20, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
            {c?.cta_trust || "Sem cartão de crédito · Cancele quando quiser · Suporte incluso"}
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#0f172a", padding: "64px 24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }} className="footer-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                {c?.header_logo_square_url ? (
                  <img src={c.header_logo_square_url} alt="Logo" style={{ height: 32, width: 32, objectFit: "contain", borderRadius: 6 }} />
                ) : (
                  <div style={{ width: 32, height: 32, background: teal, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "white", fontWeight: 800, fontSize: 16 }}>
                      {c?.brand_name ? c.brand_name.charAt(0).toUpperCase() : "K"}
                    </span>
                  </div>
                )}
                
                {c?.header_logo_rect_url ? (
                  <img src={c.header_logo_rect_url} alt={c?.brand_name || "Kineos"} style={{ height: 24, width: "auto", objectFit: "contain" }} />
                ) : (
                  <span style={{ color: "white", fontWeight: 800, fontSize: 18 }}>{c?.brand_name || "Kineos"}</span>
                )}
              </div>
              <p style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: 14 }}>
                {c?.footer_about || "O Kineos é o sistema de gestão mais completo e simples para estúdios de Pilates do Brasil."}
              </p>
            </div>
            {[
              { title: "Produto", links: ["Funcionalidades","Planos e Preços","App para Alunos","Integrações"] },
              { title: "Empresa", links: ["Sobre Nós","Blog","Carreiras","Contato"] },
              { title: "Suporte", links: ["Central de Ajuda","WhatsApp","Status do Sistema","Política de Privacidade"] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 style={{ color: "white", fontWeight: 700, marginBottom: 16, fontSize: 15 }}>{title}</h4>
                {links.map(l => {
                  const hrefMap: Record<string, string> = {
                    "Funcionalidades": "#features",
                    "Planos e Preços": "#pricing",
                    "Sobre Nós": "/sobre",
                    "Blog": "/blog",
                    "Carreiras": "/carreiras",
                    "Contato": "/contato",
                    "Central de Ajuda": "/ajuda",
                    "WhatsApp": "/whatsapp",
                    "Status do Sistema": "/status",
                    "Política de Privacidade": "/privacidade"
                  };
                  return (
                    <a key={l} href={hrefMap[l] || "#"} style={{ display: "block", color: "#94a3b8", textDecoration: "none", marginBottom: 10, fontSize: 14 }}
                      onMouseEnter={e => (e.target as any).style.color = teal}
                      onMouseLeave={e => (e.target as any).style.color = "#94a3b8"}>
                      {l}
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, textAlign: "center", color: "#475569", fontSize: 14 }}>
            {c?.footer_placeholder_text || "© 2024 Kineos. Todos os direitos reservados."}
          </div>
        </div>
        <style>{`@media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
      </footer>
    </div>
  );
}
