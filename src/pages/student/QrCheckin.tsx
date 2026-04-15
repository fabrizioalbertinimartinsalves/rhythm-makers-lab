import { useParams, Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/layouts/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import GeoCheckin from "@/components/GeoCheckin";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function QrCheckin() {
  const { turmaId } = useParams<{ turmaId: string }>();
  const { user, studioId, loading: authLoading } = useAuth();
  const location = useLocation();

  const { data: turma, isLoading: loadingTurma } = useQuery({
    queryKey: ["turma-qr-sb", turmaId],
    enabled: !!turmaId && !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          *,
          modalities ( * )
        `)
        .eq("studio_id", studioId)
        .eq("id", turmaId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

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

  const hoje = new Date().toISOString().split("T")[0];
  const { data: alreadyCheckedIn = false } = useQuery({
    queryKey: ["qr-checkin-today-sb", student?.id, turmaId, hoje],
    enabled: !!student?.id && !!turmaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presences")
        .select("id")
        .eq("student_id", student.id)
        .eq("class_id", turmaId)
        .eq("data", hoje)
        .eq("presente", true);
      
      if (error) throw error;
      return (data?.length || 0) > 0;
    },
  });

  // Show loading while checking auth
  if (authLoading || loadingTurma) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit mb-2">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-lg">Check-in via QR Code</CardTitle>
            {turma && (
              <p className="text-sm text-muted-foreground">
                {turma.modalities?.emoji} {turma.nome}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Faça login para registrar sua presença.
            </p>
            <Button asChild className="w-full">
              <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>
                <LogIn className="h-4 w-4 mr-2" />
                Entrar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingStudent) {
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
          <p className="text-xs text-muted-foreground mt-1">Faça login com sua conta de aluno.</p>
        </div>
      </StudentLayout>
    );
  }

  if (!turma) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground">Turma não encontrada ou você não tem acesso a este estúdio.</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit mb-2">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-lg">
              {turma.modalities?.emoji} {turma.nome}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Check-in via QR Code</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm">Olá, <span className="font-semibold">{student.nome?.split(" ")[0]}</span>!</p>
            {alreadyCheckedIn ? (
              <div className="text-center space-y-2">
                <p className="text-primary font-medium">✅ Presença já confirmada hoje!</p>
                <p className="text-xs text-muted-foreground">Você já fez check-in nesta turma hoje.</p>
              </div>
            ) : (
              <GeoCheckin studentId={student.id} classId={turma.id} />
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
