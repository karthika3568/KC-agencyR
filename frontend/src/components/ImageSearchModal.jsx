import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Upload, Camera, ImageOff } from 'lucide-react';
import { itemsApi } from '../api/catalog';
import { resolveImageUrl } from '../utils/media';
import { Button } from './Button.jsx';

/**
 * "Find this item from a photo." Runs server-side OCR (if the server has an
 * OCR engine installed) and text-matches the result against the catalog —
 * this reads printed text on a label, it is not visual object recognition.
 * When no OCR engine is installed, the backend says so plainly and this
 * modal surfaces that instead of pretending a match was attempted.
 */
export function ImageSearchModal({ onClose, onAdd }) {
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const searchMutation = useMutation({ mutationFn: itemsApi.imageSearch });

  const handlePick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    searchMutation.mutate(f);
  };

  const result = searchMutation.data;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-ink">Find Item From Photo</div>
          <button onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-page"><X size={18} /></button>
        </div>

        {!preview ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border-soft py-10">
            <Camera size={32} className="text-ink-muted/50" />
            <p className="px-6 text-center text-sm text-ink-muted">Upload or capture a photo of the product's label or pack.</p>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePick} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePick} className="hidden" />
              <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()}>Upload</Button>
              <Button variant="secondary" size="sm" icon={<Camera size={14} />} onClick={() => cameraInputRef.current?.click()}>Camera</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex h-40 items-center justify-center overflow-hidden rounded-lg bg-page">
              <img src={preview} alt="" className="h-full w-full object-contain" />
            </div>

            {searchMutation.isPending && <p className="text-sm text-ink-muted">Scanning image…</p>}

            {searchMutation.isError && (
              <p className="text-sm text-danger">Could not process this image. Please try again or search manually.</p>
            )}

            {result && result.engine_available === false && (
              <div className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
                <ImageOff size={16} className="mt-0.5 shrink-0" />
                <span>{result.message}</span>
              </div>
            )}

            {result && result.engine_available && result.matches.length === 0 && (
              <p className="text-sm text-ink-muted">No catalog items matched the text found in this image. Try a clearer photo of the label, or search manually.</p>
            )}

            {result && result.engine_available && result.matches.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium text-ink-muted">Matching products</div>
                {result.matches.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onAdd(item)}
                    className="flex items-center gap-3 rounded-lg border border-border-soft p-2 text-left hover:bg-page"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-page">
                      {item.image ? <img src={resolveImageUrl(item.image)} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{item.item_name}</div>
                      <div className="text-xs text-ink-muted">{item.item_code} · Rs. {item.retail_price}</div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-gold">Add</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => { setPreview(null); searchMutation.reset(); }}
              className="mt-3 text-xs font-medium text-gold hover:underline"
            >
              Try another photo
            </button>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
