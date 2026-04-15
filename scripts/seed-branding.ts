
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kfajalmdnycdxlhpoqvf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDgxMjcsImV4cCI6MjA4OTc4NDEyN30.2Jj3mQaX6H9N6pmjmApX3dPouBQoY6SFCX-c3KFD-5I";
const supabase = createClient(supabaseUrl, supabaseKey);

const defaultBranding = [
  { key: 'platform_login_layout_type', value: 'split', category: 'login_branding' },
  { key: 'platform_login_nome', value: 'Kineos', category: 'login_branding' },
  { key: 'platform_login_marketing_title', value: 'Domine a gestão do seu estúdio', category: 'login_branding' },
  { key: 'platform_login_marketing_subtitle', value: 'A solução definitiva para Pilates, Dança e Fitness.', category: 'login_branding' },
  { key: 'platform_login_marketing_features', value: 'Gestão Financeira, Controle de Presença, CRM de Alunos, Pagamentos Online', category: 'login_branding' },
  { key: 'platform_login_bg_color', value: '#0f172a', category: 'login_branding' },
  { key: 'platform_login_primary_color', value: '#6B9B7A', category: 'login_branding' },
  { key: 'platform_login_text_color', value: '#f8fafc', category: 'login_branding' },
  { key: 'platform_login_cta_texto', value: 'Quer usar o Kineos no seu estúdio?', category: 'login_branding' },
  { key: 'platform_login_cta_link_texto', value: 'Falar com um consultor', category: 'login_branding' }
];

async function seedBranding() {
  console.log('Seeding login branding...');
  const { error } = await supabase
    .from('system_labels')
    .upsert(defaultBranding, { onConflict: 'studio_id,key' });

  if (error) {
    console.error('Error seeding:', error);
  } else {
    console.log('Branding seeded successfully!');
  }
}

seedBranding();
