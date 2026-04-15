import { useAuth } from "@/hooks/useAuth";
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useOrganization() {
  const { isSuperAdmin, studioId, setStudioId, memberships: authMemberships } = useAuth();

  // Fetch all studios if SuperAdmin
  const { data: allStudios = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["superadmin-all-studios-switcher-sb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("id, nome, slug")
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  // Fetch memberships with studio names for non-superadmins
  const { data: userStudios = [], isLoading: isLoadingUserStudios } = useQuery({
    queryKey: ["user-memberships-studios", authMemberships],
    enabled: !isSuperAdmin && authMemberships.length > 0,
    queryFn: async () => {
      const ids = authMemberships.map((m: any) => m.studioId);
      const { data, error } = await supabase
        .from("studios")
        .select("id, nome, slug")
        .in("id", ids);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Map memberships according to role
  const memberships = useMemo(() => {
    if (isSuperAdmin) {
      return allStudios.map((s: any) => ({
        organization_id: s.id,
        role: "superadmin",
        organization_settings: {
          id: s.id,
          nome: s.nome || s.name || "Sem Nome",
          slug: s.slug || "",
        }
      }));
    }

    // For common users, use fetched studio names
    return authMemberships.map((m: any) => {
      const studio = userStudios.find((s: any) => s.id === m.studioId);
      return {
        organization_id: m.studioId,
        role: m.role,
        organization_settings: {
          id: m.studioId,
          nome: studio?.nome || `Estúdio ${m.studioId.substring(0, 4)}...`,
          slug: studio?.slug || "",
        }
      };
    });
  }, [isSuperAdmin, allStudios, authMemberships, userStudios]);

  const activeMembership = useMemo(() => {
    return memberships.find(m => m.organization_id === studioId) || null;
  }, [memberships, studioId]);

  const switchOrg = useCallback((newOrgId: string) => {
    if (isSuperAdmin && newOrgId) {
      setStudioId(newOrgId, "admin");
    } else {
      setStudioId(newOrgId);
    }
  }, [isSuperAdmin, setStudioId]);

  return {
    orgId: studioId,
    orgName: activeMembership?.organization_settings?.nome || "Escolha uma Empresa",
    orgSlug: activeMembership?.organization_settings?.slug || "",
    orgLogo: null,
    isLoading: isSuperAdmin ? isLoadingAll : false,
    memberships,
    activeMembership,
    switchOrg,
    hasMultipleOrgs: memberships.length > 1,
  };
}
