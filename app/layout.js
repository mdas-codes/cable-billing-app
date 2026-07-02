// app/layout.jsx
// ---------------------------------------------------------------------
// Root layout — Premium dark-mode header interface.
// Optimized for quick tap-targets, outdoor visibility, and heavy fonts.
// ---------------------------------------------------------------------

import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Loknath Cable TV Billing",
  description: "Cable TV customer payment tracking and billing management.",
  robots: "noindex, nofollow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a", // Sleek dark theme color matching the header
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-violet-50/60 bg-fixed">

        {/* ---------------------------------------------------------- */}
        {/* PREMIUM TOP HEADER BAR                                     */}
        {/* ---------------------------------------------------------- */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b-2 border-slate-950/40 shadow-[0_4px_20px_rgba(15,23,42,0.15)] backdrop-blur-md bg-opacity-95">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3 sm:px-4">

            {/* Left side brand identification — Upgraded Logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="relative flex h-5 w-5 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_0_12px_rgba(139,92,246,0.4)] border border-violet-400/30">
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {/* Micro-glow ring */}
                <span className="absolute -inset-0.5 rounded-xl bg-violet-400 opacity-20 blur-sm group-hover:opacity-40 transition-opacity"></span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 uppercase leading-none">
                  Loknath
                </span>
                <span className="text-[9px] font-bold tracking-wider text-violet-400 uppercase mt-0.5 leading-none">
                  Cable TV
                </span>
              </div>
            </div>

            {/* Right side — Retained top button structure with enhanced hitboxes */}
            <div className="flex items-center gap-2.5">

              {/* Collection button */}
              <Link
                href="/"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700
                           active:bg-slate-600 border border-slate-700
                           text-slate-100 text-xs font-black px-3.5 py-2.5 rounded-xl
                           transition-all touch-manipulation shadow-sm uppercase tracking-wide
                           active:scale-[0.97]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-violet-400 stroke-[3]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Collect
              </Link>

              {/* Admin button */}
              <Link
                href="/admin"
                className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600
                           hover:from-violet-500 hover:to-indigo-500
                           active:from-violet-700 active:to-indigo-700 text-white text-xs font-black px-3.5 py-2.5
                           rounded-xl transition-all touch-manipulation shadow-[0_2px_8px_rgba(124,58,237,0.3)]
                           uppercase tracking-wide active:scale-[0.97] border border-violet-500/30"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white stroke-[3]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Admin
              </Link>

            </div>
          </div>
        </header>

        {/* ---------------------------------------------------------- */}
        {/* MAIN CONTENT                                                */}
        {/* Pt-20 clears the header perfectly across mobile displays.   */}
        {/* ---------------------------------------------------------- */}
        <main className="pt-20 pb-12 min-h-screen max-w-md mx-auto px-2.5 sm:px-4">
          {children}
        </main>

      </body>
    </html>
  );
}
