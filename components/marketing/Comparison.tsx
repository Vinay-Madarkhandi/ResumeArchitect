import { Check, Minus } from "lucide-react";
import { Container, DisplayHeading, Lede } from "./Section";

const ROWS = [
  { name: "Redline of every change", detail: "Word-level, struck and underlined" },
  { name: "Written reason per change", detail: "Tied to a requirement in the post" },
  { name: "Per-change revert", detail: "Not all-or-nothing" },
  { name: "Explainable, deterministic score", detail: "Computed in code, same input gives the same score" },
  { name: "Flags unbacked claims", detail: "New numbers, names and skills marked Verify" },
  { name: "Bring your own key", detail: "No credits, no subscription" },
];

export function Comparison() {
  return (
    <section aria-labelledby="compare-title" className="py-24 lg:py-32">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div>
          <DisplayHeading id="compare-title">A different method, not a different prompt.</DisplayHeading>
          <Lede className="mt-5">
            The difference isn&rsquo;t the model. It&rsquo;s whether you get to see and decide on what the model did.
          </Lede>
        </div>

        <div className="relative min-w-0 overflow-x-auto rounded-lg border border-line">
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">How ResumeArchitect compares with a typical AI resume tool</caption>
            <thead>
              <tr className="border-b border-line bg-panel">
                <th scope="col" className="px-4 py-3.5 text-small font-medium text-ink-3 sm:px-5">
                  <span className="sr-only">Capability</span>
                </th>
                <th scope="col" className="w-[6.5rem] border-l border-line px-1.5 py-3.5 text-center text-label font-semibold sm:w-36 sm:px-4 sm:text-small text-ink">
                  ResumeArchitect
                </th>
                <th scope="col" className="w-[6.5rem] border-l border-line px-1.5 py-3.5 text-center text-label font-medium sm:w-36 sm:px-4 sm:text-small text-ink-3">
                  Typical AI resume tool
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROWS.map((r) => (
                <tr key={r.name}>
                  <th scope="row" className="px-4 py-4 font-normal sm:px-5">
                    <span className="block text-body font-medium text-ink">{r.name}</span>
                    <span className="mt-0.5 block text-label text-ink-3">{r.detail}</span>
                  </th>
                  <td className="border-l border-line bg-brass-soft/40 px-2 py-4 text-center sm:px-4">
                    <Check className="mx-auto size-[18px] text-add" aria-hidden />
                    <span className="sr-only">Yes</span>
                  </td>
                  <td className="border-l border-line px-2 py-4 text-center sm:px-4">
                    <Minus className="mx-auto size-[18px] text-ink-3" aria-hidden />
                    <span className="sr-only">Usually not</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}
