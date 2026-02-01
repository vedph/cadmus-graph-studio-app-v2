import { render } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MappingRunnerComponent } from './mapping-runner.component';

describe('MappingRunnerComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MappingRunnerComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
