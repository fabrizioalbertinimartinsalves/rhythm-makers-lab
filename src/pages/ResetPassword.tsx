import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { StudioLogo } from "@/components/StudioLogo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { session, updatePassword, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    setLoading(true);
    try {
      // No Supabase, se o usuário clicou no link de recuperação, 
      // ele já está em uma sessão ativa (comum no fluxo implícito).
      // Ou ele está trocando a senha por exigência do admin.
      await updatePassword("", password); 
      setSuccess(true);
      toast.success("Senha redefinida com sucesso!");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-2">
          {success ? (
            <div className="flex justify-center">
              <div className="rounded-xl bg-primary/10 p-3">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
          ) : (
            <StudioLogo />
          )}
          <CardTitle className="text-2xl font-bold">
            {success ? "Senha Redefinida!" : "Nova Senha"}
          </CardTitle>
          <CardDescription>
            {success
              ? "Você será redirecionado para o login..."
              : "Defina sua nova senha abaixo"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar nova senha</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Redefinir senha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
