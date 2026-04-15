import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/hooks/useOrganization";

export function useOrgFeatures() {
  const { orgId } = useOrganization();

  const { data: studioData, isLoading } = useQuery({
    queryKey: ["org-features-sb", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("features")
        .eq("id", orgId)
        .single();
      
      if (error) throw error;
      return data || { features: {} };
    },
    staleTime: 5 * 60 * 1000,
  });

  const isFeatureEnabled = (key: string): boolean => {
    const features = (studioData as any)?.features || {};
    // If no explicit record, feature is enabled by default
    return features[key] !== false;
  };

  return { 
    isFeatureEnabled, 
    features: (studioData as any)?.features || {}, 
    isLoading 
  };
}
