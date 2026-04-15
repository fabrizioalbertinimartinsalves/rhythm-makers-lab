import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const sql = `
-- Permitir que administradores do estúdio atualizem seus próprios dados
DROP POLICY IF EXISTS "Studio admins can update" ON public.studios;
CREATE POLICY "Studio admins can update" ON public.studios 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND studio_id = studios.id AND 'admin' = ANY(roles)
  ) OR public.is_superadmin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND studio_id = studios.id AND 'admin' = ANY(roles)
  ) OR public.is_superadmin()
);
`;

async function applyFix() {
  const { error } = await supabase.rpc('execute_sql', { sql_param: sql });
  if (error) {
    if (error.message.includes("function execute_sql(text) does not exist")) {
      console.log("No RPC execute_sql found. Please run this SQL in the Supabase Dashboard:");
      console.log(sql);
    } else {
      console.error("Error applying RLS fix:", error);
    }
  } else {
    console.log("RLS fix applied successfully!");
  }
}

applyFix();
