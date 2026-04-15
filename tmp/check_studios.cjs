
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kfajalmdnycdxlhpoqvf.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwODEyNywiZXhwIjoyMDg5Nzg0MTI3fQ.YaWqz1NOhclo3URRtn2J-YeaO9RG9oeJDOqK-SyBORg"
);

async function check() {
  try {
    const { data: studios } = await supabase.from('studios').select('id, nome');
    console.log('Studios:', studios);

    const { data: memberships } = await supabase.from('memberships').select('studio_id, user_id, roles');
    console.log('Memberships Studio IDs:', memberships.map(m => m.studio_id));

    const { data: students } = await supabase.from('students').select('studio_id, nome');
    console.log('Students Studio IDs:', students.map(s => s.studio_id));
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
