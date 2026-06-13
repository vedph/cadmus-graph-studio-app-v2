import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';

import { provideNativeDateAdapter } from '@angular/material/core';

import {
  NODE_MAPPING_SERVICE,
  RamNodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

import {
  DefaultMonacoLoader,
  NGX_MONACO_LOADER_PROVIDER,
} from '@jean-merelis/ngx-monaco-editor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withViewTransitions()),
    provideNativeDateAdapter(),
    provideHttpClient(withXhr()),
    // monaco
    {
      provide: NGX_MONACO_LOADER_PROVIDER,
      useFactory: () => new DefaultMonacoLoader({ paths: { vs: '/vs' } }),
    },
    // use RAM-based store for mappings: note we must useExisting
    // because the service is already provided in the root, and
    // when using the injection token NODE_MAPPING_SERVICE useClass
    // would create a new instance, which is not what we want.
    {
      provide: NODE_MAPPING_SERVICE,
      useExisting: RamNodeMappingService,
    },
  ],
};
