import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, MapPin, Compass, Star, Navigation, X, Layers, Map, CheckSquare, Square, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import MapView from "@/components/MapView";
import SOSButton from "@/components/SOSButton";
import { toast } from "sonner";
import { usersApi, dataApi, authApi } from "@/lib/api";
import {
  LiveClock,
  NotificationBell,
  UserProfile,
  SafetyTips,
  BlockchainBadge,
  SearchBar,
  CurrencyConverter,
} from "@/components/DashboardWidgets";

const defaultDangerZones = [
  // ── Delhi / NCR ──
  { lat: 28.62, lng: 77.22, radius: 600, name: "Yamuna Flood Plain", type: "water" },
  { lat: 28.60, lng: 77.20, radius: 350, name: "Active Construction Zone", type: "danger" },
  { lat: 28.53, lng: 77.24, radius: 450, name: "Okhla Wetland Reserve", type: "restricted" },
  { lat: 28.664, lng: 77.099, radius: 800, name: "Delhi Cantonment – No Entry", type: "military" },

  // ── Rajasthan ──
  { lat: 26.916, lng: 70.908, radius: 5000, name: "Pokhran Nuclear Test Site", type: "military" },
  { lat: 27.40, lng: 73.10, radius: 3000, name: "Thar Desert Military Zone", type: "military" },

  // ── Jammu & Kashmir / LoC ──
  { lat: 34.08, lng: 74.79, radius: 2500, name: "LoC Buffer Zone – Restricted", type: "military" },
  { lat: 33.92, lng: 74.55, radius: 2000, name: "Kargil War Memorial Zone", type: "restricted" },

  // ── Northeast ──
  { lat: 26.58, lng: 93.17, radius: 2000, name: "Kaziranga Core Forest – No Entry", type: "restricted" },
  { lat: 27.04, lng: 93.70, radius: 1500, name: "AFSPA Zone – Entry Restricted", type: "military" },

  // ── Eastern / Andaman ──
  { lat: 11.90, lng: 92.76, radius: 3000, name: "North Sentinel Island – Prohibited", type: "military" },
  { lat: 21.95, lng: 89.18, radius: 2500, name: "Sundarbans Tiger Reserve Core", type: "restricted" },

  // ── Western Coast ──
  { lat: 15.49, lng: 73.82, radius: 800, name: "INS Mandovi Naval Base", type: "military" },
  { lat: 20.27, lng: 85.84, radius: 1000, name: "Chilika Cyclone Surge Zone", type: "water" },

  // ── South ──
  { lat: 9.58, lng: 77.22, radius: 1200, name: "Periyar Wildlife Core Reserve", type: "restricted" },
];

