import { render } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { JmesComponent } from './jmes.component';

describe('JmesComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(JmesComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
