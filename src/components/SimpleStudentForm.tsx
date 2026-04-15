import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function SimpleStudentForm() {
  const { studioId } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studioId) {
      toast.error("Erro: ID do estúdio não encontrado.");
      return;
    }

    if (!nome.trim() || !email.trim()) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("students")
        .insert({
          studio_id: studioId,
          nome: nome.trim(),
          email: email.trim(),
          status: "ativo",
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success("Aluno cadastrado com sucesso!");
      setNome("");
      setEmail("");
    } catch (error: any) {
      console.error(error);
      toast.error("Falha ao cadastrar aluno: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Novo Aluno
        </CardTitle>
        <CardDescription>
          Cadastre um aluno rapidamente no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              placeholder="Digite o nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="aluno@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Cadastrar Aluno"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
