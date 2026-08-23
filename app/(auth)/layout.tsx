import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-margin-mobile py-xxl">
      <Link href="/" className="mb-xl font-sans text-headline-md font-bold text-primary">
        ResumeArchitect
      </Link>
      <div className="w-full max-w-[26rem] rounded-lg border border-outline-variant bg-surface-container-lowest p-xl shadow-[var(--shadow-crisp)]">
        {children}
      </div>
    </div>
  );
}
