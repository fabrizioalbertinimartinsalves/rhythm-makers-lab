import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import InstructorLayout from "@/components/layouts/InstructorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, AlertTriangle, Users, Loader2 } from "lucide-react";
import ParqWarningBanner from "@/components/ParqWarningBanner";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function Attendance() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth();
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [checkedStudents, setCheckedStudents] = useState<Set<string>>(new Set());

  const { data: turmas = [], isLoading: loadingTurmas } = useQuery({
    queryKey: ["turmas-attendance-sb", studioId],
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

  const { data: inscricoes = [], isLoading: loadingInscricoes } = useQuery({
    queryKey: ["inscricoes-attendance-sb", studioId, selectedTurma],
    enabled: !!studioId && !!selectedTurma,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          students ( * )
        `)
        .eq("studio_id", studioId)
        .eq("class_id", selectedTurma)
        .eq("ativa", true);
      
      if (error) throw error;
      return data || [];
    },
  });

  const saveAttendance = useMutation({
    mutationFn: async () => {
      if (!studioId || !selectedTurma) return;
      const records = inscricoes.map((i: any) => ({
        studio_id: studioId,
        student_id: i.students?.id || i.student_id,
        class_id: selectedTurma,
        data: new Date().toISOString().split("T")[0],
        presente: checkedStudents.has(i.students?.id || i.student_id),
      }));

      const { error } = await supabase.from("presences").insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      const presentCount = checkedStudents.size;
      toast.success(`Chamada finalizada! ${presentCount} presente${presentCount !== 1 ? "s" : ""}.`);
      setCheckedStudents(new Set());
      queryClient.invalidateQueries({ queryKey: ["inscricoes-attendance-sb"] });
    },
    onError: (e: any) => toast.error("Erro ao salvar chamada: " + e.message),
  });

  const toggleCheck = (id: string) => {
    setCheckedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTurmaData = turmas.find((t: any) => t.id === selectedTurma);

  return (
    <InstructorLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold">Chamada</h1>
          <p className="text-sm text-muted-foreground">Selecione a turma e registre presenças</p>
        </div>

        <Select value={selectedTurma} onValueChange={(v) => { setSelectedTurma(v); setCheckedStudents(new Set()); }}>
          <SelectTrigger>
            <SelectValue placeholder={loadingTurmas ? "Carregando turmas..." : "Selecione a turma"} />
          </SelectTrigger>
          <SelectContent>
            {turmas.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>
                {t.modalities?.emoji} {t.nome || t.modalities?.nome} — {t.horario?.slice(0, 5)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTurma && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {checkedStudents.size}/{inscricoes.length} presentes
                </CardTitle>
                <Badge variant="outline" className="gap-1">
                  {selectedTurmaData?.modalities?.emoji}
                  {selectedTurmaData?.nome || selectedTurmaData?.modalities?.nome}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 p-4">
                {loadingInscricoes ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : inscricoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno inscrito nesta turma</p>
                ) : (
                  inscricoes.map((i: any) => {
                    const student = i.students;
                    if (!student) return null;
                    const isChecked = checkedStudents.has(student.id);
                    return (
                      <button
                        key={student.id}
                        onClick={() => toggleCheck(student.id)}
                        className={`w-full flex items-center justify-between rounded-lg border p-3 transition-colors text-left ${
                          isChecked ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                            isChecked ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            {isChecked ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground">
                                {student.nome?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{student.nome}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              <ParqWarningBanner alunoId={student.id} />
                              {student.observacoes_medicas && (
                                <p className="flex items-center gap-1 text-[10px] text-warning font-medium">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {student.observacoes_medicas}
                                </p>
                              )}
                              {student.status === "suspenso" && (
                                <Badge variant="destructive" className="text-[9px] h-4">Suspenso</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {isChecked && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {inscricoes.length > 0 && (
              <Button 
                className="w-full" 
                size="lg" 
                onClick={() => saveAttendance.mutate()} 
                disabled={saveAttendance.isPending}
              >
                {saveAttendance.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
                ) : (
                  "Finalizar Chamada"
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </InstructorLayout>
  );
}
