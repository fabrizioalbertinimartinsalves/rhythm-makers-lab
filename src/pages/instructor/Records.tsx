import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import InstructorLayout from "@/components/layouts/InstructorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Search, ChevronRight, ChevronDown, FileHeart, Plus, Activity, Camera, Upload, Loader2, Lock,
  Stethoscope, FileText, Target, ClipboardList, Download, CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { uploadFile } from "@/utils/upload";
import PainMap from "@/components/PainMap";
import PosturalCanvas from "@/components/PosturalCanvas";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { cn } from "@/lib/utils";

// Auto-save debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Records() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAluno, setSelectedAluno] = useState<any>(null);
  const [anamneseOpen, setAnamneseOpen] = useState(false);
  const [sessaoOpen, setSessaoOpen] = useState(false);
  const [posturalOpen, setPosturalOpen] = useState(false);
  const [tab, setTab] = useState("prontuario");
  const [posturalImage, setPosturalImage] = useState<string | null>(null);
  const [uploadingPostural, setUploadingPostural] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    anamnese: true,
    postural: true,
    fisico: true,
    objetivos: true,
    evolucao: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { studioId } = useAuth();

  // System labels
  const { data: labels = [] } = useQuery<any[]>({
    queryKey: ["system-labels-sb", studioId, "prontuario"],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_labels")
        .select("*")
        .eq("studio_id", studioId)
        .eq("modulo", "prontuario");
      
      if (error) throw error;
      return data || [];
    },
  });

  const getLabel = (chave: string, fallback: string) => {
    const found = labels.find((l) => l.chave === chave);
    return found?.valor || fallback;
  };

  // Anamnese form
  const [anamneseForm, setAnamneseForm] = useState({
    queixas: [{ local: "", tipo: "", tempo: "" }],
    nivel_dor: 0,
    mapa_dor: {} as Record<string, number>,
    historico_patologias: "",
    medicamentos: "",
    observacoes_clinicas: "",
  });

  // Postural evaluation form
  const [posturalForm, setPosturalForm] = useState({
    cabeca: "",
    cervical: "",
    toracica: "",
    lombar: "",
    quadril: "",
    membros: "",
    observacoes: "",
  });

  // Physical exam form
  const [fisicoForm, setFisicoForm] = useState({
    flexibilidade: "",
    forca_muscular: "",
    testes_especiais: "",
    observacoes: "",
  });

  // Goals form
  const [objetivosForm, setObjetivosForm] = useState({
    curto_prazo: "",
    medio_prazo: "",
    longo_prazo: "",
  });

  // Session form
  const [sessaoForm, setSessaoForm] = useState({
    nivel_dor_antes: 0,
    nivel_dor_depois: 0,
    exercicios_realizados: "",
    observacoes: "",
    humor: "bom",
  });

  // Quick evolution note
  const [evolucaoNota, setEvolucaoNota] = useState("");

  // Auto-save for postural, fisico, objetivos
  const debouncedPostural = useDebounce(posturalForm, 3000);
  const debouncedFisico = useDebounce(fisicoForm, 3000);
  const debouncedObjetivos = useDebounce(objetivosForm, 3000);

  const autoSaveProntuario = useCallback(
    async (tipo: string, conteudo: Record<string, string>) => {
      if (!selectedAluno || !studioId) return;
      const hasContent = Object.values(conteudo).some((v) => v.trim().length > 0);
      if (!hasContent) return;

      setAutoSaveStatus("saving");
      const descricao = JSON.stringify(conteudo);

      // Upsert logic via Supabase
      const { data: existing } = await supabase
        .from("prontuarios")
        .select("id")
        .eq("student_id", selectedAluno.id)
        .eq("tipo", tipo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("prontuarios")
          .update({ 
            descricao,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("prontuarios")
          .insert({
            studio_id: studioId,
            student_id: selectedAluno.id,
            tipo,
            descricao,
            data: new Date().toISOString().split("T")[0],
          });
      }

      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
      queryClient.invalidateQueries({ queryKey: ["prontuarios-sb", selectedAluno.id] });
    },
    [selectedAluno, studioId, queryClient]
  );

  useEffect(() => {
    if (selectedAluno) autoSaveProntuario("avaliacao_postural_texto", debouncedPostural);
  }, [debouncedPostural]);

  useEffect(() => {
    if (selectedAluno) autoSaveProntuario("exame_fisico", debouncedFisico);
  }, [debouncedFisico]);

  useEffect(() => {
    if (selectedAluno) autoSaveProntuario("objetivos", debouncedObjetivos);
  }, [debouncedObjetivos]);

  // Load existing data when selecting a student
  useEffect(() => {
    if (!selectedAluno || !studioId) return;
    const loadDrafts = async () => {
      const types = ["avaliacao_postural_texto", "exame_fisico", "objetivos"];
      const { data, error } = await supabase
        .from("prontuarios")
        .select("*")
        .eq("student_id", selectedAluno.id)
        .in("tipo", types)
        .order("created_at", { ascending: false });

      if (data) {
        const latestByType: Record<string, any> = {};
        for (const p of data) {
          if (!latestByType[p.tipo]) latestByType[p.tipo] = p;
        }

        for (const type in latestByType) {
          try {
            const p = latestByType[type];
            const parsed = JSON.parse(p.descricao);
            if (p.tipo === "avaliacao_postural_texto") setPosturalForm(parsed);
            if (p.tipo === "exame_fisico") setFisicoForm(parsed);
            if (p.tipo === "objetivos") setObjetivosForm(parsed);
          } catch {}
        }
      }
    };
    loadDrafts();
  }, [selectedAluno, studioId]);

  const { data: alunos = [] } = useQuery<any[]>({
    queryKey: ["alunos-records-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("studio_id", studioId)
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: locaisDor = [] } = useQuery<any[]>({
    queryKey: ["locais-dor-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pain_locations")
        .select("*")
        .eq("studio_id", studioId)
        .eq("ativo", true)
        .order("ordem");
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tiposDor = [] } = useQuery<any[]>({
    queryKey: ["tipos-dor-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pain_types")
        .select("*")
        .eq("studio_id", studioId)
        .eq("ativo", true)
        .order("ordem");
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: anamneses = [] } = useQuery<any[]>({
    queryKey: ["anamneses-sb", studioId, selectedAluno?.id],
    enabled: !!studioId && !!selectedAluno,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamneses")
        .select("*")
        .eq("student_id", selectedAluno.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sessoes = [] } = useQuery<any[]>({
    queryKey: ["sessoes-sb", studioId, selectedAluno?.id],
    enabled: !!studioId && !!selectedAluno,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("student_id", selectedAluno.id)
        .order("data", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: prontuarios = [] } = useQuery<any[]>({
    queryKey: ["prontuarios-sb", studioId, selectedAluno?.id],
    enabled: !!studioId && !!selectedAluno,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prontuarios")
        .select("*")
        .eq("student_id", selectedAluno.id)
        .order("data", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const createAnamnese = useMutation({
    mutationFn: async () => {
      if (!studioId || !selectedAluno) return;
      const { error } = await supabase
        .from("anamneses")
        .insert({
          studio_id: studioId,
          student_id: selectedAluno.id,
          nivel_dor: anamneseForm.nivel_dor,
          mapa_dor: anamneseForm.mapa_dor,
          queixas: anamneseForm.queixas,
          historico_patologias: anamneseForm.historico_patologias,
          medicamentos: anamneseForm.medicamentos,
          observacoes_clinicas: anamneseForm.observacoes_clinicas,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamneses-sb"] });
      setAnamneseOpen(false);
      toast.success("Anamnese registrada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createSessao = useMutation({
    mutationFn: async () => {
      if (!studioId || !selectedAluno) return;
      const { error } = await supabase
        .from("sessions")
        .insert({
          studio_id: studioId,
          student_id: selectedAluno.id,
          ...sessaoForm,
          data: new Date().toISOString().split("T")[0],
          horario: new Date().toTimeString().slice(0, 5)
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessoes-sb"] });
      setSessaoOpen(false);
      setSessaoForm({ nivel_dor_antes: 0, nivel_dor_depois: 0, exercicios_realizados: "", observacoes: "", humor: "bom" });
      toast.success("Sessão registrada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addEvolucaoNota = useMutation({
    mutationFn: async () => {
      if (!evolucaoNota.trim() || !studioId || !selectedAluno) return;
      const { error } = await supabase
        .from("prontuarios")
        .insert({
          studio_id: studioId,
          student_id: selectedAluno.id,
          tipo: "evolucao",
          descricao: evolucaoNota.trim(),
          data: new Date().toISOString().split("T")[0],
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuarios-sb"] });
      setEvolucaoNota("");
      toast.success("Nota de evolução adicionada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const savePosturalAssessment = useMutation({
    mutationFn: async (annotatedDataUrl: string) => {
      if (!studioId || !selectedAluno) return;
      setUploadingPostural(true);
      
      const blob = await (await fetch(annotatedDataUrl)).blob();
      const filename = `postural_${Date.now()}.png`;
      const filePath = `evolucao-fotos/${studioId}/${selectedAluno.id}/${filename}`;
      
      const file = new File([blob], filename, { type: "image/png" });
      const publicUrl = await uploadFile(file, filePath);

      const { error } = await supabase
        .from("prontuarios")
        .insert({
          studio_id: studioId,
          student_id: selectedAluno.id,
          tipo: "avaliacao_postural",
          descricao: "Avaliação Postural Fotográfica com anotações de desvios",
          foto_antes_url: posturalImage,
          foto_depois_url: publicUrl,
          data: new Date().toISOString().split("T")[0],
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prontuarios-sb"] });
      setPosturalOpen(false);
      setPosturalImage(null);
      toast.success("Avaliação postural salva!");
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setUploadingPostural(false),
  });

  const handlePosturalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 10MB");
      return;
    }
    setPosturalImage(URL.createObjectURL(file));
  };

  const addQueixa = () => {
    setAnamneseForm((f) => ({ ...f, queixas: [...f.queixas, { local: "", tipo: "", tempo: "" }] }));
  };

  const updateQueixa = (index: number, field: string, value: string) => {
    setAnamneseForm((f) => ({
      ...f,
      queixas: f.queixas.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    }));
  };

  const chartData = sessoes.map((s: any) => ({
    data: new Date(s.data + "T" + (s.horario || "00:00:00")).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    antes: s.nivel_dor_antes,
    depois: s.nivel_dor_depois,
  }));

  const filteredAlunos = alunos.filter((a) =>
    a.nome.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // PDF generation
  const generatePDF = async () => {
    if (!pdfRef.current || !selectedAluno) return;
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, logging: false });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      // Header with studio name
      pdf.setFontSize(18);
      pdf.setTextColor(40, 80, 60);
      pdf.text("Kineos", 105, 15, { align: "center" });
      pdf.setFontSize(10);
      pdf.setTextColor(120);
      pdf.text("Relatório Clínico", 105, 22, { align: "center" });
      pdf.text(`Paciente: ${selectedAluno.nome}`, 105, 28, { align: "center" });
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 105, 34, { align: "center" });

      let heightLeft = imgHeight;
      let position = 40;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - position);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`prontuario_${selectedAluno.nome.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const evolucaoEntries = prontuarios.filter((p: any) => p.tipo === "evolucao");

  if (!selectedAluno) {
    return (
      <InstructorLayout>
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileHeart className="h-5 w-5 text-primary" /> {getLabel("titulo_prontuario", "Prontuários")}
            </h1>
            <p className="text-sm text-muted-foreground">{getLabel("subtitulo_prontuario", "Selecione um aluno para ver seu prontuário")}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="space-y-2">
            {filteredAlunos.map((a) => (
              <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedAluno(a)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {a.foto_url ? (
                        <img src={a.foto_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          {a.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.observacoes_medicas ? "⚠️ Possui restrições" : "Sem restrições médicas"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
            {filteredAlunos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno encontrado</p>
            )}
          </div>
        </div>
      </InstructorLayout>
    );
  }

  return (
    <InstructorLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedAluno(null); }}>
              ← Voltar
            </Button>
            <div>
              <h1 className="text-lg font-bold">{selectedAluno.nome}</h1>
              <p className="text-xs text-muted-foreground">
                {selectedAluno.observacoes_medicas || "Sem observações médicas"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autoSaveStatus === "saving" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Salvando...</span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-xs text-primary flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Salvo</span>
            )}
            <Button size="sm" variant="outline" onClick={generatePDF} disabled={generatingPdf} className="gap-1.5">
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {getLabel("btn_gerar_pdf", "Gerar PDF")}
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Dialog open={anamneseOpen} onOpenChange={setAnamneseOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5"><Stethoscope className="h-4 w-4" /> {getLabel("btn_anamnese", "Anamnese")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Anamnese — {selectedAluno.nome}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createAnamnese.mutate(); }} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Corpo Humano (Mapa de Dor)</Label>
                  <PainMap
                    value={anamneseForm.mapa_dor}
                    onChange={(v) => setAnamneseForm((f) => ({ ...f, mapa_dor: v }))}
                    onPartClick={(partId, partLabel) => {
                      const existing = anamneseForm.queixas.find(q => q.local === partLabel);
                      if (!existing) {
                        setAnamneseForm((f) => ({
                          ...f,
                          queixas: [...f.queixas.filter(q => q.local || q.tipo || q.tempo), { local: partLabel, tipo: "", tempo: "" }],
                        }));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Dor: <span className="font-bold text-primary">{anamneseForm.nivel_dor}</span></Label>
                  <Slider value={[anamneseForm.nivel_dor]} onValueChange={([v]) => setAnamneseForm((f) => ({ ...f, nivel_dor: v }))} max={10} step={1} />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Queixas</Label>
                  {anamneseForm.queixas.map((q, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Queixa {i + 1}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={() => {
                          setAnamneseForm((f) => ({ ...f, queixas: f.queixas.filter((_, idx) => idx !== i) }));
                        }}>✕</Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Select value={q.local} onValueChange={(v) => updateQueixa(i, "local", v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Local" /></SelectTrigger>
                          <SelectContent>
                            {locaisDor.map((l) => <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={q.tipo} onValueChange={(v) => updateQueixa(i, "tipo", v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                          <SelectContent>
                            {tiposDor.map((t) => <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input placeholder="Tempo" className="text-xs" value={q.tempo} onChange={(e) => updateQueixa(i, "tempo", e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addQueixa} className="w-full">+ Adicionar</Button>
                </div>
                <div className="space-y-2">
                  <Label>Histórico Patologias</Label>
                  <Textarea value={anamneseForm.historico_patologias} onChange={(e) => setAnamneseForm((f) => ({ ...f, historico_patologias: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Medicamentos</Label>
                  <Textarea value={anamneseForm.medicamentos} onChange={(e) => setAnamneseForm((f) => ({ ...f, medicamentos: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Observações Clínicas</Label>
                  <Textarea value={anamneseForm.observacoes_clinicas} onChange={(e) => setAnamneseForm((f) => ({ ...f, observacoes_clinicas: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full" disabled={createAnamnese.isPending}>
                  {createAnamnese.isPending ? "Salvando..." : "Salvar Anamnese"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={sessaoOpen} onOpenChange={setSessaoOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Activity className="h-4 w-4" /> Registrar Sessão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Sessão</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createSessao.mutate(); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dor Antes: {sessaoForm.nivel_dor_antes}</Label>
                    <Slider value={[sessaoForm.nivel_dor_antes]} onValueChange={([v]) => setSessaoForm((f) => ({ ...f, nivel_dor_antes: v }))} max={10} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dor Depois: {sessaoForm.nivel_dor_depois}</Label>
                    <Slider value={[sessaoForm.nivel_dor_depois]} onValueChange={([v]) => setSessaoForm((f) => ({ ...f, nivel_dor_depois: v }))} max={10} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Humor</Label>
                  <Select value={sessaoForm.humor} onValueChange={(v) => setSessaoForm((f) => ({ ...f, humor: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bom">😊 Bom</SelectItem>
                      <SelectItem value="regular">😐 Regular</SelectItem>
                      <SelectItem value="ruim">😔 Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Exercícios</Label>
                  <Textarea value={sessaoForm.exercicios_realizados} onChange={(e) => setSessaoForm((f) => ({ ...f, exercicios_realizados: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={sessaoForm.observacoes} onChange={(e) => setSessaoForm((f) => ({ ...f, observacoes: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full" disabled={createSessao.isPending}>
                  {createSessao.isPending ? "Salvando..." : "Salvar Sessão"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={posturalOpen} onOpenChange={setPosturalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5"><Camera className="h-4 w-4" /> Foto Postural</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Avaliação Fotográfica</DialogTitle></DialogHeader>
              {!posturalImage ? (
                <div className="space-y-3">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm">Clique para enviar</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePosturalFileChange} />
                </div>
              ) : (
                <div className="space-y-3">
                  <PosturalCanvas imageUrl={posturalImage} onSave={(url) => savePosturalAssessment.mutate(url)} />
                  {uploadingPostural && <p className="text-center text-xs animate-pulse">Enviando foto...</p>}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div ref={pdfRef} className="space-y-4">
          <Collapsible open={openSections.anamnese} onOpenChange={() => toggleSection("anamnese")}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" /> Anamnese
                  </CardTitle>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", !openSections.anamnese && "-rotate-90")} />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {anamneses.map((a: any) => (
                    <div key={a.id} className="border rounded-lg p-3 text-xs space-y-2">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>{formatDate(a.created_at)}</span>
                        <Badge>Dor: {a.nivel_dor}/10</Badge>
                      </div>
                      {a.historico_patologias && <p><strong>Patologias:</strong> {a.historico_patologias}</p>}
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={openSections.postural} onOpenChange={() => toggleSection("postural")}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" /> Avaliação Postural
                  </CardTitle>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", !openSections.postural && "-rotate-90")} />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px uppercase]">Cabeça</Label>
                      <Input value={posturalForm.cabeca} onChange={(e) => setPosturalForm({ ...posturalForm, cabeca: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px uppercase]">Cervical</Label>
                      <Input value={posturalForm.cervical} onChange={(e) => setPosturalForm({ ...posturalForm, cervical: e.target.value })} />
                    </div>
                  </div>
                  <Textarea placeholder="Obs Posturais" value={posturalForm.observacoes} onChange={(e) => setPosturalForm({ ...posturalForm, observacoes: e.target.value })} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={openSections.evolucao} onOpenChange={() => toggleSection("evolucao")}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Evolução por Sessão
                  </CardTitle>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", !openSections.evolucao && "-rotate-90")} />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex gap-2">
                    <Textarea value={evolucaoNota} onChange={(e) => setEvolucaoNota(e.target.value)} placeholder="Nota rápida..." />
                    <Button size="sm" onClick={() => addEvolucaoNota.mutate()} disabled={!evolucaoNota.trim()}><Plus className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="prontuario" className="flex-1">Linha do Tempo</TabsTrigger>
            <TabsTrigger value="evolucao" className="flex-1">Gráficos</TabsTrigger>
          </TabsList>
          <TabsContent value="evolucao" className="mt-4">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <XAxis dataKey="data" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="depois" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-10">Dados insuficientes para gráfico.</p>
            )}
          </TabsContent>
          <TabsContent value="prontuario" className="mt-4 space-y-2">
            {prontuarios.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <Badge variant="outline" className="text-[10px]">{p.tipo}</Badge>
                    <span className="text-[10px] text-muted-foreground">{formatDate(p.created_at)}</span>
                  </div>
                  <p>{p.descricao}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </InstructorLayout>
  );
}
