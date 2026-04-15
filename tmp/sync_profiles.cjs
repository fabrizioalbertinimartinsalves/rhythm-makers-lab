
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kfajalmdnycdxlhpoqvf.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwODEyNywiZXhwIjoyMDg5Nzg0MTI3fQ.YaWqz1NOhclo3URRtn2J-YeaO9RG9oeJDOqK-SyBORg"
);

async function sync() {
  try {
    console.log('Fetching users from auth...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    console.log(`Found ${users.length} users. Syncing to public.profiles...`);
    
    for (const user of users) {
      const isFabrizio = user.email?.toLowerCase() === 'fabriziofarmaceutico@gmail.com';
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        nome: user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário',
        is_global_superadmin: isFabrizio,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (upsertError) console.error(`Error syncing user ${user.email}:`, upsertError);
      else console.log(`Synced: ${user.email}`);
    }

    console.log('Sync complete!');
  } catch (e) {
    console.error('Sync failed:', e);
  }
}

sync();
