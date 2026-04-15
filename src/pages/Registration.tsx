import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Step1_Account from "@/components/registration/Step1_Account";
import Step2_Plans from "@/components/registration/Step2_Plans";
import Step3_Documents from "@/components/registration/Step3_Documents";
import Step4_Payment from "@/components/registration/Step4_Payment";
import Step5_Success from "@/components/registration/Step5_Success";
import { Card } from "@/components/ui/card";
import { ChevronRight, Check } from "lucide-react";

export type RegistrationData = {
  // Step 1
  studioName: string;
  cnpjCpf: string;
  managerName: string;
  email: string;
  whatsapp: string;
  password?: string;
  // Step 2
  planId: string;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  // Step 3
  documentUrls: string[];
  // Step 4
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  agreedToTerms: boolean;
};

const STEPS = [
  "Dados do Estúdio",
  "Escolha do Plano",
  "Documentação",
  "Pagamento",
  "Confirmação"
];

export default function Registration() {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<Partial<RegistrationData>>({
    planId: searchParams.get("plan") || "",
    billingCycle: 'monthly',
    documentUrls: [],
    paymentMethod: 'credit_card',
    agreedToTerms: false
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const updateData = (newData: Partial<RegistrationData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xl">K</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kineos</h1>
      </div>

      <div className="w-full max-w-3xl space-y-8">
        <div className="flex justify-between items-center px-4 md:px-12 relative">
           <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
           {STEPS.map((step, idx) => {
             const stepNum = idx + 1;
             const isActive = stepNum === currentStep;
             const isComplete = stepNum < currentStep;

             return (
                <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isComplete ? "bg-teal-600 border-teal-600 text-white" : 
                        isActive ? "bg-white border-teal-600 text-teal-600 font-bold scale-110 shadow-lg" : 
                        "bg-white border-slate-200 text-slate-400 font-medium"
                    }`}>
                        {isComplete ? <Check className="h-5 w-5" strokeWidth={3} /> : stepNum}
                    </div>
                    <span className={`hidden md:block text-[10px] uppercase font-bold tracking-wider ${
                        isActive ? "text-teal-700" : "text-slate-400"
                    }`}>
                        {step}
                    </span>
                </div>
             );
           })}
        </div>

        <Card className="p-8 shadow-xl border-slate-200/60 transition-all">
          {currentStep === 1 && <Step1_Account data={data as RegistrationData} updateData={updateData} onNext={nextStep} />}
          {currentStep === 2 && <Step2_Plans data={data as RegistrationData} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
          {currentStep === 3 && <Step3_Documents data={data as RegistrationData} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
          {currentStep === 4 && <Step4_Payment data={data as RegistrationData} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
          {currentStep === 5 && <Step5_Success data={data as RegistrationData} />}
        </Card>

        <div className="text-center text-slate-400 text-xs mt-8">
          © 2025 Kineos · Gestão Inteligente para Estúdios de Pilates
        </div>
      </div>
    </div>
  );
}
