import { useState } from "react";
import bodySilhouetteFront from "@/assets/body-silhouette-front.png";
import bodySilhouetteBack from "@/assets/body-silhouette-back.png";

interface PainPoint {
  id: string;
  label: string;
  x: number; // percentage
  y: number; // percentage
  view: "front" | "back" | "both";
}

interface PainMapProps {
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  onPartClick?: (partId: string, partLabel: string) => void;
  readOnly?: boolean;
}

const bodyParts: PainPoint[] = [
  // Front view
  { id: "cabeca", label: "Cabeça", x: 50, y: 5.5, view: "both" },
  { id: "pescoco", label: "Pescoço", x: 50, y: 11, view: "both" },
  { id: "ombro_e", label: "Ombro Esq.", x: 35, y: 16, view: "front" },
  { id: "ombro_d", label: "Ombro Dir.", x: 65, y: 16, view: "front" },
  { id: "peito", label: "Peito", x: 50, y: 21, view: "front" },
  { id: "braco_e", label: "Braço Esq.", x: 27, y: 28, view: "front" },
  { id: "braco_d", label: "Braço Dir.", x: 73, y: 28, view: "front" },
  { id: "cotovelo_e", label: "Cotovelo Esq.", x: 23, y: 35, view: "front" },
  { id: "cotovelo_d", label: "Cotovelo Dir.", x: 77, y: 35, view: "front" },
  { id: "abdomen", label: "Abdômen", x: 50, y: 32, view: "front" },
  { id: "punho_e", label: "Mão Esq.", x: 19, y: 46, view: "front" },
  { id: "punho_d", label: "Mão Dir.", x: 81, y: 46, view: "front" },
  { id: "quadril_e", label: "Quadril Esq.", x: 42, y: 42, view: "front" },
  { id: "quadril_d", label: "Quadril Dir.", x: 58, y: 42, view: "front" },
  { id: "coxa_e", label: "Coxa Esq.", x: 42, y: 54, view: "front" },
  { id: "coxa_d", label: "Coxa Dir.", x: 58, y: 54, view: "front" },
  { id: "joelho_e", label: "Joelho Esq.", x: 42, y: 65, view: "front" },
  { id: "joelho_d", label: "Joelho Dir.", x: 58, y: 65, view: "front" },
  { id: "panturrilha_e", label: "Panturrilha Esq.", x: 42, y: 76, view: "front" },
  { id: "panturrilha_d", label: "Panturrilha Dir.", x: 58, y: 76, view: "front" },
  { id: "tornozelo_e", label: "Tornozelo Esq.", x: 42, y: 87, view: "front" },
  { id: "tornozelo_d", label: "Tornozelo Dir.", x: 58, y: 87, view: "front" },
  { id: "pe_e", label: "Pé Esq.", x: 42, y: 94, view: "front" },
  { id: "pe_d", label: "Pé Dir.", x: 58, y: 94, view: "front" },
  // Back view
  { id: "cervical", label: "Cervical", x: 50, y: 13, view: "back" },
  { id: "trapezio_e", label: "Trapézio Esq.", x: 38, y: 17, view: "back" },
  { id: "trapezio_d", label: "Trapézio Dir.", x: 62, y: 17, view: "back" },
  { id: "escapula_e", label: "Escápula Esq.", x: 38, y: 23, view: "back" },
  { id: "escapula_d", label: "Escápula Dir.", x: 62, y: 23, view: "back" },
  { id: "toracica", label: "Torácica", x: 50, y: 25, view: "back" },
  { id: "lombar", label: "Lombar", x: 50, y: 35, view: "back" },
  { id: "sacro", label: "Sacro", x: 50, y: 42, view: "back" },
  { id: "gluteo_e", label: "Glúteo Esq.", x: 42, y: 46, view: "back" },
  { id: "gluteo_d", label: "Glúteo Dir.", x: 58, y: 46, view: "back" },
  { id: "posterior_coxa_e", label: "Post. Coxa Esq.", x: 42, y: 56, view: "back" },
  { id: "posterior_coxa_d", label: "Post. Coxa Dir.", x: 58, y: 56, view: "back" },
  { id: "popliteo_e", label: "Poplíteo Esq.", x: 42, y: 66, view: "back" },
  { id: "popliteo_d", label: "Poplíteo Dir.", x: 58, y: 66, view: "back" },
  { id: "gemeo_e", label: "Gêmeo Esq.", x: 42, y: 76, view: "back" },
  { id: "gemeo_d", label: "Gêmeo Dir.", x: 58, y: 76, view: "back" },
  { id: "calcanhar_e", label: "Calcanhar Esq.", x: 42, y: 92, view: "back" },
  { id: "calcanhar_d", label: "Calcanhar Dir.", x: 58, y: 92, view: "back" },
];

