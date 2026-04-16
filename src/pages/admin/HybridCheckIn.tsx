import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, CheckCircle2, XCircle, Clock, 
  Search, Calendar as CalendarIcon, ArrowRight, UserCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function HybridCheckIn() {
  const { studioId } = useAuth() as any;
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedTurma, setSelectedTurma] = useState<string>("all");

  // 1. Fetch Classes (Regular and Special) for the day
  const { data: schedule = [], isLoading: loadingSchedule } = useQuery({
    queryKey: ["checkin-schedule", studioId, selectedDate],
    enabled: !!studioId,
    queryFn: async () => {
      const dateObj = new Date(selectedDate + "T12:00:00");
      const dayOfWeekNum = dateObj.getDay();
      const dayOfWeekStr = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"][dayOfWeekNum];
      
      const [reg, special] = await Promise.all([
        supabase.from("classes").select("*, modalities(nome)").eq("studio_id", studioId).contains("dias_semana", [dayOfWeekStr]),
        supabase.from("classes_avulsas").select("*, modalities(nome)").eq("studio_id", studioId).eq("data", selectedDate)
      ]);

      return [
        ...(reg.data || []).map(x => ({ ...x, type: "regular", horario_inicio: x.horario })),
        ...(special.data || []).map(x => ({ ...x, type: "special", horario_inicio: x.horario }))
      ].sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio));
    }
  });

  // 2. Fetch Students for the selected class
  const { data: attendees = [], isLoading: loadingAttendees } = useQuery({
    queryKey: ["checkin-attendees", selectedTurma, selectedDate],
    enabled: selectedTurma !== "all",
    queryFn: async () => {
      const turma = schedule.find(x => x.id === selectedTurma);
      if (!turma) return [];

      if (turma.type === "regular") {
        const [enrollmentRes, experimentalRes] = await Promise.all([
          supabase.from("enrollments").select("id, students(nome)").eq("class_id", selectedTurma).eq("ativa", true),
          supabase.from("bookings").select("id, nome_avulso").eq("class_id", selectedTurma).eq("data", selectedDate).eq("tipo", "avulso").eq("status", "confirmado")
        ]);

        return [
          ...(enrollmentRes.data || []).map(x => ({ id: x.id, nome: (x.students as any)?.nome, type: "Fixo" })),
          ...(experimentalRes.data || []).map(x => ({ id: x.id, nome: x.nome_avulso, type: "Experimental" }))
        ].sort((a, b) => a.nome.localeCompare(b.nome));
      } else {
        // Special class only has bookings
        const { data, error } = await supabase.from("bookings").select("id, nome_avulso").eq("class_avulsa_id", selectedTurma).eq("status", "confirmado");
        if (error) throw error;
        return (data || []).map(x => ({ id: x.id, nome: x.nome_avulso, type: "Especial" })).sort((a, b) => a.nome.localeCompare(b.nome));
      }
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              Check-in <span className="text-primary italic">Consolidado</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] mt-2 flex items-center gap-2">
              ATTENDANCE CONTROL <span className="h-1 w-1 rounded-full bg-slate-200" /> HYBRID SYSTEM
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
              className="rounded-xl h-10 w-full md:w-44 font-bold text-xs"
            />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Schedule List */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Grade do Dia
            </h2>
            <div className="grid gap-2">
              {schedule.length > 0 ? schedule.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTurma(t.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all border-none ring-1 flex justify-between items-center",
                    selectedTurma === t.id ? "bg-primary text-white ring-primary shadow-lg shadow-primary/20" : "bg-white text-slate-600 ring-slate-100 hover:bg-slate-50"
                  )}
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                      {t.horario_inicio?.substring(0, 5)} - {t.horario_fim?.substring(0, 5) || "--:--"}
                    </p>
                    <h3 className="font-bold text-sm truncate max-w-[180px]">{t.nome || t.modalities?.nome}</h3>
                  </div>
                  <Badge className={cn("text-[8px] font-black uppercase", selectedTurma === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400")}>
                    {t.type === "regular" ? "Fixa" : "Única"}
                  </Badge>
                </button>
              )) : (
                <p className="text-xs font-medium text-slate-400 py-10 text-center italic">Nenhuma aula para esta data.</p>
              )}
            </div>
          </div>

          {/* Attendees List */}
          <div className="lg:col-span-8">
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden ring-1 ring-slate-100 min-h-[500px]">
              <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Lista de Chamada</CardTitle>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {selectedTurma === "all" ? "Selecione uma turma ao lado" : schedule.find(x => x.id === selectedTurma)?.nome}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Badge className="bg-primary text-white text-[10px] uppercase font-black px-3 h-6">{attendees.length} Alunos</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                 {selectedTurma === "all" ? (
                   <div className="py-32 text-center space-y-4">
                     <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                       <ArrowRight className="h-8 w-8" />
                     </div>
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Selecione uma turma para ver a lista</p>
                   </div>
                 ) : attendees.length > 0 ? (
                   <div className="divide-y divide-slate-50">
                     {attendees.map((a: any) => (
                       <div key={a.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                         <div className="flex items-center gap-4">
                           <div className={cn(
                             "h-10 w-10 rounded-full flex items-center justify-center font-black text-xs",
                             a.type === "Fixo" ? "bg-slate-100 text-slate-400" : "bg-amber-100 text-amber-600"
                           )}>
                             {a.nome?.substring(0, 2).toUpperCase() || "??"}
                           </div>
                           <div>
                             <p className="font-bold text-slate-900">{a.nome}</p>
                             <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-none p-0 h-auto">
                               {a.type}
                             </Badge>
                           </div>
                         </div>
                         <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="rounded-xl h-9 w-9 p-0 border-slate-100 text-slate-300 hover:text-emerald-500 hover:border-emerald-100 hover:bg-emerald-50">
                              <UserCheck className="h-4 w-4" />
                            </Button>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="py-32 text-center">
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum aluno confirmado nesta turma.</p>
                   </div>
                 )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
