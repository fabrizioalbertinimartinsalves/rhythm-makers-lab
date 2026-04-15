const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

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
