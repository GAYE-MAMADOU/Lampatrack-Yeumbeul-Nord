import { useEffect, useRef, useState, useCallback, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
import type { Lampadaire } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Locate, Layers, RotateCcw } from 'lucide-react';
import { YEUMBEUL_NORD_POLYGON } from '@/lib/zoneCheck';
import { useTheme } from 'next-themes';

interface LampadaireMapProps {
  lampadaires: Lampadaire[];
  onLampadaireClick?: (lampadaire: Lampadaire) => void;
  selectedLampadaire?: Lampadaire | null;
  showUserLocation?: boolean;
}

const TILE_LAYERS = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxNativeZoom: 20,
    maxZoom: 22,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> - World Imagery',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
};

// Canvas renderer will be created per map instance

const MARKER_STYLES = {
  functional: { color: '#16a34a', fillColor: '#22c55e', radius: 5, weight: 1, fillOpacity: 1, opacity: 1 },
  damaged: { color: '#dc2626', fillColor: '#ef4444', radius: 5, weight: 1, fillOpacity: 1, opacity: 1 },
} as const;

const createSelectedIcon = (status: string) => {
  const statusClass = `marker-dot marker-dot--selected`;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="${statusClass}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

function LampadaireMap({
  lampadaires,
  onLampadaireClick,
  selectedLampadaire,
  showUserLocation = true,
}: LampadaireMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const zoneBoundaryRef = useRef<L.Polygon | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);
  const initialBoundsSet = useRef(false);
  const onLampadaireClickRef = useRef(onLampadaireClick);
  const watchIdRef = useRef<number | null>(null);
  const userHeadingRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'dark' | 'satellite'>('standard');
  const [bearing, setBearing] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMapStyle(prev => {
      if (prev === 'satellite') return prev;
      return resolvedTheme === 'dark' ? 'dark' : 'standard';
    });
  }, [resolvedTheme]);

  useEffect(() => {
    onLampadaireClickRef.current = onLampadaireClick;
  }, [onLampadaireClick]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [14.7833, -17.3500],
      zoom: 13,
      zoomControl: true,
      maxZoom: 22,
      rotate: true,
      touchRotate: true,
      rotateControl: { closeOnZeroBearing: false },
      bearing: 0,
    } as L.MapOptions & { rotate: boolean; touchRotate: boolean; rotateControl: { closeOnZeroBearing: boolean }; bearing: number });

    tileLayerRef.current = L.tileLayer(TILE_LAYERS.standard.url, {
      attribution: TILE_LAYERS.standard.attribution,
      maxNativeZoom: TILE_LAYERS.standard.maxNativeZoom,
      maxZoom: TILE_LAYERS.standard.maxZoom,
    }).addTo(map.current);

    canvasRendererRef.current = L.canvas({ padding: 0.5, tolerance: 10 });
    markersLayerRef.current = L.layerGroup().addTo(map.current);

    zoneBoundaryRef.current = L.polygon(YEUMBEUL_NORD_POLYGON, {
      color: '#3b82f6',
      weight: 2,
      opacity: 0.8,
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      dashArray: '5, 10',
      interactive: false,
    }).addTo(map.current);

    map.current.on('rotate', () => {
      const currentBearing = (map.current as L.Map & { getBearing: () => number }).getBearing();
      setBearing(currentBearing);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Switch tile layer
  useEffect(() => {
    if (!map.current) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();
    const layer = TILE_LAYERS[mapStyle];
    tileLayerRef.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxNativeZoom: layer.maxNativeZoom,
      maxZoom: layer.maxZoom,
    }).addTo(map.current);
  }, [mapStyle]);

  // Update markers — canvas-rendered circleMarkers for performance
  useEffect(() => {
    if (!map.current || !markersLayerRef.current) return;

    const currentIds = new Set(lampadaires.map(l => l.id));
    const existingIds = new Set(markersRef.current.keys());

    // Remove old
    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        const marker = markersRef.current.get(id);
        if (marker) {
          markersLayerRef.current!.removeLayer(marker);
          markersRef.current.delete(id);
        }
      }
    });

    // Add/update
    lampadaires.forEach((lampadaire) => {
      const style = lampadaire.status === 'functional' ? MARKER_STYLES.functional : MARKER_STYLES.damaged;
      const existingMarker = markersRef.current.get(lampadaire.id);

      if (existingMarker) {
        existingMarker.setStyle(style);
      } else {
        const marker = L.circleMarker([lampadaire.latitude, lampadaire.longitude], {
          ...style,
          renderer: canvasRendererRef.current!,
          interactive: true,
          bubblingMouseEvents: false,
        });

        marker.on('click', () => {
          if (onLampadaireClickRef.current) {
            onLampadaireClickRef.current(lampadaire);
          }
        });

        markersRef.current.set(lampadaire.id, marker);
        markersLayerRef.current!.addLayer(marker);
      }
    });

    // Fit bounds on initial load
    if (lampadaires.length > 0 && !initialBoundsSet.current) {
      const bounds = L.latLngBounds(
        lampadaires.map(l => [l.latitude, l.longitude])
      );
      map.current.fitBounds(bounds, { padding: [50, 50] });
      initialBoundsSet.current = true;
    }
  }, [lampadaires]);

  // Selected marker highlight (DOM-based for animation)
  useEffect(() => {
    if (!map.current) return;

    if (selectedMarkerRef.current) {
      map.current.removeLayer(selectedMarkerRef.current);
      selectedMarkerRef.current = null;
    }

    if (selectedLampadaire) {
      const selectedIcon = createSelectedIcon(selectedLampadaire.status);
      const marker = L.marker(
        [selectedLampadaire.latitude, selectedLampadaire.longitude],
        { icon: selectedIcon, zIndexOffset: 2000, interactive: true }
      ).addTo(map.current);

      marker.on('click', () => {
        if (onLampadaireClickRef.current) {
          onLampadaireClickRef.current(selectedLampadaire);
        }
      });

      selectedMarkerRef.current = marker;
      map.current.panTo([selectedLampadaire.latitude, selectedLampadaire.longitude]);
    }
  }, [selectedLampadaire]);

  // User location
  const updateUserMarker = useCallback((lat: number, lng: number, accuracy: number, heading: number | null) => {
    if (!map.current) return;

    const headingDeg = heading != null && !isNaN(heading) ? heading : null;
    userHeadingRef.current = headingDeg;

    const arrowHtml = headingDeg != null
      ? `<div class="user-heading-arrow" style="transform: rotate(${headingDeg}deg)"></div>`
      : '';

    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `
        <div class="user-location-pulse"></div>
        <div class="user-location-dot"></div>
        ${arrowHtml}
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.setIcon(userIcon);
    } else {
      userMarkerRef.current = L.marker([lat, lng], {
        icon: userIcon,
        zIndexOffset: 3000,
        interactive: false,
      }).addTo(map.current);
    }

    if (userAccuracyRef.current) {
      userAccuracyRef.current.setLatLng([lat, lng]);
      userAccuracyRef.current.setRadius(accuracy);
    } else {
      userAccuracyRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
        weight: 1,
        opacity: 0.3,
      }).addTo(map.current);
    }
  }, []);

  const toggleTracking = useCallback(() => {
    if (isTrackingRef.current) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      isTrackingRef.current = false;
      setIsTracking(false);
      return;
    }

    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    isTrackingRef.current = true;
    setIsTracking(true);
    let firstFix = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading } = position.coords;
        updateUserMarker(latitude, longitude, accuracy, heading);
        if (firstFix && map.current) {
          map.current.setView([latitude, longitude], 17);
          firstFix = false;
        }
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        alert('Impossible d\'obtenir votre position');
        isTrackingRef.current = false;
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [updateUserMarker]);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!isTrackingRef.current || !map.current) return;
      const heading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ?? (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (heading != null && userMarkerRef.current) {
        userHeadingRef.current = heading;
        const pos = userMarkerRef.current.getLatLng();
        updateUserMarker(pos.lat, pos.lng, userAccuracyRef.current?.getRadius() ?? 20, heading);
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [updateUserMarker]);

  const toggleMapStyle = useCallback(() => {
    setMapStyle(prev => {
      if (prev === 'satellite') return resolvedTheme === 'dark' ? 'dark' : 'standard';
      return 'satellite';
    });
  }, [resolvedTheme]);

  const resetRotation = useCallback(() => {
    if (map.current) {
      (map.current as L.Map & { setBearing: (bearing: number) => void }).setBearing(0);
      setBearing(0);
    }
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg" />
      
      {/* Compass */}
      <div 
        className="absolute bottom-6 left-3 z-[999] w-14 h-14 bg-background/95 backdrop-blur-md rounded-full shadow-xl border-2 border-border/50 flex items-center justify-center cursor-pointer hover:bg-background hover:scale-105 active:scale-95 transition-all duration-200"
        onClick={resetRotation}
        title="Cliquez pour orienter au Nord"
      >
        <div 
          className="relative w-10 h-10 transition-transform duration-150 ease-out"
          style={{ transform: `rotate(${-bearing}deg)` }}
        >
          <div className="absolute inset-0 rounded-full border border-muted-foreground/20" />
          <div className="absolute inset-1 rounded-full bg-gradient-to-b from-muted/30 to-transparent" />
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-l-transparent border-r-transparent border-b-destructive drop-shadow-sm" />
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[8px] border-l-transparent border-r-transparent border-t-muted-foreground/40" />
          <div className="absolute top-1/2 left-1 -translate-y-1/2 w-1.5 h-0.5 bg-muted-foreground/30 rounded-full" />
          <div className="absolute top-1/2 right-1 -translate-y-1/2 w-1.5 h-0.5 bg-muted-foreground/30 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rounded-full shadow-sm" />
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-1 leading-none rounded bg-background/90 backdrop-blur text-[9px] font-bold text-destructive shadow-sm pointer-events-none">
            N
          </span>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <Button variant="secondary" size="icon" className="shadow-lg" onClick={resetRotation} title="Réinitialiser l'orientation (Nord)">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="shadow-lg" onClick={toggleMapStyle} title={mapStyle === 'standard' ? 'Vue satellite' : 'Vue standard'}>
          <Layers className="h-4 w-4" />
        </Button>
        {showUserLocation && (
          <Button
            variant={isTracking ? "default" : "secondary"}
            size="icon"
            className={`shadow-lg ${isTracking ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            onClick={toggleTracking}
            title={isTracking ? 'Arrêter le suivi' : 'Suivre ma position'}
          >
            <Locate className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(LampadaireMap);
