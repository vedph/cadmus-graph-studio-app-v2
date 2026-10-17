import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Subject, of, throwError } from 'rxjs';

import { NgxMonacoEditorFakeHarness } from '@jean-merelis/ngx-monaco-editor/testing';

import { JmesComponent } from './jmes.component';
import { GraphStudioApiService } from '../../services/graph-studio-api.service';
import { RamCacheService } from '../../services/ram-cache.service';
import {
  provideFakeMonacoEditor,
  useFakeMonacoEditor,
} from '../../../testing/monaco-testing';

describe('JmesComponent', () => {
  let api: { jmesTransform: ReturnType<typeof vi.fn> };
  let cache: RamCacheService;

  const setup = async (expression?: string) => {
    useFakeMonacoEditor(JmesComponent);
    const expressionChange = vi.fn();
    const result = await render(JmesComponent, {
      inputs: { expression },
      // a model is subscribed to by its own name
      on: { expression: expressionChange },
      providers: [
        provideFakeMonacoEditor(),
        { provide: GraphStudioApiService, useValue: api },
        { provide: RamCacheService, useValue: cache },
      ],
    });
    const loader = TestbedHarnessEnvironment.loader(result.fixture);
    const [inputEditor, outputEditor] = await loader.getAllHarnesses(
      NgxMonacoEditorFakeHarness
    );
    return {
      ...result,
      expressionChange,
      inputEditor,
      outputEditor,
      user: userEvent.setup(),
    };
  };

  beforeEach(() => {
    api = { jmesTransform: vi.fn() };
    cache = new RamCacheService();
  });

  it('should show the bound expression', async () => {
    await setup('events[0].eid');
    expect(screen.getByRole('textbox', { name: 'jmes' })).toHaveValue(
      'events[0].eid'
    );
  });

  it('should update the expression when the bound value changes', async () => {
    const { rerender } = await setup('a');
    await rerender({ inputs: { expression: 'b' }, partialUpdate: true });
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'jmes' })).toHaveValue('b')
    );
  });

  it('should emit the edited expression after a pause', async () => {
    const { user, expressionChange } = await setup();
    await user.type(screen.getByRole('textbox', { name: 'jmes' }), 'a.b');
    await waitFor(() => expect(expressionChange).toHaveBeenCalledWith('a.b'));
    // debounced: intermediate values are not emitted
    expect(expressionChange).not.toHaveBeenCalledWith('a');
  });

  it('should disable run until both expression and input are set', async () => {
    const { user, inputEditor } = await setup();
    const run = screen.getByRole('button', { name: /run/ });
    expect(run).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'jmes' }), 'a');
    expect(run).toBeDisabled();

    await inputEditor.setValue('{"a":1}');
    await waitFor(() => expect(run).toBeEnabled());
  });

  it('should require the expression', async () => {
    const { user } = await setup();
    const jmes = screen.getByRole('textbox', { name: 'jmes' });
    await user.type(jmes, 'a');
    await user.clear(jmes);
    await user.tab();
    expect(await screen.findByText('JMES required')).toBeInTheDocument();
  });

  it('should reject a too long expression', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('textbox', { name: 'jmes' }));
    await user.paste('a'.repeat(501));
    await user.tab();
    expect(await screen.findByText('JMES too long')).toBeInTheDocument();
  });

  it('should run the transform and show its output', async () => {
    api.jmesTransform.mockReturnValue(of({ value: '1' }));
    const { user, inputEditor, outputEditor } = await setup('a');

    await inputEditor.setValue('{"a":1}');
    await user.click(screen.getByRole('button', { name: /run/ }));

    expect(api.jmesTransform).toHaveBeenCalledExactlyOnceWith('{"a":1}', 'a');
    // harness reads wait for the fixture to be stable
    expect(await outputEditor.getText()).toBe('1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should show the progress bar while running', async () => {
    const response = new Subject<{ value?: string }>();
    api.jmesTransform.mockReturnValue(response);
    const { user, inputEditor } = await setup('a');

    await inputEditor.setValue('{"a":1}');
    await user.click(screen.getByRole('button', { name: /run/ }));

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run/ })).toBeDisabled();

    response.next({ value: '1' });
    await waitFor(() =>
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    );
  });

  it('should show the error returned by the transform', async () => {
    api.jmesTransform.mockReturnValue(of({ error: 'syntax error' }));
    const { user, inputEditor, outputEditor } = await setup('a[');

    await inputEditor.setValue('{"a":1}');
    await user.click(screen.getByRole('button', { name: /run/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('syntax error');
    expect(await outputEditor.getText()).toBe('');
  });

  it('should show the HTTP error', async () => {
    api.jmesTransform.mockReturnValue(throwError(() => 'Server error: x'));
    const { user, inputEditor } = await setup('a');

    await inputEditor.setValue('{"a":1}');
    await user.click(screen.getByRole('button', { name: /run/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Server error: x'
    );
    expect(screen.getByRole('button', { name: /run/ })).toBeEnabled();
  });

  it('should clear a previous error when running again', async () => {
    api.jmesTransform
      .mockReturnValueOnce(of({ error: 'bad' }))
      .mockReturnValueOnce(of({ value: '1' }));
    const { user, inputEditor } = await setup('a');

    await inputEditor.setValue('{"a":1}');
    await user.click(screen.getByRole('button', { name: /run/ }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run/ }));
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    );
  });

  it('should set the input from a picked preset', async () => {
    cache.add('jms_sample', '{"b":2}');
    const { user, inputEditor } = await setup();

    await user.click(screen.getByRole('combobox', { name: 'preset' }));
    await user.click(await screen.findByRole('option', { name: 'jms_sample' }));
    await user.click(screen.getByRole('button', { name: 'pick preset' }));

    expect(await inputEditor.getText()).toBe('{"b":2}');
  });

  it('should save the input as a preset', async () => {
    const { user, inputEditor, fixture } = await setup();

    await inputEditor.setValue('{"c":3}');
    await user.type(screen.getByRole('textbox', { name: 'key' }), 'mine');
    await user.click(screen.getByRole('button', { name: 'add preset' }));
    await fixture.whenStable();

    expect(cache.get('jms_mine')).toBe('{"c":3}');
  });
});
