/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, ArrowLeft, Send, CheckCircle, MessageSquare, Phone, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", email: "", telefone: "", estudio: "", modalidade: "", mensagem: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("leads").insert({
        studio_id: null, // Global platform lead
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        modalidade_interesse: form.modalidade,
        origem: "pagina_contato_master",
        observacoes: `Estúdio: ${form.estudio}\n${form.mensagem}`,
        status: "novo"
      });

      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center py-10">
          <CardContent className="space-y-4">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold">Mensagem enviada!</h2>
            <p className="text-muted-foreground">Nosso time entrará em contato em breve.</p>
            <Link to="/login" className="block mt-6">
              <Button variant="outline" className="w-full"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
           <div className="flex items-center justify-center gap-2">
             <Dumbbell className="h-8 w-8 text-primary" />
             <h1 className="text-2xl font-black">StudioFlow</h1>
           </div>
           <p className="text-sm text-muted-foreground">Fale com um consultor e transforme sua gestão</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> Contato Comercial</CardTitle>
            <CardDescription>Dúvidas ou demonstrações? Conte-nos sua necessidade.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Seu Nome *</Label><Input value={form.nome} onChange={e => handleChange("nome", e.target.value)} required /></div>
                  <div className="space-y-1"><Label>Nome do Estúdio</Label><Input value={form.estudio} onChange={e => handleChange("estudio", e.target.value)} /></div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>E-mail *</Label><Input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} required /></div>
                  <div className="space-y-1"><Label>WhatsApp</Label><Input value={form.telefone} onChange={e => handleChange("telefone", e.target.value)} /></div>
               </div>
               <div className="space-y-1">
                  <Label>Modalidade Principal</Label>
                  <Select value={form.modalidade} onValueChange={v => handleChange("modalidade", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="Pilates">Pilates</SelectItem>
                       <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                       <SelectItem value="Dança">Dança</SelectItem>
                       <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1"><Label>Mensagem</Label><Textarea value={form.mensagem} onChange={e => handleChange("mensagem", e.target.value)} rows={3} /></div>
               <Button type="submit" className="w-full h-12 text-lg font-bold bg-primary" disabled={loading}>
                 {loading ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Enviar Mensagem</>}
               </Button>
            </form>
            <div className="mt-8 pt-4 border-t text-center space-y-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                <p>contato@studioflow.com.br</p>
                <div className="flex justify-center gap-4"><span className="flex items-center gap-1"><Phone className="h-3 w-3" /> (11) 99999-9999</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
