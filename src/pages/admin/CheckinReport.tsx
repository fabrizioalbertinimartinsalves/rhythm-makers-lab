import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Download, Loader2, CalendarDays, Users, QrCode, ClipboardCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function CheckinReport() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [turmaFilter, setTurmaFilter] = useState("all");

  const { studioId } = useAuth();

  const { data: turmas = [] } = useQuery<any[]>({
    queryKey: ["turmas-checkin-report", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          *,
          modalities ( id, nome, emoji )
        `)
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: presencas = [], isLoading: loadingPresencas } = useQuery<any[]>({
    queryKey: ["checkin-report-students", studioId, dateFrom, dateTo, turmaFilter],
    enabled: !!studioId,
    queryFn: async () => {
      let query = supabase
        .from("presences")
        .select(`
          *,
          classes ( id, nome, modalities ( emoji ) ),
          profiles ( id, nome )
        `)
        .eq("studio_id", studioId)
        .gte("data", dateFrom)
        .lte("data", dateTo)
        .eq("presente", true)
        .order("data", { ascending: false });

      if (turmaFilter !== "all") {
        query = query.eq("class_id", turmaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: instructorCheckins = [], isLoading: loadingInstructors } = useQuery<any[]>({
    queryKey: ["checkin-report-instructors", studioId, dateFrom, dateTo, turmaFilter],
    enabled: !!studioId,
    queryFn: async () => {
      let query = supabase
        .from("class_occurrences")
        .select(`
          *,
          classes ( id, nome, modalities ( emoji ) ),
          scheduled:profiles!scheduled_instructor_id ( id, nome ),
          actual:profiles!actual_instructor_id ( id, nome )
        `)
        .eq("studio_id", studioId)
        .gte("occurrence_date", dateFrom)
        .lte("occurrence_date", dateTo)
        .order("occurrence_date", { ascending: false });

      if (turmaFilter !== "all") {
        query = query.eq("class_id", turmaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Student Stats
  const totalCheckinsAlunos = presencas.length;
  const uniqueStudents = new Set(presencas.map((p: any) => p.student_id || p.profiles?.nome)).size;

  // Instructor Stats
  const totalAulas = instructorCheckins.length;
  const totalChekinInstrutores = instructorCheckins.filter(c => c.status === 'completed').length;
  const totalPendentes = instructorCheckins.filter(c => c.status === 'scheduled').length;

  const exportCSV = () => {
    const header = "Data,Horário Check-in,Aluno,Turma\n";
    const rows = presencas.map((p: any) => {
      const checkinTime = p.checkin_at ? new Date(p.checkin_at) : null;
      const timeStr = checkinTime ? checkinTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-";
      return `${p.data},${timeStr},${p.profiles?.nome || "-"},${p.classes?.nome || "-"}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checkins_alunos_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // QR code URL
  const getQrUrl = (turmaId: string) => {
    const origin = window.location.origin;
    const publicBaseUrl = origin.includes("id-preview--")
      ? "https://ateliedocorpo.lovable.app"
      : origin;

    return new URL(`/student/checkin/${turmaId}`, publicBaseUrl).toString();
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" /> Auditoria de Check-ins
            </h1>
            <p className="text-muted-foreground">Monitoramento de presença de alunos e instrutores</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Exportar Alunos
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-wrap gap-4 items-end pt-6">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Turma</Label>
              <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {turmas.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.modalities?.emoji} {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="instrutores" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="instrutores" className="gap-2">
              <ClipboardCheck className="h-4 w-4" /> Instrutores
            </TabsTrigger>
            <TabsTrigger value="alunos" className="gap-2">
              <Users className="h-4 w-4" /> Alunos
            </TabsTrigger>
          </TabsList>

          {/* ===== INSTRUTORES ===== */}
          <TabsContent value="instrutores" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <CalendarDays className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{totalChekinInstrutores}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Realizados</p>
                </CardContent>
              </Card>
              <Card className={totalPendentes > 0 ? "border-amber-200 bg-amber-50" : ""}>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className={`h-5 w-5 ${totalPendentes > 0 ? "text-amber-500" : "text-muted-foreground"} mx-auto mb-1`} />
                  <p className={`text-2xl font-bold ${totalPendentes > 0 ? "text-amber-700" : ""}`}>{totalPendentes}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Pendentes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <ClipboardCheck className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{totalAulas}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total de Aulas</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                {loadingInstructors ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : instructorCheckins.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma aula encontrada no período</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Aula</TableHead>
                          <TableHead>Instrutor</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {instructorCheckins.map((occ: any) => {
                          const checkinTime = occ.checkin_time ? new Date(occ.checkin_time) : null;
                          return (
                            <TableRow key={occ.id}>
                              <TableCell className="text-sm py-2">
                                <div className="flex flex-col">
                                  <span>{new Date(occ.occurrence_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">{(occ.start_time || "").slice(0, 5)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                <span className="font-medium">{occ.classes?.nome || "—"}</span>
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                {occ.status === 'completed' 
                                  ? ((occ.actual as any)?.nome || "—") 
                                  : <span className="text-muted-foreground italic">{((occ.scheduled as any)?.nome || "—") + " (Pnd)"}</span>
                                }
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                {checkinTime
                                  ? checkinTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                <Badge variant={occ.status === 'completed' ? 'default' : 'outline'}>
                                  {occ.status === 'completed' ? 'Concluído' : 'Pendente'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ALUNOS ===== */}
          <TabsContent value="alunos" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{totalCheckinsAlunos}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Alunos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{uniqueStudents}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Alunos Únicos</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" /> QR Codes das Turmas
                </CardTitle>
                <CardDescription>Para check-in de alunos no estúdio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {turmas.map((t: any) => (
                    <Dialog key={t.id}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <QrCode className="h-3.5 w-3.5" />
                          {t.modalities?.emoji} {t.nome}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle className="text-center">
                            {t.modalities?.emoji} {t.nome}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                          <QRCodeSVG
                            value={getQrUrl(t.id)}
                            size={220}
                            level="H"
                            includeMargin
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            Alunos escaneiam este QR Code para confirmar presença
                          </p>
                          <Button variant="outline" size="sm" onClick={() => window.print()}>
                            Imprimir QR Code
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {loadingPresencas ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : presencas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum check-in encontrado no período</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Aluno</TableHead>
                          <TableHead>Turma</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {presencas.map((p: any) => {
                          const checkinTime = p.checkin_at ? new Date(p.checkin_at) : null;
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="text-sm py-2">
                                {new Date(p.data + "T00:00:00").toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-sm py-2">
                                {checkinTime
                                  ? checkinTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-sm font-medium py-2">{p.profiles?.nome || "—"}</TableCell>
                              <TableCell className="text-sm py-2">
                                {p.classes?.modalities?.emoji} {p.classes?.nome || "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
