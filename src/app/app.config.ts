import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { API_CONFIG } from './core/http/api-config';
import { communityCredentialsInterceptor } from './core/http/community-http.interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([communityCredentialsInterceptor])),
    provideRouter(routes),
    {
      provide: API_CONFIG,
      useValue: environment,
    },
  ]
};
