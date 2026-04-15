import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fetchPlans() {
  const { data, error } = await supabase
    .from('saas_plans')
    .select('*')
    .order('valor_mensal', { ascending: true });

  if (error) {
    console.error('Error fetching plans:', error);
    return;
  }

  console.log('--- SAAS PLANS ---');
  console.log(JSON.stringify(data, null, 2));
}

fetchPlans();
