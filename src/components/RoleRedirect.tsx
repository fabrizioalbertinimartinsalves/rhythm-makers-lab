import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import LandingPage from "@/pages/LandingPage";
import Index from "@/pages/Index";

export default function RoleRedirect() {
  const { role, roles, loading, session, user, studioId } = useAuth();
  const [prefLoaded, setPrefLoaded] = useState(false);
  const { isLoading: tenantLoading } = useTenant();

  useEffect(() => {
    if (!user) {
      setPrefLoaded(true);
      return;
    }
    const fetchPrefs = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .single();
        // Preferences not needed for redirect logic anymore as we prioritize role
      } catch (err) {
        console.error("Error fetching preferences:", err);
      } finally {
        setPrefLoaded(true);
      }
    };
    fetchPrefs();
  }, [user]);

  if (loading || tenantLoading || !prefLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <LandingPage />;

  const isSA = roles.includes("superadmin") || user?.email === "fabriziofarmaceutico@gmail.com";
  
  if (isSA && !studioId) {
    return <Navigate to="/superadmin" replace />;
  }

  if (roles.length > 1 && !studioId) {
    return <Navigate to="/login" replace />;
  }

  if (role?.includes("admin")) return <Navigate to="/admin" replace />;
  if (role?.includes("instructor")) return <Navigate to="/instructor" replace />;
  if (role?.includes("student")) return <Navigate to="/student" replace />;

  return <Index />;
}
