import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class FeatureInfoService {

  constructor(private http:HttpClient) {

  }

  public getFeatureInfo(): Observable<any> {
    // const headers = new HttpHeaders({
    //   Accept:'text/html',
    // });
    // let url = 'https://geoserver.tern.org.au/geoserver/${workspace}/wms?SERVICE=WMS&VRESION=1.1.1&QUERY_LAYERS=aceas%3AVegetation%20Transformation&LAYERS=aceas%3AVegetation%20Transformation&exceptions=application%2Fvnd.ogc.se_inimage&INFO_FORMAT=text%2Fhtml&FEATURE_COUNT=50&X=50&Y=50&SRS=EPSG%3A4326&STYLES=&WIDTH=101&HEIGHT=101&BBOX=143.41552734375003%2C-19.84130859375%2C147.85400390625003%2C-15.40283203125
    // return this.http.get('aceas/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FORMAT=image%2Fpng&TRANSPARENT=true, { responseType: 'text' });
    return this.http.get('https://geoserver.tern.org.au/geoserver/aceas/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FORMAT=image%2Fpng&TRANSPARENT=true&QUERY_LAYERS=aceas%3AVegetation%20Transformation&LAYERS=aceas%3AVegetation%20Transformation&exceptions=application%2Fvnd.ogc.se_inimage&INFO_FORMAT=text%2Fhtml&FEATURE_COUNT=50&X=50&Y=50&SRS=EPSG%3A4326&STYLES=&WIDTH=101&HEIGHT=101&BBOX=143.41552734375003%2C-19.84130859375%2C147.85400390625003%2C-15.40283203125', { responseType: 'text' });
  }

//   public buildImageMap(getMap:()=>any,
//                        getURL:(zoom:number)=>string,
//                        getOptions?:(zoom:number)=>any,
//                        getOpacity?:()=>number):any{
}