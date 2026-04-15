import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, UserCheck, FileHeart, Home, LogOut, Menu, X, MessageSquare, Settings, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import PaymentNotificationBell from "@/components/PaymentNotificationBell";
import { useUnreadAvisos } from "@/hooks/useUnreadAvisos";

const navItems = [
  { icon: Home, label: "Início", path: "/instructor" },
  { icon: MapPin, label: "Fazer Check-in", path: "/instructor/check-in" },
  { icon: UserCheck, label: "Chamada", path: "/instructor/attendance" },
  { icon: FileHeart, label: "Prontuário", path: "/instructor/records" },
  { icon: ClipboardList, label: "Avaliações", path: "/instructor/assessments" },
  { icon: MessageSquare, label: "Mural", path: "/instructor/notices" },
  { icon: Settings, label: "Preferências", path: "/instructor/settings" },
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { setTenant } = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { unreadCount } = useUnreadAvisos(["todos", "instrutores"]);

  const renderNavBadge = (path: string) => {
    if (path === "/instructor/notices" && unreadCount > 0) {
      return <Badge variant="destructive" className="text-[9px] px-1 py-0 min-w-[16px] h-4 leading-none">{unreadCount > 9 ? "9+" : unreadCount}</Badge>;
    }
    return null;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-5">
          <span className="text-base font-bold text-sidebar-primary-foreground">Kineos</span>
          <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {renderNavBadge(item.path)}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={async () => { await signOut(); navigate("/login"); }}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-bold text-primary lg:hidden">Kineos</span>
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <PaymentNotificationBell />
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={async () => { await signOut(); navigate("/login"); }}>
              <LogOut className="h-3.5 w-3.5" /> Sair
            </Button>
          </div>
          <div className="hidden lg:block flex-1" />
          <div className="hidden lg:flex items-center gap-2">
            <PaymentNotificationBell />
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">IN</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:pb-6 lg:p-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card py-2 shadow-lg lg:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                {renderNavBadge(item.path) && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "!" : unreadCount}
                  </span>
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
