import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, GraduationCap, ShoppingBag, CreditCard, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  type: "aluno" | "turma" | "produto" | "plano";
  path: string;
}

const typeConfig = {
  aluno: { icon: Users, color: "text-primary", bg: "bg-primary/10", label: "Aluno" },
  turma: { icon: GraduationCap, color: "text-info", bg: "bg-info/10", label: "Turma" },
  produto: { icon: ShoppingBag, color: "text-warning", bg: "bg-warning/10", label: "Produto" },
  plano: { icon: CreditCard, color: "text-success", bg: "bg-success/10", label: "Plano" },
};

export default function GlobalSearch() {
  const { studioId } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(
    async (term: string) => {
      if (term.length < 2 || !studioId) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const searchPattern = `%${term}%`;

        const [alunosRes, turmasRes, produtosRes, planosRes] = await Promise.all([
          supabase.from("students").select("*").eq("studio_id", studioId).ilike("nome", searchPattern).limit(5),
          supabase.from("classes").select("*").eq("studio_id", studioId).ilike("nome", searchPattern).limit(5),
          supabase.from("products").select("*").eq("studio_id", studioId).ilike("nome", searchPattern).limit(5),
          supabase.from("plans").select("*").eq("studio_id", studioId).ilike("nome", searchPattern).limit(5),
        ]);

        const items: SearchResult[] = [
          ...(alunosRes.data || []).map((a) => ({
            id: a.id,
            label: a.nome,
            sublabel: `${a.email || "Sem email"} · ${a.status}`,
            type: "aluno" as const,
            path: "/admin/students",
          })),
          ...(turmasRes.data || []).map((t) => ({
            id: t.id,
            label: t.nome,
            sublabel: `Horário: ${t.horario}`,
            type: "turma" as const,
            path: "/admin/classes",
          })),
          ...(produtosRes.data || []).map((p) => ({
            id: p.id,
            label: p.nome,
            sublabel: `R$ ${p.preco?.toFixed(2) || "0.00"}`,
            type: "produto" as const,
            path: "/admin/store",
          })),
          ...(planosRes.data || []).map((p) => ({
            id: p.id,
            label: p.nome,
            sublabel: `R$ ${p.valor?.toFixed(2) || "0.00"}`,
            type: "plano" as const,
            path: "/admin/plans",
          })),
        ];

        setResults(items);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Erro na busca global:", err);
      } finally {
        setLoading(false);
      }
    },
    [studioId]
  );

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(result.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              placeholder="Buscar alunos, turmas, produtos, planos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {query.length < 2 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Digite ao menos 2 caracteres para buscar
              </p>
            ) : loading ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">Buscando...</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado para "{query}"
              </p>
            ) : (
              results.map((result, i) => {
                const cfg = typeConfig[result.type];
                const Icon = cfg.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      i === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", cfg.bg)}>
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{result.sublabel}</p>
                    </div>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            <span><kbd className="font-mono">↑↓</kbd> navegar</span>
            <span><kbd className="font-mono">Enter</kbd> selecionar</span>
            <span><kbd className="font-mono">Esc</kbd> fechar</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
