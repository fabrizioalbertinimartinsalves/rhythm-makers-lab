import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name_param: 'studios' });
  // If rpc doesn't exist, we can try a simple select and check keys
  const { data: sample } = await supabase.from('studios').select('*').limit(1);
  if (sample && sample.length > 0) {
    console.log("Columns found:", Object.keys(sample[0]));
  } else {
    console.log("No data in studios table to check columns.");
  }
}

checkColumns();
