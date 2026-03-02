import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, ShieldCheck, ArrowLeft } from "lucide-react";

const roles = [
  {
    title: "User Login",
    description: "Access your safety dashboard, live maps, and SOS features",
    icon: User,
    path: "/login/user",
  },
  {
    title: "Admin Login",
    description: "Manage users, view alerts, and control the monitoring system",
    icon: ShieldCheck,
    path: "/login/admin",
  },
];

const SelectRole = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background grid-pattern p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h2 className="font-display text-2xl font-bold glow-text mb-2">Choose Your Role</h2>
        <p className="text-muted-foreground mb-8">Select how you want to access GeoSentinel</p>

        <div className="space-y-4">
          {roles.map((role, i) => (
            <motion.button
              key={role.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              onClick={() => navigate(role.path)}
              className="w-full glass-card glow-border p-6 flex items-center gap-5 text-left hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <role.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold tracking-wide text-foreground">{role.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SelectRole;
