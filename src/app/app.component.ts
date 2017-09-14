import { Component, ViewChild } from '@angular/core';
import { CatalogService, Catalog } from 'map-wald';
import { environment } from 'environments/environment';
import { LayerSelection, LayerAction, LayeredMapComponent } from 'map-wald';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'app works!';
  catalog:Catalog;

  constructor(private catService:CatalogService){
    catService.loadFrom(environment.catalog).subscribe(c=>this.catalog=c);
  }

  @ViewChild(LayeredMapComponent) map:LayeredMapComponent;
  
  layerSelected(selection:LayerSelection){
    this.map.layerAdded(selection);
  }
}
