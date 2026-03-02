import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mic, ShieldAlert, AlertCircle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { sosApi } from "@/lib/api";

const SOSButton = () => {
  const [active, setActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [info, setInfo] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [status, setStatus] = useState<"idle" | "select" | "sos_overlay" | "sus_overlay" | "counting" | "dispatched_sos" | "dispatched_sus">("idle");
  const [isCheckInActive, setIsCheckInActive] = useState(false);
  const [checkInCount, setCheckInCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [isFakeCallActive, setIsFakeCallActive] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [beaconIntervalId, setBeaconIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [beaconCount, setBeaconCount] = useState(0);
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const [isHandsFree, setIsHandsFree] = useState(false);
  const recognitionRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.continuous = false; // We'll restart for better control
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        setVoiceFeedback(transcript);
        
        // Keyword Detection
        if (transcript.includes("sos") || transcript.includes("help")) {
          setStatus("sos_overlay");
          toast.info("Voice Command: SOS Overlay Active");
        } else if (transcript.includes("suspicious") || transcript.includes("report")) {
          setStatus("sus_overlay");
          toast.info("Voice Command: SUS Overlay Active");
        } else if (transcript.includes("confirm") || transcript.includes("send")) {
          if (status === "sos_overlay") sendSOS();
          else if (status === "sus_overlay") sendSUS();
          toast.success("Voice Command: Dispatching Alert...");
        } else if (transcript.includes("cancel") || transcript.includes("stop")) {
          cancelSOS();
          toast.info("Voice Command: Action Cancelled");
        } else {
          // General Dictation
          setInfo(prev => prev + (prev ? " " : "") + transcript);
        }
        
        setIsListening(false);
        // If hands-free, restart listening after a short delay
        if (isHandsFree && active) {
          setTimeout(() => recognitionRef.current?.start(), 1000);
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (isHandsFree && active && status !== "dispatched_sos" && status !== "dispatched_sus") {
          recognitionRef.current?.start();
          setIsListening(true);
        }
      };

      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, [active, status, isHandsFree]); // Depend on state to re-bind handlers with fresh closures if needed

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return toast.error("Speech recognition not supported");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info("Listening...");
    }
  };

  const playSound = (type: "countdown" | "alert") => {
    const audio = new Audio(
      type === "countdown"
        ? "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"
        : "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3",
    );
    audio.play().catch(() => {});
  };

  const clearSOS = useCallback(() => {
    if (intervalId) clearInterval(intervalId);
    if (beaconIntervalId) clearInterval(beaconIntervalId);
    setIntervalId(null);
    setBeaconIntervalId(null);
    setBeaconCount(0);
    setStatus("idle");
    setActive(false);
    setShowStatusPanel(false);
    setIsCheckInActive(false);
    toast.success("Security status reset to idle");
  }, [intervalId, beaconIntervalId]);

  const getCoords = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  }, []);

  const dispatchNow = useCallback(async () => {
    if (intervalId) clearInterval(intervalId);
    setCountdown(0);
    setStatus("dispatched_sos");
    playSound("alert");
    setShowStatusPanel(true);

    const coords = await getCoords();
    try {
      await sosApi.create({
        lat: coords?.lat,
        lng: coords?.lng,
        type: "emergency",
        info: info || "No dictated details",
        isEmergency: true,
      });
    } catch (e) {
      console.warn("SOS API call failed:", e);
    }

    setTimeout(() => {
      if (status === "dispatched_sos" || isStealthMode) {
        setActive(false);
      }
    }, 2500);

    setBeaconCount(0);
    const bId = setInterval(() => {
      setBeaconCount((prev) => prev + 1);
    }, 5000);
    setBeaconIntervalId(bId);
  }, [info, isEmergency, intervalId, status, isStealthMode, getCoords]);

  const sendSOS = () => {
    if (isEmergency) {
      setStatus("counting");
      setCountdown(5);
      playSound("countdown");
      
      let count = 5;
      const id = setInterval(() => {
        count--;
        setCountdown(count);
        if (count > 0) playSound("countdown");
        if (count <= 0) {
          clearInterval(id);
          dispatchNow();
        }
      }, 1000);
      setIntervalId(id);
    } else {
      dispatchNow();
    }
  };

  const sendSUS = async () => {
    setStatus("dispatched_sus");
    playSound("alert");
    setShowStatusPanel(true);

    const coords = await getCoords();
    try {
      await sosApi.create({
        lat: coords?.lat,
        lng: coords?.lng,
        type: "standard",
        info: info || "Suspicious activity reported",
      });
    } catch (e) {
      console.warn("SUS API call failed:", e);
    }

    setBeaconCount(0);
    const bId = setInterval(() => {
      setBeaconCount((prev) => prev + 1);
    }, 8000);
    setBeaconIntervalId(bId);

    setTimeout(() => {
      setActive(false);
      startCheckInLoop();
    }, 3000);
  };

  const startCheckInLoop = () => {
    setCheckInCount(0);
    setIsCheckInActive(true);
  };

  const handleCheckInResponse = (safe: boolean) => {
    setIsCheckInActive(false);
    if (!safe) {
      // Escalate to SOS
      setIsEmergency(true);
      setActive(true);
      setStatus("sos_overlay");
      sendSOS();
    } else {
      const nextCount = checkInCount + 1;
      if (nextCount < 10) {
        setCheckInCount(nextCount);
        setTimeout(() => setIsCheckInActive(true), 10000);
      } else {
        toast.success("Security check-in sequence completed");
      }
    }
  };

  const triggerSOS = () => {
    setActive(true);
    setStatus("select");
    setCountdown(5);
    setInfo("");
    setVoiceFeedback("");
    setIsEmergency(false);
    // Optional: Start listening immediately for hands-free transition
    if (isHandsFree) {
      setTimeout(() => {
        recognitionRef.current?.start();
        setIsListening(true);
      }, 500);
    }
  };

  const cancelSOS = () => {
    if (intervalId) clearInterval(intervalId);
    if (beaconIntervalId) clearInterval(beaconIntervalId);
    setBeaconCount(0);
    setActive(false);
    setStatus("idle");
    setIsCheckInActive(false);
  };

  return (
    <>
      {/* Floating SOS button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={triggerSOS}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-destructive flex items-center justify-center sos-pulse shadow-2xl"
      >
        <span className="font-display text-sm font-bold text-destructive-foreground">
          SOS
        </span>
      </motion.button>

      {/* SOS overlay */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              // Dismiss SOS only on outside click
              if (overlayRef.current && !overlayRef.current.contains(e.target as Node) && status.includes("sos")) {
                setActive(false);
              }
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
          >
            <motion.div
              ref={overlayRef}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`glass-card glow-border p-10 text-center max-w-sm relative ${
                isStealthMode && (status === "dispatched_sos" || status === "counting") ? "opacity-0 pointer-events-none" : ""
              }`}
            >
              {status === "select" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      Safety Protocol
                    </h3>
                    <button
                      onClick={() => {
                        const next = !isHandsFree;
                        setIsHandsFree(next);
                        if (next) {
                          recognitionRef.current?.start();
                          setIsListening(true);
                          toast.info("Hands-Free Voice Control Enabled");
                        } else {
                          recognitionRef.current?.stop();
                          setIsListening(false);
                          toast.info("Hands-Free Disabled");
                        }
                      }}
                      className={`p-2 rounded-lg border transition-all ${isHandsFree ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"}`}
                      title="Toggle Hands-Free Voice Control"
                    >
                      <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
                    </button>
                  </div>
                  
                  {isListening && (
                    <div className="mb-4 py-1 px-3 bg-primary/5 rounded-full border border-primary/20">
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest animate-pulse flex items-center gap-2 justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Listening for commands: "SOS", "SUS", "Cancel"
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => setStatus("sos_overlay")}
                      className="w-full p-6 rounded-2xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 transition-all group flex items-center justify-between"
                    >
                      <div className="text-left">
                        <span className="block text-lg font-bold text-destructive group-hover:scale-105 transition-transform">SOS</span>
                        <span className="text-xs text-muted-foreground">Critical Emergency</span>
                      </div>
                      <ShieldAlert className="w-8 h-8 text-destructive opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                    
                    <button
                      onClick={() => setStatus("sus_overlay")}
                      className="w-full p-6 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all group flex items-center justify-between"
                    >
                      <div className="text-left">
                        <span className="block text-lg font-bold text-primary group-hover:scale-105 transition-transform">SUS</span>
                        <span className="text-xs text-muted-foreground">Suspicious Behavior</span>
                      </div>
                      <AlertCircle className="w-8 h-8 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                    
                    <button
                      onClick={cancelSOS}
                      className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}

              {status === "sos_overlay" && (
                <>
                  <h3 className="font-display text-2xl font-bold text-destructive mb-2 text-left">
                    SOS Confirmation
                  </h3>
                  <div className="space-y-4 mb-6 text-left">
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1 block">
                        Emergency Details
                      </label>
                      <textarea
                        value={info}
                        onChange={(e) => setInfo(e.target.value)}
                        placeholder="What's happening?"
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-destructive/50 h-20 resize-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isEmergency}
                            onChange={(e) => setIsEmergency(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-10 h-5 bg-border rounded-full peer-checked:bg-destructive transition-colors" />
                          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                        </div>
                        <span className="text-sm font-medium text-foreground group-hover:text-destructive transition-colors">
                          Critical Emergency SOS
                        </span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isStealthMode}
                            onChange={(e) => setIsStealthMode(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-10 h-5 bg-border rounded-full peer-checked:bg-primary transition-colors" />
                          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                        </div>
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          Stealth SOS (Silent Alarm)
                        </span>
                      </label>
                    </div>
                    {voiceFeedback && (
                      <div className="px-2 py-1 bg-destructive/10 rounded text-[10px] text-destructive italic">
                        Recently heard: "{voiceFeedback}"
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStatus("select")}
                      className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-secondary transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={sendSOS}
                      className="flex-1 px-4 py-2 rounded-lg bg-destructive text-white text-sm font-bold hover:bg-destructive/90 transition-colors"
                    >
                      Confirm SOS
                    </button>
                  </div>
                </>
              )}

              {status === "sus_overlay" && (
                <>
                  <h3 className="font-display text-2xl font-bold text-primary mb-2 text-left">
                    Report SUS Activity
                  </h3>
                  <div className="space-y-4 mb-6 text-left">
                    <div className="relative">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1 block">
                        What happened?
                      </label>
                      <textarea
                        value={info}
                        onChange={(e) => setInfo(e.target.value)}
                        placeholder="Describe the suspicious activity..."
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-32 resize-none pr-12"
                      />
                      <button
                        type="button"
                        onClick={toggleVoiceInput}
                        className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${
                          isListening ? "bg-primary text-primary-foreground animate-pulse shadow-glow" : "bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20"
                        }`}
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    </div>
                    {voiceFeedback && (
                      <div className="px-2 py-1 bg-primary/10 rounded text-[10px] text-primary italic">
                        Recently heard: "{voiceFeedback}"
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setIsFakeCallActive(true)}
                      className="w-full py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Phone className="w-3 h-3" /> Trigger Fake Call
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setStatus("select")}
                        className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-secondary transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={sendSUS}
                        className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                      >
                        Send Alert
                      </button>
                    </div>
                  </div>
                </>
              )}

              {status === "counting" && (
                <>
                  <h3 className="font-display text-2xl font-bold text-destructive mb-2">
                    Sending in {countdown}...
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Critical SOS requested. Preparing high-priority dispatch.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelSOS}
                      className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-secondary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={dispatchNow}
                      className="flex-1 px-4 py-2 rounded-lg bg-destructive text-white text-sm font-bold hover:bg-destructive/90 transition-colors"
                    >
                      Send Now
                    </button>
                  </div>
                </>
              )}

              {status === "dispatched_sos" && (
                <>
                  <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-destructive mb-2">
                    SOS ACTIVE
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Beacon is pulsing. Help is on the way.
                  </p>
                  {beaconCount >= 10 ? (
                    <button
                      onClick={clearSOS}
                      className="w-full py-3 rounded-xl bg-destructive text-white font-bold uppercase tracking-widest hover:bg-destructive/90 transition-all"
                    >
                      Clear Alert
                    </button>
                  ) : (
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                      Establishing Secure Clear Channel ({beaconCount}/10)
                    </div>
                  )}
                </>
              )}

              {status === "dispatched_sus" && (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-primary mb-2">
                    SUS ACTIVE
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Monitoring situation. Admin alerted.
                  </p>
                  {beaconCount >= 10 ? (
                    <button
                      onClick={clearSOS}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest hover:bg-primary/90 transition-all"
                    >
                      Clear Alert
                    </button>
                  ) : (
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                      Processing Surveillance Data ({beaconCount}/10)
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Are You OK? Check-in Overlay */}
      <AnimatePresence>
        {isCheckInActive && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-[110] w-72 glass-card glow-border p-6 shadow-2xl overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-foreground leading-none">Security Check</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Verification {checkInCount + 1}/10</p>
                </div>
              </div>
              
              <p className="text-sm font-medium text-foreground mb-6">
                Are you okay? No intervention required?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleCheckInResponse(false)}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-widest hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20"
                >
                  No
                </button>
                <button
                  onClick={() => handleCheckInResponse(true)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Yes
                </button>
              </div>
            </div>
            
            {/* Background progress bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full overflow-hidden">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 10, ease: "linear" }}
                className="h-full bg-primary"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Floating Status Panel */}
      <AnimatePresence>
        {showStatusPanel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-[120] w-72 glass-card border-primary/40 p-4 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${status.includes("sos") ? "bg-destructive" : "bg-primary"}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {status.includes("sos") ? "SOS Active" : "SUS Monitoring"}
                </span>
              </div>
              <button 
                onClick={clearSOS}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Beacons Transmitted</span>
                <span className="font-mono font-bold text-foreground">{beaconCount}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Mic className="w-3 h-3 text-red-500 animate-pulse" />
                <span className="text-[10px] font-medium text-red-500 uppercase tracking-wider">🔴 Recording Audio Evidence</span>
              </div>

              <div className="pt-2 border-t border-border/50">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Nearest Safe Haven</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Central Police Station</span>
                  <span className="text-[10px] text-primary font-bold">0.8km</span>
                </div>
              </div>
            </div>
            
            <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div 
                animate={{ width: ["0%", "100%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className={`h-full ${status.includes("sos") ? "bg-destructive" : "bg-primary"}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fake Call Overlay */}
      <AnimatePresence>
        {isFakeCallActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-between py-20"
          >
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-6">
                <UserProfileIcon className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-white">Mom</h2>
              <p className="text-muted-foreground animate-pulse">Incoming Call...</p>
            </div>

            <div className="flex gap-20">
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={() => setIsFakeCallActive(false)}
                  className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                >
                  <Phone className="w-8 h-8 text-white rotate-[135deg]" />
                </button>
                <span className="text-xs text-muted-foreground font-medium">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={() => setIsFakeCallActive(false)}
                  className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                >
                  <Phone className="w-8 h-8 text-white" />
                </button>
                <span className="text-xs text-muted-foreground font-medium">Accept</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const UserProfileIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default SOSButton;
