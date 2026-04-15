import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePublicOrg } from "@/hooks/usePublicOrg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, User, Users, Phone, Mail, ArrowRight, BookOpen, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const diasLabel: Record<number, string> = {
  0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
};

export default function EnrollmentPage() {
  const { data: studio, isLoading: loadingStudio } = usePublicOrg();
  const studioId = studio?.id;
  const [selectedTurma, setSelectedTurma] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    whatsapp: "",
    email: "",
  });

  // 1. Fetch available Regular Classes
  const { data: turmas = [], isLoading } = useQuery({
    queryKey: ["public-enrollment-classes", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          id, 
          nome, 
          horario, 
          horario_fim,
          dias_semana, 
          capacidade,
          modalities ( id, nome, emoji ),
          enrollments(count)
        `)
        .eq("studio_id", studioId)
        .eq("ativa", true);
      
      if (error) throw error;

      // Calculate availability client-side for now or use a view later
      return (data || []).map(t => {
        const modality = Array.isArray(t.modalities) ? t.modalities[0] : t.modalities;
        return {
          id: t.id,
          nome: t.nome,
          horario_inicio: t.horario,
          horario_fim: t.horario_fim || t.horario,
          dias_semana: t.dias_semana.map((d: string) => Object.entries(diasLabel).find(([_, label]) => label === d)?.[0] || 0),
          vagas_disponiveis: t.capacidade - (t.enrollments?.[0]?.count || 0),
          modalidade_nome: modality?.nome,
          modalidade_emoji: modality?.emoji
        };
      }).filter(t => t.vagas_disponiveis > 0);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTurma || !studioId) return;
      
      const { error } = await supabase
        .from("pre_matriculas")
        .insert({
          studio_id: studioId,
          class_id: selectedTurma.id,
          nome: form.nome,
          telefone: form.whatsapp,
          email: form.email,
          status: "pendente"
        });
      
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => toast.error("Erro ao realizar matrícula: " + e.message),
  });

  if (isLoading || loadingStudio) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>;

  if (submitted) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-6 animate-in zoom-in duration-500">
        <div className="h-24 w-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Matrícula Realizada!</h2>
        <p className="text-slate-500 font-medium leading-relaxed">
          Sua vaga na turma de <span className="font-bold text-slate-700">{selectedTurma?.modalidade_nome}</span> está garantida. Nosso time entrará em contato em breve.
        </p>
        <Button className="w-full rounded-2xl h-12" onClick={() => window.location.href = "/"}>Voltar para o Início</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-12 animate-in fade-in duration-500">
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
          Matrícula <span className="text-primary italic">Regular</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-xl mx-auto">
          Escolha uma turma fixa para seu plano mensal e garanta sua vaga.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Classes List */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Turmas Disponíveis
          </h2>
          
          <div className="grid gap-4">
            {turmas.length > 0 ? (
              turmas.map((t: any) => (
                <Card 
                  key={t.id} 
                  className={cn(
                    "cursor-pointer group transition-all border-none ring-1 ring-slate-100 hover:shadow-lg overflow-hidden",
                    selectedTurma?.id === t.id ? "ring-2 ring-primary bg-primary/5" : "bg-white"
                  )}
                  onClick={() => setSelectedTurma(t)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{t.modalidade_emoji}</span>
                          <h3 className="font-black uppercase italic tracking-tighter text-xl">{t.modalidade_nome}</h3>
                          <Badge variant="outline" className="bg-slate-50 text-[10px] uppercase font-bold py-0 h-4 border-none ring-1 ring-slate-100">
                            Fixo
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                          <div className="flex items-center gap-1 text-xs font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{t.horario_inicio.substring(0, 5)} - {t.horario_fim.substring(0, 5)}</span>
                          </div>
                          <div className="h-1 w-1 rounded-full bg-slate-300" />
                          <div className="flex items-center gap-1 text-xs font-medium">
                            <Users className="h-3.5 w-3.5" />
                            <span>{t.vagas_disponiveis} vagas</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {t.dias_semana.map((d: number) => (
                          <div key={d} className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black uppercase text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                            {diasLabel[d]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-slate-400 font-medium">Nenhuma turma com vaga disponível no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* Form Side */}
        <div className="lg:col-span-5">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden ring-1 ring-slate-100">
            <CardHeader className="bg-slate-50 p-8 border-b border-slate-100">
              <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Seus Dados</CardTitle>
              <CardDescription className="font-medium">Preencha para concluir sua reserva de vaga.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-3 h-5 w-5 text-slate-300" />
                    <Input 
                      placeholder="Ex: Maria Silva" 
                      className="pl-11 h-12 rounded-2xl bg-white border-slate-100 placeholder:text-slate-300 focus-visible:ring-primary"
                      value={form.nome}
                      onChange={e => setForm({...form, nome: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3 h-5 w-5 text-slate-300" />
                    <Input 
                      placeholder="(00) 0 0000-0000" 
                      className="pl-11 h-12 rounded-2xl bg-white border-slate-100 placeholder:text-slate-300 focus-visible:ring-primary"
                      value={form.whatsapp}
                      onChange={e => setForm({...form, whatsapp: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3 h-5 w-5 text-slate-300" />
                    <Input 
                      type="email"
                      placeholder="seu@email.com" 
                      className="pl-11 h-12 rounded-2xl bg-white border-slate-100 placeholder:text-slate-300 focus-visible:ring-primary"
                      value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full h-14 rounded-2xl text-lg font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  disabled={!selectedTurma || !form.nome || submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                >
                  {submitMutation.isPending ? <Loader2 className="animate-spin" /> : (
                    <>Solicitar Matrícula <ArrowRight className="ml-2" /></>
                  )}
                </Button>
                {!selectedTurma && (
                  <p className="text-center text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-4">
                    Selecione uma turma ao lado para continuar
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
