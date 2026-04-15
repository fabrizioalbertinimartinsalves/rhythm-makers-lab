import InstructorLayout from "@/components/layouts/InstructorLayout";
import PersonalPreferencesTab from "@/components/PersonalPreferencesTab";

export default function InstructorSettings() {
  return (
    <InstructorLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div>
          <h1 className="text-xl font-bold">Preferências</h1>
          <p className="text-sm text-muted-foreground">Configure seu tema, página inicial e notificações</p>
        </div>
        <PersonalPreferencesTab role="instructor" showDashboardSections={false} />
      </div>
    </InstructorLayout>
  );
}