const touristSpotsByState: Record<string, string[]> = {
  "Andhra Pradesh": ["Tirupati", "Araku Valley", "Borra Caves", "Amaravati"],
  "Arunachal Pradesh": ["Tawang Monastery", "Ziro Valley", "Namdapha National Park"],
  "Assam": ["Kaziranga National Park", "Kamakhya Temple", "Majuli Island"],
  "Bihar": ["Bodh Gaya", "Nalanda", "Mahabodhi Temple", "Vishnupad Temple"],
  "Chhattisgarh": ["Chitrakote Falls", "Bhoramdeo Temple", "Mainpat"],
  "Goa": ["Baga Beach", "Basilica of Bom Jesus", "Dudhsagar Falls", "Calangute"],
  "Gujarat": ["Rann of Kutch", "Gir National Park", "Somnath Temple", "Dwarka"],
  "Haryana": ["Sultanpur Bird Sanctuary", "Kurukshetra", "Surajkund"],
  "Himachal Pradesh": ["Manali", "Shimla", "Dharamshala", "Spiti Valley"],
  "Jharkhand": ["Deoghar", "Hazaribagh", "Dalma Wildlife Sanctuary"],
  "Karnataka": ["Hampi", "Mysore Palace", "Coorg", "Gokarna"],
  "Kerala": ["Munnar", "Alleppey Backwaters", "Wayanad", "Thekkady"],
  "Madhya Pradesh": ["Khajuraho", "Kanha National Park", "Gwalior Fort", "Pachmarhi"],
  "Maharashtra": ["Ajanta & Ellora Caves", "Gateway of India", "Mahabaleshwar", "Lonavala"],
  "Manipur": ["Loktak Lake", "Kangla Fort", "Imphal"],
  "Meghalaya": ["Shillong", "Cherrapunji", "Dawki River", "Living Root Bridge"],
  "Mizoram": ["Aizawl", "Reiek Tlang", "Tamdil Lake"],
  "Nagaland": ["Kohima", "Dzukou Valley", "Khonoma Village"],
  "Odisha": ["Puri Beach", "Konark Sun Temple", "Chilika Lake", "Bhubaneswar"],
  "Punjab": ["Golden Temple", "Wagah Border", "Jallianwala Bagh"],
  "Rajasthan": ["Amber Fort", "Hawa Mahal", "Jaisalmer Desert", "Udaipur Lakes"],
  "Sikkim": ["Tsomgo Lake", "Gangtok", "Pelling", "Yumthang Valley"],
  "Tamil Nadu": ["Meenakshi Temple", "Ooty", "Kanyakumari", "Mahabalipuram"],
  "Telangana": ["Charminar", "Golconda Fort", "Ramoji Film City"],
  "Tripura": ["Ujjayanta Palace", "Unakoti", "Neermahal"],
  "Uttar Pradesh": ["Taj Mahal", "Varanasi Ghats", "Fatehpur Sikri", "Mathura"],
  "Uttarakhand": ["Rishikesh", "Nainital", "Mussoorie", "Valley of Flowers"],
  "West Bengal": ["Darjeeling", "Victoria Memorial", "Sundarbans"],
  "Delhi": ["Red Fort", "Qutub Minar", "India Gate", "Lotus Temple"],
  "Jammu and Kashmir": ["Srinagar", "Gulmarg", "Pahalgam", "Leh Ladakh"],
  "Ladakh": ["Pangong Lake", "Nubra Valley", "Shanti Stupa"],
};

const allSpotsFlat = Object.values(touristSpotsByState).flat();

