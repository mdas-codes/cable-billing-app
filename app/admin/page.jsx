// app/admin/page.jsx
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
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function SummaryCard({ label, value, color, icon }) {
  return (
    <div className={`rounded-2xl p-4 border-2 shadow-sm ${color} flex items-center gap-4 min-w-0`}>
      <div className="text-3xl select-none bg-white/80 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-200">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <p className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

function PaymentRow({ payment }) {
  const isFull = payment.paymentType === "FULL";
  return (
    <div className="p-4 border-b border-slate-200/60 hover:bg-slate-50/60 transition-colors">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900 text-base sm:text-lg break-words">
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-sm text-slate-700 mr-1.5 align-middle border border-slate-200">
              {payment.customerDisplayId}
            </span>
            <span className="align-middle">{payment.customerName}</span>
          </p>
          <p className="text-sm text-slate-600 font-bold mt-1">
            {payment.packageName} •{" "}
            <span className={`font-black ${isFull ? "text-emerald-700" : "text-amber-700"}`}>
              {isFull ? "Full Payment" : "Partial Payment"}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[10px] bg-slate-900 text-white font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
              {payment.recordedBy === "ADMIN" ? "👤 Admin" : "🚶 Collector"}
            </span>
            <span className="text-xs text-slate-500 font-bold">{formatDateTime(payment.paidAt)}</span>
          </div>
          {payment.note && (
            <p className="text-xs bg-amber-50 text-amber-950 font-bold border border-amber-200 px-3 py-2 rounded-xl mt-2 italic break-words">
              💬 "{payment.note}"
            </p>
          )}
        </div>
        <div className="text-left sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-slate-200 sm:border-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 mt-1 sm:mt-0">
          <p className="text-xl font-black text-emerald-700">{formatRupees(payment.amountPaid)}</p>
          {Number(payment.balanceAfterPayment) > 0 && (
            <p className="text-xs text-rose-600 font-black mt-0.5">Bal: {formatRupees(payment.balanceAfterPayment)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DueCustomerRow({ customer }) {
  const isOverdue = new Date(customer.expiryDate) < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  return (
    <div className="p-4 border-b border-slate-200/60 hover:bg-slate-50/60 transition-colors">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900 text-base sm:text-lg break-words">
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-sm text-slate-700 mr-1.5 align-middle border border-slate-200">
              {customer.customerId}
            </span>
            <span className="align-middle">{customer.name}</span>
          </p>
          {customer.address && <p className="text-xs text-slate-500 font-bold mt-1 break-words">📍 {customer.address}</p>}
          <p className="text-sm text-slate-600 font-bold mt-1.5">
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
        <div className="text-left sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-xl flex sm:flex-col items-center sm:items-end justify-between sm:justify-start mt-1 sm:mt-0">
          <span className="text-[10px] font-black uppercase text-slate-400 block sm:hidden tracking-wider">Balance Due</span>
          <p className="text-xl font-black text-rose-600">{formatRupees(customer.balanceDue)}</p>
        </div>
      </div>
    </div>
  );
}

function ToolHeader({ color, title, subtitle }) {
  return (
    <div className={`${color} border-b border-black/10 px-4 py-4`}>
      <h2 className="text-white font-black text-lg uppercase tracking-wide leading-none">{title}</h2>
      {subtitle && <p className="text-white/80 text-xs font-bold mt-1.5 tracking-wider uppercase">{subtitle}</p>}
    </div>
  );
}

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

  // Admin payment
  const [adminCustomerId, setAdminCustomerId] = useState("");
  const [adminFoundCustomer, setAdminFoundCustomer] = useState(null);
  const [adminAmountPaid, setAdminAmountPaid] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [adminLookingUp, setAdminLookingUp] = useState(false);
  const [adminCustomerError, setAdminCustomerError] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminSubmitResult, setAdminSubmitResult] = useState(null);

  // Edit customer
  const [editSearchId, setEditSearchId] = useState("");
  const [editCustomer, setEditCustomer] = useState(null);
  const [editSearching, setEditSearching] = useState(false);
  const [editSearchError, setEditSearchError] = useState("");
  const [editPackageId, setEditPackageId] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editResult, setEditResult] = useState(null);

  // Delete customer
  const [delSearchId, setDelSearchId] = useState("");
  const [delCustomer, setDelCustomer] = useState(null);
  const [delSearching, setDelSearching] = useState(false);
  const [delSearchError, setDelSearchError] = useState("");
  const [delConfirm, setDelConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delResult, setDelResult] = useState(null);

  // Add new customer
  const [newCust, setNewCust] = useState({ customerId: "", name: "", address: "", packageId: "", cycleStartDate: "" });
  const [addingCust, setAddingCust] = useState(false);
  const [addCustResult, setAddCustResult] = useState(null);

  // Packages
  const [newPkg, setNewPkg] = useState({ name: "", price: "", durationDays: "" });
  const [pkgResult, setPkgResult] = useState(null);
  const [savingPkg, setSavingPkg] = useState(false);
  const [deletingPkgId, setDeletingPkgId] = useState(null);
  const [pkgDeleteResult, setPkgDeleteResult] = useState(null);

  // Import / Export
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("adminPassword");
    if (saved) verifyPassword(saved, true);
  }, []);

  const verifyPassword = async (pwd, silent = false) => {
    if (!silent) setAuthChecking(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/summary?mode=today", { headers: { "x-admin-password": pwd } });
      if (res.ok) {
        sessionStorage.setItem("adminPassword", pwd);
        setAuthed(true);
        const data = await res.json();
        if (data.success) setTodayData(data);
      } else {
        setAuthError("❌ Incorrect password. Please try again.");
        sessionStorage.removeItem("adminPassword");
      }
    } catch { setAuthError("🌐 Network error. Please try again."); }
    finally { if (!silent) setAuthChecking(false); }
  };

  const getPassword = () => sessionStorage.getItem("adminPassword") ?? "";

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      const res = await fetch("/api/admin/summary?mode=today", { headers: { "x-admin-password": getPassword() } });
      const data = await res.json();
      if (data.success) setTodayData(data);
    } catch { } finally { setLoadingToday(false); }
  }, []);

  const loadMonthly = useCallback(async () => {
    if (monthlyData) return;
    setLoadingMonthly(true);
    try {
      const res = await fetch("/api/admin/summary?mode=monthly", { headers: { "x-admin-password": getPassword() } });
      const data = await res.json();
      if (data.success) setMonthlyData(data);
    } catch { } finally { setLoadingMonthly(false); }
  }, [monthlyData]);

  const loadPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/packages");
      const data = await res.json();
      if (data.success) setPackages(data.packages);
    } catch { }
  }, []);

  useEffect(() => { if (authed) loadPackages(); }, [authed, loadPackages]);
  useEffect(() => {
    if (authed && activeTab === "today") loadToday();
    if (authed && activeTab === "monthly") loadMonthly();
  }, [authed, activeTab, loadToday, loadMonthly]);

  const handleAdminLookup = async () => {
    if (!adminCustomerId.trim()) return;
    setAdminLookingUp(true); setAdminCustomerError(""); setAdminFoundCustomer(null); setAdminSubmitResult(null);
    try {
      const res = await fetch(`/api/customers?customerId=${encodeURIComponent(adminCustomerId.trim().toUpperCase())}`);
      const data = await res.json();
      if (data.success && data.customer) { setAdminFoundCustomer(data.customer); setAdminAmountPaid(Number(data.customer.balanceDue).toFixed(2)); }
      else setAdminCustomerError("❌ Customer not found.");
    } catch { setAdminCustomerError("🌐 Network error."); }
    finally { setAdminLookingUp(false); }
  };

  const handleAdminPayment = async () => {
    if (!adminFoundCustomer || !adminAmountPaid || Number(adminAmountPaid) <= 0) {
      setAdminSubmitResult({ success: false, message: "Enter a valid amount." }); return;
    }
    setAdminSubmitting(true); setAdminSubmitResult(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: adminFoundCustomer.customerId, amountPaid: Number(adminAmountPaid), recordedBy: "ADMIN", note: adminNote.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminSubmitResult({ success: true, message: data.message || "Payment saved!" });
        setAdminCustomerId(""); setAdminFoundCustomer(null); setAdminAmountPaid(""); setAdminNote("");
        setTodayData(null); loadToday();
      } else setAdminSubmitResult({ success: false, message: data.error });
    } catch { setAdminSubmitResult({ success: false, message: "Network error." }); }
    finally { setAdminSubmitting(false); }
  };

  const handleEditSearch = async () => {
    if (!editSearchId.trim()) return;
    setEditSearching(true); setEditSearchError(""); setEditCustomer(null); setEditResult(null);
    try {
      const res = await fetch(`/api/customers?customerId=${encodeURIComponent(editSearchId.trim().toUpperCase())}`);
      const data = await res.json();
      if (data.success && data.customer) {
        setEditCustomer(data.customer); setEditPackageId(data.customer.packageId);
        setEditExpiryDate(new Date(data.customer.expiryDate).toISOString().split("T")[0]);
        setEditAddress(data.customer.address || "");
      } else setEditSearchError("❌ Customer not found.");
    } catch { setEditSearchError("🌐 Network error."); }
    finally { setEditSearching(false); }
  };

  const handleEditSave = async () => {
    if (!editCustomer || !editPackageId || !editExpiryDate) return;
    setEditSaving(true); setEditResult(null);
    try {
      const res = await fetch("/api/customers/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
        body: JSON.stringify({ customerId: editCustomer.customerId, packageId: editPackageId, expiryDate: editExpiryDate, address: editAddress }),
      });
      const data = await res.json();
      if (data.success) { setEditResult({ success: true, message: "Customer updated successfully!" }); setEditCustomer(data.customer); }
      else setEditResult({ success: false, message: data.error || "Update failed." });
    } catch { setEditResult({ success: false, message: "Network error." }); }
    finally { setEditSaving(false); }
  };

  const handleDelSearch = async () => {
    if (!delSearchId.trim()) return;
    setDelSearching(true); setDelSearchError(""); setDelCustomer(null); setDelResult(null); setDelConfirm(false);
    try {
      const res = await fetch(`/api/customers?customerId=${encodeURIComponent(delSearchId.trim().toUpperCase())}`);
      const data = await res.json();
      if (data.success && data.customer) setDelCustomer(data.customer);
      else setDelSearchError("❌ Customer not found.");
    } catch { setDelSearchError("🌐 Network error."); }
    finally { setDelSearching(false); }
  };

  const handleDeleteCustomer = async () => {
    if (!delCustomer || !delConfirm) return;
    setDeleting(true); setDelResult(null);
    try {
      const res = await fetch("/api/customers/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
        body: JSON.stringify({ customerId: delCustomer.customerId }),
      });
      const data = await res.json();
      if (data.success) {
        setDelResult({ success: true, message: `Customer ${delCustomer.customerId} deleted.` });
        setDelCustomer(null); setDelSearchId(""); setDelConfirm(false);
      } else setDelResult({ success: false, message: data.error || "Delete failed." });
    } catch { setDelResult({ success: false, message: "Network error." }); }
    finally { setDeleting(false); }
  };

  const handleAddCustomer = async () => {
    if (!newCust.customerId || !newCust.name || !newCust.packageId) {
      setAddCustResult({ success: false, message: "Customer ID, Name and Package are required." }); return;
    }
    setAddingCust(true); setAddCustResult(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
        body: JSON.stringify({
          customerId: newCust.customerId.trim().toUpperCase(),
          name: newCust.name.trim(),
          address: newCust.address.trim() || null,
          packageId: newCust.packageId,
          cycleStartDate: newCust.cycleStartDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAddCustResult({ success: true, message: `Customer ${newCust.customerId.toUpperCase()} added successfully!` });
        setNewCust({ customerId: "", name: "", address: "", packageId: "", cycleStartDate: "" });
      } else setAddCustResult({ success: false, message: data.error });
    } catch { setAddCustResult({ success: false, message: "Network error." }); }
    finally { setAddingCust(false); }
  };

  const handleCreatePackage = async () => {
    if (!newPkg.name || !newPkg.price || !newPkg.durationDays) {
      setPkgResult({ success: false, message: "All fields are required." }); return;
    }
    setSavingPkg(true); setPkgResult(null);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
        body: JSON.stringify({ name: newPkg.name, price: Number(newPkg.price), durationDays: Number(newPkg.durationDays) }),
      });
      const data = await res.json();
      if (data.success) { setPkgResult({ success: true, message: `"${newPkg.name}" created!` }); setNewPkg({ name: "", price: "", durationDays: "" }); loadPackages(); }
      else setPkgResult({ success: false, message: data.error });
    } catch { setPkgResult({ success: false, message: "Network error." }); }
    finally { setSavingPkg(false); }
  };

  const handleDeletePackage = async (pkgId, pkgName) => {
    if (!window.confirm(`Delete package "${pkgName}"? This cannot be undone.`)) return;
    setDeletingPkgId(pkgId); setPkgDeleteResult(null);
    try {
      const res = await fetch(`/api/packages/${pkgId}`, {
        method: "DELETE",
        headers: { "x-admin-password": getPassword() },
      });
      const data = await res.json();
      if (data.success) { setPkgDeleteResult({ success: true, message: `"${pkgName}" deleted.` }); loadPackages(); }
      else setPkgDeleteResult({ success: false, message: data.error });
    } catch { setPkgDeleteResult({ success: false, message: "Network error." }); }
    finally { setDeletingPkgId(null); }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true); setImportResult(null);
    const formData = new FormData();
    formData.append("file", importFile);
    try {
      const res = await fetch("/api/customers/import", { method: "POST", headers: { "x-admin-password": getPassword() }, body: formData });
      setImportResult(await res.json());
    } catch { setImportResult({ success: false, error: "Network error." }); }
    finally { setImporting(false); setImportFile(null); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/customers/export", { headers: { "x-admin-password": getPassword() } });
      if (!res.ok) { alert("Export failed."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const match = (res.headers.get("Content-Disposition") ?? "").match(/filename="(.+)"/);
      a.download = match ? match[1] : "cable_tv_backup.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert("Export failed."); }
    finally { setExporting(false); }
  };

  const handleLogout = () => { sessionStorage.removeItem("adminPassword"); setAuthed(false); setPassword(""); setTodayData(null); setMonthlyData(null); };

  const inputCls = "w-full border-2 border-slate-300 rounded-xl px-3 py-3.5 text-lg font-bold text-slate-800 focus:outline-none focus:border-violet-500 bg-slate-50/50 placeholder:font-normal placeholder:text-slate-400";

  if (!authed) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-2 py-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-6 text-center">
              <div className="text-5xl mb-3 select-none">🔒</div>
              <h1 className="text-slate-800 text-xl font-black tracking-wide uppercase leading-none">Admin Area</h1>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wider">Unlocks high-level dashboard</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Enter Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verifyPassword(password.trim())} placeholder="••••••••" className={inputCls + " tracking-widest"} autoComplete="current-password" />
              </div>
              {authError && <p className="text-rose-600 bg-rose-50 border border-rose-200 font-bold text-sm px-3 py-2 rounded-xl text-center">{authError}</p>}
              <button onClick={() => verifyPassword(password.trim())} disabled={authChecking} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-base font-black py-4 rounded-xl uppercase tracking-wider transition-colors touch-manipulation shadow-md active:scale-[0.99]">
                {authChecking ? "Checking..." : "Unlock System ✨"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 px-2 max-w-2xl mx-auto sm:px-4 pt-2">

      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-4 bg-white border border-slate-200/80 px-4 py-3 rounded-2xl shadow-md">
        <h1 className="text-base font-black text-slate-800 tracking-wide uppercase leading-none">Admin Section</h1>
        <button onClick={handleLogout} className="text-xs text-rose-600 font-black border-2 border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl transition-colors touch-manipulation uppercase">
          logout
        </button>
      </div>

      {/* Primary Category Switcher Tabs */}
      <div className="flex bg-slate-900 rounded-2xl p-1.5 gap-1.5 border border-slate-950 shadow-md">
        {[{ key: "today", label: "📅 Today" }, { key: "monthly", label: "📊 Monthly" }, { key: "tools", label: "🛠️ Tools" }].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3.5 rounded-xl text-xs sm:text-sm font-black transition-all touch-manipulation uppercase active:scale-[0.98] ${activeTab === tab.key ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TODAY TAB                                                     */}
      {/* ============================================================ */}
      {activeTab === "today" && (
        <div className="space-y-6">
          {loadingToday && <div className="text-center text-slate-500 py-12 font-bold text-base animate-pulse">🔄 Loading metrics list...</div>}
          {todayData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SummaryCard label="Paid Today" value={formatRupees(todayData.summary.totalPaid)} color="bg-emerald-50/70 border-emerald-300" icon="💰" />
                <SummaryCard label="Due Today" value={formatRupees(todayData.summary.totalDue)} color="bg-rose-50/70 border-rose-300" icon="⏳" />
                <SummaryCard label="Collected Logs" value={`${todayData.summary.paidCount} Rows`} color="bg-sky-50/70 border-sky-300" icon="✅" />
                <SummaryCard label="Pending Houses" value={`${todayData.summary.dueCount} Houses`} color="bg-amber-50/70 border-amber-300" icon="🔔" />
              </div>
              <button onClick={loadToday} className="w-full py-4 border-2 border-slate-300 bg-white text-slate-800 font-black rounded-xl hover:bg-slate-50 shadow-md text-sm uppercase tracking-wider active:scale-[0.99] touch-manipulation transition-colors">🔄 Sync Live Records</button>

              {/* Admin Bill Collection Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-4">
                  <h2 className="text-slate-800 text-lg font-black tracking-wide uppercase leading-none">Quick Record Payment</h2>
                </div>
                <div className="p-4 space-y-5">
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Customer ID <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-8 sm:col-span-9">
                        <input type="text" value={adminCustomerId}
                          onChange={(e) => { setAdminCustomerId(e.target.value.toUpperCase()); setAdminFoundCustomer(null); setAdminCustomerError(""); setAdminSubmitResult(null); }}
                          onKeyDown={(e) => e.key === "Enter" && handleAdminLookup()}
                          placeholder="E.G. C001" className={inputCls + " uppercase tracking-wider"} />
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <button onClick={handleAdminLookup} disabled={adminLookingUp || !adminCustomerId.trim()}
                          className="w-full h-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-xs sm:text-sm tracking-wider uppercase transition-colors touch-manipulation flex items-center justify-center">
                          {adminLookingUp ? "..." : "FIND"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {adminCustomerError && <p className="text-rose-600 font-bold text-sm bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">{adminCustomerError}</p>}

                  {adminFoundCustomer && (
                    <div className="bg-violet-50/60 border-2 border-violet-200 rounded-xl p-4 space-y-3">
                      <p className="font-black text-slate-900 text-xl leading-tight">{adminFoundCustomer.name}</p>
                      {adminFoundCustomer.address && <p className="text-xs font-bold text-slate-600">📍 {adminFoundCustomer.address}</p>}
                      <div className="text-xs font-bold text-slate-500 pt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>ID: <span className="text-slate-900 font-mono font-black">{adminFoundCustomer.customerId}</span></span>
                        <span>Outstanding: <span className="font-black text-rose-600 text-sm">{formatRupees(adminFoundCustomer.balanceDue)}</span></span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Amount Received (₹) <span className="text-rose-500">*</span></label>
                    <input type="number" value={adminAmountPaid} onChange={(e) => setAdminAmountPaid(e.target.value)} placeholder="0.00"
                      className="w-full border-2 border-slate-300 rounded-xl px-4 py-3.5 text-3xl font-black text-emerald-700 bg-slate-50/50 focus:outline-none focus:border-emerald-500 placeholder:text-slate-300 shadow-sm" inputMode="decimal" />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Remarks / Note</label>
                    <input type="text" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Optional cash details..." className={inputCls} />
                  </div>

                  {adminSubmitResult && (
                    <div className={`rounded-xl px-4 py-3.5 font-bold border-2 ${adminSubmitResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-rose-50 text-rose-900 border-rose-300"}`}>
                      {adminSubmitResult.success ? "✅ SUCCESS: " : "❌ ERROR: "}{adminSubmitResult.message}
                    </div>
                  )}

                  <button onClick={handleAdminPayment} disabled={adminSubmitting || !adminFoundCustomer}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-lg font-black py-4 rounded-xl shadow-md transition-colors active:scale-[0.99] uppercase tracking-wider touch-manipulation">
                    {adminSubmitting ? "Saving Payment..." : "Confirm & Save (✓)"}
                  </button>
                </div>
              </div>

              {/* Transaction Logs */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="font-black text-base text-slate-800 uppercase tracking-wide">Collected Logs Today ({todayData.payments.length})</h2>
                </div>
                {todayData.payments.length === 0
                  ? <p className="px-4 py-12 text-center text-slate-400 font-bold">No transactions logged today.</p>
                  : <div className="divide-y divide-slate-200/60">{todayData.payments.map((p) => <PaymentRow key={p.id} payment={p} />)}</div>}
              </div>

              {/* Pending Walklist */}
              {todayData.walklist?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                  <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-black text-base text-slate-800 uppercase tracking-wide">Unpaid Houses Remaining ({todayData.summary.dueCount})</h2>
                  </div>
                  <div className="divide-y divide-slate-200/60">
                    {todayData.walklist.filter((c) => !todayData.paidCustomerIds?.includes(c.id)).map((c) => <DueCustomerRow key={c.id} customer={c} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MONTHLY TAB                                                   */}
      {/* ============================================================ */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          {loadingMonthly && <div className="text-center text-slate-500 py-12 font-bold text-base animate-pulse">🔄 Analyzing monthly logs...</div>}
          {monthlyData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SummaryCard label="Paid This Month" value={formatRupees(monthlyData.summary.totalPaid)} color="bg-emerald-50/70 border-emerald-300" icon="💰" />
                <SummaryCard label="Total Outstanding" value={formatRupees(monthlyData.summary.totalDue)} color="bg-rose-50/70 border-rose-300" icon="⏳" />
                <SummaryCard label="Paid Users" value={`${monthlyData.summary.paidCount} Houses`} color="bg-sky-50/70 border-sky-300" icon="✅" />
                <SummaryCard label="Unpaid Balance" value={`${monthlyData.summary.dueCount} Users`} color="bg-amber-50/70 border-amber-300" icon="🔔" />
              </div>
              <button onClick={() => { setMonthlyData(null); loadMonthly(); }} className="w-full py-4 border-2 border-slate-300 bg-white text-slate-800 font-black rounded-xl hover:bg-slate-50 shadow-md text-sm uppercase tracking-wider active:scale-[0.99] touch-manipulation transition-colors">🔄 Re-Calculate Ledger</button>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="font-black text-base text-slate-800 uppercase tracking-wide">Monthly Ledger Rows ({monthlyData.payments.length})</h2>
                </div>
                {monthlyData.payments.length === 0
                  ? <p className="px-4 py-12 text-center text-slate-400 font-bold">No entries registered this month.</p>
                  : <div className="divide-y divide-slate-200/60">{monthlyData.payments.map((p) => <PaymentRow key={p.id} payment={p} />)}</div>}
              </div>

              {monthlyData.dueCustomers?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                  <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-black text-base text-slate-800 uppercase tracking-wide">Defaulters / Pending List ({monthlyData.dueCustomers.length})</h2>
                  </div>
                  <div className="divide-y divide-slate-200/60">{monthlyData.dueCustomers.map((c) => <DueCustomerRow key={c.id} customer={c} />)}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TOOLS TAB                                                     */}
      {/* ============================================================ */}
      {activeTab === "tools" && (
        <div className="space-y-6">

          {/* EDIT CUSTOMER */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <ToolHeader color="bg-violet-700" title="✏️ Edit Customer Profile" subtitle="Modify plan settings or parameters" />
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Find Target ID</label>
                <div className="flex gap-2">
                  <input type="text" value={editSearchId}
                    onChange={(e) => { setEditSearchId(e.target.value.toUpperCase()); setEditSearchError(""); setEditResult(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleEditSearch()}
                    placeholder="E.G. C001" className={inputCls + " uppercase tracking-wider flex-1 min-w-0"} />
                  <button onClick={handleEditSearch} disabled={editSearching || !editSearchId.trim()}
                    className="bg-violet-700 hover:bg-violet-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black px-6 rounded-xl text-sm uppercase transition-colors shrink-0 touch-manipulation flex items-center justify-center">
                    {editSearching ? "..." : "FIND"}
                  </button>
                </div>
              </div>
              {editSearchError && <p className="text-rose-600 font-bold text-sm bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">{editSearchError}</p>}

              {editCustomer && (
                <div className="space-y-4 border-t border-slate-200/60 pt-4">
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3">
                    <p className="font-black text-slate-900">{editCustomer.customerId} — {editCustomer.name}</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">Plan: {editCustomer.package?.name} • Balance: <span className="text-rose-600 font-black">{formatRupees(editCustomer.balanceDue)}</span></p>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Change Subscription Package</label>
                    <select value={editPackageId} onChange={(e) => setEditPackageId(e.target.value)} className={inputCls}>
                      <option value="">— Select Plan Option —</option>
                      {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} — ₹{pkg.price} / {pkg.durationDays} Days</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Adjust Expiry / Due Date</label>
                    <input type="date" value={editExpiryDate} onChange={(e) => setEditExpiryDate(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Update Address</label>
                    <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Street or Area address..." className={inputCls} />
                  </div>
                  {editResult && (
                    <div className={`rounded-xl px-4 py-3 font-bold text-sm border-2 ${editResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-rose-50 text-rose-900 border-rose-300"}`}>
                      {editResult.success ? "✅ SUCCESS: " : "❌ ERROR: "}{editResult.message}
                    </div>
                  )}
                  <button onClick={handleEditSave} disabled={editSaving || !editPackageId || !editExpiryDate}
                    className="w-full bg-violet-700 hover:bg-violet-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-base font-black py-4 rounded-xl shadow-md uppercase tracking-wider transition-colors touch-manipulation">
                    {editSaving ? "Saving..." : "💾 Save Profile Modifications"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DELETE CUSTOMER */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <ToolHeader color="bg-rose-700" title="🗑️ Delete Customer Account" subtitle="Irreversibly wipe user from data logs" />
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Search Deletion ID</label>
                <div className="flex gap-2">
                  <input type="text" value={delSearchId}
                    onChange={(e) => { setDelSearchId(e.target.value.toUpperCase()); setDelSearchError(""); setDelResult(null); setDelConfirm(false); setDelCustomer(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleDelSearch()}
                    placeholder="E.G. C001" className={inputCls + " uppercase tracking-wider flex-1 min-w-0"} />
                  <button onClick={handleDelSearch} disabled={delSearching || !delSearchId.trim()}
                    className="bg-rose-700 hover:bg-rose-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black px-6 rounded-xl text-sm uppercase transition-colors shrink-0 touch-manipulation flex items-center justify-center">
                    {delSearching ? "..." : "FIND"}
                  </button>
                </div>
              </div>
              {delSearchError && <p className="text-rose-600 font-bold text-sm bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">{delSearchError}</p>}

              {delCustomer && (
                <div className="space-y-4 border-t border-slate-200/60 pt-4">
                  <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4">
                    <p className="font-black text-rose-950 text-base">{delCustomer.customerId} — {delCustomer.name}</p>
                    {delCustomer.address && <p className="text-xs text-rose-600 font-bold mt-0.5">📍 {delCustomer.address}</p>}
                    <p className="text-sm text-rose-800 font-black mt-1">{delCustomer.package?.name} • Balance: {formatRupees(delCustomer.balanceDue)}</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer bg-amber-50 border border-amber-300 rounded-xl p-4 select-none">
                    <input type="checkbox" checked={delConfirm} onChange={(e) => setDelConfirm(e.target.checked)} className="w-7 h-7 mt-0.5 accent-rose-700 shrink-0 border-2 border-slate-400 rounded-lg" />
                    <span className="text-sm font-black text-amber-950 leading-snug">
                      Confirm permanent termination. All transaction ledger row history attached to {delCustomer.customerId} will be dropped.
                    </span>
                  </label>
                  {delResult && (
                    <div className={`rounded-xl px-4 py-3 font-bold text-sm border-2 ${delResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-rose-50 text-rose-900 border-rose-300"}`}>
                      {delResult.success ? "✅ SUCCESS: " : "❌ ERROR: "}{delResult.message}
                    </div>
                  )}
                  <button onClick={handleDeleteCustomer} disabled={deleting || !delConfirm}
                    className="w-full bg-rose-700 hover:bg-rose-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-base font-black py-4 rounded-xl shadow-md uppercase tracking-wider transition-colors touch-manipulation">
                    {deleting ? "Dropping..." : "🗑️ Confirm Irreversible Deletion"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ADD NEW CUSTOMER */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <ToolHeader color="bg-emerald-700" title="➕ Add Individual Profile" subtitle="Register a new hardware pipeline user" />
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Assigned Customer ID <span className="text-rose-500">*</span></label>
                <input type="text" value={newCust.customerId} onChange={(e) => setNewCust({ ...newCust, customerId: e.target.value.toUpperCase() })} placeholder="E.G. C001" className={inputCls + " uppercase tracking-wider"} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Subscriber Full Name <span className="text-rose-500">*</span></label>
                <input type="text" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} placeholder="E.G. Ramesh Kumar" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Assigned Service Pack <span className="text-rose-500">*</span></label>
                <select value={newCust.packageId} onChange={(e) => setNewCust({ ...newCust, packageId: e.target.value })} className={inputCls}>
                  <option value="">— Select Plan Option —</option>
                  {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} — ₹{pkg.price} / {pkg.durationDays} Days</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Installation Address</label>
                <input type="text" value={newCust.address} onChange={(e) => setNewCust({ ...newCust, address: e.target.value })} placeholder="e.g. Sector-4, House 12" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Cycle Activation Date (Leave empty for today)</label>
                <input type="date" value={newCust.cycleStartDate} onChange={(e) => setNewCust({ ...newCust, cycleStartDate: e.target.value })} className={inputCls} />
              </div>
              {addCustResult && (
                <div className={`rounded-xl px-4 py-3 font-bold text-sm border-2 ${addCustResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-rose-50 text-rose-900 border-rose-300"}`}>
                  {addCustResult.success ? "✅ SUCCESS: " : "❌ ERROR: "}{addCustResult.message}
                </div>
              )}
              <button onClick={handleAddCustomer} disabled={addingCust}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-base font-black py-4 rounded-xl shadow-md uppercase tracking-wider transition-colors touch-manipulation">
                {addingCust ? "Creating profile..." : "➕ Initialize Profile"}
              </button>
            </div>
          </div>

          {/* SERVICE PLANS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <ToolHeader color="bg-slate-900" title="📦 Subscription Configuration" subtitle="Create or delete service cycle parameters" />
            <div className="p-4 space-y-4">
              {packages.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 tracking-wider uppercase">Active Active Packages</label>
                  {pkgDeleteResult && (
                    <div className={`rounded-xl px-3 py-2 text-sm font-bold border-2 ${pkgDeleteResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-rose-50 text-rose-900 border-rose-300"}`}>
                      {pkgDeleteResult.success ? "✅ " : "❌ "}{pkgDeleteResult.message}
                    </div>
                  )}
                  <div className="space-y-2 max-h-72 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/40">
                    {packages.map((pkg) => (
                      <div key={pkg.id} className="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-slate-900 text-base truncate">{pkg.name}</p>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">Cycle: {pkg.durationDays} Days</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="font-black text-violet-700 text-base">{formatRupees(pkg.price)}</p>
                          <button onClick={() => handleDeletePackage(pkg.id, pkg.name)} disabled={deletingPkgId === pkg.id}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-sm p-2.5 rounded-xl border-2 border-rose-200 transition-colors">
                            {deletingPkgId === pkg.id ? "..." : "🗑️"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <p className="text-sm font-black text-slate-800 uppercase tracking-wide">➕ Configure Custom Pack</p>
                <input type="text" value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} placeholder="Plan Designation (e.g. HD Pack)" className={inputCls} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={newPkg.price} onChange={(e) => setNewPkg({ ...newPkg, price: e.target.value })} placeholder="Rate (₹)" className={inputCls} inputMode="decimal" />
                  <input type="number" value={newPkg.durationDays} onChange={(e) => setNewPkg({ ...newPkg, durationDays: e.target.value })} placeholder="Span Days" className={inputCls} inputMode="numeric" />
                </div>
                {pkgResult && (
                  <div className={`rounded-xl px-3 py-2.5 text-sm font-bold border-2 text-center ${pkgResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-rose-50 text-rose-900 border-rose-300"}`}>
                    {pkgResult.success ? "✅ " : "❌ "}{pkgResult.message}
                  </div>
                )}
                <button onClick={handleCreatePackage} disabled={savingPkg}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-black py-3.5 rounded-xl shadow-md uppercase tracking-wider transition-colors touch-manipulation">
                  {savingPkg ? "Deploying..." : "+ Deploy Pack Setting"}
                </button>
              </div>
            </div>
          </div>

          {/* BACKUP EXPORT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <ToolHeader color="bg-teal-800" title="📥 Package Backup Extraction" subtitle="Compile full localized schema down to flat storage" />
            <div className="p-4">
              <p className="text-slate-600 text-sm font-bold mb-4 leading-relaxed">
                Compiles historical transactions, parameters, outstandings, and customer tags directly into local `.csv` sheet matrix format.
              </p>
              <button onClick={handleExport} disabled={exporting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-base font-black py-4 rounded-xl shadow-md uppercase tracking-wider transition-colors touch-manipulation">
                {exporting ? "Compiling storage matrix..." : "⬇️ Download Storage Ledger Backup"}
              </button>
            </div>
          </div>

          {/* DATA IMPORT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <ToolHeader color="bg-sky-700" title="📤 Batch Data Insertion" subtitle="Inject unified sheet arrays straight into live tables" />
            <div className="p-4 space-y-4">
              <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-4 text-sm text-sky-950 font-bold">
                <p className="font-black text-sky-900 mb-1 uppercase tracking-wider text-xs">Required CSV Fields:</p>
                <div className="font-mono text-xs bg-white border border-sky-200 p-2.5 rounded-xl text-center font-black tracking-wide mt-1.5 select-all overflow-x-auto whitespace-nowrap">
                  customerid, name, package, address, startdate
                </div>
              </div>
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-4 rounded-xl flex items-center justify-center">
                <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setImportFile(e.target.files[0] ?? null)}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-slate-950 file:text-white file:font-black file:text-xs hover:file:bg-slate-800 cursor-pointer" />
              </div>
              <button onClick={handleImport} disabled={importing || !importFile}
                className="w-full bg-sky-700 hover:bg-sky-800 text-white text-sm font-black py-3.5 rounded-xl shadow-md uppercase tracking-wider transition-colors touch-manipulation">
                {importing ? "Processing array records..." : "📤 Process Bulk Database Injection"}
              </button>
              {importResult && (
                <div className={`rounded-xl p-4 text-sm font-bold border-2 ${importResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                  <p className="text-base font-black">{importResult.message || importResult.error}</p>
                  {importResult.results && (
                    <div className="mt-3 space-y-1.5 text-sm">
                      <p>🟢 Configured: <span className="font-black text-slate-900">{importResult.results.created.length}</span></p>
                      <p>放置 Skipped: <span className="font-black text-slate-900">{importResult.results.skipped.length}</span></p>
                      <p>🔴 Aborted: <span className="font-black text-rose-700">{importResult.results.failed.length}</span></p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
