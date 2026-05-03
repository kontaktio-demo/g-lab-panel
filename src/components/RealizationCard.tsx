import Link from 'next/link';
import type { Realization } from '@/lib/types';
import { formatDatePL } from '@/lib/utils';

/**
 * Kafelek realizacji - 1:1 styl ze strony G-Lab (.realization-card),
 * z prawdziwym <img> jako okładką (zamiast background-image).
 */
export default function RealizationCard({ r }: { r: Realization }) {
  return (
    <Link
      href={`/realizacje/${r.id}/edit`}
      className="group block bg-bg-elev border border-border rounded-lg overflow-hidden
                 transition-all duration-300 hover:border-accent hover:-translate-y-0.5
                 hover:shadow-elev"
    >
      <div className="relative aspect-[16/10] bg-bg-elev-2 overflow-hidden">
        {r.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.cover_url}
            alt={r.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06] group-hover:brightness-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted/50 text-xs uppercase tracking-widest">
            brak okładki
          </div>
        )}
        {!r.published && (
          <span className="absolute top-2 left-2 badge-muted bg-bg/80 backdrop-blur-sm">
            Szkic
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="text-xs text-text-muted mb-2 truncate">
          {formatDatePL(r.data)}{r.samochod ? ` · ${r.samochod}` : ''}
        </div>
        <h3 className="text-lg font-bold mb-1.5 leading-snug line-clamp-2">{r.title}</h3>
        <p className="text-sm text-text-muted line-clamp-2">{r.krotki_opis}</p>
      </div>
    </Link>
  );
}