const spotCoordinates: Record<string, [number, number]> = {
  "Tirupati": [13.6288, 79.4192],
  "Araku Valley": [18.3333, 82.8667],
  "Borra Caves": [18.2718, 83.0217],
  "Tawang Monastery": [27.5878, 91.8596],
  "Ziro Valley": [27.5434, 93.8252],
  "Kaziranga National Park": [26.5775, 93.1711],
  "Kamakhya Temple": [26.1664, 91.7045],
  "Bodh Gaya": [24.6961, 84.9913],
  "Nalanda": [25.1359, 85.4436],
  "Baga Beach": [15.5553, 73.7517],
  "Dudhsagar Falls": [15.3145, 74.3140],
  "Rann of Kutch": [23.7337, 69.8597],
  "Gir National Park": [21.1243, 70.8242],
  "Somnath Temple": [20.8880, 70.4012],
  "Dwarka": [22.2394, 68.9678],
  "Manali": [32.2432, 77.1892],
  "Shimla": [31.1048, 77.1734],
  "Dharamshala": [32.2190, 76.3234],
  "Spiti Valley": [32.2460, 78.0413],
  "Hampi": [15.3350, 76.4600],
  "Mysore Palace": [12.3051, 76.6551],
  "Coorg": [12.3375, 75.8069],
  "Gokarna": [14.5479, 74.3188],
  "Munnar": [10.0889, 77.0595],
  "Alleppey Backwaters": [9.4981, 76.3388],
  "Wayanad": [11.6854, 76.1320],
  "Thekkady": [9.5986, 77.1698],
  "Khajuraho": [24.8318, 79.9199],
  "Kanha National Park": [22.3369, 80.6116],
  "Gwalior Fort": [26.2183, 78.1828],
  "Pachmarhi": [22.4665, 78.4340],
  "Ajanta & Ellora Caves": [20.5521, 75.7033],
  "Gateway of India": [18.9220, 72.8347],
  "Mahabaleshwar": [17.9307, 73.6477],
  "Lonavala": [18.7481, 73.4072],
  "Loktak Lake": [24.5226, 93.7727],
  "Shillong": [25.5788, 91.8931],
  "Cherrapunji": [25.2842, 91.7260],
  "Dawki River": [25.2014, 92.0231],
  "Puri Beach": [19.7982, 85.8245],
  "Konark Sun Temple": [19.8876, 86.0945],
  "Chilika Lake": [19.7147, 85.3194],
  "Golden Temple": [31.6200, 74.8765],
  "Wagah Border": [31.6044, 74.5735],
  "Amber Fort": [26.9855, 75.8513],
  "Hawa Mahal": [26.9239, 75.8267],
  "Jaisalmer Desert": [26.9157, 70.9083],
  "Udaipur Lakes": [24.5854, 73.7125],
  "Tsomgo Lake": [27.3729, 88.7596],
  "Gangtok": [27.3314, 88.6138],
  "Pelling": [27.2987, 88.2109],
  "Meenakshi Temple": [9.9195, 78.1193],
  "Ooty": [11.4102, 76.6950],
  "Kanyakumari": [8.0883, 77.5385],
  "Mahabalipuram": [12.6269, 80.1927],
  "Charminar": [17.3616, 78.4747],
  "Golconda Fort": [17.3833, 78.4011],
  "Ramoji Film City": [17.2543, 78.6807],
  "Taj Mahal": [27.1751, 78.0421],
  "Varanasi Ghats": [25.3176, 82.9739],
  "Fatehpur Sikri": [27.0945, 77.6597],
  "Mathura": [27.4924, 77.6737],
  "Rishikesh": [30.0869, 78.2676],
  "Nainital": [29.3919, 79.4542],
  "Mussoorie": [30.4598, 78.0664],
  "Valley of Flowers": [30.7283, 79.6058],
  "Darjeeling": [27.0360, 88.2627],
  "Victoria Memorial": [22.5448, 88.3426],
  "Sundarbans": [21.9497, 89.1833],
  "Red Fort": [28.6562, 77.2410],
  "Qutub Minar": [28.5245, 77.1855],
  "India Gate": [28.6129, 77.2295],
  "Lotus Temple": [28.5535, 77.2588],
  "Srinagar": [34.0837, 74.7973],
  "Gulmarg": [34.0484, 74.3805],
  "Pahalgam": [34.0161, 75.3149],
  "Leh Ladakh": [34.1526, 77.5771],
  "Pangong Lake": [33.7700, 78.6462],
  "Nubra Valley": [34.7803, 77.5619],
  "Shanti Stupa": [34.1694, 77.5838],
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dangerZones, setDangerZones] = useState(defaultDangerZones);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.209]);
  const [selectedDestination, setSelectedDestination] = useState<[number, number] | null>(null);
  const [selectedSpotName, setSelectedSpotName] = useState<string>("");
  const [showStateBorders, setShowStateBorders] = useState(false);
  const [showDistrictBorders, setShowDistrictBorders] = useState(false);
  const [showGeofenceOptions, setShowGeofenceOptions] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [modalStage, setModalStage] = useState<1 | 2>(1);

  const anyLayerActive = showStateBorders || showDistrictBorders;

  useEffect(() => {
    if (!localStorage.getItem("userToken")) {
      navigate("/login/user");
      return;
    }
    usersApi
      .getProfile()
      .then((p) => {
        const profile = { ...p, userType: p.userType };
        setUserProfile(profile);
        if (p.coords) setMapCenter([p.coords.lat, p.coords.lng]);
      })
      .catch(() => {
        navigate("/profile-setup");
      });
  }, [navigate]);

  useEffect(() => {
    dataApi.getDangerZones().then((zones) =>
      setDangerZones(zones.map((z) => ({ ...z, type: z.type ?? "danger" })))
    ).catch(() => { });
  }, []);

  const handleSpotClick = (spot: string) => {
    const coords = spotCoordinates[spot];
    if (coords) {
      setMapCenter(coords);
      setSelectedDestination(coords);
      setSelectedSpotName(spot);
      toast.info(`📍 Getting route to ${spot}...`);
      setTimeout(() => document.getElementById("map-container")?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      setModalStage(1);
      setShowMapModal(true);
      toast.info(`Stay with us for better safety! 🛡️`);
    }
  };

  const clearRoute = () => {
    setSelectedDestination(null);
    setSelectedSpotName("");
    if (userProfile?.coords) setMapCenter([userProfile.coords.lat, userProfile.coords.lng]);
    toast.info("Route cleared");
  };


  if (!userProfile) return null;

  const userSpots = touristSpotsByState[userProfile.state] || ["City Center", "Local Parks", "Museums"];
  const spotMarkersForMap = userSpots
    .filter((s) => spotCoordinates[s])
    .map((s) => ({ lat: spotCoordinates[s][0], lng: spotCoordinates[s][1], label: s }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <div className="flex flex-col">
            <h1 className="font-display text-sm font-bold tracking-wider text-foreground leading-none">GeoSentinel</h1>
            <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] mt-1">By Null Hunters</span>
          </div>
          <BlockchainBadge />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="flex flex-col items-end gap-1">
            <UserProfile profile={userProfile ? { name: userProfile.name, state: userProfile.state } : null} />
            {userProfile?.userType === "foreigner" && (
              <div className="pr-1">
                <CurrencyConverter />
              </div>
            )}
          </div>
          <button
            onClick={() => {
              authApi.clearTokens();
              navigate("/");
            }}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-80 space-y-4 flex-shrink-0"
        >
          <SearchBar allSpots={allSpotsFlat} onSpotSelect={handleSpotClick} />
          <LiveClock />
          <SafetyTips />

          {/* Geofences */}
          <div className="glass-card p-4 border border-transparent transition-colors">
            {/* Header — click to toggle options panel */}
            <div
              onClick={() => setShowGeofenceOptions((v) => !v)}
              className="flex items-center gap-2 cursor-pointer mb-3 group"
            >
              <Layers className={`w-3.5 h-3.5 ${anyLayerActive ? "text-primary animate-pulse" : "text-primary"}`} />
              <h3 className="font-display text-xs tracking-wider text-primary uppercase">Active Geofences</h3>
              <span className="ml-auto text-[10px] text-muted-foreground normal-case group-hover:text-foreground transition-colors">
                {showGeofenceOptions ? "hide options ▲" : "tap to select ▼"}
              </span>
            </div>

            {/* Zone list removed for cleaner national view */}

            {/* Layer options panel */}
            {showGeofenceOptions && (
              <div className="border-t border-border/50 pt-3 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 flex items-center gap-1">
                  <Layers className="w-2.5 h-2.5" /> Map Layers
                </p>

                {/* State Border */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !showStateBorders;
                    setShowStateBorders(next);
                    toast.info(next ? "Loading state borders..." : "State borders hidden");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${showStateBorders
                    ? "bg-red-500/15 border-red-500/40 text-red-400"
                    : "bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                >
                  {showStateBorders ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
                  <Map className="w-3 h-3 shrink-0" />
                  State Borders
                  {showStateBorders && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                </button>

                {/* District Border */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !showDistrictBorders;
                    setShowDistrictBorders(next);
                    toast.info(next ? "Loading district borders..." : "District borders hidden");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${showDistrictBorders
                    ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                    : "bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                >
                  {showDistrictBorders ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
                  <Map className="w-3 h-3 shrink-0" />
                  District Borders
                  {showDistrictBorders && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
                </button>
              </div>
            )}
          </div>

          {/* Route active banner */}
          {selectedDestination && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-4 border border-cyan-500/30 bg-cyan-500/5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-cyan-400">Route Active</p>
                    <p className="text-xs text-muted-foreground">{selectedSpotName}</p>
                  </div>
                </div>
                <button onClick={clearRoute} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Explore Widget */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-5 border-primary/20 bg-primary/5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-5 h-5 text-primary animate-spin-slow" />
              <h3 className="font-display text-sm font-bold tracking-wider text-foreground">Explore {userProfile.state}</h3>
            </div>
            <div className="space-y-2">
              {userSpots.map((spot, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 4 }}
                  onClick={() => handleSpotClick(spot)}
                  className={`group flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer border ${selectedSpotName === spot
                    ? "bg-cyan-500/10 border-cyan-500/30"
                    : "hover:bg-primary/10 border-transparent hover:border-primary/20"
                    }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${selectedSpotName === spot ? "bg-cyan-500/20" : "bg-primary/10 group-hover:bg-primary/20"
                    }`}>
                    {selectedSpotName === spot
                      ? <Navigation className="w-4 h-4 text-cyan-400" />
                      : <Star className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-tight truncate">{spot}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                      {spotCoordinates[spot] ? "Click for Route →" : "Popular Spot"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            <button
              onClick={() => {
                setModalStage(1);
                setShowMapModal(true);
              }}
              className="w-full mt-4 py-2 text-xs font-bold uppercase tracking-widest text-primary hover:text-accent transition-colors"
            >
              Open Google Maps ↗
            </button>
          </motion.div>
        </motion.div>

        {/* Map */}
        <motion.div
          id="map-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 glass-card overflow-hidden min-h-[450px] lg:min-h-0 relative"
        >
          {selectedDestination && (
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-cyan-500/30">
              <Navigation className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
              <p className="text-xs font-medium text-foreground truncate">
                Routing to <strong className="text-cyan-400">{selectedSpotName}</strong>
              </p>
              <button onClick={clearRoute} className="ml-auto text-muted-foreground hover:text-foreground shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <MapView
            dangerZones={dangerZones}
            center={mapCenter}
            destination={selectedDestination}
            destinationName={selectedSpotName}
            spotMarkers={spotMarkersForMap}
            showStateBorders={showStateBorders}
            showDistrictBorders={showDistrictBorders}
          />
        </motion.div>
      </div>

      <SOSButton />

      {/* Google Maps Persuasion Modal */}
      <AnimatePresence>
        {showMapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card glow-border p-8 max-w-sm w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldAlert className={`w-8 h-8 text-primary ${modalStage === 1 ? 'animate-bounce' : 'animate-pulse'}`} />
              </div>

              {modalStage === 1 ? (
                <>
                  <h3 className="font-display text-xl font-bold text-foreground leading-tight">
                    Wait! 🛑 GeoSentinel has everything you need to stay safe! 🛡️
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Do you really want to skip the GeoSenitinel and swith to google map? 🗺️
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      onClick={() => setShowMapModal(false)}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
                    >
                      Oh sorry, no! 😅
                    </button>
                    <button
                      onClick={() => setModalStage(2)}
                      className="w-full py-3 rounded-xl border border-border text-muted-foreground font-bold text-sm hover:text-foreground hover:bg-secondary transition-all"
                    >
                      Yes !!! 🛡️
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-display text-2xl font-bold text-foreground leading-tight">
                    Lol, we won't open it! 😂
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Use GeoSentinel for your own safety! 🛡️✨ We promise we're better! 😉
                  </p>

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      onClick={() => setShowMapModal(false)}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
                    >
                      Okay, I'll stay! 🛡️
                    </button>
                  </div>
                </>
              )}

              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium pt-2">
                Stay Safe • Stay with Us • GeoSentinel
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
