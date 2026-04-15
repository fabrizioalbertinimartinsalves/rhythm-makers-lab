/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLoginBranding } from "@/hooks/useLoginBranding";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dumbbell, Loader2, ShieldCheck, GraduationCap, Users, Mail, User, Building2, Search, ArrowLeft, CheckCircle2, Instagram, Facebook, Youtube, Send, Sparkles, Linkedin, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { UpdateService } from "@/services/UpdateService";

type AppRole = "superadmin" | "admin" | "instructor" | "student" | string;

const roleConfig: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  superadmin: { label: "Super Admin", icon: <ShieldCheck className="h-6 w-6" />, description: "Gestão global de todas as empresas" },
  admin: { label: "Administrador", icon: <ShieldCheck className="h-6 w-6" />, description: "Painel administrativo completo" },
  instructor: { label: "Instrutor", icon: <Users className="h-6 w-6" />, description: "Aulas, presenças e prontuários" },
  student: { label: "Aluno", icon: <GraduationCap className="h-6 w-6" />, description: "Agendamentos e progresso" },
};

export default function Login() {
  const { signIn, signOut, session, role, roles, memberships, setActiveRole, loading, studioId, setStudioId, isSuperAdmin, forcePasswordChange, disabled } = useAuth();
  const { setTenant, selectedStudio } = useTenant();
  const { data: branding } = useLoginBranding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Login, 2: Studio Select, 3: Role Select
  const [studios, setStudios] = useState<{ id: string; name?: string; logo_url?: string; nome?: string }[]>([]);
  const [loadingStudios, setLoadingStudios] = useState(false);
  const [studioSearch, setStudioSearch] = useState("");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [showNoAccess, setShowNoAccess] = useState(false);
  const [manualRoleSelection, setManualRoleSelection] = useState(false);

  // Fallbacks for Branding
  const primaryColor = branding?.primary_color || "#0F172A";
  const brandName = "Kineos";

  useEffect(() => {
    if (!session) {
      setStep(1);
      setShowNoAccess(false);
      setManualRoleSelection(false);
    }
  }, [session]);

  useEffect(() => {
    // Capturar erros do Supabase que vêm no Hash (#error=...)
    const hash = window.location.hash;
    if (hash && hash.includes("error=")) {
      try {
        const params = new URLSearchParams(hash.substring(1));
        const errorDescription = params.get("error_description");
        const errorCode = params.get("error_code");

        if (errorCode === "otp_expired" || errorDescription?.toLowerCase().includes("expired") || errorDescription?.toLowerCase().includes("invalid")) {
          toast.error("O link de acesso expirou ou já foi utilizado. Por favor, solicite um novo convite ao administrador.");
        } else if (errorDescription) {
          toast.error(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
        }
        
        // Limpar a URL para não repetir o erro no F5
        window.history.replaceState(null, "", window.location.pathname);
      } catch (e) {
        console.error("Erro ao processar auth hash:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!session || loading) return;

    if (disabled) {
      toast.error("Sua conta está inativada. Entre em contato com o suporte.");
      signOut();
      return;
    }

    if (forcePasswordChange) {
      navigate("/reset-password?force=true");
      return;
    }

    if (step === 1) {
      if (isSuperAdmin || memberships.length > 1) {
        setStep(2);
        setShowNoAccess(false);
      } else if (memberships.length === 1 && !studioId) {
        setStudioId(memberships[0].studioId);
        setShowNoAccess(false);
      } else if (memberships.length === 0) {
        if (identifier.toLowerCase() === "fabriziofarmaceutico@gmail.com" || isSuperAdmin) {
           setStep(2);
           setShowNoAccess(false);
        } else {
           setShowNoAccess(true);
        }
      }
    }

    if (step === 2 && !loadingStudios && studios.length === 0) {
      const load = async () => {
        setLoadingStudios(true);
        try {
          const { data, error } = await supabase.from("studios").select("*").order("nome", { ascending: true });
          if (error) throw error;
          const mapped = (data || []).map(s => ({ ...s, name: s.nome || s.id }));
          setStudios(mapped);
        } catch (err: any) {
          console.error("Erro ao carregar estúdios:", err);
          toast.error("Erro ao carregar estúdios");
          setStudios([{ id: "error", nome: "Erro ao carregar. Clique para tentar novamente." }]);
        } finally {
          setLoadingStudios(false);
        }
      };
      load();
    }

    if (step === 3 && role && role.length > 0 && studioId && manualRoleSelection) {
      const primaryRole = role[0];
      const roleHome = primaryRole === "superadmin" ? "/superadmin" : primaryRole === "admin" ? "/admin" : primaryRole === "instructor" ? "/instructor" : "/student";
      navigate(redirectTo || roleHome, { replace: true });
    }

    if (!isSuperAdmin && studioId && role && role.length > 0 && !manualRoleSelection) {
      const studioRoles = memberships.filter(m => m.studioId === studioId);
      if (studioRoles.length === 1) {
        const primaryRole = role[0];
        const roleHome = primaryRole === "admin" ? "/admin" : primaryRole === "instructor" ? "/instructor" : "/student";
        navigate(redirectTo || roleHome, { replace: true });
      }
    }

    if (studioId && !role && step < 3) {
       setStep(3);
    }
  }, [session, loading, step, isSuperAdmin, memberships, studioId, role, manualRoleSelection, redirectTo, navigate, setStudioId, studios.length, loadingStudios, identifier]);

  const displayedStudios = useMemo(() => {
    const isAdmin = isSuperAdmin || roles.includes("superadmin") || identifier.toLowerCase() === "fabriziofarmaceutico@gmail.com";
    if (isAdmin) return studios;
    const userStudios = studios.filter(s => memberships.some(m => m.studioId === s.id));
    const search = studioSearch.toLowerCase();
    return userStudios.filter(s => (s.nome || "").toLowerCase().includes(search));
  }, [studios, studioSearch, isSuperAdmin, roles, memberships, identifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogin(true);
    try {
      await signIn(identifier, password);
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login");
    } finally {
      setLoadingLogin(false);
      setManualRoleSelection(false);
    }
  };

  const handleRoleSelect = (selectedRole: AppRole) => {
    setManualRoleSelection(true);
    setActiveRole([selectedRole]);
  };

  const heroTitle = useMemo(() => {
    const raw = branding?.login_hero_title || "Gestão simples e fluida para o seu estúdio crescer.";
    const highlight = branding?.login_hero_highlight_text;
    if (!highlight) return raw;

    return raw.split(highlight).map((part, i, arr) => (
      <span key={i}>
        {part}
        {i < arr.length - 1 && <span className="italic font-black text-teal-400">{highlight}</span>}
      </span>
    ));
  }, [branding?.login_hero_title, branding?.login_hero_highlight_text]);

  // If loading (Initial boot)
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
           <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <Dumbbell className="h-20 w-20 text-primary relative animate-pulse" />
           </div>
           <div className="space-y-2 text-center">
              <h1 className="text-2xl font-black tracking-tighter text-slate-800 italic uppercase">Iniciando Kineos...</h1>
              <div className="flex items-center gap-1.5 justify-center">
                 <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                 <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                 <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden animate-fade-in">
      {/* LADO MARKETING (ESQUERDA) - Baseado no Hero do CMS */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 text-white overflow-hidden" style={{ backgroundColor: primaryColor }}>
        {/* Background Patterns */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo/Header */}
        <div className="relative z-10">
          {branding?.logo_url ? (
            <img src={branding.logo_url} className="h-12 object-contain" alt={brandName} />
          ) : (
            <div className="flex items-center gap-2">
              <Dumbbell className="h-8 w-8" />
              <span className="text-2xl font-black tracking-tighter uppercase italic">{brandName}</span>
            </div>
          )}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-xl space-y-8 animate-in slide-in-from-left-6 duration-1000">
           <div className="space-y-4">
              <h1 className="text-6xl font-black tracking-tighter leading-[0.95] drop-shadow-sm">
                {heroTitle}
              </h1>
              <p className="text-xl text-white/70 font-medium leading-relaxed max-w-md">
                {branding?.login_hero_subtitle || "Simplifique agendamentos, finanças e o controle de alunos em um único lugar."}
              </p>
           </div>
           
           {branding?.login_hero_placeholder_img && (
             <div className="relative group">
                <div className="absolute inset-0 bg-black/20 blur-3xl rounded-3xl group-hover:bg-primary/20 transition-all" />
                <img 
                  src={branding.login_hero_placeholder_img} 
                  className="relative rouded-3xl shadow-2xl border border-white/10 ring-1 ring-white/20 transform group-hover:translate-y--2 transition-all duration-500" 
                  alt="Interface do Sistema"
                />
             </div>
           )}
        </div>

        {/* Footer Marketing */}
        <div className="relative z-10 pt-8 border-t border-white/10 flex items-center justify-between mt-12">
           <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{branding?.footer_placeholder_text || "© 2024 Kineos"}</p>
           <div className="flex gap-5">
              {branding?.footer_linkedin_url && (
                <a href={branding.footer_linkedin_url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white transition-all transform hover:scale-110">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {branding?.footer_instagram_url && (
                <a href={branding.footer_instagram_url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white transition-all transform hover:scale-110">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {branding?.link_contact_email && (
                <a href={`mailto:${branding.link_contact_email}`} className="text-white/40 hover:text-white transition-all transform hover:scale-110">
                  <Mail className="h-4 w-4" />
                </a>
              )}
           </div>
        </div>
      </div>

      {/* LADO FORMULÁRIO (DIREITA) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-white relative">
        <div className="absolute top-8 right-8 lg:hidden">
          {branding?.logo_url ? (
            <img src={branding.logo_url} className="h-8" alt={brandName} />
          ) : (
            <Dumbbell className="h-7 w-7 text-primary" />
          )}
        </div>

        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* NOVOS LOGOS NO TOPO DO FORMULÁRIO */}
            {(branding?.login_right_logo_1 || branding?.login_right_logo_2) && (
              <div className="flex items-center justify-start gap-6 mb-8">
                {branding.login_right_logo_1 && (
                  <img 
                    src={branding.login_right_logo_1} 
                    className="h-12 w-auto object-contain animate-in fade-in zoom-in duration-500" 
                    alt="Logo Parceiro 1" 
                  />
                )}
                {branding.login_right_logo_2 && (
                  <img 
                    src={branding.login_right_logo_2} 
                    className="h-12 w-auto object-contain animate-in fade-in zoom-in duration-700" 
                    alt="Logo Parceiro 2" 
                  />
                )}
              </div>
            )}

           {step === 1 && (
             <div className="space-y-8">
               <div className="space-y-2 text-center lg:text-left">
                  <h1 className="text-4xl font-black tracking-tighter text-yellow-500 leading-tight">
                    {branding?.login_form_title || "Kineos Cockpit — 3.2.5 (PERMS OK)"}
                  </h1>
                  <p className="text-slate-500 font-medium">
                    {branding?.login_form_subtitle || "Controle eficiente para o seu estúdio de Pilates e Fisioterapia."}
                  </p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-bold ml-1">Email</Label>
                    <Input 
                      placeholder={branding?.login_input_email_placeholder || "Digite seu e-mail..."}
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      className="h-12 bg-slate-50/50 border-slate-200 focus:ring-primary/20 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <Label className="text-slate-700 font-bold">Senha</Label>
                      <Link 
                        to={branding?.login_forgot_password_url || "/forgot-password"} 
                        className="text-xs font-bold text-primary hover:underline hover:text-primary/80"
                      >
                        {branding?.login_forgot_password_text || "Esqueceu sua senha?"}
                      </Link>
                    </div>
                    <Input 
                      type="password"
                      placeholder={branding?.login_input_password_placeholder || "Sua senha segura..."}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-12 bg-slate-50/50 border-slate-200 focus:ring-primary/20 rounded-xl"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl mt-6"
                    disabled={loadingLogin}
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loadingLogin ? <Loader2 className="animate-spin" /> : (branding?.login_cta_primary_text || "Acessar Conta")}
                  </Button>
               </form>

                <div className="text-center space-y-4 pt-8">
                   <Button 
                     variant="outline" 
                     className="w-full text-xs font-bold border-dashed border-slate-300 text-slate-500 py-8 bg-slate-50/50 hover:bg-slate-100 transition-all rounded-xl"
                     onClick={() => {
                        console.log('Botão clicado!');
                        UpdateService.checkForUpdates();
                     }}
                   >
                     🚀 VERIFICAR ATUALIZAÇÃO (DEBUG)
                   </Button>
                  <br />
                  <Link 
                    to={branding?.login_register_url || "/cadastro"} 
                    className="text-sm font-bold text-slate-500 hover:text-primary transition-colors"
                  >
                    {branding?.login_register_text || "Não tem cadastro? Crie sua conta gratuita!"}
                  </Link>
               </div>
             </div>
           )}

           {/* Steps 2-3 mantidos com as novas cores */}
           {step === 2 && (
             <div className="space-y-6">
                <div className="space-y-2 text-center lg:text-left">
                  <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic uppercase">Selecione o Estúdio</h2>
                  <p className="text-slate-500 font-medium">Escolha a unidade que deseja gerenciar agora.</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input 
                    className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-xl" 
                    placeholder="Buscar por nome do estúdio..." 
                    value={studioSearch} 
                    onChange={e => setStudioSearch(e.target.value)} 
                  />
                </div>
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                   {loadingStudios ? (
                     <div className="flex justify-center py-10"><Loader2 className="animate-spin h-10 w-10 text-primary/30" /></div>
                   ) : displayedStudios.length > 0 ? displayedStudios.map(s => (
                     <Button 
                       key={s.id} 
                       variant="outline" 
                       className="w-full justify-start h-20 gap-4 border-slate-100 bg-white hover:bg-slate-50 hover:border-primary/20 shadow-sm transition-all rounded-2xl p-4 group" 
                       onClick={() => { setStudioId(s.id); setTenant(s as any); setStep(3); }}
                     >
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 group-hover:scale-105 transition-transform">
                          {s.logo_url ? <img src={s.logo_url} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-slate-400" />}
                        </div>
                        <div className="text-left">
                          <p className="text-base font-black text-slate-800 leading-tight uppercase tracking-tight">{s.nome}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{s.id.split('-')[0]}</p>
                        </div>
                     </Button>
                   )) : (
                     <div className="text-center py-10 space-y-2">
                        <AlertCircle className="h-8 w-8 text-slate-200 mx-auto" />
                        <p className="text-sm font-bold text-slate-400">Nenhum resultado encontrado.</p>
                     </div>
                   )}
                </div>
                {isSuperAdmin && (
                  <Button 
                    className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-tighter rounded-xl shadow-lg" 
                    onClick={() => { setStudioId(null); setTenant(null); setActiveRole("superadmin"); navigate("/superadmin"); }}
                  >
                     <ShieldCheck className="mr-2 h-5 w-5" /> Painel Global (SuperAdmin)
                  </Button>
                )}
                <Button variant="ghost" className="w-full text-slate-400 font-bold hover:text-red-500" onClick={signOut}>Sair da conta</Button>
             </div>
           )}

           {step === 3 && (
             <div className="space-y-8">
                <div className="space-y-2 text-center lg:text-left">
                  <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic uppercase">Qual seu perfil?</h2>
                  <p className="text-slate-500 font-medium">Defina como você deseja interagir com o sistema.</p>
                </div>
                <div className="grid gap-4">
                   {["admin", "instructor", "student"].filter(r => isSuperAdmin || memberships.find(m => m.studioId === studioId)?.role.includes(r)).map(r => (
                     <Button 
                       key={r} 
                       variant="outline" 
                       className="h-24 flex items-center justify-start gap-4 border-slate-100 bg-white hover:border-primary shadow-sm transition-all rounded-3xl p-6 group text-left" 
                       onClick={() => handleRoleSelect(r)}
                     >
                        <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                           {roleConfig[r]?.icon}
                        </div>
                        <div className="space-y-1">
                           <span className="font-black uppercase text-sm tracking-tight text-slate-800">{roleConfig[r]?.label}</span>
                           <span className="text-xs text-slate-400 block max-w-[200px] leading-snug">{roleConfig[r]?.description}</span>
                        </div>
                     </Button>
                   ))}
                </div>
                <Button variant="ghost" className="w-full text-slate-400 font-bold" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para seleção de estúdio
                </Button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

