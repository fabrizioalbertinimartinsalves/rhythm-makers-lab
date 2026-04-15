import { useStudioConfig } from "@/hooks/useStudioConfig";
import { Dumbbell } from "lucide-react";

interface StudioLogoProps {
  showName?: boolean;
  className?: string;
}

export function StudioLogo({ showName = false, className }: StudioLogoProps) {
  const { data: config } = useStudioConfig();

  return (
    <div className={className}>
      <div className="flex justify-center">
        {config?.logoUrl ? (
          <img
            src={config.logoUrl}
            alt={config.nome}
            className="h-14 w-auto object-contain"
          />
        ) : (
          <div className="rounded-xl bg-primary/10 p-3">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
        )}
      </div>
      {showName && (
        <h1 className="text-2xl font-bold text-center mt-2">
          {config?.nome || "Kineos"}
        </h1>
      )}
    </div>
  );
}
