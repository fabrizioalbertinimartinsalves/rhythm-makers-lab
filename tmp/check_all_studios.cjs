
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kfajalmdnycdxlhpoqvf.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwODEyNywiZXhwIjoyMDg5Nzg0MTI3fQ.YaWqz1NOhclo3URRtn2J-YeaO9RG9oeJDOqK-SyBORg"
);

async function checkAll() {
  const { data: studios } = await supabase.from('studios').select('id, nome');
  for (const s of studios) {
    const { count: sc } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('studio_id', s.id);
    const { count: mc } = await supabase.from('memberships').select('*', { count: 'exact', head: true }).eq('studio_id', s.id);
    console.log(`Studio: ${s.nome} (${s.id}) -> Students: ${sc}, Members: ${mc}`);
  }
}

checkAll();
