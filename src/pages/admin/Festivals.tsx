import { useState, useMemo, useRef, useEffect } from "react";
import {
   CalendarDays,
   Plus,
   DollarSign,
   Users,
   Package,
   AlertCircle,
   Search,
   MoreVertical,
   Edit,
   Trash2,
   ChevronRight,
   TrendingUp,
   Receipt,
   PiggyBank,
   Music,
   Play,
   Pause,
   Upload,
   Loader2,
   CheckCircle2,
   XCircle,
   ArrowUpRight,
   ArrowDownRight,
   Camera,
   ListFilter,
   UserPlus,
   Shirt,
   X,
   Printer,
   Ticket as TicketIcon,
   Download,
   ScanLine,
   Instagram,
   Phone,
   MapPin,
   Share2,
   Copy,
   ExternalLink,
   Settings2,
   Check,
   RefreshCw
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QuickStudentSearch from "../../components/admin/QuickStudentSearch";
import { QRCodeSVG } from "qrcode.react";
import { QRScanner } from "@/components/admin/QRScanner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadFile } from "@/utils/upload";
import { Progress } from "@/components/ui/progress";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger
} from "@/components/ui/alert-dialog";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COST_CATEGORIES = [
   { value: 'alugueis', label: 'Aluguéis' },
   { value: 'equipamentos', label: 'Equipamentos' },
   { value: 'figurinos', label: 'Figurinos' },
   { value: 'servicos', label: 'Serviços' },
   { value: 'outros', label: 'Outros' }
];

const FESTIVAL_STATUS = [
   { value: 'planejado', label: 'Planejado' },
   { value: 'em_andamento', label: 'Em Andamento' },
   { value: 'concluido', label: 'Concluído' },
   { value: 'cancelado', label: 'Cancelado' }
];

