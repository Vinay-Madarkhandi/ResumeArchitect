import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-margin-mobile py-xxl">
      <div className="bg-dot-grid -z-10" aria-hidden />
      <Link
        href="/"
        className="mb-xl font-sans text-headline-md font-bold tracking-tight text-primary"
      >
        ResumeArchitect
      </Link>
      <div className="relative w-full max-w-[26rem] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-xl shadow-[var(--shadow-lifted)]">
        <div className="absolute left-0 top-0 h-1 w-full bg-secondary" aria-hidden />
        {children}
      </div>
    </div>
  );
}
