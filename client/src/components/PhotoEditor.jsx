import { useCallback, useEffect, useMemo, useState } from 'react';
import CreativeEditor from '@cesdk/cesdk-js/react';
import { AlertTriangle, Check, ImagePlus, Loader } from 'lucide-react';
import { initAdvancedEditor } from '../imgly';

const LOAD_TIMEOUT_MS = 45_000;

export default function PhotoEditor() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const license = import.meta.env.VITE_CESDK_LICENSE;
  const configuredAssetBase = import.meta.env.VITE_CESDK_ASSET_BASE_URL;

  // Keep the configuration identity stable. The CE.SDK React wrapper uses the
  // config identity as an initialization dependency; recreating it on every
  // state update can repeatedly tear down and restart the editor.
  const config = useMemo(() => {
    const nextConfig = {
      userId: 'otr-gebeya-advanced-editor',
      devMode: true,
      logger: (message, level) => {
        if (level === 'Error' || level === 'Warning') {
          console.warn(`[CE.SDK ${level}] ${message}`);
        }
      }
    };

    if (license) {
      nextConfig.license = license;
    }

    // When this variable is unset, CE.SDK uses IMG.LY's official versioned
    // CDN configuration. Do not point it at /assets: that directory URL is
    // not a valid CDN root and causes the engine to wait for missing files.
    if (configuredAssetBase) {
      nextConfig.baseURL = configuredAssetBase;
    }

    return nextConfig;
  }, [configuredAssetBase, license]);

  const handleLoadingStateChange = useCallback((state) => {
    setLoading(state !== 'loaded' && state !== 'error');
    if (state === 'loaded') {
      setError('');
    }
  }, []);

  const handleError = useCallback((editorError) => {
    setLoading(false);
    setError(
      editorError?.message ||
        'Advanced CE.SDK could not initialize. Check the browser console for the failed asset request.'
    );
  }, []);

  useEffect(() => {
    if (!loading) return undefined;

    const timeout = window.setTimeout(() => {
      setLoading(false);
      setError(
        'CE.SDK took too long to initialize. Reload the page and check that no VITE_CESDK_ASSET_BASE_URL value is pointing to a 404 path.'
      );
    }, LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [loading]);

  return (
    <div
      className="relative min-h-[720px] overflow-hidden rounded-3xl border bg-[#18221f]"
      style={{ borderColor: '#ebe9e3' }}
    >
      <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between rounded-2xl border border-white/10 bg-[#18221f]/85 px-4 py-3 text-white backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f5ee] text-[#1f6f5c]">
            <ImagePlus size={17} />
          </div>
          <div>
            <p className="text-xs font-bold">Advanced Photo Editor</p>
            <p className="text-[10px] text-white/55">
              Layers · typography · image editing · pages · export
            </p>
          </div>
        </div>
        {loading ? (
          <span className="flex items-center gap-2 text-[10px] text-white/65">
            <Loader size={13} className="animate-spin" /> Loading CE.SDK
          </span>
        ) : error ? null : (
          <span className="flex items-center gap-2 text-[10px] text-[#bfe8cf]">
            <Check size={13} /> Editor ready
          </span>
        )}
      </div>

      {error && (
        <div className="absolute left-4 right-4 top-20 z-10 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <CreativeEditor
        config={config}
        init={initAdvancedEditor}
        width="100%"
        height="720px"
        className="h-[720px] w-full"
        onLoadingStateChange={handleLoadingStateChange}
        onError={handleError}
      />
    </div>
  );
}
