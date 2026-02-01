import { render } from '@testing-library/angular';

import { MappingTreeComponent } from './mapping-tree.component';

describe('MappingTreeComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MappingTreeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
