import { render } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MappingTreeEditorComponent } from './mapping-tree-editor.component';

describe('MappingTreeEditorComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MappingTreeEditorComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
