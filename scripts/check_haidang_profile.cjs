const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

(async () => {
  const email = 'haidangnakar11@gmail.com';
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('email', email)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error(`Profile not found for ${email}`);

  const { data: cp, error: cpError } = await supabase
    .from('candidate_profiles')
    .select('user_id,email,full_name,updated_at')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (cpError) throw cpError;

  console.log(JSON.stringify({
    ok: true,
    profile,
    candidateProfileExists: Boolean(cp),
    candidateProfile: cp || null
  }, null, 2));
})();
