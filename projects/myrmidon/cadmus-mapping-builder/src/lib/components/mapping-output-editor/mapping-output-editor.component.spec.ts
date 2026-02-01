import { render } from '@testing-library/angular';

import { MappingOutputEditorComponent } from './mapping-output-editor.component';

describe('MappingOutputEditorComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MappingOutputEditorComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
