/// <reference types="@types/googlemaps" />
import { Component, ViewChild } from '@angular/core';
import { environment } from 'environments/environment';
import { Feature, GeometryObject } from 'geojson';
import { } from 'googlemaps';

import {
  LayerSelection, OpendapService, Layer,
  PaletteService, MappedLayer, CatalogService, Catalog,
  TimeseriesService, TimeSeries, Bounds,
  PointSelectionService, PointSelection, MetadataService
} from 'map-wald';
import { LayeredMapComponent, SimpleMarker,
  OneTimeSplashComponent, CatalogComponent } from 'map-wald-visual';
import { LatLng, MapsAPILoader } from '@agm/core';
import { map, switchAll } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { DapDAS, DapDDX, DapData } from 'dap-query-js/dist/dap-query';
import { NgbAccordion } from '@ng-bootstrap/ng-bootstrap';
import { FeatureInfoService } from '../services/featureinfo.service';

declare var ga: Function;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  layers: Array<MappedLayer> = [];
  markers: Array<SimpleMarker> = [];
  topLayer: MappedLayer;

  title = 'app works!';
  catalog: Catalog;
  panels = {
    catalog: true,
    layers: true
  }
  openPanels = Object.keys(this.panels);

  currentPoint: LatLng;
  showSelection: boolean = false;
  detailsMode: ('feature' | 'chart' | 'html');
  selectedFeature: Feature<GeometryObject>;
  selectedFeatureLayer: MappedLayer;
  htmlDetailText = '';

  chartTitle = '';
  timeSeries: TimeSeries[];
  fullExtent: Bounds = {
    east: 160,
    north: -10,
    south: -45,
    west: 110
  };
  mapTypePosition: number;
  showWindows = true;

  chartTitleFont = {
    size:12
  };

  @ViewChild('splash', { static: true }) splash: OneTimeSplashComponent;
  @ViewChild('catalogView', { static: false }) catalogView: CatalogComponent;
  @ViewChild('accordion', { static: true }) accordion: NgbAccordion;
  @ViewChild(LayeredMapComponent, { static: true }) map: LayeredMapComponent;

  constructor(
    private catalogService: CatalogService,
    paletteService: PaletteService,
    private timeSeriesService: TimeseriesService,
    private pointSelections: PointSelectionService,
    private meta: MetadataService,
    private dap: OpendapService,
    mapsApi: MapsAPILoader) {
    private featureInfo: FeatureInfoService) {
    catalogService.loadFrom(environment.catalog).subscribe(c => this.catalog = c);
    paletteService.source = environment.palettes
    ga('send', 'pageview');

    this.pointSelections.latestPointSelection.subscribe(sel => {
      this.plotPointTimeseries(sel);
    });

    mapsApi.load().then(()=>{
      this.mapTypePosition= google.maps.ControlPosition.BOTTOM_LEFT;
    });
  }

  layersChanged(layers: MappedLayer[]) {
    setTimeout(() => {
      this.layers = layers;
      if (this.currentPoint) {
        this.buildSiteDataPanel();
      }
      this.topLayer = this.layers[0];
      this.catalogView.activeLayers(layers.map(l => l.layer));

      setTimeout(() => {
        Object.keys(this.panels).forEach(p => {
          if (!this.panels[p]) {
            return;
          }
          if (this.accordion.activeIds.indexOf(p) < 0) {
            this.accordion.toggle(p);
          }
        });
      });
    });
  }

  gaEvent(category: string, action: string, context: string) {
    ga('send', 'event', category, action, context);
  }

  gridLayer(l: Layer): boolean {
    let vectors = (l.options && l.options.vectors) || (
      l.publications[0] && l.publications[0].options &&
      l.publications[0].options.vectors);

    return !vectors;
  }

  layerSelected(selection: LayerSelection) {
    let existing = this.map.layers.findIndex(ml => ml.layer === selection.layer);
    if (existing >= 0) {
      let layers = this.layers.slice();
      layers.splice(existing, 1);
      this.layersChanged(layers);
      return;
    }

    if (this.gridLayer(selection.layer)) {
      selection.action = 'replace';
      selection.filter = (ml: MappedLayer) => {
        return this.gridLayer(ml.layer);
      };
    }

    const isPolygon = (l:Layer)=>l.options&&l.options.vectors==='polygon';
    if(isPolygon(selection.layer)){
      selection.action = 'replace';
      selection.filter = (ml: MappedLayer) => {
        return isPolygon(ml.layer);
      };
    }

    this.map.layerAdded(selection);

    if (selection.layer.options.smallExtent) {
      this.map.lat = selection.layer.lat;
      this.map.lng = selection.layer.lon;
      this.map.zoom = selection.layer.zoom || 13;
    }

    this.gaEvent('layers', selection.action, selection.layer.name);
  }

  featureSelected(evt: {feature: Feature<GeometryObject>, layer?:MappedLayer}) {
    this.detailsMode = 'feature';
    this.showSelection = true;
    this.selectedFeature = evt.feature;
    this.selectedFeatureLayer = evt.layer;

    this.currentPoint = null;
    this.markers = [];
  }

  pointSelected(p: LatLng) {
    this.currentPoint = p;
    this.gaEvent('selection', 'point', `${p.lat},${p.lng}`);
    this.buildSiteDataPanel();
  }

  evaluateChartLabels() {
    let tags: string[] = [].concat(...this.timeSeries.map(ts => Object.keys(ts.tags || {})));
    const uniq = (vals: string[]) => vals.filter((v, i) => vals.indexOf(v) === i);
    const stringifyTag = (t: any) => {
      if ((t === undefined) || (t === null)) {
        return t;
      }
      if (t.lat && t.lng) {
        return `[${t.lat.toFixed(3)},${t.lng.toFixed(3)}]`;
      }
      return t.toString();
    };

    tags = uniq(tags);
    let title = '';
    let labelTags: string[] = [];
    let titleTags: string[] = [];
    let labels: string[] = this.timeSeries.map(() => '');
    const TAG_BREAK='<TAG-BREAK>';
    const TITLE_SPLIT_THRESHOLD=22;
    const BREAK_TAG='<br>';
    let breaks = 0;
    tags.forEach(t => {
      const values = this.timeSeries.map(ts => stringifyTag((ts.tags || {})[t]))
      if (uniq(values).length === 1) {
        titleTags.push(values[0]);
        title += values[0] + TAG_BREAK;
        breaks++;
      } else {
        values.forEach((v, i) => {
          labels[i] += v + ' ';
        });
        labelTags.push(t);
      }
    });

    if(breaks && title.length>TITLE_SPLIT_THRESHOLD){
      let titleParts = title.split(TAG_BREAK);
      let current='';
      title = '';
      titleParts.forEach(p=>{
        if((current.length + p.length) >= (TITLE_SPLIT_THRESHOLD*1.5)){
          title += current + BREAK_TAG;
          current = '';
        }
        current += p + ' ';
        if(current.length > TITLE_SPLIT_THRESHOLD) {
          title += current + BREAK_TAG;
          current = '';
        }
      });
      title += current;
    }

    for (var i = 0; i < this.timeSeries.length; i++) {
      this.timeSeries[i].label = labels[i].trim() || `ts ${i + 1}`;
    }
    this.chartTitle = title.trim() || 'Various timeseries';
  }

  addOrReplaceTimeSeries(ts?: TimeSeries) {
    this.timeSeries = this.timeSeries || [];
    this.timeSeries = this.timeSeries.filter(existing => existing.pinned);

    if (ts) {
      this.timeSeries.push(ts);
    }

    if (this.timeSeries.length) {
      this.detailsMode = 'chart';
    } else {
      this.detailsMode = 'feature';
    }

    this.evaluateChartLabels();
  }

  plotPointTimeseries(sel: PointSelection) {
    if (!sel) {
      this.addOrReplaceTimeSeries();
      return;
    }

    let url = this.pointSelections.fullUrl(sel);
    let fillValue = NaN;
    forkJoin(this.meta.ddxForUrl(url), this.meta.dasForUrl(url)).pipe(

      map(dasDDX => {
        let ddx: DapDDX = dasDDX[0];
        let das: DapDAS = dasDDX[1];
        fillValue = +ddx.variables[sel.variable]._FillValue ||
          +ddx.variables[sel.variable].missing_value ||
          fillValue;
        return {
          das: das,
          query: this.timeSeriesService.makeTimeQuery(ddx, sel.variable,
            sel.catalog.coordinates.latitude,
            sel.catalog.coordinates.longitude,
            null)
        };
      }),
      map(dasAndQuery => forkJoin([
        this.dap.getData(`${url}.ascii?${sel.variable}${dasAndQuery.query}`, dasAndQuery.das),
        of(dasAndQuery.das)
      ])),
      switchAll()
    ).subscribe(dataAndDas => {
      const data:DapData = dataAndDas[0];
      const das:DapDAS = dataAndDas[1];
      const ts: TimeSeries = {
        dates: <Date[]>data.time,
        values: (<number[]>data[sel.variable]).map(v => (v === fillValue) ? NaN : v),
        tags: {
          variable: sel.variable
        },
        style: sel.catalog.chart || 'line'
      };
      (sel.catalog.labels || []).forEach(lbl => {
        ts.tags[lbl] = sel.feature.properties[lbl];
      });
      ts.units = das.variables[sel.variable].units;
      this.addOrReplaceTimeSeries(ts);
    });
  }

  coordinateText(loc:any,precision?:number){
    const lat = Math.abs(loc.lat);
    const lng = Math.abs(loc.lng);
    const dir = (loc.lat<0)?'S':'N';

    if(precision===undefined){
      return `${lat}°${dir}, ${lng}°E`
    }
    return `${lat.toFixed(precision)}°${dir}, ${lng.toFixed(precision)}°E`
  }

  buildSiteDataPanel() {
    var markers: Array<SimpleMarker> = [
      {
        loc: this.currentPoint,
        value: '',
        open: false,
        iconUrl: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|616a34'
      }
    ];
    this.markers = markers;
    var tsLayer = this.findTimeSeriesLayer();

    if (!tsLayer) {
      this.detailsMode = 'html';
      this.featureInfo.getFeatureInfo().subscribe(res => {
        this.htmlDetailText = res;
        this.showSelection = true;
      });
      return;
    }

    this.timeSeriesService.getTimeseriesForLayer(tsLayer, this.currentPoint).subscribe(res => {
      res.style = tsLayer.flattenedSettings.chart || 'line';
      res.label = 'ts 0';
      res.tags = {
        layer: tsLayer.title,
        loc: this.coordinateText(this.currentPoint,3)
      }
      res.units = tsLayer.flattenedSettings.units;
      if (res.dates) {
        this.addOrReplaceTimeSeries(res);
        this.showSelection = true;
      }
      let val: number;
      if (res.values.length === 1) {
        val = res.values[0];
      } else if (res.dates && tsLayer.options.date) {
        // Find closest timestep...
        let offsets = res.dates.map(d => Math.abs(d.getTime() - tsLayer.options.date.getTime()));
        let idx = offsets.indexOf(Math.min.apply(Math, offsets));
        val = res.values[idx];
      }
      const coordPrecision = +Math.sqrt(this.map.zoom).toFixed();
      const loc: any = markers[0].loc;
      const coordText = this.coordinateText(loc,coordPrecision);
      const valueText = (isNaN(val) || (val === null) || (val === undefined)) ? '-' : val.toString();
      const units = tsLayer.flattenedSettings.units||'';
      markers[0].value = `${coordText}: ${valueText}${units}`;
      markers[0].open = true;
      this.markers = this.markers.slice();
    });
  }

  private findTimeSeriesLayer() {
    return this.layers.find(ml => {
      if (ml.flattenedSettings.host.software !== 'tds') {
        return false;
      }
      return true;
    });
  }

  removeTimeSeries(i: number) {
    this.timeSeries.splice(i, 1);
    this.timeSeries = this.timeSeries.slice();
    if (!this.timeSeries.length) {
      this.detailsMode = 'feature';
      this.showSelection = false;
    }
  }

  panelToggle(event: any) {
    this.panels[event.panelId] = event.nextState;
  }

  closeAbout(){
    this.splash.close();
  }

  showAbout(event:any){
    event.stopPropagation();
    event.preventDefault();
    this.splash.show();
  }

  toggleWindows(){
    this.showWindows = !this.showWindows;
  }

}
