import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/layouts/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bell, AlertCircle, Loader2, Search, ChevronDown, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadAvisos } from "@/hooks/useUnreadAvisos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

type FilterType = "todos" | "info" | "lembrete" | "alerta";

export default function Messages() {
  const hoje = new Date().toISOString().split("T")[0];
  const { markAsRead } = useUnreadAvisos(["todos", "alunos"]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { studioId } = useAuth();
  const { data: avisos = [], isLoading } = useQuery({
    queryKey: ["avisos-student-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .lte("data_inicio", hoje)
        .in("destinatario", ["todos", "alunos"])
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

  const filtered = avisos.filter((a: any) => {
    const matchesSearch = !search || a.titulo.toLowerCase().includes(search.toLowerCase()) || a.corpo.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "todos" || a.tipo === filter;
    return matchesSearch && matchesFilter;
  });

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

  const filters: { key: FilterType; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "info", label: "Info" },
    { key: "lembrete", label: "Lembretes" },
    { key: "alerta", label: "Alertas" },
  ];

  return (
    <StudentLayout>
      <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Mural de Avisos</h1>
            <p className="text-xs text-muted-foreground">
              {avisos.length} {avisos.length === 1 ? "comunicado" : "comunicados"}
            </p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar avisos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {filters.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                className={cn("h-7 text-xs px-3 rounded-full shrink-0", filter !== f.key && "bg-background")}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {search || filter !== "todos" ? "Nenhum aviso encontrado" : "Nenhum aviso no momento"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search || filter !== "todos" ? "Tente outro filtro ou termo de busca" : "Novos comunicados aparecerão aqui"}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((aviso: any) => {
              const Icon = iconMap[aviso.tipo] || MessageSquare;
              const badge = tipoBadge[aviso.tipo] || tipoBadge.info;
              const bgClass = iconBg[aviso.tipo] || iconBg.info;
              const isExpanded = expandedId === aviso.id;
              const isLong = aviso.corpo && aviso.corpo.length > 120;

              return (
                <Card
                  key={aviso.id}
                  className="overflow-hidden border-border/60 hover:border-border transition-colors"
                >
                  <CardContent className="p-0">
                    <div className="p-3.5 sm:p-4">
                      <div className="flex gap-3">
                        <div className={cn("mt-0.5 rounded-lg p-2 shrink-0 h-fit", bgClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold leading-tight">{aviso.titulo}</p>
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", badge.className)}>
                                {badge.label}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                              {formatDate(aviso.created_at)}
                            </span>
                          </div>

                          <div className="relative">
                            <p className={cn(
                              "text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed",
                              !isExpanded && isLong && "line-clamp-3"
                            )}>
                              {aviso.corpo}
                            </p>
                            {isLong && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : aviso.id)}
                                className="text-xs text-primary font-medium mt-1 hover:underline flex items-center gap-0.5"
                              >
                                {isExpanded ? "Ver menos" : "Ver mais"}
                                <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {aviso.imagem_url && (
                      <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
                        <img
                          src={aviso.imagem_url}
                          alt={aviso.titulo}
                          className="w-full max-h-52 object-cover rounded-lg border border-border/40"
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
    </StudentLayout>
  );
}
