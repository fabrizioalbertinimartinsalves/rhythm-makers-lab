
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kfajalmdnycdxlhpoqvf.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwODEyNywiZXhwIjoyMDg5Nzg0MTI3fQ.YaWqz1NOhclo3URRtn2J-YeaO9RG9oeJDOqK-SyBORg"
);

const studioId = '82cfa09a-4acf-4783-99d3-5c6f8b884926'; // Ateliê do Corpo Dani Lage

async function debugData() {
  try {
    console.log(`Checking data for studio: ${studioId}`);

    // Query Students
    const { data: students, error: se } = await supabase.from('students').select('*').eq('studio_id', studioId);
    console.log('Students Query Result:', students?.length || 0, 'items');
    if (se) console.error('Students error:', se);

    // Query Memberships/Profiles (as done in Schedule.tsx)
    const { data: members, error: me } = await supabase
      .from('memberships')
      .select('user_id, profiles(id, nome)')
      .eq('studio_id', studioId);
    
    console.log('Memberships/Profiles Query Result:', members?.length || 0, 'items');
    if (me) console.error('Memberships error:', me);
    if (members) {
      members.forEach((m, i) => {
        console.log(`Member ${i}: user_id=${m.user_id}, profile_nome=${m.profiles?.nome}`);
      });
    }

  } catch (e) {
    console.error('Debug failed:', e);
  }
}

debugData();
