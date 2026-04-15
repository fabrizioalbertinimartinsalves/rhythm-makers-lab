import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("pwa-install-dismissed")) {
      setDismissed(true);
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setDismissed(true);
      return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  if (dismissed || (!deferredPrompt && !isIOS)) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 animate-fade-in">
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-xl">
        {showIOSGuide ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-card-foreground">Como instalar no iPhone</h3>
              <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
              <li>Toque no ícone de <strong>compartilhar</strong> (quadrado com seta)</li>
              <li>Role e toque em <strong>"Adicionar à Tela de Início"</strong></li>
              <li>Toque em <strong>"Adicionar"</strong></li>
            </ol>
            <Button variant="outline" size="sm" className="w-full" onClick={handleDismiss}>
              Entendi
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-card-foreground">Instalar Kineos App</h3>
              <p className="text-xs text-muted-foreground">
                Acesse direto da tela inicial do seu celular
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" onClick={handleInstall} className="text-xs">
                Instalar
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
