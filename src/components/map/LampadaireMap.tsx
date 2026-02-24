import { useEffect, useRef, useState, useCallback, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
import type { Lampadaire } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Locate, Layers, RotateCcw } from 'lucide-react';
import { YEUMBEUL_NORD_POLYGON } from '@/lib/zoneCheck';

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
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> - World Imagery',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
};

// Create marker icon - memoized function
const createMarkerIcon = (isSelected: boolean, status: string) => {
  const markerColor = status === 'functional' ? '#22c55e' : '#ef4444';
  
  const selectedStyles = isSelected 
    ? `
        background: #FBBF24 !important;
        border: 2px solid white;
        box-shadow: 0 0 0 2px #FBBF24, 0 0 20px 8px rgba(251, 191, 36, 0.6), 0 0 40px 16px rgba(251, 191, 36, 0.3);
        transform: scale(1.4);
        animation: pulse 1.5s ease-in-out infinite;
      `
    : `
        background: ${markerColor};
        border: 1px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      `;
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1.4); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.9; }
        }
      </style>
      <div style="
        width: ${isSelected ? '14px' : '10px'};
        height: ${isSelected ? '14px' : '10px'};
        border-radius: 50%;
        ${selectedStyles}
        transition: all 0.3s ease;
      "></div>
    `,
    iconSize: [isSelected ? 14 : 10, isSelected ? 14 : 10],
    iconAnchor: [isSelected ? 7 : 5, isSelected ? 7 : 5],
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
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const zoneBoundaryRef = useRef<L.Polygon | null>(null);
  const initialBoundsSet = useRef(false);
  const onLampadaireClickRef = useRef(onLampadaireClick);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');
  const [bearing, setBearing] = useState(0);

  // Keep callback ref updated
  useEffect(() => {
    onLampadaireClickRef.current = onLampadaireClick;
  }, [onLampadaireClick]);

  // Initialize map with rotation support
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [14.7833, -17.3500], // Yeumbeul
      zoom: 13,
      zoomControl: true,
      maxZoom: 22,
      rotate: true,
      touchRotate: true,
      rotateControl: {
        closeOnZeroBearing: false,
      },
      bearing: 0,
    } as L.MapOptions & { rotate: boolean; touchRotate: boolean; rotateControl: { closeOnZeroBearing: boolean }; bearing: number });

    tileLayerRef.current = L.tileLayer(TILE_LAYERS.standard.url, {
      attribution: TILE_LAYERS.standard.attribution,
      maxNativeZoom: TILE_LAYERS.standard.maxNativeZoom,
      maxZoom: TILE_LAYERS.standard.maxZoom,
    }).addTo(map.current);

    // Add Yeumbeul Nord zone boundary
    zoneBoundaryRef.current = L.polygon(YEUMBEUL_NORD_POLYGON, {
      color: '#3b82f6',
      weight: 2,
      opacity: 0.8,
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      dashArray: '5, 10',
    }).addTo(map.current);

    // No popup: the UI already explains the zone and popups can feel like lag/noise

    // Listen to bearing changes for compass
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

  // Switch tile layer when style changes
  useEffect(() => {
    if (!map.current) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const layer = TILE_LAYERS[mapStyle];
    tileLayerRef.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxNativeZoom: layer.maxNativeZoom,
      maxZoom: layer.maxZoom,
    }).addTo(map.current);
  }, [mapStyle]);

  // Update markers efficiently - only update what changed
  useEffect(() => {
    if (!map.current) return;

    const currentIds = new Set(lampadaires.map(l => l.id));
    const existingIds = new Set(markersRef.current.keys());

    // Remove markers that are no longer in the list
    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        const marker = markersRef.current.get(id);
        if (marker) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }
    });

    // Add or update markers - no popups, direct click to info panel
    lampadaires.forEach((lampadaire) => {
      const isSelected = selectedLampadaire?.id === lampadaire.id;
      const existingMarker = markersRef.current.get(lampadaire.id);

      if (existingMarker) {
        // Update existing marker icon if selection changed
        existingMarker.setIcon(createMarkerIcon(isSelected, lampadaire.status));
        existingMarker.setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        // Create new marker without popup for faster interaction
        const icon = createMarkerIcon(isSelected, lampadaire.status);

        const marker = L.marker([lampadaire.latitude, lampadaire.longitude], { 
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
          interactive: true,
        }).addTo(map.current!);

        // Direct click handler - no popup delay
        marker.on('click', () => {
          if (onLampadaireClickRef.current) {
            onLampadaireClickRef.current(lampadaire);
          }
        });

        markersRef.current.set(lampadaire.id, marker);
      }
    });

    // Fit bounds only on initial load
    if (lampadaires.length > 0 && !initialBoundsSet.current) {
      const bounds = L.latLngBounds(
        lampadaires.map(l => [l.latitude, l.longitude])
      );
      map.current.fitBounds(bounds, { padding: [50, 50] });
      initialBoundsSet.current = true;
    }
  }, [lampadaires, selectedLampadaire]);

  // Handle user location
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (map.current) {
          // Remove existing user marker
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          // Add user marker
          const userIcon = L.divIcon({
            className: 'user-marker',
            html: `
              <div style="
                width: 20px;
                height: 20px;
                background: #3b82f6;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
              "></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(map.current)
            .bindPopup('Votre position');

          map.current.setView([latitude, longitude], 16);
        }
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        alert('Impossible d\'obtenir votre position');
      }
    );
  }, []);

  const toggleMapStyle = useCallback(() => {
    setMapStyle(prev => prev === 'standard' ? 'satellite' : 'standard');
  }, []);

  // Reset map rotation to north
  const resetRotation = useCallback(() => {
    if (map.current) {
      (map.current as L.Map & { setBearing: (bearing: number) => void }).setBearing(0);
      setBearing(0);
    }
  }, []);

  // Center on selected lampadaire without changing zoom
  useEffect(() => {
    if (selectedLampadaire && map.current) {
      map.current.panTo([selectedLampadaire.latitude, selectedLampadaire.longitude]);
    }
  }, [selectedLampadaire]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg" />
      
      {/* Visual Compass - Bottom left, lower position */}
      <div 
        className="absolute bottom-6 left-3 z-[999] w-14 h-14 bg-background/95 backdrop-blur-md rounded-full shadow-xl border-2 border-border/50 flex items-center justify-center cursor-pointer hover:bg-background hover:scale-105 active:scale-95 transition-all duration-200"
        onClick={resetRotation}
        title="Cliquez pour orienter au Nord"
      >
        <div 
          className="relative w-10 h-10 transition-transform duration-150 ease-out"
          style={{ transform: `rotate(${-bearing}deg)` }}
        >
          {/* Compass ring */}
          <div className="absolute inset-0 rounded-full border border-muted-foreground/20" />
          
          {/* Cardinal directions background */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-b from-muted/30 to-transparent" />
          
          {/* North arrow - positioned lower to not cover N label */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-l-transparent border-r-transparent border-b-destructive drop-shadow-sm" />
          
          {/* South arrow */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[8px] border-l-transparent border-r-transparent border-t-muted-foreground/40" />
          
          {/* East/West ticks */}
          <div className="absolute top-1/2 left-1 -translate-y-1/2 w-1.5 h-0.5 bg-muted-foreground/30 rounded-full" />
          <div className="absolute top-1/2 right-1 -translate-y-1/2 w-1.5 h-0.5 bg-muted-foreground/30 rounded-full" />
          
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rounded-full shadow-sm" />
          
          {/* N label - always readable (above arrow) */}
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-1 leading-none rounded bg-background/90 backdrop-blur text-[9px] font-bold text-destructive shadow-sm pointer-events-none">
            N
          </span>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Reset rotation button */}
        <Button
          variant="secondary"
          size="icon"
          className="shadow-lg"
          onClick={resetRotation}
          title="Réinitialiser l'orientation (Nord)"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        {/* Layer toggle button */}
        <Button
          variant="secondary"
          size="icon"
          className="shadow-lg"
          onClick={toggleMapStyle}
          title={mapStyle === 'standard' ? 'Vue satellite' : 'Vue standard'}
        >
          <Layers className="h-4 w-4" />
        </Button>

        {/* Location button */}
        {showUserLocation && (
          <Button
            variant="secondary"
            size="icon"
            className="shadow-lg"
            onClick={locateUser}
          >
            <Locate className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(LampadaireMap);
