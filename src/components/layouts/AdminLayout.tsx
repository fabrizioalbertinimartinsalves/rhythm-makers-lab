import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  DollarSign,
  Users,
  UsersRound,
  CreditCard,
  BarChart3,
  Zap,
  Settings,
  Menu,
  X,
  Handshake,
  Dumbbell,
  Palette,
  FileText,
  Package,
  Code,
  TrendingUp,
  ShieldCheck,
  LogOut,
  HardDrive,
  UserPlus,
  ClipboardList,
  ChevronDown,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Plug,
  Building2,
  ChevronsUpDown,
  Check,
  UserCheck,
  RefreshCw,
  Sparkles,
  CalendarCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useStudioConfig } from "@/hooks/useStudioConfig";
import { useOrganization } from "@/hooks/useOrganization";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import GlobalSearch from "@/components/GlobalSearch";
import PaymentNotificationBell from "@/components/PaymentNotificationBell";
import { useOrgFeatures } from "@/hooks/useOrgFeatures";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebarStats } from "@/hooks/useSidebarStats";



type NavItem = { 
  icon: any; 
  label: string; 
  path: string; 
  featureKey?: string; 
  roles?: string[];
  badge?: (stats: any) => React.ReactNode;
};
type NavGroup = { title: string; items: NavItem[]; roles?: string[] };

