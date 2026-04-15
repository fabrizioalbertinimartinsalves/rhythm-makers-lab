import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  Package,
  Settings,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  Users,
  ToggleLeft,
  Paintbrush,
  ChevronsUpDown,
  Check,
  CreditCard,
  Database,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganization } from "@/hooks/useOrganization";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", path: "/superadmin" },
  { icon: Building2, label: "Organizações", path: "/superadmin/organizations" },
  { icon: Package, label: "Planos SaaS", path: "/superadmin/plans" },
  { icon: ToggleLeft, label: "Features", path: "/superadmin/features" },
  { icon: Users, label: "Usuários", path: "/superadmin/users" },
  { icon: Paintbrush, label: "Branding Login", path: "/superadmin/login-branding" },
  { icon: LayoutDashboard, label: "Landing Page", path: "/superadmin/landing" },
  { icon: FileText, label: "Gestor de Páginas", path: "/superadmin/pages" },
  { icon: CreditCard, label: "Faturamento", path: "/superadmin/billing" },
  { icon: Database, label: "Banco de Dados", path: "/superadmin/database" },
  { icon: Settings, label: "Configurações", path: "/superadmin/settings" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { setTenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { orgId, orgName, memberships, switchOrg, hasMultipleOrgs } = useOrganization();
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform md:translate-x-0 md:static md:flex md:flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 px-4 py-5 border-b">
          <div className="rounded-lg bg-destructive/10 p-2">
            <ShieldCheck className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-bold text-sm">Super Admin</h2>
            <p className="text-xs text-muted-foreground">Gestão Global</p>
          </div>
        </div>

        {/* Org Switcher in sidebar for superadmin */}
        {hasMultipleOrgs && (
          <div className="px-3 pt-3">
            <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2 justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm">{orgName}</span>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-1" align="start">
                <div className="text-[10px] font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">Trocar Unidade / Estúdio</div>
                <div className="max-h-[300px] overflow-y-auto">
                  {/* Opção Global */}
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-slate-100 font-bold text-primary",
                      !orgId && "bg-slate-100"
                    )}
                    onClick={() => {
                      switchOrg(""); 
                      setOrgPopoverOpen(false);
                      window.location.href = "/superadmin";
                    }}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1 text-left">VISÃO GLOBAL (SAAS)</span>
                    {!orgId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  {memberships.map((m: any) => {
                    const org = m.organization_settings;
                    const isActive = m.organization_id === orgId;
                    return (
                      <button
                        key={m.organization_id}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                          isActive && "bg-accent"
                        )}
                        onClick={() => {
                          switchOrg(m.organization_id);
                          setOrgPopoverOpen(false);
                          window.location.href = "/admin";
                        }}
                      >
                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate flex-1 text-left">{org?.nome || "Sem nome"}</span>
                        {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-destructive/10 text-destructive font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={async () => { await signOut(); navigate("/login"); }}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
