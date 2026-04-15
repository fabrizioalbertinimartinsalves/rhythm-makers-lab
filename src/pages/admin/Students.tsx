import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Search, MoreHorizontal, Edit, Trash2, Camera, GraduationCap, Loader2, 
  ChevronRight, ChevronLeft, Check, UserPlus, UserMinus, BookOpen, CreditCard, Eye, 
  FileText, Download, ChevronDown, Phone, Mail, Calendar, Activity, 
  AlertTriangle, ShieldCheck, Wallet, MessageCircle, Users, TrendingDown, 
  CheckCircle2, ShoppingBag, Clock, FileHeart, History, Navigation, HeartPulse, Save, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { sendSystemEmail } from "@/lib/notifications";
import { toast } from "sonner";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { normalizeCpf, formatCpf, maskCPF } from "@/lib/utils";
import ImportStudentsDialog from "@/components/ImportStudentsDialog";
import { useOrgLimits } from "@/hooks/useOrgLimits";
import { usePostSaleAutomation } from "@/hooks/usePostSaleAutomation";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";
import { uploadFile } from "@/utils/upload";

type StatusAluno = "ativo" | "inativo" | "suspenso" | "interessado" | "pendente";

const STEPS = [
  { label: "Dados Pessoais", icon: UserPlus, description: "Informações do aluno e responsáveis" },
  { label: "Turma", icon: BookOpen, description: "Selecione as turmas e planos" },
  { label: "Plano", icon: CreditCard, description: "Configuração de pagamento" },
  { label: "Pagamento", icon: Wallet, description: "Resumo financeiro" },
  { label: "Resumo", icon: Check, description: "Finalização e boas-vindas" },
];

