import { Component, ViewChild } from '@angular/core';
import { environment } from 'environments/environment';
import { Feature, GeometryObject } from 'geojson';
import { ControlPosition } from '@agm/core/services/google-maps-types';

import { LayerSelection, LayeredMapComponent,
  PaletteService, MappedLayer, CatalogService, Catalog,
  SimpleMarker, TimeseriesService, TimeSeries, Bounds,
  PointSelectionService, PointSelection, MetadataService, OpendapService, Layer, OneTimeSplashComponent, CatalogComponent
} from 'map-wald';
import { LatLng } from '@agm/core';
import { map, switchAll } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { DapDAS, DapDDX } from 'dap-query-js/dist/dap-query';

declare var ga: Function;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  layers:Array<MappedLayer> = [];
  topLayer:MappedLayer;
  
  title = 'app works!';
  catalog:Catalog;
  panels = {
    catalog:true,
    layers:true
  }
  openPanels = Object.keys(this.panels);

  currentPoint:LatLng;
  showSelection: boolean = false;
  detailsMode: ('feature'|'chart');
  selectedFeature: Feature<GeometryObject>;
  chartTitle = '';
  timeSeries: TimeSeries[];
  fullExtent:Bounds = {
    east:160,
    north:-10,
    south:-45,
    west:110
  };
  mapTypePosition:number = ControlPosition.BOTTOM_LEFT;

  @ViewChild('splash') splash: OneTimeSplashComponent;
  @ViewChild('catalogView') catalogView: CatalogComponent;

  constructor(
    private catalogService:CatalogService,
    paletteService:PaletteService,
    private timeSeriesService:TimeseriesService,
    private pointSelections:PointSelectionService,
    private meta:MetadataService,
    private dap:OpendapService){
    catalogService.loadFrom(environment.catalog).subscribe(c=>this.catalog=c);
    paletteService.source = environment.palettes
    ga('send', 'pageview');

    this.pointSelections.latestPointSelection.subscribe(sel=>{
      this.plotPointTimeseries(sel);
    })
  }

  @ViewChild(LayeredMapComponent) map:LayeredMapComponent;

  layersChanged(layers:MappedLayer[]){
    setTimeout(()=>{
      this.layers=layers;
      if(this.currentPoint){
        this.buildChart();
      }
      this.topLayer = this.layers[0];
      this.catalogView.activeLayers(layers.map(l=>l.layer));
    });
  }

  gaEvent(category:string,action:string,context:string){
    ga('send','event',category,action,context);
  }

  gridLayer(l:Layer):boolean{
    let vectors = (l.options && l.options.vectors) || (
                l.publications[0] && l.publications[0].options && 
                l.publications[0].options.vectors);

    return !vectors;
  }

  layerSelected(selection:LayerSelection){
    let existing = this.map.layers.findIndex(ml=>ml.layer===selection.layer);
    if(existing>=0){
      let layers = this.layers.slice();
      layers.splice(existing,1);
      this.layersChanged(layers);
      return;
    }

    if(this.gridLayer(selection.layer)){
      selection.action='replace';
      selection.filter = (ml:MappedLayer)=>{
        return this.gridLayer(ml.layer);
      };
    }
    this.map.layerAdded(selection);

    if(selection.layer.options.smallExtent){
      this.map.lat = selection.layer.lat;
      this.map.lng = selection.layer.lon;
      this.map.zoom = selection.layer.zoom || 13;
      }

    this.gaEvent('layers',selection.action,selection.layer.name);
  }

  featureSelected(f:Feature<GeometryObject>){
    this.detailsMode = 'feature';
    this.showSelection = true;
    this.selectedFeature = f;
    this.currentPoint=null;
    this.map.markers = [];
  }

  pointSelected(p:LatLng){
    this.currentPoint=p;
    this.gaEvent('selection','point',`${p.lat},${p.lng}`);
    this.buildChart();
  }

  evaluateChartLabels(){
    let tags:string[] = [].concat(...this.timeSeries.map(ts=>Object.keys(ts.tags||{})));
    const uniq = (vals:string[])=>vals.filter((v,i)=>vals.indexOf(v)===i);
    const stringifyTag = (t:any)=>{
      if((t===undefined)||(t===null)){
        return t;
      }
      if(t.lat&&t.lng){
        return `[${t.lat.toFixed(3)},${t.lng.toFixed(3)}]`;
      }
      return t.toString();
    };

    tags = uniq(tags);
    let title = '';
    let labelTags:string[] = [];
    let titleTags:string[] = [];
    let labels:string[] = this.timeSeries.map(()=>'');
    tags.forEach(t=>{
      const values = this.timeSeries.map(ts=>stringifyTag((ts.tags||{})[t]))
      if(uniq(values).length===1){
        titleTags.push(values[0]);
        title += values[0] + ' ';
      } else {
        values.forEach((v,i)=>{
          labels[i]+= v + ' ';
        });
        labelTags.push(t);
      }
    });

    for(var i = 0;i<this.timeSeries.length;i++){
      this.timeSeries[i].label = labels[i].trim() || `ts ${i+1}`;
    }
    this.chartTitle = title.trim() || 'Various timeseries';
  }

  addOrReplaceTimeSeries(ts?:TimeSeries){
    this.timeSeries = this.timeSeries || [];
    this.timeSeries = this.timeSeries.filter(ts=>ts.pinned);

    if(ts){
      this.timeSeries.push(ts);
    }

    if(this.timeSeries.length){
      this.detailsMode = 'chart';
    } else {
      this.detailsMode = 'feature';
    }

    this.evaluateChartLabels();
  }

  plotPointTimeseries(sel:PointSelection){
    if(!sel){
      this.addOrReplaceTimeSeries();
      return;
    }

    let url = this.pointSelections.fullUrl(sel);
    let fillValue = NaN;
    forkJoin(this.meta.ddxForUrl(url),this.meta.dasForUrl(url)).pipe(

      map(dasDDX=>{
        let ddx:DapDDX = dasDDX[0];
        let das:DapDAS = dasDDX[1];
        fillValue = +ddx.variables[sel.variable]._FillValue ||
                    +ddx.variables[sel.variable].missing_value ||
                    fillValue;
        return {
          das:das,
          query:this.timeSeriesService.makeTimeQuery(ddx,sel.variable,
                                                    sel.catalog.coordinates.latitude,
                                                    sel.catalog.coordinates.longitude,
                                                    null)
        };
      }),
      map(dasAndQuery=>this.dap.getData(`${url}.ascii?${sel.variable}${dasAndQuery.query}`,dasAndQuery.das)),
      switchAll()
    ).subscribe(data=>{
      let ts = {
        dates:<Date[]>data.time,
        values:(<number[]>data[sel.variable]).map(v=>(v===fillValue)?NaN:v),
        tags:{
          variable:sel.variable
        }
      };
      (sel.catalog.labels||[]).forEach(lbl=>{
        ts.tags[lbl]=sel.feature.properties[lbl];
      });
      this.addOrReplaceTimeSeries(ts);
    })
    // get... (along with das?, ddx?)
    // this.timeSeriesService.
    
    // getTimeseriesForLayer(tsLayer,this.currentPoint).subscribe(res=>{
    //   this.timeSeries = [res];
    //   this.detailsMode = 'chart';
    //   this.showSelection=true;
    // });
  }

  buildChart(){
    var markers:Array<SimpleMarker> = [
      {
        loc:this.currentPoint,
        value:'',
        open:false,
        iconUrl:'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|616a34'
      }
    ];
    this.map.markers = markers;
    var tsLayer = this.findTimeSeriesLayer();
    if(!tsLayer){
      this.detailsMode='feature';
      return;
    }

    this.timeSeriesService.getTimeseriesForLayer(tsLayer,this.currentPoint).subscribe(res=>{
      res.style = tsLayer.flattenedSettings.chart || 'line';
      res.label = 'ts 0';
      res.tags = {
        layer:tsLayer.title,
        loc:this.currentPoint
      }
      if(res.dates){
        this.addOrReplaceTimeSeries(res);
        this.showSelection=true;
      }
      let val:number;
      if(res.values.length===1){
        val = res.values[0];
      } else if(res.dates&&tsLayer.options.date){
        // Find closest timestep...
        let offsets = res.dates.map(d=>Math.abs(d.getTime()-tsLayer.options.date.getTime()));
        let idx = offsets.indexOf(Math.min.apply(Math, offsets));
        val = res.values[idx];
      }
      const coordPrecision = +Math.sqrt(this.map.zoom).toFixed();
      const loc:any = markers[0].loc;
      const coordText = `${loc.lat.toFixed(coordPrecision)}, ${loc.lng.toFixed(coordPrecision)}`;
      const valueText = (isNaN(val)||(val===null)||(val===undefined))?'-':val.toString();
      markers[0].value = `${coordText}: ${valueText}`;
      markers[0].open = true;
  });
  }

  private findTimeSeriesLayer() {
    return this.layers.find(ml => {
      if(ml.flattenedSettings.host.software !== 'tds') {
        return false;
      }
      return true;
    });
  }

  removeTimeSeries(i:number){
    this.timeSeries.splice(i,1);
    this.timeSeries = this.timeSeries.slice();
    if(!this.timeSeries.length){
      this.detailsMode='feature';
      this.showSelection=false;
    }
  }

  panelToggle(event:any){
    this.panels[event.panelId] = !this.panels[event.panelId];
  }
}
