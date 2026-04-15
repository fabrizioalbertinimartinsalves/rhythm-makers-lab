import { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { instructorService, InstructorContractType } from "@/features/instructors/instructorService";
import { toast } from "sonner";
import { Loader2, DollarSign, Percent, Clock } from "lucide-react";

interface InstructorContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: any;
  studioId: string;
  onSuccess?: () => void;
}

export default function InstructorContractModal({ 
  open, onOpenChange, instructor, studioId, onSuccess 
}: InstructorContractModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    contract_type_v2: "FIXED_CLT" as InstructorContractType,
    base_salary: 0,
    hourly_rate: 0,
    commission_rate: 0,
    product_commission_rate: 0
  });

  async function loadContract() {
    setLoading(true);
    try {
      const data = await instructorService.getContract(studioId, instructor.instructor_id || instructor.id);
      if (data) {
        setFormData({
          contract_type_v2: data.contract_type_v2 || "FIXED_CLT",
          base_salary: data.base_salary || 0,
          hourly_rate: data.hourly_rate || 0,
          commission_rate: data.commission_rate || 0,
          product_commission_rate: data.product_commission_rate || 0
        });
      }
    } catch (error) {
      console.error("Erro ao carregar contrato:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && instructor) {
      loadContract();
    }
  }, [open, instructor]);

  async function handleSave() {
    setSaving(true);
    try {
      await instructorService.saveContract({
        studio_id: studioId,
        user_id: instructor.instructor_id || instructor.id,
        ...formData
      });
      toast.success("Contrato atualizado com sucesso!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error("Erro ao salvar contrato: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Contrato: {instructor?.nome}</DialogTitle>
          <DialogDescription>
            Defina o modelo de remuneração e as bases de cálculo para o fechamento mensal.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Modelo de Contrato</Label>
              <Select 
                value={formData.contract_type_v2} 
                onValueChange={(v: any) => setFormData(prev => ({ ...prev, contract_type_v2: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED_CLT">CLT / Fixo Mensal</SelectItem>
                  <SelectItem value="HOURLY">Horista (por Aula)</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentual (por Aluno)</SelectItem>
                  <SelectItem value="OWNER">Sócio / Dono</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.contract_type_v2 === 'FIXED_CLT' && (
              <div className="grid gap-2">
                <Label htmlFor="salary" className="flex items-center gap-2"><DollarSign className="h-3 w-3" /> Salário Base (Fixo)</Label>
                <Input 
                  id="salary" 
                  type="number" 
                  value={formData.base_salary} 
                  onChange={(e) => setFormData(prev => ({ ...prev, base_salary: Number(e.target.value) }))}
                />
              </div>
            )}

            {formData.contract_type_v2 === 'HOURLY' && (
              <div className="grid gap-2">
                <Label htmlFor="rate" className="flex items-center gap-2"><Clock className="h-3 w-3" /> Valor por Aula (v2)</Label>
                <Input 
                  id="rate" 
                  type="number" 
                  value={formData.hourly_rate} 
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: Number(e.target.value) }))}
                />
              </div>
            )}

            {formData.contract_type_v2 === 'PERCENTAGE' && (
              <div className="grid gap-2">
                <Label htmlFor="commission" className="flex items-center gap-2"><Percent className="h-3 w-3" /> Valor Fixo por Aluno Presente</Label>
                <Input 
                  id="commission" 
                  type="number" 
                  value={formData.commission_rate} 
                  onChange={(e) => setFormData(prev => ({ ...prev, commission_rate: Number(e.target.value) }))}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="product" className="flex items-center gap-2"><Percent className="h-3 w-3" /> Comissão s/ Vendas (%)</Label>
              <Input 
                id="product" 
                type="number" 
                value={formData.product_commission_rate} 
                onChange={(e) => setFormData(prev => ({ ...prev, product_commission_rate: Number(e.target.value) }))}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
