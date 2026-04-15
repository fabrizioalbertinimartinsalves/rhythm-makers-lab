import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, User, Clock, Trash2, CheckCircle, XCircle, 
  MessageCircle, DollarSign, Wallet, AlertCircle, Calendar, 
  ArrowRight, Filter, ExternalLink, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  confirmado: { label: "Aprovado", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  expirado: { label: "Expirado", color: "bg-slate-100 text-slate-500 border-slate-200", icon: AlertCircle },
};

export default function CasualSales() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // 1. Fetch Casual Bookings (Aulas Avulsas)
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["casual-sales", studioId, selectedDate],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          classes ( id, nome, horario ),
          classes_avulsas ( id, nome, horario )
        `)
        .eq("studio_id", studioId)
        .eq("tipo", "avulso")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // 2. Mutations
  const confirmManualMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmado", pago: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casual-sales"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      toast.success("Pagamento confirmado manualmente!");
    },
    onError: (e: any) => toast.error("Erro ao confirmar: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casual-sales"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      toast.success("Registro removido.");
    },
  });

  // 3. WhatsApp Billing Logic
  const handleWhatsAppBilling = (venda: any) => {
    const nome = venda.nome_avulso || "Cliente";
    const aula = venda.classes?.nome || venda.classes_avulsas?.nome || "Aula";
    const valor = formatCurrency(venda.valor || 0);
    const phone = (venda.whatsapp_avulso || venda.telefone_avulso || "").replace(/\D/g, "");
    
    const msg = `Olá, ${nome}! 👋\n\nVi que você iniciou sua reserva para a aula de *${aula}*, mas o pagamento ainda não consta para nós.\n\nGostaria de ajuda para finalizar? O valor do investimento é de *${valor}*.\n\nAguardo seu retorno! ✨`;
    
    const encoded = encodeURIComponent(msg);
    const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encoded}`, "_blank");
  };

  // Filter Logic
  const filtered = vendas.filter((v: any) => {
    const term = search.toLowerCase();
    const matchSearch = term === "" || 
      (v.nome_avulso || "").toLowerCase().includes(term) ||
      (v.email_avulso || "").toLowerCase().includes(term);
    
    if (!matchSearch) return false;
    if (filterStatus !== "todos" && v.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: vendas.length,
    aprovados: vendas.filter(v => v.status === "confirmado").length,
    pendentes: vendas.filter(v => v.status === "pendente").length,
    receita: vendas.filter(v => v.pago).reduce((acc, v) => acc + (Number(v.valor) || 0), 0)
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-in fade-in duration-700 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              Gestão de <span className="text-primary italic">Vendas Avulsas</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] mt-2 flex items-center gap-2">
              CASUAL SALES MONITOR <span className="h-1 w-1 rounded-full bg-slate-200" /> V2.0 COCKPIT
            </p>
          </div>
        </header>

        {/* METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total de Vendas</p>
            <h3 className="text-3xl font-black text-slate-900 leading-none">{stats.total}</h3>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Aprovadas</p>
            <h3 className="text-3xl font-black text-emerald-600 leading-none">{stats.aprovados}</h3>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pendentes</p>
            <h3 className="text-3xl font-black text-amber-500 leading-none">{stats.pendentes}</h3>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl bg-slate-900 text-white p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Receita Coletada</p>
            <h3 className="text-3xl font-black text-primary leading-none">{formatCurrency(stats.receita)}</h3>
          </Card>
        </div>

        {/* FILTERS */}
        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 backdrop-blur-sm space-y-4">
           <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar por nome ou e-mail..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-12 pl-11 bg-white border-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px] h-12 bg-white border-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 font-bold uppercase text-[10px] tracking-widest">
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="confirmado">Aprovados</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                  <SelectItem value="expirado">Expirados</SelectItem>
                </SelectContent>
              </Select>
           </div>
        </div>

        {/* TABLE */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
               <Loader2 className="h-10 w-10 animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-widest">Carregando Vendas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-20 text-center border-dashed border-2 bg-transparent border-slate-200 text-slate-400 font-bold uppercase text-xs">
              Nenhuma venda encontrada com estes filtros.
            </Card>
          ) : (
            filtered.map((v: any) => {
              const statusCfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.pendente;
              const StatusIcon = statusCfg.icon;
              const aulaNome = v.classes?.nome || v.classes_avulsas?.nome || "Aula s/ nome";
              const horario = (v.classes?.horario || v.classes_avulsas?.horario || "").slice(0, 5);

              return (
                <Card key={v.id} className="border-none shadow-sm rounded-3xl bg-white ring-1 ring-slate-100 overflow-hidden group hover:shadow-md transition-all">
                  <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* INFO ALUNO */}
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        <User className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                          {v.nome_avulso || "Convidado"}
                        </h4>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                             <MessageCircle className="h-3 w-3" /> {v.whatsapp_avulso || v.telefone_avulso || "S/ tel"}
                           </span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                             <Calendar className="h-3 w-3" /> {format(new Date(v.data + "T12:00:00"), "dd MMM", { locale: ptBR })}
                           </span>
                        </div>
                      </div>
                    </div>

                    {/* DETALHES AULA */}
                    <div className="lg:text-right space-y-1">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Aula & Horário</p>
                       <p className="text-sm font-black uppercase italic tracking-tighter text-slate-700">{aulaNome}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex lg:justify-end items-center gap-1.5 leading-none">
                         <Clock className="h-3 w-3" /> {horario}
                       </p>
                    </div>

                    {/* STATUS & PAGAMENTO */}
                    <div className="flex items-center justify-between lg:justify-end gap-8 bg-slate-50/50 p-4 rounded-2xl lg:bg-transparent lg:p-0">
                       <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Investimento</p>
                          <p className="text-xl font-black text-slate-900 leading-none">{formatCurrency(v.valor || 0)}</p>
                       </div>
                       
                       <Badge variant="outline" className={cn("h-8 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 px-3 border-none ring-1", statusCfg.color)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusCfg.label}
                       </Badge>
                    </div>

                    {/* AÇÕES */}
                    <div className="flex items-center gap-2">
                       {v.status === "pendente" && (
                         <>
                           <Button 
                             onClick={() => confirmManualMutation.mutate(v.id)}
                             disabled={confirmManualMutation.isPending}
                             className="flex-1 lg:flex-none h-10 px-6 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                           >
                             {confirmManualMutation.isPending ? <Loader2 className="animate-spin" /> : "Confirmar Pix"}
                           </Button>
                           <Button 
                             onClick={() => handleWhatsAppBilling(v)}
                             variant="outline"
                             className="h-10 w-10 p-0 rounded-xl border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all group/wa"
                           >
                             <MessageCircle className="h-5 w-5 fill-emerald-600 group-hover/wa:fill-white" />
                           </Button>
                         </>
                       )}
                       
                       {v.status === "confirmado" && (
                         <Button 
                           variant="outline"
                           onClick={() => window.open(`/ticket/${v.id}`, '_blank')}
                           className="flex-1 lg:flex-none h-10 px-6 rounded-xl border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 gap-2"
                         >
                            <ExternalLink className="h-3.5 w-3.5" /> Voucher
                         </Button>
                       )}

                       <Button 
                         variant="ghost" 
                         className="h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                         onClick={() => { if(confirm("Deseja remover este registro?")) deleteMutation.mutate(v.id) }}
                        >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
