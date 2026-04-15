import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, MoreHorizontal, Shield, UserCheck, GraduationCap,
  Trash2, KeyRound, Link2, Users as UsersIcon, Loader2, Mail, Clock,
  AlertCircle, Trash, Ban, CheckCircle2, DollarSign
} from "lucide-react";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";

type AppRole = "admin" | "instructor" | "student";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Administrador", color: "default", icon: Shield },
  instructor: { label: "Instrutor", color: "secondary", icon: UserCheck },
  student: { label: "Aluno", color: "outline", icon: GraduationCap },
};

function StatCard({ label, value, icon: Icon, colorClass }: { label: string; value: number; icon: any; colorClass: string }) {
  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { studioId, user } = useAuth() as any;
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState<string | null>(null);
  const [changeEmailOpen, setChangeEmailOpen] = useState<any>(null);
  const [newEmail, setNewEmail] = useState("");
  
   const [form, setForm] = useState({
     email: "", password: "", nome: "", selectedRoles: ["student"] as string[],
   });

  const [instructorForm, setInstructorForm] = useState({
    tipo_contrato: "fixo",
    valor_hora_aula: 0,
    percentual_por_aluno: 0,
    comissao_venda_produtos: 0,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users", "list", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase
        .from("memberships")
        .select("user_id, roles, profiles(id, nome, email, disabled, created_at, force_password_change)")
        .eq("studio_id", studioId);
      return (data || []).map(m => ({
        id: m.user_id,
        email: (m.profiles as any)?.email,
        created_at: (m.profiles as any)?.created_at,
        profile_nome: (m.profiles as any)?.nome,
        disabled: (m.profiles as any)?.disabled,
        force_password_change: (m.profiles as any)?.force_password_change,
        roles: (m.roles || []).map((r: string) => ({ role: r })),
        role: m.roles?.[0],
      }));
    },
  });

  const { data: instructorConfig } = useQuery({
    queryKey: ["admin", "users", "instructor-config", editingUser?.id, studioId],
    enabled: !!editingUser && !!studioId && editingUser.roles.some((r: any) => r.role === "instructor"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructor_configs")
        .select("*")
        .eq("user_id", editingUser.id)
        .eq("studio_id", studioId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) setInstructorForm({
        tipo_contrato: data.tipo_contrato,
        valor_hora_aula: Number(data.valor_hora_aula),
        percentual_por_aluno: Number(data.percentual_por_aluno),
        comissao_venda_produtos: Number(data.comissao_venda_produtos),
      });
      return data;
    },
  });

  const { data: alunosSemUser = [] } = useQuery({
    queryKey: ["admin", "students", "unlinked", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase
        .from("students")
        .select("id, nome, email")
        .eq("studio_id", studioId);
      return data || [];
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      if (!form.email || !form.password || !form.nome) throw new Error("Preencha todos os campos");
      if (form.password.length < 6) throw new Error("Senha deve ter pelo menos 6 caracteres");
      if (form.selectedRoles.length === 0) throw new Error("Selecione pelo menos um papel");
      if (!studioId) throw new Error("Estúdio não identificado");

      try {
        // 1. Tentar convite direto via Edge Function (Novo Fluxo)
        console.warn("🚀 Iniciando convite automático para:", form.email);
        
        const { data, error: inviteError } = await supabase.functions.invoke('invite-user', {
          body: {
            email: form.email,
            nome: form.nome,
            roles: form.selectedRoles,
            studio_id: studioId,
            password: form.password
          }
        });

        if (inviteError) {
          console.warn("⚠️ Convite oficial falhou. Erro:", inviteError);
          let detail = "";
          try {
            const body = await (inviteError as any).context?.json();
            if (body?.error) detail = body.error;
          } catch { /* ignore */ }

          // 2. Fallback: Criar perfil provisório e gerar comando (Fluxo Antigo)
          console.warn("⚡ Usando Plano B (Fallback manual)...");
          
          // Verificar se já existe um perfil para esse e-mail para evitar conflito de IDs
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", form.email)
            .single();

          const targetId = existingProfile?.id || crypto.randomUUID();
          
          // Usar upsert para evitar erro de duplicidade se o admin tentar criar o mesmo e-mail 2x
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: targetId,
            nome: form.nome,
            email: form.email,
            provisional: true
          }, { onConflict: 'email' });

          if (profileError && !profileError.message.includes("duplicate")) throw profileError;

          const { error: memberError } = await supabase.from("memberships").upsert({
            user_id: targetId,
            studio_id: studioId,
            roles: form.selectedRoles
          }, { onConflict: 'user_id, studio_id' });
          
          if (memberError) throw memberError;

          const cmd = `npx ts-node scripts/provision-supabase-user.ts ${form.email} ${form.password} "${form.nome}" ${studioId} ${form.selectedRoles.join(",")}`;
          await navigator.clipboard.writeText(cmd);
          return { 
            method: 'terminal', 
            cmd,
            error: detail || String(inviteError) 
          };
        }
        
        console.warn("✅ Convite oficial enviado!");
        return { method: 'invite', email: form.email };
      } catch (err: any) {
        throw new Error(err.message || "Erro desconhecido ao criar usuário");
      }
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setCreateOpen(false);
      setForm({ email: "", password: "", nome: "", selectedRoles: ["student"] });
      
      if (res.method === 'invite') {
        toast.success("Convite enviado com sucesso!", {
          description: `Um e-mail de ativação foi enviado para ${res.email}.`
        });
      } else {
        toast.success("Perfil provisório criado e comando copiado!", {
          description: res.error 
            ? `O convite automático falhou. Erro: ${res.error}`
            : "O convite automatizado falhou (Edge Function não disponível?). Use o comando do clipboard no terminal.",
          duration: 10000
        });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      if (!studioId) return;
      const { data: existing } = await supabase.from("memberships").select("roles").eq("user_id", user_id).eq("studio_id", studioId).single();
      const currentRoles: string[] = existing?.roles || [];
      if (!currentRoles.includes(role)) {
        const { error } = await supabase.from("memberships").update({ roles: [...currentRoles, role] }).eq("user_id", user_id).eq("studio_id", studioId);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("Papel adicionado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      if (!studioId) return;
      const { data: existing } = await supabase.from("memberships").select("roles").eq("user_id", user_id).eq("studio_id", studioId).single();
      const newRoles = (existing?.roles || []).filter((r: string) => r !== role);
      const { error } = await supabase.from("memberships").update({ roles: newRoles }).eq("user_id", user_id).eq("studio_id", studioId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("Papel removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await supabase.from("memberships").delete().eq("user_id", user_id).eq("studio_id", studioId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("Usuário desvinculado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ user_id, disabled }: { user_id: string; disabled: boolean }) => {
      const { error } = await supabase.from("profiles").update({ disabled }).eq("id", user_id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("Status atualizado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveInstructorConfig = useMutation({
    mutationFn: async () => {
      if (!editingUser || !studioId) return;
      const { error } = await supabase.from("instructor_configs").upsert({
        user_id: editingUser.id,
        studio_id: studioId,
        ...instructorForm,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,studio_id' });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações financeiras salvas!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const generateResetToken = useMutation({
    mutationFn: async (user_id: string) => {
      const token = Math.random().toString(36).substring(2, 15);
      const expires = new Date(Date.now() + 3600000).toISOString(); 
      const { error } = await supabase.from("profiles").update({ 
        reset_token: token, 
        reset_token_expires: expires,
        force_password_change: true 
      }).eq("id", user_id);
      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      navigator.clipboard.writeText(`${window.location.origin}/auth/recover?token=${token}`);
      toast.success("Link de recuperação copiado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const linkAluno = useMutation({
    mutationFn: async ({ user_id, aluno_id }: { user_id: string; aluno_id: string }) => {
      if (!studioId) return;
      const { error } = await supabase.from("students").update({ user_id: user_id }).eq("id", aluno_id).eq("studio_id", studioId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); setLinkOpen(null); toast.success("Aluno vinculado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEmail = useMutation({
    mutationFn: async ({ user_id, email }: { user_id: string; email: string }) => {
      console.warn("[LOG] Chamando Edge Function update-user-email para:", email);
      const { data, error } = await supabase.functions.invoke('update-user-email', {
        body: { user_id, new_email: email, studio_id: studioId }
      });
      
      if (error) {
        console.error("[ERROR] Erro na Edge Function:", error);
        // Tentar extrair a mensagem de erro do corpo da resposta, se disponível
        let message = "Erro ao atualizar e-mail.";
        try {
          const body = await (error as any).context?.json();
          if (body?.error) message = body.error;
        } catch {
          message = error.message || message;
        }
        throw new Error(message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setChangeEmailOpen(null);
      setNewEmail("");
      toast.success("E-mail atualizado com sucesso!");
    },
    onError: (e: any) => {
      console.error("[CRITICAL] Falha final na mutação:", e);
      toast.error(e.message || "Erro ao atualizar e-mail.");
    },
  });

  const filtered = users.filter((u: any) => {
    const matchSearch =
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.profile_nome?.toLowerCase().includes(search.toLowerCase());
    const userRoles = u.roles?.map((r: any) => r.role) || [u.role].filter(Boolean);
    const matchRole = filterRole === "all" || userRoles.includes(filterRole) || (filterRole === "none" && userRoles.length === 0);
    const matchStatus = filterStatus === "all" || (filterStatus === "active" && !u.disabled) || (filterStatus === "inactive" && u.disabled);
    return matchSearch && matchRole && matchStatus;
  });

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const stats = {
    total: users.length,
    admins: users.filter((u: any) => u.roles?.some((r: any) => r.role === "admin")).length,
    instructors: users.filter((u: any) => u.roles?.some((r: any) => r.role === "instructor")).length,
    students: users.filter((u: any) => u.roles?.some((r: any) => r.role === "student")).length,
    noRole: users.filter((u: any) => (u.roles || []).length === 0).length,
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Gestão de Usuários</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Shield className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={async () => {
                    alert("Iniciando Diagnóstico...");
                    try {
                      const url = import.meta.env.VITE_SUPABASE_URL;
                      const { data: memb } = await supabase.from("memberships").select("user_id");
                      const { data: prof } = await supabase.from("profiles").select("id").limit(1);
                      alert(`DIAGNÓSTICO: \nURL: ${url} \nUser: ${user?.id} \nMemb: ${memb?.length || 0} \nProf: ${prof?.length || 0}`);
                    } catch (err: any) { alert("ERRO: " + err.message); }
                  }}>
                    <Shield className="h-4 w-4 mr-2" /> Diagnosticar Acesso (Dev)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-lg text-muted-foreground font-light">Controle de acessos, papéis e permissões do estúdio.</p>
          </div>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="h-5 w-5" /> Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Criar Novo Usuário</DialogTitle>
                <p className="text-sm text-muted-foreground">O usuário receberá um convite por e-mail para ativar a conta.</p>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }} className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: João Silva" required className="h-11" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail Profissional</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="exemplo@kineos.com" required className="h-11" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Senha Temporária</Label>
                    <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" required className="h-11" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Papéis e Permissões</Label>
                  <div className="grid gap-2">
                    {["admin", "instructor", "student"].map((r) => (
                      <div key={r} onClick={() => {
                        const roles = form.selectedRoles.includes(r) ? form.selectedRoles.filter(role => role !== r) : [...form.selectedRoles, r];
                        setForm({ ...form, selectedRoles: roles });
                      }} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${form.selectedRoles.includes(r) ? 'border-primary bg-primary/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${form.selectedRoles.includes(r) ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}>
                            {r === 'admin' && <Shield className="h-4 w-4" />}
                            {r === 'instructor' && <UserCheck className="h-4 w-4" />}
                            {r === 'student' && <GraduationCap className="h-4 w-4" />}
                          </div>
                          <span className="font-medium capitalize text-sm">{r === 'admin' ? 'Administrador' : r === 'instructor' ? 'Instrutor' : 'Aluno'}</span>
                        </div>
                        <Checkbox checked={form.selectedRoles.includes(r)} onCheckedChange={() => {}} className="rounded-full shadow-none border-gray-300" />
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button type="submit" className="w-full h-12 text-base font-bold" disabled={createUser.isPending}>
                  {createUser.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finalizar e Enviar Convite"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Geral" value={stats.total} icon={UsersIcon} colorClass="bg-blue-50 text-blue-600" />
          <StatCard label="Administradores" value={stats.admins} icon={Shield} colorClass="bg-indigo-50 text-indigo-600" />
          <StatCard label="Instrutores" value={stats.instructors} icon={UserCheck} colorClass="bg-purple-50 text-purple-600" />
          <StatCard label="Alunos" value={stats.students} icon={GraduationCap} colorClass="bg-emerald-50 text-emerald-600" />
          <StatCard label="Sem Vínculo" value={stats.noRole} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" />
        </div>

        {/* Filters & Search Toolbar */}
        <Card className="border-none shadow-sm overflow-hidden bg-white/60 backdrop-blur-md">
          <CardHeader className="pb-4 border-b bg-gray-50/30">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Pesquisar por nome ou e-mail..." 
                  className="pl-10 h-11 bg-white border-gray-200 focus:ring-primary/20 transition-all rounded-xl" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
              <div className="flex items-center gap-3">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[160px] h-11 rounded-xl bg-white border-gray-200"><SelectValue placeholder="Papel" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todos os Papéis</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="instructor">Instrutores</SelectItem>
                    <SelectItem value="student">Alunos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] h-11 rounded-xl bg-white border-gray-200"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Ver Todos</SelectItem>
                    <SelectItem value="active">Apenas Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                <p className="text-sm text-muted-foreground animate-pulse">Sincronizando base de usuários...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="inline-flex p-4 rounded-full bg-gray-50 text-gray-300">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Nenhum usuário encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">Tente ajustar seus filtros ou pesquisar por outro termo.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((u: any) => {
                  const userRoles: string[] = u.roles?.map((r: any) => r.role) || [];
                  const initials = (u.profile_nome || u.email || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
                  
                  return (
                    <div key={u.id} className="group flex items-center gap-4 p-4 hover:bg-primary/[0.02] transition-all cursor-default relative">
                      {/* Active Indicator */}
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all ${u.disabled ? 'bg-transparent' : 'bg-primary scale-y-0 group-hover:scale-y-100'}`} />
                      
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-gray-100">
                        <AvatarFallback className={`${u.disabled ? 'bg-gray-100 text-gray-400' : 'bg-primary/5 text-primary'} font-bold text-sm`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className={`font-semibold truncate ${u.disabled ? 'text-muted-foreground' : 'text-gray-900'}`}>
                            {u.profile_nome || u.email}
                          </h4>
                          {u.disabled && <Badge variant="secondary" className="px-1.5 py-0 text-[9px] uppercase tracking-wider font-extrabold bg-gray-100 text-gray-400 border-none">Inativo</Badge>}
                          {!u.disabled && (
                             <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(u.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pr-2">
                        <div className="hidden sm:flex items-center gap-1">
                          {userRoles.map(r => (
                            <Badge key={r} variant="outline" className={`px-2 py-0.5 text-[10px] font-medium border-gray-200 bg-white ${r === 'admin' ? 'text-indigo-600 border-indigo-100 bg-indigo-50/50' : r === 'instructor' ? 'text-purple-600 border-purple-100 bg-purple-50/50' : 'text-emerald-600 border-emerald-100 bg-emerald-50/50'}`}>
                              {ROLE_CONFIG[r]?.label || r}
                            </Badge>
                          ))}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 text-muted-foreground"><MoreHorizontal className="h-5 w-5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-gray-100">
                            <DropdownMenuItem onClick={() => setEditingUser(u)} className="p-3 cursor-pointer">
                              <Loader2 className="h-4 w-4 mr-3 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">Configurar</span>
                                <span className="text-[10px] text-muted-foreground">Financeiro e permissões</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setChangeEmailOpen(u); setNewEmail(u.email || ""); }} className="p-3 cursor-pointer">
                              <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">Alterar E-mail</span>
                                <span className="text-[10px] text-muted-foreground">Atualizar e-mail de acesso</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateResetToken.mutate(u.id)} className="p-3 cursor-pointer">
                              <KeyRound className="h-4 w-4 mr-3 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">Recuperação</span>
                                <span className="text-[10px] text-muted-foreground">Gerar link de senha</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLinkOpen(u.id)} className="p-3 cursor-pointer">
                              <Link2 className="h-4 w-4 mr-3 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">Vincular Aluno</span>
                                <span className="text-[10px] text-muted-foreground">Sincronizar dados</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className={`p-3 cursor-pointer ${u.disabled ? "text-emerald-600 focus:text-emerald-600" : "text-orange-600 focus:text-orange-600"}`} 
                              onClick={() => toggleStatus.mutate({ user_id: u.id, disabled: !u.disabled })}
                            >
                              {u.disabled ? <CheckCircle2 className="h-4 w-4 mr-3" /> : <Ban className="h-4 w-4 mr-3" />}
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{u.disabled ? "Ativar Acesso" : "Bloquear Acesso"}</span>
                                <span className="text-[10px] opacity-80">{u.disabled ? "Restabelecer login" : "Suspender conta"}</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="p-3 cursor-pointer text-destructive focus:text-destructive" onClick={() => { if(confirm("Deseja realmente desvincular este usuário?")) deleteUser.mutate(u.id); }}>
                              <Trash2 className="h-4 w-4 mr-3" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">Desvincular</span>
                                <span className="text-[10px] opacity-80">Remover do estúdio</span>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editingUser} onOpenChange={(o) => { if (!o) setEditingUser(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Configurações de Usuário</DialogTitle></DialogHeader>
            {editingUser && (
              <Tabs defaultValue="geral" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="geral">Geral & Segurança</TabsTrigger>
                  {editingUser.roles.some((r: any) => r.role === "instructor") && (
                    <TabsTrigger value="financeiro">Comissionamento</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="geral" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={editingUser.profile_nome || ""} disabled />
                    </div>
                    <div className="space-y-2 text-center flex flex-col items-center justify-center border rounded-lg bg-slate-50 p-2">
                      <Label className="mb-2">Acesso Ativo</Label>
                      <Switch checked={!editingUser.disabled} onCheckedChange={(v) => toggleStatus.mutate({ user_id: editingUser.id, disabled: !v })} />
                    </div>
                  </div>
                  <div className="p-4 border border-amber-100 bg-amber-50/20 rounded-lg space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-amber-700"><Shield className="h-4 w-4" /> Próximo Login</h4>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Exigir nova senha</Label>
                      <Switch 
                        checked={editingUser.force_password_change} 
                        onCheckedChange={async (v) => {
                          const { error } = await supabase.from("profiles").update({ force_password_change: v }).eq("id", editingUser.id);
                          if (!error) {
                            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
                            setEditingUser({ ...editingUser, force_password_change: v });
                            toast.success("Alterado!");
                          }
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-4 pt-4">
                  <AlertCircle className="h-8 w-8 text-sky-500 mx-auto" />
                  <div className="text-center space-y-1">
                    <h4 className="font-bold">Regras de Comissionamento</h4>
                    <p className="text-xs text-muted-foreground">Define como este instrutor será pago.</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Contrato</Label>
                      <Select value={instructorForm.tipo_contrato} onValueChange={(v) => setInstructorForm({ ...instructorForm, tipo_contrato: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixo">Fixo por Aula</SelectItem>
                          <SelectItem value="percentual">Percentual p/ Aluno</SelectItem>
                          <SelectItem value="hibrido">Híbrido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valor Hora/Aula</Label>
                        <Input type="number" value={instructorForm.valor_hora_aula} onChange={(e) => setInstructorForm({ ...instructorForm, valor_hora_aula: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Comissão Aluno (%)</Label>
                        <Input type="number" value={instructorForm.percentual_por_aluno} onChange={(e) => setInstructorForm({ ...instructorForm, percentual_por_aluno: Number(e.target.value) })} />
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => saveInstructorConfig.mutate()} disabled={saveInstructorConfig.isPending}>
                    {saveInstructorConfig.isPending ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!linkOpen} onOpenChange={(o) => { if(!o) setLinkOpen(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Vincular a Aluno</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
              {alunosSemUser.map((a: any) => (
                <Button key={a.id} variant="outline" className="w-full justify-start gap-2" onClick={() => linkAluno.mutate({ user_id: linkOpen!, aluno_id: a.id })}>
                  <GraduationCap className="h-4 w-4" /> {a.nome}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!changeEmailOpen} onOpenChange={(o) => { if(!o) setChangeEmailOpen(null); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Alterar E-mail</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Isso alterará o e-mail de login e o e-mail nos perfis. O usuário deverá usar o novo e-mail no próximo acesso.
              </p>
            </DialogHeader>
            <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (changeEmailOpen) updateEmail.mutate({ user_id: changeEmailOpen.id, email: newEmail }); 
              }} className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>E-mail Atual</Label>
                  <Input value={changeEmailOpen?.email || ""} disabled className="bg-gray-50" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-email">Novo E-mail</Label>
                  <Input 
                    id="new-email" 
                    type="email" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    placeholder="novo@email.com" 
                    required 
                    className="h-11" 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={updateEmail.isPending}>
                {updateEmail.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar Novo E-mail"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
