import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, MapPin, Lock } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.img
          src={heroBg}
          alt=""
          className="w-full h-full object-cover opacity-40"
          animate={{ 
            rotate: 360,
            scale: [1.2, 1.4, 1.2]
          }}
          transition={{ 
            rotate: { duration: 120, repeat: Infinity, ease: "linear" },
            scale: { duration: 20, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="w-10 h-10 text-primary" />
            <span className="blockchain-badge">
              <Lock className="w-3 h-3" />
              Secured by Blockchain
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold glow-text mb-6 tracking-wider">
            GeoSentinel
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-2 max-w-xl mx-auto">
            AI-powered geofencing and blockchain-secured tourist safety monitoring
          </p>

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-12">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" /> Real-time Tracking
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" /> Geofence Alerts
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-primary" /> Tamper-proof Logs
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <button
            onClick={() => navigate("/select-role")}
            className="glow-button px-10 py-4 rounded-xl font-display text-sm tracking-widest uppercase text-primary-foreground font-bold"
          >
            Get Started
          </button>
        </motion.div>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </div>
  );
};

export default Landing;
