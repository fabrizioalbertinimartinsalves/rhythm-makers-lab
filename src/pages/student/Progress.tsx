import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { 
  Scaling, TrendingUp, Calendar, Camera, Info, 
  Activity, ArrowUpRight, ArrowDownRight, User,
  MessageSquare, History, FileText
} from "lucide-react";
import StudentLayout from "@/components/layouts/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function Progress() {
  const { user, studioId } = useAuth();

  // 1. Get student profile
  const { data: student } = useQuery({
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

  // 2. Physical Assessments
  const { data: assessments = [], isLoading: loadingAssessments } = useQuery({
    queryKey: ["student-assessments", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("physical_assessments")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });
      return data || [];
    }
  });

  // 3. Evolution Photos
  const { data: photos = [], isLoading: loadingPhotos } = useQuery({
    queryKey: ["student-photos", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("evolution_photos")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });
      return data || [];
    }
  });

  // 4. Recent Sessions (Old data)
  const { data: sessoes = [] } = useQuery({
    queryKey: ["my-sessoes-sb", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("student_id", student.id)
        .order("data", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // 5. Records/Prontuários (Old data)
  const { data: records = [] } = useQuery({
    queryKey: ["my-prontuarios-sb", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("prontuarios")
        .select("*")
        .eq("student_id", student.id)
        .order("data", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const latest = assessments[0];
  const previous = assessments[1];

  const calculateChange = (current: number, prev: number) => {
    if (!prev) return null;
    const diff = current - prev;
    return {
      value: Math.abs(diff).toFixed(1),
      isIncrease: diff > 0,
      isPositive: diff < 0 // For weight/fat, decrease is usually positive
    };
  };

  if (loadingAssessments || loadingPhotos) {
    return (
      <StudentLayout>
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
           <Skeleton className="h-12 w-64 rounded-xl" />
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
           </div>
           <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      </StudentLayout>
    );
  }

  if (!student) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
           <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-slate-300 mb-6 mx-auto">
              <User className="h-8 w-8" />
           </div>
           <h2 className="text-xl font-black text-slate-900 uppercase">Perfil não vinculado</h2>
           <p className="text-sm text-slate-500 mt-2 font-medium">Não identificamos um cadastro de aluno vinculado ao seu usuário.</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Dashboard de Evolução</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Acompanhamento completo de resultados</p>
          </div>
          {latest && (
            <Badge className="w-fit bg-primary/10 text-primary border-none px-4 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest shadow-sm">
              Última avaliação: {new Date(latest.created_at).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {assessments.length === 0 ? (
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-white via-white to-slate-50 border-t border-slate-100 p-20 text-center">
            <div className="h-24 w-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl mb-8 border border-slate-50 text-slate-200">
               <Scaling className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Sua jornada física começa aqui</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-4 font-medium leading-relaxed">
              Você ainda não possui avaliações físicas registradas. Fale com seu instrutor(a) para agendar sua primeira bioimpedância ou perimetria!
            </p>
          </Card>
        ) : (
          <Tabs defaultValue="fisico" className="space-y-8">
            <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 h-14 backdrop-blur-sm sticky top-4 z-10 shadow-sm w-full sm:w-auto">
              <TabsTrigger value="fisico" className="rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all">Avaliação Física</TabsTrigger>
              <TabsTrigger value="galeria" className="rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all">Galeria Visual</TabsTrigger>
              <TabsTrigger value="registros" className="rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all">Sessões & Notas</TabsTrigger>
            </TabsList>

            <TabsContent value="fisico" className="space-y-8 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Weight Card */}
                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/30 overflow-hidden bg-white group hover:shadow-2xl transition-all">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-14 w-14 rounded-2xl bg-indigo-50/50 text-indigo-500 flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                        <Activity className="h-7 w-7" />
                      </div>
                      {calculateChange(latest.weight, previous?.weight) && (
                        <Badge className={cn("rounded-lg px-2 py-1 border-none shadow-sm font-black uppercase text-[9px] tracking-tight", 
                          calculateChange(latest.weight, previous?.weight)?.isPositive ? "bg-emerald-100/50 text-emerald-600" : "bg-rose-100/50 text-rose-600")}>
                          {calculateChange(latest.weight, previous?.weight)?.isIncrease ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                          {calculateChange(latest.weight, previous?.weight)?.value}kg
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Peso Atual</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-black text-slate-900">{latest.weight}</span>
                      <span className="text-xs font-bold text-slate-400">kg</span>
                    </div>
                  </CardContent>
                </Card>

                {/* BF% Card */}
                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/30 overflow-hidden bg-white group hover:shadow-2xl transition-all border-t-4 border-emerald-400">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-50/50 text-emerald-500 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-7 w-7" />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gordura Corporal</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-black text-primary">{latest.body_fat_pct}</span>
                      <span className="text-xs font-bold text-primary/70">%</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Waist Card */}
                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/30 overflow-hidden bg-white group hover:shadow-2xl transition-all">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-14 w-14 rounded-2xl bg-amber-50/50 text-amber-500 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
                        <Activity className="h-7 w-7 rotate-90" />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cintura</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-black text-slate-900">{latest.waist}</span>
                      <span className="text-xs font-bold text-slate-400">cm</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Metrics Table */}
              <Card className="rounded-[3rem] border-none shadow-xl shadow-slate-200/20 overflow-hidden bg-white">
                <CardHeader className="p-10 pb-4 flex flex-row items-center justify-between">
                   <div>
                      <CardTitle className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                         <History className="h-4 w-4 text-primary" /> Histórico Abrangente
                      </CardTitle>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Últimas {assessments.length} medições antropométricas</p>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-y border-slate-100">
                             <th className="px-10 py-5">Data da Avaliação</th>
                             <th className="px-8 py-5">Gordura (%)</th>
                             <th className="px-8 py-5">Peso (kg)</th>
                             <th className="px-8 py-5">Braço D.</th>
                             <th className="px-8 py-5">Abdom.</th>
                             <th className="px-8 py-5">Coxa D.</th>
                             <th className="px-10 py-5">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {assessments.map((ass) => (
                             <tr key={ass.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-10 py-6">
                                   <div className="flex flex-col">
                                      <span className="text-xs font-black text-slate-900">{new Date(ass.created_at).toLocaleDateString("pt-BR")}</span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Instructor Assessment</span>
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="flex items-center gap-2">
                                      <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden">
                                         <div className="h-full bg-primary" style={{ width: `${Math.min(100, ass.body_fat_pct * 3)}%` }} />
                                      </div>
                                      <span className="text-sm font-black text-primary">{ass.body_fat_pct}%</span>
                                   </div>
                                </td>
                                <td className="px-8 py-6 text-sm font-medium text-slate-700">{ass.weight} kg</td>
                                <td className="px-8 py-6 text-sm font-medium text-slate-600">{ass.right_arm} cm</td>
                                <td className="px-8 py-6 text-sm font-medium text-slate-600">{ass.abdomen} cm</td>
                                <td className="px-8 py-6 text-sm font-medium text-slate-600">{ass.right_thigh_circ} cm</td>
                                <td className="px-10 py-6">
                                   <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-full px-3 py-1 font-bold text-[9px] uppercase tracking-widest">Validado</Badge>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="galeria" className="space-y-8 outline-none">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                     <Camera className="h-5 w-5" />
                  </div>
                  <div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Galeria de Evolução</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Visão visual do seu progresso</p>
                  </div>
               </div>

               {photos.length === 0 ? (
                 <Card className="rounded-[3rem] border-2 border-dashed border-slate-100 p-24 text-center bg-slate-50/20">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma foto carregada pelo instrutor ainda.</p>
                 </Card>
               ) : (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {photos.map((photo) => (
                       <div key={photo.id} className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-100 group cursor-pointer">
                          <img 
                            src={photo.photo_url} 
                            alt={photo.label} 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-6 left-6 right-6">
                             <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">{new Date(photo.created_at).toLocaleDateString()}</p>
                             <p className="text-xs font-black text-white uppercase tracking-wider">{photo.label}</p>
                          </div>
                       </div>
                    ))}
                 </div>
               )}
            </TabsContent>

            <TabsContent value="registros" className="grid grid-cols-1 md:grid-cols-2 gap-8 outline-none">
               {/* Sessions Column */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <Activity className="h-5 w-5 text-primary" />
                     <h3 className="text-lg font-black text-slate-900 uppercase">Sessões Recentes</h3>
                  </div>
                  <div className="space-y-4">
                     {sessoes.map((s: any) => (
                        <Card key={s.id} className="rounded-3xl border-none shadow-md shadow-slate-100 bg-white hover:shadow-xl transition-all border-l-4 border-l-primary/30">
                           <CardContent className="p-6">
                              <div className="flex justify-between mb-2">
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                                 {s.humor && <Badge variant="secondary" className="text-[8px] font-bold uppercase">{s.humor}</Badge>}
                              </div>
                              {s.observacoes && <p className="text-sm font-medium text-slate-700 leading-relaxed">"{s.observacoes}"</p>}
                              {(s.nivel_dor_antes !== null && s.nivel_dor_depois !== null) && (
                                <div className="mt-4 flex gap-4 pt-4 border-t border-slate-50">
                                   <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Nível de Dor</span>
                                      <span className="text-xs font-black text-rose-500">{s.nivel_dor_antes} ➜ {s.nivel_dor_depois}</span>
                                   </div>
                                </div>
                              )}
                           </CardContent>
                        </Card>
                     ))}
                     {sessoes.length === 0 && <p className="text-xs font-bold text-slate-400 uppercase text-center py-8">Nenhuma sessão registrada</p>}
                  </div>
               </div>

               {/* Records Column */}
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <FileText className="h-5 w-5 text-amber-500" />
                     <h3 className="text-lg font-black text-slate-900 uppercase">Notas & Prontuários</h3>
                  </div>
                  <div className="space-y-4">
                     {records.map((r: any) => (
                        <Card key={r.id} className="rounded-3xl border-none shadow-md shadow-slate-100 bg-white hover:shadow-xl transition-all">
                           <CardContent className="p-6">
                              <div className="flex justify-between mb-2">
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                                 <Badge variant="outline" className="text-[8px] font-bold uppercase">{r.tipo || "Geral"}</Badge>
                              </div>
                              <p className="text-sm font-medium text-slate-700">{r.descricao}</p>
                           </CardContent>
                        </Card>
                     ))}
                     {records.length === 0 && <p className="text-xs font-bold text-slate-400 uppercase text-center py-8">Nenhum prontuário registrado</p>}
                  </div>
               </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </StudentLayout>
  );
}
