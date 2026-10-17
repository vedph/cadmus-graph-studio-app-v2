import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { CachedTextPickerComponent } from './cached-text-picker.component';
import { RamCacheService } from '../../services/ram-cache.service';

describe('CachedTextPickerComponent', () => {
  let cache: RamCacheService;

  const setup = async (inputs: { keyPrefix?: string; text?: string } = {}) => {
    const textPick = vi.fn();
    const result = await render(CachedTextPickerComponent, {
      inputs: { keyPrefix: 'map_', text: 'some text', ...inputs },
      on: { textPick },
      providers: [{ provide: RamCacheService, useValue: cache }],
    });
    return { ...result, textPick, user: userEvent.setup() };
  };

  const choosePreset = async (
    user: ReturnType<typeof userEvent.setup>,
    key: string
  ) => {
    await user.click(screen.getByRole('combobox', { name: 'preset' }));
    await user.click(await screen.findByRole('option', { name: key }));
  };

  beforeEach(() => {
    cache = new RamCacheService();
  });

  it('should not show the preset selector when there are no presets', async () => {
    await setup();
    expect(
      screen.queryByRole('combobox', { name: 'preset' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'key' })).toBeInTheDocument();
  });

  it('should list only the presets with the key prefix, sorted', async () => {
    cache.add('map_zeta', 'z');
    cache.add('map_alpha', 'a');
    cache.add('jms_other', 'o');
    const { user } = await setup();

    await user.click(screen.getByRole('combobox', { name: 'preset' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      'map_alpha',
      'map_zeta',
    ]);
  });

  it('should disable pick and delete until a preset is selected', async () => {
    cache.add('map_one', 'one');
    await setup();
    expect(screen.getByRole('button', { name: 'pick preset' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'delete preset' })
    ).toBeDisabled();
  });

  it('should emit the text of the picked preset', async () => {
    cache.add('map_one', 'text one');
    cache.add('map_two', 'text two');
    const { user, textPick } = await setup();

    await choosePreset(user, 'map_two');
    await user.click(screen.getByRole('button', { name: 'pick preset' }));

    expect(textPick).toHaveBeenCalledExactlyOnceWith('text two');
  });

  it('should delete the selected preset', async () => {
    cache.add('map_one', 'one');
    cache.add('map_two', 'two');
    const { user, fixture } = await setup();

    await choosePreset(user, 'map_one');
    await user.click(screen.getByRole('button', { name: 'delete preset' }));
    await fixture.whenStable();

    expect(cache.has('map_one')).toBe(false);
    expect(cache.has('map_two')).toBe(true);
    // the selection is cleared
    expect(screen.getByRole('button', { name: 'pick preset' })).toBeDisabled();
    await user.click(screen.getByRole('combobox', { name: 'preset' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent?.trim())).toEqual(['map_two']);
  });

  it('should add the text as a prefixed preset', async () => {
    const { user, fixture } = await setup({ text: 'new text' });

    await user.type(screen.getByRole('textbox', { name: 'key' }), 'new');
    await user.click(screen.getByRole('button', { name: 'add preset' }));
    await fixture.whenStable();

    expect(cache.get('map_new')).toBe('new text');
    await user.click(screen.getByRole('combobox', { name: 'preset' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent?.trim())).toEqual(['map_new']);
  });

  it('should not duplicate a preset added twice', async () => {
    cache.add('map_one', 'old');
    const { user, fixture } = await setup({ text: 'new' });

    await user.type(screen.getByRole('textbox', { name: 'key' }), 'one');
    await user.click(screen.getByRole('button', { name: 'add preset' }));
    await fixture.whenStable();

    expect(cache.get('map_one')).toBe('new');
    await user.click(screen.getByRole('combobox', { name: 'preset' }));
    expect(await screen.findAllByRole('option')).toHaveLength(1);
  });

  it('should pick a preset added in the same session', async () => {
    const { user, fixture, textPick } = await setup({ text: 'fresh' });

    await user.type(screen.getByRole('textbox', { name: 'key' }), 'fresh');
    await user.click(screen.getByRole('button', { name: 'add preset' }));
    await fixture.whenStable();
    await choosePreset(user, 'map_fresh');
    await user.click(screen.getByRole('button', { name: 'pick preset' }));

    expect(textPick).toHaveBeenCalledWith('fresh');
  });

  it('should add a preset on Enter in the key field', async () => {
    const { user, fixture } = await setup({ text: 'entered' });
    await user.type(screen.getByRole('textbox', { name: 'key' }), 'k{Enter}');
    await fixture.whenStable();
    expect(cache.get('map_k')).toBe('entered');
  });

  it('should not add on Enter without text', async () => {
    const { user } = await setup({ text: '' });
    await user.type(screen.getByRole('textbox', { name: 'key' }), 'k{Enter}');
    expect(cache.getKeys()).toEqual([]);
  });

  it('should render no <form>, as it is embedded in other forms', async () => {
    const { container } = await setup();
    expect(container.querySelector('form')).toBeNull();
  });

  it('should disable adding without text', async () => {
    const { user } = await setup({ text: '' });
    await user.type(screen.getByRole('textbox', { name: 'key' }), 'k');
    expect(screen.getByRole('button', { name: 'add preset' })).toBeDisabled();
  });

  it('should disable adding without a key', async () => {
    await setup();
    expect(screen.getByRole('button', { name: 'add preset' })).toBeDisabled();
  });

  it('should show the key validation errors', async () => {
    const { user } = await setup();
    const key = screen.getByRole('textbox', { name: 'key' });

    await user.type(key, 'x');
    await user.clear(key);
    // Material shows errors for touched controls
    await user.tab();
    expect(await screen.findByText('key required')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'add preset' })).toBeDisabled();
  });

  it('should cap the key length', async () => {
    const { user } = await setup();
    const key = screen.getByRole('textbox', { name: 'key' });
    // the maxLength rule is rendered as a native maxlength attribute
    expect(key).toHaveAttribute('maxlength', '50');
    await user.type(key, 'k'.repeat(51));
    expect(key).toHaveValue('k'.repeat(50));
  });

  it('should reload the presets when the key prefix changes', async () => {
    cache.add('map_one', '1');
    cache.add('jms_two', '2');
    const { user, rerender } = await setup();

    await rerender({ inputs: { keyPrefix: 'jms_' }, partialUpdate: true });
    await user.click(screen.getByRole('combobox', { name: 'preset' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent?.trim())).toEqual(['jms_two']);
  });
});
