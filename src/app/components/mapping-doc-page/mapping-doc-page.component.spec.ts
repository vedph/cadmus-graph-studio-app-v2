import { render } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { MappingDocPageComponent } from './mapping-doc-page.component';
import {
  NODE_MAPPING_SERVICE,
  RamNodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

describe('MappingDocPageComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MappingDocPageComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        {
          provide: NODE_MAPPING_SERVICE,
          useClass: RamNodeMappingService,
        },
      ],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
