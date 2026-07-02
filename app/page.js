// app/page.jsx
// ---------------------------------------------------------------------
// COLLECTOR PAGE — Home route (/)
// Optimized for clean typography, smooth mobile use, and clear layout states.
// ---------------------------------------------------------------------

"use client";

import { useState, useEffect, useCallback } from "react";

// Format a date string to DD/MM/YYYY for display
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

// Format currency in Indian Rupees
function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CollectorPage() {
  // ----------------------------------------------------------------
  // PAYMENT FORM STATE
  // ----------------------------------------------------------------
  const [customerId, setCustomerId] = useState("");
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [customerError, setCustomerError] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);

  // ----------------------------------------------------------------
  // WALK-LIST STATE
  // ----------------------------------------------------------------
  const [walklist, setWalklist] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [walklistLoading, setWalklistLoading] = useState(true);
  const [walklistError, setWalklistError] = useState("");

  // ----------------------------------------------------------------
  // PACKAGES STATE
  // ----------------------------------------------------------------
  const [packages, setPackages] = useState([]);

  // ----------------------------------------------------------------
  // Load walk-list and packages on mount
  // ----------------------------------------------------------------
  const loadWalklist = useCallback(async () => {
    setWalklistLoading(true);
    setWalklistError("");
    try {
      const res = await fetch("/api/customers?mode=walklist");
      const data = await res.json();
      if (data.success) {
        setWalklist(data.customers);
      } else {
        setWalklistError("Could not load today's list.");
      }
    } catch {
      setWalklistError("Network error loading walk-list.");
    } finally {
      setWalklistLoading(false);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/packages");
      const data = await res.json();
      if (data.success) setPackages(data.packages);
    } catch {
      // non-critical
    }
  }, []);

  const loadTodayPaid = useCallback(async () => {
    try {
      const adminPassword = sessionStorage.getItem("adminPassword");
      if (!adminPassword) return;
      const res = await fetch("/api/admin/summary?mode=today", {
        headers: { "x-admin-password": adminPassword },
      });
      const data = await res.json();
      if (data.success && data.paidCustomerIds) {
        setCheckedIds(new Set(data.paidCustomerIds));
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadWalklist();
    loadPackages();
    loadTodayPaid();
  }, [loadWalklist, loadPackages, loadTodayPaid]);

  // Customer lookup by ID
  const handleLookupCustomer = async () => {
    if (!customerId.trim()) {
      setCustomerError("⚠️ Please enter a Customer ID.");
      return;
    }
    setLookingUp(true);
    setCustomerError("");
    setFoundCustomer(null);
    setSubmitResult(null);

    try {
      const res = await fetch(
        `/api/customers?customerId=${encodeURIComponent(customerId.trim().toUpperCase())}`,
      );
      const data = await res.json();
      if (data.success && data.customer) {
        setFoundCustomer(data.customer);
        setAmountPaid(Number(data.customer.balanceDue).toFixed(2));
      } else {
        setCustomerError("❌ Customer not found. Check ID again.");
      }
    } catch {
      setCustomerError("🌐 Network error. Please try again.");
    } finally {
      setLookingUp(false);
    }
  };

  const handleCustomerIdKeyDown = (e) => {
    if (e.key === "Enter") handleLookupCustomer();
  };

  // Submit payment
  const handleSubmitPayment = async () => {
    if (!foundCustomer) {
      setCustomerError("⚠️ Look up a customer first.");
      return;
    }
    if (!amountPaid || isNaN(Number(amountPaid)) || Number(amountPaid) <= 0) {
      setSubmitResult({
        success: false,
        message: "Enter a valid amount paid.",
      });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: foundCustomer.customerId,
          amountPaid: Number(amountPaid),
          recordedBy: "COLLECTOR",
          note: note.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitResult({
          success: true,
          message: data.message || "Payment saved!",
        });
        setCheckedIds((prev) => new Set([...prev, foundCustomer.id]));
        setCustomerId("");
        setFoundCustomer(null);
        setAmountPaid("");
        setNote("");
        loadWalklist();
      } else {
        setSubmitResult({
          success: false,
          message: data.error || "Payment failed.",
        });
      }
    } catch {
      setSubmitResult({ success: false, message: "Network error. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleChecked = (customerId) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const handleWalklistRowTap = (customer) => {
    setCustomerId(customer.customerId);
    setFoundCustomer(customer);
    setAmountPaid(Number(customer.balanceDue).toFixed(2));
    setCustomerError("");
    setSubmitResult(null);
    setNote("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const paidToday = walklist.filter((c) => checkedIds.has(c.id));
  const dueToday = walklist.filter((c) => !checkedIds.has(c.id));

  return (
    <div className="space-y-6 pb-24 px-2 max-w-md mx-auto sm:px-4">
      {/* ============================================================ */}
      {/* SECTION 1: PAYMENT FORM                                       */}
      {/* ============================================================ */}
      <section className="bg-white border border-slate-200/80 rounded-2xl shadow-md overflow-hidden">
        {/* Header Banner */}
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-slate-800 text-base font-black tracking-wide uppercase leading-none">
            Record Payment
          </h2>
          <p className="text-slate-500 text-[11px] font-bold mt-1.5">
            Fill customer details to save collection details
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Customer ID input + Search button */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
              Customer ID <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8">
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value.toUpperCase());
                    setFoundCustomer(null);
                    setCustomerError("");
                    setSubmitResult(null);
                  }}
                  onKeyDown={handleCustomerIdKeyDown}
                  placeholder="E.G. C001"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-3
                             text-base font-bold uppercase tracking-wider text-slate-800
                             focus:outline-none focus:border-violet-500 bg-slate-50/50
                             placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="col-span-4">
                <button
                  onClick={handleLookupCustomer}
                  disabled={lookingUp || !customerId.trim()}
                  className="w-full h-full bg-slate-900 hover:bg-slate-800 active:bg-black disabled:bg-slate-100
                             disabled:text-slate-400 text-white font-black rounded-xl text-xs
                             tracking-wider uppercase transition-colors touch-manipulation flex items-center justify-center active:scale-[0.97]"
                >
                  {lookingUp ? "..." : "FIND"}
                </button>
              </div>
            </div>
            {customerError && (
              <p className="text-rose-600 text-xs font-bold mt-2 px-1">
                {customerError}
              </p>
            )}
          </div>

          {/* Found customer details card */}
          {foundCustomer && (
            <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="font-black text-slate-900 text-lg leading-tight truncate">
                    {foundCustomer.name}
                  </p>
                  <span className="inline-block bg-violet-600 text-white text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md">
                    ID: {foundCustomer.customerId}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] text-slate-400 font-black tracking-wider uppercase">
                    Balance Due
                  </p>
                  <p className="text-xl font-black text-rose-600 leading-none mt-1">
                    {formatRupees(foundCustomer.balanceDue)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 pt-2 border-t border-violet-200/40">
                <div className="bg-white px-2 py-1.5 rounded-lg border border-slate-200/60 shadow-sm flex items-center gap-1.5 min-w-0">
                  <span>📦</span>{" "}
                  <span className="truncate text-[11px]">
                    {foundCustomer.package?.name ?? "No Package"}
                  </span>
                </div>
                <div className="bg-white px-2 py-1.5 rounded-lg border border-slate-200/60 shadow-sm flex items-center gap-1.5">
                  <span>📅</span>{" "}
                  <span className="text-[11px]">Exp: {formatDate(foundCustomer.expiryDate)}</span>
                </div>
              </div>

              {foundCustomer.address && (
                <p className="text-[11px] font-bold text-slate-500 bg-white/60 p-2 rounded-lg border border-slate-200/40 leading-relaxed">
                  📍 {foundCustomer.address}
                </p>
              )}
            </div>
          )}

          {/* Amount paid input */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
              Amount Received (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3
                         text-2xl font-black text-emerald-600 bg-slate-50/50
                         focus:outline-none focus:border-emerald-500
                         placeholder:text-slate-300"
              inputMode="decimal"
            />
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
              Remarks / Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid by brother, cash taken"
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-3
                         text-sm font-semibold text-slate-800 focus:outline-none focus:border-violet-500
                         placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>

          {/* Submit result feedback */}
          {submitResult && (
            <div
              className={`rounded-xl px-3 py-2.5 font-bold text-sm ${
                submitResult.success
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-rose-50 text-rose-900 border border-rose-200"
              }`}
            >
              {submitResult.success ? "✅ Success: " : "❌ Error: "}
              {submitResult.message}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmitPayment}
            disabled={submitting || !foundCustomer}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                       disabled:bg-slate-100 disabled:text-slate-400
                       text-white text-sm font-black py-3.5 rounded-xl uppercase tracking-wider
                       transition-all touch-manipulation shadow-sm active:scale-[0.98]"
          >
            {submitting ? "Saving Payment..." : "Confirm & Save (✓)"}
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: TODAY'S WALK-LIST                                 */}
      {/* ============================================================ */}
      <section className="bg-white border border-slate-200/80 rounded-2xl shadow-md overflow-hidden">
        <div className="bg-slate-900 px-4 py-3.5">
          <h2 className="text-white text-base font-black tracking-wide uppercase">
            Today's Walk-List
          </h2>
          <p className="text-slate-400 text-[10px] font-black mt-0.5 tracking-wider uppercase">
            {walklist.length} Total •{" "}
            <span className="text-emerald-400 font-black">{paidToday.length} PAID</span>
            {" • "}
            <span className="text-rose-400 font-black">{dueToday.length} DUE</span>
          </p>
        </div>

        {walklistLoading && (
          <div className="px-4 py-10 text-center text-slate-400 font-bold text-sm">
            🔄 Loading walk list...
          </div>
        )}

        {walklistError && (
          <div className="px-4 py-6 text-rose-600 font-bold text-center text-xs">
            <p>{walklistError}</p>
            <button
              onClick={loadWalklist}
              className="mt-2 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase"
            >
              Reload
            </button>
          </div>
        )}

        {!walklistLoading && !walklistError && walklist.length === 0 && (
          <div className="px-4 py-10 text-center text-slate-400">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-black text-base text-slate-800">No collections remaining!</p>
          </div>
        )}

        {!walklistLoading && walklist.length > 0 && (
          <div className="divide-y divide-slate-100">
            {walklist.map((customer) => {
              const isPaid = checkedIds.has(customer.id);
              const isOverdue =
                new Date(customer.expiryDate) <
                new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  new Date().getDate(),
                );

              return (
                <div
                  key={customer.id}
                  className={`flex items-center gap-2 px-2 py-3.5 transition-colors relative
                    ${
                      isPaid
                        ? "bg-emerald-50/30 border-l-[4px] border-emerald-500"
                        : isOverdue
                          ? "bg-rose-50/40 border-l-[4px] border-rose-500"
                          : "bg-amber-50/30 border-l-[4px] border-amber-500"
                    }`}
                >
                  {/* Comfortable hit-box target for touch displays */}
                  <div className="flex items-center justify-center p-2 z-10">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={() => toggleChecked(customer.id)}
                      className="w-5 h-5 rounded accent-emerald-600 cursor-pointer flex-shrink-0 border-slate-300"
                    />
                  </div>

                  {/* Row Tap trigger */}
                  <button
                    onClick={() => handleWalklistRowTap(customer)}
                    className="flex-1 text-left min-w-0 touch-manipulation pr-2"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-bold text-sm tracking-wide leading-tight truncate
                          ${isPaid ? "text-slate-400 line-through decoration-emerald-600/40" : "text-slate-900"}`}
                        >
                          {customer.customerId} — {customer.name}
                        </p>
                        <p
                          className={`text-[11px] font-bold mt-0.5 tracking-wide uppercase truncate
                          ${isPaid ? "text-emerald-600" : "text-slate-400"}`}
                        >
                          {customer.packageName || "No Plan"} •{" "}
                          {isOverdue && !isPaid
                            ? `⚠️ Overdue: ${formatDate(customer.expiryDate)}`
                            : `Due: ${formatDate(customer.expiryDate)}`}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0 ml-1">
                        {isPaid ? (
                          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded">
                            PAID ✓
                          </span>
                        ) : (
                          <span
                            className={`font-black text-sm tracking-tight
                            ${isOverdue ? "text-rose-600" : "text-amber-700"}`}
                          >
                            {formatRupees(customer.balanceDue)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
