import { Component, ViewChild } from '@angular/core';
import { environment } from 'environments/environment';
import { Feature, Point, GeometryObject } from 'geojson';

import { LayerSelection, LayerAction, LayeredMapComponent, 
  PaletteService, MappedLayer, CatalogService, Catalog,
  SimpleMarker, TimeseriesService, TimeSeries, Bounds, PointSelectionService, PointSelection, MetadataService, OpendapService
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
  openPanels = [
    'catalog',
    'layers'
  ];

  currentPoint:LatLng;
  showSelection: boolean = false;
  detailsMode: ('feature'|'chart');
  selectedFeature: Feature<GeometryObject>;
  timeSeries: TimeSeries[];
  fullExtent:Bounds = {
    east:160,
    north:-10,
    south:-45,
    west:110
  };

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

  layersChanged(){
    if(this.currentPoint){
      this.buildChart();
    }
    this.topLayer = this.layers[0];
  }

  gaEvent(category:string,action:string,context:string){
    ga('send','event',category,action,context);
  }

  layerSelected(selection:LayerSelection){
    this.map.layerAdded(selection);
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

  plotPointTimeseries(sel:PointSelection){
    if(!sel){
      this.timeSeries = [];
      return;
    }

    let url = this.pointSelections.fullUrl(sel);
    forkJoin(this.meta.ddxForUrl(url),this.meta.dasForUrl(url)).pipe(
      map(dasDDX=>{
        let ddx:DapDDX = dasDDX[0];
        let das:DapDAS = dasDDX[1];
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
        values:<number[]>data[sel.variable]
      };
      this.timeSeries = [ts];
      this.detailsMode = 'chart';
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
        value:'here',
        open:false,
        iconUrl:'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|616a34'
      }
    ];
    this.map.markers = markers;
    console.log(this.map.layers);
    var tsLayer = this.findTimeSeriesLayer();
    if(!tsLayer){
      return;
    }

    this.timeSeriesService.getTimeseriesForLayer(tsLayer,this.currentPoint).subscribe(res=>{
      this.timeSeries = [res];
      this.detailsMode = 'chart';
      this.showSelection=true;
    });
  }

    private findTimeSeriesLayer() {
        return this.map.layers.find(ml => {
        if(ml.flattenedSettings.host.software !== 'tds') {
        return false;
    }
        return true;
    });
    }
}
