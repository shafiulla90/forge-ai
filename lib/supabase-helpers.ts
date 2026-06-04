import { SupabaseClient } from '@supabase/supabase-js';

export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift() || '');
  return null;
};

export async function getActiveOrg(supabase: SupabaseClient) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const activeUrl = getCookie('sf_active_instance_url');
    let query = supabase.from('orgs').select('*').eq('user_id', user.id);
    if (activeUrl) {
      query = query.eq('instance_url', activeUrl);
    } else {
      query = query.order('updated_at', { ascending: false }).limit(1);
    }

    const { data: orgs, error } = await query;
    if (error) {
      console.error('[Supabase Helpers] Error fetching active org:', error);
      return null;
    }

    return orgs && orgs.length > 0 ? orgs[0] : null;
  } catch (err) {
    console.error('[Supabase Helpers] Exception in getActiveOrg:', err);
    return null;
  }
}
