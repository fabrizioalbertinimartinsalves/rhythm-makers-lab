import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kfajalmdnycdxlhpoqvf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDgxMjcsImV4cCI6MjA4OTc4NDEyN30.2Jj3mQaX6H9N6pmjmApX3dPouBQoY6SFCX-c3KFD-5I";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateConfig() {
  console.log('Inserting new login configuration keys...');
  
  const { data, error } = await supabase
    .from('login_page_config')
    .upsert([
      { 
        config_key: 'login_right_logo_1', 
        config_value: '', 
        config_type: 'image_url', 
        config_group: 'Imagens e Identidade', 
        description: 'Logo Direita 1 (Superior Esquerda)' 
      },
      { 
        config_key: 'login_right_logo_2', 
        config_value: '', 
        config_type: 'image_url', 
        config_group: 'Imagens e Identidade', 
        description: 'Logo Direita 2 (Superior Direita)' 
      }
    ], { onConflict: 'config_key' });

  if (error) {
    console.error('Error updating config:', error.message);
    process.exit(1);
  }

  console.log('Successfully updated login configuration keys.');
}

updateConfig();
