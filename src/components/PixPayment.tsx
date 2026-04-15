import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { usePixConfig } from "@/hooks/usePixConfig";

function crc16ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generate a static Pix BR Code (EMV QR Code) payload.
 * Follows BACEN specification for Pix QR Code estático.
 */
function buildPixPayload({
  chavePix,
  nomeBeneficiario,
  cidade,
  valor,
  txid,
}: {
  chavePix: string;
  nomeBeneficiario: string;
  cidade: string;
  valor?: number;
  txid?: string;
}): string {
  const pad = (id: string, val: string) => {
    const len = val.length.toString().padStart(2, "0");
    return `${id}${len}${val}`;
  };

  const gui = pad("00", "br.gov.bcb.pix");
  const chave = pad("01", chavePix);
  const mai = pad("26", gui + chave);
  const mcc = pad("52", "0000");
  const currency = pad("53", "986");
  const amount = valor && valor > 0 ? pad("54", valor.toFixed(2)) : "";
  const country = pad("58", "BR");
  const name = pad("59", nomeBeneficiario.slice(0, 25));
  const city = pad("60", cidade.slice(0, 15));
  const tx = pad("05", (txid || "***").slice(0, 25));
  const additional = pad("62", tx);
  const pfi = pad("00", "01");

  const payload = pfi + mai + mcc + currency + amount + country + name + city + additional;
  const crcPayload = payload + "6304";
  const crc = crc16ccitt(crcPayload);

  return crcPayload + crc;
}

interface PixPaymentProps {
  valor?: number;
  descricao?: string;
  txid?: string;
}

export default function PixPayment({ valor, descricao, txid }: PixPaymentProps) {
  const { data: pixConfig, isLoading } = usePixConfig();
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Smartphone className="h-5 w-5 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!pixConfig?.chavePix) {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-muted-foreground">
          Chave Pix não configurada. Configure em Configurações → Estúdio.
        </p>
      </div>
    );
  }

  const payload = buildPixPayload({
    chavePix: pixConfig.chavePix,
    nomeBeneficiario: pixConfig.nomeBeneficiario || "Estudio",
    cidade: pixConfig.cidade || "SaoPaulo",
    valor,
    txid,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <Card className="border-emerald-200 bg-emerald-50/30 ">
      <CardContent className="flex flex-col items-center gap-3 p-4">
        <div className="flex items-center gap-2 text-emerald-700 ">
          <Smartphone className="h-4 w-4" />
          <span className="text-sm font-semibold">Pagamento via Pix</span>
        </div>

        {descricao && (
          <p className="text-xs text-muted-foreground text-center">{descricao}</p>
        )}

        {valor && valor > 0 && (
          <p className="text-lg font-bold text-emerald-700 ">
            R$ {valor.toFixed(2)}
          </p>
        )}

        <div className="bg-white p-3 rounded-lg shadow-sm">
          <QRCodeSVG value={payload} size={180} level="M" />
        </div>

        <div className="w-full space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground text-center uppercase tracking-wider">
            Pix Copia e Cola
          </p>
          <div className="relative">
            <div className="bg-background border border-border rounded-md p-2 text-[10px] font-mono break-all max-h-16 overflow-y-auto text-muted-foreground">
              {payload}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50  "
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado!" : "Copiar Código Pix"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
