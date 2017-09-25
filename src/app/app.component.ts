import { Component, ViewChild } from '@angular/core';
import { environment } from 'environments/environment';
import { Feature, Point, GeometryObject } from 'geojson';

import { LayerSelection, LayerAction, LayeredMapComponent, 
  PaletteService, MappedLayer, CatalogService, Catalog } from 'map-wald';

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

  constructor(
    private catalogService:CatalogService,
    paletteService:PaletteService){
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
}
