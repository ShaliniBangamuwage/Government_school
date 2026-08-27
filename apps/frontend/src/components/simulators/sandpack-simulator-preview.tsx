"use client";

import React, { useMemo, useState } from 'react';
import { SandpackProvider, SandpackLayout, SandpackCodeEditor, SandpackPreview, SandpackConsole } from '@codesandbox/sandpack-react';

type GeneratedSimulatorPreviewProps = {
  title?: string;
  description?: string;
  files?: Record<string, string>;
  dependencies?: Record<string, string>;
  error?: string | null;
  showCode?: boolean;
  onRegenerate?: () => void;
};

export function GeneratedSimulatorPreview({
  title,
  description,
  files,
  dependencies,
  error,
  showCode = false,
  onRegenerate,
}: GeneratedSimulatorPreviewProps) {
  const [showGeneratedCode, setShowGeneratedCode] = useState(showCode);

  const safeFiles = useMemo(() => {
    if (!files || !files['/App.tsx'] || !files['/styles.css']) {
      return null;
    }

    return {
      '/App.tsx': files['/App.tsx'],
      '/styles.css': files['/styles.css'],
      '/index.tsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './styles.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);`,
      '/index.html': `<div id="root"></div>`,
    };
  }, [files]);

  const safeDependencies = useMemo(
    () => ({
      react: 'latest',
      'react-dom': 'latest',
      'react-is': 'latest',
      recharts: 'latest',
      katex: 'latest',
      ...(dependencies ?? {}),
    }),
    [dependencies],
  );

  React.useEffect(() => {
    setShowGeneratedCode(showCode);
  }, [showCode]);

  if (error) {
    return (
      <div style={{ padding: 12, border: '1px solid #fca5a5', borderRadius: 10, background: '#fff1f2', color: '#7f1d1d' }}>
        <strong>Generated simulator validation failed.</strong>
        <div style={{ marginTop: 8 }}>{error}</div>
        {onRegenerate ? (
          <button type="button" onClick={onRegenerate} style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff' }}>
            Regenerate
          </button>
        ) : null}
      </div>
    );
  }

  if (!safeFiles) {
    return (
      <div style={{ padding: 12, border: '1px solid #fca5a5', borderRadius: 10, background: '#fff1f2', color: '#7f1d1d' }}>
        <strong>Generated simulator code is unavailable.</strong>
        <div style={{ marginTop: 8 }}>The AI did not return valid simulator files. Please regenerate or refine the prompt.</div>
        {onRegenerate ? (
          <button type="button" onClick={onRegenerate} style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff' }}>
            Regenerate
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #dfe7f1', borderRadius: 12, padding: 12, background: '#f9fbff', minHeight: 440, width: '100%', overflow: 'visible', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        <h3 style={{ margin: 0 }}>{title ?? 'AI-generated simulator'}</h3>
        <button type="button" onClick={() => setShowGeneratedCode((value) => !value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #94a3b8', background: '#fff', color: '#0f172a', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {showGeneratedCode ? 'Hide Generated Code' : 'View Generated Code'}
        </button>
      </div>

      <SandpackProvider
        template="react-ts"
        theme={{
          colors: {
            surface1: '#ffffff',
            surface2: '#f8fafc',
            surface3: '#eff6ff',
            accent: '#2563eb',
            base: '#0f172a',
          },
        }}
        files={safeFiles}
        customSetup={{
          dependencies: safeDependencies,
          entry: '/index.tsx',
        }}
      >
        <SandpackLayout style={{ width: '100%', minHeight: 520, overflow: 'visible' }}>
          {!showGeneratedCode ? (
            <SandpackPreview style={{ width: '100%', height: 'min(78vh, 900px)', minHeight: 520 }} />
          ) : (
            <SandpackCodeEditor showTabs showLineNumbers wrapContent />
          )}
          {showGeneratedCode ? (
            <SandpackPreview style={{ width: '100%', height: 'min(72vh, 800px)', minHeight: 520 }} />
          ) : null}
        </SandpackLayout>
        <SandpackConsole style={{ display: 'none' }} />
      </SandpackProvider>
    </div>
  );
}
