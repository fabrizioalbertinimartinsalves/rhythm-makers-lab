import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { RegistrationData } from "@/pages/Registration";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronRight } from "lucide-react";

const step1Schema = z.object({
  studioName: z.string().min(3, "Nome do estúdio deve ter pelo menos 3 caracteres"),
  cnpjCpf: z.string().min(11, "CNPJ ou CPF inválido"),
  managerName: z.string().min(3, "Nome do gestor deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  whatsapp: z.string().min(10, "Celular inválido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

type Step1Props = {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
};

export default function Step1_Account({ data, updateData, onNext }: Step1Props) {
  const form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      studioName: data.studioName || "",
      cnpjCpf: data.cnpjCpf || "",
      managerName: data.managerName || "",
      email: data.email || "",
      whatsapp: data.whatsapp || "",
      password: data.password || "",
    },
  });

  const onSubmit = (values: z.infer<typeof step1Schema>) => {
    updateData(values);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Bem-vindo ao Kineos</h2>
        <p className="text-slate-500">Estamos felizes em ter você aqui. Vamos começar com o básico.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="studioName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Estúdio / Clínica</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Studio Pilates Viver" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnpjCpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ ou CPF</FormLabel>
                  <FormControl>
                    <Input placeholder="00.000.000/0000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="managerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Gestor Responsável</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular (WhatsApp)</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail (Será seu Login)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="gestor@kineos.com.br" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Crie uma Senha Segura</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-4">
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 h-11 px-8">
              Ver Planos <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
