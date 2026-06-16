import "leaflet";

declare module "leaflet" {
  interface HeatMapOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  type HeatLatLngTuple = [number, number, number?];

  class HeatLayer extends Layer {
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    addLatLng(latlng: HeatLatLngTuple): this;
    setOptions(options: HeatMapOptions): this;
    redraw(): this;
  }

  function heatLayer(
    latlngs: HeatLatLngTuple[],
    options?: HeatMapOptions,
  ): HeatLayer;
}
