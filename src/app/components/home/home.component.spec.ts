import { render } from '@testing-library/angular';

import { HomeComponent } from './home.component';
import {
  NODE_MAPPING_SERVICE,
  RamNodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

describe('HomeComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(HomeComponent, {
      providers: [
        {
          provide: NODE_MAPPING_SERVICE,
          useClass: RamNodeMappingService,
        },
      ],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
