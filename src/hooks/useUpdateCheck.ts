import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

const GITHUB_REPO = 'kalan/os-quickai';

export function useUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);

  useEffect(() => {
    // Only check once per session
    async function check() {
      try {
        const currentVersion = await getVersion();
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
        
        if (!response.ok) return;
        
        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');

        // Simple semver check (works for major.minor.patch)
        if (latestVersion !== currentVersion) {
            setUpdateAvailable(latestVersion);
        }
      } catch (err) {
        console.error('Update check failed:', err);
      }
    }

    check();
  }, []);

  return updateAvailable;
}
