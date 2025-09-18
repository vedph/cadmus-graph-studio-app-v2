import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { provideNativeDateAdapter } from '@angular/material/core';

import {
  NODE_MAPPING_SERVICE,
  RamNodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideNativeDateAdapter(),
    provideHttpClient(),
    // monaco
    importProvidersFrom(NgeMonacoModule.forRoot({})),
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
