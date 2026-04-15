
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kfajalmdnycdxlhpoqvf.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwODEyNywiZXhwIjoyMDg5Nzg0MTI3fQ.YaWqz1NOhclo3URRtn2J-YeaO9RG9oeJDOqK-SyBORg"
);

async function check() {
  try {
    const { count: pc } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: mc } = await supabase.from('memberships').select('*', { count: 'exact', head: true });
    const { count: sc } = await supabase.from('students').select('*', { count: 'exact', head: true });
    const { data: users, error: ue } = await supabase.auth.admin.listUsers();

    console.log('Profiles Count:', pc);
    console.log('Memberships Count:', mc);
    console.log('Students Count:', sc);
    if (ue) console.error('Auth Users Error:', ue);
    else console.log('Auth Users Count:', users.users.length);
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
