'use client';

import { useState, useEffect } from 'react';
import { useTokenStore } from '@/store/useTokenStore';
import { TokenBridge } from '@/components/TokenBridge';
import { ImportModal } from '@/components/ImportModal';
import { BorderRadiusControl } from '@/components/controls/BorderRadiusControl';
import { Upload } from 'lucide-react';

export default function Home() {
  const { resolvedTokens, rawTokens, buttonBorderRadius, setButtonBorderRadius } = useTokenStore();
  const [importOpen, setImportOpen] = useState(false);

  // Broadcast border-radius changes to Storybook iframe
  useEffect(() => {
    const iframe = document.getElementById('storybook-preview') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'UPDATE_TOKEN',
        payload: { name: 'button-border-radius', value: `${buttonBorderRadius}px` }
      }, '*');
    }
  }, [buttonBorderRadius]);

  return (
    <div className="min-h-screen p-8 bg-gray-100 font-[family-name:var(--font-geist-sans)] text-black">
      <TokenBridge />
      <ImportModal open={importOpen} onOpenChange={setImportOpen} />

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-4rem)]">

        {/* Left Panel: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">TokenFlow</h1>
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Tokens
            </button>
          </div>

          {/* Token Tuner Panel - Always visible */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">Token Tuner</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Button Section */}
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Button</h3>
                <BorderRadiusControl
                  value={buttonBorderRadius}
                  onChange={setButtonBorderRadius}
                />
              </section>

              {/* Placeholder for more controls */}
              <section className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                More controls coming soon...
              </section>
            </div>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full overflow-hidden">
          <div className="bg-white rounded-t-xl border-b border-gray-200 p-2 flex items-center gap-2">
            <div className="flex gap-1.5 ml-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="mx-auto bg-gray-100 px-3 py-1 rounded-md text-xs text-gray-500 font-mono w-1/2 text-center">
              Storybook Preview
            </div>
          </div>
          <div className="flex-1 bg-white border-l border-r border-b border-gray-200 rounded-b-xl overflow-hidden shadow-sm relative">
            <iframe
              id="storybook-preview"
              src="http://localhost:6006/iframe.html?id=example-button--primary&viewMode=story"
              className="w-full h-full absolute inset-0"
              title="Storybook Preview"
            />
          </div>

          {/* Collapsible Debug View */}
          <details className="mt-auto">
            <summary className="cursor-pointer text-xs text-gray-500 font-mono mb-2 select-none">Debug State</summary>
            <div className="h-32 bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto font-mono text-xs">
              <pre>{JSON.stringify({ buttonBorderRadius, raw: rawTokens ? JSON.parse(rawTokens) : null, resolved: resolvedTokens }, null, 2)}</pre>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
