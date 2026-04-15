import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/layouts/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, FileText, Calendar, Loader2, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import PersonalPreferencesTab from "@/components/PersonalPreferencesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Profile() {
  const { user, studioId } = useAuth();

  const { data: student, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (!student) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground">Perfil de aluno não encontrado.</p>
          <p className="text-xs text-muted-foreground mt-1">Entre em contato com a recepção.</p>
        </div>
      </StudentLayout>
    );
  }

  const infoItems = [
    { icon: Mail, label: "E-mail", value: student.email },
    { icon: Phone, label: "Telefone", value: student.telefone },
    { icon: FileText, label: "CPF", value: student.cpf },
    { icon: Calendar, label: "Nascimento", value: student.data_nascimento ? new Date(student.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR") : null },
  ];

  return (
    <StudentLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col items-center gap-3 py-4">
          {student.foto_url ? (
            <img
              src={student.foto_url}
              alt={student.nome}
              className="h-20 w-20 rounded-full object-cover border-4 border-primary/20"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {student.nome?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </span>
            </div>
          )}
          <div className="text-center">
            <h1 className="text-xl font-bold">{student.nome}</h1>
            <Badge variant={student.status === "ativo" ? "default" : "secondary"} className="mt-1">
              {student.status}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados" className="gap-1"><User className="h-3.5 w-3.5" /> Dados</TabsTrigger>
            <TabsTrigger value="preferencias" className="gap-1"><Settings className="h-3.5 w-3.5" /> Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-6 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" /> Dados Cadastrais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {infoItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-medium truncate">{item.value || "—"}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {student.observacoes_medicas && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Observações Médicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{student.observacoes_medicas}</p>
                </CardContent>
              </Card>
            )}

            <p className="text-[10px] text-center text-muted-foreground">
              Para alterar seus dados, entre em contato com a recepção do estúdio.
            </p>
          </TabsContent>

          <TabsContent value="preferencias" className="space-y-6 mt-4">
            <PersonalPreferencesTab role="student" showDashboardSections={false} />
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
}
