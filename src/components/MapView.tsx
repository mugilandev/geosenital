import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

// Fix default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Marker {
  lat: number;
  lng: number;
  label: string;
  type?: string;
  info?: string;
}

interface DangerZone {
  lat: number;
  lng: number;
  radius: number;
  name: string;
  type?: string;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  showUserLocation?: boolean;
  markers?: Marker[];
  dangerZones?: DangerZone[];
  destination?: [number, number] | null;
  destinationName?: string;
  spotMarkers?: Array<{ lat: number; lng: number; label: string }>;
  showStateBorders?: boolean;
  showDistrictBorders?: boolean;
}

// Zone styling config by type
const ZONE_CONFIG: Record<string, { color: string; fill: string; fillOpacity: number; emoji: string; label: string; warning: string }> = {
  military: { color: "#ef4444", fill: "#ef4444", fillOpacity: 0.18, emoji: "🚫", label: "Military / Restricted", warning: "MILITARY ZONE — Civilian entry strictly prohibited!" },
  restricted: { color: "#f97316", fill: "#f97316", fillOpacity: 0.15, emoji: "⛔", label: "Protected Reserve", warning: "PROTECTED AREA — Entry requires special permit!" },
  danger: { color: "#facc15", fill: "#facc15", fillOpacity: 0.15, emoji: "⚠️", label: "Danger Zone", warning: "DANGER ZONE — Hazardous conditions ahead!" },
  water: { color: "#3b82f6", fill: "#3b82f6", fillOpacity: 0.20, emoji: "💧", label: "Flood / Water Hazard", warning: "WATER HAZARD — Risk of flooding or drowning!" },
};

// OSRM free routing
async function fetchRoute(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === "Ok" && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    }
  } catch (e) {
    console.warn("Routing failed:", e);
  }
  return null;
}

