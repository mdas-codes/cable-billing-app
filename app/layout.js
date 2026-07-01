// app/layout.jsx
// ---------------------------------------------------------------------
// Root layout — optimized for high visibility, light-mode, and ease of use.
// Features:
//   - High-contrast typography for easy reading under any lighting
//   - Large, thumb-friendly tap targets for mobile layouts
//   - Pure white/slate glassmorphism elements
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
  themeColor: "#f8fafc", // Clean slate background for mobile status bar
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-violet-50/50 bg-fixed">

      {/* ---------------------------------------------------------- */}
{/* TOP HEADER BAR                                              */}
{/* ---------------------------------------------------------- */}
<header className="fixed top-0 left-0 right-0 z-50 bg-white/80 border-b border-slate-200 backdrop-blur-md shadow-sm">
  <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">

    {/* Clickable Logo Container — Navigates to Home (/) */}
    <Link
      href="/"
      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/60 active:scale-95 border border-slate-200/60 shadow-sm transition-all cursor-pointer touch-manipulation"
    >
      {/* Pulsing Dot - Rich Purple Core */}
      <div className="relative flex h-4 w-4 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></span>
      </div>

      {/* Bold, readable text */}
      <span className="text-xs font-black tracking-wider text-slate-800 uppercase leading-none">
        Loknath Cable TV
      </span>
    </Link>

    {/* Admin Link - Large, crisp button */}
    <Link
      href="/admin"
      className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:bg-black
                 text-white text-xs font-bold px-3.5 py-2 rounded-xl
                 transition-colors touch-manipulation shadow-sm"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      ADMIN
    </Link>

  </div>
</header>

        {/* ---------------------------------------------------------- */}
        {/* MAIN CONTENT                                                */}
        {/* ---------------------------------------------------------- */}
        <main className="pt-20 pb-28 min-h-screen max-w-lg mx-auto px-4">
          {children}
        </main>

        {/* ---------------------------------------------------------- */}
        {/* BOTTOM NAVIGATION — Large, obvious tap targets            */}
        {/* ---------------------------------------------------------- */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 border-t border-slate-200 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="max-w-lg mx-auto flex h-20">

            {/* Collection Tab */}
            <Link
              href="/collection"
              className="flex-1 flex flex-col items-center justify-center gap-1.5
                         text-slate-500 hover:text-violet-600 active:bg-slate-50
                         transition-all touch-manipulation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 stroke-[2.25]"
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
              <span className="text-xs font-bold tracking-wide uppercase">Collection</span>
            </Link>

            {/* Dashboard Tab */}
            <Link
              href="/dashboard"
              className="flex-1 flex flex-col items-center justify-center gap-1.5
                         text-slate-500 hover:text-violet-600 active:bg-slate-50
                         transition-all touch-manipulation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 stroke-[2.25]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-xs font-bold tracking-wide uppercase">Dashboard</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
