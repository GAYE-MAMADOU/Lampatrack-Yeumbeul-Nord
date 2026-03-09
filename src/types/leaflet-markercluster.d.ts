import 'leaflet';

declare module 'leaflet' {
  interface MarkerClusterGroupOptions {
    maxClusterRadius?: number;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    disableClusteringAtZoom?: number;
    chunkedLoading?: boolean;
    chunkInterval?: number;
    chunkDelay?: number;
    animate?: boolean;
    iconCreateFunction?: (cluster: MarkerCluster) => DivIcon | Icon;
  }

  interface MarkerCluster extends Marker {
    getChildCount(): number;
    getAllChildMarkers(): Marker[];
  }

  class MarkerClusterGroup extends FeatureGroup {
    constructor(options?: MarkerClusterGroupOptions);
    addLayer(layer: Layer): this;
    addLayers(layers: Layer[]): this;
    removeLayer(layer: Layer): this;
    removeLayers(layers: Layer[]): this;
    clearLayers(): this;
    refreshClusters(layers?: Layer | Layer[]): this;
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}
