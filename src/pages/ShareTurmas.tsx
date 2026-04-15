/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePublicOrg } from "@/hooks/usePublicOrg";
import { supabase } from "@/lib/supabase";
import { Clock, CalendarDays, MapPin, Phone, Loader2, Share2, CheckCircle2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const DIAS_LABEL: Record<string, string> = {
  seg: "Segunda", ter: "Terça", qua: "Quarta",
  qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo",
};

export default function ShareTurmas() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: publicOrg } = usePublicOrg();
  const orgId = publicOrg?.id;

  const { data: config } = useQuery({
    queryKey: ["studio-config-share-sb", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.from("studios").select("*").eq("id", orgId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: turmas = [], isLoading } = useQuery({
    queryKey: ["share-turmas-sb", orgId, ids],
    queryFn: async () => {
      if (!orgId) return [];
      
      let query = supabase
        .from("classes")
        .select(`*, modalities(id, nome, emoji, cor, valor_base)`)
        .eq("studio_id", orgId);
      
      if (ids.length > 0) {
        query = query.in("id", ids);
      } else {
        query = query.eq("ativa", true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        limite_vagas: t.capacidade,
        horario: t.horario,
        dias_semana: t.dias_semana || []
      }));
    },
    enabled: !!orgId,
  });

  const { data: bookingCounts = {} } = useQuery({
    queryKey: ["share-bookings-count-sb", orgId, ids, turmas.length],
    queryFn: async () => {
      if (!orgId || !turmas.length) return {};
      
      const turmaIds = turmas.map(t => t.id);
      const { data, error } = await supabase
        .from("bookings")
        .select("schedule_item_id, class_id")
        .in("class_id", turmaIds);
      
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(b => {
        counts[b.class_id] = (counts[b.class_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!orgId && ids.length > 0,
  });

  const grouped = turmas.reduce((acc: Record<string, any[]>, t: any) => {
    // PostgREST pode retornar relacionamento como objeto ou array de 1 item
    const mod = Array.isArray(t.modalities) ? t.modalities[0] : t.modalities;
    const key = mod?.nome || "Outros";
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...t, modalities: mod });
    return acc;
  }, {});

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGoToPreMatricula = () => {
    const selectedTurmas = turmas.filter((t: any) => selectedIds.includes(t.id));
    const names = selectedTurmas.map((t: any) => t.nome).join(", ");
    const modalidades = [...new Set(selectedTurmas.map((t: any) => t.modalities?.nome).filter(Boolean))].join(", ");
    navigate(`/pre-matricula?turmas=${encodeURIComponent(names)}&modalidade=${encodeURIComponent(modalidades)}`);
  };

  const handleWhatsAppShare = () => {
    const text = `Confira nossas turmas! 🏋️\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  
  if (!orgId) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4 text-center">
        <h1 className="text-xl font-bold text-slate-800">Estúdio não encontrado</h1>
        <p className="text-slate-500 mt-2">O link pode estar incompleto ou o estúdio está inativo.</p>
        <Button onClick={() => navigate("/")} className="mt-4" variant="outline">Voltar ao Início</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
       <div className="bg-white border-b py-10 px-4 text-center">
          {config?.logo_url && <img src={config.logo_url} className="h-16 mx-auto mb-4" />}
          <h1 className="text-3xl font-bold">{config?.nome || "Nossas Turmas"}</h1>
          <p className="text-muted-foreground mt-2">Veja os horários disponíveis e reserve sua vaga</p>
       </div>

       <div className="max-w-3xl mx-auto px-4 py-12">
          {Object.entries(grouped).map(([modName, items]) => (
            <div key={modName} className="mb-10">
               <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                 <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg">{(items[0] as any).modalities?.emoji || "🏋️"}</span>
                 {modName}
               </h2>
               <div className="grid gap-3">
                 {(items as any[]).map(t => {
                    const occupied = bookingCounts[t.id] || 0;
                    const remaining = Math.max(0, (t.limite_vagas || 0) - occupied);
                    const isSelected = selectedIds.includes(t.id);
                    const days = t.dias_semana || [];

                   return (
                     <Card key={t.id} className={cn("cursor-pointer border-l-4 transition-all", isSelected ? "ring-2 ring-primary" : "")} style={{ borderLeftColor: t.modalities?.cor || "#6B9B7A" }} onClick={() => toggleSelect(t.id)}>
                        <CardContent className="p-4 flex justify-between items-center">
                           <div className="flex gap-3 items-start">
                              <Checkbox checked={isSelected} className="mt-1" onCheckedChange={() => toggleSelect(t.id)} />
                              <div>
                                <h3 className="font-bold">{t.nome}</h3>
                                <div className="flex gap-2 mt-1">
                                   {days.map((d: any) => <Badge key={d} variant="outline" className="text-[10px]">{DIAS_LABEL[d] || d}</Badge>)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Valor Base: R$ {(t.modalities?.valor_base || 0).toFixed(2)}/mês</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className={cn("text-2xl font-black", remaining === 0 ? "text-destructive" : "text-primary")}>{remaining}</div>
                              <p className="text-[10px] uppercase text-muted-foreground font-bold">Vagas</p>
                           </div>
                        </CardContent>
                     </Card>
                   );
                 })}
               </div>
            </div>
          ))}

          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
              <Button onClick={handleGoToPreMatricula} className="w-full shadow-2xl bg-teal-600 hover:bg-teal-700 h-12 gap-2">
                Fazer Pré-Matrícula <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
       </div>
    </div>
  );
}