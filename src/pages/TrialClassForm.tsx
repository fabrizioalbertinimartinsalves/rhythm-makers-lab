/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StudioLogo } from "@/components/StudioLogo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePublicOrg } from "@/hooks/usePublicOrg";

export default function TrialClassForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    nome: "", telefone: "", email: "", modalidade_interesse: "", observacoes: "",
  });
  const { data: publicOrg } = usePublicOrg();

  const { data: modalidades = [] } = useQuery({
    queryKey: ["modalidades-public-sb", publicOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modalities")
        .select("nome")
        .eq("studio_id", publicOrg!.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!publicOrg?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!publicOrg?.id) throw new Error("ID da organização não encontrado");
       
      const { error } = await supabase.from("leads").insert({
        studio_id: publicOrg.id,
        nome: form.nome,
        telefone: form.telefone || null,
        email: form.email || null,
        modalidade_interesse: form.modalidade_interesse || null,
        observacoes: form.observacoes || null,
        origem: "formulario_web",
        status: "novo",
      });

      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => toast.error("Erro ao enviar: " + e.message),
  });

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">Inscrição enviada!</h2>
            <p className="text-muted-foreground">Entraremos em contato em breve. Até logo! 🌿</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="text-center">
          <StudioLogo className="mb-2 mx-auto" />
          <CardTitle className="text-xl">Aula Experimental</CardTitle>
          <CardDescription>Agende sua aula experimental sem compromisso!</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label className="text-xs uppercase font-bold text-slate-500">Nome completo *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                placeholder="Seu nome"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs uppercase font-bold text-slate-500">WhatsApp</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase font-bold text-slate-500">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase font-bold text-slate-500">Modalidade</Label>
              {modalidades.length > 0 ? (
                <Select value={form.modalidade_interesse} onValueChange={(v) => setForm({ ...form, modalidade_interesse: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma modalidade" /></SelectTrigger>
                  <SelectContent>
                    {modalidades.map((m: any) => (
                      <SelectItem key={m.nome} value={m.nome}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.modalidade_interesse}
                  onChange={(e) => setForm({ ...form, modalidade_interesse: e.target.value })}
                  placeholder="Ex: Pilates, Dança..."
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase font-bold text-slate-500">Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Conte-nos seus objetivos"
                rows={2}
              />
            </div>
            <Button type="submit" className="w-full bg-primary" size="lg" disabled={submitMutation.isPending || !publicOrg}>
              {submitMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : "Quero minha aula!"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
