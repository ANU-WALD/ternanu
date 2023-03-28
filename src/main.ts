import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

declare global {
  interface Window {
    dataLayer: any;
    gtag: any;
  }
}

if (environment.production) {
  enableProdMode();
}

if (environment.google_analytics_id) {
  // add GA script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ environment.google_analytics_id }`;
  document.getElementsByTagName('head')[0].appendChild(script);
  // setup GA
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(...args: any[]) {
    window.dataLayer.push(arguments);
  }
} else {
  window.gtag = function(...args: any[]) {};
}
window.gtag('js', new Date());

window.gtag('config', environment.google_analytics_id);


platformBrowserDynamic().bootstrapModule(AppModule);
