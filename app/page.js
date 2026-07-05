// app/page.jsx
// ---------------------------------------------------------------------
// COLLECTOR PAGE — Home route (/)
// Optimized for clear typography, huge mobile touch-targets, and responsive states.
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
  const [searchQuery, setSearchQuery] = useState("");

  // ----------------------------------------------------------------
  // Load walk-list and verification arrays on mount
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
      // non-critical fallback
    }
  }, []);

  useEffect(() => {
    loadWalklist();
    loadTodayPaid();
  }, [loadWalklist, loadTodayPaid]);

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
        setAmountPaid("");
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

  const handleWalklistRowTap = (customer) => {
    setCustomerId(customer.customerId);
    setFoundCustomer(customer);
    setAmountPaid("");
    setCustomerError("");
    setSubmitResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const dueTodayList = walklist.filter((c) => !checkedIds.has(c.id));
  const paidCount = walklist.filter((c) => checkedIds.has(c.id)).length;

  // Client-side real-time filter logic
  const filteredDueList = dueTodayList.filter((customer) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      customer.customerId?.toLowerCase().includes(query) ||
      customer.name?.toLowerCase().includes(query)
    );
  });

  // ------------------------------------------------------------
  // DYNAMIC MONETARY RECONCILIATION LAYER
  // ------------------------------------------------------------
  // Reads dynamic fields directly from the data profile schema model
  const cardPkgPrice = foundCustomer
    ? Number(foundCustomer.packagePrice ?? foundCustomer.customPrice ?? 0)
    : 0;

  const dbBalance = foundCustomer ? Number(foundCustomer.balanceDue || 0) : 0;

  // Reconstruct exact parameters seamlessly
  const isDbAlreadyCombined = cardPkgPrice > 0 && dbBalance > cardPkgPrice;
  const cardPrevMonthDue = isDbAlreadyCombined ? (dbBalance - cardPkgPrice) : dbBalance;
  const cardTotalCollectible = isDbAlreadyCombined ? dbBalance : (cardPkgPrice + dbBalance);

  return (
    <div className="space-y-6 pb-32 px-2 max-w-md mx-auto sm:px-4 pt-2">
      {/* ============================================================ */}
      {/* SECTION 1: PAYMENT FORM                                       */}
      {/* ============================================================ */}
      <section className="bg-white border-2 border-slate-200 rounded-3xl shadow-md overflow-hidden">
        <div className="bg-slate-900 px-5 py-4">
          <h2 className="text-white text-base font-black tracking-wide uppercase leading-none">
            Payment Collection Form
          </h2>
          <p className="text-white/70 text-[11px] font-bold mt-1.5 uppercase tracking-wider">
            Write collection payment details below and save payment to update
            the walk-list.
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Customer ID input + Search button */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
              Enter Customer ID{" "}
              <span className="text-rose-500 font-black">*</span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
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
                className="w-full border-2 border-slate-300 rounded-2xl px-4 py-4
                           text-lg font-black uppercase tracking-wider text-slate-800
                           focus:outline-none focus:border-indigo-600 bg-slate-50/80
                           placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                onClick={handleLookupCustomer}
                disabled={lookingUp || !customerId.trim()}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200
                           disabled:text-slate-400 text-white font-black py-4 px-6 rounded-2xl text-sm
                           tracking-wider uppercase transition-colors shrink-0 active:scale-[0.98]"
              >
                {lookingUp ? "Searching..." : "FIND CUSTOMER"}
              </button>
            </div>
            {customerError && (
              <p className="text-rose-770 font-black text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mt-2">
                {customerError}
              </p>
            )}
          </div>

          {/* Found customer details card */}
          {foundCustomer && (
            <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="font-black text-slate-900 text-xl leading-tight break-words">
                    {foundCustomer.name}
                  </p>
                  <span className="inline-block bg-slate-900 text-white text-xs font-black tracking-widest uppercase px-2.5 py-1 rounded-md font-mono">
                    ID: {foundCustomer.customerId}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-500 font-black tracking-wider uppercase">
                    Total Due
                  </p>
                  <p className="text-2xl font-black text-rose-600 leading-none mt-1">
                    {formatRupees(cardTotalCollectible)}
                  </p>
                </div>
              </div>

              {/* DYNAMIC VALUE RENDERING CONTAINER */}
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-1 text-xs font-black">
                <div className="flex justify-between text-slate-600">
                  <span>Current Month Price:</span>
                  <span className="text-slate-900">{formatRupees(cardPkgPrice)}</span>
                </div>
                {cardPrevMonthDue > 0 && (
                  <div className="flex justify-between text-rose-600 pt-1 border-t border-dashed border-slate-200">
                    <span>Previous Month Due:</span>
                    <span>+{formatRupees(cardPrevMonthDue)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-black text-slate-700 pt-1">
                <div className="bg-white px-2.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 min-w-0">
                  <span>📦</span>{" "}
                  <span className="truncate">
                    {foundCustomer.packageName || "No Plan"}
                  </span>
                </div>
                <div className="bg-white px-2.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5">
                  <span>📅</span>{" "}
                  <span>Exp: {formatDate(foundCustomer.expiryDate)}</span>
                </div>
              </div>

              {foundCustomer.address && (
                <p className="text-xs font-bold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200 leading-relaxed break-words">
                  📍 {foundCustomer.address}
                </p>
              )}
            </div>
          )}

          {/* Amount paid input */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
              Amount Received (₹){" "}
              <span className="text-rose-500 font-black">*</span>
            </label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full border-2 border-slate-300 rounded-2xl px-4 py-4
                         text-3xl font-black text-emerald-700 bg-slate-50
                         focus:outline-none focus:border-emerald-500 text-center
                         placeholder:text-slate-300"
              inputMode="decimal"
            />
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
              Collector Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid via cash, online payment, etc."
              className="w-full border-2 border-slate-300 rounded-2xl px-4 py-4
                         text-base font-bold text-slate-800 focus:outline-none focus:border-indigo-600
                         placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>

          {/* Submit result feedback */}
          {submitResult && (
            <div
              className={`rounded-2xl px-4 py-3 font-black text-center text-sm border-2 shadow-sm ${
                submitResult.success
                  ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                  : "bg-rose-50 text-rose-950 border-rose-300"
              }`}
            >
              {submitResult.message}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmitPayment}
            disabled={submitting || !foundCustomer}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100
                       disabled:text-slate-400 text-white text-lg font-black py-4.5 rounded-2xl
                       uppercase tracking-wider shadow-md active:scale-[0.98] transition-all"
          >
            {submitting ? "Saving Payment..." : "Save Payment"}
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: TODAY'S WALK-LIST                                 */}
      {/* ============================================================ */}
      <section className="bg-white border-2 border-slate-200 rounded-3xl shadow-md overflow-hidden">
        <div className="bg-slate-900 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-white text-base font-black tracking-wide uppercase">
              Today's Collection List
            </h2>
            <p className="text-white/70 text-[10px] font-black mt-1 tracking-wider uppercase">
              {dueTodayList.length} Remaining •{" "}
              <span className="text-emerald-400 font-black">
                {paidCount} PAID
              </span>
            </p>
          </div>

          {/* INSTANT SEARCH INPUT BAR */}
          <div className="w-full sm:w-48">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search name or ID..."
              className="w-full bg-white/10 text-white font-bold text-xs placeholder:text-white/40
                         border border-white/20 rounded-xl px-3 py-2 focus:outline-none
                         focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400
                         transition-all shadow-inner uppercase tracking-wider"
            />
          </div>
        </div>

        {walklistLoading && (
          <div className="px-4 py-12 text-center text-indigo-600 font-black text-base animate-pulse">
            Loading collection list...
          </div>
        )}

        {walklistError && (
          <div className="px-4 py-8 text-rose-700 font-black border-2 border-rose-100 rounded-xl m-4 bg-rose-50/50 text-center text-sm">
            <p>{walklistError}</p>
            <button
              onClick={loadWalklist}
              className="mt-3 bg-slate-900 text-white text-xs font-black px-4 py-2.5 rounded-xl uppercase tracking-wider"
            >
              Reload List
            </button>
          </div>
        )}

        {!walklistLoading && !walklistError && dueTodayList.length === 0 && (
          <div className="px-4 py-12 text-center text-slate-400">
            <p className="text-5xl mb-3 select-none">🎉</p>
            <p className="font-black text-lg text-slate-800">
              Route complete! All clear.
            </p>
          </div>
        )}

        {!walklistLoading && dueTodayList.length > 0 && (
          <div className="divide-y divide-slate-200/60">
            {filteredDueList.map((customer) => {
              const isOverdue =
                new Date(customer.expiryDate) <
                new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  new Date().getDate(),
                );

              // Pull the saved model data cleanly without overrides
              const pkgPrice = Number(customer.packagePrice ?? customer.customPrice ?? 0);
              const totalDue = Number(customer.balanceDue || 0);
              const listIsCombined = pkgPrice > 0 && totalDue > pkgPrice;
              const listPrevDue = listIsCombined ? (totalDue - pkgPrice) : totalDue;

              return (
                <button
                  key={customer.id}
                  onClick={() => {
                    handleWalklistRowTap(customer);
                    setSearchQuery("");
                  }}
                  className={`w-full text-left flex items-center justify-between gap-3 px-4 py-5 transition-all
                    active:bg-slate-100 select-none border-l-[6px]
                    ${isOverdue ? "bg-rose-50/20 border-rose-500" : "bg-white border-slate-300"}`}
                >
                  {/* Left Side Info Area */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-800 bg-slate-100 px-2.5 py-1 border border-slate-300 rounded-lg shrink-0 shadow-sm">
                        {customer.customerId}
                      </span>
                      <p className="font-black text-base tracking-wide text-slate-900 truncate">
                        {customer.name}
                      </p>
                    </div>

                    <p className="text-xs font-bold tracking-wide uppercase truncate text-slate-400 pl-0.5">
                      {customer.packageName || "No Plan"} •{" "}
                      {isOverdue
                        ? `⚠️ Overdue: ${formatDate(customer.expiryDate)}`
                        : `Due: ${formatDate(customer.expiryDate)}`}
                    </p>
                  </div>

                  {/* Right Side Balance Pricing Area */}
                  <div className="text-right shrink-0 ml-1 flex flex-col justify-center">
                    <span
                      className={`font-black text-base tracking-tight block
                      ${isOverdue ? "text-rose-600 text-lg" : "text-slate-700"}`}
                    >
                      {formatRupees(pkgPrice)}
                    </span>
                    {listPrevDue > 0 && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                        +{formatRupees(listPrevDue)} Due
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Empty view for mismatching search terms */}
            {filteredDueList.length === 0 && (
              <p className="px-4 py-12 text-center text-slate-400 font-bold text-sm">
                No matching collection houses found.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
