import { render } from '@testing-library/angular';

import { MappingFilterComponent } from './mapping-filter.component';
import { NODE_MAPPING_SERVICE } from '../../models';
import { RamNodeMappingService } from '../../services/ram-node-mapping.service';

describe('MappingFilterComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MappingFilterComponent, {
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
