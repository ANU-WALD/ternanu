import { environment } from '../environments/environment'

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MapWaldCoreModule} from 'map-wald';
import { MapWaldBootstrapModule } from 'map-wald-visual';
import { AgmCoreModule } from '@agm/core';

import { routeParameters, AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainMapComponent } from './main-map/main-map.component';
import { FeatureInfoService } from '../services/featureinfo.service';

@NgModule({
  declarations: [
    AppComponent,
    MainMapComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    NgbModule.forRoot(),
    AgmCoreModule.forRoot({
      apiKey: environment.google_maps_api_key
    }),
    MapWaldCoreModule.forRoot({paths:routeParameters}),
    MapWaldBootstrapModule,
    AppRoutingModule
  ],
  providers: [FeatureInfoService],
  bootstrap: [AppComponent]
})
export class AppModule { }
