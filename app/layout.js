// app/layout.jsx
// ---------------------------------------------------------------------
// Root layout — Premium dark glassmorphism interface.
// Optimized for quick tap-targets, outdoor visibility, and crisp fonts.
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
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 bg-fixed selection:bg-violet-500/30 selection:text-violet-200">

        {/* ---------------------------------------------------------- */}
        {/* PREMIUM DARK GLASSMORPHISM TOP HEADER BAR                 */}
        {/* ---------------------------------------------------------- */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/75 backdrop-blur-md border-b border-violet-500/15 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between gap-3">

            {/* Left side brand identification — Glassmorphism Glow Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group outline-none">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-violet-400/30 transition-transform group-hover:scale-105 group-active:scale-95">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {/* Active reflection ring */}
                <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-violet-400 to-purple-400 opacity-0 blur-sm group-hover:opacity-40 transition-opacity duration-300"></span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 uppercase leading-none">
                  Loknath
                </span>
                <span className="text-[9px] font-bold tracking-wider text-violet-400 uppercase mt-1 leading-none">
                  Cable TV
                </span>
              </div>
            </Link>

            {/* Right side — Top interactive tap actions */}
            <div className="flex items-center gap-2.5">

              {/* Collection button */}
              <Link
                href="/"
                className="flex items-center gap-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50
                           text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all
                           touch-manipulation uppercase tracking-wide hover:border-slate-600
                           active:scale-[0.96] outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-violet-400 stroke-[2.5]"
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

              {/* Admin configuration dashboard button */}
              <Link
                href="/admin"
                className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600
                           hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold px-3.5 py-2.5
                           rounded-xl transition-all touch-manipulation shadow-[0_4px_12px_rgba(124,58,237,0.3)]
                           uppercase tracking-wide active:scale-[0.96] border border-violet-400/20 outline-none
                           focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white stroke-[2.5]"
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
        {/* MAIN CONTENT PORT SPACE                                    */}
        {/* ---------------------------------------------------------- */}
        <main className="pt-20 pb-12 min-h-screen max-w-md mx-auto px-3 sm:px-4">
          {children}
        </main>

      </body>
    </html>
  );
}