const navGroups: NavGroup[] = [
  {
    title: "Geral",
    roles: ["admin", "instructor"],
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: MessageSquare, label: "Mural de Avisos", path: "/admin/notices", featureKey: "avisos" },
    ],
  },
  {
    title: "Cadastros",
    roles: ["admin"],
    items: [
      { 
        icon: Users, 
        label: "Alunos", 
        path: "/admin/students", 
        featureKey: "alunos",
        badge: (s) => s.occupancyRate > 0 && (
          <span className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all",
            s.occupancyRate > 90 ? "bg-rose-500 text-white animate-pulse" : "bg-emerald-500/10 text-emerald-600"
          )}>
            {s.occupancyRate}%
          </span>
        )
      },
      { icon: Handshake, label: "Parcerias & Convênios", path: "/admin/partners", featureKey: "parcerias" },
      { 
        icon: UserPlus, 
        label: "CRM / Leads", 
        path: "/admin/crm", 
        featureKey: "crm",
        badge: (s) => s.newLeads > 0 && (
          <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg shadow-blue-500/30">
            {s.newLeads}
          </span>
        )
      },
      { icon: Sparkles, label: "Experimentos (Pagos)", path: "/admin/experimentos", featureKey: "experimentais" },
      { icon: ClipboardList, label: "Pré-Matrículas", path: "/admin/pre-matriculas", featureKey: "pre_matriculas" },
    ],
  },
  {
    title: "Aulas & Turmas",
    roles: ["admin", "instructor"],
    items: [
      { icon: Palette, label: "Modalidades", path: "/admin/modalities", featureKey: "modalidades" },
      { icon: CalendarDays, label: "Grade Híbrida", path: "/admin/hybrid-schedule", featureKey: "agenda_hibrida" },
      { icon: CalendarCheck, label: "Controle de Agendamentos", path: "/admin/bookings", featureKey: "agendamentos" },
      { icon: UserCheck, label: "Check-in Consolidado", path: "/admin/checkin", featureKey: "checkin" },
      { 
        icon: Calendar, 
        label: "Grade de Horários", 
        path: "/admin/schedule", 
        featureKey: "agenda",
        badge: (s) => s.activeClasses > 0 && (
          <span className="text-sidebar-foreground/30 text-[9px] font-mono font-bold">
            {s.activeClasses}
          </span>
        )
      },
    ],
  },
  {
    title: "Financeiro",
    roles: ["admin"],
    items: [
      { 
        icon: BarChart3, 
        label: "Gestão Financeira", 
        path: "/admin/financial", 
        featureKey: "financeiro",
        badge: (s) => s.overdueCount > 0 && (
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-lg shadow-rose-500/20" />
        )
      },
      { icon: Zap, label: "Vendas Avulsas", path: "/admin/vendas", featureKey: "vendas_avulsas" },
      { icon: CreditCard, label: "Planos", path: "/admin/plans", featureKey: "planos_estudio" },
      { 
        icon: TrendingUp, 
        label: "LTV / Churn", 
        path: "/admin/ltv", 
        featureKey: "ltv",
        badge: () => <TrendingUp className="h-3 w-3 text-emerald-500" />
      },
      { icon: DollarSign, label: "Repasses", path: "/admin/instructor-payments", featureKey: "repasses" },
      { icon: Users, label: "Gestão Instrutores", path: "/admin/instructors", featureKey: "instrutores" },
      { icon: FileText, label: "Contratos", path: "/admin/contracts", featureKey: "contratos" },
    ],
  },
  {
    title: "Loja & Estoque",
    roles: ["admin"],
    items: [
      { icon: Package, label: "Loja", path: "/admin/store", featureKey: "loja" },
      { icon: Zap, label: "PDV", path: "/admin/pdv", featureKey: "pdv" },
      { icon: ClipboardList, label: "Figurinos", path: "/admin/costumes", featureKey: "figurinos" },
    ],
  },
  {
    title: "Festivais & Eventos",
    roles: ["admin"],
    items: [
      { icon: CalendarDays, label: "Gestão Festival", path: "/admin/festivals", featureKey: "festivais" },
    ],
  },
  {
    title: "Sistema",
    roles: ["admin"],
    items: [
      { icon: UsersRound, label: "Usuários", path: "/admin/users" },
      { icon: Plug, label: "Integrações", path: "/admin/integrations", featureKey: "integracoes" },
      { icon: BarChart3, label: "Relatórios", path: "/admin/reports", featureKey: "relatorios" },
      { icon: HardDrive, label: "Backup & Versões", path: "/admin/backups", featureKey: "backups" },
      { icon: Code, label: "Dev Panel", path: "/admin/dev" },
      { icon: HelpCircle, label: "Manual do Usuário", path: "/admin/manual" },
      { icon: Settings, label: "Configurações", path: "/admin/settings" },
    ],
  },
];


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, roles, hasRole, user, loading: authLoading, isSuperAdmin: authIsSuperAdmin, studioId } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = authIsSuperAdmin;
  const { setTenant } = useTenant();
  const { data: studioConfig } = useStudioConfig(studioId);
  const { orgId, orgName, memberships, switchOrg, hasMultipleOrgs } = useOrganization();
  const { isFeatureEnabled } = useOrgFeatures();
  const { stats } = useSidebarStats();
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Double Cache Check: Master Refresh Function
  const handleMasterRefresh = async () => {
    setIsSyncing(true);
    try {
      // Step 1: Invalidate everything under 'admin' prefix
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      // Step 2: Force refetch of all active queries for immediate UI feedback
      await queryClient.refetchQueries({ queryKey: ["admin"], type: 'active' });
      
      toast.success("Sistema Sincronizado", {
        description: "Todos os dados administrativos foram atualizados (Double-Check ativo).",
        icon: <RefreshCw className="h-4 w-4 text-emerald-500" />
      });
    } catch (error) {
      toast.error("Falha na sincronização.");
    } finally {
      setIsSyncing(false);
    }
  };

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("sidebar-groups-collapsed");
    return saved ? JSON.parse(saved) : {};
  });

  // Filter nav items by feature flags AND roles
  const filteredNavGroups = navGroups
    .filter((group) => !group.roles || group.roles.some((r) => hasRole(r)))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const featureOk = !item.featureKey || isFeatureEnabled(item.featureKey);
        const roleOk = !item.roles || item.roles.some((r) => hasRole(r));
        return featureOk && roleOk;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };


  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem("sidebar-groups-collapsed", JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  useEffect(() => {
    // Auto-open group that contains active path
    const activeGroup = filteredNavGroups.find(g => 
      g.items.some(i => i.path === location.pathname)
    );
    if (activeGroup && collapsedGroups[activeGroup.title]) {
      setCollapsedGroups(prev => ({ ...prev, [activeGroup.title]: false }));
    }
  }, [location.pathname, filteredNavGroups.length]);

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => location.pathname === item.path);

  const studioName = studioConfig?.nome || "Kineos";
  const studioLogo = studioConfig?.sidebarLogoUrl || studioConfig?.logoUrl || "";
  const studioIcon = studioConfig?.sidebarIconUrl || studioConfig?.logoUrl || "";

  // Helper for Role labels
  const getRoleLabel = (r: string) => {
    const labels: Record<string, string> = {
      superadmin: "Super Admin",
      admin: "Administrador",
      instructor: "Instrutor",
      student: "Aluno",
    };
    return labels[r] || r;
  };

  const displayName = user?.user_metadata?.nome || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const initials = displayName.substring(0, 2).toUpperCase();
  const activeRole = roles.includes("superadmin") ? "superadmin" : roles[0];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar/80 backdrop-blur-xl text-sidebar-foreground transition-all duration-300 lg:static lg:translate-x-0 border-r border-sidebar-border/50 shadow-2xl shadow-black/5",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            collapsed ? "w-[68px]" : "w-64"
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex h-16 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "px-5"
          )}>
            {collapsed ? (
              studioIcon ? (
                <img src={`${studioIcon}?t=${Date.now()}`} alt={studioName} className="h-8 w-8 object-contain rounded" />
              ) : (
                <Dumbbell className="h-7 w-7 text-sidebar-primary" />
              )
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                {studioIcon ? (
                  <img src={`${studioIcon}?t=${Date.now()}`} alt="Icon" className="h-8 w-8 object-contain rounded shrink-0" />
                ) : (
                  <Dumbbell className="h-7 w-7 text-sidebar-primary shrink-0" />
                )}
                
                <div className="flex flex-col min-w-0 overflow-hidden">
                  {studioLogo ? (
                    <img src={`${studioLogo}?t=${Date.now()}`} alt={studioName} className="h-6 w-auto object-contain object-left" />
                  ) : (
                    <span className="text-lg font-bold text-sidebar-primary-foreground truncate leading-none">
                      {studioName}
                    </span>
                  )}
                </div>
              </div>
            )}
            {!collapsed && (
              <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground shrink-0 ml-auto" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {filteredNavGroups.map((group) => {
              const isCollapsed = collapsedGroups[group.title] ?? false;
              const groupActive = isGroupActive(group);

              return (
                <div key={group.title}>
                  {!collapsed && (
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                        groupActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
                      )}
                    >
                      {group.title}
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          isCollapsed && "-rotate-90"
                        )}
                      />
                    </button>
                  )}

                  {collapsed && <div className="my-1 mx-2 border-t border-sidebar-border" />}

                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      !collapsed && isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                    )}
                  >
                    <div className="space-y-0.5 pb-2">
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        const linkContent = (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center group/item gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 relative",
                              collapsed && "justify-center px-2",
                              isActive
                                ? "bg-primary/10 text-primary shadow-sm"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                            )}
                          >
                            <item.icon className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200",
                              isActive ? "scale-110" : "group-hover/item:scale-110"
                            )} />
                            {!collapsed && (
                              <div className="flex flex-1 items-center justify-between min-w-0">
                                <span className="truncate">{item.label}</span>
                                {item.badge && stats && (
                                  <div className="shrink-0 animate-in fade-in zoom-in duration-300">
                                    {item.badge(stats)}
                                  </div>
                                )}
                              </div>
                            )}
                            {isActive && !collapsed && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                            )}
                          </Link>
                        );

                        if (collapsed) {
                          return (
                            <Tooltip key={item.path}>
                              <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                              <TooltipContent side="right" sideOffset={8}>
                                {item.label}
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return linkContent;
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={cn("border-t border-sidebar-border p-4 space-y-2", collapsed && "p-2")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground"
                    onClick={async () => { await signOut(); navigate("/login"); }}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  onClick={async () => { await signOut(); navigate("/login"); }}
                >
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
                  <p className="text-[10px] text-sidebar-foreground/40 font-bold tracking-widest uppercase">Kineos Cloud v3.0.9 - 17:34h</p>
                  {isSuperAdmin && studioId && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-sidebar-foreground/30 font-mono truncate">Studio: {studioId}</p>
                      <p className="text-[9px] text-sidebar-foreground/30 font-mono truncate">User: {user?.id}</p>
                    </div>
                  )}
                
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            {/* Desktop collapse toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>

            {/* Org Switcher */}
            {hasMultipleOrgs && (
              <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 max-w-[220px]">
                    <Building2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm">{orgName}</span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-1" align="start">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Trocar empresa</div>
                  
                  {isSuperAdmin && (
                    <>
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
                        <span className="truncate flex-1 text-left uppercase">Visão Global (SaaS)</span>
                        {!orgId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                    </>
                  )}

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
                        }}
                      >
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate flex-1 text-left">{org?.nome || "Sem nome"}</span>
                        {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            )}

            <div className="flex-1" />
            <GlobalSearch />
            <div className="flex items-center gap-2 md:gap-4">
              {/* Double Cache Check: Global Sync Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleMasterRefresh}
                    disabled={isSyncing}
                    className={cn(
                      "text-muted-foreground hover:text-primary transition-colors",
                      isSyncing && "animate-spin text-primary"
                    )}
                  >
                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sincronização Forçada (Double Check)</TooltipContent>
              </Tooltip>

              <PaymentNotificationBell />
              
              <div className="hidden md:flex flex-col items-end gap-0.5">
                {authLoading ? (
                  <>
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-slate-700 leading-tight">Olá, {displayName}</span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/5 hover:bg-primary/10 border-none">
                      {getRoleLabel(activeRole)}
                    </Badge>
                  </>
                )}
              </div>

              <Avatar className="h-9 w-9 border border-border bg-primary/10">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs font-bold text-primary">
                   {authLoading ? <Skeleton className="h-full w-full rounded-full" /> : initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
