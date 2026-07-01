// app/admin/page.jsx
// ---------------------------------------------------------------------
// ADMIN DASHBOARD — Protected route (/admin)
// Optimized for senior-friendly readability, outdoor use, and mobile use.
// Includes a solid grid-based quick bill collector layout.
// ---------------------------------------------------------------------

"use client";

import { useState, useEffect, useCallback } from "react";

function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// ─── Reusable widget card — Large text & distinct icons ──────────────
function SummaryCard({ label, value, color, icon }) {
  return (
    <div className={`rounded-2xl p-4 border border-slate-200/80 shadow-md ${color} flex flex-col gap-1`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl filter drop-shadow-sm">{icon}</span>
        <span className="text-xs font-black uppercase tracking-wider opacity-90">
          {label}
        </span>
      </div>
      <p className="text-2xl font-black tracking-tight leading-tight mt-1">{value}</p>
    </div>
  );
}

// ─── Payment row — Clean list item ───────────────────────────────────
function PaymentRow({ payment }) {
  const isFull = payment.paymentType === "FULL";
  return (
    <div className="px-3 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-base truncate">
            {payment.customerDisplayId} — {payment.customerName}
          </p>
          <p className="text-sm text-slate-600 font-bold mt-1">
            {payment.packageName} •{" "}
            <span
              className={`font-black ${
                isFull ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {isFull ? "Full Payment" : "Partial Payment"}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded-md border border-slate-200/60">
              {payment.recordedBy === "ADMIN" ? "👤 Admin" : "🚶 Collector"}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {formatDateTime(payment.paidAt)}
            </span>
          </div>
          {payment.note && (
            <p className="text-xs bg-amber-50 text-amber-900 font-bold border border-amber-200 px-2.5 py-1.5 rounded-xl mt-2 italic w-fit">
              "Note: {payment.note}"
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-xl font-black text-emerald-600">
            {formatRupees(payment.amountPaid)}
          </p>
          {Number(payment.balanceAfterPayment) > 0 && (
            <p className="text-xs text-rose-600 font-black mt-0.5">
              Bal: {formatRupees(payment.balanceAfterPayment)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Due customer row — Large clear labels ────────────────────────────
function DueCustomerRow({ customer }) {
  const isOverdue =
    new Date(customer.expiryDate) <
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    );
  return (
    <div className="px-3 py-4 border-b border-slate-100 last:border-0 flex justify-between items-center gap-2 hover:bg-slate-50/50 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="font-black text-slate-900 text-base truncate">
          {customer.customerId} — {customer.name}
        </p>
        <p className="text-sm text-slate-600 font-bold mt-1">
          {customer.packageName} •{" "}
          {isOverdue ? (
            <span className="text-rose-700 font-black bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 inline-flex items-center gap-1">
              ⚠️ Overdue: {formatDate(customer.expiryDate)}
            </span>
          ) : (
            <span className="text-slate-500 font-bold">Due: {formatDate(customer.expiryDate)}</span>
          )}
        </p>
      </div>
      <p className="text-lg font-black text-rose-600 flex-shrink-0 ml-2">
        {formatRupees(customer.balanceDue)}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────
export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authChecking, setAuthChecking] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  const [todayData, setTodayData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const [packages, setPackages] = useState([]);
  const [newPkg, setNewPkg] = useState({ name: "", price: "", durationDays: "" });
  const [pkgResult, setPkgResult] = useState(null);
  const [savingPkg, setSavingPkg] = useState(false);

  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [adminCustomerId, setAdminCustomerId] = useState("");
  const [adminFoundCustomer, setAdminFoundCustomer] = useState(null);
  const [adminAmountPaid, setAdminAmountPaid] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [adminLookingUp, setAdminLookingUp] = useState(false);
  const [adminCustomerError, setAdminCustomerError] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminSubmitResult, setAdminSubmitResult] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("adminPassword");
    if (saved) {
      verifyPassword(saved, true);
    }
  }, []);

  const verifyPassword = async (pwd, silent = false) => {
    if (!silent) setAuthChecking(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/summary?mode=today", {
        headers: { "x-admin-password": pwd },
      });
      if (res.ok) {
        sessionStorage.setItem("adminPassword", pwd);
        setAuthed(true);
        const data = await res.json();
        if (data.success) setTodayData(data);
      } else {
        setAuthError("❌ Incorrect password. Please try again.");
        sessionStorage.removeItem("adminPassword");
      }
    } catch {
      setAuthError("🌐 Network error. Please try again.");
    } finally {
      if (!silent) setAuthChecking(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      setAuthError("⚠️ Please enter the admin password.");
      return;
    }
    verifyPassword(password.trim());
  };

  const getPassword = () => sessionStorage.getItem("adminPassword") ?? "";

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      const res = await fetch("/api/admin/summary?mode=today", {
        headers: { "x-admin-password": getPassword() },
      });
      const data = await res.json();
      if (data.success) setTodayData(data);
    } catch {
      // silent
    } finally {
      setLoadingToday(false);
    }
  }, []);

  const loadMonthly = useCallback(async () => {
    if (monthlyData) return;
    setLoadingMonthly(true);
    try {
      const res = await fetch("/api/admin/summary?mode=monthly", {
        headers: { "x-admin-password": getPassword() },
      });
      const data = await res.json();
      if (data.success) setMonthlyData(data);
    } catch {
      // silent
    } finally {
      setLoadingMonthly(false);
    }
  }, [monthlyData]);

  const loadPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/packages");
      const data = await res.json();
      if (data.success) setPackages(data.packages);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (authed) {
      loadPackages();
    }
  }, [authed, loadPackages]);

  useEffect(() => {
    if (authed && activeTab === "today") loadToday();
    if (authed && activeTab === "monthly") loadMonthly();
  }, [authed, activeTab, loadToday, loadMonthly]);

  const handleAdminLookup = async () => {
    if (!adminCustomerId.trim()) return;
    setAdminLookingUp(true);
    setAdminCustomerError("");
    setAdminFoundCustomer(null);
    setAdminSubmitResult(null);
    try {
      const res = await fetch(
        `/api/customers?customerId=${encodeURIComponent(
          adminCustomerId.trim().toUpperCase()
        )}`
      );
      const data = await res.json();
      if (data.success && data.customer) {
        setAdminFoundCustomer(data.customer);
        setAdminAmountPaid(Number(data.customer.balanceDue).toFixed(2));
      } else {
        setAdminCustomerError("❌ Customer not found. Check ID again.");
      }
    } catch {
      setAdminCustomerError("🌐 Network error.");
    } finally {
      setAdminLookingUp(false);
    }
  };

  const handleAdminPayment = async () => {
    if (!adminFoundCustomer) return;
    if (!adminAmountPaid || isNaN(Number(adminAmountPaid)) || Number(adminAmountPaid) <= 0) {
      setAdminSubmitResult({ success: false, message: "Enter a valid amount." });
      return;
    }
    setAdminSubmitting(true);
    setAdminSubmitResult(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: adminFoundCustomer.customerId,
          amountPaid: Number(adminAmountPaid),
          recordedBy: "ADMIN",
          note: adminNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminSubmitResult({ success: true, message: data.message || "Payment saved successfully!" });
        setAdminCustomerId("");
        setAdminFoundCustomer(null);
        setAdminAmountPaid("");
        setAdminNote("");
        setTodayData(null);
        loadToday();
      } else {
        setAdminSubmitResult({ success: false, message: data.error || "Payment failed." });
      }
    } catch {
      setAdminSubmitResult({ success: false, message: "Network error." });
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleCreatePackage = async () => {
    if (!newPkg.name || !newPkg.price || !newPkg.durationDays) {
      setPkgResult({ success: false, message: "All fields are required." });
      return;
    }
    setSavingPkg(true);
    setPkgResult(null);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": getPassword(),
        },
        body: JSON.stringify({
          name: newPkg.name,
          price: Number(newPkg.price),
          durationDays: Number(newPkg.durationDays),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPkgResult({ success: true, message: `Package "${newPkg.name}" created!` });
        setNewPkg({ name: "", price: "", durationDays: "" });
        loadPackages();
      } else {
        setPkgResult({ success: false, message: data.error });
      }
    } catch {
      setPkgResult({ success: false, message: "Network error." });
    } finally {
      setSavingPkg(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", importFile);
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "x-admin-password": getPassword() },
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
    } catch {
      setImportResult({ success: false, error: "Network error during import." });
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/customers/export", {
        headers: { "x-admin-password": getPassword() },
      });
      if (!res.ok) {
        alert("Export failed. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="(.+)"/);
      a.download = match ? match[1] : "cable_tv_backup.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please check your connection.");
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminPassword");
    setAuthed(false);
    setPassword("");
    setTodayData(null);
    setMonthlyData(null);
  };

  // ================================================================
  // 1. PASSWORD GATE SCREEN (Light-Mode Glassmorphism)
  // ================================================================
  if (!authed) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center py-6">
        <div className="w-full max-w-sm px-2">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-6 text-center">
              <div className="text-4xl mb-3 filter drop-shadow-sm">🔒</div>
              <h1 className="text-slate-900 text-2xl font-black tracking-tight uppercase">Admin Dashboard</h1>
              <p className="text-slate-500 text-xs font-bold mt-1.5 uppercase tracking-wider">
                Enter password to unlock system
              </p>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                placeholder="PASSWORD"
                className="w-full border-2 border-slate-300 bg-slate-50/50 rounded-2xl px-4 py-4
                           text-lg font-bold focus:outline-none focus:border-violet-500 focus:bg-white
                           placeholder:text-slate-400 placeholder:font-normal transition-all"
                autoComplete="current-password"
              />
              {authError && (
                <p className="text-rose-600 bg-rose-50 border-2 border-rose-200 font-bold text-sm px-3 py-2 rounded-xl text-center">
                  {authError}
                </p>
              )}
              <button
                onClick={handlePasswordSubmit}
                disabled={authChecking}
                className="w-full bg-slate-900 hover:bg-slate-800 active:bg-black
                           disabled:bg-slate-200 disabled:text-slate-400 text-white text-lg font-black
                           py-4 rounded-2xl transition-all shadow-md touch-manipulation uppercase tracking-wider"
              >
                {authChecking ? "Checking System..." : "Unlock Dashboard 🔓"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // 2. MAIN DASHBOARD CONTENT
  // ================================================================
  return (
    <div className="space-y-6 pb-24 px-2 max-w-2xl mx-auto sm:px-4">

      {/* Top Banner & Logout Row */}
      <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-md">
        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Admin Section</h1>
        <button
          onClick={handleLogout}
          className="text-xs text-rose-600 font-black border-2 border-rose-200 hover:bg-rose-50
                     px-3.5 py-2 rounded-xl transition-colors active:scale-95 touch-manipulation uppercase"
        >
          Logout 🚪
        </button>
      </div>

      {/* Modern, Tall Light Mode Tab Selector */}
      <div className="flex bg-slate-100 rounded-2xl p-1.5 gap-1.5 border border-slate-200/60 shadow-inner">
        {[
          { key: "today", label: "📅 Today" },
          { key: "monthly", label: "📊 Monthly" },
          { key: "tools", label: "🛠 Tools" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3.5 rounded-xl text-sm font-black transition-all active:scale-95 touch-manipulation uppercase
              ${activeTab === tab.key
                ? "bg-white text-slate-950 shadow-md border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TAB A: TODAY RECORDS                                         */}
      {/* ============================================================ */}
      {activeTab === "today" && (
        <div className="space-y-6">
          {loadingToday && (
            <p className="text-center text-slate-500 py-12 font-bold animate-pulse text-lg">
              🔄 Loading today's metrics...
            </p>
          )}

          {todayData && (
            <>
              {/* High Contrast Informational Cards */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard
                  label="Paid Today"
                  value={formatRupees(todayData.summary.totalPaid)}
                  color="bg-emerald-50 text-emerald-900 border-emerald-200"
                  icon="💰"
                />
                <SummaryCard
                  label="Due Today"
                  value={formatRupees(todayData.summary.totalDue)}
                  color="bg-rose-50 text-rose-900 border-rose-200"
                  icon="⏳"
                />
                <SummaryCard
                  label="Collected"
                  value={`${todayData.summary.paidCount} Rows`}
                  color="bg-sky-50 text-sky-900 border-sky-200"
                  icon="✅"
                />
                <SummaryCard
                  label="Pending"
                  value={`${todayData.summary.dueCount} Houses`}
                  color="bg-amber-50 text-amber-900 border-amber-200"
                  icon="🔔"
                />
              </div>

              {/* Refresh UI utility */}
              <button
                onClick={loadToday}
                className="w-full py-4 border-2 border-slate-300 bg-white text-slate-900
                           font-black rounded-2xl hover:bg-slate-50 transition-colors shadow-md text-sm uppercase tracking-wider touch-manipulation"
              >
                🔄 Refresh Live Records
              </button>

              {/* Action Box: Record Payment (Admin override with Grid fix) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-4 text-center">
                  <h2 className="text-slate-800 font-black text-base uppercase tracking-wide">Quick Bill Collector (Admin)</h2>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      Customer ID <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-8 sm:col-span-9">
                        <input
                          type="text"
                          value={adminCustomerId}
                          onChange={(e) => {
                            setAdminCustomerId(e.target.value.toUpperCase());
                            setAdminFoundCustomer(null);
                            setAdminCustomerError("");
                            setAdminSubmitResult(null);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleAdminLookup()}
                          placeholder="E.G. C001"
                          className="w-full border-2 border-slate-300 bg-slate-50/50 rounded-xl px-3 py-3.5
                                     text-lg font-bold uppercase tracking-wider text-slate-800 focus:outline-none
                                     focus:border-violet-500 focus:bg-white placeholder:font-normal placeholder:tracking-normal"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <button
                          onClick={handleAdminLookup}
                          disabled={adminLookingUp || !adminCustomerId.trim()}
                          className="w-full h-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400
                                     text-white font-black rounded-xl text-xs sm:text-sm tracking-wider uppercase
                                     transition-colors touch-manipulation flex items-center justify-center"
                        >
                          {adminLookingUp ? "..." : "FIND"}
                        </button>
                      </div>
                    </div>
                    {adminCustomerError && (
                      <p className="text-rose-600 font-bold text-sm mt-2 px-1">
                        {adminCustomerError}
                      </p>
                    )}
                  </div>

                  {adminFoundCustomer && (
                    <div className="bg-violet-50/60 border-2 border-violet-200 rounded-xl p-4 space-y-2">
                      <p className="font-black text-slate-900 text-lg leading-tight">
                        👤 {adminFoundCustomer.name}
                      </p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        ID: <span className="text-slate-900 font-mono font-black">{adminFoundCustomer.customerId}</span>
                      </p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Outstanding Balance:{" "}
                        <span className="font-black text-rose-600 text-base">
                          {formatRupees(adminFoundCustomer.balanceDue)}
                        </span>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      Amount Received (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={adminAmountPaid}
                      onChange={(e) => setAdminAmountPaid(e.target.value)}
                      placeholder="0.00"
                      className="w-full border-2 border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3.5
                                 text-3xl font-black text-emerald-700 focus:outline-none
                                 focus:border-emerald-500 focus:bg-white placeholder:text-slate-300"
                      inputMode="decimal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                      Extra Remarks / Notes
                    </label>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="e.g. Paid via GPay, cash given"
                      className="w-full border-2 border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3.5
                                 text-base font-bold focus:outline-none focus:bg-white
                                 focus:border-violet-500 placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>

                  {adminSubmitResult && (
                    <div className={`rounded-xl px-4 py-3.5 font-bold text-base shadow-sm border-2
                      ${adminSubmitResult.success
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                        : "bg-rose-50 text-rose-900 border-rose-300"
                      }`}>
                      {adminSubmitResult.success ? "✅ SUCCESS: " : "❌ ERROR: "}
                      {adminSubmitResult.message}
                    </div>
                  )}

                  <button
                    onClick={handleAdminPayment}
                    disabled={adminSubmitting || !adminFoundCustomer}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                               disabled:bg-slate-100 disabled:text-slate-400 text-white text-lg font-black
                               py-4 rounded-xl transition-all shadow-md uppercase tracking-wider touch-manipulation"
                  >
                    {adminSubmitting ? "Saving entry..." : "Confirm & Save (✓)"}
                  </button>
                </div>
              </div>

              {/* List Wrapper: Today Transactions */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-black text-base text-slate-900 uppercase tracking-wide">
                    Collected Logs Today ({todayData.payments.length})
                  </h2>
                </div>
                {todayData.payments.length === 0 ? (
                  <p className="px-4 py-12 text-center text-slate-400 font-black text-base">
                    No transactions recorded today yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {todayData.payments.map((p) => (
                      <PaymentRow key={p.id} payment={p} />
                    ))}
                  </div>
                )}
              </div>

              {/* List Wrapper: Today's pending collection walklist */}
              {todayData.walklist && todayData.walklist.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                  <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-black text-base text-slate-900 uppercase tracking-wide">
                      Unpaid Houses Left ({todayData.summary.dueCount})
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {todayData.walklist
                      .filter((c) => !todayData.paidCustomerIds?.includes(c.id))
                      .map((c) => (
                        <DueCustomerRow key={c.id} customer={c} />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB B: MONTHLY ARCHIVES                                      */}
      {/* ============================================================ */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          {loadingMonthly && (
            <p className="text-center text-slate-500 py-12 font-bold animate-pulse text-lg">
              🔄 Analyzing monthly statements...
            </p>
          )}

          {monthlyData && (
            <>
              {/* Monthly Overview Numbers */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard
                  label="Paid This Month"
                  value={formatRupees(monthlyData.summary.totalPaid)}
                  color="bg-emerald-50 text-emerald-900 border-emerald-200"
                  icon="💰"
                />
                <SummaryCard
                  label="Total Outstanding"
                  value={formatRupees(monthlyData.summary.totalDue)}
                  color="bg-rose-50 text-rose-900 border-rose-200"
                  icon="⏳"
                />
                <SummaryCard
                  label="Paid Users"
                  value={`${monthlyData.summary.paidCount} Houses`}
                  color="bg-sky-50 text-sky-900 border-sky-200"
                  icon="✅"
                />
                <SummaryCard
                  label="Unpaid Balance"
                  value={`${monthlyData.summary.dueCount} Users`}
                  color="bg-amber-50 text-amber-900 border-amber-200"
                  icon="🔔"
                />
              </div>

              <button
                onClick={() => { setMonthlyData(null); loadMonthly(); }}
                className="w-full py-4 border-2 border-slate-300 bg-white text-slate-900
                           font-black rounded-2xl hover:bg-slate-50 transition-colors shadow-md text-sm uppercase tracking-wider touch-manipulation"
              >
                🔄 Recalculate Monthly Summary
              </button>

              {/* Log History */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-black text-base text-slate-900 uppercase tracking-wide">
                    Monthly Statement Ledger ({monthlyData.payments.length})
                  </h2>
                </div>
                {monthlyData.payments.length === 0 ? (
                  <p className="px-4 py-12 text-center text-slate-400 font-black text-base">
                    No matching records for this billing month.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {monthlyData.payments.map((p) => (
                      <PaymentRow key={p.id} payment={p} />
                    ))}
                  </div>
                )}
              </div>

              {/* Total accounts in debt */}
              {monthlyData.dueCustomers?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                  <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-black text-base text-slate-900 uppercase tracking-wide">
                      Defaulters / Pending Dues ({monthlyData.dueCustomers.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {monthlyData.dueCustomers.map((c) => (
                      <DueCustomerRow key={c.id} customer={c} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB C: SYSTEM UTILITIES & OPERATIONS                         */}
      {/* ============================================================ */}
      {activeTab === "tools" && (
        <div className="space-y-6">

          {/* Core Module: Cloud Backup Generation */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            <div className="bg-emerald-600 px-4 py-4 text-center">
              <h2 className="text-white font-black text-lg uppercase tracking-wide">📥 Device System Backup</h2>
              <p className="text-emerald-100 text-xs font-bold mt-1 uppercase tracking-wider">
                Save data ledger to phone storage
              </p>
            </div>
            <div className="p-4">
              <p className="text-slate-600 text-sm font-bold mb-4 leading-relaxed">
                Clicking download compiles all operational criteria (Customers, Packages, outstanding dues)
                into a universally readable spreadsheet file (.csv). Safely execute this step before running batch changes.
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full bg-slate-900 hover:bg-slate-800 active:bg-black
                           disabled:bg-slate-200 disabled:text-slate-400 text-white text-lg font-black
                           py-4 rounded-xl transition-all shadow-md uppercase tracking-wider touch-manipulation"
              >
                {exporting ? "Compiling backup..." : "⬇️ Download Local Backup File"}
              </button>
            </div>
          </div>

          {/* Core Module: Master Database CSV Imports */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            <div className="bg-sky-600 px-4 py-4 text-center">
              <h2 className="text-white font-black text-lg uppercase tracking-wide">📤 Bulk Import Ledger</h2>
              <p className="text-sky-100 text-xs font-bold mt-1 uppercase tracking-wider">
                Upload spreadsheets to populate data records
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-sky-50/60 border-2 border-sky-200 rounded-xl p-4 text-sm text-sky-950 font-bold leading-relaxed shadow-sm">
                <p className="font-black text-sky-900 mb-1 uppercase tracking-wider text-xs">Spreadsheet layout column mapping:</p>
                <p className="font-mono text-xs bg-white border border-sky-200/60 p-2.5 rounded-xl text-center font-black tracking-wide mt-1.5 select-all">
                  customerid, name, package, address, startdate
                </p>
                <p className="mt-2.5 text-xs text-slate-500 font-bold normal-case">
                  Note: The text matches in your package column must exactly mirror established entries. Existing individual entities will be bypassed cleanly to prevent double writes.
                </p>
              </div>

              <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-4 rounded-xl text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0] ?? null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4
                             file:rounded-xl file:border-0 file:bg-slate-900
                             file:text-white file:font-black file:text-xs
                             hover:file:bg-slate-800 cursor-pointer"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={importing || !importFile}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400
                           text-white text-base font-black py-3.5 rounded-xl transition-all shadow-md uppercase tracking-wider touch-manipulation"
              >
                {importing ? "Processing ingestion..." : "📤 Execute Batch Ingestion"}
              </button>

              {importResult && (
                <div className={`rounded-xl p-4 text-sm font-bold border-2
                  ${importResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}>
                  <p className="text-base font-black">{importResult.message || importResult.error}</p>
                  {importResult.results && (
                    <div className="mt-3 space-y-1.5 font-bold text-slate-700">
                      <p>🟢 Profiles Appended: <span className="font-black text-slate-900">{importResult.results.created.length}</span></p>
                      <p>🟡 Skipped (Duplicates): <span className="font-black text-slate-900">{importResult.results.skipped.length}</span></p>
                      <p>🔴 Failed Records: <span className="font-black text-rose-600">{importResult.results.failed.length}</span></p>
                      {importResult.results.failed.length > 0 && (
                        <div className="mt-2 bg-rose-100/50 border border-rose-200 rounded-xl p-3 text-xs font-mono max-h-40 overflow-y-auto">
                          {importResult.results.failed.map((f, i) => (
                            <p key={i} className="text-rose-950">
                              Row {f.row} {f.customerId ? `(${f.customerId})` : ""}: {f.reason}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Core Module: Pricing Packages adjustments */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            <div className="bg-slate-900 px-4 py-4 text-center">
              <h2 className="text-white font-black text-lg uppercase tracking-wide">📦 Manage Recharge Packages</h2>
            </div>
            <div className="p-4 space-y-4">
              {/* Active structures map list */}
              {packages.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 ml-1">
                    Current Active Plans
                  </label>
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex justify-between items-center bg-slate-50/50
                                 border-2 border-slate-100 rounded-xl px-4 py-3.5 shadow-sm"
                    >
                      <div>
                        <p className="font-black text-slate-900 text-base">{pkg.name}</p>
                        <p className="text-sm font-bold text-slate-500">
                          ⏱️ {pkg.durationDays} Days cycle duration
                        </p>
                      </div>
                      <p className="font-black text-violet-600 text-lg">
                        {formatRupees(pkg.price)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-black text-slate-900 mb-3 ml-1 uppercase tracking-wide">
                  ➕ Add New Subscription Type
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newPkg.name}
                    onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })}
                    placeholder="Plan Name (e.g., Premium HD Pack)"
                    className="w-full border-2 border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3.5
                               text-black font-bold focus:outline-none focus:bg-white
                               focus:border-slate-600 placeholder:font-normal placeholder:text-slate-400"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={newPkg.price}
                        onChange={(e) => setNewPkg({ ...newPkg, price: e.target.value })}
                        placeholder="Price ₹"
                        className="w-full border-2 border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3.5
                                   text-base font-bold text-slate-900 focus:outline-none focus:bg-white
                                   focus:border-slate-600 placeholder:font-normal placeholder:text-slate-400"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={newPkg.durationDays}
                        onChange={(e) =>
                          setNewPkg({ ...newPkg, durationDays: e.target.value })
                        }
                        placeholder="Cycle (Days)"
                        className="w-full border-2 border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3.5
                                   text-base font-bold text-slate-900 focus:outline-none focus:bg-white
                                   focus:border-slate-600 placeholder:font-normal placeholder:text-slate-400"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  {pkgResult && (
                    <div className={`rounded-xl px-3 py-2.5 text-sm font-bold text-center border-2
                      ${pkgResult.success
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-rose-50 text-rose-900 border-rose-200"
                      }`}>
                      {pkgResult.success ? "✅ " : "❌ "}
                      {pkgResult.message}
                    </div>
                  )}

                  <button
                    onClick={handleCreatePackage}
                    disabled={savingPkg}
                    className="w-full bg-slate-900 hover:bg-slate-800 active:bg-black
                               disabled:bg-slate-200 disabled:text-slate-400 text-white text-base font-black
                               py-3.5 rounded-xl transition-all shadow-md uppercase tracking-wider touch-manipulation"
                  >
                    {savingPkg ? "Creating package entry..." : "+ Add This Package"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
