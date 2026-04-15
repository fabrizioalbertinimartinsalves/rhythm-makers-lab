import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carrega variáveis do arquivo .env local
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.log('\n❌ [SUPABASE_SERVICE_ROLE_KEY] ou [VITE_SUPABASE_URL] faltando.');
  console.log('DICA: Adicione SUPABASE_SERVICE_ROLE_KEY=sua_chave no seu arquivo .env\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];
  const nome = args[2];
  const studioId = args[3];
  const roles = args[4] ? args[4].split(',') : ['student'];

  if (!email || !password || !nome) {
    console.log('\nUso: npx ts-node scripts/provision-supabase-user.ts <email> <password> <nome> [studioId] [roles]');
    console.log('Exemplo: npx ts-node scripts/provision-supabase-user.ts joao@email.com 123456 "Joao Silva" studio-uuid admin\n');
    process.exit(1);
  }

  try {
    console.log(`\n➡ Iniciando provisionamento para: ${email}...`);

    let targetUserId: string | undefined;

    // 1. Criar usuário no Auth
    const { data: inviteData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('ℹ O usuário já existe no Auth. Buscando ID...');
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === email);
        if (!existingUser) throw new Error('Não foi possível encontrar o usuário existente.');
        targetUserId = existingUser.id;
      } else {
        throw authError;
      }
    } else if (inviteData.user) {
      console.log(`✅ Usuário criado no Auth: ${inviteData.user.id}`);
      targetUserId = inviteData.user.id;
    }

    if (!targetUserId) throw new Error('Falha ao determinar o ID do usuário.');

    // 2. Garantir Perfil no Banco (Upsert)
    console.log('➡ Sincronizando perfil...');
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: targetUserId,
      nome,
      email,
      provisional: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });

    if (profileError) throw profileError;
    console.log('✅ Perfil sincronizado.');

    // 3. Garantir Vínculo com o Estúdio (Upsert)
    if (studioId) {
      console.log(`➡ Vinculando ao estúdio ${studioId}...`);
      const { error: memberError } = await supabase.from('memberships').upsert({
        user_id: targetUserId,
        studio_id: studioId,
        roles: roles
      }, { onConflict: 'user_id, studio_id' });

      if (memberError) throw memberError;
      console.log('✅ Vínculo com estúdio criado.');
    }

    console.log('\n✨ Provisionamento pronto! Peça ao usuário para fazer login com a senha definida.\n');

  } catch (error: any) {
    console.error('\n❌ Erro durante o provisionamento:', error.message);
    process.exit(1);
  }
}

main();
