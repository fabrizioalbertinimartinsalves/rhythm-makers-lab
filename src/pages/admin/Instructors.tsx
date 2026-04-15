import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, DollarSign, Calendar as CalendarIcon, Clock, Filter, 
  Loader2, BadgeAlert, CheckCircle2, AlertTriangle, FileText
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { instructorService } from "@/features/instructors/instructorService";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AttendanceDialog from "@/components/admin/AttendanceDialog";
import InstructorContractModal from "@/components/admin/InstructorContractModal";

export default function Instructors() {
  const navigate = useNavigate();
  const { studioId } = useAuth() as any;
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const [contractInstructor, setContractInstructor] = useState<any>(null);

  const month = parseInt(selectedMonth.split("-")[1]);
  const year = parseInt(selectedMonth.split("-")[0]);

  const { data: instructors = [], isLoading } = useQuery({
    queryKey: ["instructor-dashboard", studioId, selectedMonth],
    enabled: !!studioId,
    queryFn: () => instructorService.getInstructorDashboard(studioId!, month, year),
  });

  const totalPayout = instructors.reduce((acc, curr) => acc + (curr.total_payout || 0), 0);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Instrutores</h1>
            <p className="text-muted-foreground">Contratos, presenças e cálculos automatizados</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = subMonths(startOfMonth(new Date()), i);
                  const val = format(d, "yyyy-MM");
                  return (
                    <SelectItem key={val} value={val}>
                      {format(d, "MMMM yyyy", { locale: ptBR })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest flex items-center justify-between text-primary/60 italic">
                Total Repasse no Mês
                <DollarSign className="h-3 w-3" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="text-xl sm:text-2xl font-black tracking-tighter text-primary truncate">
                R$ {totalPayout.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[8px] text-muted-foreground mt-0.5 uppercase font-bold">Contratos Ativos</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest flex items-center justify-between text-slate-400 italic">
                Instrutores
                <Users className="h-3 w-3" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="text-xl sm:text-2xl font-black tracking-tighter">{instructors.length}</div>
              <p className="text-[8px] text-muted-foreground mt-0.5 uppercase font-bold">Profissionais</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-[9px] font-black uppercase tracking-widest flex items-center justify-between text-orange-500/60 italic">
                Faltas (Mês)
                <BadgeAlert className="h-3 w-3" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="text-xl sm:text-2xl font-black tracking-tighter text-orange-600">
                0
              </div>
              <p className="text-[8px] text-muted-foreground mt-0.5 uppercase font-bold">Não justificadas</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Demonstrativo de Pagamentos</CardTitle>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" /> Exportar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instrutor</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead className="text-center">Faltas (Injust.)</TableHead>
                    <TableHead className="text-center">Produtividade</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructors.map((inst) => (
                    <TableRow key={inst.instructor_id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{inst.nome}</div>
                        <div className="text-xs text-muted-foreground">{inst.email}</div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="capitalize text-[8px] font-bold px-1.5 py-0">
                          {inst.contract_type === 'FIXED_CLT' ? 'CLT (Fixo)' : 
                           inst.contract_type === 'HOURLY' ? 'Horista' : 
                           inst.contract_type === 'PERCENTAGE' ? 'Percentual' : 'Sócio'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-muted-foreground text-[10px]">—</span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <div className="text-[9px] font-bold text-slate-400 italic">
                          {inst.contract_type === 'HOURLY' && `${inst.details?.count_classes || 0}a`}
                          {inst.contract_type === 'FIXED_CLT' && 'FULL'}
                          {inst.contract_type === 'PERCENTAGE' && `${inst.details?.count_students || 0}p`}
                          {inst.contract_type === 'OWNER' && 'SOCIO'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <span className="font-black tracking-tighter text-emerald-600 text-[13px] tabular-nums">
                          R$ {inst.total_payout?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 gap-1"
                          onClick={() => navigate(`/admin/instructor-payments?month=${selectedMonth}`)}
                        >
                          <Filter className="h-3.5 w-3.5" /> Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {instructors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                        Nenhum instrutor encontrado no período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-sky-100 bg-sky-50/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-500" /> Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Presença confirmada</p>
                    <p className="text-xs text-muted-foreground">Instrutor {instructors[0]?.nome || "X"} - Ontem</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Falta lançada</p>
                    <p className="text-xs text-muted-foreground">Registro de falta injustificada - Há 2 dias</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações do Gestor</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="h-auto flex-col py-4 gap-2"
                onClick={() => {
                  if (instructors.length > 0) {
                    setSelectedInstructor(instructors[0]);
                    setAttendanceOpen(true);
                  } else {
                    toast.error("Nenhum instrutor disponível para lançamento.");
                  }
                }}
              >
                <CalendarIcon className="h-5 w-5 text-primary" />
                <span className="text-xs">Lançar Presenças</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col py-4 gap-2"
                onClick={() => {
                  setContractInstructor(instructors[0] || null);
                  setContractOpen(true);
                }}
              >
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-xs">Ver Contratos</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <AttendanceDialog 
            open={attendanceOpen}
            onOpenChange={setAttendanceOpen}
            instructor={selectedInstructor}
            studioId={studioId}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["instructor-dashboard"] })}
        />

        <InstructorContractModal
            open={contractOpen}
            onOpenChange={setContractOpen}
            instructor={contractInstructor}
            studioId={studioId}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["instructor-dashboard"] })}
        />
      </div>
    </AdminLayout>
  );
}
