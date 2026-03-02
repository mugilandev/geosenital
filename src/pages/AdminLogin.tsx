import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ShieldCheck, Phone, Mail, Lock, Eye, EyeOff, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";

const regions = [
  { code: "+91", label: "IN" },
  { code: "+1", label: "US" },
  { code: "+44", label: "UK" },
  { code: "+971", label: "UAE" },
  { code: "+61", label: "AU" },
];

type Step = "phone" | "gmail" | "password";

const stepLabels: Record<Step, string> = {
  phone: "Step 1 — Admin Phone",
  gmail: "Step 2 — Admin Gmail",
  password: "Step 3 — Password",
};

const AdminLogin = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("phone");
  const [region, setRegion] = useState("+91");
  const [phone, setPhone] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Step 1: check phone ────────────────────────────────────────────────────
  const handlePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length !== 10)
      return toast.error("Please enter exactly 10 digits");
    setLoading(true);
    try {
      await authApi.adminCheckPhone({ phone, region });
      setStep("gmail");
      toast.success("Phone accepted ✓");
    } catch (err: any) {
      toast.error(err.message || "Phone verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: check gmail ────────────────────────────────────────────────────
  const handleGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmail.toLowerCase().endsWith("@gmail.com"))
      return toast.error("Only @gmail.com addresses are allowed");
    setLoading(true);
    try {
      await authApi.adminCheckGmail({ phone, gmail });
      setStep("password");
      toast.success("Gmail accepted ✓");
    } catch (err: any) {
      toast.error(err.message || "Gmail verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: password → login ───────────────────────────────────────────────
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6)
      return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      const { token } = await authApi.adminLogin({ phone, gmail, password });
      authApi.setAdminToken(token);
      toast.success("Admin login successful!");
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Progress indicator ─────────────────────────────────────────────────────
  const steps: Step[] = ["phone", "gmail", "password"];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-pattern p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Back */}
        <button
          onClick={() => {
            if (step === "phone") navigate("/select-role");
            else setStep(steps[stepIdx - 1] as Step);
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="glass-card glow-border p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h2 className="font-display text-xl font-bold glow-text">Admin Login</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Manage users, view alerts, and control the monitoring system
          </p>

          {/* Step progress */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i < stepIdx
                      ? "bg-primary border-primary text-primary-foreground"
                      : i === stepIdx
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                >
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded transition-all ${i < stepIdx ? "bg-primary" : "bg-border"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>

          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
            {stepLabels[step]}
          </p>

          <AnimatePresence mode="wait">
            {/* ── STEP 1: Phone ─────────────────────────────────────────── */}
            {step === "phone" && (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePhone}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Phone className="w-3 h-3" /> Admin Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="appearance-none bg-muted border border-border rounded-xl pl-3 pr-8 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      >
                        {regions.map((r) => (
                          <option key={r.code} value={r.code}>{r.label} {r.code}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                    <input
                      type="tel"
                      placeholder="10-digit admin number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full glow-button rounded-xl py-3 font-display text-xs tracking-widest uppercase text-primary-foreground font-bold disabled:opacity-70"
                >
                  {loading ? "Checking..." : "Next →"}
                </button>
              </motion.form>
            )}

            {/* ── STEP 2: Gmail ─────────────────────────────────────────── */}
            {step === "gmail" && (
              <motion.form
                key="gmail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleGmail}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Mail className="w-3 h-3" /> Admin Gmail Address
                  </label>
                  <input
                    type="email"
                    placeholder="admin@gmail.com"
                    value={gmail}
                    onChange={(e) => setGmail(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Only @gmail.com addresses are accepted
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full glow-button rounded-xl py-3 font-display text-xs tracking-widest uppercase text-primary-foreground font-bold disabled:opacity-70"
                >
                  {loading ? "Verifying..." : "Next →"}
                </button>
              </motion.form>
            )}

            {/* ── STEP 3: Password ──────────────────────────────────────── */}
            {step === "password" && (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePassword}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Lock className="w-3 h-3" /> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Enter admin password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    First-time login? This will set your password.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full glow-button rounded-xl py-3 font-display text-xs tracking-widest uppercase text-primary-foreground font-bold disabled:opacity-70"
                >
                  {loading ? "Signing in..." : "Access Admin Dashboard"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
