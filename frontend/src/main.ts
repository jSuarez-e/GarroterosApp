/**
 * @sdd
 * [Objetivo]: Bootstrap principal y configuracion standalone de la aplicacion Ionic/Angular en frontend.
 * [I/O]: Inicializa AppComponent con IonicRouteStrategy, modo md, enrutamiento desacoplado e interceptores HTTP.
 * [Edge Cases]: Inyeccion global de interceptores HTTP en cadena (authInterceptor, networkErrorInterceptor) y politicas de renderizado Ionic.
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { networkErrorInterceptor } from './app/core/interceptors/network-error.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      mode: 'md'
    }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor, networkErrorInterceptor])
    ),
  ],
});