const painColor = (level: number) => {
  if (level === 0) return "transparent";
  if (level <= 3) return "hsl(120, 60%, 50%)";
  if (level <= 6) return "hsl(45, 90%, 50%)";
  if (level <= 8) return "hsl(25, 90%, 50%)";
  return "hsl(0, 80%, 50%)";
};

const painBg = (level: number) => {
  if (level <= 3) return "rgba(74,222,128,0.25)";
  if (level <= 6) return "rgba(250,204,21,0.25)";
  if (level <= 8) return "rgba(251,146,60,0.25)";
  return "rgba(248,113,113,0.3)";
};

export default function PainMap({ value, onChange, onPartClick, readOnly }: PainMapProps) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [view, setView] = useState<"front" | "back">("front");
  const [showLabels, setShowLabels] = useState(true);

  const handleClick = (part: PainPoint) => {
    if (readOnly) return;
    const current = value[part.id] || 0;
    const next = current >= 10 ? 0 : current + 1;
    onChange({ ...value, [part.id]: next });
    if (onPartClick && next > 0) {
      onPartClick(part.id, part.label);
    }
  };

  const visibleParts = bodyParts.filter(
    (p) => p.view === view || p.view === "both"
  );

  const activeParts = Object.entries(value).filter(([, v]) => v > 0);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* View toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setView("front")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === "front"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setView("back")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === "back"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Posterior
        </button>
      </div>

      {/* Labels toggle */}
      <button
        type="button"
        onClick={() => setShowLabels(!showLabels)}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline"
      >
        {showLabels ? "Ocultar nomes" : "Mostrar nomes"}
      </button>

      <div className="relative w-full max-w-[280px] mx-auto">
        <img
          src={view === "front" ? bodySilhouetteFront : bodySilhouetteBack}
          alt={`Silhueta corporal - vista ${view === "front" ? "anterior" : "posterior"}`}
          className="w-full h-auto opacity-70   select-none pointer-events-none"
          draggable={false}
        />

        {/* Interactive pain points */}
        {visibleParts.map((part) => {
          const level = value[part.id] || 0;
          const isHovered = hoveredPart === part.id;
          const size = level > 0 ? 28 : 20;

          // Determine label position: left side points → label on left, right → right, center → top
          const isLeft = part.x < 45;
          const isRight = part.x > 55;
          const labelSide = isLeft ? "left" : isRight ? "right" : "top";

          return (
            <div
              key={part.id}
              className="absolute"
              style={{
                left: `${part.x}%`,
                top: `${part.y}%`,
                transform: "translate(-50%, -50%)",
                zIndex: isHovered ? 20 : level > 0 ? 10 : 5,
              }}
            >
              {/* Pulse ring for active */}
              {level > 0 && (
                <div
                  className="absolute rounded-full animate-ping"
                  style={{
                    width: size + 10,
                    height: size + 10,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: painBg(level),
                  }}
                />
              )}

              {/* Label with arrow line */}
              {showLabels && (
                <div
                  className="absolute pointer-events-none flex items-center"
                  style={{
                    ...(labelSide === "left"
                      ? {
                          right: "calc(100% + 2px)",
                          top: "50%",
                          transform: "translateY(-50%)",
                          flexDirection: "row",
                        }
                      : labelSide === "right"
                      ? {
                          left: "calc(100% + 2px)",
                          top: "50%",
                          transform: "translateY(-50%)",
                          flexDirection: "row-reverse",
                        }
                      : {
                          bottom: "calc(100% + 2px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          flexDirection: "column-reverse",
                        }),
                  }}
                >
                  {/* Arrow line */}
                  <div
                    style={{
                      ...(labelSide === "top"
                        ? { width: 1, height: 6, marginBottom: 1 }
                        : { width: 6, height: 1, ...(labelSide === "left" ? { marginLeft: 1 } : { marginRight: 1 }) }),
                      backgroundColor: "hsl(var(--muted-foreground) / 0.4)",
                    }}
                  />
                  {/* Label text */}
                  <span
                    className="whitespace-nowrap leading-none"
                    style={{
                      fontSize: "7px",
                      color: "hsl(var(--muted-foreground))",
                      fontWeight: 500,
                    }}
                  >
                    {part.label}
                  </span>
                </div>
              )}

              {/* Main dot */}
              <button
                type="button"
                onClick={() => handleClick(part)}
                onMouseEnter={() => setHoveredPart(part.id)}
                onMouseLeave={() => setHoveredPart(null)}
                onTouchStart={() => setHoveredPart(part.id)}
                onTouchEnd={() => setTimeout(() => setHoveredPart(null), 1500)}
                disabled={readOnly}
                className="relative rounded-full transition-all duration-200 flex items-center justify-center border-2"
                style={{
                  width: size,
                  height: size,
                  backgroundColor:
                    level > 0
                      ? painColor(level)
                      : isHovered
                      ? "hsl(var(--primary) / 0.3)"
                      : "hsl(var(--muted-foreground) / 0.15)",
                  borderColor:
                    isHovered
                      ? "hsl(var(--primary))"
                      : level > 0
                      ? painColor(level)
                      : "hsl(var(--muted-foreground) / 0.25)",
                  cursor: readOnly ? "default" : "pointer",
                  boxShadow:
                    level > 0
                      ? `0 0 8px ${painColor(level)}80`
                      : "none",
                }}
              >
                {level > 0 && (
                  <span className="text-[10px] font-bold text-white leading-none drop-shadow-sm">
                    {level}
                  </span>
                )}
              </button>

              {/* Tooltip on hover */}
              {isHovered && (
                <div
                  className="absolute whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-medium shadow-md pointer-events-none"
                  style={{
                    bottom: "calc(100% + 6px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  {part.label}
                  {level > 0 && (
                    <span style={{ color: painColor(level) }}> · {level}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs items-center flex-wrap justify-center">
        {[
          { label: "Leve (1-3)", color: "hsl(120,60%,50%)" },
          { label: "Moderada (4-6)", color: "hsl(45,90%,50%)" },
          { label: "Intensa (7-8)", color: "hsl(25,90%,50%)" },
          { label: "Severa (9-10)", color: "hsl(0,80%,50%)" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: l.color }}
            />
            {l.label}
          </span>
        ))}
      </div>

      {!readOnly && (
        <p className="text-[10px] text-muted-foreground text-center">
          Toque nos pontos para marcar o nível de dor (0→1→2→…→10→0)
        </p>
      )}

      {!readOnly && activeParts.length > 0 && (
        <div className="w-full text-xs space-y-1">
          <p className="font-medium text-muted-foreground">Áreas marcadas:</p>
          {activeParts.map(([id, level]) => {
            const part = bodyParts.find((p) => p.id === id);
            return (
              <div
                key={id}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50"
              >
                <span className="font-medium">{part?.label}</span>
                <span
                  className="font-bold"
                  style={{ color: painColor(level as number) }}
                >
                  Nível {level}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
