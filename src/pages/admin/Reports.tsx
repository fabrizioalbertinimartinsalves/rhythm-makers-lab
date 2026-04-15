import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, LineChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const reports = [
  { title: "Repasses de Instrutores", desc: "Configuração e extrato de comissões", icon: FileText, path: "/admin/instructor-payments" },
  { title: "Performance de Alunos (LTV)", desc: "Valor vitalício e risco de churn", icon: LineChart, path: "/admin/ltv" },
  { title: "Lucratividade por Modalidade", desc: "Receita e custos por tipo de aula", icon: FileSpreadsheet, path: "#" },
  { title: "Fluxo de Caixa Mensal", desc: "Entradas e saídas detalhadas", icon: FileSpreadsheet, path: "#" },
  { title: "Ocupação de Salas", desc: "Taxa de utilização por sala e horário", icon: FileText, path: "#" },
  { title: "Relatório LGPD", desc: "Dados sensíveis e acessos registrados", icon: FileText, path: "#" },
];

export default function Reports() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">Exporte dados e análises inteligentes</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r, i) => (
            <Card 
              key={i} 
              className={cn(
                "hover:shadow-md transition-all cursor-pointer border-transparent hover:border-primary/20",
                r.path === "#" && "opacity-60 cursor-not-allowed"
              )}
              onClick={() => { if (r.path !== "#") navigate(r.path); }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <r.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{r.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{r.desc}</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5"
                    onClick={(e) => { e.stopPropagation(); toast.info("Exportação em PDF será processada em breve."); }}
                  >
                    <Download className="h-3 w-3" /> PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5"
                    onClick={(e) => { e.stopPropagation(); toast.info("Exportação em Excel será processada em breve."); }}
                  >
                    <Download className="h-3 w-3" /> Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
