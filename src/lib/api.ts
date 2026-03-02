const API_BASE = import.meta.env.VITE_API_URL || "";

function getToken(role: "user" | "admin"): string | null {
  return localStorage.getItem(role === "admin" ? "adminToken" : "userToken");
}

function setToken(role: "user" | "admin", token: string) {
  localStorage.setItem(role === "admin" ? "adminToken" : "userToken", token);
}

function clearToken(role?: "user" | "admin") {
  if (role) {
    localStorage.removeItem(role === "admin" ? "adminToken" : "userToken");
  } else {
    localStorage.removeItem("userToken");
    localStorage.removeItem("adminToken");
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { role?: "user" | "admin" } = {}
): Promise<T> {
  const { role, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };
  const token = role ? getToken(role) : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: { ...headers, ...(fetchOptions.headers as Record<string, string>) },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// Auth — User
export const authApi = {
  // Password-based signup (all profile info in one call)
  signup: (body: {
    phone: string;
    region?: string;
    password: string;
    name: string;
    userType: "indian" | "foreigner";
    identity: string;
    emergencyContact: string;
    state: string;
  }) =>
    request<{ token: string; role: string; userId: number }>(
      "/api/auth/signup",
      { method: "POST", body: JSON.stringify(body) }
    ),

  // Password-based login
  login: (body: { phone: string; region?: string; password: string }) =>
    request<{ token: string; role: string; userId: number; name: string; userType: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(body) }
    ),

  // Admin 3-step
  adminCheckPhone: (body: { phone: string; region?: string }) =>
    request("/api/auth/admin/check-phone", { method: "POST", body: JSON.stringify(body) }),

  adminCheckGmail: (body: { phone: string; gmail: string }) =>
    request("/api/auth/admin/check-gmail", { method: "POST", body: JSON.stringify(body) }),

  adminLogin: (body: { phone: string; gmail: string; password: string }) =>
    request<{ token: string; role: string }>(
      "/api/auth/admin/login",
      { method: "POST", body: JSON.stringify(body) }
    ),

  setUserToken: (token: string) => setToken("user", token),
  setAdminToken: (token: string) => setToken("admin", token),
  clearTokens: () => clearToken(),
};

// Users
export interface UserProfile {
  id: number;
  name: string;
  userType: "indian" | "foreigner";
  identity: string;
  emergencyContact: string;
  state: string;
  coords: { lat: number; lng: number } | null;
  phone?: string;
  email?: string;
}

export const usersApi = {
  getProfile: () => request<UserProfile>("/api/users/profile", { role: "user" }),
  saveProfile: (profile: {
    name: string;
    userType: "indian" | "foreigner";
    identity: string;
    emergencyContact: string;
    state: string;
    coords?: { lat: number; lng: number } | null;
  }) => request("/api/users/profile", { method: "POST", body: JSON.stringify(profile), role: "user" }),
};

// SOS
export const sosApi = {
  create: (alert: {
    lat?: number;
    lng?: number;
    type?: "emergency" | "standard";
    info?: string;
    isEmergency?: boolean;
  }) =>
    request<{ id: string; alertId: number }>("/api/sos", {
      method: "POST",
      body: JSON.stringify(alert),
      role: "user",
    }),
};

// Admin
export const adminApi = {
  getStats: () =>
    request<{ totalUsers: string; activeNow: string; sosAlerts: string; geofenceViolations: string }>(
      "/api/admin/stats",
      { role: "admin" }
    ),
  getUsers: () =>
    request<Array<{ name: string; email: string; phone: string; joined: string }>>(
      "/api/admin/users",
      { role: "admin" }
    ),
  getSosAlerts: () =>
    request<
      Array<{
        id: string;
        user: string;
        time: string;
        lat: number;
        lng: number;
        status: string;
        type: string;
        info: string;
      }>
    >("/api/admin/sos", { role: "admin" }),
  resolveAlert: (id: number) =>
    request("/api/admin/sos/" + id, { method: "PATCH", role: "admin" }),
  getFeedback: () =>
    request<Array<{ user: string; message: string; rating: number }>>(
      "/api/admin/feedback",
      { role: "admin" }
    ),
};

// Data
export const dataApi = {
  getDangerZones: () =>
    request<Array<{ lat: number; lng: number; radius: number; name: string; type?: string }>>(
      "/api/data/danger-zones"
    ),
};
