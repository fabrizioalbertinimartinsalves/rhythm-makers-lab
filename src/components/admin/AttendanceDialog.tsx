import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { instructorService } from "@/features/instructors/instructorService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: any;
  studioId: string;
  onSuccess?: () => void;
}

export default function AttendanceDialog({ 
  open, 
  onOpenChange, 
  instructor, 
  studioId, 
  onSuccess 
}: AttendanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "present" as any,
    justification_text: "",
    class_id: "" // In a real scenario, this would come from a selected class
  });

  const handleSubmit = async () => {
    if (!form.class_id) {
        toast.error("Selecione uma turma.");
        return;
    }
    if (form.status === "justified_absence" && !form.justification_text) {
      toast.error("Justificativa é obrigatória para faltas justificadas.");
      return;
    }

    setLoading(true);
    try {
      await instructorService.logAttendance({
        studio_id: studioId,
        instructor_id: instructor.id,
        ...form
      });
      toast.success("Presença registrada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Erro ao registrar presença: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar Presença: {instructor?.nome}</DialogTitle>
          <DialogDescription>
            Registre o status do profissional para uma aula específica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <input 
              type="date" 
              className="w-full p-2 border rounded-md" 
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Turma / Aula (ID provisório)</Label>
            <input 
              type="text" 
              placeholder="UUID da Turma"
              className="w-full p-2 border rounded-md" 
              value={form.class_id}
              onChange={(e) => setForm({ ...form, class_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Presente</SelectItem>
                <SelectItem value="justified_absence">Falta Justificada</SelectItem>
                <SelectItem value="unjustified_absence">Falta Injustificada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(form.status === "justified_absence" || form.status === "unjustified_absence") && (
            <div className="space-y-2">
              <Label>Justificativa {form.status === "justified_absence" && "*"}</Label>
              <Textarea 
                placeholder="Descreva o motivo da falta..."
                value={form.justification_text}
                onChange={(e) => setForm({ ...form, justification_text: e.target.value })}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirmar Lançamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
