import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface ParqWarningBannerProps {
  alunoId: string;
}

export default function ParqWarningBanner({ alunoId }: ParqWarningBannerProps) {
  const { studioId } = useAuth();
  
  const { data: parqStatus } = useQuery({
    queryKey: ["parq-status-sb", alunoId],
    enabled: !!alunoId && !!studioId,
    queryFn: async () => {
      if (!studioId) return { status: "missing" as const };
      
      const { data, error } = await supabase
        .from("parq")
        .select("*")
        .eq("studio_id", studioId)
        .eq("student_id", alunoId)
        .order("data_preenchimento", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return { status: "missing" as const };
      
      const today = new Date().toISOString().split("T")[0];
      if (data.data_validade < today) return { status: "expired" as const };
      
      return { status: "valid" as const };
    },
  });

  if (!parqStatus || parqStatus.status === "valid") return null;

  const message =
    parqStatus.status === "missing"
      ? "PAR-Q não preenchido. Solicite o preenchimento do Termo de Aptidão Física."
      : "PAR-Q vencido. Solicite a atualização do Termo de Aptidão Física.";

  return (
    <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <span>{message}</span>
    </div>
  );
}
