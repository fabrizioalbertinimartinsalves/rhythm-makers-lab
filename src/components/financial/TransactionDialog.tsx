import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDialog({ open, onOpenChange }: TransactionDialogProps) {
  const { studioId } = useAuth() as any;
  const queryClient = useQueryClient();

  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = useState<"pago" | "pendente">("pago");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["financial-categories", studioId],
    enabled: !!studioId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["financial-accounts", studioId],
    enabled: !!studioId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const resetForm = () => {
    setType("income");
    setAmount("");
    setDescription("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setStatus("pago");
    setCategoryId("");
    setAccountId("");
  };

  const createTransaction = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("financial_transactions").insert([
        {
          studio_id: studioId,
          type,
          amount: Number(amount),
          description,
          date,
          status,
          category_id: categoryId || null,
          account_id: accountId || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(type === "income" ? "Receita adicionada com sucesso" : "Despesa adicionada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-overdue"] });
      queryClient.invalidateQueries({ queryKey: ["financial-dre"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-tx"] });
      
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao adicionar lançamento");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Insira um valor válido");
      return;
    }
    if (!description) {
      toast.error("Informe a descrição");
      return;
    }
    createTransaction.mutate();
  };

  const filteredCategories = categories.filter((c: any) => c.tipo === type || c.tipo === "ambos");

  // Definir primeira conta como default caso accountId esteja vazio e a lista tenha itens
  if (accounts.length > 0 && !accountId && open) {
    setAccountId(accounts[0].id);
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
            <DialogDescription>
              Adicione uma nova receita ou despesa manual ao fluxo de caixa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(val: any) => {
                  setType(val);
                  setCategoryId("");
                }}>
                  <SelectTrigger className={type === "income" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita (+)</SelectItem>
                    <SelectItem value="expense">Despesa (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Efetuado (Pago)</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Pagamento de Luz, Venda Avulsa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <Select value={accountId} onValueChange={setAccountId} disabled={loadingAccounts}>
                <SelectTrigger>
                  <SelectValue placeholder="Caixa Principal" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.nome}
                    </SelectItem>
                  ))}
                  {accounts.length === 0 && <SelectItem value="default" disabled>Nenhuma conta cadastrada</SelectItem>}
                </SelectContent>
              </Select>
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createTransaction.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTransaction.isPending} className="bg-primary">
              {createTransaction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Lançamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
