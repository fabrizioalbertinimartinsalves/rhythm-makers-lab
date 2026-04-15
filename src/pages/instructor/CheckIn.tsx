import InstructorLayout from "@/components/layouts/InstructorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, Loader2, Calendar as CalendarIcon, MapPin, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import InstructorCheckInButton from "@/components/admin/InstructorCheckInButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CheckIn() {
  const { user, studioId } = useAuth();
  
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  const { data: occurrences = [], isLoading } = useQuery<any[]>({
    queryKey: ["instructor-dedicated-checkin", studioId, user?.id],
    enabled: !!studioId && !!user?.id,
    queryFn: async () => {
      // 1. Ensure occurrences are generated
      await supabase.rpc("ensure_today_occurrences", { p_studio_id: studioId });

      // 2. Fetch occurrences
      let query = supabase
        .from("class_occurrences")
        .select(`
          *,
          classes ( 
            nome, 
            sala,
            modalities ( nome, emoji )
          )
        `)
        .eq("studio_id", studioId)
        .eq("occurrence_date", dateStr);

      // SuperAdmin bypass: If user is admin, show all today's classes
      // Otherwise filter by instructor
      const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'superadmin';
      
      if (!isAdmin) {
        query = query.or(`scheduled_instructor_id.eq.${user?.id},actual_instructor_id.eq.${user?.id}`);
      }

      const { data, error } = await query.order("start_time");
      
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <InstructorLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Fazer Check-in
          </h1>
          <p className="text-sm text-muted-foreground">Confirme sua presença nas aulas de hoje para registro financeiro.</p>
        </div>

        {occurrences.length === 0 && !isLoading && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 font-bold">Nenhuma aula agendada</AlertTitle>
            <AlertDescription className="text-amber-700 text-xs">
              Não encontramos aulas vinculadas a você para o dia de hoje. Se isso for um erro, verifique sua escala com a recepção.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            occurrences.map((occ) => (
              <Card key={occ.id} className="shadow-sm border-slate-100 hover:shadow-md transition-shadow group">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex flex-col items-center justify-center min-w-[60px] py-2 px-3 bg-slate-100 rounded-xl group-hover:bg-primary/10 transition-colors">
                      <span className="text-[10px] font-black uppercase text-slate-400">Início</span>
                      <span className="text-xs font-black text-slate-600 group-hover:text-primary transition-colors">{(occ.start_time || "").slice(0, 5)}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black uppercase italic tracking-tighter text-slate-900">
                          {occ.classes?.nome || occ.classes?.modalities?.nome}
                        </p>
                        {occ.classes?.modalities?.emoji && <span>{occ.classes.modalities.emoji}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                         <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {occ.classes?.sala || "Geral"}
                         </span>
                         {occ.status === 'completed' && (
                           <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                              Check-in Realizado
                           </span>
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto">
                    <InstructorCheckInButton 
                      occurrenceId={occ.id}
                      initialStatus={occ.status}
                      initialCheckInTime={occ.checkin_time}
                      className="w-full sm:w-[160px] py-1 shadow-lg shadow-primary/10 rounded-xl font-bold uppercase tracking-widest text-[9px]"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100 mt-12">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Por que fazer check-in?</h3>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
               O check-in é o registro oficial da sua aula. Ele é usado pelo sistema para calcular automaticamente o seu repasse no final do mês. 
               Aulas sem check-in podem ser consideradas como "não realizadas" no fechamento financeiro.
            </p>
        </div>
      </div>
    </InstructorLayout>
  );
}
