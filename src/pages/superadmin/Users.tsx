import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Search, 
  Users as UsersIcon, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Crown, 
  Lock, 
  Unlock, 
  MailCheck,
  Shield,
  UserCircle,
  Building2,
  MoreVertical,
  Fingerprint,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Loader2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  superadmin: { label: "SUPER ADMIN", color: "bg-red-50 text-red-600 border-red-100", icon: Crown },
  admin: { label: "GESTOR", color: "bg-primary/5 text-primary border-primary/10", icon: ShieldCheck },
  instructor: { label: "INSTRUTOR", color: "bg-blue-50 text-blue-600 border-blue-100", icon: UserCheck },
  student: { label: "ALUNO", color: "bg-amber-50 text-amber-600 border-amber-100", icon: GraduationCap },
};

export default function SuperAdminUsers() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addMembership, setAddMembership] = useState({ studioId: "", roles: [] as string[] });
  const [newUserForm, setNewUserForm] = useState({ nome: "", email: "", password: "" });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["superadmin-all-users-sb", user?.id],
    enabled: !!user && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: studios = [] } = useQuery({
    queryKey: ["superadmin-all-studios-sb", user?.id],
    enabled: !!user && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: allMemberships = [] } = useQuery({
    queryKey: ["superadmin-all-memberships-sb", user?.id],
    enabled: !!user && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const updateGlobalRole = useMutation({
    mutationFn: async ({ userId, isSA }: { userId: string; isSA: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_global_superadmin: isSA })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role global atualizada!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-all-users-sb"] });
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: typeof newUserForm) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { nome: data.nome }
        }
      });
      if (authError) throw authError;
      return authData;
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setIsAddingUser(false);
      setNewUserForm({ nome: "", email: "", password: "" });
      queryClient.invalidateQueries({ queryKey: ["superadmin-all-users-sb"] });
    },
  });

  const addMembershipMutation = useMutation({
    mutationFn: async (m: { userId: string; studioId: string; roles: string[] }) => {
      const { error } = await supabase
        .from("memberships")
        .insert({
          user_id: m.userId,
          studio_id: m.studioId,
          roles: m.roles
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vínculo estabelecido!");
      setAddMembership({ studioId: "", roles: [] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-all-memberships-sb"] });
    },
  });

  const removeMembershipMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vínculo removido!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-all-memberships-sb"] });
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ userId, disabled }: { userId: string; disabled: boolean }) => {
       const { error } = await supabase
        .from("profiles")
        .update({ disabled })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.disabled ? "Usuário bloqueado!" : "Usuário desbloqueado!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-all-users-sb"] });
      if (selectedUser?.id === variables.userId) {
        setSelectedUser({ ...selectedUser, disabled: variables.disabled });
      }
    },
  });

  const resetUserPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error("Erro: " + error.message);
    else toast.success("Reset e-mail enviado!");
  };

  const filtered = users.filter((u: any) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.nome?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1">Identity v7.5.2</Badge>
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight text-slate-950 flex items-center gap-3 leading-none">
              Command <span className="text-primary tracking-normal">Profiles</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Gestão de Identidades Globais SaaS</p>
          </div>
          <Button className="h-8 px-5 font-bold uppercase tracking-widest text-[9px] shadow-sm shadow-primary/5 rounded-lg gap-2 bg-slate-950" onClick={() => setIsAddingUser(true)}>
             <Plus className="h-3.5 w-3.5" /> Novo Usuário
          </Button>
        </div>

        <div className="w-full md:max-w-xs space-y-1">
          <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1">Busca de Perfil</Label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Buscar por e-mail ou nome..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 h-8 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 px-4 text-[10px]" 
            />
          </div>
        </div>

        <Card className="border-none shadow-sm overflow-hidden rounded-xl bg-white ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="py-2.5 font-bold uppercase text-[8px] tracking-widest text-slate-500 pl-4">Usuário</TableHead>
                  <TableHead className="py-2.5 font-bold uppercase text-[8px] tracking-widest text-slate-500">Access</TableHead>
                  <TableHead className="py-2.5 font-bold uppercase text-[8px] tracking-widest text-slate-500">Tenants</TableHead>
                  <TableHead className="py-2.5 font-bold uppercase text-[8px] tracking-widest text-slate-500">Criação</TableHead>
                  <TableHead className="py-2.5 w-[80px] pr-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24">
                       <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-200" />
                       <p className="text-[10px] text-slate-400 font-black uppercase italic tracking-widest mt-4">Escaneando Profiles Supabase...</p>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((user: any) => {
                  const userMemberships = allMemberships.filter((m: any) => m.user_id === user.id);
                  const isBlocked = user.disabled === true;
                  
                  return (
                    <TableRow key={user.id} className={cn("hover:bg-slate-50/30 transition-colors border-slate-100 group", isBlocked && "opacity-60 grayscale bg-slate-50")}>
                      <TableCell className="pl-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                           <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center text-white border border-slate-800 shadow-inner overflow-hidden">
                              {user.avatar_url ? <img src={user.avatar_url} className="h-full w-full object-cover" /> : <UserCircle className="h-4 w-4 opacity-30" />}
                           </div>
                           <div>
                              <p className="font-bold text-[11px] text-slate-900 uppercase tracking-tight flex items-center gap-1.5 leading-none">
                                {user.nome || "Anonymous"}
                                {isBlocked && <Badge variant="destructive" className="text-[6px] font-bold rounded-md h-3.5 px-1 uppercase tracking-widest">Blocked</Badge>}
                              </p>
                              <p className="text-[7px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">{user.email}</p>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.is_global_superadmin ? (
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 font-bold text-[8px] uppercase tracking-widest h-6 px-2.5 shadow-none">
                            <Crown className="h-2.5 w-2.5 mr-1" /> Super Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-400 border-none font-bold text-[8px] uppercase tracking-widest h-6 px-2">
                            Standard User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                          {userMemberships.length > 0 ? (
                            <Badge className="bg-primary/5 text-primary border-primary/20 font-bold text-[8px] px-2.5 h-6 rounded-md shadow-none">
                              {userMemberships.length} {userMemberships.length === 1 ? 'Organização' : 'Organizações'}
                            </Badge>
                          ) : (
                            <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">Clean Account</span>
                          )}
                      </TableCell>
                      <TableCell className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="pr-4">
                         <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-lg bg-slate-50 hover:bg-primary/10 hover:text-primary border border-slate-100 transition-all" 
                              onClick={() => setSelectedUser(user)}
                            >
                               <Fingerprint className="h-3.5 w-3.5" />
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
        <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden border-none shadow-xl">
          <div className="bg-slate-950 p-6 text-white">
            <DialogHeader>
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                     <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold uppercase tracking-tight">Novo Usuário</DialogTitle>
                    <DialogDescription className="text-slate-500 font-bold text-[8px] uppercase tracking-widest">Identity SaaS Provisioning</DialogDescription>
                  </div>
               </div>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-3.5">
               <div className="space-y-1">
                  <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
                  <Input placeholder="Nome Completo" value={newUserForm.nome} onChange={e => setNewUserForm(p => ({ ...p, nome: e.target.value }))} className="h-10 bg-slate-50 border-slate-100 rounded-lg font-bold px-4 text-xs" />
               </div>
               <div className="space-y-1">
                  <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Supabase</Label>
                  <Input type="email" placeholder="email@rhytm.com" value={newUserForm.email} onChange={e => setNewUserForm(p => ({ ...p, email: e.target.value }))} className="h-10 bg-slate-50 border-slate-100 rounded-lg font-bold px-4 text-xs" />
               </div>
               <div className="space-y-1">
                  <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1">Temporary Password</Label>
                  <Input type="password" placeholder="••••••••" value={newUserForm.password} onChange={e => setNewUserForm(p => ({ ...p, password: e.target.value }))} className="h-10 bg-slate-50 border-slate-100 rounded-lg font-medium px-4 text-xs" />
               </div>
            </div>
            <Button className="w-full h-10 rounded-lg font-bold uppercase tracking-widest text-[10px] shadow-sm bg-slate-950" onClick={() => createUser.mutate(newUserForm)} disabled={!newUserForm.email || newUserForm.password.length < 6 || createUser.isPending}>
              {createUser.isPending ? "Provisionando..." : "Criar Root Identity"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUser} onOpenChange={(o) => !o && setSelectedUser(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl p-0 border-none shadow-xl">
          <div className="bg-slate-950 p-6 text-white relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 p-6 opacity-5"><Shield className="h-20 w-20 text-primary" /></div>
             <div className="relative z-10 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-white text-slate-950 flex items-center justify-center font-bold text-lg uppercase shadow-lg ring-2 ring-white/10">
                   {selectedUser?.nome?.slice(0, 2) || "U"}
                </div>
                <div>
                   <DialogTitle className="text-xl font-bold uppercase tracking-tight leading-none">
                     {selectedUser?.nome || "Profile Detail"}
                   </DialogTitle>
                   <DialogDescription className="text-slate-500 font-bold text-[8px] uppercase tracking-widest mt-1.5 flex items-center gap-2">
                     <Lock className="h-2.5 w-2.5" /> Security & Multitenancy Ledger
                   </DialogDescription>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 group hover:shadow-sm transition-all">
               <div className="space-y-0.5">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Universal SaaS Control</p>
                  <h4 className="text-xs font-bold uppercase text-slate-900">Privilégios de SuperAdmin</h4>
               </div>
               <Switch 
                 checked={selectedUser?.is_global_superadmin}
                 onCheckedChange={(v) => updateGlobalRole.mutate({ userId: selectedUser.id, isSA: v })}
                 className="data-[state=checked]:bg-primary scale-90"
               />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Studio Memberships</Label>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold text-[7px] uppercase rounded-md px-1.5">Active Tenants</Badge>
              </div>
              
              <div className="grid gap-2">
                {allMemberships.filter((m: any) => m.user_id === selectedUser?.id).map((m: any) => {
                  const studio = studios.find((s: any) => s.id === m.studio_id) as any;
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-primary group-hover:text-white transition-all">
                            <Building2 className="h-4 w-4" />
                         </div>
                         <div>
                           <p className="text-[11px] font-bold uppercase text-slate-800 tracking-tight">{studio?.nome || "Tenant Inativo"}</p>
                           <div className="flex gap-1 flex-wrap mt-0.5">
                             {m.roles.map((r: string) => {
                                const cfg = ROLE_CONFIG[r] || { label: r, color: 'bg-slate-50 text-slate-400 border-slate-100' };
                                return (
                                  <Badge key={r} variant="outline" className={cn("text-[6px] font-bold uppercase h-4 px-1.5 border rounded-md shadow-none", cfg.color)}>
                                    {cfg.label}
                                  </Badge>
                                );
                             })}
                           </div>
                         </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100" onClick={() => removeMembershipMutation.mutate(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="p-5 rounded-xl border-2 border-dashed border-slate-100 bg-slate-50/50 space-y-4">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   <Plus className="h-2.5 w-2.5" /> Provisionar Novo Vínculo
                </p>
                
                <div className="grid gap-4">
                    <Select value={addMembership.studioId} onValueChange={v => setAddMembership(p => ({ ...p, studioId: v }))}>
                      <SelectTrigger className="h-10 bg-white border-slate-200 rounded-lg font-bold text-xs px-4 shadow-sm">
                        <SelectValue placeholder="Selecione o Estúdio..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border-slate-200">
                        {studios.map((s: any) => (
                          <SelectItem key={s.id} value={s.id} className="font-bold uppercase text-[10px]">{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex flex-wrap gap-4 px-1">
                      {["admin", "instructor", "student"].map(r => (
                        <div key={r} className="flex items-center space-x-2.5 group cursor-pointer" onClick={() => {
                            const newRoles = addMembership.roles.includes(r) 
                              ? addMembership.roles.filter(x => x !== r)
                              : [...addMembership.roles, r];
                            setAddMembership(p => ({ ...p, roles: newRoles }));
                        }}>
                          <Checkbox 
                            id={`sa-role-${r}`}
                            checked={addMembership.roles.includes(r)}
                            className="h-4 w-4 rounded border-2 data-[state=checked]:bg-primary"
                          />
                          <Label htmlFor={`sa-role-${r}`} className="text-[9px] font-bold uppercase text-slate-500 cursor-pointer group-hover:text-primary transition-colors">{ROLE_CONFIG[r]?.label}</Label>
                        </div>
                      ))}
                    </div>

                    <Button 
                      className="w-full h-10 bg-slate-900 hover:bg-slate-950 font-bold uppercase tracking-widest text-[9px] shadow-sm" 
                      disabled={!addMembership.studioId || addMembership.roles.length === 0 || addMembershipMutation.isPending}
                      onClick={() => addMembershipMutation.mutate({ ...addMembership, userId: selectedUser.id })}
                    >
                      Processar Vínculo Identities
                    </Button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Security Actions</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-9 rounded-lg border border-slate-200 font-bold uppercase text-[9px] gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm" onClick={() => resetUserPassword(selectedUser.email)}>
                    <MailCheck className="h-3.5 w-3.5" /> Reset Credentials
                  </Button>
                  <Button 
                    variant={selectedUser?.disabled ? "default" : "destructive"} 
                    className="h-9 rounded-lg font-bold uppercase text-[9px] gap-2 shadow-sm transition-all active:scale-95"
                    onClick={() => toggleUserStatus.mutate({ userId: selectedUser.id, disabled: !selectedUser.disabled })}
                  >
                    {selectedUser?.disabled ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {selectedUser?.disabled ? "Unblock Account" : "Access Block"}
                  </Button>
                </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t shrink-0">
             <Button variant="ghost" onClick={() => setSelectedUser(null)} className="h-9 font-bold uppercase text-[9px] tracking-widest text-slate-400">Close Ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
