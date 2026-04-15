import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, Plus, Users, Settings2, Trash2, UserPlus, Crown, CheckCircle2, Mail, Loader2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function Organizations() {
  const queryClient = useQueryClient();
  const { studioId: currentStudioId, setStudioId } = useAuth();
  const { user } = useAuth();
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedOrgForMembers, setSelectedOrgForMembers] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("student");

  const [orgForm, setOrgForm] = useState({
    nome: "",
    slug: "",
    email: "",
    telefone: "",
    endereco: "",
  });

  // Fetch all studios that the user is a member of (or all if superadmin)
  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["organizations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // If superadmin, get everything. For now, just getting memberships
      const { data, error } = await supabase
        .from("memberships")
        .select(`
          studio_id,
          studios (*)
        `)
        .eq("user_id", user?.id);
      
      if (error) throw error;
      return data.map((m: any) => m.studios).filter(Boolean);
    },
  });

  // Fetch members for selected org
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["org_members", selectedOrgForMembers],
    enabled: !!selectedOrgForMembers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select(`
          *,
          profiles (*)
        `)
        .eq("studio_id", selectedOrgForMembers);
      
      if (error) throw error;
      return data;
    },
  });

  const closeOrgDialog = () => {
    setOrgDialogOpen(false);
    setEditingOrg(null);
    setOrgForm({ nome: "", slug: "", email: "", telefone: "", endereco: "" });
  };

  const upsertOrgMutation = useMutation({
    mutationFn: async (values: any) => {
      const { id, ...payload } = values;
      if (id) {
        const { error } = await supabase.from("studios").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("studios").insert(payload).select().single();
        if (error) throw error;
        // Auto-add current user as admin
        if (user) {
          await supabase.from("memberships").insert({
            user_id: user.id,
            studio_id: data.id,
            roles: ["admin"]
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success(editingOrg ? "Empresa atualizada!" : "Empresa criada!");
      closeOrgDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ email, role, orgId }: { email: string; role: string; orgId: string }) => {
      // In Supabase, we usually invite via email or find existing profile
      const { data: profile, error: findError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();
      
      if (findError || !profile) {
        throw new Error("Usuário não encontrado. O usuário deve primeiro se cadastrar no sistema.");
      }

      const { error } = await supabase.from("memberships").insert({
        user_id: profile.id,
        studio_id: orgId,
        roles: [role]
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_members"] });
      toast.success("Membro adicionado!");
      setMemberDialogOpen(false);
      setNewMemberEmail("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_members"] });
      toast.success("Membro removido!");
    },
  });

  const openEditOrg = (org: any) => {
    setEditingOrg(org);
    setOrgForm({
      nome: org.nome,
      slug: org.slug || "",
      email: org.email || "",
      telefone: org.telefone || "",
      endereco: org.endereco || "",
    });
    setOrgDialogOpen(true);
  };

  const handleSaveOrg = () => {
    if (!orgForm.nome.trim()) return;
    upsertOrgMutation.mutate({
      ...orgForm,
      slug: orgForm.slug || orgForm.nome.toLowerCase().replace(/\s+/g, "-"),
      ...(editingOrg ? { id: editingOrg.id } : {}),
    });
  };

  const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador",
    instructor: "Instrutor",
    student: "Aluno",
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> Empresas
            </h1>
            <p className="text-muted-foreground">Gerencie seus estúdios e colaboradores</p>
          </div>
          <Button onClick={() => setOrgDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Empresa
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : orgs.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma empresa encontrada.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org: any) => {
              const isCurrent = org.id === currentStudioId;
              return (
                <Card key={org.id} className={isCurrent ? "ring-2 ring-primary" : ""}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      {org.nome}
                      {isCurrent && <Badge variant="default" className="text-[10px]">Ativa</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">{org.slug}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => setStudioId(org.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Ativar
                        </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrgForMembers(org.id)}>
                        <Users className="h-3.5 w-3.5 mr-1" /> Membros
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditOrg(org)}>
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedOrgForMembers && (
          <Card className="animate-in slide-in-from-top-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Membros</CardTitle>
                <CardDescription>Gestão de acesso para esta empresa</CardDescription>
              </div>
              <Button size="sm" onClick={() => setMemberDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" /> Convidar
              </Button>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.profiles?.nome}
                          {m.user_id === user?.id && <Badge variant="outline" className="ml-2 text-[10px]">Você</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {(m.roles && m.roles[0] && ROLE_LABELS[m.roles[0]]) || "Membro"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {m.user_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive h-8 w-8"
                              onClick={() => removeMemberMutation.mutate(m.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingOrg ? "Editar" : "Nova"} Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={orgForm.nome} onChange={(e) => setOrgForm({...orgForm, nome: e.target.value})} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={orgForm.slug} onChange={(e) => setOrgForm({...orgForm, slug: e.target.value})} placeholder="meu-estudio" /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={orgForm.email} onChange={(e) => setOrgForm({...orgForm, email: e.target.value})} /></div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={closeOrgDialog}>Cancelar</Button>
            <Button onClick={handleSaveOrg}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar Membro</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Email do Usuário</Label><Input value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="usuario@email.com" /></div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="instructor">Instrutor</SelectItem>
                  <SelectItem value="student">Aluno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMemberMutation.mutate({ email: newMemberEmail, role: newMemberRole, orgId: selectedOrgForMembers! })}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
