import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-[40%] shrink-0 flex-col justify-between overflow-hidden bg-primary p-xl lg:flex">
        <Link href="/" className="font-display text-2xl italic text-on-primary">
          ResumeArchitect
        </Link>
        <div>
          <p className="font-display text-3xl italic leading-tight text-on-primary">
            &ldquo;It finally feels like I&rsquo;m editing my resume &mdash; not fighting a form.&rdquo;
          </p>
          <p className="mt-md font-mono text-label-sm uppercase tracking-widest text-on-primary/60">
            A ResumeArchitect user
          </p>
        </div>
        <p className="font-mono text-label-sm text-on-primary/50">&copy; {new Date().getFullYear()} ResumeArchitect</p>
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full border border-secondary/30"
          aria-hidden
        />
        <div
          className="absolute -bottom-56 -right-16 h-96 w-96 rounded-full border border-secondary/20"
          aria-hidden
        />
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-margin-mobile py-xxl">
        <div className="bg-dot-grid -z-10" aria-hidden />
        <div className="w-full max-w-[26rem]">
          <Link href="/" className="mb-xl block font-display text-2xl italic text-primary lg:hidden">
            ResumeArchitect
          </Link>
          <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-xl shadow-[var(--shadow-lifted)]">
            <div className="absolute left-0 top-0 h-1 w-full bg-secondary" aria-hidden />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
