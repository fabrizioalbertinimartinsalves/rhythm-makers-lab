import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";

type AppRole = "superadmin" | "admin" | "instructor" | "student" | string;

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, roles, loading } = useAuth();
  const { selectedStudio } = useTenant();

  // Bloqueio rigoroso: enquanto estiver carregando, NÃO toma decisões de redirecionamento.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User has multiple roles but hasn't chosen one yet — send to login for selection
  // Bypass if user is superadmin (they default to global mode)
  if (roles.length > 1 && !role && !roles.includes("superadmin")) {
    return <Navigate to="/login" replace />;
  }

  // User disabled check (bypass for SuperAdmin)
  const isSA = role?.includes("superadmin");
  
  if (!isSA && (user as any).disabled) {
    return <Navigate to="/blocked" replace />;
  }

  // Subscription check (bypass for SuperAdmin)
  if (!isSA && selectedStudio) {
    const isInactive = selectedStudio.ativa === false;
    const isBlocked = ["blocked", "canceled", "unpaid", "paused", "delinquent"].includes(selectedStudio.status_assinatura || "");
    
    if (isInactive || isBlocked) {
      return <Navigate to="/blocked" replace />;
    }
  }

  if (allowedRoles && role) {
    const isSA = roles.includes("superadmin");
    const hasAccess = role.some(r => allowedRoles.includes(r)) || isSA;
    
    if (!hasAccess) {
      const primaryRole = role[0] || "student";
      const roleHome = primaryRole === "superadmin" ? "/superadmin" : primaryRole === "admin" ? "/admin" : primaryRole === "instructor" ? "/instructor" : "/student";
      return <Navigate to={roleHome} replace />;
    }
  }

  return <>{children}</>;
}
