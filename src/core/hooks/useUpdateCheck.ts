import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

const GITHUB_REPO = 'Vinay7766/quickno';

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
        const latestVersion = data.tag_name.replace('v', '').trim();

        // Strict SemVer check: only trigger update if latest version is strictly greater
        const latestParts = latestVersion.split('.').map(Number);
        const currentParts = currentVersion.split('.').map(Number);
        let isNewer = false;
        
        for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
          const l = latestParts[i] || 0;
          const c = currentParts[i] || 0;
          if (l > c) {
            isNewer = true;
            break;
          }
          if (l < c) {
            break;
          }
        }

        if (isNewer) {
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
