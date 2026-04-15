import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CalendarCheck, Plus, Loader2, Search, User, UserPlus, Clock, Trash2,
  CheckCircle, XCircle, Link2, ThumbsUp, ThumbsDown, Ticket, Printer,
  MessageCircle, TrendingUp, DollarSign, Wallet, AlertCircle, Calendar, Hash,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { useStudioConfig } from "@/hooks/useStudioConfig";
import PixPayment from "@/components/PixPayment";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const DIAS_MAP: Record<string, string> = {
  seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  confirmado: { label: "Confirmado", color: "bg-emerald-100 text-emerald-800  " },
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-800  " },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800  " },
  concluido: { label: "Concluído", color: "bg-blue-100 text-blue-800  " },
};

export default function Bookings() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth();
  const { data: studio } = useStudioConfig(studioId);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  // Initialize filters from URL if present
  useEffect(() => {
    const s = searchParams.get("search");
    if (s) setSearch(s);
  }, [searchParams]);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterPago, setFilterPago] = useState("todos");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherData, setVoucherData] = useState<any>(null);
  const [tab, setTab] = useState("dia");
  const voucherRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    turma_id: "", aluno_id: "", nome_avulso: "", telefone_avulso: "", cpf_avulso: "",
    data: selectedDate, tipo: "avulso" as "matriculado" | "avulso",
    status: "confirmado", pago: false, valor: "", forma_pagamento: "", observacoes: "",
  });

  const resetForm = () => setForm({
    turma_id: "", aluno_id: "", nome_avulso: "", telefone_avulso: "", cpf_avulso: "",
    data: selectedDate, tipo: "avulso", status: "confirmado",
    pago: false, valor: "", forma_pagamento: "", observacoes: "",
  });

  // Queries
  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ["agendamentos", studioId, tab, selectedDate],
    enabled: !!studioId,
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          classes (
            id, nome, horario, 
            modalities ( id, nome, emoji, cor )
          ),
          students ( id, nome )
        `)
        .eq("studio_id", studioId)
        .order("data", { ascending: false });

      if (tab === "dia") {
        query = query.eq("data", selectedDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas-bookings", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data: regular, error: e1 } = await supabase
        .from("classes")
        .select("*, modalities ( id, nome, emoji, valor_base, valor_avulso )")
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .order("horario");
      
      const { data: avulsas, error: e2 } = await supabase
        .from("classes_avulsas")
        .select("*, modalities ( id, nome, emoji, valor_base, valor_avulso )")
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .order("data");
      
      if (e1) throw e1;
      if (e2) throw e2;

      return [
        ...(regular || []).map(c => ({ ...c, type: 'regular' })),
        ...(avulsas || []).map(c => ({ 
          ...c, 
          type: 'avulsa', 
          nome: `${c.nome} (AVULSA - ${new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR")})` 
        }))
      ];
    },
  });

  const { data: alunos = [] } = useQuery({
    queryKey: ["alunos-bookings", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, nome")
        .eq("studio_id", studioId)
        .eq("status", "ativo")
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (!studioId) return;
      const { error } = await supabase
        .from("bookings")
        .insert([{
          studio_id: studioId,
          class_id: values.turma_id,
          student_id: values.tipo === "matriculado" ? values.aluno_id : null,
          data: values.data,
          tipo: values.tipo,
          nome_avulso: values.tipo === "avulso" ? values.nome_avulso : null,
          telefone_avulso: values.tipo === "avulso" ? values.telefone_avulso : null,
          cpf_avulso: values.tipo === "avulso" ? values.cpf_avulso : null,
          status: values.status,
          pago: values.pago,
          valor: values.valor ? parseFloat(values.valor) : 0,
          forma_pagamento: values.forma_pagamento || null,
          observacoes: values.observacoes || null
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      setCreateOpen(false);
      resetForm();
      toast.success("Agendamento criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      toast.success("Status atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePagoMutation = useMutation({
    mutationFn: async ({ id, pago }: { id: string; pago: boolean }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ pago, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      toast.success("Pagamento atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      toast.success("Agendamento removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const status = action === "approve" ? "confirmado" : "cancelado";
      const { data, error } = await supabase
        .from("bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*, classes(*, modalities(*)), students(nome)")
        .single();
      
      if (error) throw error;

      if (action === "approve") {
        return {
          action: "approved",
          voucher: {
            nome: data.tipo === "avulso" ? data.nome_avulso : data.students?.nome,
            telefone: data.telefone_avulso,
            turma: data.classes?.nome,
            modalidade: `${data.classes?.modalities?.emoji || ""} ${data.classes?.modalities?.nome || ""}`,
            data: data.data,
            horario: data.classes?.horario?.slice(0, 5),
            valor: data.valor,
            pago: data.pago,
            forma_pagamento: data.forma_pagamento,
          }
        };
      }
      return { action: "rejected" };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      if (data?.action === "approved" && data?.voucher) {
        setVoucherData(data.voucher);
        setVoucherOpen(true);
        toast.success("Agendamento aprovado! Voucher gerado.");
      } else {
        toast.success("Agendamento processado.");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { requestDelete, ConfirmDialog } = useConfirmDelete();
  
  const handleTurmaChange = (turmaId: string) => {
    const t = turmas.find((x: any) => x.id === turmaId);
    setForm(prev => ({
      ...prev,
      turma_id: turmaId,
      valor: t?.modalities?.valor_avulso || t?.modalities?.valor_base || prev.valor
    }));
  };

  const handleCopyPublicLink = () => {
    if (!studio) {
      toast.error("Carregando configurações do estúdio...");
      return;
    }
    const identifier = studio.slug || studioId;
    if (!identifier) {
      toast.error("Erro ao identificar estúdio.");
      return;
    }
    const url = `${window.location.origin}/agendar?org=${identifier}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link de agendamento copiado!", {
        description: "Compartilhe este link com seus alunos."
      });
    }).catch(() => {
      toast.error("Erro ao copiar link");
    });
  };


  // Filter
  const filtered = agendamentos.filter((a: any) => {
    const nome = a.tipo === "avulso" ? a.nome_avulso : a.students?.nome;
    if (search && !(nome || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "todos" && a.status !== filterStatus) return false;
    if (filterTipo !== "todos" && a.tipo !== filterTipo) return false;
    if (filterPago === "pago" && !a.pago) return false;
    if (filterPago === "pendente" && a.pago) return false;
    return true;
  });

  // Stats
  const totalDia = agendamentos.length;
  const pagosCount = agendamentos.filter((a: any) => a.pago).length;
  const avulsos = agendamentos.filter((a: any) => a.tipo === "avulso").length;
  const pendentes = agendamentos.filter((a: any) => a.status === "pendente" && a.tipo === "avulso").length;

  const receitaEsperada = agendamentos.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
  const receitaColetada = agendamentos.filter(a => a.pago).reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
  const ticketsMedio = totalDia > 0 ? receitaEsperada / totalDia : 0;

  const handlePrintVoucher = () => {
    if (!voucherRef.current) return;
    const studioName = studio?.nome || "Estúdio";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Voucher - ${studioName}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f9fafb; }
        .voucher { border: 2px solid #2d7a4f; border-radius: 16px; padding: 32px; max-width: 480px; margin: auto; background: white; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { text-align: center; color: #2d7a4f; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px dashed #d1d5db; }
        .header h1 { margin: 0; font-size: 22px; }
        .header .studio { font-size: 18px; font-weight: 600; margin-bottom: 4px; color: #1f2937; }
        .header p { margin: 4px 0; color: #6b7280; font-size: 13px; }
        .info { display: flex; justify-content: space-between; margin: 10px 0; font-size: 15px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
        .info .label { color: #6b7280; }
        .info .value { font-weight: 600; color: #1f2937; text-align: right; }
        .instructions { background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin-top: 16px; font-size: 13px; color: #166534; }
        .instructions ul { margin: 6px 0 0; padding-left: 16px; }
        .instructions li { margin: 3px 0; }
        .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 11px; border-top: 2px dashed #d1d5db; padding-top: 16px; }
        .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .badge.pending { background: #fef3c7; color: #92400e; }
        @media print { body { padding: 0; background: white; } .voucher { box-shadow: none; border: 2px solid #2d7a4f; } }
      </style></head><body>
      ${voucherRef.current.innerHTML}
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const formatDataVoucher = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  };

  const getFormaPagamentoLabel = (forma: string, pago: boolean) => {
    if (pago) return "Pago ✅";
    const map: Record<string, string> = {
      pix: "PIX (no local)", dinheiro: "Dinheiro (no local)", cartao: "Cartão (no local)",
      cartao_online: "Cartão Online", pix_online: "Boleto Online",
      cartao_credito: "Cartão Crédito", cartao_debito: "Cartão Débito",
    };
    return map[forma] || forma || "A combinar";
  };

  const handleWhatsAppVoucher = () => {
    if (!voucherData) return;
    const studioName = studio?.nome || "Estúdio";
    const dataFormatada = formatDataVoucher(voucherData.data);
    const pagLabel = getFormaPagamentoLabel(voucherData.forma_pagamento, voucherData.pago);

    let msg = `------------------------------\n`;
    msg += `* AGENDAMENTO CONFIRMADO *\n`;
    msg += `${studioName}\n`;
    msg += `------------------------------\n\n`;
    msg += `Ola, *${voucherData.nome}*!\n`;
    msg += `Sua aula esta confirmada. Confira os detalhes:\n\n`;
    msg += `*Modalidade:* ${voucherData.modalidade}\n`;
    msg += `*Turma:* ${voucherData.turma}\n`;
    msg += `*Data:* ${dataFormatada}\n`;
    msg += `*Horario:* ${voucherData.horario}\n`;
    msg += `*Valor:* R$ ${Number(voucherData.valor || 0).toFixed(2)}\n`;
    msg += `*Pagamento:* ${pagLabel}\n`;

    if (studio?.endereco) {
      msg += `\n*Endereco:*\n${studio.endereco}\n`;
    }

    msg += `\n------------------------------\n`;
    msg += `*Instrucoes:*\n`;
    msg += `- Chegue com 10 min de antecedencia\n`;
    msg += `- Use roupas confortaveis\n`;
    msg += `- Traga uma garrafa de agua\n`;
    msg += `- Apresente este voucher na recepcao\n`;
    msg += `------------------------------\n\n`;
    msg += `Estamos te esperando!\n`;

    if (studio?.telefone) {
      msg += `Duvidas: ${studio.telefone}`;
    }

    const encoded = encodeURIComponent(msg);
    const rawPhone = (voucherData.telefone || "").replace(/\D/g, "");
    const phone = rawPhone.startsWith("55") ? rawPhone : rawPhone ? `55${rawPhone}` : "";
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  };

  const showVoucherForBooking = (a: any) => {
    setVoucherData({
      nome: a.tipo === "avulso" ? a.nome_avulso : a.students?.nome,
      email: a.email_avulso || "",
      telefone: a.telefone_avulso || "",
      turma: a.classes?.nome,
      modalidade: `${a.classes?.modalities?.emoji || ""} ${a.classes?.modalities?.nome || ""}`,
      data: a.data,
      horario: a.classes?.horario?.slice(0, 5),
      valor: a.valor,
      pago: a.pago,
      forma_pagamento: a.forma_pagamento,
    });
    setVoucherOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase text-slate-900 leading-none">Agendamentos</h1>
            <p className="text-slate-400 mt-1 font-bold uppercase tracking-widest text-[8px] flex items-center gap-2">BOOKING CONTROL <span className="h-1 w-1 rounded-full bg-slate-200" /> V7.5.2 COCKPIT</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleCopyPublicLink}
              className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest gap-2 bg-white border-slate-200 text-slate-600 shadow-sm"
            >
              <Link2 className="h-4 w-4" /> Link Público
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest gap-2 bg-primary text-white shadow-sm ring-1 ring-primary/20">
              <Plus className="h-4 w-4" /> Novo Agendamento
            </Button>
          </div>
        </div>

        {/* Stats Cockpit */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100 p-4">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                   <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <h3 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">{formatCurrency(receitaEsperada)}</h3>
                   <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">Receita Total</p>
                </div>
             </div>
             <div className="mt-3 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(receitaColetada / (receitaEsperada || 1)) * 100}%` }} />
             </div>
          </Card>

          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100 p-4">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                   <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                   <h3 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">{formatCurrency(receitaColetada)}</h3>
                   <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">Coletado</p>
                </div>
             </div>
             <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-tight mt-2 flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5" /> Saldo Pronto</p>
          </Card>

          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100 p-4">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                   <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                   <h3 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">{pendentes}</h3>
                   <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">Pendentes</p>
                </div>
             </div>
             <p className="text-[8px] font-bold text-amber-500 uppercase tracking-tight mt-2 flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Aguardando</p>
          </Card>

          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100 p-4">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                   <Hash className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                   <h3 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">{formatCurrency(ticketsMedio)}</h3>
                   <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">Ticket Médio</p>
                </div>
             </div>
             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-2 flex items-center gap-1"><Ticket className="h-2.5 w-2.5" /> {totalDia} MARCAÇÕES</p>
          </Card>
        </div>

        {/* Control Center */}
        <div className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 backdrop-blur-sm">
           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <Tabs value={tab} onValueChange={setTab} className="w-fit">
                 <TabsList className="bg-white p-1 rounded-xl h-11 border border-slate-100 shadow-sm">
                    <TabsTrigger value="dia" className="rounded-lg px-6 font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Foco Diário</TabsTrigger>
                    <TabsTrigger value="todos" className="rounded-lg px-6 font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Visão Geral</TabsTrigger>
                 </TabsList>
              </Tabs>

              <div className="flex flex-wrap items-center gap-3">
                 {tab === "dia" && (
                  <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2 hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
                     <Calendar className="h-4 w-4 text-primary" />
                     <Input type="date" className="w-auto h-7 bg-transparent border-none text-slate-900 font-bold uppercase text-[10px] p-0 focus-visible:ring-0" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  </div>
                 )}
                 
                 <div className="relative group flex-1 sm:flex-none sm:min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input placeholder="Localizar agendamento..." value={search} onChange={(e) => setSearch(e.target.value)} 
                      className="pl-9 h-11 bg-white border-slate-100 text-[10px] font-bold uppercase tracking-tight placeholder:text-slate-400 rounded-xl focus:ring-primary/10 shadow-sm" />
                 </div>
              </div>
           </div>

           <div className="flex gap-3 mt-6 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-slate-100 text-slate-600 rounded-lg font-bold uppercase text-[9px] tracking-widest shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 font-bold uppercase text-[9px] tracking-widest">
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-slate-100 text-slate-600 rounded-lg font-bold uppercase text-[9px] tracking-widest shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 font-bold uppercase text-[9px] tracking-widest">
                  <SelectItem value="todos">Todos Tipos</SelectItem>
                  <SelectItem value="matriculado">Matriculado</SelectItem>
                  <SelectItem value="avulso">Avulso</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPago} onValueChange={setFilterPago}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-slate-100 text-slate-600 rounded-lg font-bold uppercase text-[9px] tracking-widest shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 font-bold uppercase text-[9px] tracking-widest">
                  <SelectItem value="todos">Pagamento</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Não Pago</SelectItem>
                </SelectContent>
              </Select>
           </div>
        </div>

        <div className="mt-2">
           {isLoading ? (
              <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/30" /></div>
           ) : filtered.length === 0 ? (
              <Card className="border-none shadow-sm rounded-xl ring-1 ring-slate-100 p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                Nenhum registro encontrado para este período
              </Card>
           ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                 {filtered.map((a: any) => {
                    const nome = a.tipo === "avulso" ? a.nome_avulso : a.students?.nome;
                    const turma = a.classes;
                    const statusCfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendente;
                    const isAvulso = a.tipo === "avulso";
                    const isPendingApproval = a.status === "pendente" && isAvulso;

                    return (
                       <Card key={a.id} className={cn(
                          "transition-all group relative overflow-hidden border-none shadow-sm ring-1 ring-slate-100 hover:shadow-md",
                          isPendingApproval && "ring-amber-100 bg-amber-50/20"
                       )}>
                          <div className={cn(
                            "absolute top-0 left-0 w-full h-1",
                            isAvulso ? "bg-orange-500" : "bg-sky-500"
                          )} />

                          <div className="p-4 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                               <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform",
                                    isAvulso ? "bg-orange-50 text-orange-600" : "bg-sky-50 text-sky-600"
                                  )}>
                                     {isAvulso ? <UserPlus className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                  </div>
                                  <div>
                                     <p className="font-bold text-slate-900 uppercase tracking-tight text-sm leading-none truncate max-w-[120px]">{nome || "Vazio"}</p>
                                     {isAvulso && a.cpf_avulso && (
                                        <p className="text-[9px] text-slate-400 font-medium mt-1">CPF: {a.cpf_avulso}</p>
                                     )}
                                     <Badge variant="outline" className={cn(
                                       "text-[7px] font-bold uppercase tracking-widest h-3.5 px-1.5 border-none mt-1.5",
                                       isAvulso ? "bg-orange-100 text-orange-600" : "bg-sky-100 text-sky-600"
                                     )}>
                                        {isAvulso ? "Avulso" : "Matriculado"}
                                     </Badge>
                                  </div>
                               </div>

                               <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity translate-y-0 lg:translate-y-1 lg:group-hover:translate-y-0 transition-transform">
                                  {isPendingApproval && (
                                     <div className="flex bg-slate-900 rounded-lg overflow-hidden shadow-lg scale-90">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-emerald-500 hover:bg-white/10 rounded-none border-r border-white/10 p-0" 
                                          onClick={() => approveMutation.mutate({ id: a.id, action: "approve" })} disabled={approveMutation.isPending}>
                                           <ThumbsUp className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-rose-500 hover:bg-white/10 rounded-none p-0" 
                                          onClick={() => approveMutation.mutate({ id: a.id, action: "reject" })} disabled={approveMutation.isPending}>
                                           <ThumbsDown className="h-3 w-3" />
                                        </Button>
                                     </div>
                                  )}
                                  {a.status === "confirmado" && (
                                     <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-white border-slate-100 text-primary shadow-sm"
                                       onClick={() => showVoucherForBooking(a)}>
                                        <Ticket className="h-3.5 w-3.5" />
                                     </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50" 
                                    onClick={() => requestDelete(a.id, nome || "agendamento", () => deleteMutation.mutate(a.id))}>
                                     <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-50">
                               <div className="space-y-1">
                                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Turma & Horário</p>
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                     <span className="text-xs">{turma?.modalities?.emoji}</span>
                                     <span className="font-bold text-slate-700 uppercase tracking-tighter text-[11px] truncate">{turma?.nome}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-slate-500">
                                     <Clock className="h-2.5 w-2.5" />
                                     <span className="text-[10px] font-bold leading-none">{turma?.horario?.slice(0, 5)}</span>
                                  </div>
                               </div>
                               <div className="space-y-1 text-right">
                                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Status & Data</p>
                                  <Badge className={cn("font-bold text-[8px] uppercase tracking-widest border-none px-1.5 h-4 shadow-none leading-none", statusCfg.color)}>
                                     {statusCfg.label}
                                  </Badge>
                                  <p className="text-[9px] font-bold text-slate-400 block mt-0.5">{a.data?.split("-").reverse().join("/")}</p>
                               </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                               <div className="flex items-center gap-3">
                                  <div className="space-y-0.5">
                                     <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Valor</p>
                                     <div className="flex items-baseline gap-1">
                                        <span className="text-xs font-bold text-slate-900 leading-none">{formatCurrency(a.valor || 0)}</span>
                                        <span className="text-[8px] font-bold uppercase text-slate-300 italic">{a.forma_pagamento || "—"}</span>
                                     </div>
                                  </div>
                                  <button onClick={() => togglePagoMutation.mutate({ id: a.id, pago: !a.pago })} 
                                    className={cn(
                                       "h-7 w-7 rounded-lg flex items-center justify-center transition-all shadow-sm ring-1",
                                       a.pago ? "bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-600 hover:text-white" : "bg-slate-50 text-slate-300 ring-slate-100 hover:bg-rose-50 hover:text-rose-500 hover:ring-rose-100"
                                    )}>
                                     {a.pago ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                  </button>
                               </div>

                               <Select value={a.status} onValueChange={(v) => updateStatusMutation.mutate({ id: a.id, status: v })}>
                                  <SelectTrigger className="h-7 w-[90px] rounded-lg bg-slate-50/50 border-none font-bold uppercase text-[8px] tracking-tight shadow-none focus:ring-1 focus:ring-primary/10 transition-all"><SelectValue /></SelectTrigger>
                                  <SelectContent className="rounded-xl border-slate-100 font-bold uppercase text-[8px] tracking-tight">
                                     <SelectItem value="confirmado">Confirmar</SelectItem>
                                     <SelectItem value="pendente">Espera</SelectItem>
                                     <SelectItem value="cancelado">Cancelar</SelectItem>
                                     <SelectItem value="concluido">Finalizar</SelectItem>
                                  </SelectContent>
                               </Select>
                            </div>
                          </div>
                       </Card>
                    );
                 })}
              </div>
           )}
        </div>

        {/* Create Dialog (Unchanged structure, improved UI maybe later) */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Tipo de Agendamento</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={form.tipo === "matriculado" ? "default" : "outline"}
                    className={`flex-1 gap-2 ${form.tipo === "matriculado" ? "bg-sky-600 hover:bg-sky-700" : ""}`}
                    onClick={() => setForm({ ...form, tipo: "matriculado", nome_avulso: "", telefone_avulso: "" })}>
                    <User className="h-4 w-4" /> Matriculado
                  </Button>
                  <Button type="button" variant={form.tipo === "avulso" ? "default" : "outline"}
                    className={`flex-1 gap-2 ${form.tipo === "avulso" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                    onClick={() => setForm({ ...form, tipo: "avulso", aluno_id: "" })}>
                    <UserPlus className="h-4 w-4" /> Avulso
                  </Button>
                </div>
              </div>

              {form.tipo === "matriculado" ? (
                <div className="space-y-2">
                  <Label>Aluno *</Label>
                  <Select value={form.aluno_id} onValueChange={(v) => setForm({ ...form, aluno_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                    <SelectContent>
                      {alunos.map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={form.nome_avulso} onChange={(e) => setForm({ ...form, nome_avulso: e.target.value })} required placeholder="Nome do cliente" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={form.telefone_avulso} onChange={(e) => setForm({ ...form, telefone_avulso: e.target.value })} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input value={form.cpf_avulso} onChange={(e) => setForm({ ...form, cpf_avulso: e.target.value })} placeholder="000.000.000-00" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Turma *</Label>
                <Select value={form.turma_id} onValueChange={handleTurmaChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                  <SelectContent>
                    {turmas.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.modalities?.emoji} {t.nome} — {t.horario?.slice(0, 5)} ({(t.dias_semana || []).map((d: string) => DIAS_MAP[d]).join(", ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
               </div>

              {form.forma_pagamento === "pix" && !form.pago && form.valor && (
                <PixPayment
                  valor={parseFloat(form.valor) || undefined}
                  descricao="Agendamento"
                  txid={`AGD${Date.now()}`}
                />
              )}

              <div className="flex items-center gap-2">
                <Switch checked={form.pago} onCheckedChange={(v) => setForm({ ...form, pago: v })} />
                <Label>Já pago</Label>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas opcionais..." rows={2} />
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Agendamento
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Voucher Dialog */}
        <Dialog open={voucherOpen} onOpenChange={setVoucherOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Voucher de Agendamento
              </DialogTitle>
            </DialogHeader>

            <div ref={voucherRef}>
              <div className="voucher border-2 border-primary/30 rounded-xl p-6 space-y-4">
                <div className="text-center border-b border-dashed border-border pb-4">
                  <p className="font-semibold text-foreground text-lg">{studio?.nome || "Estúdio"}</p>
                  <h2 className="text-xl font-bold text-primary mt-1">✅ Agendamento Confirmado</h2>
                  <p className="text-xs text-muted-foreground mt-1">Apresente este voucher na recepção</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">👤 Nome:</span>
                    <span className="font-medium text-foreground">{voucherData?.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🏋️ Modalidade:</span>
                    <span className="font-medium text-foreground">{voucherData?.modalidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">📋 Turma:</span>
                    <span className="font-medium text-foreground">{voucherData?.turma}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">📅 Data:</span>
                    <span className="font-medium text-foreground">
                      {voucherData?.data && formatDataVoucher(voucherData.data)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">⏰ Horário:</span>
                    <span className="font-medium text-foreground">{voucherData?.horario}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">💰 Valor:</span>
                    <span className="font-medium text-foreground">R$ {Number(voucherData?.valor || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">💳 Pagamento:</span>
                    <span className="font-medium text-foreground">
                      {getFormaPagamentoLabel(voucherData?.forma_pagamento, voucherData?.pago)}
                    </span>
                  </div>
                </div>

                <div className="instructions bg-primary/5 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-bold text-primary">Instruções:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Chegue com 10 min de antecedência</li>
                    <li>Use roupas confortáveis</li>
                    <li>Traga uma garrafa de água</li>
                  </ul>
                </div>

                <div className="text-center pt-4 border-t border-dashed border-border">
                  <p className="text-[10px] text-muted-foreground">Gerado em {new Date().toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={handlePrintVoucher} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button onClick={handleWhatsAppVoucher} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDialog />
      </div>
    </AdminLayout>
  );
}