// Sub-components for Management
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ChoreographyManagement({
   festivalId,
   studioId,
   enrollments
}: {
   festivalId: string,
   studioId: string,
   enrollments: any[]
}) {
   const queryClient = useQueryClient();
   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
   const [newChoreo, setNewChoreo] = useState({
      name: '',
      teacher_name: '',
      duration: '',
      music_url: '',
      category: 'adulto'
   });

   const { data: choreographies = [], isLoading } = useQuery({
      queryKey: ["festival-choreographies", festivalId],
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_choreographies")
            .select("*")
            .eq("festival_id", festivalId)
            .order("created_at", { ascending: false });
         if (error) throw error;
         return data;
      }
   });

   const addChoreoMutation = useMutation({
      mutationFn: async (payload: any) => {
         const { data, error } = await supabase
            .from("festival_choreographies")
            .insert([{ ...payload, festival_id: festivalId, studio_id: studioId }])
            .select();
         if (error) throw error;
         return data;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-choreographies", festivalId] });
         setIsAddDialogOpen(false);
         setNewChoreo({ name: '', teacher_name: '', duration: '', music_url: '', category: 'adulto' });
         toast.success("Coreografia cadastrada!");
      }
   });

   const deleteChoreoMutation = useMutation({
      mutationFn: async (id: string) => {
         const { error } = await supabase.from("festival_choreographies").delete().eq("id", id);
         if (error) throw error;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-choreographies", festivalId] });
         toast.success("Coreografia removida!");
      }
   });

   if (isLoading || isLoadingEnrollments) return <Skeleton className="h-64 rounded-[2rem]" />;

   return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">Line-up de Coreografias</h3>
            <Button
               size="sm"
               onClick={() => setIsAddDialogOpen(true)}
               className="rounded-xl h-10 md:h-12 font-bold uppercase text-[10px] tracking-widest gap-2 bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 w-full sm:w-auto"
            >
               <Music className="h-3.5 w-3.5" /> Adicionar Coreografia
            </Button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {choreographies.length === 0 ? (
               <div className="md:col-span-3 py-20 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <Play className="h-10 w-10 text-slate-100 mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Nenhuma coreografia registrada ainda</p>
               </div>
            ) : (
               choreographies.map(choreo => (
                  <Card key={choreo.id} className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden hover:shadow-xl transition-all duration-500 group">
                     <CardContent className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-6">
                           <div className="h-12 w-12 rounded-2xl bg-slate-950 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                              <Music className="h-6 w-6" />
                           </div>
                           <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase border-slate-100 text-slate-400">
                              {choreo.category || 'Geral'}
                           </Badge>
                        </div>
                        <h4 className="text-xl font-black uppercase text-slate-900 leading-tight mb-2 italic">{choreo.name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{choreo.teacher_name || 'Sem Instrutor'}</p>

                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              {choreo.music_url && (
                                 <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-lg text-[9px] font-black uppercase gap-1.5 py-1.5 px-3">
                                    <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> Ãudio Vinculado
                                 </Badge>
                              )}
                              <span className="text-[10px] font-black text-slate-300 uppercase italic">{choreo.duration || '0:00'}</span>
                           </div>
                           <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteChoreoMutation.mutate(choreo.id)}
                              className="rounded-full h-10 w-10 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                           >
                              <Trash2 className="h-4 w-4 text-slate-300" />
                           </Button>
                        </div>
                     </CardContent>
                  </Card>
               ))
            )}
         </div>

         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="rounded-3xl md:rounded-[3rem] border-none shadow-2xl p-6 md:p-8 max-w-[90vw] md:max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">Nova Coreografia</DialogTitle>
               </DialogHeader>
               <div className="space-y-4">
                  <Input
                     placeholder="Nome da Dança"
                     className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                     value={newChoreo.name}
                     onChange={(e) => setNewChoreo(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                     placeholder="Nome do Coreógrafo"
                     className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                     value={newChoreo.teacher_name}
                     onChange={(e) => setNewChoreo(prev => ({ ...prev, teacher_name: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-4">
                     <Input
                        placeholder="Duração (mm:ss)"
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                        value={newChoreo.duration}
                        onChange={(e) => setNewChoreo(prev => ({ ...prev, duration: e.target.value }))}
                     />
                     <Select value={newChoreo.category} onValueChange={(v) => setNewChoreo(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                           <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                           <SelectItem value="baby">Baby Class</SelectItem>
                           <SelectItem value="infantil">Infantil</SelectItem>
                           <SelectItem value="juvenil">Juvenil</SelectItem>
                           <SelectItem value="adulto">Adulto</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>
               <DialogFooter className="pt-6">
                  <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="font-bold uppercase text-[10px]">Cancelar</Button>
                  <Button
                     onClick={() => addChoreoMutation.mutate(newChoreo)}
                     disabled={addChoreoMutation.isPending || !newChoreo.name}
                     className="rounded-2xl h-12 flex-1 bg-slate-900 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200"
                  >
                     {addChoreoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Coreografia"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}

function CostManagement({
   festivalId,
   studioId,
   activeTab
}: {
   festivalId: string,
   studioId: string,
   activeTab: string
}) {
   const queryClient = useQueryClient();
   const [isAddCostOpen, setIsAddCostOpen] = useState(false);
   const [newCost, setNewCost] = useState({
      description: '',
      amount: 0,
      category: 'outros',
      due_date: new Date().toISOString().split('T')[0]
   });

   const { data: costs = [], isLoading } = useQuery({
      queryKey: ["festival-costs", festivalId],
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_costs")
            .select("*")
            .eq("festival_id", festivalId)
            .order("due_date", { ascending: true });
         if (error) throw error;
         return data;
      }
   });

   const addCostMutation = useMutation({
      mutationFn: async (payload: any) => {
         const { data, error } = await supabase
            .from("festival_costs")
            .insert([{ ...payload, festival_id: festivalId, studio_id: studioId }])
            .select();
         if (error) throw error;
         return data;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-costs", festivalId] });
         setIsAddCostOpen(false);
         setNewCost({ description: '', amount: 0, category: 'outros', due_date: new Date().toISOString().split('T')[0] });
         toast.success("Custo registrado!");
      }
   });

   const deleteCostMutation = useMutation({
      mutationFn: async (id: string) => {
         const { error } = await supabase.from("festival_costs").delete().eq("id", id);
         if (error) throw error;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-costs", festivalId] });
         toast.success("Custo removido!");
      }
   });

   if (isLoading || isLoadingEnrollments) return <Skeleton className="h-64 rounded-[2rem]" />;

   const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0);

   return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden">
               <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
                  <div>
                     <CardTitle className="text-xl font-black uppercase text-slate-900 italic tracking-tight">Lancamentos de Custos</CardTitle>
                     <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">Controle de despesas do evento</CardDescription>
                  </div>
                  <Button
                     size="sm"
                     onClick={() => setIsAddCostOpen(true)}
                     className="rounded-xl font-bold uppercase text-[9px] tracking-widest gap-2 bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20"
                  >
                     <Plus className="h-3.5 w-3.5" /> Novo Custo
                  </Button>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="border-b border-slate-50 bg-slate-50/30">
                              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Descrição</th>
                              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Categoria</th>
                              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Valor</th>
                              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Vencimento</th>
                              <th className="px-8 py-4"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {costs.length === 0 ? (
                              <tr>
                                 <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">Nenhuma despesa lançada</td>
                              </tr>
                           ) : (
                              costs.map(cost => (
                                 <tr key={cost.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-4">
                                       <span className="text-sm font-black uppercase text-slate-900 italic">{cost.description}</span>
                                    </td>
                                    <td className="px-8 py-4">
                                       <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none rounded-lg text-[8px] font-black uppercase">
                                          {cost.category}
                                       </Badge>
                                    </td>
                                    <td className="px-8 py-4">
                                       <span className="text-sm font-black text-slate-900">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost.amount)}
                                       </span>
                                    </td>
                                    <td className="px-8 py-4">
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                          {format(new Date(cost.due_date), "dd/MM/yyyy")}
                                       </span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => deleteCostMutation.mutate(cost.id)}
                                          className="h-8 w-8 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                       >
                                          <Trash2 className="h-3.5 w-3.5" />
                                       </Button>
                                    </td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>
               </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-slate-900 text-white overflow-hidden">
               <CardContent className="p-8 flex flex-col justify-between h-full">
                  <div>
                     <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-primary mb-6">
                        <PiggyBank className="h-6 w-6" />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Investimento Total</p>
                     <h4 className="text-4xl font-black tracking-tighter italic">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCosts)}
                     </h4>
                  </div>
                  <div className="pt-8 mt-8 border-t border-white/5 space-y-4">
                     <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span>Ponto de Equilíbrio</span>
                        <span className="text-white">Em breve</span>
                     </div>
                     <Progress value={0} className="h-2 bg-white/10" />
                  </div>
               </CardContent>
            </Card>
         </div>

         <Dialog open={isAddCostOpen} onOpenChange={setIsAddCostOpen}>
            <DialogContent className="rounded-3xl md:rounded-[3rem] border-none shadow-2xl p-6 md:p-8 max-w-[90vw] md:max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">Nova Despesa</DialogTitle>
               </DialogHeader>
               <div className="space-y-4">
                  <Input
                     placeholder="Descrição do Custo"
                     className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                     value={newCost.description}
                     onChange={(e) => setNewCost(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <Input
                           type="number"
                           placeholder="Valor"
                           className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                           value={newCost.amount}
                           onChange={(e) => setNewCost(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        />
                     </div>
                     <Select value={newCost.category} onValueChange={(v) => setNewCost(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                           <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                           {COST_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <Input
                     type="date"
                     className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                     value={newCost.due_date}
                     onChange={(e) => setNewCost(prev => ({ ...prev, due_date: e.target.value }))}
                  />
               </div>
               <DialogFooter className="pt-6">
                  <Button variant="ghost" onClick={() => setIsAddCostOpen(false)} className="font-bold uppercase text-[10px]">Cancelar</Button>
                  <Button
                     onClick={() => addCostMutation.mutate(newCost)}
                     disabled={addCostMutation.isPending || !newCost.description}
                     className="rounded-2xl h-12 flex-1 bg-rose-500 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-500/20"
                  >
                     {addCostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Custo"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}

function ParticipantManagement({
   festivalId,
   studioId,
   capacityLimit,
   currentTickets,
   packages,
   isLoadingPackages,
   enrollments,
   isLoadingEnrollments
}: {
   festivalId: string,
   studioId: string,
   capacityLimit: number,
   currentTickets: number,
   packages: any[],
   isLoadingPackages: boolean,
   enrollments: any[],
   isLoadingEnrollments: boolean
}) {
   const queryClient = useQueryClient();
   const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
   const [isEditEnrollmentOpen, setIsEditEnrollmentOpen] = useState(false);
   const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
   const [selectedStudent, setSelectedStudent] = useState<any>(null);
   const [selectedPackageId, setSelectedPackageId] = useState('');
   const [selectedStatus, setSelectedStatus] = useState<string>('ativo');

   const enrollStudentMutation = useMutation({
      mutationFn: async ({ studentId, packageId }: { studentId: string, packageId: string }) => {
         const { data, error } = await supabase.rpc('process_festival_sale_v3', {
            p_studio_id: studioId,
            p_festival_id: festivalId,
            p_student_id: studentId,
            p_package_id: packageId,
            p_quantity: 1
         });

         if (error) throw error;
         return data;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-enrollments", festivalId] });
         queryClient.invalidateQueries({ queryKey: ["festivals", studioId] });
         queryClient.invalidateQueries({ queryKey: ["festival-payments-summary", festivalId] });
         setIsEnrollDialogOpen(false);
         setSelectedStudent(null);
         setSelectedPackageId('');
         toast.success("Aluno inscrito com sucesso!", {
            description: "Inscrição, pagamentos e ingressos gerados automaticamente."
         });
      },
      onError: (err: any) => {
         console.error("Enrollment error:", err);
         toast.error("Erro ao realizar inscription", { description: err.message });
      }
   });

   const handleSyncPayment = async (enrollmentId: string) => {
      const { data: config } = await supabase
         .from("studio_configs")
         .select("mp_access_token")
         .eq("studio_id", studioId)
         .single();

      if (!config?.mp_access_token) {
         toast.error("Mercado Pago não configurado para este estúdio.");
         return;
      }

      toast.promise(
         async () => {
            const { data: payments } = await supabase
               .from("festival_payments")
               .select("id, amount, installment_number")
               .eq("enrollment_id", enrollmentId)
               .eq("status", "pendente");

            if (!payments || payments.length === 0) {
               return "Nenhuma parcela pendente encontrada.";
            }

            let syncedCount = 0;
            for (const p of payments) {
               const response = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${p.id}`, {
                  headers: { Authorization: `Bearer ${config.mp_access_token}` }
               });
               const mpData = await response.json();

               if (mpData.results?.length > 0) {
                  const approvedPayment = mpData.results.find((rep: any) => rep.status === 'approved');
                  if (approvedPayment) {
                     await supabase
                        .from("festival_payments")
                        .update({
                           status: 'pago',
                           payment_date: new Date().toISOString().split('T')[0]
                        })
                        .eq("id", p.id);
                     syncedCount++;
                  }
               }
            }

            queryClient.invalidateQueries({ queryKey: ["festival-enrollments", festivalId] });
            queryClient.invalidateQueries({ queryKey: ["festival-payments-summary", festivalId] });

            return syncedCount > 0
               ? `${syncedCount} parcela(s) sincronizada(s) com sucesso!`
               : "Nenhum pagamento aprovado encontrado no Mercado Pago para estas parcelas.";
         },
         {
            loading: 'Sincronizando com Mercado Pago...',
            success: (msg) => msg,
            error: 'Erro ao sincronizar pagamentos.'
         }
      );
   };

   const updateEnrollmentMutation = useMutation({
      mutationFn: async ({ enrollmentId, newPackageId, status }: { enrollmentId: string, newPackageId: string, status: string }) => {
         const pkg = (packages as any[]).find(p => p.id === newPackageId);
         if (!pkg) throw new Error("Pacote não encontrado");

         const inclusions = pkg.festival_package_inclusions || [];
         for (const inc of inclusions) {
            const totalCap = inc.festival_available_items.total_capacity;
            if (totalCap !== null && totalCap !== undefined) {
               const { count } = await supabase
                  .from("festival_tickets")
                  .select("*", { count: 'exact', head: true })
                  .eq("item_id", inc.item_id)
                  .neq("status", "cancelado");

               if ((count || 0) + (inc.quantity || 1) > totalCap) {
                  throw new Error(`Estoque insuficiente para "${inc.festival_available_items.name}" no novo pacote.`);
               }
            }
         }

         const { error } = await supabase
            .from("festival_enrollments")
            .update({
               package_id: newPackageId,
               status: status
            })
            .eq("id", enrollmentId);

         if (error) throw error;
         return { success: true };
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-enrollments", festivalId] });
         setIsEditEnrollmentOpen(false);
         setSelectedEnrollment(null);
         setSelectedPackageId('');
         toast.success("Inscrição atualizada com sucesso!");
      },
      onError: (err: any) => toast.error("Erro ao trocar pacote", { description: err.message })
   });

   const deleteEnrollmentMutation = useMutation({
      mutationFn: async (enrollmentId: string) => {
         const { error } = await supabase
            .from("festival_enrollments")
            .delete()
            .eq("id", enrollmentId);

         if (error) throw error;
         return { success: true };
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-enrollments", festivalId] });
         queryClient.invalidateQueries({ queryKey: ["festivals", studioId] });
         toast.success("Inscrição excluída!", {
            description: "O participante, pagamentos e ingressos foram removidos com sucesso."
         });
      },
      onError: (err: any) => {
         console.error("Delete enrollment error:", err);
         toast.error("Erro ao excluir inscrição", { description: err.message });
      }
   });

   if (isLoading || isLoadingEnrollments) return <Skeleton className="h-64 rounded-[2rem]" />;

   return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900">Participantes Confirmados</h3>
            <Button
               size="sm"
               onClick={() => setIsEnrollDialogOpen(true)}
               className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
            >
               <UserPlus className="h-3.5 w-3.5" /> Inscrever Aluno
            </Button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.length === 0 ? (
               <div className="md:col-span-3 py-16 md:py-20 flex flex-col items-center justify-center bg-white rounded-3xl md:rounded-[3rem] border-2 border-dashed border-slate-100 p-6 text-center">
                  <Users className="h-10 w-10 md:h-12 md:w-12 text-slate-100 mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em]">Nenhum aluno inscrito até o momento</p>
               </div>
            ) : (
               enrollments.map(enr => (
                  <Card key={enr.id} className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden hover:shadow-xl transition-all duration-500">
                     <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-6">
                           <div className="flex items-center gap-4">
                              <div className="h-16 w-16 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 border-2 border-white shadow-md ring-1 ring-slate-100">
                                 {enr.students?.foto_url ? (
                                    <img src={enr.students.foto_url} alt="Foto Aluno" className="h-full w-full object-cover" />
                                 ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-primary/5 text-primary text-xl font-black">
                                       {enr.students?.nome?.slice(0, 2).toUpperCase()}
                                    </div>
                                 )}
                              </div>
                              <div className="min-w-0">
                                 <h4 className="text-lg font-black uppercase text-slate-900 leading-tight truncate italic">{enr.students?.nome}</h4>
                                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{enr.students?.cpf || "Sem documento"}</p>
                              </div>
                           </div>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                                    <MoreVertical className="h-4 w-4" />
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl">
                                 <DropdownMenuItem
                                    className="flex items-center gap-2 font-bold uppercase text-[10px] text-indigo-500"
                                    onClick={() => {
                                       setSelectedEnrollment(enr);
                                       setSelectedPackageId(enr.package_id);
                                       setSelectedStatus(enr.status);
                                       setIsEditEnrollmentOpen(true);
                                    }}
                                 >
                                    <Settings2 className="h-3.5 w-3.5" /> Editar Participante
                                 </DropdownMenuItem>

                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                       <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          className="flex items-center gap-2 font-bold uppercase text-[10px] text-rose-500 focus:text-rose-500 focus:bg-rose-50"
                                       >
                                          <Trash2 className="h-3.5 w-3.5" /> Excluir Inscrição
                                       </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-3xl border-none p-8">
                                       <AlertDialogHeader>
                                          <AlertDialogTitle className="text-xl font-black uppercase italic">Excluir Inscrição Total?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-slate-500 font-medium">
                                             Esta ação é irreversível. Ao confirmar, o aluno <strong>{enr.students?.nome}</strong> será removido do festival e <strong>todos</strong> os pagamentos e ingressos vinculados a esta inscrição serão excluídos permanentemente.
                                          </AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter className="gap-3">
                                          <AlertDialogCancel className="rounded-2xl h-12 font-black uppercase text-[10px]">Manter Inscrição</AlertDialogCancel>
                                          <AlertDialogAction
                                             onClick={() => deleteEnrollmentMutation.mutate(enr.id)}
                                             className="rounded-2xl h-12 bg-rose-500 font-black uppercase text-[10px] shadow-lg shadow-rose-500/20 hover:bg-rose-600"
                                          >
                                             {deleteEnrollmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Excluir Tudo"}
                                          </AlertDialogAction>
                                       </AlertDialogFooter>
                                    </AlertDialogContent>
                                 </AlertDialog>
                              </DropdownMenuContent>
                           </DropdownMenu>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-50">
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Pacote Escolhido</span>
                              <Badge className="bg-primary/5 text-primary border-none rounded-lg text-[9px] font-black uppercase text-center">{enr.festival_packages?.name}</Badge>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Status da Inscrição</span>
                              <Badge className={`border-none rounded-lg text-[9px] font-black uppercase ${enr.status === 'ativo' ? 'bg-emerald-50 text-emerald-600' :
                                    enr.status === 'cancelado' ? 'bg-rose-50 text-rose-600' :
                                       enr.status === 'concluido' ? 'bg-blue-50 text-blue-600' :
                                          'bg-amber-50 text-amber-600'
                                 }`}>
                                 {enr.status}
                              </Badge>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Resumo Financeiro</span>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleSyncPayment(enr.id)}
                                 className="h-6 px-2 text-[8px] font-black uppercase text-indigo-500 hover:bg-indigo-50 gap-1"
                              >
                                 <RefreshCw className="h-2.5 w-2.5" /> Sincronizar MP
                              </Button>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               ))
            )}
         </div>

         <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
            <DialogContent className="rounded-3xl md:rounded-[3rem] border-none shadow-2xl p-6 md:p-8 max-w-[90vw] md:max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">Inscrever Aluno</DialogTitle>
               </DialogHeader>

               <div className="space-y-6 pt-4">
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">1. Selecione o Aluno</label>
                     {selectedStudent ? (
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                           <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-white shadow-sm overflow-hidden flex items-center justify-center">
                                 {selectedStudent.foto_url ? (
                                    <img src={selectedStudent.foto_url} alt="Foto Aluno" className="h-full w-full object-cover" />
                                 ) : (
                                    <span className="text-xs font-black text-primary">{selectedStudent.nome.slice(0, 2).toUpperCase()}</span>
                                 )}
                              </div>
                              <p className="font-black uppercase text-xs italic tracking-tighter text-primary">{selectedStudent.nome}</p>
                           </div>
                           <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(null)} className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50">
                              <X className="h-4 w-4" />
                           </Button>
                        </div>
                     ) : (
                        <QuickStudentSearch studioId={studioId} onSelect={setSelectedStudent} />
                     )}
                  </div>

                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">2. Escolha o Pacote</label>
                     <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                        <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                           <SelectValue placeholder="Selecione um pacote" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                           {packages.map(pkg => {
                              const minAvail = (pkg.festival_package_inclusions || []).reduce((min: number | null, inc: any) => {
                                 const item = inc.festival_available_items;
                                 if (item.total_capacity === null) return min;
                                 const avail = Math.max(0, item.total_capacity - (item.sold_count || 0));
                                 return min === null ? avail : Math.min(min, avail);
                              }, null as number | null);

                              return (
                                 <SelectItem key={pkg.id} value={pkg.id}>
                                    <div className="flex flex-col">
                                       <span>{pkg.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pkg.total_amount)})</span>
                                       {minAvail !== null && (
                                          <span className={`text-[8px] font-black uppercase ${minAvail < 5 ? 'text-rose-500' : 'text-slate-400'}`}>
                                             {minAvail === 0 ? 'Esgotado' : `${minAvail} vagas disponíveis`}
                                          </span>
                                       )}
                                    </div>
                                 </SelectItem>
                              );
                           })}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <DialogFooter className="pt-8">
                  <Button variant="ghost" onClick={() => setIsEnrollDialogOpen(false)} className="font-bold uppercase text-[10px]">Cancelar</Button>
                  <Button
                     onClick={() => enrollStudentMutation.mutate({ studentId: selectedStudent.id, packageId: selectedPackageId })}
                     disabled={enrollStudentMutation.isPending || !selectedStudent || !selectedPackageId}
                     className="rounded-2xl h-12 flex-1 bg-emerald-500 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20"
                  >
                     {enrollStudentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Inscrição"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog open={isEditEnrollmentOpen} onOpenChange={setIsEditEnrollmentOpen}>
            <DialogContent className="rounded-3xl md:rounded-[3rem] border-none shadow-2xl p-6 md:p-8 max-w-[90vw] md:max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 italic">Editar Participante</DialogTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">Aluno: {selectedEnrollment?.students?.nome}</p>
               </DialogHeader>

               <div className="space-y-6 pt-4">
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Status da Inscrição</label>
                     <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                           <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                           <SelectItem value="ativo">Ativo</SelectItem>
                           <SelectItem value="pendente">Pendente</SelectItem>
                           <SelectItem value="concluido">Concluído</SelectItem>
                           <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>

                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Pacote Selecionado</label>
                     <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                        <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                           <SelectValue placeholder="Selecione um pacote" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                           {(packages as any[]).map(pkg => (
                              <SelectItem key={pkg.id} value={pkg.id}>
                                 {pkg.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pkg.total_amount)})
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                     <p className="mt-4 p-4 bg-amber-50 rounded-2xl text-[9px] font-bold text-amber-600 leading-relaxed uppercase border border-amber-100 shadow-sm">
                        ⚠️ Atenção: A troca de pacote mantém os pagamentos já realizados. Verifique se há necessidade de ajuste manual no financeiro após a troca.
                     </p>
                  </div>
               </div>

               <DialogFooter className="pt-8">
                  <Button variant="ghost" onClick={() => setIsEditEnrollmentOpen(false)} className="font-bold uppercase text-[10px]">Cancelar</Button>
                  <Button
                     onClick={() => updateEnrollmentMutation.mutate({ enrollmentId: selectedEnrollment.id, newPackageId: selectedPackageId, status: selectedStatus })}
                     disabled={updateEnrollmentMutation.isPending || !selectedPackageId}
                     className="rounded-2xl h-12 flex-1 bg-indigo-500 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20"
                  >
                     {updateEnrollmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}

function PackageManagement({
   festivalId,
   studioId,
   packages,
   isLoadingPackages
}: {
   festivalId: string,
   studioId: string,
   packages: any[],
   isLoadingPackages: boolean
}) {
   const queryClient = useQueryClient();
   const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
   const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
   const [isManageInclusionsOpen, setIsManageInclusionsOpen] = useState(false);
   const [selectedPackage, setSelectedPackage] = useState<any>(null);
   const livePackage = (packages as any[]).find(p => p.id === selectedPackage?.id);

   const [newPackage, setNewPackage] = useState({
      name: '',
      description: '',
      total_amount: 0,
      max_installments: 1
   });
   const [isDeletePackageOpen, setIsDeletePackageOpen] = useState(false);
   const [packageToDelete, setPackageToDelete] = useState<any>(null);

   const { data: availableItems = [] } = useQuery({
      queryKey: ["festival-available-items", studioId],
      enabled: !!studioId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_available_items")
            .select("*")
            .eq("studio_id", studioId)
            .order("name", { ascending: true });
         if (error) throw error;
         return data;
      }
   });

   const addInclusionMutation = useMutation({
      mutationFn: async ({ packageId, itemId, quantity }: { packageId: string, itemId: string, quantity: number }) => {
         const { data, error } = await supabase
            .from("festival_package_inclusions")
            .upsert([{ package_id: packageId, item_id: itemId, quantity }], { onConflict: 'package_id,item_id' })
            .select();
         if (error) throw error;
         return data;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-packages", festivalId] });
         toast.success("Item vinculado ao pacote!");
      }
   });

   const removeInclusionMutation = useMutation({
      mutationFn: async (inclusionId: string) => {
         const { error } = await supabase
            .from("festival_package_inclusions")
            .delete()
            .eq("id", inclusionId);
         if (error) throw error;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-packages", festivalId] });
         toast.success("Item removido do pacote");
      }
   });

   const addPackageMutation = useMutation({
      mutationFn: async (payload: any) => {
         const { name, description, total_amount, max_installments } = payload;
         const { data, error } = await supabase
            .from("festival_packages")
            .insert([{
               name,
               description,
               total_amount,
               max_installments,
               festival_id: festivalId,
               studio_id: studioId
            }])
            .select('id')
            .single();
         if (error) throw error;
         return data;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-packages", festivalId] });
         setIsAddPackageOpen(false);
         setNewPackage({ name: '', description: '', total_amount: 0, max_installments: 1 });
         toast.success("Pacote criado com sucesso!");
      },
      onError: (err: any) => toast.error("Erro ao criar pacote", { description: err.message })
   });

   const updatePackageMutation = useMutation({
      mutationFn: async (payload: any) => {
         const { id, name, description, total_amount, max_installments } = payload;
         const { data, error } = await supabase
            .from("festival_packages")
            .update({ name, description, total_amount, max_installments, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select('id')
            .single();
         if (error) throw error;
         return data;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-packages", festivalId] });
         setIsEditPackageOpen(false);
         setSelectedPackage(null);
         toast.success("Pacote atualizado com sucesso!");
      },
      onError: (err: any) => toast.error("Erro ao atualizar pacote", { description: err.message })
   });

   const deletePackageMutation = useMutation({
      mutationFn: async (id: string) => {
         // Primeiro remove as inclusões para evitar erros de constraint (se não houver cascade)
         await supabase.from("festival_package_inclusions").delete().eq("package_id", id);

         const { error } = await supabase
            .from("festival_packages")
            .delete()
            .eq("id", id);
         if (error) throw error;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-packages", festivalId] });
         setIsDeletePackageOpen(false);
         setPackageToDelete(null);
         toast.success("Pacote removido com sucesso!");
      },
      onError: (err: any) => {
         if (err.code === '23503') {
            toast.error("Impossível excluir pacote", {
               description: "Existem alunos inscritos neste pacote. Remova as inscrições antes de excluir."
            });
         } else {
            toast.error("Erro ao remover pacote", { description: err.message });
         }
      }
   });

   if (isLoadingPackages) return <Skeleton className="h-64 rounded-[2rem]" />;

   return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">Pacotes de Participação</h3>
            <Button
               size="sm"
               onClick={() => setIsAddPackageOpen(true)}
               className="rounded-xl h-10 md:h-12 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/10 w-full sm:w-auto"
            >
               <Plus className="h-3.5 w-3.5" /> Criar Pacote
            </Button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.length === 0 ? (
               <div className="md:col-span-3 py-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                  <Package className="h-10 w-10 text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Defina os pacotes de participação para iniciar as inscrições</p>
               </div>
            ) : (
               packages.map(pkg => (
                  <Card key={pkg.id} className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden hover:shadow-xl transition-all duration-500 group">
                     <CardContent className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-6">
                           <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                              <Package className="h-6 w-6" />
                           </div>
                           <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase border-slate-100 text-slate-400">
                              {pkg.max_installments}x máx
                           </Badge>
                        </div>
                        <h4 className="text-xl font-black uppercase text-slate-900 leading-tight mb-2 group-hover:text-primary transition-colors">{pkg.name}</h4>
                        <div className="mb-4 flex items-baseline gap-1">
                           <span className="text-[10px] font-black text-slate-400 uppercase italic">R$</span>
                           <span className="text-2xl font-black text-slate-900 tracking-tighter">
                              {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(pkg.total_amount)}
                           </span>
                        </div>
                        <p className="text-sm text-slate-400 font-medium mb-6 line-clamp-2">{pkg.description || "Sem descrição disponível."}</p>

                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                           <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Itens Inclusos</p>
                              <div className="flex -space-x-2 mt-1">
                                 {pkg.festival_package_inclusions?.length > 0 ? (
                                    pkg.festival_package_inclusions.map((inc: any) => (
                                       <div key={inc.id} className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400" title={`${inc.quantity}x ${inc.festival_available_items.name}`}>
                                          {inc.quantity}
                                       </div>
                                    ))
                                 ) : (
                                    <span className="text-[9px] text-slate-300 italic font-medium">Nenhum item vinculado</span>
                                 )}
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => {
                                    setSelectedPackage(pkg);
                                    setIsManageInclusionsOpen(true);
                                 }}
                                 className="rounded-full h-10 w-10 text-indigo-500 hover:bg-indigo-50"
                              >
                                 <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => {
                                    setSelectedPackage(pkg);
                                    setIsEditPackageOpen(true);
                                 }}
                                 className="rounded-full h-10 w-10"
                              >
                                 <Edit className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                              </Button>
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => {
                                    setPackageToDelete(pkg);
                                    setIsDeletePackageOpen(true);
                                 }}
                                 className="rounded-full h-10 w-10 hover:bg-rose-50 hover:text-rose-500"
                              >
                                 <Trash2 className="h-4 w-4 text-slate-300 transition-colors" />
                              </Button>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               ))
            )}
         </div>

         <Dialog open={isAddPackageOpen} onOpenChange={setIsAddPackageOpen}>
            <DialogContent className="rounded-3xl md:rounded-[2.5rem] border-none shadow-2xl p-6 md:p-8 max-w-[90vw] md:max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">Novo Pacote</DialogTitle>
               </DialogHeader>
               <div className="space-y-5 pt-4">
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Nome do Pacote</label>
                     <Input
                        placeholder="Ex: Pacote Completo (Palco + Vídeo)"
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                        value={newPackage.name}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, name: e.target.value }))}
                     />
                  </div>
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Descrição (Opcional)</label>
                     <Input
                        placeholder="O que está incluso?"
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                        value={newPackage.description}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, description: e.target.value }))}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Valor Total</label>
                        <Input
                           type="number"
                           className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-black text-lg"
                           value={newPackage.total_amount}
                           onChange={(e) => setNewPackage(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Parcelas Máx.</label>
                        <Input
                           type="number"
                           className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-black text-lg"
                           value={newPackage.max_installments}
                           onChange={(e) => setNewPackage(prev => ({ ...prev, max_installments: Number(e.target.value) }))}
                        />
                     </div>
                  </div>
               </div>
               <DialogFooter className="pt-8">
                  <Button variant="ghost" onClick={() => setIsAddPackageOpen(false)} className="font-bold uppercase text-[10px]">Cancelar</Button>
                  <Button
                     onClick={() => addPackageMutation.mutate(newPackage)}
                     disabled={addPackageMutation.isPending || !newPackage.name}
                     className="rounded-2xl h-12 flex-1 bg-primary font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                  >
                     {addPackageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Pacote"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog open={isEditPackageOpen} onOpenChange={setIsEditPackageOpen}>
            <DialogContent className="rounded-3xl md:rounded-[2.5rem] border-none shadow-2xl p-6 md:p-8 max-w-[95vw] lg:max-w-xl">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 italic">Configurar Pacote</DialogTitle>
               </DialogHeader>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* Lado Esquerdo: Dados Básicos */}
                  <div className="space-y-5">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1 mb-2 block border-b border-slate-100 pb-2">Informações Gerais</label>
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Nome do Pacote</label>
                        <Input
                           placeholder="Ex: Pacote Completo"
                           className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                           value={selectedPackage?.name}
                           onChange={(e) => setSelectedPackage((prev: any) => ({ ...prev, name: e.target.value }))}
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Descrição (Opcional)</label>
                        <Input
                           placeholder="O que está incluso?"
                           className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                           value={selectedPackage?.description}
                           onChange={(e) => setSelectedPackage((prev: any) => ({ ...prev, description: e.target.value }))}
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Valor Total</label>
                           <Input
                              type="number"
                              className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-black text-lg"
                              value={selectedPackage?.total_amount}
                              onChange={(e) => setSelectedPackage((prev: any) => ({ ...prev, total_amount: Number(e.target.value) }))}
                           />
                        </div>
                        <div>
                           <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Parc. Máx.</label>
                           <Input
                              type="number"
                              className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-black text-lg"
                              value={selectedPackage?.max_installments}
                              onChange={(e) => setSelectedPackage((prev: any) => ({ ...prev, max_installments: Number(e.target.value) }))}
                           />
                        </div>
                     </div>
                     <div className="pt-4">
                        <Button
                           onClick={() => updatePackageMutation.mutate(selectedPackage)}
                           disabled={updatePackageMutation.isPending || !selectedPackage?.name}
                           className="w-full rounded-2xl h-12 bg-primary font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                        >
                           {updatePackageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Dados Básicos"}
                        </Button>
                     </div>
                  </div>

                  {/* Lado Direito: Inclusões */}
                  <div className="space-y-5 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 ml-1 mb-2 block border-b border-indigo-100 pb-2">Itens Inclusos (Benefícios)</label>

                     <div className="space-y-3">
                        <Select onValueChange={(val) => {
                           const [itemId] = val.split(':');
                           addInclusionMutation.mutate({ packageId: selectedPackage.id, itemId, quantity: 1 });
                        }}>
                           <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white shadow-sm">
                              <SelectValue placeholder="➕ Vincular item pré-cadastrado..." />
                           </SelectTrigger>
                           <SelectContent className="rounded-xl border-slate-100 shadow-xl font-bold">
                              {availableItems.map(item => (
                                 <SelectItem key={item.id} value={`${item.id}:${item.name}`}>
                                    {item.type === 'ingresso' ? '🎫 ' : item.type === 'figurino' ? '👗' : item.type === 'taxa' ? '💳' : '📦'} {item.name}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>

                     <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedPackage?.festival_package_inclusions?.length === 0 && (
                           <div className="py-8 text-center bg-white/50 rounded-2xl border border-dashed border-slate-200">
                              <p className="text-[9px] font-black uppercase text-slate-300 italic">Nenhum item vinculado</p>
                           </div>
                        )}
                        {selectedPackage?.festival_package_inclusions?.map((inc: any) => (
                           <div key={inc.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm group">
                              <div className="flex items-center gap-3">
                                 <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs ${inc.festival_available_items.type === 'ingresso' ? 'bg-emerald-50 text-emerald-500' :
                                       inc.festival_available_items.type === 'figurino' ? 'bg-rose-50 text-rose-500' :
                                          inc.festival_available_items.type === 'taxa' ? 'bg-amber-50 text-amber-500' :
                                             'bg-indigo-50 text-indigo-500'
                                    }`}>
                                    {inc.festival_available_items.type === 'ingresso' ? <Receipt className="h-4 w-4" /> :
                                       inc.festival_available_items.type === 'figurino' ? <Shirt className="h-4 w-4" /> :
                                          inc.festival_available_items.type === 'taxa' ? <Receipt className="h-4 w-4" /> :
                                             <Package className="h-4 w-4" />}
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className="font-black uppercase text-[10px] tracking-tight text-slate-700 truncate">{inc.festival_available_items.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                       <span className="text-[8px] font-black uppercase text-slate-300">Qtd:</span>
                                       <input
                                          type="number"
                                          className="w-10 h-5 rounded border-slate-100 bg-slate-50 text-[10px] font-black text-center focus:ring-1 focus:ring-indigo-500"
                                          defaultValue={inc.quantity}
                                          onBlur={(e) => addInclusionMutation.mutate({ packageId: selectedPackage.id, itemId: inc.festival_available_items.id, quantity: Number(e.target.value) })}
                                       />
                                    </div>
                                 </div>
                              </div>
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => removeInclusionMutation.mutate(inc.id)}
                                 className="h-8 w-8 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                 <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <DialogFooter className="pt-8 border-t border-slate-50 mt-4">
                  <Button variant="ghost" onClick={() => setIsEditPackageOpen(false)} className="font-bold uppercase text-[10px] tracking-widest">Fechar Edit</Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <AlertDialog open={isDeletePackageOpen} onOpenChange={setIsDeletePackageOpen}>
            <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
               <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 italic">Excluir este pacote?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500 font-medium">
                     Esta ação apagará permanentemente o pacote <strong>"{packageToDelete?.name}"</strong>.
                     <br /><br />
                     <span className="text-rose-500 font-bold uppercase text-[10px]">⚠️ Nota Importante:</span> Só será possível excluir se não houver inscrições ativas vinculadas a este pacote.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter className="pt-6">
                  <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest border-none">Manter Pacote</AlertDialogCancel>
                  <AlertDialogAction
                     onClick={() => deletePackageMutation.mutate(packageToDelete?.id)}
                     className="rounded-xl font-bold uppercase text-[10px] tracking-widest bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 px-8"
                  >
                     {deletePackageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Sim, Excluir"}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </div>
   );
}

function ItemManagement({ festivalId, studioId }: { festivalId: string, studioId: string }) {
   const queryClient = useQueryClient();
   const [isAddItemOpen, setIsAddItemOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);
   const [isDeleteItemOpen, setIsDeleteItemOpen] = useState(false);
   const [itemToDelete, setItemToDelete] = useState<any>(null);
   const [newItem, setNewItem] = useState({
      name: '',
      description: '',
      type: 'item',
      total_capacity: ''
   });

   useEffect(() => {
      if (editingItem) {
         setNewItem({
            name: editingItem.name || '',
            description: editingItem.description || '',
            type: editingItem.type || 'item',
            total_capacity: editingItem.total_capacity?.toString() || ''
         });
      } else {
         setNewItem({ name: '', description: '', type: 'item', total_capacity: '' });
      }
   }, [editingItem]);

   const { data: items = [], isLoading } = useQuery({
      queryKey: ["festival-available-items", studioId],
      enabled: !!studioId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_available_items")
            .select("*")
            .eq("studio_id", studioId)
            .order("created_at", { ascending: false });
         if (error) throw error;
         return data;
      }
   });

   const addItemMutation = useMutation({
      mutationFn: async (payload: any) => {
         const { name, description, type, total_capacity } = payload;
         const processedCapacity = total_capacity === '' ? null : Number(total_capacity);

         if (editingItem) {
            const { data, error } = await supabase
               .from("festival_available_items")
               .update({
                  name,
                  description,
                  type: type || 'item',
                  total_capacity: processedCapacity,
                  updated_at: new Date().toISOString()
               })
               .eq("id", editingItem.id)
               .select()
               .single();
            if (error) throw error;
            return data;
         } else {
            const { data, error } = await supabase
               .from("festival_available_items")
               .insert([{
                  name,
                  description,
                  type: type || 'item',
                  studio_id: studioId,
                  total_capacity: processedCapacity
               }])
               .select()
               .single();
            if (error) throw error;
            return data;
         }
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-available-items", studioId] });
         setIsAddItemOpen(false);
         setEditingItem(null);
         setNewItem({ name: '', description: '', type: 'item', total_capacity: '' });
         toast.success(editingItem ? "Item atualizado com sucesso!" : "Opção de item cadastrada!");
      },
      onError: (err: any) => toast.error("Erro ao salvar", { description: err.message })
   });

   const deleteItemMutation = useMutation({
      mutationFn: async (id: string) => {
         const { error } = await supabase
            .from("festival_available_items")
            .delete()
            .eq("id", id);
         if (error) throw error;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-available-items", studioId] });
         setIsDeleteItemOpen(false);
         setItemToDelete(null);
         toast.success("Item removido do catálogo!");
      },
      onError: (err: any) => toast.error("Erro ao remover", { description: err.message })
   });

   if (isLoading || isLoadingEnrollments) return <Skeleton className="h-64 rounded-[2rem]" />;

   return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">Itens e Opções Inclusas</h3>
            <Button
               size="sm"
               onClick={() => setIsAddItemOpen(true)}
               className="rounded-xl h-10 md:h-12 font-bold uppercase text-[10px] tracking-widest gap-2 bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 w-full sm:w-auto"
            >
               <Plus className="h-3.5 w-3.5" /> Novo Item
            </Button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.length === 0 ? (
               <div className="md:col-span-3 py-20 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <Shirt className="h-12 w-12 text-slate-100 mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Nenhum item ou ingresso cadastrado</p>
               </div>
            ) : (
               items.map(item => (
                  <Card key={item.id} className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden hover:shadow-xl transition-all duration-500 group">
                     <CardContent className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-6">
                           <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                              {item.type === 'ingresso' ? <Receipt className="h-6 w-6" /> : <Shirt className="h-6 w-6" />}
                           </div>
                           <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase border-slate-100 text-slate-400">
                              {item.type}
                           </Badge>
                        </div>
                        <h4 className="text-xl font-black uppercase text-slate-900 leading-tight mb-2 group-hover:text-indigo-500 transition-colors italic">{item.name}</h4>
                        <p className="text-sm text-slate-400 font-medium mb-6 line-clamp-2">{item.description || "Sem descrição disponível."}</p>

                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                           <div className="flex flex-col">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">Disponibilidade</p>
                              <p className="text-[10px] font-black text-slate-400">
                                 {item.total_capacity ? `${item.total_capacity} unidades` : "Ilimitado"}
                              </p>
                           </div>
                           <div className="flex gap-2">
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 className="rounded-full h-10 w-10 hover:bg-rose-50 hover:text-rose-500"
                                 onClick={() => {
                                    setItemToDelete(item);
                                    setIsDeleteItemOpen(true);
                                 }}
                              >
                                 <Trash2 className="h-4 w-4 text-slate-300 transition-colors" />
                              </Button>
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 className="rounded-full h-10 w-10 hover:bg-indigo-50 hover:text-indigo-500"
                                 onClick={() => {
                                    setEditingItem(item);
                                    setIsAddItemOpen(true);
                                 }}
                              >
                                 <Edit className="h-4 w-4 text-slate-300 transition-colors" />
                              </Button>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               ))
            )}
         </div>

         <Dialog
            open={isAddItemOpen}
            onOpenChange={(open) => {
               setIsAddItemOpen(open);
               if (!open) setEditingItem(null);
            }}
         >
            <DialogContent className="rounded-3xl md:rounded-[2.5rem] border-none shadow-2xl p-6 md:p-8 max-w-[90vw] md:max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 italic">
                     {editingItem ? "Editar Item" : "Novo Item Disponível"}
                  </DialogTitle>
               </DialogHeader>
               <div className="space-y-5 pt-4">
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Nome Legislativo (Ex: Camiseta 2026)</label>
                     <Input
                        placeholder="Nome do item"
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                     />
                  </div>
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Tipo de Recurso</label>
                     <Select value={newItem.type} onValueChange={(v) => setNewItem(prev => ({ ...prev, type: v }))}>
                        <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl font-bold">
                           <SelectItem value="item">📦 Produto Físico (Brinde/Camiseta)</SelectItem>
                           <SelectItem value="ingresso">🎫 Ingresso Seriado (QR Code)</SelectItem>
                           <SelectItem value="figurino">👗 Figurino (Venda/Aluguel)</SelectItem>
                           <SelectItem value="taxa">💳 Taxa Administrativa / Extra</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Descrição (Opcional)</label>
                     <Input
                        placeholder="Mais detalhes sobre o item"
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                        value={newItem.description}
                        onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                     />
                  </div>
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Capacidade Total / Estoque (Opcional)</label>
                     <Input
                        type="number"
                        placeholder="Ilimitado se vazio"
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                        value={newItem.total_capacity}
                        onChange={(e) => setNewItem(prev => ({ ...prev, total_capacity: e.target.value }))}
                     />
                  </div>
               </div>
               <DialogFooter className="pt-8">
                  <Button variant="ghost" onClick={() => setIsAddItemOpen(false)} className="font-bold uppercase text-[10px]">Cancelar</Button>
                  <Button
                     onClick={() => addItemMutation.mutate(newItem)}
                     disabled={addItemMutation.isPending || !newItem.name}
                     className="rounded-2xl h-12 flex-1 bg-indigo-500 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20"
                  >
                     {addItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingItem ? "Atualizar" : "Salvar Item")}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <AlertDialog open={isDeleteItemOpen} onOpenChange={setIsDeleteItemOpen}>
            <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
               <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 italic">Deseja remover este item?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500 font-medium">
                     Esta ação removerá "{itemToDelete?.name}" do catálogo oficial. Alunos já inscritos com este item não serão afetados, mas ele não poderá ser selecionado para novos alunos.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter className="pt-6">
                  <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest border-none">Manter Item</AlertDialogCancel>
                  <AlertDialogAction
                     onClick={() => deleteItemMutation.mutate(itemToDelete?.id)}
                     className="rounded-xl font-bold uppercase text-[10px] tracking-widest bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 px-8"
                  >
                     Sim, Remover
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </div>
   );
}

function TicketManagement({ festivalId, studioId, capacityLimit, currentTickets }: { festivalId: string, studioId: string, capacityLimit: number, currentTickets: number }) {
   const queryClient = useQueryClient();
   const [isScannerOpen, setIsScannerOpen] = useState(false);
   const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
   const [selectedStudent, setSelectedStudent] = useState<any>(null);
   const [searchTerm, setSearchTerm] = useState("");
   const [saleForm, setSaleForm] = useState({
      itemId: '',
      amount: 0,
      buyerName: '',
      isGuest: false,
      paymentMethod: 'pix',
      quantity: 1
   });

   const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();

   const { data: festivalData } = useQuery({
      queryKey: ["festival-details", festivalId],
      enabled: !!festivalId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festivals")
            .select("*")
            .eq("id", festivalId)
            .single();
         if (error) throw error;
         return data;
      }
   });

   const { data: tickets = [], isLoading } = useQuery({
      queryKey: ["festival-tickets", festivalId],
      enabled: !!festivalId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_tickets")
            .select(`
               *,
               festival_available_items!item_id ( name ),
               festival_enrollments!inner ( 
                  festival_id,
                  students!inner ( nome, cpf )
               )
            `)
            .eq("festival_enrollments.festival_id", festivalId)
            .order("created_at", { ascending: false });
         if (error) throw error;
         return data;
      }
   });

   const handlePrintTickets = (ticketsToPrint: any[]) => {
      const validTickets = ticketsToPrint.filter(t => t.status === 'valido');
      if (validTickets.length === 0) {
         toast.error("Nenhum ingresso válido disponível para impressão.");
         return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const htmlContent = `
         <style>
            @media print {
               @page { margin: 0; }
               body { margin: 0; }
            }
            body { font-family: 'Inter', sans-serif; background: #f8fafc; }
            .print-container { padding: 20px; display: grid; grid-template-columns: 1fr; gap: 20px; }
            
            .ticket-card {
               width: 100%;
               max-width: 400px;
               margin: 0 auto;
               background: white;
               border-radius: 40px;
               overflow: hidden;
               box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
               page-break-inside: avoid;
               border: 1px solid #f1f5f9;
            }
            .header {
               background: #0f172a;
               padding: 24px 32px;
               color: white;
               display: flex;
               justify-content: space-between;
               align-items: flex-start;
            }
            .header-label { font-size: 10px; font-weight: 900; letter-spacing: 0.2em; color: #94a3b8; margin-bottom: 8px; }
            .student-name { font-size: 20px; font-weight: 900; text-transform: uppercase; font-style: italic; }
            .content { padding: 32px; }
            .detail-row { margin-bottom: 24px; }
            .detail-label { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; }
            .detail-text { font-size: 14px; font-weight: 900; color: #0f172a; font-style: italic; }
            .sub-text { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; }
            .footer {
               padding: 32px;
               border-top: 1px solid #f8fafc;
               display: flex;
               justify-content: space-between;
               align-items: center;
            }
            .qr-code { width: 64px; height: 64px; background: #f8fafc; border-radius: 16px; padding: 8px; }
            .price-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
            .price-val { font-size: 20px; font-weight: 900; color: #0f172a; }
            .contact-info { display: flex; gap: 12px; margin-top: 12px; }
            .contact-text { font-size: 10px; color: #64748b; font-weight: 700; }
         </style>
         <html>
            <body>
               <div class="print-container">
                  ${validTickets.map(t => {
         const studentName = t.students?.nome || t.festival_enrollments?.students?.nome || t.buyer_name || "Convidado";
         const itemName = t.festival_available_items?.name || "Geral";
         const venue = (typeof festivalData === 'object' && festivalData?.venue_name) || "Teatro";
         const address = (typeof festivalData === 'object' && festivalData?.venue_address) || "";
         const date = (typeof festivalData === 'object' && festivalData?.dates?.[0]) ? format(new Date(festivalData.dates[0]), "dd 'de' MMMM", { locale: ptBR }) : "";
         const seat = itemName;
         const instagram = (typeof festivalData === 'object' && festivalData?.contact_instagram);
         const phone = (typeof festivalData === 'object' && festivalData?.contact_phone);
         const pValue = t.festival_available_items?.price ? `R$ ${t.festival_available_items.price.toFixed(2)}` : '';

         return `
                        <div class="ticket-card">
                           <div class="header">
                              <div>
                                 <p class="header-label">PASSAPORTE OFICIAL</p>
                                 <h4 class="student-name">${studentName}</h4>
                              </div>
                           </div>
                           <div class="content">
                              <div class="detail-row">
                                 <p class="detail-label">Evento</p>
                                 <p class="detail-text">${(typeof festivalData === 'object' && festivalData?.name) || ''}</p>
                              </div>
                              <div class="detail-row">
                                 <div class="qr-code" id="qr-${t.id}"></div>
                              </div>
                              <div class="details">
                                 <div class="detail-row"><p class="detail-text">${venue}</p></div>
                                 <div class="detail-row"><p class="sub-text">${address}</p></div>
                                 <div class="detail-row" style="margin-top: 6px;"><p class="detail-text">Data: ${date}</p></div>
                                 <div class="detail-row"><p class="detail-text">Setor: ${seat}</p></div>
                              </div>
                           </div>
                           <div class="footer">
                              <div class="contact-info">
                                 ${instagram ? `<span class="contact-text">@${instagram.replace('@', '')}</span>` : ''}
                                 ${phone ? `<span class="contact-text">${phone}</span>` : ''}
                              </div>
                              <div class="price-tag">
                                 <p class="price-label">Valor</p>
                                 <p class="price-val">${pValue}</p>
                              </div>
                           </div>
                        </div>
                     `;
      }).join('')}
               </div>
               <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
               <script>
                  window.onload = function() {
                     const tickets = ${JSON.stringify(validTickets.map(t => ({ id: t.id })))};
                     tickets.forEach(ticket => {
                        const qr = qrcode(0, 'L');
                        qr.addData(JSON.stringify({ t: ticket.id }));
                        qr.make();
                        const target = document.getElementById('qr-' + ticket.id);
                        if (target) {
                           target.innerHTML = qr.createSvgTag({
                               cellSize: 3,
                               margin: 0
                           });
                        }
                     });
                     setTimeout(() => {
                        window.print();
                        window.close();
                     }, 500);
                  };
               </script>
            </body>
         </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
   };

   const { data: availableItems = [] } = useQuery({
      queryKey: ["festival-available-items", studioId],
      enabled: !!studioId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_available_items")
            .select("*")
            .eq("studio_id", studioId)
            .order("name", { ascending: true });
         if (error) throw error;
         return data;
      }
   });

   // Removed generateLooseTicketMutation - all tickets now flow through sellItemMutation for payment tracking

   const sellItemMutation = useMutation({
      mutationFn: async () => {
         if (!saleForm.itemId) throw new Error("Selecione um item");
         if (!saleForm.isGuest && !selectedStudent) throw new Error("Selecione um aluno");
         if (saleForm.isGuest && !saleForm.buyerName) throw new Error("Informe o nome do comprador");

         const item = availableItems.find(i => i.id === saleForm.itemId);
         if (!item) throw new Error("Item não encontrado");

         // Call Supabase RPC directly (Bypassing Firebase Functions due to billing)
         const { data: result, error } = await supabase.rpc("process_festival_sale_v3", {
            p_studio_id: studioId,
            p_festival_id: festivalId,
            p_student_id: saleForm.isGuest ? null : selectedStudent.id,
            p_item_id: item.id,
            p_quantity: saleForm.quantity,
            p_payment_method: saleForm.paymentMethod,
            p_buyer_name: saleForm.isGuest ? saleForm.buyerName : null
         });

         if (error) {
            throw new Error(error.message || "Erro ao processar venda no banco");
         }

         return result;
      },
      onSuccess: (result: any) => {
         queryClient.invalidateQueries({ queryKey: ["festival-tickets", festivalId] });
         queryClient.invalidateQueries({ queryKey: ["festival-available-items", studioId] });
         queryClient.invalidateQueries({ queryKey: ["festival-enrollments", festivalId] });

         toast.success("Venda processada com sucesso!", {
            description: `${result.tickets?.length || 0} ingresso(s) gerado(s).`
         });

         if (saleForm.paymentMethod === 'online') {
            checkout({
               amount: saleForm.amount * saleForm.quantity,
               description: `Festival: ${saleForm.itemId} - Qtd: ${saleForm.quantity}`,
               transactionId: result.payment_id || `fest_${Date.now()}`,
               paymentMethods: ["card", "pix"],
               metadata: {
                  tipo: "festival_sale",
                  festival_id: festivalId,
                  payment_id: result.payment_id
               },
               returnPath: `/admin/festival/${festivalId}`
            });
         }

         setIsSaleDialogOpen(false);
         setSelectedStudent(null);
         setSaleForm({
            itemId: '',
            amount: 0,
            buyerName: '',
            isGuest: false,
            paymentMethod: 'pix',
            quantity: 1
         });
      }
   });

   const cancelTicketMutation = useMutation({
      mutationFn: async (ticketId: string) => {
         // 1. Get the ticket to find the payment_id
         const { data: ticket, error: fetchError } = await supabase
            .from("festival_tickets")
            .select("payment_id")
            .eq("id", ticketId)
            .single();

         if (fetchError) throw fetchError;

         // 2. Mark ticket as cancelled
         const { error: ticketError } = await supabase
            .from("festival_tickets")
            .update({ status: 'cancelado' })
            .eq("id", ticketId);
         if (ticketError) throw ticketError;

         // 3. Mark payment as reversed (estornado) if it exists
         if (ticket?.payment_id) {
            const { error: payError } = await supabase
               .from("festival_payments")
               .update({ status: 'estornado' })
               .eq("id", ticket.payment_id);
            if (payError) throw payError;
         }
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-tickets", festivalId] });
         queryClient.invalidateQueries({ queryKey: ["festival-available-items", studioId] });
         queryClient.invalidateQueries({ queryKey: ["festival-payments", studioId] });
         toast.success("Ingresso cancelado e pagamento estornado!");
      },
      onError: (e: any) => toast.error("Falha ao cancelar: " + e.message)
   });

   const validateTicketMutation = useMutation({
      mutationFn: async (ticketId: string) => {
         const { error } = await supabase.rpc('validate_festival_ticket', {
            p_ticket_id: ticketId
         });
         if (error) throw error;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-tickets", festivalId] });
         toast.success("Ingresso validado com sucesso!");
      },
      onError: (err: any) => toast.error("Falha na validação", { description: err.message })
   });

   if (isLoading || isLoadingEnrollments) return <Skeleton className="h-64 rounded-[2rem]" />;

   const filteredTickets = tickets.filter((t: any) =>
      t.students?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.slice(0, 8).includes(searchTerm.toLowerCase())
   );

   return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 leading-tight italic">Terminal de Bilheteria</h3>
            <div className="flex gap-2 w-full md:w-auto">
               <Button
                  size="sm"
                  onClick={() => setIsSaleDialogOpen(true)}
                  className="rounded-xl h-10 md:h-12 font-bold uppercase text-[10px] tracking-widest gap-2 bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 flex-1 md:flex-none"
               >
                  <DollarSign className="h-3.5 w-3.5" /> Venda Avulsa
               </Button>
               <Button
                  size="sm"
                  onClick={() => setIsScannerOpen(true)}
                  variant="outline"
                  className="rounded-xl h-10 md:h-12 font-bold uppercase text-[10px] tracking-widest gap-2 border-slate-200 bg-white flex-1 md:flex-none"
               >
                  <ScanLine className="h-3.5 w-3.5" /> Scanner QR
               </Button>
            </div>
         </div>

         <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
               placeholder="Pesquisar por Código, Aluno ou Comprador..."
               className="h-14 pl-12 rounded-2xl border-none shadow-sm ring-1 ring-slate-100 bg-white italic font-medium uppercase text-[10px] tracking-widest"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTickets.length === 0 ? (
               <div className="md:col-span-3 py-20 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <TicketIcon className="h-12 w-12 text-slate-100 mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Nenhum ingresso encontrado</p>
               </div>
            ) : (
               filteredTickets.map(ticket => (
                  <Card key={ticket.id} className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden hover:shadow-xl transition-all duration-500 group">
                     <CardContent className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-6">
                           <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                              <TicketIcon className="h-6 w-6" />
                           </div>
                           <Badge className={`border-none rounded-lg text-[9px] font-black uppercase ${ticket.status === 'valido' ? 'bg-emerald-50 text-emerald-600' :
                                 ticket.status === 'utilizado' ? 'bg-slate-100 text-slate-400' :
                                    'bg-rose-50 text-rose-600'
                              }`}>
                              {ticket.status}
                           </Badge>
                        </div>

                        <div className="space-y-1 mb-4">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portador / Comprador</h4>
                           <p className="text-lg font-black uppercase text-slate-900 leading-tight truncate italic">
                              {ticket.students?.nome || ticket.festival_enrollments?.students?.nome || ticket.buyer_name || "N/A"}
                           </p>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-50">
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">Código ID</span>
                              <span className="text-[10px] font-mono font-bold text-slate-400">{ticket.id.slice(0, 8).toUpperCase()}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">Setor / Item</span>
                              <Badge variant="outline" className="border-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase">
                                 {ticket.festival_available_items?.name || 'Geral'}
                              </Badge>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                           <Button
                              variant="ghost"
                              onClick={() => handlePrintTickets([ticket])}
                              className="rounded-xl h-10 font-bold uppercase text-[9px] tracking-widest gap-2 hover:bg-slate-50 border border-slate-100"
                           >
                              <Printer className="h-3 w-3" /> Imprimir
                           </Button>
                           {ticket.status === 'valido' && (
                              <Button
                                 onClick={() => validateTicketMutation.mutate(ticket.id)}
                                 disabled={validateTicketMutation.isPending}
                                 className="rounded-xl h-10 font-black uppercase text-[9px] tracking-widest gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                              >
                                 {validateTicketMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Validar
                              </Button>
                           )}
                           {ticket.status === 'cancelado' && (
                              <Badge className="col-span-2 bg-rose-50 text-rose-600 justify-center h-10 rounded-xl border-none text-[9px] font-black uppercase tracking-widest">INGRESSO CANCELADO</Badge>
                           )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="sm" className="h-8 gap-2 font-bold uppercase text-[9px] text-slate-400 hover:text-slate-900">
                                    <Settings2 className="h-3.5 w-3.5" /> Opções Avançadas
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="rounded-xl border-slate-100 shadow-xl">
                                 <DropdownMenuItem
                                    onClick={() => cancelTicketMutation.mutate(ticket.id)}
                                    className="flex items-center gap-2 font-black uppercase text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                 >
                                    <Trash2 className="h-3.5 w-3.5" /> Cancelar / Estornar
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                    className="flex items-center gap-2 font-black uppercase text-[10px] text-indigo-500"
                                    onClick={() => {
                                       const link = `${window.location.origin}/ticket-check/${ticket.id}`;
                                       navigator.clipboard.writeText(link);
                                       toast.success("Link copiado!");
                                    }}
                                 >
                                    <Copy className="h-3.5 w-3.5" /> Copiar Link de Checkin
                                 </DropdownMenuItem>
                                 <ShareTicketAction ticket={ticket} />
                              </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                     </CardContent>
                  </Card>
               ))
            )}
         </div>

         <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
            <DialogContent className="rounded-3xl md:rounded-[3rem] border-none shadow-2xl p-6 md:p-8 max-w-[90vw] md:max-w-md">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 italic">Validador de Acesso</DialogTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aponte a cÃ¢mera para o QR Code do ingresso</p>
               </DialogHeader>

               <div className="aspect-square bg-slate-900 rounded-3xl overflow-hidden mt-6 relative border-4 border-slate-50 shadow-inner ring-1 ring-slate-100">
                  <QRScanner
                     onScan={(data) => {
                        try {
                           const parsed = JSON.parse(data);
                           if (parsed.t) {
                              validateTicketMutation.mutate(parsed.t);
                              setIsScannerOpen(false);
                           }
                        } catch (e) {
                           toast.error("QR Code inválido para este sistema.");
                        }
                     }}
                  />
                  <div className="absolute inset-0 border-2 border-primary/30 m-12 rounded-2xl pointer-events-none animate-pulse" />
               </div>

               <Button variant="ghost" onClick={() => setIsScannerOpen(false)} className="mt-6 w-full font-black uppercase text-[10px] tracking-widest">Fechar Scanner</Button>
            </DialogContent>
         </Dialog>

         <Dialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen}>
            <DialogContent className="rounded-3xl md:rounded-[3rem] border-none shadow-2xl p-6 md:p-8 max-w-[95vw] md:max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 italic">Venda de Balcão</DialogTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emissão instantÃ¢nea de ingressos extra</p>
               </DialogHeader>

               <div className="space-y-6 pt-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 ring-1 ring-white/50">
                     <Button
                        variant={saleForm.isGuest ? 'ghost' : 'default'}
                        onClick={() => setSaleForm(prev => ({ ...prev, isGuest: false }))}
                        className={`flex-1 rounded-xl h-9 text-[9px] font-black uppercase tracking-widest transition-all ${!saleForm.isGuest ? 'shadow-md shadow-primary/20 bg-primary' : 'text-slate-400'}`}
                     >
                        Aluno Base
                     </Button>
                     <Button
                        variant={saleForm.isGuest ? 'default' : 'ghost'}
                        onClick={() => setSaleForm(prev => ({ ...prev, isGuest: true }))}
                        className={`flex-1 rounded-xl h-9 text-[9px] font-black uppercase tracking-widest transition-all ${saleForm.isGuest ? 'shadow-md shadow-primary/20 bg-slate-900 text-white' : 'text-slate-400'}`}
                     >
                        Convidado
                     </Button>
                  </div>

                  {!saleForm.isGuest ? (
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Selecione o Aluno</label>
                        <QuickStudentSearch studioId={studioId} onSelect={setSelectedStudent} />
                        {selectedStudent && (
                           <div className="mt-3 flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10 animate-in zoom-in-95 duration-300">
                              <div className="h-10 w-10 rounded-xl bg-white shadow-sm overflow-hidden flex items-center justify-center font-black text-primary text-xs">
                                 {selectedStudent.nome.slice(0, 2).toUpperCase()}
                              </div>
                              <p className="font-black uppercase text-[10px] italic tracking-tight text-primary">{selectedStudent.nome}</p>
                           </div>
                        )}
                     </div>
                  ) : (
                     <Input
                        placeholder="Nome do Comprador..."
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 uppercase font-black text-xs italic tracking-tighter"
                        value={saleForm.buyerName}
                        onChange={(e) => setSaleForm(prev => ({ ...prev, buyerName: e.target.value }))}
                     />
                  )}

                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Tipo de Ingresso</label>
                     <Select
                        value={saleForm.itemId}
                        onValueChange={(v) => {
                           const item = availableItems.find(i => i.id === v);
                           setSaleForm(prev => ({ ...prev, itemId: v, amount: item?.price || 0 }));
                        }}
                     >
                        <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                           <SelectValue placeholder="Escolha um setor..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl font-bold italic uppercase">
                           {availableItems.filter(i => i.type === 'ingresso').map(item => (
                              <SelectItem key={item.id} value={item.id}>{item.name} (R$ {item.price})</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Quantidade</label>
                        <Input
                           type="number"
                           className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-black text-lg"
                           value={saleForm.quantity}
                           onChange={(e) => setSaleForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Pagamento</label>
                        <Select value={saleForm.paymentMethod} onValueChange={(v) => setSaleForm(prev => ({ ...prev, paymentMethod: v }))}>
                           <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="rounded-xl border-slate-100 shadow-xl font-bold uppercase italic">
                              <SelectItem value="pix">PIX Manual</SelectItem>
                              <SelectItem value="card">Cartão (Maquineta)</SelectItem>
                              <SelectItem value="cash">Dinheiro</SelectItem>
                              <SelectItem value="online">Link de Pagamento</SelectItem>
                           </SelectContent>
                        </Select>
                     </div>
                  </div>
               </div>

               <DialogFooter className="pt-8 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total à Receber</span>
                     <span className="text-xl font-black text-slate-900 tracking-tighter italic">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saleForm.amount * saleForm.quantity)}
                     </span>
                  </div>
                  <Button
                     onClick={() => sellItemMutation.mutate()}
                     disabled={sellItemMutation.isPending || (!saleForm.isGuest && !selectedStudent) || !saleForm.itemId}
                     className="rounded-2xl h-12 w-full bg-emerald-500 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20"
                  >
                     {sellItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalizar Venda"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}

function TicketDesigner({ festival, studioId }: { festival: any, studioId: string }) {
   const festivalId = festival?.id;
   const queryClient = useQueryClient();
   const [config, setConfig] = useState<any>({
      venue_name: '',
      venue_address: '',
      dates: [''],
      contact_instagram: '',
      contact_phone: '',
      terms: ''
   });

   useEffect(() => {
      if (festival) {
         setConfig({
            venue_name: festival.venue_name || '',
            venue_address: festival.venue_address || '',
            dates: festival.dates || [''],
            contact_instagram: festival.contact_instagram || '',
            contact_phone: festival.contact_phone || '',
            terms: festival.terms || ''
         });
      }
   }, [festival]);

   const saveMutation = useMutation({
      mutationFn: async (payload: any) => {
         const { error } = await supabase
            .from("festivals")
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq("id", festivalId);
         if (error) throw error;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festival-details", festivalId] });
         toast.success("Design e informações de ingressos salvos!");
      }
   });

   return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
         <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-tight italic">Configuração do Passaporte</h3>

            <div className="space-y-5">
               <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block italic">Local do Espetáculo</label>
                  <Input
                     placeholder="Ex: Teatro Municipal"
                     className="rounded-2xl h-12 border-slate-100 bg-white shadow-sm italic font-bold uppercase text-[10px] tracking-tight"
                     value={config.venue_name}
                     onChange={(e) => setConfig((prev: any) => ({ ...prev, venue_name: e.target.value }))}
                  />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block italic">Endereço Completo</label>
                  <Input
                     placeholder="Rua, Número, Bairro - Cidade/UF"
                     className="rounded-2xl h-12 border-slate-100 bg-white shadow-sm italic font-bold uppercase text-[10px] tracking-tight"
                     value={config.venue_address}
                     onChange={(e) => setConfig((prev: any) => ({ ...prev, venue_address: e.target.value }))}
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block italic">Instagram de Contato</label>
                     <Input
                        placeholder="@studio"
                        className="rounded-2xl h-12 border-slate-100 bg-white shadow-sm font-bold text-[10px]"
                        value={config.contact_instagram}
                        onChange={(e) => setConfig((prev: any) => ({ ...prev, contact_instagram: e.target.value }))}
                     />
                  </div>
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block italic">WhatsApp de Suporte</label>
                     <Input
                        placeholder="(00) 00000-0000"
                        className="rounded-2xl h-12 border-slate-100 bg-white shadow-sm font-bold text-[10px]"
                        value={config.contact_phone}
                        onChange={(e) => setConfig((prev: any) => ({ ...prev, contact_phone: e.target.value }))}
                     />
                  </div>
               </div>
            </div>

            <Button
               onClick={() => saveMutation.mutate(config)}
               disabled={saveMutation.isPending}
               className="w-full rounded-2xl h-12 bg-slate-900 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200"
            >
               {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Aplicar Alterações no Layout"}
            </Button>
         </div>

         <div className="relative">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-4 block italic">Preview do Ingresso Impresso</label>
            <div className="bg-slate-50 rounded-[3rem] p-8 md:p-12 border-2 border-dashed border-slate-200">
               {/* Ticket Visual Template */}
               <div className="max-w-[320px] mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-slate-100">
                  <div className="bg-slate-900 p-8 text-white">
                     <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary mb-2 opacity-80">Passaporte Oficial</p>
                     <h4 className="text-xl font-black uppercase italic tracking-tighter">NOME DO ALUNO</h4>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">Evento</p>
                        <p className="text-sm font-black uppercase text-slate-800 italic truncate">{festival?.name || 'Seu Festival 2026'}</p>
                     </div>
                     <div className="h-32 w-32 mx-auto bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner">
                        <QRCodeSVG value="preview" size={80} level="L" marginSize={0} />
                     </div>
                     <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                        <div className="space-y-1">
                           <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">Local</p>
                           <p className="text-[10px] font-black uppercase text-slate-700 italic leading-tight">{config.venue_name || 'Define Local'}</p>
                        </div>
                        <div className="space-y-1 text-right">
                           <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">Setor</p>
                           <p className="text-[10px] font-black uppercase text-slate-700 italic">PRIMEIRO SETOR</p>
                        </div>
                     </div>
                  </div>
                  <div className="bg-slate-50 px-8 py-4 flex justify-between items-center">
                     <div className="flex gap-2">
                        <Instagram className="h-3 w-3 text-slate-300" />
                        <Phone className="h-3 w-3 text-slate-300" />
                     </div>
                     <p className="text-[10px] font-black text-slate-900 italic">R$ 00,00</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

function ShareTicketAction({ ticket, festivalName, venueName }: { ticket: any; festivalName?: string; venueName?: string }) {
   const [copied, setCopied] = useState(false);
   const student = ticket?.students || ticket?.festival_enrollments?.students;
   const phoneNumber = student?.telefone?.replace(/\D/g, "");
   const shareUrl = window.location.host + "/ticket/" + ticket.id;

   const handleCopy = () => {
      navigator.clipboard.writeText("https://" + shareUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
   };

   const shareWhatsApp = () => {
      if (!phoneNumber) {
         toast.error("Número de telefone não encontrado.");
         return;
      }

      const message = encodeURIComponent(
         "Olá " + (student?.nome || "") + "! 🎟️  Aqui está o seu ingresso digital para o " + (festivalName || "Evento") + " no " + (venueName || "local do evento") + ".\n\nAcesse seu passaporte aqui: https://" + shareUrl + "\n\nNos vemos lá!"
      );
      window.open("https://wa.me/55" + phoneNumber + "?text=" + message, "_blank");
   };

   return (
      <div className="flex gap-2 flex-1">
         <Button
            variant="ghost"
            onClick={handleCopy}
            className="h-10 flex-1 rounded-xl font-bold uppercase text-[10px] text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all font-black gap-2 px-0"
         >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            Link
         </Button>

         <Button
            variant="ghost"
            disabled={!phoneNumber}
            onClick={shareWhatsApp}
            className="h-10 flex-1 rounded-xl font-bold uppercase text-[10px] text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all font-black gap-2 px-0 disabled:opacity-30"
         >
            <Phone className="h-3.5 w-3.5" />
            WhatsApp
         </Button>
      </div>
   );
}

export default function Festivals() {
   const { studioId } = useAuth();
   const queryClient = useQueryClient();
   const [selectedFestivalId, setSelectedFestivalId] = useState<string | null>(null);
   const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
   const [activeTab, setActiveTab] = useState("overview");

   const [newFestival, setNewFestival] = useState({
      name: "",
      date_start: "",
      status: "planejado",
      total_tickets_limit: 0,
      event_date: "",
      event_time: ""
   });

   const [isEditFestivalOpen, setIsEditFestivalOpen] = useState(false);
   const [editingFestival, setEditingFestival] = useState<any>(null);

   // ——— Data Fetching —————————————————————————————————————————————————————
   const { data: festivals = [], isLoading: loadingFestivals } = useQuery({
      queryKey: ["festivals", studioId],
      enabled: !!studioId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festivals")
            .select("*")
            .eq("studio_id", studioId)
            .order("created_at", { ascending: false });
         if (error) throw error;
         return data;
      }
   });

   const { data: allCosts = [] } = useQuery({
      queryKey: ["festival-costs", selectedFestivalId],
      enabled: !!selectedFestivalId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_costs")
            .select("*")
            .eq("festival_id", selectedFestivalId);
         if (error) throw error;
         return data;
      }
   });

   const { data: allPayments = [] } = useQuery({
      queryKey: ["festival-payments-summary", selectedFestivalId],
      enabled: !!selectedFestivalId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_payments")
            .select("amount, status, enrollment_id(id, festival_id)")
            .filter("enrollment_id.festival_id", "eq", selectedFestivalId);
         if (error) throw error;
         return data;
      }
   });

   const { data: ticketsCount = 0 } = useQuery({
      queryKey: ["festival-tickets-count", selectedFestivalId],
      enabled: !!selectedFestivalId,
      queryFn: async () => {
         const { count, error } = await supabase
            .from("festival_tickets")
            .select("id, enrollment_id!inner(festival_id)", { count: 'exact', head: true })
            .eq("enrollment_id.festival_id", selectedFestivalId);
         if (error) throw error;
         return count || 0;
      }
   });

   const { data: packages = [], isLoading: loadingPackages } = useQuery({
      queryKey: ["festival-packages", selectedFestivalId],
      enabled: !!selectedFestivalId && !!studioId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_packages")
            .select(`
             *,
             festival_package_inclusions!festival_package_inclusions_package_id_fkey (
                id,
                quantity,
                festival_available_items!item_id ( id, name, type, total_capacity, sold_count )
             )
          `)
            .eq("festival_id", selectedFestivalId)
            .order("created_at", { ascending: true });
         if (error) throw error;
         return data;
      }
   });

   // ——— Calculations ——————————————————————————————————————————————————————
   const totalCost = useMemo(() => allCosts.reduce((sum, c) => sum + Number(c.amount), 0), [allCosts]);
   const totalIncome = useMemo(() => allPayments.reduce((sum, p) => sum + Number(p.amount), 0), [allPayments]);
   const receivedIncome = useMemo(() => allPayments.filter(p => p.status === 'pago').reduce((sum, p) => sum + Number(p.amount), 0), [allPayments]);
   const profitability = totalIncome - totalCost;

   // ——— Mutations —————————————————————————————————————————————————————————
   const createMutation = useMutation({
      mutationFn: async (payload: any) => {
         const { data, error } = await supabase
            .from("festivals")
            .insert([{ ...payload, studio_id: studioId }])
            .select()
            .single();
         if (error) throw error;
         return data;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festivals", studioId] });
         setIsCreateDialogOpen(false);
         setNewFestival({ name: "", date_start: "", status: "planejado", total_tickets_limit: 0, event_date: "", event_time: "" });
         toast.success("Festival criado com sucesso!");
      },
      onError: (error: any) => {
         toast.error("Erro ao criar festival", { description: error.message });
      }
   });

   const updateFestivalMutation = useMutation({
      mutationFn: async (payload: any) => {
         const { id, ...updateData } = payload;
         const { data, error } = await supabase
            .from("festivals")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();
         if (error) throw error;
         return data;
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["festivals", studioId] });
         setIsEditFestivalOpen(false);
         toast.success("Festival atualizado com sucesso!");
      },
      onError: (error: any) => {
         toast.error("Erro ao atualizar festival", { description: error.message });
      }
   });

   const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery({
      queryKey: ["festival-enrollments", selectedFestivalId],
      enabled: !!selectedFestivalId,
      queryFn: async () => {
         const { data, error } = await supabase
            .from("festival_enrollments")
            .select(`
             *,
             students ( nome, cpf, foto_url ),
             festival_packages!festival_enrollments_package_id_fkey ( name, total_amount )
          `)
            .eq("festival_id", selectedFestivalId)
            .order("created_at", { ascending: false });
         if (error) throw error;
         return data;
      }
   });

   const selectedFestival = useMemo(() =>
      festivals.find(f => f.id === selectedFestivalId),
      [festivals, selectedFestivalId]
   );

   if (loadingFestivals) {
      return (
         <AdminLayout>
            <div className="space-y-6">
               <Skeleton className="h-12 w-1/4" />
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Skeleton className="h-48 rounded-3xl" />
                  <Skeleton className="h-48 rounded-3xl" />
                  <Skeleton className="h-48 rounded-3xl" />
               </div>
            </div>
         </AdminLayout>
      );
   }

   return (
      <AdminLayout>
         <div className="flex flex-col gap-8 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
               <div className="flex flex-col gap-1">
                  <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-slate-900 leading-none italic">
                     Gestão de Festivais
                  </h1>
                  <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                     <span className="w-8 h-[2px] bg-indigo-500/30 font-black italic"></span>
                     Controle de custos, pacotes e participantes
                  </div>
               </div>
               <Button
                  className="rounded-2xl h-12 md:h-14 px-8 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all bg-slate-900"
               >
                  <Plus className="mr-2 h-5 w-5" /> Novo Festival
               </Button>
            </header>

            {festivals.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                     <CalendarDays className="h-10 w-10 text-primary/30" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2 uppercase">Nenhum Festival Criado</h2>
                  <p className="text-slate-400 max-w-sm mb-8">Comece criando seu primeiro festival para gerenciar custos e pacotes.</p>
                  <Button variant="outline" className="rounded-xl font-bold uppercase text-xs">
                     Criar Festival Agora
                  </Button>
               </div>
            ) : (
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Sidebar List */}
                  <div className="lg:col-span-4 space-y-4">
                     <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                           placeholder="Buscar festival..."
                           className="w-full pl-11 h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-primary/20 text-sm font-medium"
                        />
                     </div>

                     {festivals.map(fest => (
                        <Card
                           key={fest.id}
                           onClick={() => setSelectedFestivalId(fest.id)}
                           className={`
                    cursor-pointer transition-all duration-300 rounded-[2rem] border-none shadow-sm ring-1 
                    ${selectedFestivalId === fest.id
                                 ? 'ring-primary bg-primary/5 shadow-xl shadow-primary/10'
                                 : 'ring-slate-100 bg-white hover:ring-primary/30 hover:shadow-lg focus-within:ring-primary'}
                  `}
                        >
                           <CardContent className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                 <Badge className={`
                        uppercase text-[9px] font-black tracking-widest border-none
                        ${fest.status === 'planejado' ? 'bg-amber-100 text-amber-600' :
                                       fest.status === 'em_andamento' ? 'bg-sky-100 text-sky-600' :
                                          fest.status === 'concluido' ? 'bg-emerald-100 text-emerald-600' :
                                             'bg-rose-100 text-rose-600'}
                      `}>
                                    {FESTIVAL_STATUS.find(s => s.value === fest.status)?.label}
                                 </Badge>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                          <MoreVertical className="h-4 w-4" />
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl">
                                       <DropdownMenuItem
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             setEditingFestival(fest);
                                             setIsEditFestivalOpen(true);
                                          }}
                                          className="text-xs font-bold uppercase gap-2 cursor-pointer"
                                       >
                                          <Edit className="h-3.5 w-3.5" /> Editar
                                       </DropdownMenuItem>
                                       <DropdownMenuItem className="text-xs font-bold uppercase gap-2 text-rose-500 hover:bg-rose-50">
                                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                                       </DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </div>
                              <h3 className="text-lg font-black uppercase text-slate-900 leading-tight mb-2">{fest.name}</h3>
                              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                 <CalendarDays className="h-3.5 w-3.5" />
                                 {fest.date_start ? format(new Date(fest.date_start), "dd 'de' MMMM", { locale: ptBR }) : 'Data a definir'}
                              </div>
                           </CardContent>
                        </Card>
                     ))}
                  </div>

                  {/* Content Area */}
                  <div className="lg:col-span-8">
                     {selectedFestival ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                           <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                              <div>
                                 <Badge variant="outline" className="mb-4 rounded-full px-4 border-primary/20 text-primary font-black uppercase text-[10px]">Portal do Evento</Badge>
                                 <h2 className="text-4xl font-black uppercase tracking-tight text-slate-900 mb-1 leading-none">{selectedFestival.name}</h2>
                                 <p className="text-slate-400 font-medium">{selectedFestival.description || 'Sem descrição.'}</p>
                              </div>
                           </div>

                           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                              <div className="relative mb-8">
                                 <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl h-14 w-full overflow-x-auto flex flex-nowrap justify-start lg:justify-center scrollbar-hide no-scrollbar touch-pan-x">
                                    <TabsTrigger value="overview" className="inline-flex shrink-0 rounded-xl h-11 font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg shadow-black/5 px-6">Início</TabsTrigger>
                                    <TabsTrigger value="participants" className="inline-flex shrink-0 rounded-xl h-11 font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg shadow-black/5 px-6">Participantes</TabsTrigger>
                                    <TabsTrigger value="packages" className="inline-flex shrink-0 rounded-xl h-11 font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg shadow-black/5 px-6">Pacotes</TabsTrigger>
                                    <TabsTrigger value="items" className="inline-flex shrink-0 rounded-xl h-11 font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg shadow-black/5 px-6">Catálogo</TabsTrigger>
                                    <TabsTrigger value="tickets" className="inline-flex shrink-0 rounded-xl h-11 font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg shadow-black/5 px-6">Ingressos</TabsTrigger>
                                    <TabsTrigger value="layout" className="inline-flex shrink-0 rounded-xl h-11 font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg shadow-black/5 px-6">Design</TabsTrigger>
                                    <TabsTrigger value="costs" className="inline-flex shrink-0 rounded-xl h-11 font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg shadow-black/5 px-6">Custos</TabsTrigger>
                                 </TabsList>
                                 <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50/50 to-transparent pointer-events-none lg:hidden" />
                              </div>

                              <TabsContent value="overview">
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <Card className="rounded-3xl md:rounded-[2rem] border-none shadow-xl shadow-rose-500/10 bg-gradient-to-br from-rose-500 to-rose-600 text-white overflow-hidden">
                                       <CardHeader className="pb-2 p-5 md:p-6">
                                          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/70">Custos Totais</CardTitle>
                                       </CardHeader>
                                       <CardContent className="p-5 md:p-6 md:pt-0">
                                          <div className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}
                                          </div>
                                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Despesas registradas</p>
                                       </CardContent>
                                    </Card>
                                    <Card className="rounded-3xl md:rounded-[2rem] border-none shadow-xl shadow-emerald-500/10 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden">
                                       <CardHeader className="pb-2 p-5 md:p-6">
                                          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/70">Receita Prevista</CardTitle>
                                       </CardHeader>
                                       <CardContent className="p-5 md:p-6 md:pt-0">
                                          <div className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
                                          </div>
                                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Total de inscrições</p>
                                       </CardContent>
                                    </Card>
                                    <Card className={`rounded-3xl md:rounded-[2rem] border-none shadow-xl overflow-hidden ${profitability >= 0 ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/10' : 'bg-gradient-to-br from-rose-600 to-rose-700 shadow-rose-600/10'} text-white`}>
                                       <CardHeader className="pb-2 p-5 md:p-6">
                                          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/70">Lucro Estimado</CardTitle>
                                       </CardHeader>
                                       <CardContent className="p-5 md:p-6 md:pt-0">
                                          <div className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profitability)}
                                          </div>
                                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Saldo do evento</p>
                                       </CardContent>
                                    </Card>
                                 </div>

                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                    <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white p-8">
                                       <header className="mb-6">
                                          <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-3">
                                             <CalendarDays className="h-6 w-6 text-rose-500" />
                                             Detalhamento do Evento
                                          </h3>
                                       </header>
                                       <div className="space-y-4">
                                          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                             <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                                <CalendarDays className="h-5 w-5 text-slate-400" />
                                             </div>
                                             <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data Realização</p>
                                                <p className="text-sm font-black text-slate-900">
                                                   {selectedFestival?.event_date
                                                      ? format(new Date(selectedFestival.event_date + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR })
                                                      : "Não definida"}
                                                </p>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                             <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                                <ScanLine className="h-5 w-5 text-slate-400" />
                                             </div>
                                             <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Horário Previsto</p>
                                                <p className="text-sm font-black text-slate-900">{selectedFestival?.event_time || "Não definido"}</p>
                                             </div>
                                          </div>
                                          <Button
                                             variant="outline"
                                             className="w-full rounded-2xl h-11 font-black uppercase text-[9px] tracking-widest border-slate-100 hover:bg-slate-50"
                                             onClick={() => {
                                                setEditingFestival(selectedFestival);
                                                setIsEditFestivalOpen(true);
                                             }}
                                          >
                                             <Edit className="h-3.5 w-3.5 mr-2" /> Editar Detalhes
                                          </Button>
                                       </div>
                                    </Card>

                                    <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white p-8">
                                       <header className="mb-6">
                                          <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-3">
                                             <Users className="h-6 w-6 text-indigo-500" />
                                             Ocupação do Teatro
                                          </h3>
                                       </header>
                                       <div className="space-y-6">
                                          <div>
                                             <div className="flex justify-between mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assentos Ocupados</span>
                                                <span className="text-sm font-black text-slate-900">
                                                   {selectedFestival.total_tickets_limit > 0
                                                      ? `${Math.round((ticketsCount / selectedFestival.total_tickets_limit) * 100)}%`
                                                      : 'Ilimitado'}
                                                </span>
                                             </div>
                                             <Progress
                                                value={selectedFestival.total_tickets_limit > 0 ? (ticketsCount / selectedFestival.total_tickets_limit) * 100 : 0}
                                                className="h-3 rounded-full bg-slate-100"
                                             />
                                          </div>
                                          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                                             <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Ingressos Gerados</p>
                                                <p className="text-xl font-black text-indigo-600">{ticketsCount}</p>
                                             </div>
                                             <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Vagas Restantes</p>
                                                <p className="text-xl font-black text-slate-900">
                                                   {selectedFestival.total_tickets_limit > 0
                                                      ? Math.max(0, selectedFestival.total_tickets_limit - ticketsCount)
                                                      : '∞'}
                                                </p>
                                             </div>
                                          </div>
                                       </div>
                                    </Card>
                                 </div>
                              </TabsContent>

                              <TabsContent value="participants">
                                 <ParticipantManagement
                                    festivalId={selectedFestivalId!}
                                    studioId={studioId!}
                                    capacityLimit={selectedFestival.total_tickets_limit}
                                    currentTickets={ticketsCount}
                                    packages={packages}
                                    isLoadingPackages={loadingPackages}
                                    enrollments={enrollments}
                                    isLoadingEnrollments={isLoadingEnrollments}
                                 />
                              </TabsContent>

                              <TabsContent value="packages">
                                 <PackageManagement
                                    festivalId={selectedFestivalId!}
                                    studioId={studioId!}
                                    packages={packages}
                                    isLoadingPackages={loadingPackages}
                                 />
                              </TabsContent>

                              <TabsContent value="items">
                                 <ItemManagement festivalId={selectedFestivalId!} studioId={studioId!} />
                              </TabsContent>

                              <TabsContent value="tickets">
                                 <TicketManagement
                                    festivalId={selectedFestivalId!}
                                    studioId={studioId!}
                                    capacityLimit={selectedFestival.total_tickets_limit}
                                    currentTickets={ticketsCount}
                                 />
                              </TabsContent>

                              <TabsContent value="choreography">
                                 <ChoreographyManagement
                                    festivalId={selectedFestivalId!}
                                    studioId={studioId!}
                                    enrollments={enrollments}
                                 />
                              </TabsContent>
                           </Tabs>
                        </div>
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center p-20 text-center border-none bg-white rounded-[3rem] shadow-sm ring-1 ring-slate-100">
                           <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                              <ChevronRight className="h-10 w-10 text-slate-200" />
                           </div>
                           <h2 className="text-2xl font-black uppercase text-slate-800 mb-2">Selecione um Festival</h2>
                           <p className="text-slate-400 font-medium">Clique em um festival à  esquerda para gerenciar seus detalhes específicos.</p>
                        </div>
                     )}
                  </div>
               </div>
            )}
         </div>

         <Dialog open={isEditFestivalOpen} onOpenChange={setIsEditFestivalOpen}>
            <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">Editar Festival</DialogTitle>
               </DialogHeader>
               <div className="space-y-5 pt-4">
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Nome do Evento</label>
                     <Input
                        placeholder="Ex: Espetáculo de Encerramento 2026"
                        className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                        value={editingFestival?.name}
                        onChange={(e) => setEditingFestival((prev: any) => ({ ...prev, name: e.target.value }))}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Data do Evento</label>
                        <Input
                           type="date"
                           className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                           value={editingFestival?.event_date}
                           onChange={(e) => setEditingFestival((prev: any) => ({ ...prev, event_date: e.target.value }))}
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Horário</label>
                        <Input
                           type="time"
                           className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                           value={editingFestival?.event_time}
                           onChange={(e) => setEditingFestival((prev: any) => ({ ...prev, event_time: e.target.value }))}
                        />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Status do Evento</label>
                        <Select
                           value={editingFestival?.status}
                           onValueChange={(val) => setEditingFestival((prev: any) => ({ ...prev, status: val }))}
                        >
                           <SelectTrigger className="rounded-2xl h-12 border-slate-100 bg-slate-50/50">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                              {FESTIVAL_STATUS.map(s => (
                                 <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block">Capacidade do Teatro</label>
                        <Input
                           type="number"
                           className="rounded-2xl h-12 border-slate-100 bg-slate-50/50"
                           value={editingFestival?.total_tickets_limit}
                           onChange={(e) => setEditingFestival((prev: any) => ({ ...prev, total_tickets_limit: Number(e.target.value) }))}
                        />
                     </div>
                  </div>
               </div>
               <DialogFooter className="pt-8">
                  <Button variant="ghost" onClick={() => setIsEditFestivalOpen(false)} className="font-bold uppercase text-[10px]">Cancelar</Button>
                  <Button
                     onClick={() => updateFestivalMutation.mutate(editingFestival)}
                     disabled={updateFestivalMutation.isPending || !editingFestival?.name}
                     className="rounded-2xl h-12 flex-1 bg-primary font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                  >
                     {updateFestivalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </AdminLayout>
   );
}
