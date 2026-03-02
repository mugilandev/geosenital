import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, User, Lock, Eye, EyeOff, ChevronDown,
  Fingerprint, Shield, MapPin, Check, LogIn, UserPlus
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

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// ── Shared input style ──────────────────────────────────────────────────────
const inputCls =
  "w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";

const UserLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "login" | "signup">("choose");

  // ── Login state ────────────────────────────────────────────────────────────
  const [loginPhone, setLoginPhone] = useState("");
  const [loginRegion, setLoginRegion] = useState("+91");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Sign Up state ──────────────────────────────────────────────────────────
  const [suPhone, setSuPhone] = useState("");
  const [suRegion, setSuRegion] = useState("+91");
  const [suPass, setSuPass] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [showSuPass, setShowSuPass] = useState(false);
  const [suName, setSuName] = useState("");
  const [suUserType, setSuUserType] = useState<"indian" | "foreigner">("indian");
  const [suAadhaar, setSuAadhaar] = useState("");
  const [suPassport, setSuPassport] = useState("");
  const [suEmergency, setSuEmergency] = useState("");
  const [suState, setSuState] = useState("");
  const [suStateOpen, setSuStateOpen] = useState(false);
  const [suLoading, setSuLoading] = useState(false);

  const formatAadhaar = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 12);
    return d.match(/.{1,4}/g)?.join(" ") ?? d;
  };

  // ── Login submit ───────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPhone.replace(/\D/g, "").length !== 10) {
      return toast.error("Please enter exactly 10 digits");
    }
    if (!loginPass) return toast.error("Please enter your password");
    setLoginLoading(true);
    try {
      const { token } = await authApi.login({
        phone: loginPhone,
        region: loginRegion,
        password: loginPass,
      });
      authApi.setUserToken(token);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Sign Up submit ─────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (suPhone.replace(/\D/g, "").length !== 10)
      return toast.error("Please enter exactly 10 digits");
    if (suPass.length < 6)
      return toast.error("Password must be at least 6 characters");
    if (suPass !== suConfirm)
      return toast.error("Passwords do not match");
    if (!suName.trim())
      return toast.error("Please enter your name");
    if (suUserType === "indian" && suAadhaar.replace(/\s/g, "").length !== 12)
      return toast.error("Aadhaar must be 12 digits");
    if (suUserType === "foreigner" && suPassport.length !== 8)
      return toast.error("Passport must be 1 letter + 7 digits");
    if (suEmergency.replace(/\D/g, "").length < 10)
      return toast.error("Enter a valid emergency contact");
    if (!suState)
      return toast.error("Please select your state");

    setSuLoading(true);
    try {
      const { token } = await authApi.signup({
        phone: suPhone,
        region: suRegion,
        password: suPass,
        name: suName,
        userType: suUserType,
        identity: suUserType === "indian" ? suAadhaar : suPassport,
        emergencyContact: suEmergency,
        state: suState,
      });
      authApi.setUserToken(token);
      toast.success("Account created! Welcome to GeoSentinel 🎉");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setSuLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-pattern p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        {/* Back button */}
        <button
          onClick={() =>
            mode === "choose" ? navigate("/select-role") : setMode("choose")
          }
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="glass-card glow-border p-8">
          <h2 className="font-display text-xl font-bold glow-text mb-2 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> User Portal
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Access your safety dashboard, live maps, and SOS features
          </p>

          {/* ── CHOOSE MODE ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {mode === "choose" && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                <button
                  onClick={() => setMode("login")}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all group"
                >
                  <div className="p-3 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-all">
                    <LogIn className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground">Log In</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Already have an account? Sign in with phone & password
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setMode("signup")}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-secondary border border-border hover:bg-muted transition-all group"
                >
                  <div className="p-3 rounded-xl bg-muted group-hover:bg-secondary transition-all">
                    <UserPlus className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground">Sign Up</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      New here? Create your account in seconds
                    </p>
                  </div>
                </button>
              </motion.div>
            )}

            {/* ── LOGIN FORM ────────────────────────────────────────────── */}
            {mode === "login" && (
              <motion.form
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-primary" /> Log In
                </h3>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Phone className="w-3 h-3" /> Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <select
                        value={loginRegion}
                        onChange={(e) => setLoginRegion(e.target.value)}
                        className="appearance-none bg-muted border border-border rounded-xl pl-3 pr-8 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      >
                        {regions.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.label} {r.code}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                    <input
                      type="tel"
                      placeholder="10-digit number"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className={inputCls + " flex-1"}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Lock className="w-3 h-3" /> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPass ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      className={inputCls + " pr-11"}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full glow-button rounded-xl py-3 font-display text-xs tracking-widest uppercase text-primary-foreground font-bold disabled:opacity-70"
                >
                  {loginLoading ? "Logging in..." : "Log In"}
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign Up
                  </button>
                </p>
              </motion.form>
            )}

            {/* ── SIGN UP FORM ──────────────────────────────────────────── */}
            {mode === "signup" && (
              <motion.form
                key="signup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSignup}
                className="space-y-4"
              >
                <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" /> Create Account
                </h3>

                {/* User type toggle */}
                <div className="flex p-1 bg-muted rounded-2xl border border-border">
                  {(["indian", "foreigner"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSuUserType(t)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${suUserType === t
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {t === "indian" ? "Indian" : "Foreigner"}
                    </button>
                  ))}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Phone className="w-3 h-3" /> Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <select
                        value={suRegion}
                        onChange={(e) => setSuRegion(e.target.value)}
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
                      placeholder="10-digit number"
                      value={suPhone}
                      onChange={(e) => setSuPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className={inputCls + " flex-1"}
                      required
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <User className="w-3 h-3" /> Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>

                {/* Identity */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    {suUserType === "indian"
                      ? <><Fingerprint className="w-3 h-3" /> Aadhaar Number</>
                      : <><Shield className="w-3 h-3" /> Passport Number</>
                    }
                  </label>
                  {suUserType === "indian" ? (
                    <input
                      type="text"
                      placeholder="0000 0000 0000"
                      value={suAadhaar}
                      onChange={(e) => setSuAadhaar(formatAadhaar(e.target.value))}
                      className={inputCls + " font-mono tracking-widest"}
                      required
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="A1234567"
                      value={suPassport}
                      onChange={(e) => {
                        let v = e.target.value.toUpperCase();
                        if (v.length === 0) { setSuPassport(""); return; }
                        const letter = v.charAt(0);
                        if (/[A-Z]/.test(letter)) {
                          setSuPassport(letter + v.slice(1).replace(/\D/g, "").slice(0, 7));
                        }
                      }}
                      className={inputCls + " font-mono tracking-widest"}
                      required
                    />
                  )}
                </div>

                {/* Emergency contact */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Phone className="w-3 h-3" /> Emergency Contact
                  </label>
                  <input
                    type="tel"
                    placeholder="Emergency phone number"
                    value={suEmergency}
                    onChange={(e) => setSuEmergency(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className={inputCls}
                    required
                  />
                </div>

                {/* State */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <MapPin className="w-3 h-3" /> State / Region
                  </label>
                  <button
                    type="button"
                    onClick={() => setSuStateOpen(!suStateOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted border border-border rounded-xl text-sm hover:bg-secondary transition-all"
                  >
                    <span className={suState ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {suState || "Select your state"}
                    </span>
                    <motion.div animate={{ rotate: suStateOpen ? 180 : 0 }}>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {suStateOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto p-2 border border-border rounded-xl bg-muted/30 mt-1">
                          {indianStates.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => { setSuState(s); setSuStateOpen(false); }}
                              className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${suState === s
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                                }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Lock className="w-3 h-3" /> Set Password
                  </label>
                  <div className="relative mb-2">
                    <input
                      type={showSuPass ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={suPass}
                      onChange={(e) => setSuPass(e.target.value)}
                      className={inputCls + " pr-11"}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSuPass(!showSuPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSuPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <input
                    type={showSuPass ? "text" : "password"}
                    placeholder="Confirm password"
                    value={suConfirm}
                    onChange={(e) => setSuConfirm(e.target.value)}
                    className={inputCls}
                    required
                  />
                  {suConfirm && suPass !== suConfirm && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                  )}
                  {suConfirm && suPass === suConfirm && suConfirm.length > 0 && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={suLoading}
                  className="w-full glow-button rounded-xl py-3 font-display text-xs tracking-widest uppercase text-primary-foreground font-bold disabled:opacity-70"
                >
                  {suLoading ? "Creating account..." : "Create Account & Continue"}
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Log In
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default UserLogin;
