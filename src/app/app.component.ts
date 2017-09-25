import { Component, ViewChild } from '@angular/core';
import { environment } from 'environments/environment';
import { Feature, Point, GeometryObject } from 'geojson';

import { LayerSelection, LayerAction, LayeredMapComponent, 
  PaletteService, MappedLayer, CatalogService, Catalog,
  SimpleMarker, TimeseriesService, TimeSeries
} from 'map-wald';
import { LatLng } from '@agm/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  layers:Array<MappedLayer> = [];
  
  title = 'app works!';
  catalog:Catalog;
  openPanels = [
    'catalog',
    'layers'
  ];

  showSelection: boolean = false;
  detailsMode: ('feature'|'chart');
  selectedFeature: Feature<GeometryObject>;
  timeSeries: [TimeSeries];
  
  constructor(
    private catalogService:CatalogService,
    paletteService:PaletteService,
    private timeSeriesService:TimeseriesService){
    catalogService.loadFrom(environment.catalog).subscribe(c=>this.catalog=c);
    paletteService.source = environment.palettes
  }

  @ViewChild(LayeredMapComponent) map:LayeredMapComponent;

  layerSelected(selection:LayerSelection){
    this.map.layerAdded(selection);
  }

  featureSelected(f:Feature<GeometryObject>){
    this.detailsMode = 'feature';
    this.showSelection = true;
    this.selectedFeature = f;
  }

  pointSelected(p:LatLng){
    var markers:Array<SimpleMarker> = [
      {
        loc:p,
        value:'here',
        open:false
      }
    ];
    this.map.markers = markers;
    console.log(this.map.layers);
    var tsLayer = this.findTimeSeriesLayer();
    if(!tsLayer){
      return;
    }

    this.timeSeriesService.getTimeseries(tsLayer,p).subscribe(res=>{
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
