require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing users:", error);
  } else {
    console.log("Total users:", users.length);
    users.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, LastSignIn: ${u.last_sign_in_at}`);
    });
  }
}

run();
