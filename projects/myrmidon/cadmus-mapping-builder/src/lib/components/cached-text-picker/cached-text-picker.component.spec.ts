import { render } from '@testing-library/angular';

import { CachedTextPickerComponent } from './cached-text-picker.component';

describe('CachedTextPickerComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(CachedTextPickerComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
