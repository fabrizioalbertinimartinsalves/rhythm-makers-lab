const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://kfajalmdnycdxlhpoqvf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDgxMjcsImV4cCI6MjA4OTc4NDEyN30.2Jj3mQaX6H9N6pmjmApX3dPouBQoY6SFCX-c3KFD-5I";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fetchConfig() {
  const { data, error } = await supabase
    .from('system_labels')
    .select('key, value')
    .eq('category', 'landing_content')
    .is('studio_id', null);

  if (error) {
    console.error('Error fetching config:', error);
    return;
  }

  console.log('--- LANDING CONFIG ---');
  console.log(JSON.stringify(data, null, 2));
}

fetchConfig();
