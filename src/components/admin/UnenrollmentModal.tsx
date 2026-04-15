import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Trash2, UserMinus } from "lucide-react";

interface UnenrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  onConfirm: (data: { type: 'inactivate' | 'delete', cancelInvoices: boolean }) => void;
  isPending?: boolean;
}

export function UnenrollmentModal({
  open,
  onOpenChange,
  studentName,
  onConfirm,
  isPending
}: UnenrollmentModalProps) {
  const [type, setType] = useState<'inactivate' | 'delete'>('inactivate');
  const [cancelInvoices, setCancelInvoices] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black uppercase italic tracking-tighter text-xl">
            <UserMinus className="h-5 w-5 text-primary" />
            Remover da Turma
          </DialogTitle>
          <DialogDescription className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Como você deseja processar a saída de <span className="text-slate-900">{studentName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <RadioGroup 
            value={type} 
            onValueChange={(v) => setType(v as 'inactivate' | 'delete')}
            className="grid gap-4"
          >
            <div 
              className={`flex items-start space-x-3 space-y-0 rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-md ${type === 'inactivate' ? 'bg-primary/5 border-primary/50 ring-1 ring-primary/20' : 'bg-slate-50 border-slate-100 opacity-60'}`}
              onClick={() => setType('inactivate')}
            >
              <RadioGroupItem value="inactivate" id="inactivate" className="mt-1" />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="inactivate" className="font-black text-[11px] uppercase tracking-widest cursor-pointer">
                  Inativar Matrícula (Recomendado)
                </Label>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Preserva o histórico de presenças e faturas. O aluno não aparecerá mais na grade nem na chamada.
                </p>
              </div>
            </div>

            <div 
              className={`flex items-start space-x-3 space-y-0 rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-md ${type === 'delete' ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}
              onClick={() => setType('delete')}
            >
              <RadioGroupItem value="delete" id="delete" className="mt-1" />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="delete" className="font-black text-[11px] uppercase tracking-widest cursor-pointer flex items-center gap-1.5 text-rose-600">
                  Excluir Permanentemente <AlertTriangle className="h-3 w-3" />
                </Label>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Remove totalmente o vínculo. Use apenas em caso de erro de cadastro ou duplicidade. 
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="flex items-center space-x-3 bg-slate-100/50 p-4 rounded-2xl border border-slate-200/50">
            <Checkbox 
              id="cancelInvoices" 
              checked={cancelInvoices} 
              onCheckedChange={(checked) => setCancelInvoices(!!checked)} 
              className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label 
              htmlFor="cancelInvoices" 
              className="text-[10px] font-black uppercase tracking-tight leading-none cursor-pointer text-slate-600"
            >
              Cancelar faturas "Pendente" vinculadas
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            disabled={isPending}
            className="flex-1 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-100"
          >
            Voltar
          </Button>
          <Button 
            variant={type === 'delete' ? 'destructive' : 'default'} 
            onClick={() => onConfirm({ type, cancelInvoices })}
            disabled={isPending}
            className={`flex-[2] rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 h-11 shadow-lg transition-all ${type === 'inactivate' ? 'bg-slate-950 hover:bg-slate-800' : 'bg-rose-500 hover:bg-rose-600'}`}
          >
            {isPending ? 'Sincronizando...' : (
              <>
                {type === 'delete' ? <Trash2 className="h-3.5 w-3.5" /> : <UserMinus className="h-3.5 w-3.5 text-primary" />}
                Confirmar {type === 'delete' ? 'Exclusão' : 'Inativação'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