function calcDistance(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a[0] * Math.PI) / 180) *
    Math.cos((b[0] * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// India state borders GeoJSON sources (public, free)
const STATES_GEOJSON_URL =
  "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson";
const DISTRICT_GEOJSON_URL =
  "https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson";

const MapView = ({
  center = [28.6139, 77.209],
  zoom = 13,
  className = "",
  showUserLocation = true,
  markers = [],
  dangerZones = [],
  destination = null,
  destinationName = "Destination",
  spotMarkers = [],
  showStateBorders = false,
  showDistrictBorders = false,
}: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userPosRef = useRef<[number, number] | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const stateBorderLayerRef = useRef<L.GeoJSON | null>(null);
  const districtBorderLayerRef = useRef<L.GeoJSON | null>(null);
  const spotMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const [, setRender] = useState(0);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView(center, zoom);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapInstance.current = map;

    // User location
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          userPosRef.current = loc;
          setRender((r) => r + 1); // re-trigger destination effect with user pos
          const userIcon = L.divIcon({
            html: `<div style="width:18px;height:18px;border-radius:50%;background:#c4883a;border:3px solid #0a0a0a;box-shadow:0 0 15px #c4883a;"></div>`,
            className: "",
            iconSize: [18, 18],
          });
          L.marker(loc, { icon: userIcon }).addTo(map).bindPopup("<b>📍 Your Location</b>").openPopup();
          map.setView(loc, 14);
        },
        () => { }
      );
    }

    // ── Restricted / danger zones ──────────────────────────────────────────
    dangerZones.forEach((zone) => {
      const cfg = ZONE_CONFIG[zone.type || "danger"] ?? ZONE_CONFIG.danger;

      // Outer pulsing ring
      L.circle([zone.lat, zone.lng], {
        radius: zone.radius * 1.15,
        color: cfg.color,
        fillColor: "transparent",
        fillOpacity: 0,
        weight: 1.5,
        opacity: 0.4,
        dashArray: "8 6",
      }).addTo(map);

      // Main filled circle
      L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color: cfg.color,
        fillColor: cfg.fill,
        fillOpacity: cfg.fillOpacity,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:220px;padding:6px 2px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span style="font-size:18px">${cfg.emoji}</span>
              <span style="font-weight:700;font-size:13px;color:${cfg.color}">${zone.name}</span>
            </div>
            <div style="background:${cfg.color}22;border:1px solid ${cfg.color}55;border-radius:6px;padding:6px 8px;font-size:11px;font-weight:600;color:${cfg.color}">
              ⚠️ ${cfg.warning}
            </div>
            <p style="font-size:10px;color:#888;margin-top:6px">Zone type: ${cfg.label} &bull; Radius: ${zone.radius}m</p>
          </div>
        `);

      // Icon marker at centre
      const zoneIcon = L.divIcon({
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:${cfg.color}33;
          border:2px solid ${cfg.color};
          display:flex;align-items:center;justify-content:center;
          font-size:15px;
          box-shadow:0 0 12px ${cfg.color}88;
        ">${cfg.emoji}</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([zone.lat, zone.lng], { icon: zoneIcon })
        .addTo(map)
        .bindPopup(`<b style="color:${cfg.color}">${cfg.emoji} ${zone.name}</b><br/><small style="color:#aaa">${cfg.label}</small>`);
    });

    // SOS markers
    markers.forEach((m) => {
      const isEmergency = m.type === "emergency";
      const markerColor = isEmergency ? "#ef4444" : "#f59e0b";
      const icon = L.divIcon({
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${markerColor};border:3px solid #fff;box-shadow:0 0 15px ${markerColor};${isEmergency ? "animation:pulse 1s infinite;" : ""}"></div>`,
        className: "",
        iconSize: [24, 24],
      });
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <div class="flex items-center gap-2 mb-2">
            <span class="font-bold text-sm">${m.label}</span>
          </div>
          <p class="text-xs"><strong>Status:</strong> ${isEmergency ? "CRITICAL" : "Standard SOS"}</p>
          ${m.info ? `<p class="text-xs mt-1 italic">"${m.info}"</p>` : ""}
          <p class="text-[10px] opacity-60 mt-1">Lat: ${m.lat.toFixed(4)}, Lng: ${m.lng.toFixed(4)}</p>
        </div>`;
      L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popupContent);
    });

    // Long-press emergency pin
    let pressTimer: NodeJS.Timeout;
    map.on("mousedown", (e: any) => {
      pressTimer = setTimeout(() => {
        const emergencyIcon = L.divIcon({
          html: '<div style="width:20px;height:20px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 0 20px #ef4444;animation:pulse 1s infinite;"></div>',
          className: "",
          iconSize: [20, 20],
        });
        L.marker(e.latlng, { icon: emergencyIcon }).addTo(map).bindPopup("📍 Emergency Pin").openPopup();
      }, 800);
    });
    map.on("mouseup", () => clearTimeout(pressTimer));
    map.on("mousemove", () => clearTimeout(pressTimer));

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Center on prop change
  useEffect(() => {
    if (mapInstance.current && center) {
      mapInstance.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Spot markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (spotMarkersLayerRef.current) {
      spotMarkersLayerRef.current.clearLayers();
    } else {
      spotMarkersLayerRef.current = L.layerGroup().addTo(map);
    }
    spotMarkers.forEach((s) => {
      const icon = L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:#a78bfa;border:2px solid #fff;box-shadow:0 0 6px #a78bfa;"></div>`,
        className: "",
        iconSize: [10, 10],
      });
      L.marker([s.lat, s.lng], { icon })
        .bindPopup(`<b>⭐ ${s.label}</b><br/><small>Popular Spot</small>`)
        .addTo(spotMarkersLayerRef.current!);
    });
  }, [spotMarkers]);

  // Split India borders into separate hooks
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (!showStateBorders) {
      if (stateBorderLayerRef.current) { stateBorderLayerRef.current.remove(); stateBorderLayerRef.current = null; }
      return;
    }

    const loadStateBorders = async () => {
      if (!stateBorderLayerRef.current) {
        try {
          toast.info("Loading India state borders...");
          const res = await fetch(STATES_GEOJSON_URL);
          const geoJson = await res.json();
          const layer = L.geoJSON(geoJson as any, {
            style: { color: "#ef4444", weight: 2, fillOpacity: 0, opacity: 0.85 },
            onEachFeature: (feature, lyr) => {
              const name = feature.properties?.NAME_1 || feature.properties?.ST_NM || "State";
              lyr.bindPopup(`<b>🏛️ ${name}</b>`);
            },
          }).addTo(map);
          stateBorderLayerRef.current = layer;
        } catch (e) { toast.error("Could not load state borders"); }
      }
    };
    loadStateBorders();
  }, [showStateBorders]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (!showDistrictBorders) {
      if (districtBorderLayerRef.current) { districtBorderLayerRef.current.remove(); districtBorderLayerRef.current = null; }
      return;
    }

    const loadDistrictBorders = async () => {
      if (!districtBorderLayerRef.current) {
        try {
          toast.info("Loading district borders...");
          const res = await fetch(DISTRICT_GEOJSON_URL);
          const geoJson = await res.json();
          const layer = L.geoJSON(geoJson as any, {
            style: { color: "#fca5a5", weight: 0.8, fillOpacity: 0, opacity: 0.6 },
            onEachFeature: (feature, lyr) => {
              const name = feature.properties?.NAME_2 || feature.properties?.DISTRICT || "District";
              lyr.bindPopup(`<b>📍 ${name}</b>`);
            },
          }).addTo(map);
          districtBorderLayerRef.current = layer;
        } catch (e) { toast.error("Could not load district borders"); }
      }
    };
    loadDistrictBorders();
  }, [showDistrictBorders]);

  // Route to destination
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }
    if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
    if (!destination) return;

    const destIcon = L.divIcon({
      html: `<div style="width:28px;height:28px;border-radius:50%;background:#22d3ee;border:3px solid #fff;box-shadow:0 0 20px #22d3ee;display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>`,
      className: "",
      iconSize: [28, 28],
    });
    const dMarker = L.marker(destination, { icon: destIcon })
      .addTo(map)
      .bindPopup(`<b>${destinationName}</b><br/><small>Calculating route...</small>`)
      .openPopup();
    destMarkerRef.current = dMarker;
    map.setView(destination, 12);

    const drawRoute = async () => {
      const from = userPosRef.current;
      if (!from) {
        const line = L.polyline([destination, destination], { color: "#22d3ee", weight: 4, opacity: 0.8, dashArray: "10,6" }).addTo(map);
        routeLayerRef.current = line;
        dMarker.setPopupContent(`<b>${destinationName}</b><br/><small>No GPS — enable location for routing</small>`);
        return;
      }

      toast.info(`🗺️ Fetching route to ${destinationName}...`);
      const coords = await fetchRoute(from, destination);

      if (coords && coords.length > 1) {
        const line = L.polyline(coords, { color: "#22d3ee", weight: 5, opacity: 0.9 }).addTo(map);
        routeLayerRef.current = line;
        map.fitBounds(line.getBounds(), { padding: [60, 60] });
        const distKm = calcDistance(from, destination);
        const timeMin = Math.round((distKm / 50) * 60);
        dMarker.setPopupContent(`<b>📍 ${destinationName}</b><br/><small>~${distKm.toFixed(1)} km &bull; ~${timeMin} min drive</small>`);
        dMarker.openPopup();
        toast.success(`Route ready: ~${distKm.toFixed(1)} km, ~${timeMin} min`);
      } else {
        const distKm = calcDistance(from, destination);
        const line = L.polyline([from, destination], { color: "#22d3ee", weight: 4, opacity: 0.7, dashArray: "10,8" }).addTo(map);
        routeLayerRef.current = line;
        map.fitBounds(line.getBounds(), { padding: [40, 40] });
        dMarker.setPopupContent(`<b>📍 ${destinationName}</b><br/><small>~${distKm.toFixed(1)} km straight-line</small>`);
        dMarker.openPopup();
        toast.warning(`Routing unavailable. Showing straight-line: ${distKm.toFixed(1)} km`);
      }
    };

    drawRoute();
  }, [destination, destinationName]);

  return <div ref={mapRef} className={`w-full h-full rounded-xl ${className}`} />;
};

export default MapView;
