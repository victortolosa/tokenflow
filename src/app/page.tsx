'use client';

import { useState, useEffect } from 'react';
import { useTokenStore } from '@/store/useTokenStore';
import { TokenBridge } from '@/components/TokenBridge';
import { ImportModal } from '@/components/ImportModal';
import { TokenAccordion } from '@/components/TokenAccordion';
import { Upload } from 'lucide-react';

export default function Home() {
  const {
    resolvedTokens,
    rawTokens,
    initializeTokens,
    resetToDefaultTokens,
    isLoadingTokens,
    activeMode,
    availableModes,
    setActiveMode
  } = useTokenStore();
  const [importOpen, setImportOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [storybookStatus, setStorybookStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const storybookBaseUrl = process.env.NEXT_PUBLIC_STORYBOOK_URL ?? '/storybook';
  const storybookOpenUrl = process.env.NEXT_PUBLIC_STORYBOOK_URL ?? 'http://localhost:6006';
  const storybookStoryUrl = `${storybookBaseUrl}/iframe.html?id=components-button--default&viewMode=story&globals=mode:${activeMode}`;
  const storybookHealthUrl = `${storybookBaseUrl}/iframe.html`;

  useEffect(() => {
    void initializeTokens();
  }, [initializeTokens]);

  useEffect(() => {
    setIframeLoaded(false);
    setIframeError(false);
    setStorybookStatus('checking');
    checkStorybookHealth();
  }, [storybookStoryUrl, storybookHealthUrl]);

  const checkStorybookHealth = () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2000);

    fetch(storybookHealthUrl, { method: 'HEAD', signal: controller.signal })
      .then((response) => {
        setStorybookStatus(response.ok ? 'online' : 'offline');
      })
      .catch(() => {
        setStorybookStatus('offline');
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });
  };

  useEffect(() => {
    checkStorybookHealth();
  }, [storybookHealthUrl]);

  return (
    <div className="min-h-screen p-8 bg-gray-100 font-[family-name:var(--font-geist-sans)] text-black">
      <TokenBridge />
      <ImportModal open={importOpen} onOpenChange={setImportOpen} />

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-4rem)]">

        {/* Left Panel: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">TokenFlow</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void resetToDefaultTokens()}
                disabled={isLoadingTokens}
                className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Tokens
              </button>
            </div>
          </div>

          {/* Token Tuner Panel - Always visible */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                {availableModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => void setActiveMode(mode.id)}
                    disabled={isLoadingTokens}
                    className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded border transition-colors ${
                      activeMode === mode.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
                {isLoadingTokens && (
                  <span className="text-[10px] text-gray-400 font-mono">Loading...</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <TokenAccordion />
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
              src={storybookStoryUrl}
              className="w-full h-full absolute inset-0"
              title="Storybook Preview"
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeError(true)}
            />
            {(() => {
              const showLoading = storybookStatus === 'checking' || (!iframeLoaded && storybookStatus === 'online');
              const showError = storybookStatus === 'offline' || iframeError;

              if (!showLoading && !showError) return null;

              if (showLoading) {
                return (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <div className="max-w-md text-center px-6">
                      <p className="text-sm font-semibold text-gray-800">Loading Storybook preview…</p>
                      <p className="mt-2 text-xs text-gray-500">Switching modes and syncing tokens.</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                  <div className="max-w-md text-center px-6">
                    <p className="text-sm font-semibold text-gray-800">Storybook preview unavailable</p>
                    <p className="mt-2 text-xs text-gray-500">
                      Start Storybook (for example, <span className="font-mono">npm run storybook</span>)
                      and make sure it is reachable at <span className="font-mono">{storybookOpenUrl}</span>.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={checkStorybookHealth}
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Retry
                      </button>
                      <a
                        href={storybookOpenUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Open Storybook
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}
            
          </div>

          {/* Collapsible Debug View */}
          <details className="mt-auto">
            <summary className="cursor-pointer text-xs text-gray-500 font-mono mb-2 select-none">Debug State</summary>
            <div className="h-32 bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto font-mono text-xs">
              <pre>{JSON.stringify({ raw: rawTokens ? JSON.parse(rawTokens) : null, resolved: resolvedTokens }, null, 2)}</pre>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
