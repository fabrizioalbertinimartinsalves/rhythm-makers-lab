import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import StudentLayout from "@/components/layouts/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CalendarDays, Users, Loader2, Clock, Search,
  CheckCircle2, AlertCircle, CalendarCheck, CreditCard, Info
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Booking() {
  const { user, studioId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterMod, setFilterMod] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("avulsa");
  const [view, setView] = useState<"all" | "enrolled">("all");

  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ["my-student-sb", user?.id, studioId],
    enabled: !!user?.id && !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("studio_id", studioId)
        .eq("user_id", user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: turmas = [], isLoading: loadingRegulares } = useQuery<any[]>({
    queryKey: ["turmas-booking-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          *,
          modalities ( * )
        `)
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .order("horario");
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: turmasAvulsas = [], isLoading: loadingAvulsas } = useQuery<any[]>({
    queryKey: ["turmas-avulsas-booking-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes_avulsas")
        .select(`
          *,
          modalities ( * )
        `)
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .gte("data", new Date().toISOString().split("T")[0])
        .order("data")
        .order("horario");
      
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingRegulares || loadingAvulsas;

  const { data: inscricoesCounts = {} } = useQuery({
    queryKey: ["inscricoes-count-booking-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("studio_id", studioId)
        .eq("ativa", true);
      
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((d) => {
        counts[d.class_id] = (counts[d.class_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: avulsaOccupancy = {} } = useQuery({
    queryKey: ["avulsa-occupancy-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("class_avulsa_id")
        .eq("studio_id", studioId)
        .eq("status", "confirmado");
      
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((d) => {
        if (d.class_avulsa_id) {
          counts[d.class_avulsa_id] = (counts[d.class_avulsa_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const { data: myInscricoes = [] } = useQuery({
    queryKey: ["my-inscricoes-ids-sb", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", student.id)
        .eq("ativa", true);
      
      if (error) throw error;
      return data?.map((d) => d.class_id) || [];
    },
  });

  const { data: myWaitlist = [] } = useQuery({
    queryKey: ["my-waitlist-positions-sb", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      // 1. Get my entries
      const { data: myEntries, error } = await supabase
        .from("waiting_list")
        .select("id, class_id, created_at")
        .eq("student_id", student.id);
      
      if (error) throw error;
      if (!myEntries || myEntries.length === 0) return [];

      // 2. For each entry, count how many are ahead
      const results = await Promise.all(myEntries.map(async (entry) => {
        const { count, error: countError } = await supabase
          .from("waiting_list")
          .select("*", { count: 'exact', head: true })
          .eq("class_id", entry.class_id)
          .lt("created_at", entry.created_at);
        
        return {
          class_id: entry.class_id,
          position: (count || 0) + 1
        };
      }));

      return results;
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (classId: string) => {
      if (!studioId || !student) throw new Error("Perfil de aluno não encontrado");
      const { error } = await supabase
        .from("enrollments")
        .insert({
          studio_id: studioId,
          student_id: student.id,
          class_id: classId,
          ativa: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-inscricoes-ids-sb"] });
      queryClient.invalidateQueries({ queryKey: ["inscricoes-count-booking-sb"] });
      toast.success("Inscrição realizada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const waitlistMutation = useMutation({
    mutationFn: async (classId: string) => {
      if (!studioId || !student) throw new Error("Perfil de aluno não encontrado");
      const { error } = await supabase
        .from("waiting_list")
        .insert({
          studio_id: studioId,
          student_id: student.id,
          class_id: classId,
          data: new Date().toISOString().split("T")[0] // No contexto atual, agendamos para hoje ou fixa
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-waitlist-positions-sb"] });
      toast.success("Você entrou na lista de espera!", { description: "Avisaremos se uma vaga surgir." });
    },
    onError: (e: any) => toast.error("Você já está na lista de espera ou erro ao entrar."),
  });

  const avulsaBookingMutation = useMutation({
    mutationFn: async (turmaAvulsa: any) => {
      if (!studioId || !student) throw new Error("Perfil de aluno não encontrado");
      
      // 1. Criar o booking pendente para o aluno
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          studio_id: studioId,
          student_id: student.id,
          class_id: null, // Aula avulsa não vincula a class_id fixa
          class_avulsa_id: turmaAvulsa.id,
          data: turmaAvulsa.data,
          tipo: 'avulso',
          status: 'pendente',
          pago: false,
          valor: turmaAvulsa.valor,
          nome_avulso: student.nome,
          email_avulso: student.user_id, // Usando user_id ou e-mail se disponível
          observacoes: `Agendamento de aula avulsa: ${turmaAvulsa.nome}`
        })
        .select()
        .single();
      
      if (error) throw error;

      // 2. Disparar Checkout
      checkout({
        amount: turmaAvulsa.valor,
        description: `Aula Avulsa - ${turmaAvulsa.nome}`,
        transactionId: booking.id,
        metadata: {
          studioId: studioId,
          booking_id: booking.id,
          student_id: student.id,
          source: 'student_area_avulsa'
        },
        returnPath: `booking?success=true`
      });
    },
    onError: (e: any) => toast.error("Erro ao iniciar agendamento: " + e.message),
  });

  const diasMap: Record<string, string> = {
    seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
  };

  // Unique modalidades from turmas
  const modalidades = [...new Map([...turmas, ...turmasAvulsas].map((t: any) => [
    t.modalidade_id,
    { id: t.modalidade_id, nome: t.modalities?.nome, emoji: t.modalities?.emoji, cor: t.modalities?.cor }
  ])).values()];

  // Filter Regulares
  const filteredRegulares = turmas.filter((t: any) => {
    if (search && !t.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMod !== "all" && t.modalidade_id !== filterMod) return false;
    const myWaitlistIds = myWaitlist.map((w: any) => w.class_id);
    if (view === "enrolled" && !myInscricoes.includes(t.id) && !myWaitlistIds.includes(t.id)) return false;
    return true;
  });

  // Filter Avulsas
  const filteredAvulsas = turmasAvulsas.filter((t: any) => {
    if (search && !t.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMod !== "all" && t.modalidade_id !== filterMod) return false;
    return true;
  });

  // Group by modalidade (Regulares)
  const groupedRegulares = filteredRegulares.reduce((acc: Record<string, any[]>, t: any) => {
    const key = t.modalidade_id || "unspecified";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, any[]>);

  // Group by modalidade (Avulsas)
  const groupedAvulsas = filteredAvulsas.reduce((acc: Record<string, any[]>, t: any) => {
    const key = t.modalidade_id || "unspecified";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, any[]>);

  const enrolledCount = myInscricoes.length;

  return (
    <StudentLayout>
      <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                Agendamentos
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Reserve sua próxima aula
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por modalidade ou professor..."
              className="pl-9 h-11 bg-white border-slate-100 rounded-xl focus-visible:ring-primary/20 transition-all font-medium text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <Button
              size="sm"
              variant={view === "enrolled" ? "secondary" : "outline"}
              className="h-7 text-[9px] px-3 rounded-full font-black uppercase tracking-widest shrink-0 gap-1.5 transition-all"
              onClick={() => setView(view === "enrolled" ? "all" : "enrolled")}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" /> Minhas ({enrolledCount})
            </Button>
            <span className="w-px bg-border shrink-0 my-1" />
            <Button
              size="sm"
              variant={filterMod === "all" ? "secondary" : "outline"}
              className="h-7 text-[9px] px-3 rounded-full font-black uppercase tracking-widest shrink-0 transition-all"
              onClick={() => setFilterMod("all")}
            >
              Todas mod.
            </Button>
            {modalidades.map((m: any) => (
              <Button
                key={m.id}
                size="sm"
                variant={filterMod === m.id ? "secondary" : "outline"}
                className="h-7 text-[9px] px-3 rounded-full font-black uppercase tracking-widest shrink-0 transition-all"
                onClick={() => setFilterMod(m.id)}
              >
                {m.emoji} {m.nome}
              </Button>
            ))}
          </div>
        </div>

        {/* Content Tabs */}
        {isLoading || loadingStudent ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/50 rounded-xl mb-6">
              <TabsTrigger value="avulsa" className="rounded-lg text-xs font-bold uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm text-slate-500">
                Agendar Avulsa
              </TabsTrigger>
              <TabsTrigger value="regular" className="rounded-lg text-xs font-bold uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm text-slate-500">
                Grade (Consulta)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="avulsa" className="space-y-5 focus-visible:ring-0 outline-none">
               {filteredAvulsas.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="mx-auto w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <CreditCard className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Nenhuma aula avulsa disponível</p>
                  </div>
               ) : (
                <div className="space-y-6">
                  {(Object.entries(groupedAvulsas) as [string, any[]][]).map(([modId, items]) => {
                    const mod = modalidades.find((m: any) => m.id === modId) as any;
                    return (
                      <div key={modId}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: mod?.cor || "#6B9B7A" }} />
                          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{mod?.emoji} {mod?.nome}</h2>
                        </div>
                        <div className="space-y-2">
                          {items.map((t: any) => {
                            const occupied = avulsaOccupancy[t.id] || 0;
                            const isFull = occupied >= t.limite_vagas;
                            const spotsRem = t.limite_vagas - occupied;
                            const pct = t.limite_vagas > 0 ? Math.round((occupied / t.limite_vagas) * 100) : 0;

                            return (
                              <Card key={t.id} className={cn(
                                "overflow-hidden border-none shadow-sm ring-1 ring-slate-100 bg-white hover:ring-primary/20 transition-all",
                                isFull && "opacity-80"
                              )}>
                                <CardContent className="p-4">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                     <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                           <Badge className="bg-slate-900 text-[8px] font-black uppercase tracking-tight h-5">EVENTO ÚNICO</Badge>
                                           <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase tracking-tight h-5">R$ {t.valor.toFixed(2)}</Badge>
                                        </div>
                                        <p className="text-base font-black text-slate-900 truncate mb-1 italic uppercase tracking-tighter">{t.nome}</p>
                                        
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                          <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-primary" /> {format(parseISO(t.data), "dd 'de' MMMM", { locale: ptBR })}</span>
                                          <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-primary" /> {t.horario.slice(0, 5)}</span>
                                        </div>

                                        <div className="mt-3 space-y-1.5">
                                          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">{occupied} Reservas</span>
                                            <span className={cn(spotsRem <= 2 ? "text-amber-500" : "text-slate-400")}>
                                              {isFull ? "Esgotado" : `${spotsRem} Disponíveis`}
                                            </span>
                                          </div>
                                          <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                            <div 
                                              className={cn(
                                                "h-full rounded-full transition-all duration-1000",
                                                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary"
                                              )}
                                              style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                     </div>
                                     <Button 
                                        size="sm" 
                                        onClick={() => avulsaBookingMutation.mutate(t)}
                                        disabled={avulsaBookingMutation.isPending || isFull}
                                        className={cn(
                                          "h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/10 transition-all",
                                          isFull ? "bg-slate-100 text-slate-400 shadow-none" : "bg-primary hover:scale-105"
                                        )}
                                     >
                                        {avulsaBookingMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : isFull ? (
                                          "Esgotado"
                                        ) : (
                                          <><CreditCard className="h-4 w-4" /> Agendar!</>
                                        )}
                                     </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
               )}
            </TabsContent>

            <TabsContent value="regular" className="space-y-5 focus-visible:ring-0 outline-none">
               <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex items-start gap-3 mb-4">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">Grade em Modo de Consulta</p>
                    <p className="text-[10px] text-amber-600 font-medium leading-relaxed mt-1">
                      As turmas regulares abaixo servem apenas para consulta de horários. Para realizar uma inscrição fixa, entre em contato com a nossa recepção.
                    </p>
                  </div>
               </div>

               {filteredRegulares.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-sm font-medium text-muted-foreground">Nenhuma turma regular encontrada</p>
                  </div>
               ) : (
                <div className="space-y-6">
                  {(Object.entries(groupedRegulares) as [string, any[]][]).map(([modId, items]) => {
                    const mod = modalidades.find((m: any) => m.id === modId) as any;
                    return (
                      <div key={modId}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: mod?.cor || "#6B9B7A" }} />
                          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{mod?.emoji} {mod?.nome}</h2>
                        </div>
                        <div className="space-y-2">
                          {items.map((t: any) => {
                            const isEnrolled = myInscricoes.includes(t.id);
                            return (
                              <Card key={t.id} className={cn("overflow-hidden border-none shadow-none ring-1 ring-slate-100 bg-white", isEnrolled && "ring-primary/30 bg-primary/[0.01]")}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between gap-4">
                                     <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                           <p className="text-sm font-bold text-slate-900 truncate">{t.nome}</p>
                                           {isEnrolled && <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-tight">Minha Turma</Badge>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                          <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {t.horario.slice(0, 5)}</span>
                                          <div className="flex gap-1">
                                            {t.dias_semana.map((d: any) => <span key={d} className="bg-slate-50 px-1.5 py-0.5 rounded text-[8px]">{diasMap[d] || d}</span>)}
                                          </div>
                                        </div>
                                     </div>
                                     <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200">SOMENTE CONSULTA</Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
               )}
            </TabsContent>
          </Tabs>
        )}

        {/* Not linked warning */}
        {!student && !isLoading && (
          <Card className="border-amber-200  bg-amber-50/50 ">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 ">Perfil não vinculado</p>
                <p className="text-xs text-amber-600  mt-0.5">
                  Seu perfil de aluno ainda não foi vinculado. Entre em contato com o estúdio para realizar a vinculação.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de Pagamento */}
        <PaymentMethodModal 
          open={modalOpen} 
          onOpenChange={setModalOpen} 
          studioId={studioId!}
          checkoutOptions={checkoutOptions} 
        />
      </div>
    </StudentLayout>
  );
}
