import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Clock, Users, Download, Loader2, Calendar as CalendarIcon, Filter, ChevronRight, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSearchParams, Link } from "react-router-dom";
import { instructorService } from "@/features/instructors/instructorService";

export default function InstructorPayments() {
  const { studioId } = useAuth() as any;
  const [searchParams] = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get("month") || format(new Date(), "yyyy-MM"));
  const [viewingDetails, setViewingDetails] = useState<any>(null);
  const [closingPayout, setClosingPayout] = useState<any>(null);

  const month = parseInt(selectedMonth.split("-")[1]);
  const year = parseInt(selectedMonth.split("-")[0]);

  const { data: paymentData = [], isLoading, refetch } = useQuery({
    queryKey: ["instructor-payments", studioId, selectedMonth],
    enabled: !!studioId,
    queryFn: () => instructorService.getInstructorDashboard(studioId!, month, year),
  });

  const { data: payouts = [], refetch: refetchPayoutsHistory } = useQuery({
    queryKey: ["payouts-history", studioId, selectedMonth],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase
        .from("instructor_payouts")
        .select("*")
        .eq("studio_id", studioId)
        .eq("periodo", selectedMonth);
      return data || [];
    },
  });

  const totalMonth = paymentData.reduce((s, p) => s + (p.total_payout || 0), 0);

  const handleClosePayout = async (instructor: any) => {
    try {
      toast.loading("Gerando fechamento e lançando no financeiro...");
      
      // 1. Registrar o repasse no motor de folha
      const { data: payout, error: pError } = await supabase
        .from("instructor_payouts")
        .insert({
          studio_id: studioId,
          instructor_id: instructor.instructor_id,
          periodo: selectedMonth,
          valor_total: instructor.total_payout,
          status: 'pendente',
          detalhes: instructor.details
        })
        .select()
        .single();

      if (pError) throw pError;

      // 2. Integração Financeira: Garantir categoria e criar lançamento
      // Buscar ou Criar categoria de "Repasse de Instrutor"
      let { data: category } = await supabase
        .from("financial_categories")
        .select("id")
        .eq("studio_id", studioId)
        .eq("nome", "Repasse de Instrutor")
        .eq("tipo", "expense")
        .single();

      if (!category) {
        const { data: newCat } = await supabase
          .from("financial_categories")
          .insert({
            studio_id: studioId,
            nome: "Repasse de Instrutor",
            tipo: "expense",
            cor: "#8b5cf6" // Violeta
          })
          .select("id")
          .single();
        category = newCat;
      }

      // Buscar a conta bancária principal (primeira disponível ou null)
      const { data: account } = await supabase
        .from("financial_accounts")
        .select("id")
        .eq("studio_id", studioId)
        .limit(1)
        .single();

      // Inserir transação financeira
      const { error: tError } = await supabase
        .from("financial_transactions")
        .insert({
          studio_id: studioId,
          type: 'expense',
          amount: instructor.total_payout,
          description: `Repasse: ${instructor.nome} (${format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: ptBR })})`,
          date: format(new Date(), "yyyy-MM-dd"),
          status: 'pendente',
          category_id: category?.id,
          account_id: account?.id
        });

      if (tError) console.error("Erro ao criar transação financeira:", tError);

      toast.dismiss();
      toast.success("Fechamento e lançamento financeiro concluídos!");
      setClosingPayout(null);
      refetch();
      refetchPayoutsHistory();
    } catch (error: any) {
      toast.dismiss();
      toast.error("Erro ao processar: " + error.message);
    }
  };

  const handleSendWhatsApp = (instructor: any) => {
    const message = `Olá ${instructor.nome}! Segue o demonstrativo do seu repasse referente a ${format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: ptBR })}:
    
- Modelo: ${instructor.contract_type?.replace('_', ' ')}
- Atividade: ${instructor.contract_type === 'HOURLY' ? (instructor.details?.count_classes || 0) + ' aulas' : (instructor.details?.count_students || 0) + ' presenças'}
-------------------
Total a receber: R$ ${instructor.total_payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

Por favor, valide as informações acima.`.trim();

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleExport = () => {
    if (paymentData.length === 0) return;
    
    const headers = ["Instrutor", "Email", "Modelo", "Total Repasse"];
    const rows = paymentData.map(p => [
      p.nome,
      p.email,
      p.contract_type,
      p.total_payout.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `repasses_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Repasses de Instrutores</h1>
            <p className="text-muted-foreground">Cálculo de comissões e pagamentos por período</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]"><CalendarIcon className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = subMonths(startOfMonth(new Date()), i);
                  const val = format(d, "yyyy-MM");
                  return <SelectItem key={val} value={val}>{format(d, "MMMM yyyy", { locale: ptBR })}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleExport} title="Exportar para CSV (Bancário)"><Download className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardHeader className="p-3 pb-0"><CardTitle className="text-[9px] font-black uppercase tracking-widest text-primary/60 italic">Total Estimado no Mês</CardTitle></CardHeader>
            <CardContent className="p-3">
              <div className="text-xl sm:text-2xl font-black tracking-tighter text-primary truncate">R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-[8px] text-muted-foreground mt-0.5 uppercase font-bold">Confirmações Totais</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="p-3 pb-0"><CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Total de Aulas</CardTitle></CardHeader>
            <CardContent className="p-3">
              <div className="text-xl sm:text-2xl font-black tracking-tighter">{paymentData.reduce((s, p) => s + (p.details?.count_classes || 0), 0)}</div>
              <p className="text-[8px] text-muted-foreground mt-0.5 uppercase font-bold">Sessões / Unidades</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="p-3 pb-0"><CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Total de Alunos (Presenças)</CardTitle></CardHeader>
            <CardContent className="p-3">
              <div className="text-xl sm:text-2xl font-black tracking-tighter">{paymentData.reduce((s, p) => s + (p.details?.count_students || 0), 0)}</div>
              <p className="text-[8px] text-muted-foreground mt-0.5 uppercase font-bold">Frequência Mensal</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm">
            <CardHeader className="p-3 pb-0"><CardTitle className="text-[9px] font-black uppercase tracking-widest text-emerald-600/60 italic">Média Global</CardTitle></CardHeader>
            <CardContent className="p-3">
              <div className="text-xl sm:text-2xl font-black tracking-tighter text-emerald-600">R$ {(totalMonth / (paymentData.length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
              <p className="text-[8px] text-muted-foreground mt-0.5 uppercase font-bold">Por Colaborador</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Detalhamento por Instrutor</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left">Instrutor</th>
                  <th className="px-4 py-3 text-left">Modelo</th>
                  <th className="px-4 py-3 text-center">Atividade</th>
                  <th className="px-4 py-3 text-right">Valor Repasse</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paymentData.map((p) => {
                  const isPaid = payouts.some(py => py.instructor_id === p.instructor_id && py.status === 'pago');
                  return (
                  <tr key={p.instructor_id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.nome}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="capitalize text-[8px] font-bold px-1.5 py-0">{p.contract_type?.replace('_', ' ')}</Badge>
                      <div className="text-[9px] text-muted-foreground font-medium mt-0.5 flex gap-1">
                        {p.contract_type === 'FIXED_CLT' ? `Fixo` : 
                         p.contract_type === 'HOURLY' ? `R$${p.details?.hourly_rate}/h` :
                         p.contract_type === 'PERCENTAGE' ? `R$${p.details?.commission_rate}/un` :
                         `Dono`}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-[9px] font-black italic text-slate-400">
                        {p.contract_type === 'HOURLY' ? `${p.details?.count_classes || 0}a` :
                         p.contract_type === 'PERCENTAGE' ? `${p.details?.count_students || 0}p` :
                         '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-black tracking-tighter text-emerald-600 text-[13px] tabular-nums">R$ {p.total_payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs gap-1" 
                              onClick={() => setViewingDetails(p)}>
                              <Filter className="h-3.5 w-3.5" /> Detalhes
                           </Button>
                          {p.total_payout > 0 && !isPaid && (
                             <Button variant="outline" size="sm" className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" onClick={() => setClosingPayout(p)}>
                                Fechar Mês
                             </Button>
                          )}
                          {isPaid && <Badge className="bg-emerald-100 text-emerald-700">PAGO</Badge>}
                       </div>
                    </td>
                  </tr>
                  );
                })}
                {paymentData.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic">Nenhum instrutor encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
           <Card>
              <CardHeader><CardTitle className="text-base">Configurações Faltantes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                 {paymentData.filter(p => p.total_payout === 0 && ((p.details?.count_classes || 0) > 0 || (p.details?.count_students || 0) > 0)).map(p => (
                   <div key={p.instructor_id} className="flex items-center justify-between p-3 border border-amber-100 bg-amber-50/20 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">{p.nome}</span> possui atividades sem valor configurado.
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs">Configurar</Button>
                   </div>
                 ))}
                 {paymentData.filter(p => p.total_payout === 0 && ((p.details?.count_classes || 0) > 0 || (p.details?.count_students || 0) > 0)).length === 0 && (
                   <p className="text-sm text-muted-foreground text-center py-4 italic">Todas as atividades estão precificadas.</p>
                 )}
              </CardContent>
           </Card>

           <Card className="border-sky-100 bg-sky-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-sky-900">
                  <Clock className="h-4 w-4 text-sky-500" /> Guia de Processamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                 <Link 
                   to="/admin/checkin-report" 
                   className="flex items-center justify-between p-2 rounded-lg hover:bg-sky-100 transition-colors group"
                 >
                   <div className="flex items-center gap-2 text-sm text-sky-800 font-medium">
                     <div className="h-5 w-5 rounded-full bg-sky-200 flex items-center justify-center text-[10px] text-sky-700">1</div>
                     <span>Validar presenças e auditoria</span>
                   </div>
                   <ArrowRight className="h-4 w-4 text-sky-400 group-hover:translate-x-1 transition-transform" />
                 </Link>

                 <button 
                   onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })}
                   className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-sky-100 transition-colors group"
                 >
                   <div className="flex items-center gap-2 text-sm text-sky-800 font-medium">
                     <div className="h-5 w-5 rounded-full bg-sky-200 flex items-center justify-center text-[10px] text-sky-700">2</div>
                     <span>Gerar fechamento e exportar</span>
                   </div>
                   <ArrowRight className="h-4 w-4 text-sky-400 group-hover:translate-x-1 transition-transform" />
                 </button>

                 <div className="flex items-center justify-between p-2 rounded-lg opacity-80 cursor-default">
                   <div className="flex items-center gap-2 text-sm text-sky-800 font-medium">
                     <div className="h-5 w-5 rounded-full bg-sky-200 flex items-center justify-center text-[10px] text-sky-700">3</div>
                     <span>Comunicar instrutores (WhatsApp)</span>
                   </div>
                 </div>
                 <p className="px-2 text-[10px] text-sky-600/70 italic">
                   * Use o botão "Detalhes" na tabela para enviar o extrato por WhatsApp.
                 </p>
              </CardContent>
           </Card>
        </div>

        {/* Modal de Detalhes */}
        <Dialog open={!!viewingDetails} onOpenChange={(o) => !o && setViewingDetails(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Extrato Detalhado: {viewingDetails?.nome}</DialogTitle>
              <DialogDescription>
                Competência: {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Métrica</TableHead>
                     <TableHead className="text-right">Valor</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                    <TableRow>
                      <TableCell>Aulas Concluídas</TableCell>
                      <TableCell className="text-right font-medium">{viewingDetails?.details?.count_classes || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Presenças de Alunos</TableCell>
                      <TableCell className="text-right font-medium">{viewingDetails?.details?.count_students || 0}</TableCell>
                    </TableRow>
                    {viewingDetails?.contract_type === 'FIXED_CLT' && (
                      <TableRow>
                        <TableCell>Salário Base</TableCell>
                        <TableCell className="text-right font-medium">R$ {viewingDetails?.details?.base_salary?.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                    {viewingDetails?.contract_type === 'HOURLY' && (
                      <TableRow>
                        <TableCell>Valor por Aula</TableCell>
                        <TableCell className="text-right font-medium">R$ {viewingDetails?.details?.hourly_rate?.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                    {viewingDetails?.contract_type === 'PERCENTAGE' && (
                      <TableRow>
                        <TableCell>Comissão por Aluno</TableCell>
                        <TableCell className="text-right font-medium">R$ {viewingDetails?.details?.commission_rate?.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                 </TableBody>
               </Table>
            </div>
            
            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
               <div className="text-sm font-bold">
                  Total Individual: R$ {viewingDetails?.total_payout?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
               </div>
               <Button variant="outline" className="gap-2" onClick={() => handleSendWhatsApp(viewingDetails)}>
                  <Users className="h-4 w-4" /> Enviar p/ WhatsApp
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Fechamento */}
        <Dialog open={!!closingPayout} onOpenChange={(o) => !o && setClosingPayout(null)}>
           <DialogContent>
              <DialogHeader>
                 <DialogTitle>Confirmar Fechamento Mensal</DialogTitle>
                 <DialogDescription>
                    Você está prestes a gerar o fechamento de <strong>{closingPayout?.nome}</strong> referente a {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: ptBR })}.
                 </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                 <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Aulas Realizadas:</span>
                        <span className="font-bold">{closingPayout?.details?.count_classes || 0}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Presenças Totais:</span>
                        <span className="font-bold">{closingPayout?.details?.count_students || 0}</span>
                     </div>
                     <div className="pt-2 border-t flex justify-between font-bold text-lg text-emerald-600">
                        <span>Total Repasse:</span>
                        <span>R$ {closingPayout?.total_payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                     </div>
                 </div>
                 <p className="text-xs text-muted-foreground italic">
                    * Ao confirmar, as aulas deste período serão marcadas como "pagas" e não aparecerão mais em novos fechamentos.
                 </p>
              </div>
              <DialogFooter>
                 <Button variant="ghost" onClick={() => setClosingPayout(null)}>Cancelar</Button>
                 <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleClosePayout(closingPayout)}>Confirmar e Gerar</Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
