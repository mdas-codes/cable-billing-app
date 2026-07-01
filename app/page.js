// app/page.jsx
// ---------------------------------------------------------------------
// COLLECTOR PAGE — Home route (/)
// Optimized for older eyes, outdoor visibility, and simple mobile use.
//
// Two sections:
// 1. PAYMENT FORM — Clear labels, massive inputs, simple lookup tools.
// 2. TODAY'S WALK-LIST — Bold status flags, fat checkboxes, row taps.
// ---------------------------------------------------------------------

"use client";

import { useState, useEffect, useCallback } from "react";

// Format a date string to DD/MM/YYYY for display
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
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
        `/api/customers?customerId=${encodeURIComponent(customerId.trim().toUpperCase())}`
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
      setSubmitResult({ success: false, message: "Enter a valid amount paid." });
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
        setSubmitResult({ success: true, message: data.message || "Payment saved!" });
        setCheckedIds((prev) => new Set([...prev, foundCustomer.id]));
        setCustomerId("");
        setFoundCustomer(null);
        setAmountPaid("");
        setNote("");
        loadWalklist();
      } else {
        setSubmitResult({ success: false, message: data.error || "Payment failed." });
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
    <div className="space-y-6 pb-20">

      {/* ============================================================ */}
      {/* SECTION 1: PAYMENT FORM                                       */}
      {/* ============================================================ */}
      <section className="bg-white/80 border border-slate-200 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        {/* Modern, clean glass banner header */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-4">
          <h2 className="text-slate-800 text-lg font-black tracking-wide uppercase leading-none">
            Record Payment
          </h2>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            Fill customer details to save collection details
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* Customer ID input + Search button */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Customer ID <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
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
                className="flex-1 border-2 border-slate-300 rounded-xl px-4 py-3.5
                           text-xl font-bold uppercase tracking-widest text-slate-800
                           focus:outline-none focus:border-violet-500 bg-slate-50/50
                           placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                onClick={handleLookupCustomer}
                disabled={lookingUp || !customerId.trim()}
                className="bg-slate-900 hover:bg-slate-800 active:bg-black disabled:bg-slate-200
                           text-white font-black px-6 py-3.5 rounded-xl text-sm tracking-wider uppercase
                           transition-colors touch-manipulation shadow-sm min-w-[90px]"
              >
                {lookingUp ? "..." : "FIND"}
              </button>
            </div>
            {customerError && (
              <p className="text-rose-600 text-sm font-bold mt-1.5 px-1">{customerError}</p>
            )}
          </div>

          {/* Found customer details card - Extra Readable */}
          {foundCustomer && (
            <div className="bg-violet-50/60 border-2 border-violet-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-black text-slate-900 text-xl leading-tight">
                    {foundCustomer.name}
                  </p>
                  <p className="text-violet-700 text-sm font-bold mt-0.5 tracking-wider uppercase">
                    ID: {foundCustomer.customerId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Balance Due</p>
                  <p className="text-2xl font-black text-rose-600 leading-none mt-0.5">
                    {formatRupees(foundCustomer.balanceDue)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 pt-2.5 border-t border-violet-200/60">
                <div className="bg-white/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  📦 {foundCustomer.package?.name ?? "No Package"}
                </div>
                <div className="bg-white/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  📅 Exp: {formatDate(foundCustomer.expiryDate)}
                </div>
              </div>

              {foundCustomer.address && (
                <p className="text-xs font-bold text-slate-500 bg-white/40 p-2 rounded-lg border border-slate-200/40">
                  📍 {foundCustomer.address}
                </p>
              )}
            </div>
          )}

          {/* Amount paid input - Huge fields */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Amount Received (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full border-2 border-slate-300 rounded-xl px-4 py-4
                           text-3xl font-black text-emerald-700 bg-slate-50/50
                           focus:outline-none focus:border-emerald-500
                           placeholder:text-slate-300"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Remarks / Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid by brother, cash taken"
              className="w-full border-2 border-slate-300 rounded-xl px-4 py-3.5
                         text-base font-semibold text-slate-800 focus:outline-none focus:border-violet-500
                         placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>

          {/* Submit result feedback - Loud and obvious alerts */}
          {submitResult && (
            <div
              className={`rounded-xl px-4 py-3.5 font-bold text-base shadow-sm ${
                submitResult.success
                  ? "bg-emerald-50 text-emerald-900 border-2 border-emerald-300"
                  : "bg-rose-50 text-rose-900 border-2 border-rose-300"
              }`}
            >
              {submitResult.success ? "✅ SUCCESS: " : "❌ ERROR: "}
              {submitResult.message}
            </div>
          )}

          {/* Submit button - Extra padding for thick fingers */}
          <button
            onClick={handleSubmitPayment}
            disabled={submitting || !foundCustomer}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                       disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                       text-white text-lg font-black py-4.5 rounded-xl uppercase tracking-wider
                       transition-all touch-manipulation shadow-md shadow-emerald-800/10"
          >
            {submitting ? "Saving Payment..." : "Confirm & Save (✓)"}
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: TODAY'S WALK-LIST                                 */}
      {/* ============================================================ */}
      <section className="bg-white/80 border border-slate-200 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-slate-800 px-5 py-4">
          <h2 className="text-white text-lg font-black tracking-wide uppercase">
            Today's Walk-List
          </h2>
          <p className="text-slate-400 text-xs font-bold mt-1 tracking-wide uppercase">
            {walklist.length} Total •{" "}
            <span className="text-emerald-400 font-extrabold">{paidToday.length} PAID</span>
            {" • "}
            <span className="text-rose-400 font-extrabold">{dueToday.length} DUE</span>
          </p>
        </div>

        {walklistLoading && (
          <div className="px-4 py-12 text-center text-slate-500 font-bold text-base">
            🔄 Loading walk list... Please wait.
          </div>
        )}

        {walklistError && (
          <div className="px-5 py-6 text-rose-600 font-bold text-center">
            <p>{walklistError}</p>
            <button
              onClick={loadWalklist}
              className="mt-3 bg-slate-900 text-white text-xs font-black px-4 py-2 rounded-lg uppercase"
            >
              Tap to Reload
            </button>
          </div>
        )}

        {!walklistLoading && !walklistError && walklist.length === 0 && (
          <div className="px-4 py-12 text-center text-slate-500">
            <p className="text-5xl mb-3">🎉</p>
            <p className="font-black text-xl text-slate-800">No collections remaining!</p>
            <p className="text-sm font-semibold text-slate-400 mt-1">All entries are updated.</p>
          </div>
        )}

        {!walklistLoading && walklist.length > 0 && (
          <div className="divide-y divide-slate-200/80">
            {walklist.map((customer) => {
              const isPaid = checkedIds.has(customer.id);
              const isOverdue = new Date(customer.expiryDate) < new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                new Date().getDate()
              );

              return (
                <div
                  key={customer.id}
                  className={`flex items-center gap-4 px-4 py-4 transition-colors relative
                    ${isPaid
                      ? "bg-emerald-50/60 border-l-[6px] border-emerald-500"
                      : isOverdue
                      ? "bg-rose-50/70 border-l-[6px] border-rose-500"
                      : "bg-amber-50/60 border-l-[6px] border-amber-500"
                    }`}
                >
                  {/* Heavy tactile checkbox container */}
                  <div className="flex items-center justify-center p-1">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={() => toggleChecked(customer.id)}
                      className="w-7 h-7 rounded-lg accent-emerald-600 cursor-pointer flex-shrink-0 border-2 border-slate-400"
                    />
                  </div>

                  {/* Customer row card — clear tap response */}
                  <button
                    onClick={() => handleWalklistRowTap(customer)}
                    className="flex-1 text-left touch-manipulation"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <p className={`font-black text-base tracking-wide leading-snug
                          ${isPaid ? "text-emerald-900 line-through decoration-emerald-500/50 decoration-2" : "text-slate-900"}`}>
                          {customer.customerId} — {customer.name}
                        </p>
                        <p className={`text-xs font-bold mt-1 tracking-wide uppercase
                          ${isPaid ? "text-emerald-700" : "text-slate-500"}`}>
                          {customer.packageName || "No Plan"} •{" "}
                          {isOverdue && !isPaid
                            ? `⚠️ Overdue: ${formatDate(customer.expiryDate)}`
                            : `Due: ${formatDate(customer.expiryDate)}`}
                        </p>
                      </div>

                      {/* Explicit clear billing states */}
                      <div className="text-right flex-shrink-0 ml-1">
                        {isPaid ? (
                          <span className="inline-block bg-emerald-600 text-white
                                           text-xs font-black px-2.5 py-1.5 rounded-lg tracking-wider">
                            PAID ✓
                          </span>
                        ) : (
                          <span className={`font-black text-lg tracking-tight
                            ${isOverdue ? "text-rose-600" : "text-amber-700"}`}>
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
