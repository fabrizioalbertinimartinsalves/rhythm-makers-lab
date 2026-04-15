import { useParams, Navigate } from "react-router-dom";
import { usePageContent } from "@/hooks/usePageContent";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Loader2, ArrowRight, MessageCircle, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Contact from "./Contact"; // Reuse contact form

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading } = usePageContent(slug || "");
  const { data: landing } = useLandingContent();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!page) {
    return <Navigate to="/404" replace />;
  }

  const teal = landing?.primary_color || "#008080";
  const bg = "#F7F3EC";

  const renderSection = (section: any, index: number) => {
    switch (section.type) {
      case "text":
      case "simple_text":
        return (
          <section key={index} className="py-16 px-6 max-w-4xl mx-auto">
            <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
          </section>
        );
      
      case "rich_text":
        return (
          <section key={index} className="py-16 px-6 max-w-4xl mx-auto prose prose-slate prose-lg" 
            dangerouslySetInnerHTML={{ __html: section.content }} 
          />
        );

      case "stats":
        return (
          <section key={index} className="py-16 px-6 bg-white border-y border-slate-100">
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
              {section.items?.map((item: any, i: number) => (
                <div key={i} className="text-center space-y-2">
                  <div className="text-4xl font-black text-slate-900 tracking-tighter" style={{ color: teal }}>{item.value}</div>
                  <div className="text-sm font-bold uppercase tracking-widest text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>
          </section>
        );

      case "faq":
        return (
          <section key={index} className="py-16 px-6 max-w-3xl mx-auto">
            <div className="space-y-4">
              {section.items?.map((item: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all">
                  <button 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="font-bold text-slate-900">{item.q}</span>
                    {openFaq === i ? <ChevronUp className="text-primary" /> : <ChevronDown className="text-slate-400" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-6 text-slate-500 leading-relaxed animate-in slide-in-from-top-2 duration-300">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case "cta_whatsapp":
        return (
          <section key={index} className="py-20 px-6 text-center bg-emerald-50">
            <div className="max-w-2xl mx-auto space-y-8">
               <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                  <MessageCircle className="h-10 w-10 text-white" />
               </div>
               <div className="space-y-4">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Atendimento via WhatsApp</h3>
                  <p className="text-slate-600 font-medium leading-relaxed">Clique no botão abaixo para iniciar uma conversa instantânea com nosso time comercial ou de suporte.</p>
               </div>
               <a 
                 href={`https://wa.me/${section.phone}`} 
                 target="_blank" 
                 rel="noreferrer"
                 className="inline-flex items-center gap-3 px-10 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-500/30"
               >
                 <MessageCircle className="h-5 w-5" /> {section.text || "Iniciar Conversa"}
               </a>
            </div>
          </section>
        );

      case "status_indicator":
        const isOperational = section.status === "operational";
        return (
          <section key={index} className="py-20 px-6 max-w-4xl mx-auto">
            <div className={`p-10 rounded-[2.5rem] border-2 flex flex-col items-center text-center gap-8 ${isOperational ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
               <div className={`w-24 h-24 rounded-full flex items-center justify-center animate-pulse ${isOperational ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-amber-500 text-white'}`}>
                  {isOperational ? <CheckCircle2 className="h-12 w-12" /> : <AlertCircle className="h-12 w-12" />}
               </div>
               <div className="space-y-3">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                    Todos os sistemas <span style={{ color: isOperational ? '#10b981' : '#f59e0b' }}>{isOperational ? 'operacionais' : 'instáveis'}</span>
                  </h3>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2">
                    <Clock className="h-3 w-3" /> Última checagem: {section.last_check || "Agora mesmo"}
                  </p>
               </div>
               <div className="w-full h-px bg-slate-200" />
               <div className="grid grid-cols-3 gap-8 w-full">
                  {["API", "Dashboard", "Banco de Dados"].map(serv => (
                    <div key={serv} className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{serv}</div>
                      <div className="font-bold text-emerald-500 flex items-center justify-center gap-1.5 min-w-[33%] mx-auto">
                         <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                         100%
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </section>
        );

      case "contact_form":
        return <div key={index} className="py-12"><Contact /></div>;

      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: bg, color: "#1a1a2e" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      
      {/* ── HEADER SIMPLIFICADO ── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
             {landing?.header_logo_square_url ? (
               <img src={landing.header_logo_square_url} className="h-10 w-10 rounded-xl object-contain shadow-sm" alt="Logo" />
             ) : (
               <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-xl" style={{ backgroundColor: teal }}>
                 {landing?.brand_name?.charAt(0) || "K"}
               </div>
             )}
             {landing?.header_logo_rect_url ? (
               <img src={landing.header_logo_rect_url} className="h-8 object-contain" alt={landing?.brand_name || "Kineos"} />
             ) : (
               <span className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">{landing?.brand_name || "Kineos"}</span>
             )}
          </a>
          <div className="flex gap-4">
             <Button variant="ghost" className="font-bold text-slate-600 uppercase text-[10px] tracking-widest hidden md:flex" asChild>
               <a href="/">Voltar para Início</a>
             </Button>
             <Button className="h-10 px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/10" style={{ backgroundColor: teal }} asChild>
               <a href="/login">Acessar Painel</a>
             </Button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-white pt-24 pb-32 border-b border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50/50 skew-x-12 translate-x-20 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
           <div className="inline-block px-4 py-1.5 bg-primary/5 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 animate-in slide-in-from-bottom-4 duration-500">
             {page.title}
           </div>
           <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter leading-[0.9] mb-8 animate-in slide-in-from-bottom-8 duration-700">
             {page.content.hero?.title || page.title}
           </h1>
           <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl animate-in slide-in-from-bottom-12 duration-1000">
             {page.content.hero?.subtitle}
           </p>
        </div>
      </section>

      {/* ── CONTEÚDO ── */}
      <main className="min-h-[400px]">
        {page.content.sections?.map((section: any, i: number) => renderSection(section, i))}
      </main>

      {/* ── FOOTER SIMPLIFICADO ── */}
      <footer className="bg-slate-950 py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12 text-white/50 mb-20">
           <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-black" style={{ backgroundColor: teal }}>K</div>
                 <span className="text-white font-black tracking-tighter uppercase italic">{landing?.brand_name || "Kineos"}</span>
              </div>
              <p className="text-sm font-medium leading-relaxed max-w-xs">{landing?.footer_about || "Simplificando a gestão de estúdios de Pilates em todo o Brasil."}</p>
           </div>
           <div className="grid grid-cols-2 gap-8 col-span-2">
              <div className="space-y-4">
                 <h4 className="text-white text-xs font-black uppercase tracking-widest border-b border-white/10 pb-2">Links Rápidos</h4>
                 <nav className="flex flex-col gap-2.5">
                    <a href="/sobre" className="text-sm hover:text-white transition-colors">Sobre Nós</a>
                    <a href="/blog" className="text-sm hover:text-white transition-colors">Blog</a>
                    <a href="/contato" className="text-sm hover:text-white transition-colors">Contato</a>
                    <a href="/privacidade" className="text-sm hover:text-white transition-colors">Privacidade</a>
                 </nav>
              </div>
              <div className="space-y-4">
                 <h4 className="text-white text-xs font-black uppercase tracking-widest border-b border-white/10 pb-2">Suporte</h4>
                 <nav className="flex flex-col gap-2.5">
                    <a href="/ajuda" className="text-sm hover:text-white transition-colors">Central de Ajuda</a>
                    <a href="/status" className="text-sm hover:text-white transition-colors">Status</a>
                    <a href="/whatsapp" className="text-sm hover:text-white transition-colors">WhatsApp</a>
                 </nav>
              </div>
           </div>
        </div>
        <div className="max-w-6xl mx-auto pt-8 border-t border-white/10 text-center text-[10px] font-black uppercase tracking-widest text-white/20">
           {landing?.footer_placeholder_text || "© 2024 Kineos. Todos os direitos reservados."}
        </div>
      </footer>
    </div>
  );
}
