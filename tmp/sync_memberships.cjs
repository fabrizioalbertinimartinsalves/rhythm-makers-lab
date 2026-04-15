
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kfajalmdnycdxlhpoqvf.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwODEyNywiZXhwIjoyMDg5Nzg0MTI3fQ.YaWqz1NOhclo3URRtn2J-YeaO9RG9oeJDOqK-SyBORg"
);

async function syncMemberships() {
  try {
    const { data: studios } = await supabase.from('studios').select('id');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const fabrizio = users.find(u => u.email?.toLowerCase() === 'fabriziofarmaceutico@gmail.com');

    if (!fabrizio) return;

    console.log(`Granting Admin roles to Fabrizio (${fabrizio.id}) in all studios...`);
    for (const s of studios) {
      await supabase.from('memberships').upsert({
        user_id: fabrizio.id,
        studio_id: s.id,
        roles: ['admin', 'instructor', 'student'],
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,studio_id' });
      console.log(`Granted access to studio: ${s.id}`);
    }
    console.log('Membership sync complete!');
  } catch (e) {
    console.error('Error:', e);
  }
}

syncMemberships();
