import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePublicOrg } from "@/hooks/usePublicOrg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Loader2, Calendar as CalendarIcon, Clock, Users, ArrowRight, 
  CheckCircle2, Sparkles, MapPin, Instagram, Phone, Mail, 
  ShieldCheck, AlertCircle, TrendingUp, Zap
} from "lucide-react";
import { format, addDays, isSameDay, parseISO, getDay, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";
import { cn } from "@/lib/utils";

const DAY_MAP: Record<string, number> = {
  seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 0
};

export default function PublicBooking() {
  const { data: publicOrg, isLoading: loadingOrg, error: orgError } = usePublicOrg() as any;
  const studioId = publicOrg?.id;

  const [step, setStep] = useState(1);
  const [selectedModality, setSelectedModality] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  
  // Lead Info
  const [leadInfo, setLeadInfo] = useState({
    nome: "",
    cpf: "",
    whatsapp: "",
    email: ""
  });

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [checkoutOptions, setCheckoutOptions] = useState<any>(null);

  // 1. Fetch Modalities
  const { data: modalities = [], isLoading: loadingMods } = useQuery({
    queryKey: ["public-modalities-booking", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modalities")
        .select("*")
        .eq("studio_id", studioId)
        .eq("ativa", true);
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Available Slots (Dynamic Hybrid System)
  const { data: availableSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["available-slots-hybrid", selectedModality?.id, studioId],
    enabled: !!selectedModality && !!studioId,
    queryFn: async () => {
      console.warn("DEBUG: Fetching slots for modality:", selectedModality.nome);
      
      const [regRes, singleRes, bookingsRes] = await Promise.all([
        supabase.from("classes").select("*, enrollments(count)").eq("modality_id", selectedModality.id).eq("ativa", true).eq("enrollments.status", "ativo"),
        supabase.from("classes_avulsas").select("*").eq("modality_id", selectedModality.id).eq("ativa", true).gte("data", format(new Date(), "yyyy-MM-dd")),
        supabase.from("bookings")
          .select("class_id, class_avulsa_id, data")
          .or("status.eq.confirmado,pago.eq.true")
          .eq("studio_id", studioId)
      ]);

      if (regRes.error) throw regRes.error;
      if (singleRes.error) throw singleRes.error;

      const slots: any[] = [];
      const today = startOfDay(new Date());

      // A. Process Regular Classes (Recurrent) - Look for next 4 instances or 60 days
      regRes.data.forEach((turma) => {
        const classDays = (turma.dias_semana || []).map((d: string) => DAY_MAP[d.toLowerCase()]);
        if (classDays.length === 0) return;

        let iterations = 0;
        let dayCheck = today;
        let instancesFound = 0;

        while (instancesFound < 4 && iterations < 60) {
          const dw = getDay(dayCheck);
          if (classDays.includes(dw)) {
            slots.push({
              id: `reg-${turma.id}-${format(dayCheck, "yyyy-MM-dd")}`,
              turma_id: turma.id,
              type: "Regular",
              date: new Date(dayCheck),
              horario_inicio: turma.horario,
              horario_fim: turma.horario_fim || turma.horario,
              capacidade: turma.capacidade,
              ocupadas: (turma.enrollments?.[0]?.count || 0) + 
                (bookingsRes.data?.filter(b => 
                  b.class_id === turma.id && 
                  b.data === format(dayCheck, "yyyy-MM-dd") &&
                  (b.status === 'confirmado' || isAfter(addHours(parseISO(b.created_at), 1), new Date()))
                ).length || 0),
              valor_aula_avulso: turma.valor_aula_avulso || selectedModality.valor_avulso || 0
            });
            instancesFound++;
          }
          dayCheck = addDays(dayCheck, 1);
          iterations++;
        }
      });

      // B. Process Single/Special Classes
      singleRes.data.forEach((aula) => {
        slots.push({
          id: `single-${aula.id}`,
          aula_avulsa_id: aula.id,
          type: "Específico",
          date: parseISO(aula.data),
          horario_inicio: aula.horario,
          horario_fim: aula.horario_fim || aula.horario,
          capacidade: aula.limite_vagas,
          ocupadas: bookingsRes.data?.filter(b => 
            b.class_avulsa_id === aula.id && 
            (b.status === 'confirmado' || isAfter(addHours(parseISO(b.created_at), 1), new Date()))
          ).length || 0,
          valor_aula_avulso: aula.valor || 0
        });
      });

      return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
    },
  });

  const availableDates = useMemo(() => {
    return availableSlots
      .filter(slot => (slot.capacidade - slot.ocupadas) > 0)
      .map(slot => slot.date);
  }, [availableSlots]);

  const slotsForDate = useMemo(() => {
    return availableSlots.filter(s => selectedDate && isSameDay(s.date, selectedDate));
  }, [availableSlots, selectedDate]);

  const handleCreateBooking = async () => {
    if (!selectedSlot || !leadInfo.nome || !leadInfo.cpf) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          studio_id: studioId,
          class_id: selectedSlot.turma_id || null,
          class_avulsa_id: selectedSlot.aula_avulsa_id || null,
          data: format(selectedSlot.date, "yyyy-MM-dd"),
          tipo: "avulso",
          nome_avulso: leadInfo.nome,
          cpf_avulso: leadInfo.cpf,
          whatsapp_avulso: leadInfo.whatsapp,
          email_avulso: leadInfo.email,
          status: "pendente",
          valor: selectedSlot.valor_aula_avulso || 0
        })
        .select()
        .single();

      if (error) throw error;

      setBookingId(data.id);
      setCheckoutOptions({
        amount: selectedSlot?.valor_aula_avulso || 0,
        amount_cents: Math.round((selectedSlot?.valor_aula_avulso || 0) * 100),
        description: `Aula Avulsa - ${selectedModality?.nome} (${publicOrg.nome})`,
        transaction_id: data.id,
        metadata: { 
           booking_id: data.id, 
           studioId: publicOrg.id,
           lead_name: leadInfo.nome,
           lead_email: leadInfo.email 
        }
      });
      setPaymentModalOpen(true);
    } catch (err: any) {
      toast.error("Erro ao gerar agendamento", { description: err.message });
    }
  };

  if (loadingOrg) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Autenticando Estúdio...</p>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] bg-slate-900 text-white p-8 text-center space-y-6">
           <div className="h-20 w-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-rose-500/20">
              <AlertCircle className="h-10 w-10 text-rose-500" />
           </div>
           <header className="space-y-2">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Estúdio não localizado</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                {orgError instanceof Error ? orgError.message : "O link que você acessou parece estar incorreto ou o estúdio está inativo."}
              </p>
           </header>
           <Button className="w-full h-12 rounded-2xl font-black uppercase italic tracking-tighter" onClick={() => window.location.reload()}>
             Tentar Novamente
           </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30">
      {/* Luxury Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 py-12 border-b border-white/5 backdrop-blur-sm bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center text-center space-y-4">
           {publicOrg?.logo_url && (
             <img src={publicOrg.logo_url} alt="Logo" className="h-16 w-auto object-contain mb-2 brightness-0 invert opacity-80" />
           )}
           <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
             Reserva de <span className="text-primary italic">Aulas</span>
           </h1>
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-white/10 text-slate-400 bg-white/5 text-[9px] font-black uppercase tracking-widest px-3">
                {publicOrg?.nome}
              </Badge>
              <div className="h-1 w-1 bg-white/10 rounded-full" />
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Agendamento Seguro
              </div>
           </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto p-6 md:p-12">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left: Configuration */}
            <div className="lg:col-span-7 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
               
               {/* 1. Modalidade */}
               <section className="space-y-4">
                  <header className="flex justify-between items-end">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Passo 01</p>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Escolha a Modalidade</h2>
                     </div>
                  </header>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                     {modalities.map((mod: any) => (
                        <button
                          key={mod.id}
                          className={cn(
                            "p-4 rounded-3xl border-2 transition-all text-left flex flex-col gap-2 group relative overflow-hidden",
                            selectedModality?.id === mod.id 
                              ? "border-primary bg-primary/5 shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]" 
                              : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/[0.07]"
                          )}
                          onClick={() => {
                            setSelectedModality(mod);
                            setSelectedSlot(null);
                          }}
                        >
                           <span className="text-2xl">{mod.emoji || "✨"}</span>
                           <span className="font-black uppercase italic tracking-tighter text-sm leading-tight group-hover:text-primary transition-colors">
                             {mod.nome}
                           </span>
                           {selectedModality?.id === mod.id && (
                             <div className="absolute top-2 right-2 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-2.5 w-2.5 text-slate-900" />
                             </div>
                           )}
                        </button>
                     ))}
                  </div>
               </section>

               {/* 2. Data e Hora */}
               {selectedModality && (
                 <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <header>
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Passo 02</p>
                       <h2 className="text-2xl font-black italic uppercase tracking-tighter">Selecione Data e Horário</h2>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                       <Card className="border-none bg-white/5 rounded-[2rem] p-4 ring-1 ring-white/5">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            locale={ptBR}
                            disabled={(date) => date < startOfDay(new Date())}
                            className="text-white pointer-events-auto"
                            modifiers={{ hasVacancies: availableDates }}
                            modifiersClassNames={{
                              hasVacancies: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-emerald-400 after:rounded-full after:shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                            }}
                          />
                       </Card>
                       <div className="space-y-3">
                          {loadingSlots ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-30">
                               <Loader2 className="animate-spin h-6 w-6" />
                               <p className="text-[10px] uppercase font-black tracking-widest">Sincronizando Grades...</p>
                            </div>
                          ) : slotsForDate.length > 0 ? (
                            slotsForDate.map((slot) => (
                              <button
                                key={slot.id}
                                className={cn(
                                  "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group",
                                  selectedSlot?.id === slot.id 
                                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/5" 
                                    : "border-white/5 bg-white/5 hover:border-white/10"
                                )}
                                onClick={() => setSelectedSlot(slot)}
                              >
                                 <div className="flex items-center gap-4 text-left">
                                    <div className={cn(
                                      "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                                      selectedSlot?.id === slot.id ? "bg-primary text-slate-900" : "bg-white/5 text-slate-500 group-hover:text-primary"
                                    )}>
                                       <Clock className="h-5 w-5" />
                                    </div>
                                    <div>
                                       <p className="font-black italic uppercase tracking-tighter text-lg leading-none">
                                          {slot.horario_inicio.substring(0, 5)}
                                       </p>
                                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                          {slot.capacidade - slot.ocupadas} Vagas Livres
                                       </span>
                                    </div>
                                 </div>
                                 {selectedSlot?.id === slot.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                              </button>
                            ))
                          ) : (
                            <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] space-y-2 opacity-40">
                               <Clock className="h-8 w-8 mx-auto text-slate-500" />
                               <p className="text-[10px] font-black uppercase tracking-widest">Sem horários para este dia</p>
                            </div>
                          )}
                       </div>
                    </div>
                 </section>
               )}
            </div>

            {/* Right: Checkout Sidebar */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-12">
               <Card className="border-none bg-slate-900/50 rounded-[3rem] p-8 ring-1 ring-white/5 shadow-2xl backdrop-blur-md">
                  <header className="mb-8">
                     <div className="flex items-center gap-1.5 mb-2">
                        <Zap className="h-4 w-4 text-primary fill-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Finalizar Reserva</h3>
                     </div>
                     <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Seus <span className="text-primary italic">Dados</span></h2>
                  </header>

                  <div className="space-y-4">
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest ml-4 text-slate-200 opacity-100">Nome Completo</Label>
                        <Input 
                          value={leadInfo.nome} 
                          onChange={e => setLeadInfo({...leadInfo, nome: e.target.value})}
                          className="h-14 bg-white/10 border-white/10 rounded-2xl px-6 focus:ring-1 focus:ring-primary/40 placeholder:text-slate-500 font-bold text-white shadow-inner" 
                          placeholder="Ex: João Silva" 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase tracking-widest ml-4 text-slate-200 opacity-100">CPF (Obrigatório)</Label>
                           <Input 
                             value={leadInfo.cpf} 
                             onChange={e => setLeadInfo({...leadInfo, cpf: e.target.value})}
                             className="h-14 bg-white/10 border-white/10 rounded-2xl px-6 focus:ring-1 focus:ring-primary/40 placeholder:text-slate-500 font-bold text-white shadow-inner" 
                             placeholder="000.000.000-00" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase tracking-widest ml-4 text-slate-200 opacity-100">WhatsApp</Label>
                           <Input 
                             value={leadInfo.whatsapp} 
                             onChange={e => setLeadInfo({...leadInfo, whatsapp: e.target.value})}
                             className="h-14 bg-white/10 border-white/10 rounded-2xl px-6 focus:ring-1 focus:ring-primary/40 placeholder:text-slate-500 font-bold text-white shadow-inner" 
                             placeholder="(00) 00000-0000" 
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest ml-4 text-slate-200 opacity-100">E-mail</Label>
                        <Input 
                          value={leadInfo.email} 
                          onChange={e => setLeadInfo({...leadInfo, email: e.target.value})}
                          className="h-14 bg-white/10 border-white/10 rounded-2xl px-6 focus:ring-1 focus:ring-primary/40 placeholder:text-slate-500 font-bold text-white shadow-inner" 
                          placeholder="seu@email.com" 
                        />
                     </div>
                  </div>

                  {selectedSlot && (
                    <div className="mt-8 p-6 bg-slate-950/80 rounded-3xl space-y-4 ring-1 ring-white/10 animate-in zoom-in-95 duration-300 shadow-2xl">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-300 font-bold uppercase tracking-widest text-[9px]">Resumo da Aula</span>
                          <span className="text-primary font-black italic uppercase tracking-tighter">{selectedSlot.type}</span>
                       </div>
                       <div className="flex justify-between items-end">
                          <div className="space-y-1">
                             <h4 className="text-lg font-black italic uppercase tracking-tighter leading-none text-white">{selectedModality.nome}</h4>
                             <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                {format(selectedSlot.date, "dd/MM/yyyy")} — {selectedSlot.horario_inicio.substring(0, 5)}
                             </p>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Valor Avulso</p>
                             <p className="text-3xl font-black italic tracking-tighter text-emerald-400">R$ {Number(selectedSlot.valor_aula_avulso).toFixed(0)}</p>
                          </div>
                       </div>
                       <Button 
                        disabled={!leadInfo.nome || !leadInfo.cpf}
                        className="w-full h-16 rounded-2xl text-xl font-black uppercase italic tracking-tighter shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 bg-primary hover:bg-primary/90 text-slate-900"
                        onClick={handleCreateBooking}
                      >
                        Pagar e Confirmar <ArrowRight className="ml-3 h-6 w-6" />
                      </Button>
                    </div>
                  )}

                  {!selectedSlot && (
                    <div className="mt-8 py-8 text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed border-white/5 rounded-[2rem]">
                       Aguardando Seleção de Horário...
                    </div>
                  )}
               </Card>

               <div className="flex items-center justify-center gap-8 py-4 opacity-30">
                  <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest">
                     <ShieldCheck className="h-4 w-4" /> Pagamento Seguro
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                   <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest">
                     <TrendingUp className="h-4 w-4" /> Top Business
                  </div>
               </div>
            </div>
         </div>
      </main>

      {/* Branded Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 mt-12 bg-slate-950">
         <div className="max-w-6xl mx-auto px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <div className="space-y-4">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">O Estúdio</h4>
               <p className="text-sm font-medium text-slate-400 group flex items-center gap-2">
                 <MapPin className="h-4 w-4 text-primary" /> {publicOrg?.endereco || "Consulte nosso Instagram para localização."}
               </p>
            </div>
            <div className="space-y-4 text-center md:text-left">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Siga-nos</h4>
               <div className="flex gap-4 justify-center md:justify-start">
                  <button className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-primary transition-all hover:text-slate-900"><Instagram className="h-6 w-6" /></button>
                  <button className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-emerald-500 transition-all hover:text-white"><Phone className="h-6 w-6" /></button>
               </div>
            </div>
         </div>
      </footer>

      {bookingId && publicOrg && (
        <PaymentMethodModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          studioId={publicOrg.id}
          checkoutOptions={checkoutOptions}
        />
      )}
    </div>
  );
}
