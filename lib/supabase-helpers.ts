import { SupabaseClient } from '@supabase/supabase-js';

export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift() || '');
  return null;
};

export async function getCurrentUser(supabase: SupabaseClient) {
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem('forge_user');
      if (cached) {
        getCurrentUserBackground(supabase);
        return JSON.parse(cached);
      }
    } catch (e) {}
  }
  return getCurrentUserFetch(supabase);
}

async function getCurrentUserFetch(supabase: SupabaseClient) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('forge_user', JSON.stringify(user));
      } catch (e) {}
    }
    return user;
  } catch (err) {
    return null;
  }
}

async function getCurrentUserBackground(supabase: SupabaseClient) {
  try {
    const user = await getCurrentUserFetch(supabase);
    if (typeof window !== 'undefined' && user) {
      const currentCached = sessionStorage.getItem('forge_user');
      if (currentCached !== JSON.stringify(user)) {
        sessionStorage.setItem('forge_user', JSON.stringify(user));
      }
    }
  } catch {}
}

export async function getAllOrgs(supabase: SupabaseClient) {
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem('forge_all_orgs');
      if (cached) {
        getAllOrgsBackground(supabase);
        return JSON.parse(cached);
      }
    } catch (e) {}
  }
  return getAllOrgsFetch(supabase);
}

async function getAllOrgsFetch(supabase: SupabaseClient) {
  try {
    const user = await getCurrentUser(supabase);
    if (!user) return [];

    const { data, error } = await supabase.from('orgs').select('*').eq('user_id', user.id);
    if (error) {
      console.error('[Supabase Helpers] Error fetching all orgs:', error);
      return [];
    }

    const orgs = data || [];
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('forge_all_orgs', JSON.stringify(orgs));
      } catch (e) {}
    }
    return orgs;
  } catch (err) {
    console.error('[Supabase Helpers] Exception in getAllOrgs:', err);
    return [];
  }
}

async function getAllOrgsBackground(supabase: SupabaseClient) {
  try {
    const orgs = await getAllOrgsFetch(supabase);
    if (typeof window !== 'undefined' && orgs) {
      const currentCached = sessionStorage.getItem('forge_all_orgs');
      if (currentCached !== JSON.stringify(orgs)) {
        sessionStorage.setItem('forge_all_orgs', JSON.stringify(orgs));
        window.dispatchEvent(new CustomEvent('forge_all_orgs_changed', { detail: orgs }));
      }
    }
  } catch {}
}

export async function getActiveOrg(supabase: SupabaseClient) {
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem('forge_active_org');
      if (cached) {
        getActiveOrgBackground(supabase);
        return JSON.parse(cached);
      }
    } catch (e) {}
  }
  return getActiveOrgFetch(supabase);
}

async function getActiveOrgFetch(supabase: SupabaseClient) {
  try {
    const user = await getCurrentUser(supabase);
    if (!user) return null;

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

    const activeOrg = orgs && orgs.length > 0 ? orgs[0] : null;
    if (activeOrg && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('forge_active_org', JSON.stringify(activeOrg));
      } catch (e) {}
    }
    return activeOrg;
  } catch (err) {
    console.error('[Supabase Helpers] Exception in getActiveOrg:', err);
    return null;
  }
}

async function getActiveOrgBackground(supabase: SupabaseClient) {
  try {
    const activeOrg = await getActiveOrgFetch(supabase);
    if (typeof window !== 'undefined' && activeOrg) {
      const currentCached = sessionStorage.getItem('forge_active_org');
      if (currentCached !== JSON.stringify(activeOrg)) {
        sessionStorage.setItem('forge_active_org', JSON.stringify(activeOrg));
        window.dispatchEvent(new CustomEvent('forge_active_org_changed', { detail: activeOrg }));
      }
    }
  } catch {}
}
