import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "superadmin" | "admin" | "instructor" | "student" | string;

interface Membership {
  studioId: string;
  role: AppRole | AppRole[];
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole[] | null;
  roles: AppRole[];
  memberships: Membership[];
  disabled?: boolean;
  forcePasswordChange?: boolean;
  studioId: string | null;
  isSuperAdmin: boolean;
  loading: boolean;
  isLoaded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (code: string, newPass: string) => Promise<void>;
  setActiveRole: (role: AppRole | AppRole[]) => void;
  setStudioId: (id: string | null, forceRole?: AppRole | AppRole[]) => void;
  hasRole: (roleName: string) => boolean;
  organizations?: any[];
  saasPlans?: any[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_ROLE_KEY = "studioflow_active_role";
function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "default";
      const pkg = localStorage.getItem(`sb-${projectId}-auth-token`);
      if (pkg) {
        const parsed = JSON.parse(pkg);
        // Validar se o pacote tem o formato esperado do Supabase
        if (parsed?.access_token && parsed?.user) return parsed;
      }
    } catch { /* ignore */ }
    return null;
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "default";
      const pkg = localStorage.getItem(`sb-${projectId}-auth-token`);
      if (pkg) {
        const parsed = JSON.parse(pkg);
        return parsed?.user || null;
      }
    } catch { /* ignore */ }
    return null;
  });
  const [roles, setRoles] = useState<AppRole[]>(() => {
    try {
      const saved = localStorage.getItem("auth_roles_cache");
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch { /* ignore */ }
    return [];
  });
  const [role, setRole] = useState<AppRole[] | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_ROLE_KEY);
      if (!saved || saved === "undefined") return null;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch { return null; }
  });
  const [memberships, setMemberships] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("auth_memberships_cache");
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch { /* ignore */ }
    return [];
  });
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [saasPlans, setSaasPlans] = useState<any[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [studioId, setStudioId] = useState<string | null>(() => {
    const saved = localStorage.getItem("selectedTenant");
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed) return null;
      return typeof parsed === 'string' ? parsed : parsed.id;
    } catch { 
      // Se não for JSON, pode ser a string ID pura
      return saved; 
    }
  });
  // Se já temos user/roles no cache, não precisamos mostrar loading no boot
  // Estado inicial de loading deve ser verdadeiro para evitar flashes de conteúdo deslogado
  const [loading, setLoading] = useState(true);
  const { setTenant } = useTenant();
  const initializedRef = useRef(false);

  const fetchUserData = async (uid: string, userEmail?: string | null) => {
    try {
      console.warn("[useAuth] Fetching user data for:", uid);
      // Buscar perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      // Buscar memberships (vínculos com estúdios)
      const { data: membershipData } = await supabase
        .from("memberships")
        .select("studio_id, roles")
        .eq("user_id", uid);

      const fetchedMemberships: Membership[] = (membershipData || []).map(m => ({
        studioId: m.studio_id,
        role: Array.isArray(m.roles) ? m.roles : [m.roles].filter(Boolean)
      }));

      const activeEmail = userEmail || profileData?.email || "";
      const isSuperAdmin =
        profileData?.is_global_superadmin === true ||
        activeEmail.toLowerCase() === "fabriziofarmaceutico@gmail.com";

      let fetchedRoles: AppRole[] = [];
      if (isSuperAdmin) {
        fetchedRoles = ["superadmin", "admin", "instructor", "student"];
      } else if (fetchedMemberships.length > 0) {
        const allRoles = fetchedMemberships.flatMap(m =>
          Array.isArray(m.role) ? m.role : [m.role]
        );
        fetchedRoles = Array.from(new Set(allRoles));
      }

      return {
        roles: fetchedRoles,
        memberships: fetchedMemberships,
        disabled: profileData?.disabled || false,
        forcePasswordChange: profileData?.force_password_change || false
      };
    } catch (err) {
      console.error("fetchUserData Error:", err);
      return { roles: [], memberships: [], disabled: false };
    }
  };

  const resolveActiveRole = (fetchedRoles: AppRole[]): AppRole[] | null => {
    if (!fetchedRoles || fetchedRoles.length === 0) return null;
    const isSuperAdmin = fetchedRoles.includes("superadmin");
    const savedStudioStr = localStorage.getItem("selectedTenant");
    
    if (isSuperAdmin && !savedStudioStr) return ["superadmin"];
    
    const stored = localStorage.getItem(ACTIVE_ROLE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const roleArray = Array.isArray(parsed) ? parsed : [parsed];
        const validRoles = roleArray.filter(r => fetchedRoles.includes(r));
        if (validRoles.length > 0) return validRoles;
      } catch {
        if (fetchedRoles.includes(stored)) return [stored];
      }
    }
    
    if (isSuperAdmin && savedStudioStr) return ["admin"];
    if (isSuperAdmin) return ["superadmin"];
    if (fetchedRoles.length === 1) return [fetchedRoles[0]];
    
    return null;
  };

  const setActiveRole = (r: AppRole | AppRole[] | null) => {
    if (r) {
      const roleArray = Array.isArray(r) ? r : [r];
      localStorage.setItem(ACTIVE_ROLE_KEY, JSON.stringify(roleArray));
      setRole(roleArray);
    } else {
      localStorage.removeItem(ACTIVE_ROLE_KEY);
      setRole(null);
    }
  };

  // Função centralizada para inicializar ou atualizar a sessão
  const handleAuthUpdate = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setSession(null);
      setUser(null);
      setRoles([]);
      setRole(null);
      setStudioId(null);
      setMemberships([]);
      setLoading(false);
      initializedRef.current = true;
      return;
    }

    const uid = currentSession?.user?.id;
    if (!uid) {
      console.warn("[useAuth] No UIID found in session, aborting hydration");
      setLoading(false);
      return;
    }
    const fetchedData = await fetchUserData(uid, currentSession.user.email);
    
    setSession(currentSession);
    setUser(currentSession.user);
    setRoles(fetchedData.roles);
    setMemberships(fetchedData.memberships);
    setDisabled(fetchedData.disabled || false);
    setForcePasswordChange(fetchedData.forcePasswordChange || false);
    
    // Debug Hydration
    console.warn("[useAuth] fetchedData:", {
      roles: fetchedData.roles,
      memberships: fetchedData.memberships?.length,
      isSA: fetchedData.roles.includes("superadmin")
    });

    // Restaurar estúdio salvo (Tenant Context)
    const savedStudioStr = localStorage.getItem("selectedTenant");
    if (savedStudioStr) {
      try {
        const studio = JSON.parse(savedStudioStr);
        if (!studio) return;
        // SAs podem acessar qualquer estúdio, outros apenas os que têm membership
        if (fetchedData.roles?.includes("superadmin") || fetchedData.memberships?.some(m => m.studioId === studio.id)) {
          setStudioId(studio.id);
        }
      } catch { /* ignore */ }
    }

    // SuperAdmin Hydration: Buscar todas as empresas e planos para o painel Global
    if (fetchedData.roles.includes("superadmin")) {
      try {
        console.warn("[useAuth] SuperAdmin Hydration: Fetching all orgs and plans");
        const [orgsRes, plansRes] = await Promise.all([
          supabase.from("studios").select("*").order("nome"),
          supabase.from("saas_plans").select("*").order("valor_mensal")
        ]);
        if (!orgsRes.error) setOrganizations(orgsRes.data);
        if (!plansRes.error) setSaasPlans(plansRes.data);
      } catch (err) {
        console.error("[useAuth] SuperAdmin Hydration Error:", err);
      }
    }

    setLoading(false);
    initializedRef.current = true;
    console.warn("[useAuth] Session hydrated successfully");
  };

  useEffect(() => {
    let mounted = true;

    // 1. Verificar sessão inicial (GetSession)
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted) {
        handleAuthUpdate(initialSession);
      }
    });

    // 2. Escutar mudanças (OnAuthStateChange)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, changedSession) => {
        console.warn("[useAuth] onAuthStateChange:", event);
        if (mounted) {
          if (event === "SIGNED_OUT") {
            // Logout limpa tudo e para o loading
            handleAuthUpdate(null);
          } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            handleAuthUpdate(changedSession);
          }
        }
      }
    );

    // Timeout de segurança para evitar loading infinito
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[useAuth] Safety timeout triggered");
        setLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } }
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        nome,
        email,
        created_at: new Date().toISOString()
      }, { onConflict: "id" });
    }
  }, []);

  const signOut = useCallback(async () => {
    console.warn("[useAuth] Initiating signOut...");
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[useAuth] Supabase signOut error:", err);
    }
    
    setSession(null);
    setUser(null);
    setRoles([]);
    setRole(null);
    setStudioId(null);
    setMemberships([]);
    
    try {
       setTenant(null);
    } catch { /* ignore */ }
    
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  }, [setTenant]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (_code: string, newPass: string) => {
    const { error: authError } = await supabase.auth.updateUser({ password: newPass });
    if (authError) throw authError;

    // Se a troca de senha foi bem sucedida, limpar o flag no perfil
    if (user?.id) {
       await supabase.from("profiles").update({ force_password_change: false }).eq("id", user.id);
       setForcePasswordChange(false);
    }
  }, [user?.id]);

  const setStudioIdAndRole = useCallback((sid: string | null, forceRole?: AppRole | AppRole[]) => {
    setStudioId(sid);
    if (!sid) {
      localStorage.removeItem("selectedTenant");
      setActiveRole([]);
    } else {
      const isSuperAdmin = roles.includes("superadmin");
      const m = memberships.find(m => m.studioId === sid);
      localStorage.setItem("selectedTenant", JSON.stringify({ id: sid }));
      if (forceRole) {
        setActiveRole(forceRole);
      } else if (isSuperAdmin) {
        setActiveRole(["admin"]);
      } else if (m) {
        setActiveRole(m.role);
      } else if (isSuperAdmin) {
        setActiveRole(["admin"]);
      }
    }
  }, [roles, memberships]);

  const hasRole = useCallback((roleName: string) => {
    if (!role) return false;
    return role.includes(roleName);
  }, [role]);

  const contextValue = useMemo(() => ({
    session, user, role, roles, memberships, disabled, forcePasswordChange, studioId, loading,
    isLoaded: !loading,
    isSuperAdmin: roles.includes("superadmin"),
    organizations, saasPlans,
    signIn, signUp, signOut, resetPassword, updatePassword,
    setActiveRole, setStudioId: setStudioIdAndRole, hasRole
  }), [
    session, user, role, roles, memberships, disabled, studioId, loading,
    organizations, saasPlans,
    signIn, signUp, signOut, resetPassword, updatePassword,
    setStudioIdAndRole, hasRole
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
export { AuthProvider, useAuth };
