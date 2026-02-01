import { render } from '@testing-library/angular';

import { MappingTreeFilterComponent } from './mapping-tree-filter';
import { NODE_MAPPING_SERVICE } from '../../models';
import { RamNodeMappingService } from '../../services/ram-node-mapping.service';

describe('MappingTreeFilter', () => {
  it('should create', async () => {
    const { fixture } = await render(MappingTreeFilterComponent, {
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
