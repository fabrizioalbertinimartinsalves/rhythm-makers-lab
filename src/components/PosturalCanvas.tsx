import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Undo2, Eraser, Pen, Circle } from "lucide-react";

interface PosturalCanvasProps {
  imageUrl: string;
  onSave?: (dataUrl: string) => void;
  readOnly?: boolean;
  savedAnnotation?: string;
}

type Tool = "pen" | "circle";

export default function PosturalCanvas({ imageUrl, onSave, readOnly = false, savedAnnotation }: PosturalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBgImage(img);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = containerRef.current;
      if (!container) return;

      const maxW = container.clientWidth;
      const ratio = img.height / img.width;
      canvas.width = maxW;
      canvas.height = maxW * ratio;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawBackground(ctx, img);

      // If there's a saved annotation, draw it on top
      if (savedAnnotation) {
        const annotImg = new Image();
        annotImg.crossOrigin = "anonymous";
        annotImg.onload = () => {
          ctx.drawImage(annotImg, 0, 0, canvas.width, canvas.height);
        };
        annotImg.src = savedAnnotation;
      }

      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    img.src = imageUrl;
  }, [imageUrl, savedAnnotation, drawBackground]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory((h) => [...h, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);
    setIsDrawing(true);

    if (tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);

    if (tool === "pen") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (tool === "circle") {
      // Draw circle at last position
      const pos = getPos(e);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    saveState();
  };

  const undo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop();
    const prev = newHistory[newHistory.length - 1];
    ctx.putImageData(prev, 0, 0);
    setHistory(newHistory);
  };

  const clearAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawBackground(ctx, bgImage);
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSave) return;
    onSave(canvas.toDataURL("image/png"));
  };

  const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ffffff"];

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative border border-border rounded-lg overflow-hidden bg-muted">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {!readOnly && (
        <div className="space-y-2">
          {/* Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={tool === "pen" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("pen")}
              className="gap-1"
            >
              <Pen className="h-3.5 w-3.5" /> Caneta
            </Button>
            <Button
              variant={tool === "circle" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("circle")}
              className="gap-1"
            >
              <Circle className="h-3.5 w-3.5" /> Marcador
            </Button>
            <Button variant="outline" size="sm" onClick={undo} className="gap-1">
              <Undo2 className="h-3.5 w-3.5" /> Desfazer
            </Button>
            <Button variant="outline" size="sm" onClick={clearAnnotations} className="gap-1">
              <Eraser className="h-3.5 w-3.5" /> Limpar
            </Button>
          </div>

          {/* Colors */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cor:</span>
            {colors.map((c) => (
              <button
                key={c}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-125" : "border-border"}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          {/* Line width */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Espessura:</span>
            <Slider
              value={[lineWidth]}
              onValueChange={([v]) => setLineWidth(v)}
              min={1}
              max={8}
              step={1}
              className="w-32"
            />
            <span className="text-xs font-mono">{lineWidth}px</span>
          </div>

          {onSave && (
            <Button onClick={handleSave} className="w-full">
              Salvar Anotação Postural
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
