import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/components/layouts/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Percent,
  DollarSign,
  Calendar,
  MoreHorizontal
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const partnerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().min(0, "Valor deve ser positivo"),
  is_active: z.boolean().default(true),
  contract_expiry: z.string().optional().nullable(),
});

type PartnerFormValues = z.infer<typeof partnerSchema>;

export default function Partners() {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: "",
      discount_type: "percentage",
      discount_value: 0,
      is_active: true,
      contract_expiry: null,
    },
  });

  const resetForm = () => {
    setEditingPartner(null);
    form.reset({
      name: "",
      discount_type: "percentage",
      discount_value: 0,
      is_active: true,
      contract_expiry: null,
    });
  };

  // Queries
  const { data: partners, isLoading } = useQuery({
    queryKey: ["partners", studioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("studio_id", studioId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!studioId,
  });

  // Mutations
  const upsertMutation = useMutation({
    mutationFn: async (values: PartnerFormValues) => {
      if (editingPartner) {
        const { error } = await supabase
          .from("partners")
          .update({ ...values, studio_id: studioId })
          .eq("id", editingPartner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("partners")
          .insert([{ ...values, studio_id: studioId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success(editingPartner ? "Parceiro atualizado!" : "Parceiro cadastrado!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar parceiro: " + err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Parceiro removido!");
    },
  });


  const onEdit = (partner: any) => {
    setEditingPartner(partner);
    form.reset({
      name: partner.name,
      discount_type: partner.discount_type,
      discount_value: partner.discount_value,
      is_active: partner.is_active,
      contract_expiry: partner.contract_expiry ? partner.contract_expiry.split('T')[0] : null,
    });
    setIsDialogOpen(true);
  };

  const filteredPartners = partners?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">
              Convênios & Parcerias
            </h1>
            <p className="text-slate-500 font-medium">
              Gerencie descontos para empresas e organizações parceiras.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#3F936C] hover:bg-[#2F7352] text-white rounded-2xl px-6 font-bold shadow-lg shadow-green-900/20 gap-2 h-12">
                <Plus className="h-5 w-5" /> Novo Parceiro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic uppercase">
                  {editingPartner ? "Editar Parceiro" : "Cadastrar Parceiro"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => upsertMutation.mutate(v))} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">Nome / Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: OAB, SESC, Empresa XPTO" {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="discount_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-slate-700">Tipo Desconto</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discount_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-slate-700">Valor</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} className="rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contract_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">Válido até (Opcional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 bg-slate-50/50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-bold">Parceria Ativa</FormLabel>
                          <div className="text-sm text-slate-500">
                            Disponibiliza este convênio no wizard de matrícula.
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-[#3F936C] hover:bg-[#2F7352] text-white rounded-2xl h-12 font-bold transition-all active:scale-95"
                      disabled={upsertMutation.isPending}
                    >
                      {upsertMutation.isPending ? "Salvando..." : (editingPartner ? "Salvar Alterações" : "Cadastrar Parceiro")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar parceiro por nome..." 
                className="pl-10 rounded-2xl border-slate-200 focus:ring-[#3F936C] h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 h-14">Nome</TableHead>
                  <TableHead className="font-bold text-slate-700">Desconto</TableHead>
                  <TableHead className="font-bold text-slate-700">Expiração</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right w-20 px-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-slate-400">
                      Carregando parceiros...
                    </TableCell>
                  </TableRow>
                ) : filteredPartners?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-slate-400">
                      Nenhum parceiro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPartners?.map((partner) => (
                    <TableRow key={partner.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-slate-900 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                            <Building2 className="h-5 w-5" />
                          </div>
                          {partner.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100 px-3 py-1 rounded-lg font-bold gap-1.5 capitalize">
                          {partner.discount_type === 'percentage' ? (
                            <>
                              <Percent className="h-3 w-3" /> {partner.discount_value}%
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-3 w-3" /> R$ {partner.discount_value.toFixed(2)}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        {partner.contract_expiry ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(partner.contract_expiry), "dd 'de' MMM, yyyy", { locale: ptBR })}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">Sem expiração</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {partner.is_active ? (
                          <Badge className="bg-emerald-500 text-white border-transparent px-3 py-1 rounded-full font-bold uppercase text-[10px] gap-1 shadow-sm shadow-emerald-500/20">
                            <CheckCircle className="h-3 w-3" /> Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 px-3 py-1 rounded-full font-bold uppercase text-[10px] gap-1">
                            <XCircle className="h-3 w-3" /> Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl w-40">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(partner)} className="gap-2 focus:bg-[#3F936C] focus:text-white rounded-xl">
                              <Edit2 className="h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                if (confirm("Deseja realmente excluir este parceiro?")) {
                                  deleteMutation.mutate(partner.id);
                                }
                              }}
                              className="gap-2 text-red-500 focus:bg-red-500 focus:text-white rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
