import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, Calendar, Clock, Phone, MessageSquare, 
  Search, Filter, ArrowUpRight, DollarSign,
  UserCheck, Timer, AlertCircle, CheckCircle2,
  Sparkles, Loader2, RefreshCw, GraduationCap
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useNavigate } from "react-router-dom";

export default function ExperimentalLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["experimental-leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          classes (nome, horario),
          classes_avulsas (nome, horario, data)
        `)
        .in("tipo", ["experimental", "avulso"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.nome_avulso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone_avulso?.includes(searchTerm);
    
    const matchesFilter = 
      filter === "all" || 
      (filter === "pago" && lead.pago) ||
      (filter === "pendente" && !lead.pago && lead.status !== "cancelado") ||
      (filter === "cancelado" && lead.status === "cancelado");

    return matchesSearch && matchesFilter;
  });

  const metrics = {
    total: leads.length,
    pago: leads.filter(l => l.pago).length,
    pendente: leads.filter(l => !l.pago && l.status !== "cancelado").length,
    receita: leads.filter(l => l.pago).reduce((acc, curr) => acc + (curr.valor || 0), 0)
  };

  const handleManualConfirm = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ pago: true, status: "confirmado" })
        .eq("id", id);

      if (error) throw error;
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      toast.success("Pagamento confirmado manualmente!");
      refetch();
    } catch (err: any) {
      toast.error("Erro ao confirmar: " + err.message);
    }
  };

  const [syncing, setSyncing] = useState<string | null>(null);
  const handleSyncMP = async (lead: any) => {
    setSyncing(lead.id);
    try {
      // 1. Buscar integração ativa do estúdio
      const { data: interaction } = await supabase
        .from("integrations")
        .select("config")
        .eq("studio_id", lead.studio_id)
        .eq("provider", "mercadopago")
        .eq("ativa", true)
        .maybeSingle();

      const token = interaction?.config?.access_token;
      if (!token) throw new Error("Integração Mercado Pago não configurada ou inativa.");

      // 2. Buscar pagamento por external_reference (ID do Agendamento)
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${lead.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const mpData = await mpResponse.json();

      if (mpData.results && mpData.results.length > 0) {
        const payment = mpData.results[0];
        if (payment.status === "approved") {
          await supabase.from("bookings").update({ pago: true, status: "confirmado" }).eq("id", lead.id);
          
          // Double Check: Invalidate Dashboard
          queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
          queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

          toast.success("Pagamento sincronizado e confirmado!");
          refetch();
        } else {
          toast.info(`Status no Mercado Pago: ${payment.status}`);
        }
      } else {
        toast.error("Nenhum pagamento encontrado no Mercado Pago para este agendamento.");
      }
    } catch (err: any) {
      toast.error("Erro na sincronização: " + err.message);
    } finally {
      setSyncing(null);
    }
  };

  const openWhatsApp = (phone: string, name: string, date: string, time: string) => {
    if (!phone) {
      toast.error("Telefone não informado");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const waPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const message = `Olá ${name}! Vi que você agendou uma aula para o dia ${date} às ${time}. Como podemos te ajudar a se preparar?`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
      {/* Premium Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
            Agendamentos <span className="text-primary">Experimentais</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> Acompanhe seus leads e conversões em tempo real
          </p>
        </div>
        
        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-100 ring-1 ring-slate-200/50">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFilter("all")}
            className={cn("rounded-xl text-[10px] font-black uppercase tracking-widest", filter === "all" && "bg-slate-100")}
          >
            Todos
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFilter("pago")}
            className={cn("rounded-xl text-[10px] font-black uppercase tracking-widest", filter === "pago" && "bg-emerald-50 text-emerald-600")}
          >
            Pagos
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFilter("pendente")}
            className={cn("rounded-xl text-[10px] font-black uppercase tracking-widest", filter === "pendente" && "bg-amber-50 text-amber-600")}
          >
            Pendentes
          </Button>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden group">
          <CardContent className="p-8 relative">
             <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                   <Users className="h-6 w-6" />
                </div>
                <Badge className="bg-blue-50 text-blue-600 border-none font-black opacity-50">LEADS</Badge>
             </div>
             <p className="text-3xl font-black italic tracking-tighter text-slate-900">{metrics.total}</p>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Total de Inscritos</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden group">
          <CardContent className="p-8">
             <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                   <UserCheck className="h-6 w-6" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 border-none font-black opacity-50">PAGOS</Badge>
             </div>
             <p className="text-3xl font-black italic tracking-tighter text-slate-900">{metrics.pago}</p>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Presença Confirmada</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden group">
          <CardContent className="p-8">
             <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                   <Timer className="h-6 w-6" />
                </div>
                <Badge className="bg-amber-50 text-amber-600 border-none font-black opacity-50">WAITING</Badge>
             </div>
             <p className="text-3xl font-black italic tracking-tighter text-slate-900">{metrics.pendente}</p>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Aguardando Pagamento</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 ring-1 ring-white/10 overflow-hidden group">
          <CardContent className="p-8">
             <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                   <DollarSign className="h-6 w-6" />
                </div>
                <Badge className="bg-primary/20 text-primary border-none font-black opacity-50">CAIXA</Badge>
             </div>
             <p className="text-3xl font-black italic tracking-tighter text-white">R$ {metrics.receita.toFixed(2)}</p>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Receita Arrecadada</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Section */}
      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden">
        <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
           <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative flex-1 max-w-md group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                 <Input 
                   placeholder="Buscar lead por nome ou WhatsApp..." 
                   className="pl-12 h-12 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary bg-white"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <Button variant="outline" className="rounded-2xl h-12 gap-2 border-slate-200 font-bold" onClick={() => refetch()}>
                 <Filter className="h-4 w-4" /> Atualizar Lista
              </Button>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">Aluno / Contato</TableHead>
                <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest">Aula Selecionada</TableHead>
                <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-center">Data / Horário</TableHead>
                <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-center">Status Pagto</TableHead>
                <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando leads experimentais...</p>
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-50">
                       <Users className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum agendamento encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="py-6 px-8">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center font-black text-xl italic shadow-sm",
                            lead.pago ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                          )}>
                             {lead.nome_avulso?.[0] || "?"}
                          </div>
                          <div>
                             <h4 className="font-black italic uppercase tracking-tighter text-slate-900 group-hover:text-primary transition-colors">
                                {lead.nome_avulso || "Lead Experimental"}
                             </h4>
                             <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {lead.telefone_avulso || "Não informado"}
                             </p>
                          </div>
                       </div>
                    </TableCell>
                    
                    <TableCell className="py-6">
                       <div className="space-y-1">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-700">
                             {lead.classes?.nome || lead.classes_avulsas?.nome || "Aula não vinculada"}
                          </p>
                          <Badge variant="outline" className={cn(
                             "text-[8px] font-black uppercase h-4 px-2 tracking-tighter opacity-50",
                             lead.tipo === "avulso" && "border-orange-200 text-orange-600"
                          )}>
                             {lead.tipo === "avulso" ? "Aula Avulsa" : "Experimental"}
                          </Badge>
                       </div>
                    </TableCell>

                    <TableCell className="py-6 text-center">
                       <div className="inline-flex flex-col items-center">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                             <Calendar className="h-3.5 w-3.5 text-primary" />
                             <span className="text-xs">{lead.data ? format(parseISO(lead.data), "dd/MM/yyyy") : "Data indisponível"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                             <Clock className="h-3.5 w-3.5" />
                             <span>{lead.classes?.horario || lead.classes_avulsas?.horario || "--:--"}</span>
                          </div>
                       </div>
                    </TableCell>

                    <TableCell className="py-6 text-center">
                       {lead.pago ? (
                         <div className="inline-flex flex-col items-center gap-1.5 animate-in zoom-in duration-500">
                            <div className="h-8 w-8 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
                               <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">CONFIRMADO</span>
                         </div>
                       ) : lead.status === "cancelado" ? (
                         <div className="inline-flex flex-col items-center gap-1.5 opacity-50 grayscale">
                            <div className="h-8 w-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                               <AlertCircle className="h-5 w-5" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">CANCELADO</span>
                         </div>
                       ) : (
                         <div className="inline-flex flex-col items-center gap-1.5">
                            <div className="h-8 w-8 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center animate-pulse">
                               <Timer className="h-5 w-5" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-amber-600">PENDENTE</span>
                         </div>
                       )}
                    </TableCell>

                    <TableCell className="py-6 px-8 text-right">
                       <div className="flex justify-end gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!lead.pago && lead.status !== "cancelado" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-10 w-10 p-0 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                              onClick={() => handleManualConfirm(lead.id)}
                              title="Confirmar Pagamento"
                            >
                               <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            className="h-10 w-10 p-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                            onClick={() => openWhatsApp(lead.telefone_avulso, lead.nome_avulso, format(parseISO(lead.data), "dd/MM"), lead.classes?.horario || "agendada")}
                            title="Chamar no WhatsApp"
                          >
                             <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className={cn("h-10 w-10 p-0 rounded-xl hover:bg-blue-50 hover:text-blue-600", syncing === lead.id && "animate-spin")}
                            onClick={() => handleSyncMP(lead)}
                            disabled={lead.pago || !!syncing}
                            title="Sincronizar com Mercado Pago"
                          >
                             <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-10 w-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary"
                            onClick={() => navigate("/admin/students", { 
                              state: { 
                                fromLead: true, 
                                leadData: {
                                  nome: lead.nome_avulso,
                                  email: lead.email_avulso || lead.metadata?.lead_email,
                                  telefone: lead.telefone_avulso,
                                  turma: lead.classes?.nome
                                } 
                              } 
                            })}
                            title="Converter em Matrícula"
                          >
                             <GraduationCap className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100"
                            onClick={() => navigate(`/admin/bookings?search=${lead.nome_avulso || ""}`)}
                            title="Ver na Agenda"
                          >
                             <ArrowUpRight className="h-4 w-4" />
                          </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
