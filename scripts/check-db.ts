
import { createClient } from '@supabase/supabase-js';

const URL = "https://kfajalmdnycdxlhpoqvf.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYWphbG1kbnljZHhsaHBvcXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDgxMjcsImV4cCI6MjA4OTc4NDEyN30.2Jj3mQaX6H9N6pmjmApX3dPouBQoY6SFCX-c3KFD-5I";

const supabase = createClient(URL, KEY);

async function checkData() {
  const { data: studios, error: sErr } = await supabase.from('studios').select('id, nome, slug, ativa');
  console.log('Studios:', JSON.stringify(studios, null, 2));
  if (sErr) console.error('Studio Error:', sErr);
  
  if (studios && studios.length > 0) {
    const id = studios[0].id;
    const { data: mods, error: mErr } = await supabase.from('modalities').select('id, nome, ativa').eq('studio_id', id);
    console.log(`Modalities for ${studios[0].nome}:`, JSON.stringify(mods, null, 2));
    if (mErr) console.error('Mod Error:', mErr);

    const { data: classes, error: cErr } = await supabase.from('classes').select('id, nome, ativa').eq('studio_id', id);
    console.log(`Classes for ${studios[0].nome}:`, JSON.stringify(classes, null, 2));
    if (cErr) console.error('Class Error:', cErr);
  }
}

checkData();
