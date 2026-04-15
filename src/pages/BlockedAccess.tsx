import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, LogOut, MessageSquare } from "lucide-react";

export default function BlockedAccess() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="rounded-xl bg-red-100 p-3">
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-700">Acesso Bloqueado</CardTitle>
          <CardDescription>
            Ops! Parece que o acesso para este estúdio está temporariamente suspenso por questões de assinatura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Para regularizar seu acesso, entre em contato com o proprietário do estúdio ou com o nosso suporte técnico.
          </div>
          
          <Button className="w-full gap-2" variant="default">
            <MessageSquare className="h-4 w-4" /> Falar com Suporte
          </Button>
          
          <Button variant="outline" className="w-full gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sair da Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
