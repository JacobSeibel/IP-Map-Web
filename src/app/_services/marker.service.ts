import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as L from 'leaflet';
import 'leaflet.heat/dist/leaflet-heat.js'

@Injectable({
  providedIn: 'root'
})
export class MarkerService {
  private heat!: any;
  private inUse = false;
  private interrupt = false;

  constructor(private http: HttpClient) { }

  drawIPMarkers(map: L.Map) {
    if(this.inUse){
      this.interrupt = true;
      return;
    } else {
      this.inUse = true;
      const bounds = map.getBounds();
      let params: HttpParams = new HttpParams();
      const boundsParam = "[["
        + bounds.getNorthWest().lat + "," + bounds.getNorthWest().lng + "],["
        + bounds.getNorthEast().lat + "," + bounds.getNorthEast().lng + "],[" 
        + bounds.getSouthEast().lat + "," + bounds.getSouthEast().lng + "],["
        + bounds.getSouthWest().lat + "," + bounds.getSouthWest().lng + "]]";
      params = params.append('bounds', boundsParam);

      if(this.interruptIfNecessary(map)) return;

      // TODO: Make the url here an environment variable
      this.http.get("https://ip-map-api.herokuapp.com/ipCounts", {observe: 'response', responseType: 'json', params}).subscribe((res: any) => {
        if(this.interruptIfNecessary(map)) return;
        const result = res.body.result;
        // Find the maximum density (represented by log(log(count))) in the set
        const maxDensity = Math.log(Math.log(Math.max.apply(Math, result.map((ipCount: any) => { return ipCount.count; })) + 1) + 1);
        const markers = result.map((ipCount: any) => { 
          // Each point's intensity is defined as maxDensity - density of this point over the maxDensity
          const density = Math.log(Math.log(ipCount.count+1)+1);
          let normalized = (maxDensity - density) / maxDensity;
          return [ipCount.latitude, ipCount.longitude, normalized] 
        })
        if(this.interruptIfNecessary(map)) return;
        if(this.heat){
          map.removeLayer(this.heat);
        }
        let radius = 8 * map.getZoom();
        radius = radius > 100 ? 100 : radius;
        // TODO: Figure out why 'as any' is needed
        this.heat = (L as any).heatLayer(markers, {gradient: {0.3: 'blue', 0.35: 'lime', 0.4: 'yellow', 0.5: 'red'}, radius}).addTo(map);
        this.inUse = false;
        this.interruptIfNecessary(map);
      });
    }
  }

  interruptIfNecessary(map: L.Map) {
    // If this function has already been called again, cancel and restart
    if(this.interrupt) {
      this.interrupt = false;
      this.inUse = false;
      this.drawIPMarkers(map);
      return true;
    }
    return false;
  }
}
