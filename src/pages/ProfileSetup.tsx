import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, User, Fingerprint, Check, Map as MapIcon, Shield, Phone } from "lucide-react";
import { toast } from "sonner";
import { usersApi } from "@/lib/api";

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

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<"indian" | "foreigner">("indian");
  const [aadhaar, setAadhaar] = useState("");
  const [passport, setPassport] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const formatAadhaar = (val: string) => {
    const rawDigits = val.replace(/\D/g, "").slice(0, 12);
    const groups = rawDigits.match(/.{1,4}/g);
    return groups ? groups.join(" ") : rawDigits;
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAadhaar(e.target.value);
    setAadhaar(formatted);
  };

  const handlePassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();
    if (val.length === 0) {
      setPassport("");
      return;
    }
    
    const letter = val.charAt(0);
    if (/[A-Z]/.test(letter)) {
      const numbers = val.slice(1).replace(/\D/g, "").slice(0, 7);
      setPassport(letter + numbers);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationGranted(true);
        toast.success("Location access granted");
      },
      () => {
        toast.error("Unable to retrieve your location. Please check permissions.");
      }
    );
  };

  useEffect(() => {
    if (!localStorage.getItem("userToken")) {
      navigate("/login/user");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error("Please enter your name");
    if (userType === "indian") {
      if (aadhaar.replace(/\s/g, "").length !== 12) return toast.error("Aadhaar must be 12 digits");
    } else {
      if (passport.length !== 8) return toast.error("Passport must be 1 letter followed by 7 digits");
    }
    if (emergencyContact.length < 10) return toast.error("Please enter a valid emergency contact number");
    if (!selectedState) return toast.error("Please select your state");
    if (!locationGranted) return toast.error("Please grant location access");

    setSaving(true);
    try {
      await usersApi.saveProfile({
        name,
        userType,
        identity: userType === "indian" ? aadhaar : passport,
        emergencyContact,
        state: selectedState,
        coords: coords ?? undefined,
      });
      toast.success("Profile setup complete!");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-pattern p-4 md:p-8 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="bg-primary/5 p-8 border-b border-border">
          <h2 className="font-display text-2xl font-bold glow-text mb-2 text-center text-primary">Complete Your Profile</h2>
          <p className="text-muted-foreground text-center text-sm">Secure your account with identity and location details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* User Type Selection */}
          <div className="flex p-1 bg-muted rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setUserType("indian")}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                userType === "indian" 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Indian Citizen
            </button>
            <button
              type="button"
              onClick={() => setUserType("foreigner")}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                userType === "foreigner" 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Foreigner
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="w-3 h-3" /> Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                required
              />
            </div>

            {/* Identity Input */}
            <div className="space-y-2">
              {userType === "indian" ? (
                <>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Fingerprint className="w-3 h-3" /> Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={aadhaar}
                    onChange={handleAadhaarChange}
                    placeholder="0000 0000 0000"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono tracking-widest"
                    required
                  />
                </>
              ) : (
                <>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Passport Number
                  </label>
                  <input
                    type="text"
                    value={passport}
                    onChange={handlePassportChange}
                    placeholder="A1234567"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono tracking-widest"
                    required
                  />
                </>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Phone className="w-3 h-3" /> Emergency Contact Number
            </label>
            <input
              type="tel"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Enter emergency phone number"
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
              required
            />
          </div>

          {/* State Selection */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setIsStateOpen(!isStateOpen)}
              onMouseEnter={() => setIsStateOpen(true)}
              className="w-full text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between p-4 bg-muted/50 border border-border rounded-2xl hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-2">
                <MapIcon className="w-3 h-3 group-hover:text-primary transition-colors" /> 
                <span>Select Your State <span className="text-primary ml-2">{selectedState && `(${selectedState})`}</span></span>
              </div>
              <motion.div animate={{ rotate: isStateOpen ? 180 : 0 }}>
                <Check className={`w-4 h-4 transition-colors ${selectedState ? "text-primary" : "text-muted-foreground"}`} />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {isStateOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 border border-border rounded-2xl bg-muted/30 scrollbar-thin">
                    {indianStates.map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => {
                          setSelectedState(state);
                          setIsStateOpen(false);
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                          selectedState === state
                            ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                            : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50"
                        }`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Location Access */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Location Verification
            </label>
            <div 
              onClick={requestLocation}
              className={`w-full p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-3 ${
                locationGranted 
                  ? "border-primary/50 bg-primary/5" 
                  : "border-border hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              <div className={`p-3 rounded-full ${locationGranted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {locationGranted ? <Check className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
              </div>
              <div className="text-center">
                <p className={`font-bold text-sm ${locationGranted ? "text-primary" : "text-foreground"}`}>
                  {locationGranted ? "Location Access Secured" : "Grant Location Access"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Required for emergency verification and local travel spots
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full glow-button rounded-2xl py-4 font-display text-sm tracking-widest uppercase text-primary-foreground font-bold shadow-xl overflow-hidden group relative disabled:opacity-70"
          >
            <span className="relative z-10">{saving ? "Saving..." : "Finalize Profile & Discover Spots"}</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileSetup;
