'use client';

import { useEffect } from 'react';

export function ActiveOrgSync({ instanceUrl }: { instanceUrl?: string }) {
  useEffect(() => {
    if (instanceUrl) {
      document.cookie = `sf_active_instance_url=${encodeURIComponent(instanceUrl)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
  }, [instanceUrl]);

  return null;
}
