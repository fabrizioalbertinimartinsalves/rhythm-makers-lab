/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Clock, Users } from "lucide-react";
import { StudioLogo } from "@/components/StudioLogo";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePublicOrg } from "@/hooks/usePublicOrg";
import { maskCPF, cn } from "@/lib/utils";

function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const diasLabel: Record<string, string> = {
  seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
};

export default function PreMatriculaForm() {
  const [searchParams] = useSearchParams();
  const urlTurmas = searchParams.get("turmas") || "";
  const urlModalidade = searchParams.get("modalidade") || "";
  const { data: publicOrg, error: orgError, isLoading: orgLoading } = usePublicOrg();
  const orgId = publicOrg?.id;

  console.warn("PreMatricula Debug:", { orgId, publicOrg, orgError, orgLoading });

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    nome: "", cpf: "", telefone: "", email: "", data_nascimento: "",
    modalidade_interesse: urlModalidade, turma_preferida: urlTurmas, observacoes: "",
  });

  const { data: modalidades = [] } = useQuery({
    queryKey: ["modalidades-pre-sb", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("modalities").select("*").eq("studio_id", orgId!).eq("ativa", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: allTurmas = [] } = useQuery({
    queryKey: ["turmas-pre-sb", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select(`*, modalities (*), schedule_items (*)`).eq("studio_id", orgId!).eq("ativa", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const filteredTurmas = form.modalidade_interesse ? allTurmas.filter((t: any) => t.modalities?.nome === form.modalidade_interesse) : allTurmas;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.nome.trim()) errs.nome = "Nome é obrigatório";
    if (form.cpf && !isValidCPF(form.cpf)) errs.cpf = "CPF inválido";
    if (form.telefone && !isValidPhone(form.telefone)) errs.telefone = "Número inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!validate() || !orgId) throw new Error("Verifique os campos");
      const { error } = await supabase.from("pre_matriculas").insert({
        studio_id: orgId,
        nome: form.nome.trim(),
        cpf: form.cpf.replace(/\D/g, "") || null,
        telefone: form.telefone.replace(/\D/g, "") || null,
        email: form.email.trim() || null,
        data_nascimento: form.data_nascimento || null,
        modalidade_interesse: form.modalidade_interesse || null,
        turma_preferida: form.turma_preferida || null,
        observacoes: form.observacoes.trim() || null,
        status: "pendente"
      });
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <Card className="w-full max-w-md text-center py-12 px-6">
           <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
           <h2 className="text-2xl font-bold">Pré-matrícula realizada!</h2>
           <p className="text-muted-foreground mt-2">Recebemos seus dados. Nossa equipe entrará em contato em breve para finalizar sua matrícula.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <StudioLogo className="mx-auto mb-2" />
          <CardTitle>Pré-Matrícula Online</CardTitle>
          <CardDescription>
            {orgLoading ? "Carregando dados do estúdio..." : 
             orgError ? `Erro: ${orgError.message}` : 
             publicOrg ? `Inicie sua jornada conosco no ${publicOrg.nome}.` : 
             "Inicie sua jornada conosco. Preencha os campos abaixo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
           <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }} className="space-y-4">
              <div className="space-y-1"><Label className="text-xs uppercase font-bold text-slate-500">Nome *</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />{errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1"><Label className="text-xs uppercase font-bold text-slate-500">CPF</Label><Input value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} maxLength={14} /></div>
                 <div className="space-y-1"><Label className="text-xs uppercase font-bold text-slate-500">Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => setForm({...form, data_nascimento: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1"><Label className="text-xs uppercase font-bold text-slate-500">WhatsApp</Label><Input value={form.telefone} onChange={e => setForm({...form, telefone: maskPhone(e.target.value)})} maxLength={15} /></div>
                 <div className="space-y-1"><Label className="text-xs uppercase font-bold text-slate-500">Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              </div>
              <div className="space-y-1">
                 <Label className="text-xs uppercase font-bold text-slate-500">Modalidade</Label>
                 <Select value={form.modalidade_interesse} onValueChange={v => setForm({...form, modalidade_interesse: v})}>
                    <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                    <SelectContent>{modalidades.map((m: any) => <SelectItem key={m.id} value={m.nome}>{m.emoji} {m.nome}</SelectItem>)}</SelectContent>
                 </Select>
              </div>
              <div className="space-y-1">
                 <Label className="text-xs uppercase font-bold text-slate-500">Turmas Disponíveis</Label>
                 <div className="grid gap-2 max-h-48 overflow-y-auto pr-2 border rounded-lg p-2">
                    {filteredTurmas.map((t: any) => (
                      <div key={t.id} className={cn("p-2 border rounded cursor-pointer transition-all text-sm", form.turma_preferida === t.nome ? "border-primary bg-primary/5" : "")} onClick={() => setForm({...form, turma_preferida: t.nome})}>
                         <div className="flex justify-between font-bold"><span>{t.nome}</span> <span className="text-[10px] text-muted-foreground uppercase">{t.modalities?.nome}</span></div>
                         <p className="text-xs text-muted-foreground">{t.horario ? t.horario.slice(0,5) : "--:--"} · {t.schedule_items?.map((si: any) => diasLabel[si.day_of_week]).join(', ')}</p>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="space-y-1"><Label className="text-xs uppercase font-bold text-slate-500">Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} rows={2} /></div>
              <Button type="submit" className="w-full h-12 text-lg font-bold bg-primary" disabled={submitMutation.isPending}>
                 {submitMutation.isPending ? <Loader2 className="animate-spin" /> : "Enviar Pré-Matrícula"}
              </Button>
           </form>
        </CardContent>
      </Card>
    </div>
  );
}
