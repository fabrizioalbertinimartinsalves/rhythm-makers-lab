import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import InstructorLayout from "@/components/layouts/InstructorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bell, AlertCircle, Loader2, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadAvisos } from "@/hooks/useUnreadAvisos";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof Bell> = {
  lembrete: Bell,
  alerta: AlertCircle,
  info: MessageSquare,
};

const tipoBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; className: string }> = {
  info: { label: "Informação", variant: "secondary", className: "bg-blue-100 text-blue-700   border-blue-200 " },
  lembrete: { label: "Lembrete", variant: "default", className: "bg-amber-100 text-amber-700   border-amber-200 " },
  alerta: { label: "Alerta", variant: "destructive", className: "bg-red-100 text-red-700   border-red-200 " },
};

const iconBg: Record<string, string> = {
  info: "bg-blue-100 text-blue-600  ",
  lembrete: "bg-amber-100 text-amber-600  ",
  alerta: "bg-red-100 text-red-600  ",
};

export default function InstructorNotices() {
  const { studioId } = useAuth();
  const hoje = new Date().toISOString().split("T")[0];
  const { markAsRead } = useUnreadAvisos(["todos", "instrutores"]);

  const { data: avisos = [], isLoading } = useQuery<any[]>({
    queryKey: ["avisos-instructor-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .lte("data_inicio", hoje)
        .in("destinatario", ["todos", "instrutores"])
        .or(`data_fim.is.null,data_fim.gte.${hoje}`)
        .order("created_at", { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (avisos.length > 0) {
      markAsRead.mutate(avisos.map((a: any) => a.id));
    }
  }, [avisos]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Agora";
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <InstructorLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Mural de Avisos</h1>
            <p className="text-sm text-muted-foreground">Comunicados e avisos do estúdio</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : avisos.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum aviso no momento</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Novos comunicados aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {avisos.map((aviso: any) => {
              const Icon = iconMap[aviso.tipo] || MessageSquare;
              const badge = tipoBadge[aviso.tipo] || tipoBadge.info;
              const bgClass = iconBg[aviso.tipo] || iconBg.info;
              
              return (
                <Card key={aviso.id} className="overflow-hidden border-border/60 hover:border-border transition-colors">
                  <CardContent className="p-0">
                    <div className="p-4 sm:p-5">
                      <div className="flex gap-4">
                        <div className={cn("mt-0.5 rounded-lg p-2.5 shrink-0 h-fit", bgClass)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-base font-semibold leading-tight">{aviso.titulo}</p>
                              <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-4 border", badge.className)}>
                                {badge.label}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                              {formatDate(aviso.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {aviso.corpo}
                          </p>
                        </div>
                      </div>
                    </div>

                    {aviso.imagem_url && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                        <img
                          src={aviso.imagem_url}
                          alt={aviso.titulo}
                          className="w-full max-h-64 object-cover rounded-lg border border-border/40"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
