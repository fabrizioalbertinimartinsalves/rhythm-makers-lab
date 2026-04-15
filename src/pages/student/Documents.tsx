import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import StudentLayout from "@/components/layouts/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, CheckCircle2, Clock, Calendar, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePostSaleAutomation } from "@/hooks/usePostSaleAutomation";
import { toast } from "sonner";
import { useState } from "react";
import SignatureCanvas from "@/components/SignatureCanvas";

export default function Documents() {
  const { user, studioId } = useAuth();
  const { projectInstallments } = usePostSaleAutomation();
  const queryClient = useQueryClient();
  const [signingContract, setSigningContract] = useState<any>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ["my-student-sb", user?.id, studioId],
    enabled: !!user?.id && !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("studio_id", studioId)
        .eq("user_id", user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: contratos = [], isLoading } = useQuery<any[]>({
    queryKey: ["my-contratos-sb", student?.id],
    enabled: !!student?.id && !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          plans ( * )
        `)
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const signMutation = useMutation({
    mutationFn: async ({ contractId, signature }: { contractId: string; signature: string }) => {
      // 1. Buscar IP do usuário
      let ip = "0.0.0.0";
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const json = await res.json();
        ip = json.ip;
      } catch (e) { console.warn("Erro ao obter IP:", e); }

      // 2. Atualizar contrato
      const { error } = await supabase
        .from("contracts")
        .update({
          assinado_em: new Date().toISOString(),
          status: "ativo",
          assinatura_url: signature,
          ip_assinatura: ip,
          metadata_assinatura: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            platform: navigator.platform
          }
        })
        .eq("id", contractId);
      
      if (error) throw error;

      // 3. Projetar financeiro
      const { data: contract } = await supabase
        .from("contracts")
        .select("*, plans(valor)")
        .eq("id", contractId)
        .single();

      if (contract && contract.plan_id && contract.plans?.valor) {
        await projectInstallments({
          studioId,
          studentId: contract.student_id,
          planId: contract.plan_id,
          valor: Number(contract.plans.valor),
          dataInicio: contract.data_inicio || new Date().toISOString().split('T')[0],
          formaPagamento: "cartao", // Assumindo cartão para app aluno ou a combinar
          contractId: contract.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-contratos-sb"] });
      setSigningContract(null);
      setSignatureData(null);
      toast.success("Contrato assinado com sucesso! ✅");
    },
    onError: (e: any) => toast.error("Erro ao assinar: " + e.message),
  });

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
    ativo: { label: "Contrato OK ✅", variant: "default", icon: CheckCircle2 },
    pendente: { label: "Pendente Assinatura", variant: "secondary", icon: PenLine },
    cancelado: { label: "Cancelado", variant: "destructive", icon: FileText },
    expirado: { label: "Expirado", variant: "outline", icon: Clock },
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  };

  const getDaysRemaining = (dataFim: string | null) => {
    if (!dataFim) return null;
    const end = new Date(dataFim + "T00:00:00");
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <StudentLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Meus Contratos
          </h1>
          <p className="text-sm text-muted-foreground">Visualize, assine e baixe seus contratos</p>
        </div>

        {isLoading || loadingStudent ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : contratos.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum contrato encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contratos.map((c: any) => {
              const st = statusMap[c.status] || statusMap.pendente;
              const StIcon = st.icon;
              const daysLeft = getDaysRemaining(c.data_fim);
              const needsSignature = c.status === "pendente" && !c.assinado_em;

              return (
                <Card key={c.id} className={needsSignature ? "border-warning/40 bg-warning/5" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <StIcon className="h-4 w-4 shrink-0" />
                          {c.plans?.nome || "Contrato Avulso"}
                        </p>
                        <Badge variant={st.variant} className="text-[10px] mt-1">
                          {st.label}
                        </Badge>
                      </div>
                      {c.corpo_texto && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() => {
                            const doc = new jsPDF();
                            const pw = doc.internal.pageSize.getWidth();
                            const m = 20;
                            doc.setFontSize(18);
                            doc.setFont("helvetica", "bold");
                            doc.text("CONTRATO", pw / 2, 25, { align: "center" });
                            doc.setFontSize(10);
                            doc.setFont("helvetica", "normal");
                            doc.text(`Plano: ${c.plans?.nome || "—"}`, m, 40);
                            doc.text(`Vigência: ${formatDate(c.data_inicio)} a ${formatDate(c.data_fim)}`, m, 47);
                            doc.line(m, 54, pw - m, 54);
                            const lines = doc.splitTextToSize(c.corpo_texto, pw - m * 2);
                            let y = 62;
                            for (const line of lines) {
                              if (y > 270) { doc.addPage(); y = 20; }
                              doc.text(line, m, y);
                              y += 5;
                            }
                            if (c.assinatura_url) {
                              try { doc.addImage(c.assinatura_url, "PNG", m, y + 10, 60, 25); } catch {}
                            }
                            doc.save(`contrato-${c.data_inicio}.pdf`);
                          }}
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </Button>
                      )}
                    </div>

                    {/* Vigência */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-muted p-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Início</p>
                        <p className="text-xs font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(c.data_inicio)}
                        </p>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Término</p>
                        <p className="text-xs font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(c.data_fim)}
                        </p>
                      </div>
                    </div>

                    {/* Days remaining */}
                    {daysLeft !== null && c.status === "ativo" && (
                      <p className={`text-xs font-medium ${daysLeft <= 30 ? "text-warning" : "text-primary"}`}>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {daysLeft > 0 ? `${daysLeft} dias restantes` : "Contrato vencido"}
                      </p>
                    )}

                    {/* Signed info */}
                    {c.assinado_em && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Assinado em {new Date(c.assinado_em).toLocaleDateString("pt-BR")} às {new Date(c.assinado_em).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {c.ip_assinatura && (
                          <p className="text-[9px] text-muted-foreground ml-4 italic">
                            IP: {c.ip_assinatura}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Sign button */}
                    {needsSignature && (
                      <Button
                        className="w-full gap-2"
                        onClick={() => setSigningContract(c)}
                      >
                        <PenLine className="h-4 w-4" /> Assinar Contrato
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Signing Dialog */}
        <Dialog open={!!signingContract} onOpenChange={(open) => !open && setSigningContract(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenLine className="h-5 w-5 text-primary" /> Assinar Contrato
              </DialogTitle>
              <DialogDescription>
                Ao aceitar, você confirma que leu e concorda com os termos do contrato abaixo.
              </DialogDescription>
            </DialogHeader>

            {signingContract && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <p className="text-sm font-medium">{signingContract.plans?.nome || "Contrato Avulso"}</p>
                  <p className="text-xs text-muted-foreground">
                    Vigência: {formatDate(signingContract.data_inicio)} a {formatDate(signingContract.data_fim)}
                  </p>
                  {signingContract.corpo_texto && (
                    <div className="max-h-40 overflow-y-auto rounded bg-muted p-3 mt-2">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {signingContract.corpo_texto}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Sua Assinatura *</Label>
                  <SignatureCanvas onSignature={setSignatureData} height={120} />
                </div>

                <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs text-foreground">
                    ✅ Ao clicar em "Aceitar e Assinar", você declara que:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc pl-4">
                    <li>Leu e compreendeu os termos do contrato</li>
                    <li>Concorda com as condições financeiras estabelecidas</li>
                    <li>Aceita as regras e políticas do estúdio</li>
                  </ul>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSigningContract(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => signingContract && signatureData && signMutation.mutate({ contractId: signingContract.id, signature: signatureData })}
                disabled={signMutation.isPending || !signatureData}
                className="gap-2"
              >
                {signMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Aceitar e Assinar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
}
