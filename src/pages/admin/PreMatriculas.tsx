import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserPlus, Search, Loader2, CheckCircle2, XCircle, Eye, Copy,
  Phone, Mail, Calendar, FileText, Clock, GraduationCap, Ban,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { normalizeCpf, maskCPF, formatCpf } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type PreMatricula = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  modalidade_interesse: string | null;
  turma_preferida: string | null;
  motivo_rejeicao: string | null;
  observacoes: string | null;
  status: string;
  convertido_aluno_id: string | null;
  created_at: string;
  studio_id?: string;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  aprovada: { label: "Aprovada", variant: "default" },
  rejeitada: { label: "Rejeitada", variant: "destructive" },
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function PreMatriculas() {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [detailItem, setDetailItem] = useState<PreMatricula | null>(null);
  const [editForm, setEditForm] = useState<Partial<PreMatricula>>({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  const { data: preMatriculas = [], isLoading } = useQuery<PreMatricula[]>({
    queryKey: ["pre-matriculas", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pre_matriculas")
        .select("*")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as PreMatricula[];
    },
  });

  const openDetail = (pm: PreMatricula) => {
    setDetailItem(pm);
    setEditForm({
      nome: pm.nome,
      cpf: pm.cpf || "",
      telefone: pm.telefone || "",
      email: pm.email || "",
      data_nascimento: pm.data_nascimento || "",
      modalidade_interesse: pm.modalidade_interesse || "",
      turma_preferida: pm.turma_preferida || "",
      observacoes: pm.observacoes || "",
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!detailItem || !studioId) return;
      const { error } = await supabase
        .from("pre_matriculas")
        .update({
          nome: editForm.nome,
          cpf: normalizeCpf(editForm.cpf || ""),
          telefone: editForm.telefone || null,
          email: editForm.email || null,
          data_nascimento: editForm.data_nascimento || null,
          modalidade_interesse: editForm.modalidade_interesse || null,
          turma_preferida: editForm.turma_preferida || null,
          observacoes: editForm.observacoes || null,
        })
        .eq("id", detailItem.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-matriculas", studioId] });
      toast.success("Dados atualizados!");
      if (detailItem) setDetailItem({ ...detailItem, ...editForm } as PreMatricula);
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  const iniciarMatricula = async () => {
    if (!detailItem || !studioId) return;
    try {
      const { error } = await supabase
        .from("pre_matriculas")
        .update({
          nome: editForm.nome,
          cpf: normalizeCpf(editForm.cpf || ""),
          telefone: editForm.telefone || null,
          email: editForm.email || null,
          data_nascimento: editForm.data_nascimento || null,
          modalidade_interesse: editForm.modalidade_interesse || null,
          turma_preferida: editForm.turma_preferida || null,
          observacoes: editForm.observacoes || null,
        })
        .eq("id", detailItem.id);
      
      if (error) throw error;
      
      navigate("/admin/students", {
        state: {
          fromPreMatricula: true,
          preMatriculaId: detailItem.id,
          preMatriculaData: {
            nome: editForm.nome || detailItem.nome,
            cpf: editForm.cpf || detailItem.cpf || "",
            telefone: editForm.telefone || detailItem.telefone || "",
            email: editForm.email || detailItem.email || "",
            data_nascimento: editForm.data_nascimento || detailItem.data_nascimento || "",
            observacoes_medicas: editForm.observacoes || detailItem.observacoes || "",
            turma_preferida: editForm.turma_preferida || detailItem.turma_preferida || "",
            modalidade_interesse: editForm.modalidade_interesse || detailItem.modalidade_interesse || "",
          },
        },
      });
      setDetailItem(null);
      setApproveConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pre-matriculas", studioId] });
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const rejectMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      if (!studioId) return;
      const { error } = await supabase
        .from("pre_matriculas")
        .update({ status: "rejeitada", motivo_rejeicao: motivo || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-matriculas", studioId] });
      setDetailItem(null);
      setRejectDialogOpen(false);
      setRejectReason("");
      toast.success("Pré-matrícula rejeitada.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const formUrl = `${window.location.origin}/pre-matricula`;
  const copyLink = () => { navigator.clipboard.writeText(formUrl); toast.success("Link copiado!"); };
  const sendWhatsApp = () => {
    const text = `📋 *Pré-Matrícula Online*\n\nFaça sua pré-matrícula pelo link abaixo:\n👉 ${formUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const filtered = preMatriculas.filter((pm) =>
    pm.nome.toLowerCase().includes(search.toLowerCase()) ||
    pm.email?.toLowerCase().includes(search.toLowerCase()) ||
    pm.cpf?.includes(search)
  );

  const pendentes = preMatriculas.filter((p) => p.status === "pendente").length;
  const rejeitadas = preMatriculas.filter((p) => p.status === "rejeitada").length;
  const isPendente = detailItem?.status === "pendente";
  const isAprovadaSemAluno = detailItem?.status === "aprovada" && !detailItem?.convertido_aluno_id;
  const canEdit = isPendente || isAprovadaSemAluno;
  const isRejeitada = detailItem?.status === "rejeitada";

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary/5 text-primary text-[9px] font-black uppercase tracking-[0.2em] mb-1">CRM</span>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-3">
              <UserPlus className="h-7 w-7 text-primary" /> Pré-Matrículas
            </h1>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Leads recebidos pelo formulário público — gerencie e converta
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-sm border-slate-200" onClick={copyLink}>
              <Copy className="h-4 w-4" /> Copiar link
            </Button>
            <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-sm text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" onClick={sendWhatsApp}>
              <Phone className="h-4 w-4" /> WhatsApp
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{preMatriculas.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">{pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {preMatriculas.filter((p) => p.status === "aprovada").length}
              </p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{rejeitadas}</p>
              <p className="text-xs text-muted-foreground">Rejeitadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou CPF..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma pré-matrícula encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((pm) => {
              const st = statusConfig[pm.status] || statusConfig.pendente;
              return (
                <Card
                key={pm.id}
                className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${
                  pm.status === 'pendente' ? 'border-l-amber-400' :
                  pm.status === 'aprovada' ? 'border-l-emerald-500' :
                  'border-l-rose-400'
                }`}
                onClick={() => openDetail(pm)}
              >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{pm.nome}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {pm.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {pm.telefone}
                          </span>
                        )}
                        {pm.modalidade_interesse && <span>{pm.modalidade_interesse}</span>}
                        {pm.turma_preferida && (
                          <span className="text-primary">📌 {pm.turma_preferida}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(pm.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant={st.variant} className="shrink-0 ml-2">
                      {st.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" /> {canEdit ? "Completar Pré-Matrícula" : "Detalhes da Pré-Matrícula"}
              </DialogTitle>
            </DialogHeader>
            {detailItem && (
              <div className="space-y-4">
                {canEdit ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="pm-nome">Nome *</Label>
                      <Input id="pm-nome" value={editForm.nome || ""} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="pm-cpf">CPF</Label>
                      <Input id="pm-cpf" value={formatCpf(editForm.cpf || "")} onChange={(e) => setEditForm((f) => ({ ...f, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" maxLength={14} />
                    </div>
                    <div>
                      <Label htmlFor="pm-telefone">Telefone</Label>
                      <Input id="pm-telefone" value={editForm.telefone || ""} onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                    </div>
                    <div>
                      <Label htmlFor="pm-email">Email</Label>
                      <Input id="pm-email" type="email" value={editForm.email || ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="pm-nascimento">Data de Nascimento</Label>
                      <Input id="pm-nascimento" type="date" value={editForm.data_nascimento || ""} onChange={(e) => setEditForm((f) => ({ ...f, data_nascimento: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="pm-modalidade">Modalidade de Interesse</Label>
                      <Input id="pm-modalidade" value={editForm.modalidade_interesse || ""} onChange={(e) => setEditForm((f) => ({ ...f, modalidade_interesse: e.target.value }))} />
                    </div>
                    {editForm.turma_preferida && (
                      <div>
                        <Label>Turma Preferida</Label>
                        <Input value={editForm.turma_preferida} onChange={(e) => setEditForm((f) => ({ ...f, turma_preferida: e.target.value }))} />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="pm-obs">Observações</Label>
                      <Textarea id="pm-obs" value={editForm.observacoes || ""} onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} />
                    </div>

                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      Salvar alterações
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <InfoRow icon={<UserPlus className="h-4 w-4" />} label="Nome" value={detailItem.nome} />
                    <InfoRow icon={<FileText className="h-4 w-4" />} label="CPF" value={detailItem.cpf} />
                    <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={detailItem.telefone} />
                    <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={detailItem.email} />
                    <InfoRow icon={<Calendar className="h-4 w-4" />} label="Nascimento" value={detailItem.data_nascimento} />
                    <InfoRow icon={<UserPlus className="h-4 w-4" />} label="Modalidade" value={detailItem.modalidade_interesse} />
                    {detailItem.turma_preferida && (
                      <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Turma Preferida" value={detailItem.turma_preferida} />
                    )}
                    {detailItem.observacoes && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                        <p className="text-sm">{detailItem.observacoes}</p>
                      </div>
                    )}
                    {isRejeitada && detailItem.motivo_rejeicao && (
                      <div className="bg-destructive/10 rounded-md p-3">
                        <p className="text-[10px] text-destructive uppercase tracking-wider mb-1 font-medium">Motivo da Rejeição</p>
                        <p className="text-sm text-destructive">{detailItem.motivo_rejeicao}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Badge variant={statusConfig[detailItem.status]?.variant || "secondary"}>
                    {statusConfig[detailItem.status]?.label || detailItem.status}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(detailItem.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>

                {canEdit && (
                  <div className="space-y-2 pt-2">
                    {isAprovadaSemAluno && (
                      <p className="text-xs text-amber-600 bg-amber-50  rounded-md p-2 text-center">
                        ⚠️ Esta pré-matrícula foi aprovada mas o cadastro do aluno não foi concluído. Clique abaixo para reiniciar.
                      </p>
                    )}
                    <Button
                      className="w-full gap-2"
                      onClick={() => setApproveConfirmOpen(true)}
                    >
                      <GraduationCap className="h-4 w-4" />
                      {isAprovadaSemAluno ? "Reiniciar Matrícula" : "Aprovar e Iniciar Matrícula"}
                    </Button>
                    {isPendente && (
                      <Button
                        variant="destructive"
                        className="w-full gap-2"
                        onClick={() => { setRejectReason(""); setRejectDialogOpen(true); }}
                      >
                        <Ban className="h-4 w-4" />
                        Rejeitar Pré-Matrícula
                      </Button>
                    )}
                  </div>
                )}

                {detailItem.status === "aprovada" && detailItem.convertido_aluno_id && (
                  <p className="text-sm text-primary text-center font-medium">
                    ✅ Aluno já cadastrado no sistema
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Confirmation */}
        <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
              <AlertDialogDescription>
                Você será redirecionado para o fluxo de matrícula completa com os dados de <strong>{detailItem?.nome}</strong>.
                {detailItem?.turma_preferida && (
                  <span className="block mt-1">📌 Turma preferida: <strong>{detailItem.turma_preferida}</strong></span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={iniciarMatricula}>
                <GraduationCap className="h-4 w-4 mr-2" /> Iniciar Matrícula
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Dialog with reason */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Ban className="h-5 w-5" /> Rejeitar Pré-Matrícula
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Deseja informar o motivo da rejeição de <strong>{detailItem?.nome}</strong>?
              </p>
              <Textarea
                placeholder="Motivo da rejeição (opcional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => detailItem && rejectMutation.mutate({ id: detailItem.id, motivo: rejectReason })}
                disabled={rejectMutation.isPending}
                className="gap-2"
              >
                {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Confirmar Rejeição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

