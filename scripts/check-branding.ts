
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kfajalmdnycdxlhpoqvf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDgxMjcsImV4cCI6MjA4OTc4NDEyN30.2Jj3mQaX6H9N6pmjmApX3dPouBQoY6SFCX-c3KFD-5I";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllLabels() {
  const { data, error } = await supabase
    .from('system_labels')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample Labels:');
  data.forEach(row => {
    console.log(`${row.category} | ${row.key}: ${row.value}`);
  });
}

checkAllLabels();