function StatCard({ label, value, icon: Icon, colorClass }: { label: string; value: string | number; icon: any; colorClass: string }) {
  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Students() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { studioId, canAddAluno, limiteAlunos, currentAlunos } = useAuth() as any;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [viewingDetails, setViewingDetails] = useState<any | null>(null);
  
  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardMode, setWizardMode] = useState<"new" | "existing">("new");
  const [wizardSaving, setWizardSaving] = useState(false);
  const [cpfConflict, setCpfConflict] = useState<any>(null);
  const [showCpfConflictDialog, setShowCpfConflictDialog] = useState(false);
  const [cpfConflictResolved, setCpfConflictResolved] = useState<"update" | "skip" | null>(null);
  const [pendingPreMatriculaId, setPendingPreMatriculaId] = useState<string | null>(null);
  const [pendingTurmaPreferida, setPendingTurmaPreferida] = useState<string | null>(null);
  const [leadOnly, setLeadOnly] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [showLeadSelect, setShowLeadSelect] = useState(false);
  const [cobrarTaxa, setCobrarTaxa] = useState(false);
  const [sendInvite, setSendInvite] = useState(true);

  const [form, setForm] = useState({
    nome: "", cpf: "", telefone: "", email: "", data_nascimento: "",
    status: "ativo" as StatusAluno, observacoes_medicas: "", foto_url: "",
    responsavel_financeiro_nome: "", responsavel_financeiro_cpf: "",
    responsavel_financeiro_telefone: "", responsavel_financeiro_email: "",
    responsavel_legal_nome: "", responsavel_legal_telefone: "", responsavel_legal_parentesco: "",
    responsavel_legal_cpf: "", responsavel_legal_email: "", responsavel_legal_cep: "",
    responsavel_legal_logradouro: "", responsavel_legal_numero: "", responsavel_legal_complemento: "",
    responsavel_legal_bairro: "", responsavel_legal_cidade: "", responsavel_legal_estado: "",
    rg: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
    profissao: "", como_conheceu: "", emergencia_contato: "", emergencia_telefone: "",
    username: "",
    // Flags de conveniência para o Wizard
    legalIsStudent: true,
    financialIsStudent: true,
    financialIsLegal: true,
    due_day: 10,
  });

  const [matriculaForm, setMatriculaForm] = useState({
    aluno_id: "", 
    turma_id: "", 
    plano_id: "", 
    valor_mensal: 0, 
    vencimento: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0], // Próximo mês
    forma_pagamento: "pix",
    partner_id: "",
    idempotencyKey: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
  });

  const resetForm = () => {
    setForm({ 
      nome: "", cpf: "", telefone: "", email: "", data_nascimento: "", status: "ativo", 
      observacoes_medicas: "", foto_url: "", 
      responsavel_financeiro_nome: "", responsavel_financeiro_cpf: "", responsavel_financeiro_telefone: "", responsavel_financeiro_email: "", 
      responsavel_legal_nome: "", responsavel_legal_telefone: "", responsavel_legal_parentesco: "", 
      responsavel_legal_cpf: "", responsavel_legal_email: "", responsavel_legal_cep: "",
      responsavel_legal_logradouro: "", responsavel_legal_numero: "", responsavel_legal_complemento: "",
      responsavel_legal_bairro: "", responsavel_legal_cidade: "", responsavel_legal_estado: "",
      rg: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
      profissao: "", como_conheceu: "", emergencia_contato: "", emergencia_telefone: "",
      username: "",
      legalIsStudent: true,
      financialIsStudent: true,
      financialIsLegal: true,
      due_day: 10,
    });
    setEditingStudent(null); setSelectedFile(null); setPreviewUrl(null);
    setMatriculaForm({
      aluno_id: "", 
      turma_id: "", 
      plano_id: "", 
      valor_mensal: 0, 
      vencimento: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      forma_pagamento: "pix",
      partner_id: "",
      idempotencyKey: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    });
    setCheckoutItems([]);
  };

  useEffect(() => {
    const state = location.state as any;
    if (state?.fromPreMatricula && state?.preMatriculaData) {
      const pm = state.preMatriculaData;
      setForm({
        nome: pm.nome || "",
        cpf: pm.cpf || "",
        telefone: pm.telefone || "",
        email: pm.email || "",
        data_nascimento: pm.data_nascimento || "",
        status: "ativo" as StatusAluno,
        observacoes_medicas: pm.observacoes_medicas || "",
        foto_url: "",
        responsavel_financeiro_nome: "", responsavel_financeiro_cpf: "",
        responsavel_financeiro_telefone: "", responsavel_financeiro_email: "",
        responsavel_legal_nome: pm.nome || "", responsavel_legal_telefone: pm.telefone || "", responsavel_legal_parentesco: "Próprio",
        responsavel_legal_cpf: pm.cpf || "", responsavel_legal_email: pm.email || "", responsavel_legal_cep: "",
        responsavel_legal_logradouro: "", responsavel_legal_numero: "", responsavel_legal_complemento: "",
        responsavel_legal_bairro: "", responsavel_legal_cidade: "", responsavel_legal_estado: "",
        rg: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
        profissao: "", como_conheceu: "", emergencia_contato: "", emergencia_telefone: "",
        username: "",
        legalIsStudent: true,
        financialIsStudent: true,
        financialIsLegal: true,
      });
      setPendingPreMatriculaId(state.preMatriculaId || null);
      setPendingTurmaPreferida(pm.turma_preferida || null);
      setWizardMode("new");
      setWizardStep(0);
      setWizardOpen(true);
      window.history.replaceState({}, document.title);
    } else if (state?.fromLead && state?.leadData) {
      const lead = state.leadData;
      setForm(prev => ({
        ...prev,
        nome: lead.nome || "",
        email: lead.email || "",
        telefone: lead.telefone || "",
        responsavel_legal_nome: lead.nome || "",
        responsavel_legal_telefone: lead.telefone || "",
        responsavel_legal_email: lead.email || "",
        legalIsStudent: true,
        financialIsStudent: true,
      }));
      if (lead.turma) {
        setPendingTurmaPreferida(lead.turma);
      }
      setWizardMode("new");
      setWizardStep(0);
      setWizardOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ["admin", "students", "list", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*").eq("studio_id", studioId).order("nome");
      return data || [];
    },
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["admin", "classes", "regulares-minimal", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*, modalities(id, nome, emoji, cor)").eq("studio_id", studioId).eq("ativa", true);
      return (data || []).map(t => ({ ...t, modalidade_id: t.modality_id, modalidades: t.modalities }));
    },
  });

  useEffect(() => {
    if (pendingTurmaPreferida && turmas.length > 0) {
      const matchedTurma = turmas.find((t: any) => t.nome === pendingTurmaPreferida);
      if (matchedTurma) setMatriculaForm((f) => ({ ...f, turma_id: matchedTurma.id }));
      setPendingTurmaPreferida(null);
    }
  }, [pendingTurmaPreferida, turmas]);

  const { data: planos = [] } = useQuery({
    queryKey: ["admin", "plans", "list-minimal", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("*").eq("studio_id", studioId).eq("ativo", true);
      return data || [];
    },
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["admin", "partners", "list-actives", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("*").eq("studio_id", studioId).eq("is_active", true);
      return data || [];
    },
  });

  const { data: lastEvolucoes = {} } = useQuery({
    queryKey: ["admin", "health", "last-evolutions", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase.from("medical_records").select("student_id, description, created_at").eq("studio_id", studioId).order("created_at", { ascending: false });
      const latest: Record<string, any> = {};
      (data || []).forEach(ev => { if (!latest[ev.student_id]) latest[ev.student_id] = ev; });
      return latest;
    },
  });

  const { data: inscricoesCounts = {} } = useQuery({
    queryKey: ["admin", "schedule", "inscricoes-count", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("student_id").eq("studio_id", studioId).eq("ativa", true);
      const counts: Record<string, number> = {};
      (data || []).forEach(ins => { counts[ins.student_id] = (counts[ins.student_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: preMatriculas = [] } = useQuery({
    queryKey: ["admin", "leads", "pre-matriculas", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase.from("pre_matriculas").select("*, modalities(nome, id)").eq("studio_id", studioId).order("created_at", { ascending: false });
      return (data || []).map(pm => ({ ...pm, modalidade_id: pm.modality_id }));
    },
  });

  const getLastEvolucao = (alunoId: string) => lastEvolucoes[alunoId];
  const getAlunoInscricoesCount = (alunoId: string) => inscricoesCounts[alunoId] || 0;


  const closeWizard = () => { setWizardOpen(false); setWizardStep(0); setWizardMode("new"); resetForm(); };

  const { data: studioConfig = {} } = useQuery({
    queryKey: ["studio-configs", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase.from("studio_configs").select("config").eq("studio_id", studioId).single();
      return data?.config || {};
    },
  });
  const taxaMatriculaValue = Number((studioConfig as any)?.estudio?.taxa_matricula || 0);

  const uploadPhoto = async (file: File, alunoId: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `studios/${studioId}/alunos/${alunoId}/avatar.${ext}`;
    return await uploadFile(file, path);
  };

  const buildAlunoPayload = (source: any, fotoUrl?: string | null) => ({
    nome: source.nome.trim(),
    cpf: normalizeCpf(source.cpf) || null,
    telefone: source.telefone || null,
    email: source.email || null,
    data_nascimento: source.data_nascimento || null,
    status: source.status,
    observacoes_medicas: source.observacoes_medicas || null,
    foto_url: fotoUrl === undefined ? undefined : (fotoUrl || null),
    responsavel_financeiro_nome: source.responsavel_financeiro_nome || null,
    responsavel_financeiro_cpf: normalizeCpf(source.responsavel_financeiro_cpf) || null,
    responsavel_financeiro_telefone: source.responsavel_financeiro_telefone || null,
    responsavel_financeiro_email: source.responsavel_financeiro_email || null,
    responsavel_legal_nome: source.responsavel_legal_nome || null,
    responsavel_legal_telefone: source.responsavel_legal_telefone || null,
    responsavel_legal_parentesco: source.responsavel_legal_parentesco || null,
    responsavel_legal_cpf: normalizeCpf(source.responsavel_legal_cpf) || null,
    responsavel_legal_email: source.responsavel_legal_email || null,
    responsavel_legal_cep: source.responsavel_legal_cep || null,
    responsavel_legal_logradouro: source.responsavel_legal_logradouro || null,
    responsavel_legal_numero: source.responsavel_legal_numero || null,
    responsavel_legal_complemento: source.responsavel_legal_complemento || null,
    responsavel_legal_bairro: source.responsavel_legal_bairro || null,
    responsavel_legal_cidade: source.responsavel_legal_cidade || null,
    responsavel_legal_estado: source.responsavel_legal_estado || null,
    rg: source.rg || null,
    cep: source.cep || null,
    logradouro: source.logradouro || null,
    numero: source.numero || null,
    complemento: source.complemento || null,
    bairro: source.bairro || null,
    cidade: source.cidade || null,
    estado: source.estado || null,
    profissao: source.profissao || null,
    como_conheceu: source.como_conheceu || null,
    emergencia_contato: source.emergencia_contato || null,
    emergencia_telefone: source.emergencia_telefone || null,
  });

  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();
  
  // Stripe integration check removed in favor of unified Mercado Pago approach



  const upsertMutation = useMutation({
    mutationFn: async (values: any) => {
      let foto_url = values.foto_url;
      const alunoId = values.id || (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
      if (selectedFile) {
        setUploading(true);
        foto_url = await uploadPhoto(selectedFile, alunoId);
      }
      const payload = buildAlunoPayload(values, foto_url);
      if (values.id) {
        await supabase.from("students").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", values.id).eq("studio_id", studioId);
      } else {
        if (!canAddAluno) throw new Error(`Limite atingido.`);
        await supabase.from("students").insert({ id: alunoId, studio_id: studioId, ...payload });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "students", "list"] }); setDialogOpen(false); resetForm(); toast.success("Sucesso!"); },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setUploading(false),
  });

  const { requestDelete: requestDeleteStudent, ConfirmDialog: ConfirmDeleteStudentDialog } = useConfirmDelete({ childChecks: [{ table: "enrollments", column: "student_id", label: "matrículas" }] });
  const { requestDelete: requestUnenroll, ConfirmDialog: ConfirmUnenrollDialog } = useConfirmDelete();

  const confirmDelete = (s: any) => {
    requestDeleteStudent(s.id, s.nome, async () => {
      await supabase.from("students").delete().eq("id", s.id).eq("studio_id", studioId);
      queryClient.invalidateQueries({ queryKey: ["admin", "students", "list"] });
    });
  };

  const openEdit = (s: any) => {
    setEditingStudent(s);
    setForm({
      nome: s.nome, cpf: s.cpf || "", telefone: s.telefone || "", email: s.email || "",
      data_nascimento: s.data_nascimento || "", status: s.status, observacoes_medicas: s.observacoes_medicas || "",
      foto_url: s.foto_url || "",
      responsavel_financeiro_nome: s.responsavel_financeiro_nome || "", responsavel_financeiro_cpf: s.responsavel_financeiro_cpf || "",
      responsavel_financeiro_telefone: s.responsavel_financeiro_telefone || "", responsavel_financeiro_email: s.responsavel_financeiro_email || "",
      responsavel_legal_nome: s.responsavel_legal_nome || "", responsavel_legal_telefone: s.responsavel_legal_telefone || "",
      responsavel_legal_parentesco: s.responsavel_legal_parentesco || "",
      responsavel_legal_cpf: s.responsavel_legal_cpf || "",
      responsavel_legal_email: s.responsavel_legal_email || "",
      responsavel_legal_cep: s.responsavel_legal_cep || "",
      responsavel_legal_logradouro: s.responsavel_legal_logradouro || "",
      responsavel_legal_numero: s.responsavel_legal_numero || "",
      responsavel_legal_complemento: s.responsavel_legal_complemento || "",
      responsavel_legal_bairro: s.responsavel_legal_bairro || "",
      responsavel_legal_cidade: s.responsavel_legal_cidade || "",
      responsavel_legal_estado: s.responsavel_legal_estado || "",
      rg: s.rg || "",
      cep: s.cep || "",
      logradouro: s.logradouro || "",
      numero: s.numero || "",
      complemento: s.complemento || "",
      bairro: s.bairro || "",
      cidade: s.cidade || "",
      estado: s.estado || "",
      profissao: s.profissao || "",
      como_conheceu: s.como_conheceu || "",
      emergencia_contato: s.emergencia_contato || "",
      emergencia_telefone: s.emergencia_telefone || "",
      username: "",
      legalIsStudent: s.responsavel_legal_nome === s.nome,
      financialIsStudent: s.responsavel_financeiro_nome === s.nome,
      financialIsLegal: s.responsavel_financeiro_nome === s.responsavel_legal_nome && s.responsavel_financeiro_nome !== s.nome,
    });
    setPreviewUrl(s.foto_url || null);
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const { projectInstallments, assembleContract, calculateEndDate, sendAutomatedWhatsApp } = usePostSaleAutomation();

  const selectedTurma = turmas.find((t: any) => t.id === matriculaForm.turma_id);

  const wizardMutation = useMutation({
    mutationFn: async () => {
      setWizardSaving(true);
      
      let fUrl = previewUrl;
      const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const tempIdForPhoto = wizardMode === "new" ? generateId() : (matriculaForm.aluno_id || generateId());
      
      if (selectedFile) {
        fUrl = await uploadPhoto(selectedFile, tempIdForPhoto);
      }

      const enrollmentsData = leadOnly ? [] : checkoutItems.map(item => ({
        class_id: item.turma_id,
        plan_id: item.plano_id,
        valor: item.valor_final
      }));

      // 1. Chamar RPC Atômica para todo o processo de banco
      const { data, error } = await supabase.rpc('process_student_enrollment', {
        p_studio_id: studioId,
        p_student_id: wizardMode === "existing" ? matriculaForm.aluno_id : null,
        p_lead_id: pendingPreMatriculaId,
        p_student_data: {
          nome: form.nome,
          email: form.email,
          telefone: form.telefone,
          cpf: form.cpf,
          cep: form.cep,
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          data_nascimento: form.data_nascimento,
          foto_url: fUrl,
          responsavel_legal_nome: form.responsavel_legal_nome,
          responsavel_legal_telefone: form.responsavel_legal_telefone,
          responsavel_legal_parentesco: form.responsavel_legal_parentesco,
          responsavel_legal_cpf: form.responsavel_legal_cpf,
          responsavel_legal_email: form.responsavel_legal_email,
          responsavel_legal_cep: form.responsavel_legal_cep,
          responsavel_legal_logradouro: form.responsavel_legal_logradouro,
          responsavel_legal_numero: form.responsavel_legal_numero,
          responsavel_legal_complemento: form.responsavel_legal_complemento,
          responsavel_legal_bairro: form.responsavel_legal_bairro,
          responsavel_legal_cidade: form.responsavel_legal_cidade,
          responsavel_legal_estado: form.responsavel_legal_estado,
          responsavel_financeiro_nome: form.financialIsStudent ? form.nome : (form.financialIsLegal ? form.responsavel_legal_nome : form.responsavel_financeiro_nome),
          responsavel_financeiro_cpf: form.financialIsStudent ? normalizeCpf(form.cpf) : normalizeCpf(form.responsavel_financeiro_cpf),
          responsavel_financeiro_email: form.financialIsStudent ? form.email : form.responsavel_financeiro_email,
          responsavel_financeiro_telefone: form.financialIsStudent ? form.telefone : (form.financialIsLegal ? form.responsavel_legal_telefone : form.responsavel_financeiro_telefone),
          due_day: form.due_day,
        },
        p_enrollments: enrollmentsData,
        p_start_date: matriculaForm.vencimento,
        p_payment_method: matriculaForm.forma_pagamento,
        p_cobrar_taxa: cobrarTaxa,
        p_taxa_valor: taxaMatriculaValue,
        p_partner_id: matriculaForm.partner_id || null,
        p_idempotency_key: matriculaForm.idempotencyKey
      });

      const alunoId = (data as any).student_id;

      // 2. Enviar Convite de Usuário (Fora da transação SQL, via Edge Function)
      // Note: We check sendInvite here (from local state/vars)
      if (sendInvite && !leadOnly && form.email) {
        try {
          await supabase.functions.invoke("invite-user", {
            body: {
              email: form.email,
              nome: form.nome,
              studio_id: studioId,
              roles: ["student"]
            }
          });
        } catch (inviteErr: any) {
          console.warn("[WARN] Erro ao enviar convite automático:", inviteErr.message);
        }
      }

      return data;
    },
    onSuccess: (data: any) => { 
      const alunoId = data.student_id;
      
      // Nuclear Sync for Global Admin Context (Double-Check)
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      
      if (matriculaForm.forma_pagamento === "online" && !leadOnly) {
        checkout({
          amount: matriculaForm.valor_mensal,
          description: `Primeira Mensalidade - ${form.nome}`,
          transactionId: alunoId,
          metadata: { studioId: studioId || "", student_id: alunoId }
        });
      }

      // NOVO: Automação Inteligente de Boas-vindas via WhatsApp
      if (!leadOnly && form.telefone) {
        const welcomeTemplate = `Olá *[nome]*, bem-vindo(a) ao Kineos! 🌿\n\nSua matrícula foi concluída com sucesso. Para sua comodidade, você pode realizar o pagamento da primeira mensalidade pelo link abaixo:\n\n👉 *Link de Pagamento:* [link_pagamento]\n\nQualquer dúvida, estamos à disposição!`;
        
        // O link aponta para a área financeira do aluno
        const paymentLink = `${window.location.origin}/student/financial`;

        sendAutomatedWhatsApp({
          studioId: studioId || "",
          phone: form.telefone,
          template: welcomeTemplate,
          data: {
            nome: form.nome.split(" ")[0],
            link_pagamento: paymentLink
          }
        }).then(res => {
          if (res) toast.success("Link de boas-vindas enviado por WhatsApp!");
        });
      }

      closeWizard(); 
      toast.success(leadOnly ? "Lead cadastrado com sucesso!" : "Matrícula(s) realizada(s) com sucesso!"); 
    },
    onError: (e: any) => toast.error("Falha no processo: " + e.message),
    onSettled: () => setWizardSaving(false),
  });

  const { data: studentEnrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ["admin", "students", "enrollments", viewingDetails?.id],
    enabled: !!viewingDetails,
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("*, classes(nome), plans(nome)").eq("student_id", viewingDetails?.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async ({ enrollmentId, reason }: { enrollmentId: string, reason?: string }) => {
      const { data, error } = await supabase.rpc('process_student_unenrollment', {
        p_enrollment_id: enrollmentId,
        p_cancellation_reason: reason || "Cancelamento via Cockpit"
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      // Nuclear Sync after unenrollment in Student page
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      
      if (data && data.fine_amount > 0) {
        toast.success(`Matrícula encerrada. Multa de R$ ${data.fine_amount.toFixed(2)} gerada.`);
      } else {
        toast.success("Matrícula desativada com sucesso!");
      }
    },
    onError: (e: any) => toast.error("Falha ao desmatricular: " + e.message),
  });

  const { data: studentFinancials = [], isLoading: loadingFinancials } = useQuery({
    queryKey: ["admin", "students", "financials", viewingDetails?.id],
    enabled: !!viewingDetails,
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_records").select("*").eq("student_id", viewingDetails?.id).order("vencimento", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: studentProntuarios = [], isLoading: loadingProntuarios } = useQuery({
    queryKey: ["admin", "health", "prontuarios", viewingDetails?.id],
    enabled: !!viewingDetails,
    queryFn: async () => {
      const { data, error } = await supabase.from("prontuarios").select("*").eq("student_id", viewingDetails?.id).order("data", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: studentSessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["admin", "health", "sessions", viewingDetails?.id],
    enabled: !!viewingDetails,
    queryFn: async () => {
      const { data, error } = await supabase.from("sessions").select("*").eq("student_id", viewingDetails?.id).order("data", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });


  useEffect(() => {
    if (form.financialIsLegal) {
      setForm(prev => ({
        ...prev,
        responsavel_financeiro_nome: prev.responsavel_legal_nome,
        responsavel_financeiro_cpf: prev.responsavel_legal_cpf,
        responsavel_financeiro_email: prev.responsavel_legal_email,
        responsavel_financeiro_telefone: prev.responsavel_legal_telefone,
      }));
    } else if (form.financialIsStudent) {
      setForm(prev => ({
        ...prev,
        responsavel_financeiro_nome: prev.nome,
        responsavel_financeiro_cpf: prev.cpf,
        responsavel_financeiro_email: prev.email,
        responsavel_financeiro_telefone: prev.telefone,
      }));
    }
  }, [
    form.financialIsLegal, 
    form.financialIsStudent, 
    form.responsavel_legal_nome, 
    form.responsavel_legal_cpf, 
    form.responsavel_legal_email, 
    form.responsavel_legal_telefone,
    form.nome,
    form.cpf,
    form.email,
    form.telefone
  ]);


  const { data: lastMatriculaPaidDate } = useQuery({
    queryKey: ["last-matricula-paid", matriculaForm.aluno_id],
    enabled: !!studioId && !!matriculaForm.aluno_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_transactions")
        .select("date")
        .eq("student_id", matriculaForm.aluno_id)
        .eq("description", "Taxa de Matrícula")
        .eq("status", "pago")
        .order("date", { ascending: false })
        .limit(1);
      return data?.[0]?.date || null;
    }
  });

  useEffect(() => {
    if (taxaMatriculaValue > 0 && wizardOpen) {
      if (wizardMode === "new" || !lastMatriculaPaidDate) {
        setCobrarTaxa(true);
      } else {
        const lastPaid = new Date(lastMatriculaPaidDate);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        setCobrarTaxa(lastPaid < oneYearAgo);
      }
    } else {
      setCobrarTaxa(false);
    }
  }, [wizardOpen, taxaMatriculaValue, wizardMode, lastMatriculaPaidDate]);


  const checkCpfConflict = async () => {
    if (!form.cpf || wizardMode !== "new") return true;
    const { data } = await supabase.from("students").select("*").eq("cpf", normalizeCpf(form.cpf)).eq("studio_id", studioId);
    if (data && data.length > 0) { setCpfConflict(data[0]); setShowCpfConflictDialog(true); return false; }
    return true;
  };

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    upsertMutation.mutate(editingStudent ? { ...form, id: editingStudent.id } : form);
  };

  const handleTurmaChange = (id: string) => {
    const t = turmas.find((x: any) => x.id === id);
    const existing = checkoutItems.find(item => item.turma_id === id);
    if (!existing) {
      setCheckoutItems([...checkoutItems, { 
        turma_id: id, 
        nome: t?.nome,
        valor_base: t?.modalidades?.valor_base || 0,
        plano_id: "",
        valor_final: t?.modalidades?.valor_base || 0
      }]);
    }
  };

  const removeCheckoutItem = (id: string) => {
    setCheckoutItems(checkoutItems.filter(item => item.turma_id !== id));
  };

  const updateCheckoutItem = (id: string, updates: any) => {
    setCheckoutItems(checkoutItems.map(item => item.turma_id === id ? { ...item, ...updates } : item));
  };

  const generateContractPDF = () => {
    const doc = new jsPDF();
    doc.text("Contrato de Matrícula", 20, 20);
    doc.text(`Aluno: ${form.nome}`, 20, 30);
    doc.save("contrato.pdf");
  };

  const filtered = alunos.filter(a => {
    const mSearch = a.nome.toLowerCase().includes(search.toLowerCase()) || a.cpf?.includes(search);
    const mStatus = filterStatus === "all" || a.status === filterStatus;
    return mSearch && mStatus;
  });

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Alunos & CRM</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              Gestão completa da base de clientes <span className="h-1 w-1 rounded-full bg-slate-300" /> v2.9.0
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ImportStudentsDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["alunos"] })} />
            <Button 
              variant="outline" 
              className="h-11 rounded-xl bg-white border-gray-200 shadow-sm hover:bg-gray-50 text-sm font-semibold gap-2"
              onClick={() => { resetForm(); setDialogOpen(true); }}
            >
              <UserPlus className="h-4 w-4 text-primary" /> Novo Registro
            </Button>
            <Button 
              className="h-11 rounded-xl shadow-lg shadow-primary/20 text-sm font-semibold gap-2 px-6"
              onClick={() => setWizardOpen(true)}
            >
              <GraduationCap className="h-5 w-5" /> Nova Matrícula
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Total Ativos" 
            value={alunos.filter(a => a.status === 'ativo').length} 
            icon={Users} 
            colorClass="bg-emerald-50 text-emerald-600" 
          />
          <StatCard 
            label="Inscritos Novas" 
            value={preMatriculas.filter(pm => pm.status === 'pendente').length} 
            icon={BookOpen} 
            colorClass="bg-blue-50 text-blue-600" 
          />
          <StatCard 
            label="Em Suspensão" 
            value={alunos.filter(a => a.status === 'suspenso').length} 
            icon={AlertTriangle} 
            colorClass="bg-amber-50 text-amber-600" 
          />
          <StatCard 
            label="Churn / Inativos" 
            value={alunos.filter(a => a.status === 'inativo').length} 
            icon={TrendingDown} 
            colorClass="bg-rose-50 text-rose-600" 
          />
        </div>

        {/* Main Interface Card */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
          <CardHeader className="p-6 pb-0">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1 max-w-md relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Pesquisar por nome ou CPF..." 
                  className="pl-10 h-11 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary/20 transition-all text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] h-11 rounded-xl bg-gray-50 border-transparent"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Ver Todos</SelectItem>
                    <SelectItem value="ativo">Apenas Ativos</SelectItem>
                    <SelectItem value="suspenso">Suspensos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                <p className="text-sm text-muted-foreground animate-pulse">Sincronizando base de alunos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="inline-flex p-4 rounded-full bg-gray-50 text-gray-300">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Nenhum aluno encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">Tente ajustar seus filtros ou pesquisar por outro termo.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((s: any) => {
                  const insc = getAlunoInscricoesCount(s.id);
                  const initials = (s.nome || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
                  const st = s.status || 'ativo';
                  
                  return (
                    <div key={s.id} className="group flex items-center gap-4 p-4 hover:bg-primary/[0.02] transition-all cursor-default relative">
                      {/* Active Indicator */}
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all ${st !== 'ativo' ? 'bg-transparent' : 'bg-primary scale-y-0 group-hover:scale-y-100'}`} />
                      
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-gray-100">
                        {s.foto_url && <AvatarImage src={s.foto_url} className="object-cover" />}
                        <AvatarFallback className={`${st !== 'ativo' ? 'bg-gray-100 text-gray-400' : 'bg-primary/5 text-primary'} font-bold text-sm`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className={`font-semibold truncate ${st !== 'ativo' ? 'text-muted-foreground' : 'text-gray-900'}`}>{s.nome}</h4>
                          {st === 'ativo' ? (
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                          ) : (
                            <Badge variant="secondary" className={`px-1.5 py-0 text-[10px] uppercase tracking-wider font-extrabold border-none ${st === 'suspenso' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                              {st}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.telefone || "Sem telefone"}</span>
                          {insc > 0 && <span className="flex items-center gap-1 font-medium text-primary"><BookOpen className="h-3 w-3" /> {insc} Turmas</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pr-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 text-muted-foreground"><MoreHorizontal className="h-5 w-5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-xl border-gray-100">
                            <DropdownMenuItem onClick={() => setViewingDetails(s)} className="p-3 cursor-pointer">
                              <Eye className="h-4 w-4 mr-3 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">Visualizar Detalhes</span>
                                <span className="text-[10px] text-muted-foreground">Perfil completo e histórico</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(s)} className="p-3 cursor-pointer">
                              <Edit className="h-4 w-4 mr-3 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">Editar Cadastro</span>
                                <span className="text-[10px] text-muted-foreground">Dados pessoais e contatos</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="p-3 cursor-pointer text-destructive focus:text-destructive" onClick={() => confirmDelete(s)}>
                              <Trash2 className="h-4 w-4 mr-3" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">Remover</span>
                                <span className="text-[10px] opacity-80">Excluir aluno do sistema</span>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 border-none shadow-2xl rounded-2xl overflow-hidden flex flex-col focus:outline-none">
           <div className="bg-slate-900 p-6 text-white flex justify-between items-center bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950">
             <div>
               <h2 className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
                 <GraduationCap className="h-5 w-5 text-primary" /> Nova Matrícula
               </h2>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Fluxo de Inscrição Kineos Cockpit v7.5.2</p>
             </div>
             <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
                {STEPS.map((s, i) => (
                  <div key={i} className={cn("h-2 w-8 rounded-full transition-all duration-300", i <= wizardStep ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-white/10")} />
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    {STEPS[wizardStep].label} <span className="text-primary">.</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">{STEPS[wizardStep].description}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:bg-slate-100" onClick={() => setWizardOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
              {wizardStep === 0 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                          <div className="h-5 w-1 bg-primary rounded-full" />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">1. Dados do Aluno</h3>
                       </div>
                       <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-lg text-[9px] font-bold uppercase tracking-widest gap-2 bg-slate-50 border-slate-200"
                            onClick={() => setShowLeadSelect(true)}
                          >
                             <Search className="h-3 w-3" /> Explorar Leads
                          </Button>
                          <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
                             <Checkbox id="lead-only" checked={leadOnly} onCheckedChange={(v) => setLeadOnly(!!v)} />
                             <Label htmlFor="lead-only" className="text-[9px] font-bold uppercase text-amber-700 tracking-tight cursor-pointer">Apenas interessado</Label>
                          </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Nome Completo</Label>
                        <Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm focus-visible:ring-primary" placeholder="Nome do aluno" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">CPF</Label>
                        <Input value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm focus-visible:ring-primary" placeholder="000.000.000-00" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Data de Nascimento</Label>
                        <Input type="date" value={form.data_nascimento} onChange={e => setForm({...form, data_nascimento: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm focus-visible:ring-primary" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Email</Label>
                        <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm focus-visible:ring-primary" placeholder="aluno@email.com" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Telefone</Label>
                        <Input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm focus-visible:ring-primary" placeholder="(00) 00000-0000" />
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-1 bg-primary rounded-full" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">2. Responsável Legal</h3>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <Checkbox checked={form.legalIsStudent} onCheckedChange={(v) => {
                          const isStd = v as boolean;
                          setForm({
                            ...form, 
                            legalIsStudent: isStd,
                            responsavel_legal_nome: isStd ? form.nome : form.responsavel_legal_nome,
                            responsavel_legal_telefone: isStd ? form.telefone : form.responsavel_legal_telefone,
                            responsavel_legal_cpf: isStd ? form.cpf : form.responsavel_legal_cpf,
                            responsavel_legal_email: isStd ? form.email : form.responsavel_legal_email,
                            responsavel_legal_cep: isStd ? form.cep : form.responsavel_legal_cep,
                            responsavel_legal_logradouro: isStd ? form.logradouro : form.responsavel_legal_logradouro,
                            responsavel_legal_numero: isStd ? form.numero : form.responsavel_legal_numero,
                            responsavel_legal_complemento: isStd ? form.complemento : form.responsavel_legal_complemento,
                            responsavel_legal_bairro: isStd ? form.bairro : form.responsavel_legal_bairro,
                            responsavel_legal_cidade: isStd ? form.cidade : form.responsavel_legal_cidade,
                            responsavel_legal_estado: isStd ? form.estado : form.responsavel_legal_estado,
                            responsavel_legal_parentesco: isStd ? "Próprio" : ""
                          });
                        }} />
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">O próprio aluno</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Nome do Responsável</Label>
                        <Input value={form.responsavel_legal_nome} onChange={e => setForm({...form, responsavel_legal_nome: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm" placeholder="Nome completo" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">CPF do Responsável</Label>
                        <Input value={form.responsavel_legal_cpf} onChange={e => setForm({...form, responsavel_legal_cpf: maskCPF(e.target.value)})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm" placeholder="000.000.000-00" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Telefone</Label>
                        <Input value={form.responsavel_legal_telefone} onChange={e => setForm({...form, responsavel_legal_telefone: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm" placeholder="(00) 00000-0000" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Email</Label>
                        <Input value={form.responsavel_legal_email} onChange={e => setForm({...form, responsavel_legal_email: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm" placeholder="email@exemplo.com" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Parentesco</Label>
                        <Input value={form.responsavel_legal_parentesco} onChange={e => setForm({...form, responsavel_legal_parentesco: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm" placeholder="Ex: Pai, Mãe, Tutor" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">CEP</Label>
                        <Input value={form.responsavel_legal_cep} onChange={async (e) => {
                           const cep = e.target.value.replace(/\D/g, "");
                           setForm({...form, responsavel_legal_cep: e.target.value});
                           if (cep.length === 8) {
                              try {
                                 const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                                 const data = await res.json();
                                 if (!data.erro) {
                                    setForm(prev => ({
                                       ...prev, 
                                       responsavel_legal_cep: e.target.value,
                                       responsavel_legal_logradouro: data.logradouro,
                                       responsavel_legal_bairro: data.bairro,
                                       responsavel_legal_cidade: data.localidade,
                                       responsavel_legal_estado: data.uf
                                    }));
                                    toast.success("Endereço localizado!");
                                 }
                              } catch (err) {}
                           }
                        }} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm" placeholder="00000-000" />
                      </div>
                      <div className="md:col-span-2 lg:col-span-2 space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Logradouro / Endereço</Label>
                        <Input value={form.responsavel_legal_logradouro} onChange={e => setForm({...form, responsavel_legal_logradouro: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Número</Label>
                        <Input value={form.responsavel_legal_numero} onChange={e => setForm({...form, responsavel_legal_numero: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-sm" />
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-1 bg-primary rounded-full" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">3. Responsável Financeiro</h3>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          <Checkbox checked={form.financialIsStudent} onCheckedChange={(v) => {
                            const isStd = v as boolean;
                            setForm({
                              ...form, 
                              financialIsStudent: isStd,
                              financialIsLegal: false,
                              responsavel_financeiro_nome: isStd ? form.nome : "",
                              responsavel_financeiro_cpf: isStd ? form.cpf : "",
                              responsavel_financeiro_email: isStd ? form.email : "",
                              responsavel_financeiro_telefone: isStd ? form.telefone : ""
                            });
                          }} />
                          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">O próprio aluno</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          <Checkbox checked={form.financialIsLegal} onCheckedChange={(v) => {
                            const isLegal = v as boolean;
                            setForm({
                              ...form, 
                              financialIsLegal: isLegal,
                              financialIsStudent: false,
                              responsavel_financeiro_nome: isLegal ? form.responsavel_legal_nome : "",
                              responsavel_financeiro_telefone: isLegal ? form.responsavel_legal_telefone : "",
                              responsavel_financeiro_cpf: isLegal ? form.responsavel_legal_cpf : "", 
                              responsavel_financeiro_email: isLegal ? form.responsavel_legal_email : ""
                            });
                          }} />
                          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Mesmo que Legal</span>
                        </div>
                      </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95">
                        <div className="space-y-2">
                           <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Nome do Pagador</Label>
                           <Input 
                            value={form.responsavel_financeiro_nome} 
                            onChange={e => setForm({...form, responsavel_financeiro_nome: e.target.value})} 
                            className={cn("h-11 rounded-xl bg-slate-50 border-none font-medium text-sm", (form.financialIsLegal || form.financialIsStudent) && "opacity-60 grayscale")} 
                            readOnly={form.financialIsLegal || form.financialIsStudent}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">CPF do Pagador</Label>
                           <Input 
                            value={form.responsavel_financeiro_cpf} 
                            onChange={e => setForm({...form, responsavel_financeiro_cpf: maskCPF(e.target.value)})} 
                            className={cn("h-11 rounded-xl bg-slate-50 border-none font-medium text-sm", (form.financialIsLegal || form.financialIsStudent) && "opacity-60 grayscale")} 
                            readOnly={form.financialIsLegal || form.financialIsStudent}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Email Financeiro</Label>
                           <Input 
                            value={form.responsavel_financeiro_email} 
                            onChange={e => setForm({...form, responsavel_financeiro_email: e.target.value})} 
                            className={cn("h-11 rounded-xl bg-slate-50 border-none font-medium text-sm", (form.financialIsLegal || form.financialIsStudent) && "opacity-60 grayscale")} 
                            readOnly={form.financialIsLegal || form.financialIsStudent}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Telefone Financeiro</Label>
                           <Input 
                            value={form.responsavel_financeiro_telefone} 
                            onChange={e => setForm({...form, responsavel_financeiro_telefone: e.target.value})} 
                            className={cn("h-11 rounded-xl bg-slate-50 border-none font-medium text-sm", (form.financialIsLegal || form.financialIsStudent) && "opacity-60 grayscale")} 
                            readOnly={form.financialIsLegal || form.financialIsStudent}
                           />
                        </div>
                     </div>
                  </div>
                  <div className="flex justify-end pt-4 gap-3">
                    {leadOnly ? (
                      <Button 
                        size="lg" 
                        className="h-12 px-10 rounded-xl text-xs font-bold uppercase tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all active:scale-[0.98]" 
                        onClick={() => wizardMutation.mutate()}
                        disabled={wizardSaving}
                      >
                        {wizardSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} 
                        Finalizar Cadastro de Lead
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        className="h-12 px-10 rounded-xl text-xs font-bold uppercase tracking-widest gap-2 group shadow-md" 
                        onClick={async () => {
                           if (await checkCpfConflict()) setWizardStep(1);
                        }}
                      >
                         Próximo Passo <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                   <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Seleção de Turmas</h3>
                        <p className="text-xs text-slate-400 font-medium font-bold uppercase tracking-widest text-[8px] mt-1">Selecione uma ou mais modalidades para o checkout.</p>
                      </div>
                      <div className="flex flex-col items-end">
                         <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Itens no Carrinho</p>
                         <p className="text-xs font-bold text-primary">{checkoutItems.length} Turma(s)</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Lista de Turmas Disponíveis */}
                      <div className="space-y-4">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Turmas Disponíveis</Label>
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                          {turmas.map(t => {
                            const isAdded = checkoutItems.some(item => item.turma_id === t.id);
                            return (
                              <Card 
                                key={t.id} 
                                className={cn(
                                  "cursor-pointer transition-all border shadow-none rounded-xl overflow-hidden group",
                                  isAdded ? "border-primary bg-primary/5 opacity-60" : "border-slate-100 bg-slate-50/50 hover:border-primary/40 hover:bg-white"
                                )} 
                                onClick={() => !isAdded && handleTurmaChange(t.id)}
                              >
                                <CardContent className="p-3 flex items-center gap-3">
                                   <div className="h-9 w-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-lg">{t.modalidades?.emoji || "🏫"}</div>
                                   <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-slate-900 truncate">{t.nome}</h4>
                                        {t.vagas > 0 && (
                                          <Badge variant="outline" className={cn("px-1 py-0 text-[8px] font-bold", (t.vagas_ocupadas || 0) >= t.vagas ? "text-rose-500 border-rose-200 bg-rose-50" : "text-emerald-500 border-emerald-200 bg-emerald-50")}>
                                            {(t.vagas_ocupadas || 0)}/{t.vagas} Vagas
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t.horario} · {t.dias_semana?.join(", ")}</p>
                                   </div>
                                   {isAdded ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-slate-300 group-hover:text-primary" />}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>

                      {/* Carrinho de Compras */}
                      <div className="space-y-4 flex flex-col">
                         <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Resumo do Checkout</Label>
                         <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-100 p-4 space-y-4 min-h-[200px]">
                            {checkoutItems.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2 opacity-50">
                                 <ShoppingBag className="h-8 w-8" />
                                 <p className="text-[8px] font-bold uppercase tracking-widest">Carrinho Vazio</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {checkoutItems.map(item => {
                                  const t = turmas.find((x: any) => x.id === item.turma_id);
                                  return (
                                    <div key={item.turma_id} className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm space-y-3">
                                       <div className="flex items-center justify-between">
                                          <div>
                                             <p className="text-xs font-bold text-slate-900 leading-none">{item.nome}</p>
                                             <p className="text-[8px] font-bold text-primary uppercase tracking-widest mt-1">{t?.modalidades?.nome}</p>
                                          </div>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50" onClick={() => removeCheckoutItem(item.turma_id)}>
                                             <Trash2 className="h-3 w-3" />
                                          </Button>
                                       </div>
                                       <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                             <Label className="text-[7px] uppercase font-bold text-slate-400">Plano</Label>
                                             <Select value={item.plano_id} onValueChange={(v) => {
                                                const p = planos.find(x => x.id === v);
                                                updateCheckoutItem(item.turma_id, { plano_id: v, valor_final: p?.valor || item.valor_base });
                                             }}>
                                                <SelectTrigger className="h-7 text-[9px] font-bold uppercase border-slate-100 bg-slate-50">
                                                   <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                   {planos.filter((p: any) => !p.modalidade_id || p.modalidade_id === t?.modalidade_id).map((p: any) => (
                                                      <SelectItem key={p.id} value={p.id} className="text-[9px] font-bold">
                                                         {p.nome} - R$ {p.valor?.toFixed(2)}
                                                      </SelectItem>
                                                   ))}
                                                </SelectContent>
                                             </Select>
                                          </div>
                                          <div className="space-y-1">
                                             <Label className="text-[7px] uppercase font-bold text-slate-400">Valor Final</Label>
                                             <Input 
                                               type="number" 
                                               value={item.valor_final} 
                                               onChange={e => updateCheckoutItem(item.turma_id, { valor_final: Number(e.target.value) })}
                                               className="h-7 text-[9px] font-bold border-slate-100 bg-slate-50"
                                             />
                                          </div>
                                       </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                         </div>
                         <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total Mensal Estimado</p>
                            <p className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                               R$ {checkoutItems.reduce((acc, item) => acc + (item.valor_final || 0), 0).toFixed(2)}
                            </p>
                         </div>
                      </div>
                   </div>

                   <div className="flex justify-between items-center pt-8">
                     <Button variant="ghost" className="gap-2 text-[10px] font-bold uppercase text-slate-400" onClick={() => setWizardStep(0)}>
                       <ChevronLeft className="h-4 w-4" /> Voltar
                     </Button>
                     <Button 
                       size="lg" 
                       className="h-12 px-10 rounded-xl text-xs font-bold uppercase tracking-widest gap-2 group" 
                       onClick={() => {
                          const total = checkoutItems.reduce((acc, i) => acc + (i.valor_final || 0), 0);
                          setMatriculaForm({...matriculaForm, valor_mensal: total});
                          setWizardStep(3); // Pula o Passo 2 (Seleção Global de Plano)
                       }}
                       disabled={checkoutItems.length === 0 || checkoutItems.some(i => !i.plano_id)}
                     >
                       Confirmar e Projetar <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                     </Button>
                   </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-lg mx-auto">
                   <div>
                     <h3 className="text-base font-bold text-slate-900">Primeira Mensalidade</h3>
                     <p className="text-xs text-slate-400 font-medium">Configure como será feito o primeiro acerto.</p>
                   </div>
                   <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Dia de Vencimento Unificado</Label>
                           <Select value={form.due_day.toString()} onValueChange={v => setForm({...form, due_day: parseInt(v)})}>
                              <SelectTrigger className="h-11 rounded-xl bg-white border-none font-medium shadow-sm"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-xl">
                                 {[1, 5, 10, 15, 20, 25].map(d => (
                                    <SelectItem key={d} value={d.toString()}>Todo dia {d}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                           <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Todas as mensalidades do aluno serão unificadas neste dia.</p>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Data do Primeiro Vencimento</Label>
                           <Input type="date" value={matriculaForm.vencimento} onChange={e => setMatriculaForm({...matriculaForm, vencimento: e.target.value})} className="h-11 rounded-xl bg-white border-none font-medium shadow-sm" />
                        </div>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Forma de Pagamento Preferencial</Label>
                         <Select value={matriculaForm.forma_pagamento} onValueChange={v => setMatriculaForm({...matriculaForm, forma_pagamento: v})}>
                            <SelectTrigger className="h-11 rounded-xl bg-white border-none font-medium shadow-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-xl">
                               <SelectItem value="pix">PIX (Manual)</SelectItem>
                               <SelectItem value="cartao">Cartão (Manual)</SelectItem>
                               <SelectItem value="online">Online (Cartão/Pix via Checkout Pro)</SelectItem>
                               <SelectItem value="dinheiro">Dinheiro</SelectItem>
                               <SelectItem value="boleto">Boleto Bancário</SelectItem>
                               <SelectItem value="a_combinar">Pagar na Área do Aluno (Posterior)</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>

                      {parceiros.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                           <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Convênio / Parceria</Label>
                           <Select value={matriculaForm.partner_id || "none"} onValueChange={v => setMatriculaForm({...matriculaForm, partner_id: v === "none" ? "" : v})}>
                              <SelectTrigger className="h-11 rounded-xl bg-white border-none font-medium shadow-sm"><SelectValue placeholder="Nenhum vínculo selecionado" /></SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-xl max-h-48">
                                 <SelectItem value="none">Nenhum vínculo (Sem Convênio)</SelectItem>
                                 {parceiros.map((p: any) => (
                                   <SelectItem key={p.id} value={p.id} className="text-xs">
                                     <span className="font-bold text-slate-700">{p.name}</span> 
                                     <span className="text-primary ml-2 bg-primary/10 px-2 py-0.5 rounded-sm">
                                       {p.discount_type === 'percentage' ? `${p.discount_value}%` : `R$ ${p.discount_value}`} OFF
                                     </span>
                                   </SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                      )}
                      {taxaMatriculaValue > 0 && (
                        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center gap-3">
                            <Switch id="cobrar-taxa" checked={cobrarTaxa} onCheckedChange={setCobrarTaxa} />
                            <Label htmlFor="cobrar-taxa" className="cursor-pointer">
                              <p className="text-[10px] font-bold uppercase text-slate-900 tracking-tight">Taxa de Matrícula</p>
                              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none mt-1">Cobrar taxa inicial de adesão</p>
                            </Label>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-900 tracking-tight">R$ {taxaMatriculaValue.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center justify-between">
                         <div>
                            <p className="text-[9px] font-bold text-primary uppercase tracking-widest leading-none">Total da Matrícula</p>
                            <p className="text-sm font-black text-slate-900 mt-1">Primeiro Boleto/Acerto</p>
                         </div>
                         <div className="text-right">
                            <span className="text-xl font-black text-primary">R$ {(matriculaForm.valor_mensal + (cobrarTaxa ? taxaMatriculaValue : 0)).toFixed(2)}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-4 pt-4">
                     <Button variant="outline" size="lg" className="h-12 rounded-xl text-xs font-bold uppercase tracking-widest gap-2 bg-white w-24" onClick={() => setWizardStep(1)}><ChevronLeft className="h-4 w-4" /></Button>
                     <Button size="lg" className="flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-widest gap-2 group" onClick={() => setWizardStep(4)}>
                       Ver Resumo <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                     </Button>
                   </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-8 animate-in fade-in zoom-in-95">
                   <div className="text-center">
                     <div className="h-14 w-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/20 mb-4 animate-bounce">
                        <Check className="h-8 w-8" />
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 leading-none">Tudo pronto!</h3>
                     <p className="text-xs text-slate-400 font-medium mt-2 uppercase tracking-widest">Confira os dados antes de finalizar a matrícula</p>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                         <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                           <UserPlus className="h-3 w-3 text-primary" /> Aluno & Responsáveis
                         </h4>
                         <div className="space-y-3">
                            <div className="flex justify-between items-baseline h-6 border-b border-slate-200/50">
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Aluno</span>
                               <span className="text-[10px] font-bold text-slate-900 truncate ml-4">{form.nome}</span>
                            </div>
                            <div className="flex justify-between items-baseline h-6 border-b border-slate-200/50">
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">R. Legal</span>
                               <span className="text-[10px] font-bold text-slate-900 truncate ml-4">{form.responsavel_legal_nome}</span>
                            </div>
                            <div className="flex justify-between items-baseline h-6 border-b border-slate-200/50">
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">R. Financeiro</span>
                               <span className="text-[10px] font-bold text-slate-900 truncate ml-4">{form.responsavel_financeiro_nome}</span>
                            </div>
                         </div>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                            <BookOpen className="h-3 w-3 text-primary" /> Carrinho de Matrícula
                          </h4>
                          <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                             {checkoutItems.map((item, idx) => (
                               <div key={idx} className="flex flex-col border-b border-slate-200/50 pb-2 mb-2 last:border-0 last:mb-0">
                                 <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-slate-900 truncate">{item.nome}</span>
                                    <span className="text-[9px] font-bold text-primary">R$ {Number(item.valor_final || 0).toFixed(2)}</span>
                                 </div>
                                 <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{planos.find(p => p.id === item.plano_id)?.nome}</p>
                               </div>
                             ))}
                             <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-slate-200">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Total Checkout</span>
                                <span className="text-[12px] font-black text-primary">R$ {checkoutItems.reduce((acc, item) => acc + (Number(item.valor_final) || 0), 0).toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-baseline h-6 pt-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">1º Vencimento</span>
                                <span className="text-[10px] font-bold text-slate-900 truncate ml-4">
                                  {matriculaForm.vencimento ? new Date(matriculaForm.vencimento + 'T12:00:00').toLocaleDateString() : "Não informada"}
                                </span>
                             </div>
                          </div>
                       </div>
                   </div>

                   <div className="flex gap-4 pt-4 border-t border-slate-100">
                     <Button variant="outline" size="lg" className="h-12 rounded-xl text-xs font-bold uppercase tracking-widest gap-2 bg-white" onClick={() => setWizardStep(3)}><ChevronLeft className="h-4 w-4" /> Ajustar</Button>
                     <Button size="lg" className="flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-widest gap-2 shadow-xl shadow-primary/20 bg-emerald-500 hover:bg-emerald-600 border-none" onClick={() => wizardMutation.mutate()} disabled={wizardSaving}>
                       {wizardSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Confirmar e Finalizar</>}
                     </Button>
                   </div>
                </div>
              )}
           </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 font-bold text-xl uppercase">
                {form.nome?.slice(0,1) || "?"}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight uppercase">{editingStudent ? "Editar Ficha do Aluno" : "Novo Cadastro de Aluno"}</DialogTitle>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão Completa de CRM & Atendimento</p>
              </div>
            </div>
          </div>

          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="pessoal" className="w-full">
                <div className="px-6 bg-slate-50 border-b border-slate-100">
                  <TabsList className="bg-transparent h-12 gap-6 p-0">
                    <TabsTrigger value="pessoal" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold uppercase text-[9px] tracking-widest gap-2">
                       <UserPlus className="h-3.5 w-3.5" /> Dados Pessoais
                    </TabsTrigger>
                    <TabsTrigger value="endereco" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold uppercase text-[9px] tracking-widest gap-2">
                       <Navigation className="h-3.5 w-3.5" /> Endereço
                    </TabsTrigger>
                    <TabsTrigger value="responsaveis" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold uppercase text-[9px] tracking-widest gap-2">
                       <Users className="h-3.5 w-3.5" /> Responsáveis
                    </TabsTrigger>
                    <TabsTrigger value="extra" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold uppercase text-[9px] tracking-widest gap-2">
                       <HeartPulse className="h-3.5 w-3.5" /> CRM & Extra
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8">
                  <TabsContent value="pessoal" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2 lg:col-span-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Nome Completo</Label>
                        <Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" placeholder="Nome do aluno" required />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Status</Label>
                         <Select value={form.status} onValueChange={v => setForm({...form, status: v as StatusAluno})}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold uppercase text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                               <SelectItem value="ativo">Ativo</SelectItem>
                               <SelectItem value="suspenso">Suspenso</SelectItem>
                               <SelectItem value="inativo">Inativo</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">CPF</Label>
                        <Input value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" placeholder="000.000.000-00" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">RG</Label>
                        <Input value={form.rg} onChange={e => setForm({...form, rg: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" placeholder="Documento de identidade" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Nascimento</Label>
                        <Input type="date" value={form.data_nascimento} onChange={e => setForm({...form, data_nascimento: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Telefone</Label>
                        <Input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" placeholder="(00) 00000-0000" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">E-mail</Label>
                        <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium text-lowercase" placeholder="aluno@email.com" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Dia de Vencimento</Label>
                        <Select value={form.due_day.toString()} onValueChange={v => setForm({...form, due_day: parseInt(v)})}>
                           <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-[10px]"><SelectValue /></SelectTrigger>
                           <SelectContent>
                              {[1, 5, 10, 15, 20, 25].map(d => (
                                <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="endereco" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">CEP</Label>
                        <div className="relative">
                          <Input value={form.cep} onChange={async (e) => {
                             const cep = e.target.value.replace(/\D/g, "");
                             setForm({...form, cep: e.target.value});
                             if (cep.length === 8) {
                                try {
                                   const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                                   const data = await res.json();
                                   if (!data.erro) {
                                      setForm(prev => ({
                                         ...prev, 
                                         cep: e.target.value,
                                         logradouro: data.logradouro,
                                         bairro: data.bairro,
                                         cidade: data.localidade,
                                         estado: data.uf
                                      }));
                                      toast.success("Endereço localizado!");
                                   }
                                } catch (err) {}
                             }
                          }} className="h-11 rounded-xl bg-slate-50 border-none font-medium" placeholder="00000-000" />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Rua / Logradouro</Label>
                        <Input value={form.logradouro} onChange={e => setForm({...form, logradouro: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" placeholder="Ex: Av. Brasil" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Número</Label>
                        <Input value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Complemento</Label>
                        <Input value={form.complemento} onChange={e => setForm({...form, complemento: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" placeholder="Apto, Casa, etc." />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Bairro</Label>
                        <Input value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Cidade</Label>
                        <Input value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">UF / Estado</Label>
                        <Input value={form.estado} onChange={e => setForm({...form, estado: e.target.value.toUpperCase().slice(0,2)})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" placeholder="Ex: MG" />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="responsaveis" className="mt-0 space-y-8">
                     <div className="space-y-6">
                        <div className="flex items-center gap-2">
                           <div className="h-4 w-1 bg-primary rounded-full" />
                           <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Responsável Financeiro (Pagador)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Nome do Pagador</Label>
                              <Input value={form.responsavel_financeiro_nome} onChange={e => setForm({...form, responsavel_financeiro_nome: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">CPF do Pagador</Label>
                              <Input value={form.responsavel_financeiro_cpf} onChange={e => setForm({...form, responsavel_financeiro_cpf: maskCPF(e.target.value)})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Telefone Financeiro</Label>
                              <Input value={form.responsavel_financeiro_telefone} onChange={e => setForm({...form, responsavel_financeiro_telefone: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                           </div>
                        </div>
                     </div>

                     <Separator className="bg-slate-100" />

                      <div className="space-y-6">
                         <div className="flex items-center gap-2">
                            <div className="h-4 w-1 bg-slate-900 rounded-full" />
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Responsável Legal</h4>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                               <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Nome do Responsável</Label>
                               <Input value={form.responsavel_legal_nome} onChange={e => setForm({...form, responsavel_legal_nome: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">CPF do Responsável</Label>
                               <Input value={form.responsavel_legal_cpf} onChange={e => setForm({...form, responsavel_legal_cpf: maskCPF(e.target.value)})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Telefone Legal</Label>
                               <Input value={form.responsavel_legal_telefone} onChange={e => setForm({...form, responsavel_legal_telefone: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Email Legal</Label>
                               <Input value={form.responsavel_legal_email} onChange={e => setForm({...form, responsavel_legal_email: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Parentesco</Label>
                               <Input value={form.responsavel_legal_parentesco} onChange={e => setForm({...form, responsavel_legal_parentesco: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" placeholder="Ex: Pai, Mãe" />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">CEP</Label>
                               <Input value={form.responsavel_legal_cep} onChange={async (e) => {
                                  const cep = e.target.value.replace(/\D/g, "");
                                  setForm({...form, responsavel_legal_cep: e.target.value});
                                  if (cep.length === 8) {
                                     try {
                                        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                                        const data = await res.json();
                                        if (!data.erro) {
                                           setForm(prev => ({
                                              ...prev, 
                                              responsavel_legal_cep: e.target.value,
                                              responsavel_legal_logradouro: data.logradouro,
                                              responsavel_legal_bairro: data.bairro,
                                              responsavel_legal_cidade: data.localidade,
                                              responsavel_legal_estado: data.uf
                                           }));
                                           toast.success("Endereço localizado!");
                                        }
                                     } catch (err) {}
                                  }
                               }} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                            </div>
                            <div className="md:col-span-2 lg:col-span-2 space-y-2">
                               <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Logradouro / Endereço</Label>
                               <Input value={form.responsavel_legal_logradouro} onChange={e => setForm({...form, responsavel_legal_logradouro: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Número</Label>
                               <Input value={form.responsavel_legal_numero} onChange={e => setForm({...form, responsavel_legal_numero: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                            </div>
                         </div>
                      </div>
                  </TabsContent>

                  <TabsContent value="extra" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Profissão</Label>
                        <Input value={form.profissao} onChange={e => setForm({...form, profissao: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Como nos conheceu?</Label>
                        <Select value={form.como_conheceu} onValueChange={v => setForm({...form, como_conheceu: v})}>
                           <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-medium"><SelectValue /></SelectTrigger>
                           <SelectContent>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="google">Google</SelectItem>
                              <SelectItem value="indicacao">Indicação de Amigo</SelectItem>
                              <SelectItem value="passagem">Passando na Frente</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Observações Médicas / Restrições</Label>
                        <Textarea value={form.observacoes_medicas} onChange={e => setForm({...form, observacoes_medicas: e.target.value})} className="min-h-[100px] rounded-xl bg-slate-50 border-none font-medium resize-none p-4" placeholder="Alguma lesão ou recomendação médica?" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Contato de Emergência (Nome)</Label>
                        <Input value={form.emergencia_contato} onChange={e => setForm({...form, emergencia_contato: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Telefone de Emergência</Label>
                        <Input value={form.emergencia_telefone} onChange={e => setForm({...form, emergencia_telefone: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" />
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                <Button type="button" variant="ghost" className="h-12 rounded-xl text-xs font-bold uppercase tracking-widest" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="h-12 px-10 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingStudent ? "Salvar Alterações" : "Criar Cadastro"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteStudentDialog />
      <ConfirmUnenrollDialog />
      
      <AlertDialog open={showCpfConflictDialog} onOpenChange={setShowCpfConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>CPF já cadastrado</AlertDialogTitle>
            <AlertDialogDescription>Deseja atualizar os dados de {cpfConflict?.nome} e prosseguir?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCpfConflictDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setCpfConflictResolved("update"); setShowCpfConflictDialog(false); setWizardStep(1); }}>Atualizar e Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lead Selection Dialog */}
      <Dialog open={showLeadSelect} onOpenChange={setShowLeadSelect}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold uppercase tracking-tight text-sm">
              <Search className="h-4 w-4 text-primary" /> Pesquisar Pré-Matrículas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                <Input placeholder="Buscar por nome..." className="pl-10 h-10 border-slate-100 bg-slate-50 text-[10px] font-bold uppercase" />
             </div>
             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {preMatriculas.filter(pm => pm.status === 'pendente').map(pm => (
                  <div 
                    key={pm.id} 
                    className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-primary/50 hover:bg-slate-50 cursor-pointer group transition-all"
                    onClick={() => {
                      setForm({
                        ...form,
                        nome: pm.nome || "",
                        cpf: pm.cpf || "",
                        telefone: pm.telefone || "",
                        email: pm.email || "",
                        status: "interessado"
                      });
                      setPendingPreMatriculaId(pm.id);
                      setShowLeadSelect(false);
                      toast.success("Lead Carregado!", { description: "Os dados foram importados com sucesso." });
                    }}
                  >
                    <div>
                      <p className="text-[10px] font-bold text-slate-900 leading-tight group-hover:text-primary">{pm.nome}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{pm.modalities?.nome || "Sem modalidade"}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
                {preMatriculas.filter(pm => pm.status === 'pendente').length === 0 && (
                  <div className="py-10 text-center space-y-2 opacity-50">
                    <Search className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-[10px] font-bold uppercase text-slate-400">Nenhum lead encontrado</p>
                  </div>
                )}
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingDetails} onOpenChange={(o) => !o && setViewingDetails(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
          <div className="bg-slate-900 p-6 text-white bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 overflow-hidden shadow-inner font-bold">
                  {viewingDetails?.foto_url ? <img src={viewingDetails.foto_url} className="h-full w-full object-cover" /> : <Users className="h-6 w-6 text-primary" />}
               </div>
               <div>
                 <h2 className="text-xl font-bold tracking-tight uppercase">{viewingDetails?.nome}</h2>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" /> Cadastro Verificado <span className="h-1 w-1 rounded-full bg-white/20" /> Aluno {viewingDetails?.status}
                 </p>
               </div>
            </div>
            <div className="hidden md:flex flex-col items-end">
               <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">ID do Registro</p>
               <p className="text-[10px] font-bold text-white/50">{viewingDetails?.id?.slice(0,8)}...</p>
            </div>
          </div>

          <div className="bg-white p-0">
            <Tabs defaultValue="perfil" className="w-full">
              <div className="px-6 bg-slate-50/50 border-b border-slate-100">
                <TabsList className="bg-transparent h-12 gap-6 p-0 font-bold">
                  <TabsTrigger value="perfil" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold uppercase text-[9px] tracking-widest gap-2">
                    <UserPlus className="h-3.5 w-3.5" /> Perfil
                  </TabsTrigger>
                  <TabsTrigger value="matriculas" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold uppercase text-[9px] tracking-widest gap-2">
                    <BookOpen className="h-3.5 w-3.5" /> Matrículas
                  </TabsTrigger>
                  <TabsTrigger value="financeiro" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold uppercase text-[9px] tracking-widest gap-2">
                    <CreditCard className="h-3.5 w-3.5" /> Financeiro
                  </TabsTrigger>
                  <TabsTrigger value="prontuario" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold uppercase text-[9px] tracking-widest gap-2">
                    <History className="h-3.5 w-3.5" /> Linha do Tempo
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-8">
                <TabsContent value="perfil" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">Contatos Principais</p>
                        <div className="space-y-3">
                           <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span className="text-xs font-bold text-slate-700">{viewingDetails?.telefone || "—"}</span>
                           </div>
                           <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <Mail className="h-4 w-4 text-slate-400" />
                              <span className="text-xs font-bold text-slate-700">{viewingDetails?.email || "—"}</span>
                           </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">Documentação</p>
                        <div className="space-y-3">
                           <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase w-8">CPF</span>
                              <span className="text-xs font-bold text-slate-700">{viewingDetails?.cpf || "—"}</span>
                           </div>
                           <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-xs font-bold text-slate-700">{viewingDetails?.data_nascimento ? new Date(viewingDetails.data_nascimento).toLocaleDateString("pt-BR") : "—"}</span>
                           </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">Responsáveis</p>
                        <div className="space-y-3">
                           {viewingDetails?.responsavel_financeiro_nome && viewingDetails.responsavel_financeiro_nome !== viewingDetails.nome && (
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[7px] font-bold text-slate-400 uppercase mb-1">Pagador</p>
                                <p className="text-xs font-bold text-slate-700">{viewingDetails.responsavel_financeiro_nome}</p>
                              </div>
                           )}
                           {viewingDetails?.responsavel_legal_nome && viewingDetails.responsavel_legal_nome !== viewingDetails.nome && (
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[7px] font-bold text-slate-400 uppercase mb-1">Legal ({viewingDetails.responsavel_legal_parentesco})</p>
                                <p className="text-xs font-bold text-slate-700">{viewingDetails.responsavel_legal_nome}</p>
                              </div>
                           )}
                        </div>
                      </div>
                   </div>
                   <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between border-none shadow-xl">
                      <div className="flex items-center gap-4">
                         <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><ShieldCheck className="h-5 w-5" /></div>
                         <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Observações Médicas</p>
                            <p className="text-xs font-medium text-white/90">{viewingDetails?.observacoes_medicas || "Nenhuma contra-indicação ou observação informada."}</p>
                         </div>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="matriculas" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                   {loadingEnrollments ? (
                     <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                   ) : studentEnrollments.length === 0 ? (
                     <p className="text-center py-10 text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhuma matrícula ativa ou histórica</p>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {studentEnrollments.map((en: any) => (
                         <div key={en.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group hover:border-primary/50 transition-all">
                            <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20"><BookOpen className="h-5 w-5" /></div>
                               <div>
                                  <p className="text-sm font-bold text-slate-900">{en.classes?.nome}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{en.plans?.nome}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <Badge className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border-none", en.ativa ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>{en.ativa ? "Ativa" : "Inativa"}</Badge>
                               {en.ativa && (
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     requestUnenroll(en.id, en.classes?.nome, () => unenrollMutation.mutate(en.id));
                                   }}
                                   title="Remover da Turma"
                                 >
                                   <UserMinus className="h-3.5 w-3.5" />
                                 </Button>
                               )}
                            </div>
                         </div>
                       ))}
                     </div>
                   )}
                </TabsContent>

                <TabsContent value="financeiro" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                   <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-900 text-white font-bold uppercase text-[8px] tracking-widest">
                            <th className="p-4">Vencimento</th>
                            <th className="p-4">Valor</th>
                            <th className="p-4">Plano</th>
                            <th className="p-4">Origem</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loadingFinancials ? (
                             <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
                          ) : studentFinancials.length === 0 ? (
                             <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest">Nenhum registro financeiro</td></tr>
                          ) : (
                            studentFinancials.map((rec: any) => (
                              <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-700">{new Date(rec.vencimento).toLocaleDateString("pt-BR")}</td>
                                <td className="p-4 font-black text-slate-950">R$ {Number(rec.valor).toFixed(2)}</td>
                                <td className="p-4 font-medium text-slate-500">{rec.plans?.nome || rec.plan_id?.slice(0,8)}</td>
                                <td className="p-4 font-bold uppercase text-[9px] text-slate-400 tracking-tighter">{rec.forma_pagamento}</td>
                                <td className="p-4">
                                   <Badge className={cn("text-[8px] font-bold uppercase rounded-full px-2 py-0 border-none", 
                                      rec.status === 'pago' ? "bg-emerald-500 text-white" : 
                                      rec.status === 'vencido' ? "bg-rose-500 text-white" : "bg-amber-500 text-white")}>
                                      {rec.status}
                                   </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                   </div>
                </TabsContent>

                <TabsContent value="prontuario" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                   <div className="space-y-6 relative">
                      <div className="absolute left-6 top-8 bottom-0 w-px bg-slate-100" />
                      {loadingProntuarios || loadingSessions ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                      ) : [...studentProntuarios, ...studentSessions].length === 0 ? (
                         <p className="text-center py-10 text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum registro clínico disponível</p>
                      ) : (
                        [...studentProntuarios, ...studentSessions]
                        .sort((a, b) => new Date(b.data || b.created_at).getTime() - new Date(a.data || a.created_at).getTime())
                        .map((entry: any, i) => {
                           const isSession = !!entry.nivel_dor_antes || entry.exercicios_realizados;
                           return (
                             <div key={i} className="relative pl-12">
                                <div className={cn("absolute left-4 top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center", 
                                   isSession ? "bg-primary" : "bg-slate-900")}>
                                   {isSession ? <Activity className="h-2 w-2 text-white" /> : <FileHeart className="h-2 w-2 text-primary" />}
                                </div>
                                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                                   <div className="flex justify-between items-start mb-2">
                                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{new Date(entry.data || entry.created_at).toLocaleDateString("pt-BR")}</p>
                                      <Badge variant="outline" className="text-[7px] font-bold uppercase px-1.5 py-0">{isSession ? "Sessão" : entry.tipo}</Badge>
                                   </div>
                                   <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                      {entry.descricao || entry.exercicios_realizados || "Sem descrição detalhada."}
                                   </p>
                                   {isSession && (
                                     <div className="flex gap-4 mt-3 pt-3 border-t border-slate-200/50">
                                        <div className="flex items-center gap-1.5"><TrendingDown className="h-3 w-3 text-rose-500" /><span className="text-[9px] font-bold text-slate-500 uppercase">Dor: {entry.nivel_dor_antes} ➔ {entry.nivel_dor_depois}</span></div>
                                        <div className="flex items-center gap-1.5"><ShoppingBag className="h-3 w-3 text-primary" /><span className="text-[9px] font-bold text-slate-500 uppercase">Humor: {entry.humor}</span></div>
                                     </div>
                                   )}
                                </div>
                             </div>
                           );
                        })
                      )}
                   </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentMethodModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        checkoutOptions={checkoutOptions} 
        studioId={studioId!} 
      />

      {/* Diálogos de confirmação de exclusão - necessário renderiza-los para funcionar */}
      <ConfirmDeleteStudentDialog />
      <ConfirmUnenrollDialog />
    </AdminLayout>
  );
}
