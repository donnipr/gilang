require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  try {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) {
      console.error('Supabase query error:', error);
      process.exit(1);
    }
    console.log('Supabase connection successful, sample data:', data);
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
