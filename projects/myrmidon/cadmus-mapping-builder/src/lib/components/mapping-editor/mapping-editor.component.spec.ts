import { render } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { MappingEditorComponent } from './mapping-editor.component';

describe('MappingEditorComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MappingEditorComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
