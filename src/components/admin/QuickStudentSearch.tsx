import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, UserPlus, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface QuickStudentSearchProps {
  studioId: string;
  onSelect: (student: any) => void;
  excludeIds?: string[];
  placeholder?: string;
  className?: string;
}

export default function QuickStudentSearch({ 
  studioId, 
  onSelect, 
  excludeIds = [],
  placeholder = "Buscar aluno (Nome ou CPF)...",
  className
}: QuickStudentSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

      const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, nome, cpf, foto_url")
          .eq("studio_id", studioId)
          .or(`nome.ilike.%${query}%,cpf.ilike.%${query}%`)
          .order("nome")
          .limit(8);

        if (error) {
          console.error("[QuickStudentSearch] Supabase error:", error);
          throw error;
        }
        
        // Filter out already enrolled students
        const filtered = (data || []).filter(s => !excludeIds.includes(s.id));
        setResults(filtered);
        setOpen(true);
      } catch (err) {
        console.error("[QuickStudentSearch] Critical error:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, studioId, excludeIds]);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative group">
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
          loading ? "text-primary animate-pulse" : "text-slate-400 group-focus-within:text-primary"
        )} />
        <Input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 h-10 rounded-xl bg-slate-50 border-none shadow-sm font-bold uppercase tracking-tight text-[10px] focus-visible:ring-primary"
          onFocus={() => query.length >= 2 && setOpen(true)}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-primary" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-[100] top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 space-y-1">
            {results.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  onSelect(student);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                    {student.foto_url ? (
                      <img src={student.foto_url} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-black">{student.nome.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-tighter italic text-slate-800 leading-none group-hover:text-primary transition-colors">{student.nome}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{student.cpf || "Sem CPF"}</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <UserPlus className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {open && results.length === 0 && !loading && (
        <div className="absolute z-[100] top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-4 text-center animate-in fade-in slide-in-from-top-2">
           <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">Nenhum aluno encontrado</p>
        </div>
      )}
    </div>
  );
}
