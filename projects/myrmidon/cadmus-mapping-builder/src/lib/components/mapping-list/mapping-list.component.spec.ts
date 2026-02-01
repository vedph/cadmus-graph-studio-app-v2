import { render } from '@testing-library/angular';

import { MappingListComponent } from './mapping-list.component';
import { NODE_MAPPING_SERVICE } from '../../models';
import { RamNodeMappingService } from '../../services/ram-node-mapping.service';

describe('MappingListComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MappingListComponent, {
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
