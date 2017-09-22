import { Component, ViewChild } from '@angular/core';
import { environment } from 'environments/environment';

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
}
