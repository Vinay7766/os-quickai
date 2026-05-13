export default function AppMetadataSection() {
  const metadata = [
    { label: 'Product Name', value: 'Quickno' },
    { label: 'Identifier', value: 'com.quickno.app' },
    { label: 'Version', value: '1.0.2' },
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
