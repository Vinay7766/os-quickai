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

export default function UIColorSection() {
  const colors = [
    { name: 'Accent', var: 'var(--clr-accent)' },
    { name: 'Surface', var: 'var(--clr-surface)' },
    { name: 'Success', var: 'var(--clr-success)' },
    { name: 'Danger', var: 'var(--clr-danger)' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold mb-1">UI Colors & Branding</h2>
        <p className="text-sm" style={{ color: 'var(--clr-text-secondary)' }}>View and manage the application color palette.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {colors.map(c => (
          <div key={c.name} className="p-4 rounded-xl border flex items-center gap-4" style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}>
            <div className="w-10 h-10 rounded-lg shadow-inner" style={{ background: c.var }} />
            <div>
              <div className="text-sm font-bold">{c.name}</div>
              <div className="text-[10px] opacity-40 font-mono">{c.var}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
