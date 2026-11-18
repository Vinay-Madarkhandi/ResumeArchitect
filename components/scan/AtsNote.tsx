import type { DetectedAts } from "@/lib/ats";

/** Which applicant tracking system a posting runs on, and what its own documentation says to check. */
export function AtsNote({ ats }: { ats: DetectedAts }) {
  return (
    <div className="rounded-md border border-line bg-sunken px-3.5 py-3">
      <p className="text-small text-ink">
        Applications go through <span className="font-semibold">{ats.name}</span>.
      </p>
      <p className="mt-1 text-small text-ink-2">{ats.parsingNotes}</p>
      {ats.guidance.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-2 border-t border-line pt-2.5">
          {ats.guidance.map((g) => (
            <li key={g.text} className="text-small text-ink-2">
              {g.text}
              {g.sources.length > 0 && (
                <span className="ml-1.5 inline-flex gap-1.5 text-label">
                  {g.sources.map((url, i) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="text-brass hover:underline">
                      Source{g.sources.length > 1 ? ` ${i + 1}` : ""}
                    </a>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
