'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { importCatalog } from './actions';

export default function CatalogImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'replace' | 'upsert'>('replace');
  const [drag, setDrag] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function pick(f?: File | null) {
    setResult(null);
    if (!f) return setFile(null);
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') {
      setResult({ ok: false, msg: 'Wybierz plik .csv' }); return;
    }
    setFile(f);
  }

  function submit() {
    if (!file) return;
    setResult(null);
    start(async () => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', mode);
      const res = await importCatalog(fd);
      if (res.ok) {
        setResult({ ok: true, msg: `Zaimportowano ${res.inserted} wierszy.` });
        setFile(null);
        router.refresh();
      } else {
        setResult({ ok: false, msg: res.error });
      }
    });
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold">Import katalogu z pliku CSV</h3>
      <p className="text-xs text-text-muted mt-0.5 mb-4">
        Tutaj wgrasz plik <code className="text-accent">katalog.csv</code> z autami i parametrami tuningu.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className={[
          'cursor-pointer rounded-[10px] border-2 border-dashed transition-colors',
          'flex flex-col items-center justify-center text-center px-4 py-10',
          drag ? 'border-accent bg-accent/5' : 'border-border bg-bg-elev-2 hover:border-accent',
        ].join(' ')}
      >
        <div className="text-3xl mb-2">⤓</div>
        {file ? (
          <>
            <div className="font-medium">{file.name}</div>
            <div className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB · kliknij aby zmienić</div>
          </>
        ) : (
          <>
            <div className="font-medium">Przeciągnij plik CSV lub kliknij</div>
            <div className="text-xs text-text-muted">Akceptowany format: .csv (UTF-8)</div>
          </>
        )}
        <input
          ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>

      <fieldset className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className={['cursor-pointer rounded-[10px] border px-3 py-2.5 text-sm transition-colors',
          mode === 'replace' ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/60'].join(' ')}>
          <input type="radio" name="mode" className="hidden"
            checked={mode === 'replace'} onChange={() => setMode('replace')} />
          <div className="font-semibold">Zastąp całość</div>
          <div className="text-xs text-text-muted">Usuwa stare dane i wstawia nowe.</div>
        </label>
        <label className={['cursor-pointer rounded-[10px] border px-3 py-2.5 text-sm transition-colors',
          mode === 'upsert' ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/60'].join(' ')}>
          <input type="radio" name="mode" className="hidden"
            checked={mode === 'upsert'} onChange={() => setMode('upsert')} />
          <div className="font-semibold">Aktualizuj (upsert)</div>
          <div className="text-xs text-text-muted">Dodaje nowe i nadpisuje istniejące po slug.</div>
        </label>
      </fieldset>

      {result && (
        <div className={[
          'mt-4 text-sm rounded-md px-3 py-2 border',
          result.ok ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-danger/10 border-danger/30 text-danger',
        ].join(' ')}>
          {result.msg}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={submit} disabled={!file || pending} className="btn-primary">
          {pending ? 'Importowanie…' : 'Importuj CSV'}
        </button>
        {file && (
          <button type="button" onClick={() => pick(null)} className="btn-ghost">Wyczyść</button>
        )}
      </div>
    </div>
  );
}
