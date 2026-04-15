import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/utils/upload";
import { RegistrationData } from "@/pages/Registration";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step3Props = {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
};

export default function Step3_Documents({ data, updateData, onNext, onBack }: Step3Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<{ name: string; url: string }[]>(
    data.documentUrls.map(url => ({ 
      name: url.split('/').pop()?.split('?')[0] || "documento", 
      url 
    }))
  );

  const onDrop = async (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const droppedFiles = 'files' in e.target ? e.target.files : (e as React.DragEvent).dataTransfer?.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    setUploading(true);
    setProgress(10);

    try {
      const results = await Promise.all(
        Array.from(droppedFiles).map(async (file) => {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const filePath = `onboarding/${data.email || "temp"}/${fileName}`;

          const publicUrl = await uploadFile(file, filePath);

          return { name: file.name, url: publicUrl };
        })
      );

      setFiles(prev => [...prev, ...results]);
      setProgress(100);
      toast.success("Documentos enviados com sucesso!");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao enviar documentos: " + error.message);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    updateData({ documentUrls: files.map(f => f.url) });
    onNext();
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Documentação do Estúdio</h2>
        <p className="text-slate-500">Para sua segurança e conformidade, precisamos de alguns documentos básicos.</p>
      </div>

      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
          uploading ? "bg-slate-50 border-teal-200" : "bg-white border-slate-200 hover:border-teal-400 hover:bg-teal-50/20"
        }`}
      >
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
           {uploading ? <Loader2 className="h-8 w-8 text-teal-600 animate-spin" /> : <Upload className="h-8 w-8 text-teal-600" />}
        </div>
        <p className="font-bold text-slate-700 mb-1">Arraste seus arquivos aqui</p>
        <p className="text-xs text-slate-400 mb-6 text-center max-w-[280px]">Formatos aceitos: PDF, JPG ou PNG (Identidade, CNPJ ou Registro Profissional)</p>
        
        <label className="cursor-pointer">
            <input type="file" multiple className="hidden" onChange={onDrop} disabled={uploading} />
            <div className="bg-white border border-slate-200 px-6 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
                Selecionar arquivos
            </div>
        </label>
      </div>

      {uploading && (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Enviando arquivos...</span>
                <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-slate-100" />
        </div>
      )}

      <div className="space-y-3">
        {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <FileText className="h-5 w-5 text-teal-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                        <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-2 w-2" /> Upload concluído
                        </span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-900">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button 
            onClick={handleNext} 
            className="bg-teal-600 hover:bg-teal-700 h-11 px-10 font-bold"
            disabled={uploading}
        >
          Confirmar Documentos <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
