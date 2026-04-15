import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, UserCheck, Smartphone, ArrowRight } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";

const portals = [
  {
    title: "Painel Admin",
    description: "Dashboard executivo, gestão de planos, grade de horários e financeiro",
    icon: Dumbbell,
    path: "/admin",
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Portal do Instrutor",
    description: "Chamada, prontuários digitais e avaliações físicas",
    icon: UserCheck,
    path: "/instructor",
    color: "bg-info/10 text-info",
  },
  {
    title: "App do Aluno",
    description: "Agendamento, evolução e avisos do estúdio",
    icon: Smartphone,
    path: "/student",
    color: "bg-warning/10 text-warning",
  },
];

export default function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Kineos</h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sistema completo para gestão de estúdios de Pilates e Dança
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {portals.map((portal) => (
            <Link key={portal.path} to={portal.path}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className={`rounded-xl p-3 w-fit ${portal.color}`}>
                    <portal.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg mt-3">{portal.title}</CardTitle>
                  <CardDescription className="text-xs">{portal.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    Acessar <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      <InstallPrompt />
    </div>
  );
}
