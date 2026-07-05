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
    <div className={`rounded-2xl p-5 border-2 shadow-sm ${color} flex items-center gap-4 min-w-0`}>
      <div className="text-3xl select-none bg-white w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-slate-200">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 truncate mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

function PaymentRow({ payment, onDelete, isDeleting }) {
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
        <div className="text-left sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-slate-200 sm:border-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 mt-1 sm:mt-0 w-full sm:w-auto">
          <div>
            <p className="text-xl font-black text-emerald-700">{formatRupees(payment.amountPaid)}</p>
            {Number(payment.balanceAfterPayment) > 0 && (
              <p className="text-xs text-rose-600 font-black mt-0.5">Bal: {formatRupees(payment.balanceAfterPayment)}</p>
            )}
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(payment.id)}
              disabled={isDeleting}
              className="text-xs text-rose-700 font-black bg-rose-50 hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-400 px-3 py-1.5 rounded-xl border-2 border-rose-200 transition-all active:scale-[0.95] mt-1 sm:mt-3"
            >
              {isDeleting ? "..." : "🗑️ Delete"}
            </button>
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

function ToolHeader({ title, subtitle, bgColor = "bg-slate-900" }) {
  return (
    <div className={`${bgColor} px-5 py-4`}>
      <h2 className="text-white text-lg font-black tracking-wide uppercase flex items-center gap-2">{title}</h2>
      {subtitle && <p className="text-white/70 text-xs font-bold mt-1 tracking-wider uppercase">{subtitle}</p>}
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

  // Delete payment
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  // Edit customer
  const [editSearchId, setEditSearchId] = useState("");
  const [editCustomer, setEditCustomer] = useState(null);
  const [editSearching, setEditSearching] = useState(false);
  const [editSearchError, setEditSearchError] = useState("");
  const [editPackageId, setEditPackageId] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editBalanceDue, setEditBalanceDue] = useState("");
  const [editCustomPrice, setEditCustomPrice] = useState("");
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
  const [newCust, setNewCust] = useState({ customerId: "", name: "", address: "", packageId: "", cycleStartDate: "", customExpiryDate: "", customPrice: "" });
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

  // Missed / Backdated Payment Tool States
  const [missedCustomerId, setMissedCustomerId] = useState("");
  const [missedFoundCustomer, setMissedFoundCustomer] = useState(null);
  const [missedAmount, setMissedAmount] = useState("");
  const [missedDate, setMissedDate] = useState("");
  const [missedNote, setMissedNote] = useState("");
  const [missedLookingUp, setMissedLookingUp] = useState(false);
  const [missedLookupError, setMissedLookupError] = useState("");
  const [missedSubmitting, setMissedSubmitting] = useState(false);
  const [missedSubmitResult, setMissedSubmitResult] = useState(null);

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

  const loadMonthly = useCallback(async (force = false) => {
    if (monthlyData && !force) return;
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

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm("🗑️ Are you sure you want to permanently delete this payment record? This will alter balances accordingly.")) return;
    setDeletingPaymentId(paymentId);
    try {
      const res = await fetch(`/api/payments?id=${paymentId}`, {
        method: "DELETE",
        headers: { "x-admin-password": getPassword() }
      });
      const data = await res.json();
      if (data.success) {
        setTodayData(null);
        loadToday();
        loadMonthly(true);
      } else {
        alert(data.error || "Failed to remove payment log.");
      }
    } catch {
      alert("🌐 Network error. Action unverified.");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleMissedLookup = async () => {
    if (!missedCustomerId.trim()) return;
    setMissedLookingUp(true); setMissedLookupError(""); setMissedFoundCustomer(null); setMissedSubmitResult(null);
    try {
      const res = await fetch(`/api/customers?customerId=${encodeURIComponent(missedCustomerId.trim().toUpperCase())}`);
      const data = await res.json();
      if (data.success && data.customer) {
        setMissedFoundCustomer(data.customer);
        setMissedAmount(Number(data.customer.balanceDue).toFixed(2));
      }
      else setMissedLookupError("❌ Customer not found.");
    } catch { setMissedLookupError("🌐 Network error."); }
    finally { setMissedLookingUp(false); }
  };

  const handleSaveMissedPayment = async () => {
    if (!missedFoundCustomer || !missedAmount || Number(missedAmount) <= 0 || !missedDate) {
      setMissedSubmitResult({ success: false, message: "Please choose a valid amount and entry date." });
      return;
    }
    setMissedSubmitting(true); setMissedSubmitResult(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: missedFoundCustomer.customerId,
          amountPaid: Number(missedAmount),
          recordedBy: "ADMIN",
          note: missedNote.trim() ? `[Backdated] ${missedNote.trim()}` : "[Backdated missed entry]",
          customDate: missedDate // Sent to API override block
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMissedSubmitResult({ success: true, message: "✓ Backdated cash record injected successfully!" });
        setMissedCustomerId(""); setMissedFoundCustomer(null); setMissedAmount(""); setMissedDate(""); setMissedNote("");
        setTodayData(null); setMonthlyData(null); // Clears state cache so lists pull freshly
      } else {
        setMissedSubmitResult({ success: false, message: data.error });
      }
    } catch { setMissedSubmitResult({ success: false, message: "Network structural failure." }); }
    finally { setMissedSubmitting(false); }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning, Raju ☀️";
    if (hr < 17) return "Good afternoon, Raju 🌤️";
    if (hr < 21) return "Good evening, Raju 🌙";
    return "Good night, Raju 💤";
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
        setEditBalanceDue(Number(data.customer.balanceDue).toString());
        setEditCustomPrice(data.customer.customPrice ? Number(data.customer.customPrice).toString() : "");
      } else setEditSearchError("❌ Customer not found.");
    } catch { setEditSearchError("🌐 Network error."); }
    finally { setEditSearching(false); }
  };

  const handleEditSave = async () => {
    if (!editCustomer || !editPackageId) return;
    setEditSaving(true); setEditResult(null);
    try {
      const selectedEditPkg = packages.find(p => p.id === editPackageId);
      const isOtherEdit = selectedEditPkg?.name?.toUpperCase() === "OTHER";

      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
        body: JSON.stringify({
          id: editCustomer.id,
          packageId: editPackageId,
          customExpiryDate: editExpiryDate || undefined,
          address: editAddress,
          manualBalanceAdjust: editBalanceDue !== "" ? Number(editBalanceDue) : undefined,
          customPrice: isOtherEdit && editCustomPrice ? Number(editCustomPrice) : undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditResult({ success: true, message: "✏️ Customer changes saved perfectly!" });
        setEditCustomer(data.customer);
        setTodayData(null);
      }
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
    const deletedId = delCustomer.customerId;
    try {
      const res = await fetch(`/api/customers?id=${encodeURIComponent(delCustomer.id)}`, {
        method: "DELETE",
        headers: { "x-admin-password": getPassword() }
      });
      const data = await res.json();
      if (data.success) {
        setDelResult({ success: true, message: `🗑️ Customer "${deletedId}" has been completely deleted.` });
        setDelCustomer(null); setDelSearchId(""); setDelConfirm(false);
        setTodayData(null);
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
      const selectedNewPkg = packages.find(p => p.id === newCust.packageId);
      const isOther = selectedNewPkg?.name?.toUpperCase() === "OTHER";

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
        body: JSON.stringify({
          customerId: newCust.customerId.trim().toUpperCase(),
          name: newCust.name.trim(),
          address: newCust.address.trim() || null,
          packageId: newCust.packageId,
          cycleStartDate: newCust.cycleStartDate || undefined,
          customExpiryDate: newCust.customExpiryDate || undefined,
          customPrice: isOther && newCust.customPrice ? Number(newCust.customPrice) : undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAddCustResult({ success: true, message: `➕ Customer ${newCust.customerId.toUpperCase()} initialized safely.` });
        setNewCust({ customerId: "", name: "", address: "", packageId: "", cycleStartDate: "", customExpiryDate: "", customPrice: "" });
        setTodayData(null);
      } else setAddCustResult({ success: false, message: data.error });
    } catch { setAddCustResult({ success: false, message: "Network error." }); }
    finally { setAddingCust(false); }
  };

  const handleCreatePackage = async () => {
    if (!newPkg.name) {
      setPkgResult({ success: false, message: "Package name is required." }); return;
    }
    setSavingPkg(true); setPkgResult(null);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
        body: JSON.stringify({ name: newPkg.name, price: Number(newPkg.price || 0), durationDays: Number(newPkg.durationDays || 30) }),
      });
      const data = await res.json();
      if (data.success) { setPkgResult({ success: true, message: `Pack "${newPkg.name}" deployed!` }); setNewPkg({ name: "", price: "", durationDays: "" }); loadPackages(); }
      else setPkgResult({ success: false, message: data.error });
    } catch { setPkgResult({ success: false, message: "Network error." }); }
    finally { setSavingPkg(false); }
  };

  const handleDeletePackage = async (pkgId, pkgName) => {
    if (!window.confirm(`Archive package "${pkgName}"? This will safely remove it from selection models.`)) return;
    setDeletingPkgId(pkgId); setPkgDeleteResult(null);
    try {
      const res = await fetch(`/api/packages?id=${pkgId}`, {
        method: "DELETE",
        headers: { "x-admin-password": getPassword() },
      });
      const data = await res.json();
      if (data.success) { setPkgDeleteResult({ success: true, message: `"${pkgName}" isolated into archives.` }); loadPackages(); }
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
      setTodayData(null);
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

  const inputCls = "w-full border-2 border-slate-300 rounded-2xl px-4 py-4 text-lg font-black text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/80 placeholder:font-normal placeholder:text-slate-400/80 transition-all shadow-sm";

  const selectedNewPkg = packages.find(p => p.id === newCust.packageId);
  const showCustomPriceField = selectedNewPkg?.name?.toUpperCase() === "OTHER";

  const selectedEditPkg = packages.find(p => p.id === editPackageId);
  const showEditCustomPriceField = selectedEditPkg?.name?.toUpperCase() === "OTHER";

  if (!authed) {
    return (
      <div className="min-h-[90vh] flex items-center justify-center px-3 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-8 text-center">
              <div className="text-6xl mb-4 select-none">🔒</div>
              <h1 className="text-white text-xl font-black tracking-wide uppercase">Cable Admin Portal</h1>
              <p className="text-slate-400 text-xs font-bold mt-2 tracking-wider uppercase">Secure Management Pipeline</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">System Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verifyPassword(password.trim())} placeholder="••••••••" className={inputCls + " tracking-widest text-center text-2xl"} autoComplete="current-password" />
              </div>
              {authError && <p className="text-rose-700 font-black text-sm bg-rose-50 border-2 border-rose-200 px-4 py-3 rounded-2xl text-center">{authError}</p>}
              <button onClick={() => verifyPassword(password.trim())} disabled={authChecking} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black py-4.5 rounded-2xl uppercase tracking-wider transition-all shadow-md active:scale-[0.98]">
                {authChecking ? "Verifying..." : "Unlock Dashboard 🔓"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 px-3 max-w-2xl mx-auto pt-4 sm:px-4">
      <div className="flex items-center justify-between gap-4 bg-white border-2 border-slate-200 px-5 py-4 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 font-bold text-xs mt-1">
            {getGreeting()}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-rose-700 font-black border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-50 px-4 py-3 rounded-xl transition-all uppercase tracking-wider"
        >
          Logout
        </button>
      </div>

      <div className="flex bg-slate-900 rounded-2xl p-2 gap-1 border-2 border-slate-950 shadow-md">
        {[
          { key: "today", label: "Daily Records" },
          { key: "monthly", label: "Monthly Records" },
          { key: "tools", label: "Admin Tools" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black transition-all px-1 uppercase active:scale-[0.97] ${activeTab === tab.key ? "bg-white text-slate-950 shadow-sm font-black" : "text-slate-400 hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "today" && (
        <div className="space-y-6">
          {loadingToday && (
            <div className="text-center text-indigo-600 py-12 font-black text-lg animate-pulse">
              🔄 Fetching Live Ledgers...
            </div>
          )}
          {todayData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SummaryCard
                  label="Total Collected "
                  value={formatRupees(todayData.summary.totalPaid)}
                  color="bg-emerald-50 border-emerald-300"
                  icon="💵"
                />
                <SummaryCard
                  label="Pending Balance"
                  value={formatRupees(todayData.summary.totalDue)}
                  color="bg-rose-50 border-rose-300"
                  icon="⏳"
                />
                <SummaryCard
                  label="Paid Houses"
                  value={`${todayData.summary.paidCount} Receipts`}
                  color="bg-sky-50 border-sky-300"
                  icon="🏠"
                />
                <SummaryCard
                  label="Remaining Houses"
                  value={`${todayData.summary.dueCount} Left`}
                  color="bg-amber-50 border-amber-300"
                  icon="🚶"
                />
              </div>
              <button
                onClick={loadToday}
                className="w-full py-4 border-2 border-slate-300 bg-white text-slate-800 font-black rounded-2xl hover:bg-slate-50 shadow-sm text-sm uppercase tracking-wider active:scale-[0.99] transition-all"
              >
                Refresh Screen
              </button>

              <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
                <ToolHeader
                  title="Quick Payment - Admin"
                  subtitle="Instantly register incoming customer payments"
                />
                <div className="p-5 space-y-5">
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Enter Customer ID{" "}
                      <span className="text-rose-500 font-black">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={adminCustomerId}
                        onChange={(e) => {
                          setAdminCustomerId(e.target.value.toUpperCase());
                          setAdminFoundCustomer(null);
                          setAdminCustomerError("");
                          setAdminSubmitResult(null);
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAdminLookup()
                        }
                        placeholder="E.G. S-06"
                        className={
                          inputCls + " uppercase tracking-wider flex-1"
                        }
                      />
                      <button
                        onClick={handleAdminLookup}
                        disabled={adminLookingUp || !adminCustomerId.trim()}
                        className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black px-6 rounded-2xl text-sm tracking-wider uppercase transition-all shrink-0 min-w-[90px]"
                      >
                        {adminLookingUp ? "..." : "SEARCH"}
                      </button>
                    </div>
                  </div>

                  {adminCustomerError && (
                    <p className="text-rose-700 font-black text-sm bg-rose-50 border-2 border-rose-200 px-4 py-3 rounded-2xl">
                      {adminCustomerError}
                    </p>
                  )}

                  {adminFoundCustomer && (
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 space-y-3">
                      <p className="font-black text-slate-900 text-2xl leading-tight">
                        {adminFoundCustomer.name}
                      </p>
                      {adminFoundCustomer.address && (
                        <p className="text-sm font-bold text-slate-600">
                          📍 {adminFoundCustomer.address}
                        </p>
                      )}
                      <div className="text-xs font-black text-slate-500 pt-1 flex flex-wrap gap-x-4 gap-y-1 bg-white px-3 py-2 rounded-xl border border-indigo-100">
                        <span>
                          ID:{" "}
                          <span className="text-slate-900 font-mono font-black text-sm">
                            {adminFoundCustomer.customerId}
                          </span>
                        </span>
                        <span>
                          Outstanding Due:{" "}
                          <span className="font-black text-rose-600 text-sm">
                            {formatRupees(adminFoundCustomer.balanceDue)}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Amount Collected (₹){" "}
                      <span className="text-rose-500 font-black">*</span>
                    </label>
                    <input
                      type="number"
                      value={adminAmountPaid}
                      onChange={(e) => setAdminAmountPaid(e.target.value)}
                      placeholder="0.00"
                      className="w-full border-2 border-slate-300 rounded-2xl px-4 py-4 text-4xl font-black text-emerald-700 bg-slate-50 focus:outline-none focus:border-emerald-500 placeholder:text-slate-300 shadow-inner text-center"
                      inputMode="decimal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Collection Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Optional cash or date notes..."
                      className={inputCls}
                    />
                  </div>

                  {adminSubmitResult && (
                    <div
                      className={`rounded-2xl px-4 py-4 font-black border-2 text-center text-base shadow-sm ${adminSubmitResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-400" : "bg-rose-50 text-rose-900 border-rose-400"}`}
                    >
                      {adminSubmitResult.message}
                    </div>
                  )}

                  <button
                    onClick={handleAdminPayment}
                    disabled={adminSubmitting || !adminFoundCustomer}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xl font-black py-5 rounded-2xl shadow-md transition-all uppercase tracking-wider active:scale-[0.99]"
                  >
                    {adminSubmitting
                      ? "Processing Collection..."
                      : "Save Payment (✓)"}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
                <ToolHeader
                  title="Collection Log Sheet - Today"
                  subtitle={`${todayData.payments.length} Records Registered Today`}
                />
                {todayData.payments.length === 0 ? (
                  <p className="px-4 py-12 text-center text-slate-400 font-black">
                    No collections saved today yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200/60">
                    {todayData.payments.map((p) => (
                      <PaymentRow
                        key={p.id}
                        payment={p}
                        onDelete={handleDeletePayment}
                        isDeleting={deletingPaymentId === p.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              {todayData.walklist?.length > 0 && (
                <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-amber-600 px-5 py-4">
                    <h2 className="text-white text-lg font-black tracking-wide uppercase">
                      🚶 Pending Walk-list Houses
                    </h2>
                    <p className="text-white/80 text-xs font-bold mt-1 tracking-wider uppercase">
                      Unpaid Houses Remaining
                    </p>
                  </div>
                  <div className="divide-y divide-slate-200/60">
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

      {activeTab === "monthly" && (
        <div className="space-y-6">
          {loadingMonthly && (
            <div className="text-center text-indigo-600 py-12 font-black text-lg animate-pulse">
              📊 Compiling Full Ledger Calculations...
            </div>
          )}
          {monthlyData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SummaryCard
                  label="Paid This Month"
                  value={formatRupees(monthlyData.summary.totalPaid)}
                  color="bg-emerald-50 border-emerald-300"
                  icon="📊"
                />
                <SummaryCard
                  label="Total Outstanding"
                  value={formatRupees(monthlyData.summary.totalDue)}
                  color="bg-rose-50 border-rose-300"
                  icon="⏳"
                />
                <SummaryCard
                  label="Paid Accounts"
                  value={`${monthlyData.summary.paidCount} Houses`}
                  color="bg-sky-50 border-sky-300"
                  icon="✅"
                />
                <SummaryCard
                  label="Unpaid Accounts"
                  value={`${monthlyData.summary.dueCount} Users`}
                  color="bg-amber-50 border-amber-300"
                  icon="🔔"
                />
              </div>
              <button
                onClick={() => loadMonthly(true)}
                className="w-full py-4 border-2 border-slate-300 bg-white text-slate-800 font-black rounded-2xl hover:bg-slate-50 shadow-sm text-sm uppercase tracking-wider active:scale-[0.99] transition-all"
              >
                Refresh Monthly Sheet
              </button>

              <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
                <ToolHeader
                  title="Monthly Payment Records"
                  subtitle={`${monthlyData.payments.length} Total Logs on File`}
                />
                {monthlyData.payments.length === 0 ? (
                  <p className="px-4 py-12 text-center text-slate-400 font-black">
                    No collection records found for this period.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200/60">
                    {monthlyData.payments.map((p) => (
                      <PaymentRow
                        key={p.id}
                        payment={p}
                        onDelete={handleDeletePayment}
                        isDeleting={deletingPaymentId === p.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              {monthlyData.dueCustomers?.length > 0 && (
                <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-900 px-5 py-4">
                    <h2 className="text-white text-lg font-black tracking-wide uppercase">
                      Due / Unpaid Accounts
                    </h2>
                    <p className="text-white/70 text-xs font-bold mt-1 tracking-wider uppercase">
                      {monthlyData.dueCustomers.length} Total Users Unpaid
                    </p>
                  </div>
                  <div className="divide-y divide-slate-200/60">
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

      {activeTab === "tools" && (
        <div className="space-y-6">
          {/* EDIT CUSTOMER */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <ToolHeader
              title="Modify Customer Details"
              subtitle="Change package plans, addresses or manually change due balances"
              bgColor="bg-indigo-900"
            />
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  Find Profile by Customer ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editSearchId}
                    onChange={(e) => {
                      setEditSearchId(e.target.value.toUpperCase());
                      setEditSearchError("");
                      setEditResult(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleEditSearch()}
                    placeholder="E.G. S-06"
                    className={inputCls + " uppercase tracking-wider flex-1"}
                  />
                  <button
                    onClick={handleEditSearch}
                    disabled={editSearching || !editSearchId.trim()}
                    className="bg-indigo-900 hover:bg-indigo-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black px-6 rounded-2xl text-sm uppercase transition-all shrink-0 min-w-[90px]"
                  >
                    {editSearching ? "..." : "LOAD"}
                  </button>
                </div>
              </div>
              {editSearchError && (
                <p className="text-rose-700 font-black text-sm bg-rose-50 border-2 border-rose-200 px-4 py-3 rounded-2xl">
                  {editSearchError}
                </p>
              )}

              {editCustomer && (
                <div className="space-y-5 border-t-2 border-slate-100 pt-5">
                  <div className="bg-slate-100 border-2 border-slate-200 rounded-2xl px-4 py-4">
                    <p className="font-black text-slate-900 text-xl">
                      {editCustomer.customerId} — {editCustomer.name}
                    </p>
                    <p className="text-sm font-bold text-slate-600 mt-1">
                      Current Plan:{" "}
                      <span className="text-slate-900 font-black">
                        {editCustomer.packageName || "None"}
                      </span>{" "}
                      • Current Due:{" "}
                      <span className="text-rose-600 font-black">
                        {formatRupees(editCustomer.balanceDue)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Assign Subscription Plan (Updates instantly)
                    </label>
                    <select
                      value={editPackageId}
                      onChange={(e) => {
                        setEditPackageId(e.target.value);
                        setEditCustomPrice("");
                      }}
                      className={inputCls + " h-[60px] text-base font-black"}
                    >
                      <option value="">— Select Plan Option —</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} — ₹{pkg.price} / {pkg.durationDays} Days
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DYNAMIC FIELD FOR MODIFY SECTION: Displayed only if package "OTHER" is active */}
                  {showEditCustomPriceField && (
                    <div>
                      <label className="block text-xs font-black text-indigo-700 uppercase tracking-wider mb-2">
                        Custom Base Price (₹) for "OTHER" Pack <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input
                        type="number"
                        value={editCustomPrice}
                        onChange={(e) => setEditCustomPrice(e.target.value)}
                        placeholder="Enter custom absolute rate..."
                        className={inputCls + " border-indigo-400 bg-indigo-50/30"}
                        inputMode="decimal"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Adjust Plan Expiry / Due Date
                    </label>
                    <input
                      type="date"
                      value={editExpiryDate}
                      onChange={(e) => setEditExpiryDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Manual Override Balance Due (₹)
                    </label>
                    <input
                      type="number"
                      value={editBalanceDue}
                      onChange={(e) => setEditBalanceDue(e.target.value)}
                      placeholder="Override absolute balance due amount..."
                      className={inputCls}
                      inputMode="decimal"
                    />
                    <p className="text-slate-500 text-xs font-bold mt-1">
                      Use this to set custom rates if they cancel mid-month
                      after 10-15 days.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                      Home Installation Address
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Street name or block details..."
                      className={inputCls}
                    />
                  </div>

                  {editResult && (
                    <div
                      className={`rounded-2xl px-4 py-4 font-black text-center text-base border-2 shadow-sm ${editResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-400" : "bg-rose-50 text-rose-900 border-rose-400"}`}
                    >
                      {editResult.message}
                    </div>
                  )}

                  <button
                    onClick={handleEditSave}
                    disabled={editSaving || !editPackageId}
                    className="w-full bg-indigo-900 hover:bg-indigo-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-base font-black py-4.5 rounded-2xl shadow-md uppercase tracking-wider transition-all"
                  >
                    {editSaving ? "Saving Profiles..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DELETE CUSTOMER */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <ToolHeader
              title="Delete Customer"
              subtitle="Permanently delete customers and cascade history out safely"
              bgColor="bg-rose-800"
            />
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  Enter Customer ID to Wipe
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={delSearchId}
                    onChange={(e) => {
                      setDelSearchId(e.target.value.toUpperCase());
                      setDelSearchError("");
                      setDelResult(null);
                      setDelConfirm(false);
                      setDelCustomer(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleDelSearch()}
                    placeholder="e.g. S-06"
                    className={inputCls + " uppercase tracking-wider flex-1"}
                  />
                  <button
                    onClick={handleDelSearch}
                    disabled={delSearching || !delSearchId.trim()}
                    className="bg-rose-800 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black px-6 rounded-2xl text-sm uppercase transition-all shrink-0 min-w-[90px]"
                  >
                    {delSearching ? "..." : "LOAD"}
                  </button>
                </div>
              </div>
              {delSearchError && (
                <p className="text-rose-700 font-black text-sm bg-rose-50 border-2 border-rose-200 px-4 py-3 rounded-2xl">
                  {delSearchError}
                </p>
              )}

              {delResult && (
                <div
                  className={`rounded-2xl px-5 py-5 font-black text-center text-lg border-2 shadow-md ${delResult.success ? "bg-emerald-100 text-emerald-950 border-emerald-500 animate-bounce" : "bg-rose-100 text-rose-950 border-rose-500"}`}
                >
                  {delResult.message}
                </div>
              )}

              {delCustomer && (
                <div className="space-y-5 border-t-2 border-slate-100 pt-5">
                  <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 text-center">
                    <p className="text-[11px] font-black tracking-widest text-rose-800 bg-white border border-rose-200 rounded px-2 py-0.5 inline-block uppercase mb-2">
                      ACCOUNT SELECTED
                    </p>
                    <p className="font-black text-rose-950 text-2xl">
                      {delCustomer.customerId} — {delCustomer.name}
                    </p>
                    {delCustomer.address && (
                      <p className="text-sm font-bold text-rose-800 mt-1">
                        📍 {delCustomer.address}
                      </p>
                    )}
                    <p className="text-base font-black text-rose-900 mt-2 bg-white/60 py-1.5 rounded-xl border border-rose-100 max-w-sm mx-auto">
                      Plan: {delCustomer.packageName} • Balance:{" "}
                      {formatRupees(delCustomer.balanceDue)}
                    </p>
                  </div>

                  <label className="flex items-start gap-4 cursor-pointer bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 select-none hover:bg-amber-100/50 transition-all">
                    <input
                      type="checkbox"
                      checked={delConfirm}
                      onChange={(e) => setDelConfirm(e.target.checked)}
                      className="w-8 h-8 mt-0.5 accent-rose-800 shrink-0 border-2 border-slate-400 rounded-xl"
                    />
                    <span className="text-sm font-black text-amber-950 leading-snug">
                      ⚠️ Yes, I want to completely delete this profile. This
                      will instantly wipe their outstanding tabs and log sheets
                      out forever.
                    </span>
                  </label>

                  <button
                    onClick={handleDeleteCustomer}
                    disabled={deleting || !delConfirm}
                    className="w-full bg-rose-700 hover:bg-rose-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-lg font-black py-5 rounded-2xl shadow-md uppercase tracking-wider transition-all"
                  >
                    {deleting
                      ? "Dropping account records..."
                      : "Confirm Permanent Delete"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ADD NEW CUSTOMER */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <ToolHeader
              title="Register New Customer"
              subtitle="Add a new Customer Profile with a unique ID and package plan"
            />
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  New Customer ID{" "}
                  <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  value={newCust.customerId}
                  onChange={(e) =>
                    setNewCust({
                      ...newCust,
                      customerId: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. S-06"
                  className={inputCls + " uppercase tracking-wider"}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  Customer Full Name{" "}
                  <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  value={newCust.name}
                  onChange={(e) =>
                    setNewCust({ ...newCust, name: e.target.value })
                  }
                  placeholder="e.g. Mithu Das"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  Select Base Package Plan{" "}
                  <span className="text-rose-500 font-black">*</span>
                </label>
                <select
                  value={newCust.packageId}
                  onChange={(e) =>
                    setNewCust({
                      ...newCust,
                      packageId: e.target.value,
                      customPrice: "",
                    })
                  }
                  className={inputCls + " h-[60px] text-base font-black"}
                >
                  <option value="">— Select Plan Option —</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — ₹{pkg.price} / {pkg.durationDays} Days
                    </option>
                  ))}
                </select>
              </div>

              {/* DYNAMIC FIELD: Displayed only if package "OTHER" is active */}
              {showCustomPriceField && (
                <div>
                  <label className="block text-xs font-black text-indigo-700 uppercase tracking-wider mb-2">
                    Custom Base Price (₹) for "OTHER" Pack{" "}
                    <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    type="number"
                    value={newCust.customPrice}
                    onChange={(e) =>
                      setNewCust({ ...newCust, customPrice: e.target.value })
                    }
                    placeholder="Enter custom absolute rate..."
                    className={inputCls + " border-indigo-400 bg-indigo-50/30"}
                    inputMode="decimal"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  Home Address
                </label>
                <input
                  type="text"
                  value={newCust.address}
                  onChange={(e) =>
                    setNewCust({ ...newCust, address: e.target.value })
                  }
                  placeholder="e.g. Ph. No. | Krishnapur Chak "
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                    Change Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newCust.cycleStartDate}
                    onChange={(e) =>
                      setNewCust({ ...newCust, cycleStartDate: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-indigo-700 uppercase tracking-wider mb-2">
                    Change Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newCust.customExpiryDate}
                    onChange={(e) =>
                      setNewCust({
                        ...newCust,
                        customExpiryDate: e.target.value,
                      })
                    }
                    className={inputCls + " border-indigo-300"}
                  />
                </div>
              </div>
              {addCustResult && (
                <div
                  className={`rounded-2xl px-4 py-4 font-black text-center text-base border-2 shadow-sm ${addCustResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-400" : "bg-rose-50 text-rose-900 border-rose-400"}`}
                >
                  {addCustResult.message}
                </div>
              )}
              <button
                onClick={handleAddCustomer}
                disabled={addingCust}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-base font-black py-4.5 rounded-2xl shadow-md uppercase tracking-wider transition-all"
              >
                {addingCust
                  ? "Deploying User..."
                  : "Create New Customer Profile"}
              </button>
            </div>
          </div>

          {/* LOG MISSED / BACKDATED PAYMENT */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <ToolHeader
              title="Add Record Missed / Backdated Payment"
              subtitle="Add a payment into past logs for a customer who forgot to pay or was missed"
              bgColor="bg-amber-700"
            />
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  Customer ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={missedCustomerId}
                    onChange={(e) => {
                      setMissedCustomerId(e.target.value.toUpperCase());
                      setMissedLookupError("");
                      setMissedSubmitResult(null);
                      setMissedFoundCustomer(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleMissedLookup()}
                    placeholder="E.G. S-06"
                    className={inputCls + " uppercase tracking-wider flex-1"}
                  />
                  <button
                    onClick={handleMissedLookup}
                    disabled={missedLookingUp || !missedCustomerId.trim()}
                    className="bg-amber-700 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black px-6 rounded-2xl text-sm uppercase transition-all shrink-0 min-w-[90px]"
                  >
                    {missedLookingUp ? "..." : "LOAD"}
                  </button>
                </div>
              </div>

              {missedLookupError && (
                <p className="text-rose-700 font-black text-sm bg-rose-50 border-2 border-rose-200 px-4 py-3 rounded-2xl">
                  {missedLookupError}
                </p>
              )}

              {missedFoundCustomer && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3">
                  <p className="font-black text-slate-900 text-lg leading-tight">
                    Selected: {missedFoundCustomer.name} (
                    <span className="font-mono font-black text-sm">
                      {missedFoundCustomer.customerId}
                    </span>
                    )
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    Plan Type: {missedFoundCustomer.packageName} • Current
                    Pending Due:{" "}
                    <span className="text-rose-600 font-black">
                      {formatRupees(missedFoundCustomer.balanceDue)}
                    </span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                    Amount Received (₹)
                  </label>
                  <input
                    type="number"
                    value={missedAmount}
                    onChange={(e) => setMissedAmount(e.target.value)}
                    placeholder="0.00"
                    className={inputCls}
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-indigo-700 uppercase tracking-wider mb-2">
                    Date of Payment{" "}
                    <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    type="date"
                    value={missedDate}
                    onChange={(e) => setMissedDate(e.target.value)}
                    className={inputCls + " border-indigo-300"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  Notes
                </label>
                <input
                  type="text"
                  value={missedNote}
                  onChange={(e) => setMissedNote(e.target.value)}
                  placeholder="e.g. Forgot to write down last Tuesday"
                  className={inputCls}
                />
              </div>

              {missedSubmitResult && (
                <div
                  className={`rounded-2xl px-4 py-4 font-black border-2 text-center text-sm shadow-sm ${missedSubmitResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-400" : "bg-rose-50 text-rose-900 border-rose-400"}`}
                >
                  {missedSubmitResult.message}
                </div>
              )}

              <button
                onClick={handleSaveMissedPayment}
                disabled={
                  missedSubmitting || !missedFoundCustomer || !missedDate
                }
                className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 text-white text-base font-black py-4.5 rounded-2xl shadow-md uppercase tracking-wider transition-all"
              >
                {missedSubmitting ? "Saving data..." : "Save Missed Record "}
              </button>
            </div>
          </div>

          {/* SERVICE PLANS */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <ToolHeader
              title="Add Package Plans"
              subtitle="Add and view active subscription plans"
            />
            <div className="p-5 space-y-5">
              {packages.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 tracking-wider uppercase">
                    Active Plans
                  </label>
                  {pkgDeleteResult && (
                    <div
                      className={`rounded-2xl px-3 py-2.5 text-sm font-black border-2 text-center ${pkgDeleteResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-rose-50 text-rose-900 border-rose-300"}`}
                    >
                      {pkgDeleteResult.message}
                    </div>
                  )}
                  <div className="space-y-2 max-h-72 overflow-y-auto border-2 border-slate-200 rounded-2xl p-2 bg-slate-50">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex justify-between items-center bg-white border-2 border-slate-200/80 rounded-xl px-4 py-3 shadow-sm gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-slate-900 text-base truncate">
                            {pkg.name}
                          </p>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">
                            Cycle Span: {pkg.durationDays} Days
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="font-black text-indigo-600 text-base">
                            {formatRupees(pkg.price)}
                          </p>
                          <button
                            onClick={() =>
                              handleDeletePackage(pkg.id, pkg.name)
                            }
                            disabled={deletingPkgId === pkg.id}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-sm p-3 rounded-xl border-2 border-rose-200 transition-all active:scale-[0.94]"
                          >
                            {deletingPkgId === pkg.id ? "..." : "🗑️"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t-2 border-slate-100 pt-5 space-y-3">
                <p className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Add New Package
                </p>
                <input
                  type="text"
                  value={newPkg.name}
                  onChange={(e) =>
                    setNewPkg({ ...newPkg, name: e.target.value })
                  }
                  placeholder="Plan Name (e.g., HD Pack)"
                  className={inputCls}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={newPkg.price}
                    onChange={(e) =>
                      setNewPkg({ ...newPkg, price: e.target.value })
                    }
                    placeholder="Price (₹)"
                    className={inputCls}
                    inputMode="decimal"
                  />
                  <input
                    type="number"
                    value={newPkg.durationDays}
                    onChange={(e) =>
                      setNewPkg({ ...newPkg, durationDays: e.target.value })
                    }
                    placeholder="Days (e.g. 30)"
                    className={inputCls}
                    inputMode="numeric"
                  />
                </div>
                {pkgResult && (
                  <div
                    className={`rounded-2xl px-3 py-3 text-sm font-black border-2 text-center ${pkgResult.success ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-rose-50 text-rose-900 border-rose-300"}`}
                  >
                    {pkgResult.message}
                  </div>
                )}
                <button
                  onClick={handleCreatePackage}
                  disabled={savingPkg}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-black py-4 rounded-2xl shadow-md uppercase tracking-wider transition-all"
                >
                  {savingPkg ? "Adding..." : "Add New Package"}
                </button>
              </div>
            </div>
          </div>

          {/* BACKUP EXPORT */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <ToolHeader
              title="Full Data Export"
              subtitle="Extract records to offline storage backup"
            />
            <div className="p-5">
              <p className="text-slate-600 text-sm font-bold mb-4 leading-relaxed">
                Compiles all customer balances, history, outstandings, and
                system tags into a standardized `.csv` spreadsheet file.
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-base font-black py-4.5 rounded-2xl shadow-md uppercase tracking-wider transition-all"
              >
                {exporting
                  ? "Compiling Backup Tables..."
                  : "Download CSV Backup"}
              </button>
            </div>
          </div>

          {/* DATA IMPORT */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <ToolHeader
              title="Batch Data Import"
              subtitle="Load all customer records directly into system"
            />
            <div className="p-5 space-y-4">
              <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 text-sm text-sky-950 font-bold">
                <p className="font-black text-sky-900 mb-1 uppercase tracking-wider text-xs">
                  Required Sheet Headers:
                </p>
                <div className="font-mono text-xs bg-white border border-sky-200 p-3 rounded-xl text-center font-black tracking-wide mt-1.5 select-all overflow-x-auto whitespace-nowrap">
                  customerid, name, package, address, startdate
                </div>
              </div>
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-5 rounded-2xl flex items-center justify-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files[0] ?? null)}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-3 file:px-5 file:rounded-xl file:border-0 file:bg-slate-950 file:text-white file:font-black file:text-xs hover:file:bg-slate-800 cursor-pointer"
                />
              </div>
              <button
                onClick={handleImport}
                disabled={importing || !importFile}
                className="w-full bg-sky-700 hover:bg-sky-800 text-white text-sm font-black py-4 rounded-2xl shadow-md uppercase tracking-wider transition-all"
              >
                {importing ? "Processing..." : "Import Database Records"}
              </button>
              {importResult && (
                <div
                  className={`rounded-2xl p-4 text-sm font-bold border-2 ${importResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-800"}`}
                >
                  <p className="text-base font-black">
                    {importResult.message || importResult.error}
                  </p>
                  {importResult.results && (
                    <div className="mt-3 space-y-1.5 text-sm">
                      <p>
                        🟢 Configured:{" "}
                        <span className="font-black text-slate-900">
                          {importResult.results.created.length}
                        </span>
                      </p>
                      <p>
                        放置 Skipped:{" "}
                        <span className="font-black text-slate-900">
                          {importResult.results.skipped.length}
                        </span>
                      </p>
                      <p>
                        🔴 Aborted:{" "}
                        <span className="font-black text-rose-700">
                          {importResult.results.failed.length}
                        </span>
                      </p>
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
