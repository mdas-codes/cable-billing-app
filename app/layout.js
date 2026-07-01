// app/layout.jsx
// ---------------------------------------------------------------------
// Root layout — clean two-button header navigation.
// Optimized for quick tap-targets and high contrast readability.
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
  title: "Cable TV Billing",
  description: "Cable TV customer payment tracking and billing management.",
  robots: "noindex, nofollow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-violet-50/50 bg-fixed">

        {/* ---------------------------------------------------------- */}
        {/* TOP HEADER BAR                                              */}
        {/* ---------------------------------------------------------- */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200/80 shadow-md">
          <div className="max-w-md mx-auto px-3 py-3.5 flex items-center justify-between gap-3 sm:px-4">

            {/* Left side brand identification */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.6)]"></span>
              </div>
              <span className="text-xs font-black tracking-wider text-slate-900 uppercase leading-none">
                Loknath Cable TV
              </span>
            </div>

            {/* Right side — high-visibility navigation tap targets */}
            <div className="flex items-center gap-2.5">

              {/* Collection button */}
              <Link
                href="/"
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200
                           active:bg-slate-300 border-2 border-slate-300/80
                           text-slate-800 text-xs font-black px-3.5 py-2.5 rounded-xl
                           transition-colors touch-manipulation shadow-sm uppercase tracking-wide"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-slate-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
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
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800
                           active:bg-black text-white text-xs font-black px-3.5 py-2.5
                           rounded-xl transition-colors touch-manipulation shadow-md uppercase tracking-wide"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-slate-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
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
        <main className="pt-20 pb-12 min-h-screen max-w-md mx-auto px-2 sm:px-4">
          {children}
        </main>

      </body>
    </html>
  );
}
