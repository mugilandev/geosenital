import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Bell, User, Shield, ChevronRight, Lock, Camera, X, MapPin, Mic, Search, Globe, IndianRupee, RefreshCw, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

// ─── LiveClock with timezone selector ────────────────────────────────────────
type TZ = "IST" | "UTC" | "GMT";

const tzOffsets: Record<TZ, number> = { IST: 5.5, UTC: 0, GMT: 0 };
const tzLabels: Record<TZ, string> = {
  IST: "IST — India Standard Time",
  UTC: "UTC — Coordinated Universal Time",
  GMT: "GMT — Greenwich Mean Time",
};

export const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  const [tz, setTz] = useState<TZ>("IST");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getAdjustedTime = () => {
    const utcMs = time.getTime() + time.getTimezoneOffset() * 60000;
    return new Date(utcMs + tzOffsets[tz] * 3600000);
  };

  const t = getAdjustedTime();

  const selectTz = (zone: TZ) => {
    setTz(zone);
    setShowPicker(false);
    toast.success(`Timezone set to ${zone}`);
  };

  return (
    <div className="relative">
      <div
        onClick={() => setShowPicker((v) => !v)}
        className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors border border-transparent"
      >
        <Clock className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <p className="font-display text-lg font-semibold text-foreground">
            {t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{tz}</span>
      </div>

      <AnimatePresence>
        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute left-0 right-0 mt-2 glass-card glow-border p-3 z-50 space-y-1"
            >
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2 flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Select Timezone
              </p>
              {(["IST", "UTC", "GMT"] as TZ[]).map((zone) => (
                <button
                  key={zone}
                  onClick={() => selectTz(zone)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    tz === zone
                      ? "bg-primary/20 text-primary font-bold"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <span>{tzLabels[zone]}</span>
                  {tz === zone && <span className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── NotificationBell ─────────────────────────────────────────────────────────
export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    "⚠️ Geofence alert near Restricted Zone A",
    "✅ SOS #1024 resolved by admin",
    "📍 New safety checkpoint added",
  ]);
  const [unread, setUnread] = useState(true);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) setUnread(false);
  };

  const dismiss = (i: number) => setNotifications((n) => n.filter((_, idx) => idx !== i));

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
        <Bell className="w-5 h-5 text-foreground" />
        {unread && notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-12 w-72 glass-card glow-border p-3 space-y-2 z-50"
            >
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Notifications</p>
              {notifications.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">All clear ✅</p>
              )}
              {notifications.map((n, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-foreground p-2 rounded-lg bg-secondary/50">
                  <span className="flex-1">{n}</span>
                  <button onClick={() => dismiss(i)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── UserProfile ──────────────────────────────────────────────────────────────
export const UserProfile = ({ profile: profileProp }: { profile?: { name: string; state: string; pfp?: string } | null }) => {
  const [profile, setProfile] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (profileProp) {
      const stored = localStorage.getItem("userProfile");
      let pfp: string | undefined;
      if (stored) try { const p = JSON.parse(stored); pfp = p.pfp; } catch { /* ignore */ }
      setProfile({ ...profileProp, pfp });
    } else {
      const data = localStorage.getItem("userProfile");
      if (data) try { setProfile(JSON.parse(data)); } catch { /* ignore */ }
    }
  }, [profileProp]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        toast.info(`You said: "${transcript}"`);
        const utterance = new SpeechSynthesisUtterance(
          "I'm GeoSentinel. In an emergency, press the SOS button. To explore spots, scroll down and click any location."
        );
        window.speechSynthesis.speak(utterance);
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed") toast.error("Microphone access denied");
      };
    }
  }, []);

  const toggleListening = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!recognitionRef.current) { toast.error("Speech recognition not supported"); return; }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("🎤 Listening... speak now");
      } catch (err) { console.error(err); }
    }
  };

  const handlePfpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { toast.error("Image size should be less than 2MB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newProfile = { ...profile, pfp: base64 };
        setProfile(newProfile);
        try { localStorage.setItem("userProfile", JSON.stringify(newProfile)); } catch { /* quota */ }
        toast.success("Profile picture updated");
      };
      reader.readAsDataURL(file);
    }
  };

  if (!profile) return null;

  return (
    <div className="relative">
      <div
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 p-1.5 md:p-2 rounded-xl hover:bg-secondary transition-all cursor-pointer border border-transparent hover:border-border/50 group"
      >
        <button
          onClick={toggleListening}
          title={isListening ? "Stop listening" : "Voice assistant"}
          className={`p-2 rounded-lg transition-all ${isListening ? "bg-primary text-primary-foreground animate-pulse shadow-glow" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
        >
          <Mic className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/20 group-hover:border-primary/50 transition-colors">
          {profile.pfp ? <img src={profile.pfp} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary" />}
        </div>
        <div className="hidden md:block text-left mr-2">
          <p className="text-xs font-bold text-foreground leading-tight">{profile.name}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{profile.state}</p>
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setShowDetails(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-14 w-64 glass-card glow-border p-5 z-50 overflow-hidden shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-inner">
                    {profile.pfp ? <img src={profile.pfp} alt="PFP" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-primary/50" />}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform cursor-pointer">
                    <Camera className="w-4 h-4" />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePfpChange} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display text-lg font-bold text-foreground leading-none">{profile.name}</h4>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs font-medium">{profile.state}</span>
                  </div>
                </div>
                <div className="w-full pt-4 border-t border-border/50">
                  <button
                    onClick={() => {
                      try { localStorage.removeItem("userProfile"); localStorage.removeItem("userToken"); } catch { /* ignore */ }
                      window.location.href = "/";
                    }}
                    className="w-full py-2.5 rounded-xl border border-destructive/20 text-destructive text-xs font-bold uppercase tracking-widest hover:bg-destructive/10 transition-colors"
                  >
                    Reset Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── SafetyTips with popup ────────────────────────────────────────────────────
const ALL_TIPS = [
  "Always share your live location with a trusted contact while traveling.",
  "Keep emergency numbers saved offline on your device.",
  "Avoid restricted zones marked with red geofences.",
  "Use the SOS button in any emergency — it notifies authorities instantly.",
  "Long-press the map to drop an emergency pin at any location.",
  "Click any popular spot to see the best route from your current location.",
  "Charge your phone fully before heading to remote areas.",
  "Carry a physical map as backup in low-signal zones.",
  "Inform your hotel / family about your daily itinerary.",
  "Stay on marked trails in forest / wildlife areas.",
];

export const SafetyTips = () => {
  const [current, setCurrent] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrent((c) => (c + 1) % ALL_TIPS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Card — clickable */}
      <div
        onClick={() => setShowAll(true)}
        className="glass-card p-4 cursor-pointer hover:border-primary/30 border border-transparent transition-colors"
      >
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-display text-xs tracking-wider text-primary uppercase">Safety Tip</span>
          <span className="ml-auto text-[10px] text-muted-foreground">tap for all →</span>
        </div>
        <motion.p
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm text-muted-foreground"
        >
          {ALL_TIPS[current]}
        </motion.p>
      </div>

      {/* Popup overlay */}
      <AnimatePresence>
        {showAll && (
          <>
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowAll(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-md glass-card glow-border p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-sm font-bold tracking-wider text-foreground uppercase">All Safety Tips</h3>
                  </div>
                  <button onClick={() => setShowAll(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {ALL_TIPS.map((tip, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-secondary/50">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <p className="text-sm text-foreground">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── CurrencyConverter ───────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸", rate: 83.5 },
  { code: "EUR", name: "Euro", flag: "🇪🇺", rate: 90.2 },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", rate: 105.8 },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", rate: 0.56 },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺", rate: 54.3 },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦", rate: 61.7 },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬", rate: 62.4 },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭", rate: 93.1 },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳", rate: 11.5 },
  { code: "KRW", name: "South Korean Won", flag: "🇰🇷", rate: 0.063 },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪", rate: 22.7 },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦", rate: 22.3 },
];

export const CurrencyConverter = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [lastUpdated] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  });
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const inrValue = parseFloat(amount || "0") * selectedCurrency.rate;
  const displayINR = isNaN(inrValue) ? "0.00" : inrValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="relative">
      {/* Floating trigger badge */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Currency Converter"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg border ${
          open
            ? "bg-amber-500 text-white border-amber-400 shadow-amber-500/40"
            : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50"
        }`}
      >
        <IndianRupee className="w-3.5 h-3.5" />
        <span>Convert</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-10 w-80 glass-card glow-border p-5 z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-widest">Currency Converter</p>
                  <p className="text-[9px] text-muted-foreground flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5" /> Rates updated {lastUpdated}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Amount input */}
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400">{selectedCurrency.flag}</span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-9 pr-16 py-3 text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  placeholder="Enter amount"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{selectedCurrency.code}</span>
              </div>

              {/* INR Result */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">INR</span>
                </div>
                <span className="text-lg font-bold text-amber-400">₹{displayINR}</span>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                1 {selectedCurrency.code} = ₹{selectedCurrency.rate.toFixed(2)}
              </p>
            </div>

            {/* Currency selector grid */}
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Select Currency</p>
              <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setSelectedCurrency(c)}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs transition-all border ${
                      selectedCurrency.code === c.code
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-bold"
                        : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="font-bold text-[10px]">{c.code}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
              * Indicative rates only. For exact rates, check your bank.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── BlockchainBadge ──────────────────────────────────────────────────────────
export const BlockchainBadge = () => (
  <div className="blockchain-badge">
    <Lock className="w-3 h-3" />
    Secured by Blockchain
  </div>
);

// ─── SearchBar ────────────────────────────────────────────────────────────────
interface SearchBarProps {
  allSpots: string[];
  onSpotSelect: (spot: string) => void;
}

export const SearchBar = ({ allSpots, onSpotSelect }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = allSpots
    .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const handleSelect = (spot: string) => {
    setQuery(spot);
    setShowSuggestions(false);
    onSpotSelect(spot);
    toast.success(`Navigating to ${spot}`);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search spots, cities..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="w-full bg-muted border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {query && (
          <button
            onMouseDown={() => { setQuery(""); setShowSuggestions(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && query && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-2 glass-card glow-border p-2 z-50 max-h-56 overflow-y-auto"
          >
            {filtered.map((spot) => (
              <button
                key={spot}
                onMouseDown={() => handleSelect(spot)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-foreground hover:bg-primary/10 transition-colors text-left"
              >
                <MapPin className="w-3 h-3 text-primary shrink-0" />
                {spot}
                <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
