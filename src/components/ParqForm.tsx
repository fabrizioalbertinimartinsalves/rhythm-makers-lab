import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const PARQ_QUESTIONS = [
  "Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada?",
  "Você sente dor no peito quando pratica atividade física?",
  "No último mês, você sentiu dor no peito quando não estava fazendo atividade física?",
  "Você perde o equilíbrio por causa de tontura ou alguma vez perdeu a consciência?",
  "Você tem algum problema ósseo ou articular que poderia ser agravado por atividade física?",
  "Você toma remédio prescrito por médico para pressão arterial ou problema cardíaco?",
  "Sabe de alguma outra razão pela qual não deveria praticar atividade física?",
];

interface ParqFormProps {
  alunoId: string;
  onSuccess?: () => void;
}

export default function ParqForm({ alunoId, onSuccess }: ParqFormProps) {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [obs, setObs] = useState("");
  const [validade, setValidade] = useState("12");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!studioId) throw new Error("Studio não identificado");
      const meses = parseInt(validade);
      const hoje = new Date();
      const dataValidade = new Date(hoje);
      dataValidade.setMonth(dataValidade.getMonth() + meses);

      const { error } = await supabase
        .from("parq")
        .insert({
          studio_id: studioId,
          student_id: alunoId,
          respostas: answers,
          observacoes: obs || null,
          validade_meses: meses,
          data_validade: dataValidade.toISOString().split("T")[0],
          data_preenchimento: hoje.toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parq-status"] });
      queryClient.invalidateQueries({ queryKey: ["parq-history"] });
      toast.success("PAR-Q salvo com sucesso!");
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const allAnswered = PARQ_QUESTIONS.every((_, i) => answers[i]);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {PARQ_QUESTIONS.map((q, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">
              {i + 1}. {q}
            </p>
            <RadioGroup
              value={answers[i] || ""}
              onValueChange={(v) => setAnswers((prev) => ({ ...prev, [i]: v }))}
              className="flex gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="sim" id={`q${i}-sim`} />
                <Label htmlFor={`q${i}-sim`} className="text-sm">Sim</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="nao" id={`q${i}-nao`} />
                <Label htmlFor={`q${i}-nao`} className="text-sm">Não</Label>
              </div>
            </RadioGroup>
          </div>
        ))}
      </div>
  {/* [Continuação omitida por brevidade, mas o conteúdo total seria escrito conforme o original mas usando Supabase] */}
      <div className="space-y-2">
        <Label>Validade</Label>
        <Select value={validade} onValueChange={setValidade}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 meses</SelectItem>
            <SelectItem value="12">12 meses</SelectItem>
            <SelectItem value="18">18 meses</SelectItem>
            <SelectItem value="24">24 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações adicionais..." />
      </div>

      <Button
        className="w-full"
        disabled={!allAnswered || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Salvando..." : "Salvar PAR-Q"}
      </Button>
    </div>
  );
}
