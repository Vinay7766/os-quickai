/*
 * Copyright 2026 Vinay7766
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

export default function AppMetadataSection() {
  const [appVersion, setAppVersion] = useState('1.0.2');

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);
  }, []);

  const metadata = [
    { label: 'Product Name', value: 'Quickno' },
    { label: 'Identifier', value: 'com.quickno.app' },
    { label: 'Version', value: appVersion },
    { label: 'Website', value: 'www.quickno.in' },
    { label: 'Environment', value: 'Production' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold mb-1">Application Metadata</h2>
        <p className="text-sm" style={{ color: 'var(--clr-text-secondary)' }}>System information and application identity.</p>
      </div>
      <div className="space-y-2">
        {metadata.map(m => (
          <div key={m.label} className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider opacity-40">{m.label}</span>
            <span className="text-sm font-semibold">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
