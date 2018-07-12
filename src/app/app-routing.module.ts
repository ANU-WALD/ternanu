import {MapViewParameterService} from 'map-wald';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainMapComponent } from "./main-map/main-map.component";

export const routeParameters = ['layer'];
MapViewParameterService.parameterNames=routeParameters;

const routes: Routes = [
  {
    path: '**',
    component:MainMapComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes,{ useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
