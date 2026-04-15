import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, AlertTriangle, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, differenceInDays, parseISO } from "date-fns";

function ReportStatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm hover:shadow-md transition-all overflow-hidden border border-slate-50">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/40 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{label}</p>
          <p className="text-xl font-black text-slate-800 tracking-tighter">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StoreReports() {
  const { studioId } = useAuth();
  const [reportType, setReportType] = useState<"posicao" | "vencimento">("posicao");
  const [daysFilter, setDaysFilter] = useState("30");

  const { data: produtos = [] } = useQuery({
    queryKey: ["report-products", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(nome, cor)")
        .eq("studio_id", studioId);
      if (error) throw error;
      return data;
    },
  });

  const { data: lotes = [] } = useQuery({
    queryKey: ["report-lots", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_lots")
        .select("*, products(nome, tipo)")
        .eq("studio_id", studioId)
        .gt("qtd_atual", 0)
        .order("data_vencimento");
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const totalItens = produtos.reduce((acc, p) => acc + (p.estoque || 0), 0);
    const valorEmEstoque = produtos.reduce((acc, p) => acc + (p.estoque || 0) * (p.preco_custo || 0), 0);
    const itensBaixoEstoque = produtos.filter((p) => (p.estoque || 0) <= (p.estoque_minimo || 0) && (p.estoque_minimo || 0) > 0).length;
    const itensVencendo = lotes.filter((l) => differenceInDays(parseISO(l.data_vencimento), new Date()) <= 30).length;

    return { totalItens, valorEmEstoque, itensBaixoEstoque, itensVencendo };
  }, [produtos, lotes]);

  const expiringLotes = useMemo(() => {
    return lotes.filter((l) => {
      const days = differenceInDays(parseISO(l.data_vencimento), new Date());
      return days <= parseInt(daysFilter);
    });
  }, [lotes, daysFilter]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportStatCard
          label="Total em Estoque"
          value={stats.totalItems}
          icon={Package}
          color="bg-slate-50 text-slate-600"
        />
        <ReportStatCard
          label="Valor Investido"
          value={`R$ ${stats.valorEmEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="bg-emerald-50 text-emerald-600"
        />
        <ReportStatCard
          label="Estoque Crítico"
          value={stats.itensBaixoEstoque}
          icon={AlertTriangle}
          color="bg-amber-50 text-amber-600"
        />
        <ReportStatCard
          label="Vencendo (30d)"
          value={stats.itensVencendo}
          icon={Calendar}
          color="bg-rose-50 text-rose-600"
        />
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between border-b border-slate-50">
          <div className="flex gap-4">
            <button
               onClick={() => setReportType("posicao")}
               className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${reportType === "posicao" ? "border-primary text-slate-800" : "border-transparent text-slate-400"}`}
            >
               Posição de Estoque
            </button>
            <button
               onClick={() => setReportType("vencimento")}
               className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${reportType === "vencimento" ? "border-primary text-slate-800" : "border-transparent text-slate-400"}`}
            >
               Itens a Vencer
            </button>
          </div>
          
          {reportType === "vencimento" && (
            <div className="flex items-center gap-2 mb-4">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Período:</Label>
              <Select value={daysFilter} onValueChange={setDaysFilter}>
                <SelectTrigger className="h-8 w-32 rounded-lg bg-slate-50 border-none text-[10px] font-bold uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Dias</SelectItem>
                  <SelectItem value="15">15 Dias</SelectItem>
                  <SelectItem value="30">30 Dias</SelectItem>
                  <SelectItem value="60">60 Dias</SelectItem>
                  <SelectItem value="90">90 Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50">
                <tr className="border-b border-slate-100">
                  {reportType === "posicao" ? (
                    <>
                      <th className="p-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">Produto</th>
                      <th className="p-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">Categoria</th>
                      <th className="p-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Estoque</th>
                      <th className="p-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Preço Custo</th>
                      <th className="p-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Valor Total</th>
                      <th className="p-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">Produto</th>
                      <th className="p-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Lote</th>
                      <th className="p-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Validade</th>
                      <th className="p-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Quantidade</th>
                      <th className="p-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Dias Restantes</th>
                      <th className="p-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportType === "posicao" ? (
                   produtos.map((p: any) => {
                     const isLow = (p.estoque || 0) <= (p.estoque_minimo || 0) && (p.estoque_minimo || 0) > 0;
                     return (
                       <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                         <td className="p-4 font-bold text-slate-700">{p.nome}</td>
                         <td className="p-4">
                           <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest" style={{ color: p.product_categories?.cor, borderColor: `${p.product_categories?.cor}30`, backgroundColor: `${p.product_categories?.cor}05` }}>
                             {p.product_categories?.nome || "Sem Categoria"}
                           </Badge>
                         </td>
                         <td className="p-4 text-center font-bold text-slate-600">{p.estoque}</td>
                         <td className="p-4 text-center text-slate-500">R$ {(p.preco_custo || 0).toFixed(2)}</td>
                         <td className="p-4 text-center font-bold text-slate-700">R$ {((p.estoque || 0) * (p.preco_custo || 0)).toFixed(2)}</td>
                         <td className="p-4 text-center">
                           {isLow ? (
                             <Badge variant="destructive" className="text-[9px] font-black uppercase tracking-widest animate-pulse">Baixo</Badge>
                           ) : (
                             <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 border-emerald-100 italic">Ideal</Badge>
                           )}
                         </td>
                       </tr>
                     )
                   })
                ) : (
                   expiringLotes.map((l: any) => {
                     const days = differenceInDays(parseISO(l.data_vencimento), new Date());
                     return (
                       <tr key={l.id} className="hover:bg-slate-50/30 transition-colors">
                         <td className="p-4 font-bold text-slate-700">{l.products?.nome}</td>
                         <td className="p-4 text-center font-mono text-[11px] text-slate-500">{l.lote}</td>
                         <td className="p-4 text-center font-bold text-slate-600">{format(parseISO(l.data_vencimento), "dd/MM/yyyy")}</td>
                         <td className="p-4 text-center font-bold text-slate-700">{l.qtd_atual}</td>
                         <td className="p-4 text-center">
                           <span className={`text-[11px] font-black uppercase ${days <= 0 ? "text-rose-600" : days <= 15 ? "text-rose-500" : days <= 30 ? "text-amber-500" : "text-slate-400"}`}>
                             {days <= 0 ? "VENCIDO" : `${days} Dias`}
                           </span>
                         </td>
                         <td className="p-4 text-center">
                            {days <= 0 ? (
                               <div className="h-6 w-6 rounded-full bg-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-200">
                                  <AlertTriangle className="h-3.5 w-3.5 text-white" />
                               </div>
                            ) : (
                               <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest italic border-slate-200">Em Prazo</Badge>
                            )}
                         </td>
                       </tr>
                     )
                   })
                )}
              </tbody>
            </table>
          </div>
          {(reportType === "posicao" ? produtos : expiringLotes).length === 0 && (
             <div className="py-20 text-center space-y-4">
                <Package className="h-12 w-12 text-slate-100 mx-auto" />
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Nenhum dado encontrado</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

