require('dotenv').config({path:'.env.local'});
const {createClient}=require('@supabase/supabase-js');
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
 const {data, error}=await supabase.from('deployments').select('id,plan,rollback_metadata,org_id,status,created_at').order('created_at', {ascending:false}).limit(5);
 if(error){console.error('Error:',error); return;}
 console.log('Latest deployments:');
 data.forEach(d=>{
   console.log('ID', d.id, 'status', d.status, 'created', d.created_at);
   const planObj = d.rollback_metadata?JSON.parse(d.rollback_metadata):null;
   if(planObj){
     const items = (planObj.plan||planObj).steps|| (planObj.plan||planObj).items || [];
     console.log('  Plan items count', items.length);
   } else {
     console.log('  No plan metadata');
   }
 });
})();
