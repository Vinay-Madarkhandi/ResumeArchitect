import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ResumeArchitect", template: "%s · ResumeArchitect" },
  description:
    "Tailor your resume to any job with your own Gemini key. See every change, why it was made, and how your match score moved.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
    { media: "(prefers-color-scheme: light)", color: "#f6f4f0" },
  ],
};

// Runs before paint so the stored theme never flashes. Dark is the default.
const THEME_SCRIPT = `try{var t=localStorage.getItem("ra-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-ground text-ink">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
