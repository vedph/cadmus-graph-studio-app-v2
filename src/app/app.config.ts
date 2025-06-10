import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { provideNativeDateAdapter } from '@angular/material/core';

import {
  NODE_MAPPING_SERVICE,
  RamNodeMappingService,
} from '../../projects/myrmidon/cadmus-mapping-builder/src/public-api';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideAnimationsAsync(),
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
