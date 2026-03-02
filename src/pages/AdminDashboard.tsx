import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users, AlertTriangle, Activity, MapPin, LogOut, ShieldCheck,
  Search, Download, MessageSquare, Star, Lock, X, Bell,
  AlertOctagon, Eye, EyeOff, FileDown, KeyRound,
  CheckCircle2, Navigation, MapIcon, Siren,
} from "lucide-react";
import MapView from "../components/MapView";
import { AnimatePresence } from "framer-motion";
import { adminApi, authApi } from "@/lib/api";
import { toast } from "sonner";

type StatRow = { label: string; value: string; icon: typeof Users; change: string };
type SosRow = { id: string; user: string; time: string; lat: number; lng: number; status: string; type: string; info: string };
type UserRow = { name: string; email: string; phone: string; joined: string };
type FeedbackRow = { user: string; message: string; rating: number };

type Tab = "overview" | "users" | "sos" | "feedback";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Export modal state ──────────────────────────────────────────────────
  const EXPORT_PASSWORD = "xyz098";
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPass, setExportPass] = useState("");
  const [exportPassVisible, setExportPassVisible] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const exportInputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (showExportModal) {
      setExportPass("");
      setExportError("");
      setTimeout(() => exportInputRef.current?.focus(), 100);
    }
  }, [showExportModal]);

  /** Build and download a multi-sheet CSV */
  function downloadCSV() {
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const toCSV = (headers: string[], rows: unknown[][]) =>
      [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");

    const userSection = [
      "=== REGISTERED USERS ===",
      toCSV(
        ["Name", "Email", "Phone", "Joined"],
        recentUsers.map((u) => [u.name, u.email, u.phone, u.joined])
      ),
    ].join("\n");

    const sosSection = [
      "\n=== SOS ALERTS ===",
      toCSV(
        ["ID", "User", "Time", "Latitude", "Longitude", "Type", "Status", "Info"],
        sosAlerts.map((a) => [a.id, a.user, a.time, a.lat, a.lng, a.type, a.status, a.info])
      ),
    ].join("\n");

    const feedbackSection = [
      "\n=== FEEDBACK ===",
      toCSV(
        ["User", "Rating", "Message"],
        feedback.map((f) => [f.user, f.rating, f.message])
      ),
    ].join("\n");

    const csvContent = [userSection, sosSection, feedbackSection].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geosentinel-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setExportLoading(true);
    setTimeout(() => {
      if (exportPass === EXPORT_PASSWORD) {
        setShowExportModal(false);
        setExportPass("");
        setExportError("");
        downloadCSV();
      } else {
        setExportError("Incorrect root password. Access denied.");
        setExportPass("");
        exportInputRef.current?.focus();
      }
      setExportLoading(false);
    }, 600);
  }
  const [stats, setStats] = useState<StatRow[]>([
    { label: "Total Users", value: "-", icon: Users, change: "-" },
    { label: "Active Now", value: "-", icon: Activity, change: "-" },
    { label: "SOS Alerts", value: "-", icon: AlertTriangle, change: "-" },
    { label: "Geofence Violations", value: "-", icon: MapPin, change: "-" },
  ]);
  const [sosAlerts, setSosAlerts] = useState<SosRow[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<SosRow[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [activeCriticalAlert, setActiveCriticalAlert] = useState<SosRow | null>(null);
  const [sosMapCenter, setSosMapCenter] = useState<[number, number]>([28.6139, 77.209]);
  const [sosMapZoom, setSosMapZoom] = useState(11);
  const [focusedAlert, setFocusedAlert] = useState<SosRow | null>(null);
  const [dispatching, setDispatching] = useState<string | null>(null); // alert id being dispatched

  useEffect(() => {
    if (!localStorage.getItem("adminToken")) {
      navigate("/login/admin");
      return;
    }
    adminApi.getStats().then((s) => {
      setStats([
        { label: "Total Users", value: s.totalUsers, icon: Users, change: "+12%" },
        { label: "Active Now", value: s.activeNow, icon: Activity, change: "+5%" },
        { label: "SOS Alerts", value: s.sosAlerts, icon: AlertTriangle, change: "-3%" },
        { label: "Geofence Violations", value: s.geofenceViolations, icon: MapPin, change: "+8%" },
      ]);
    }).catch(() => { });
    adminApi.getSosAlerts().then((a) => {
      setSosAlerts(a.filter(x => x.status === "Active"));
      setResolvedAlerts(a.filter(x => x.status !== "Active"));
      const critical = a.find((x) => x.type === "emergency" && x.status === "Active");
      setActiveCriticalAlert(critical || null);
    }).catch(() => { });
    adminApi.getUsers().then(setRecentUsers).catch(() => { });
    adminApi.getFeedback().then(setFeedback).catch(() => { });
  }, [navigate]);

  // ── SOS actions ─────────────────────────────────────────────────────────
  const handleShowOnMap = (alert: SosRow) => {
    setTab("sos");
    setSosMapCenter([alert.lat, alert.lng]);
    setSosMapZoom(15);
    setFocusedAlert(alert);
    toast.info(`📍 Showing ${alert.user}'s location on map`);
  };

  const handleDispatch = async (alert: SosRow) => {
    const numericId = parseInt(alert.id.replace("SOS-", ""), 10);
    if (isNaN(numericId)) return;
    setDispatching(alert.id);
    try {
      await adminApi.resolveAlert(numericId);
      const resolved = { ...alert, status: "Resolved" };
      setSosAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      setResolvedAlerts((prev) => [resolved, ...prev]);
      if (activeCriticalAlert?.id === alert.id) setActiveCriticalAlert(null);
      if (focusedAlert?.id === alert.id) setFocusedAlert(null);
      toast.success(`✅ Help dispatched for ${alert.user} — Alert resolved!`);
    } catch {
      toast.error("Failed to resolve alert. Try again.");
    } finally {
      setDispatching(null);
    }
  };

  const playAlertSound = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3");
    audio.play().catch(() => { });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "sos", label: "SOS Alerts" },
    { key: "feedback", label: "Feedback" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="font-display text-sm font-bold tracking-wider text-foreground">Admin Portal</h1>
          <span className="blockchain-badge">
            <Lock className="w-3 h-3" /> Blockchain Verified
          </span>
        </div>
        <button
          onClick={() => {
            authApi.clearTokens();
            navigate("/");
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-secondary/50 p-1 rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search + Export */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users, alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 text-sm text-primary hover:bg-primary/10 transition-all font-medium"
          >
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card glow-border p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className="w-5 h-5 text-primary" />
                    <span className={`text-xs font-medium ${stat.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Live Map */}
            <div className="glass-card p-0 overflow-hidden mb-6 h-[400px]">
              <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
                <h3 className="font-display text-xs tracking-wider text-primary uppercase">Live SOS Map Review</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Emergency</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Standard</span>
                  </div>
                </div>
              </div>
              <MapView
                markers={sosAlerts.map(a => ({
                  lat: a.lat,
                  lng: a.lng,
                  label: a.user,
                  type: a.type,
                  info: a.info
                }))}
                zoom={12}
                center={[28.6139, 77.209]}
              />
            </div>
          </motion.div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
            <h3 className="font-display text-xs tracking-wider text-primary uppercase mb-4">Registered Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user, i) => (
                    <tr key={`${user.name}-${user.phone}-${i}`} className="border-b border-border/50">
                      <td className="py-3 text-foreground">{user.name}</td>
                      <td className="py-3 text-muted-foreground">{user.email}</td>
                      <td className="py-3 text-muted-foreground font-mono text-xs">{user.phone}</td>
                      <td className="py-3 text-muted-foreground">{user.joined}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* SOS tab — split: list + map + resolved */}
        {tab === "sos" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* ── Active Alerts ── */}
            <div className="glass-card p-0 overflow-hidden">
              <div className="p-4 border-b border-border bg-card/50 flex items-center gap-2">
                <Siren className="w-4 h-4 text-destructive animate-pulse" />
                <h3 className="font-display text-xs tracking-wider text-destructive uppercase font-bold">
                  Active SOS Alerts ({sosAlerts.length})
                </h3>
              </div>

              {sosAlerts.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500/50" />
                  <p className="text-sm font-medium text-green-400">All clear — no active alerts</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {sosAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${focusedAlert?.id === alert.id ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-muted/30"
                        }`}
                    >
                      {/* Badge */}
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${alert.type === "emergency" ? "bg-destructive/20" : "bg-yellow-500/20"
                        }`}>
                        <AlertOctagon className={`w-5 h-5 ${alert.type === "emergency" ? "text-destructive" : "text-yellow-400"
                          }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm">{alert.user}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${alert.type === "emergency"
                              ? "bg-destructive/20 text-destructive"
                              : "bg-yellow-500/20 text-yellow-400"
                            }`}>{alert.type}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{alert.id}</span>
                        </div>
                        {alert.info && <p className="text-xs text-muted-foreground mt-0.5 italic truncate">"{alert.info}"</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)} &bull; {alert.time}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleShowOnMap(alert)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Show on Map
                        </button>
                        <button
                          onClick={() => handleDispatch(alert)}
                          disabled={dispatching === alert.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {dispatching === alert.id ? "Dispatching..." : "Dispatch"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Live Map ── */}
            <div className="glass-card p-0 overflow-hidden h-[420px]">
              <div className="p-3 border-b border-border bg-card/50 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-primary" />
                <h3 className="font-display text-xs tracking-wider text-primary uppercase">
                  {focusedAlert ? `📍 ${focusedAlert.user} — Live Location` : "SOS Incident Map"}
                </h3>
                {focusedAlert && (
                  <button
                    onClick={() => { setFocusedAlert(null); setSosMapCenter([28.6139, 77.209]); setSosMapZoom(11); }}
                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <MapView
                key={`${sosMapCenter[0]}-${sosMapCenter[1]}-${sosMapZoom}`}
                markers={sosAlerts.map(a => ({ lat: a.lat, lng: a.lng, label: a.user, type: a.type, info: a.info }))}
                zoom={sosMapZoom}
                center={sosMapCenter}
                showUserLocation={false}
              />
            </div>

            {/* ── Resolved SOS ── */}
            {resolvedAlerts.length > 0 && (
              <div className="glass-card p-0 overflow-hidden">
                <div className="p-4 border-b border-border bg-card/50 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <h3 className="font-display text-xs tracking-wider text-green-400 uppercase font-bold">
                    Resolved SOS ({resolvedAlerts.length})
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {resolvedAlerts.map((alert, i) => (
                    <div key={`${alert.id}-${i}`} className="p-4 flex items-center gap-3 opacity-70">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{alert.user}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-bold">RESOLVED</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{alert.id}</span>
                        </div>
                        {alert.info && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{alert.info}"</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />{alert.lat.toFixed(4)}, {alert.lng.toFixed(4)} &bull; {alert.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}


        {/* Feedback tab */}
        {tab === "feedback" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {feedback.map((fb, i) => (
              <div key={i} className="glass-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground font-medium">{fb.user}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: fb.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">{fb.message}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Export Password Modal ────────────────────────────────────── */}
      {showExportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm"
          >
            <div className="glass-card glow-border p-7 relative">
              {/* Close */}
              <button
                onClick={() => setShowExportModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon + title */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <KeyRound className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-display font-bold text-lg text-foreground">Root Authorization</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the root password to download the CSV export
                  </p>
                </div>
              </div>

              <form onSubmit={handleExportSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                    <Lock className="w-3 h-3" /> Root Password
                  </label>
                  <div className="relative">
                    <input
                      ref={exportInputRef}
                      type={exportPassVisible ? "text" : "password"}
                      placeholder="Enter root password"
                      value={exportPass}
                      onChange={(e) => { setExportPass(e.target.value); setExportError(""); }}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setExportPassVisible(!exportPassVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {exportPassVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {exportError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive mt-2 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> {exportError}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={exportLoading || !exportPass}
                  className="w-full glow-button rounded-xl py-3 font-display text-xs tracking-widest uppercase text-primary-foreground font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {exportLoading ? (
                    <span className="animate-pulse">Verifying...</span>
                  ) : (
                    <><Download className="w-4 h-4" /> Download CSV</>
                  )}
                </button>
              </form>

              <p className="text-center text-[10px] text-muted-foreground mt-4">
                This export contains sensitive user data. Keep it secure.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Critical Alert Banner */}
      <AnimatePresence>
        {activeCriticalAlert && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4"
          >
            <div className="bg-destructive text-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
              <div className="p-1 bg-white/10 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 animate-bounce" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Critical Emergency Alert</span>
                </div>
                <button
                  onClick={() => setActiveCriticalAlert(null)}
                  className="p-1 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <AlertOctagon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-display font-bold text-lg leading-none">{activeCriticalAlert.user}</h4>
                    <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full font-mono">{activeCriticalAlert.id}</span>
                  </div>
                  <p className="text-sm text-white/90 italic mb-3">"{activeCriticalAlert.info}"</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDispatch(activeCriticalAlert!)}
                      disabled={dispatching === activeCriticalAlert?.id}
                      className="flex-1 bg-white text-destructive rounded-lg py-2 text-xs font-bold uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-60"
                    >
                      {dispatching === activeCriticalAlert?.id ? "Dispatching..." : "Dispatch Help"}
                    </button>
                    <button
                      onClick={() => handleShowOnMap(activeCriticalAlert!)}
                      className="flex-1 bg-black/20 text-white rounded-lg py-2 text-xs font-bold uppercase tracking-wider hover:bg-black/30 transition-colors border border-white/10"
                    >
                      View on Map
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
