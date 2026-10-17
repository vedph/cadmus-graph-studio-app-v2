import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { MappingOutputEditorComponent } from './mapping-output-editor.component';
import { NodeMappingOutput } from '../../models';

describe('MappingOutputEditorComponent', () => {
  const setup = async (mappingOutput?: NodeMappingOutput) => {
    const outputChange = vi.fn();
    const editorClose = vi.fn();
    const result = await render(MappingOutputEditorComponent, {
      inputs: { mappingOutput },
      on: { mappingOutput: outputChange, editorClose },
    });
    return { ...result, outputChange, editorClose, user: userEvent.setup() };
  };

  const field = (name: string) => screen.getByRole('textbox', { name });

  /** Replace the content of a textarea (newlines included). */
  const fill = async (
    user: ReturnType<typeof userEvent.setup>,
    name: string,
    text: string
  ) => {
    await user.clear(field(name));
    await user.click(field(name));
    await user.paste(text);
    await user.tab();
  };

  it('should be empty without an output', async () => {
    await setup();
    expect(field('metadata')).toHaveValue('');
    expect(field('nodes')).toHaveValue('');
    expect(field('triples')).toHaveValue('');
  });

  it('should show the output as text lines', async () => {
    await setup({
      nodes: {
        plain: { uid: 'x:plain', label: '' },
        work: { uid: 'x:works/{@id}', label: 'Work' },
        tagged: { uid: 'x:t', label: 'T', tag: 'tag' },
        tagOnly: { uid: 'x:u', label: '', tag: 'tag' },
      },
      triples: [
        { s: '{?work}', p: 'a', o: 'crm:E89_Propositional_Object' },
        { s: '{?work}', p: 'crm:P3_has_note', ol: '"quoted"@en' },
        { s: '{?work}', p: 'crm:P3_has_note', ol: 'unquoted' },
      ],
      metadata: { sid: '{$item-id}', b: 'x=y' },
    });

    expect(field('nodes')).toHaveValue(
      [
        'plain x:plain',
        'work x:works/{@id} [Work]',
        'tagged x:t [T|tag]',
        'tagOnly x:u [|tag]',
      ].join('\n')
    );
    expect(field('triples')).toHaveValue(
      [
        '{?work} a crm:E89_Propositional_Object',
        '{?work} crm:P3_has_note "quoted"@en',
        '{?work} crm:P3_has_note "unquoted"',
      ].join('\n')
    );
    expect(field('metadata')).toHaveValue('sid={$item-id}\nb=x=y');
  });

  it('should save the parsed output', async () => {
    const { user, outputChange } = await setup();

    await fill(user, 'metadata', 'a = 1\nb=x=y');
    await fill(
      user,
      'nodes',
      'x x:plain\nwork x:works/{@id} [Work|tag]\n\ntagOnly x:u [|t]'
    );
    await fill(user, 'triples', '{?work} a crm:E21\n{?work} crm:P3 "a note"@en');
    await user.click(screen.getByRole('button', { name: 'save output' }));

    expect(outputChange).toHaveBeenCalledExactlyOnceWith({
      metadata: { a: '1', b: 'x=y' },
      nodes: {
        x: { uid: 'x:plain', label: undefined, tag: undefined },
        work: { uid: 'x:works/{@id}', label: 'Work', tag: 'tag' },
        tagOnly: { uid: 'x:u', label: undefined, tag: 't' },
      },
      triples: [
        { s: '{?work}', p: 'a', o: 'crm:E21' },
        { s: '{?work}', p: 'crm:P3', ol: '"a note"@en' },
      ],
    });
  });

  it('should save an empty output', async () => {
    const { user, outputChange } = await setup();
    await user.click(screen.getByRole('button', { name: 'save output' }));
    expect(outputChange).toHaveBeenCalledWith({
      nodes: undefined,
      triples: undefined,
      metadata: undefined,
    });
  });

  it('should round-trip an output', async () => {
    const output: NodeMappingOutput = {
      nodes: { n: { uid: 'x:n', label: 'N', tag: 't' } },
      triples: [{ s: '{?n}', p: 'a', o: 'crm:E21' }],
      metadata: { k: 'v' },
    };
    const { user, outputChange } = await setup(output);
    await user.click(screen.getByRole('button', { name: 'save output' }));
    expect(outputChange).toHaveBeenCalledWith(output);
  });

  it('should reject invalid nodes', async () => {
    const { user } = await setup();
    await fill(user, 'nodes', 'onlykey');
    expect(await screen.findByText('invalid nodes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'save output' })).toBeDisabled();
  });

  it('should reject invalid triples', async () => {
    const { user } = await setup();
    await fill(user, 'triples', 's p');
    expect(await screen.findByText('invalid triples')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'save output' })).toBeDisabled();
  });

  it('should reject invalid metadata', async () => {
    const { user } = await setup();
    await fill(user, 'metadata', 'novalue');
    expect(await screen.findByText('invalid metadata')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'save output' })).toBeDisabled();
  });

  it('should cap the typed text length', async () => {
    await setup();
    for (const name of ['metadata', 'nodes', 'triples']) {
      expect(field(name)).toHaveAttribute('maxlength', '5000');
    }
  });

  it('should reject too long bound text', async () => {
    const { user } = await setup({ metadata: { k: 'v'.repeat(5000) } });
    await user.click(field('metadata'));
    await user.tab();
    expect(await screen.findByText('metadata too long')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'save output' })).toBeDisabled();
  });

  it('should keep the typed text when its own save echoes back normalized', async () => {
    const { user, outputChange } = await setup();

    await fill(user, 'metadata', 'a = 1');
    await user.click(screen.getByRole('button', { name: 'save output' }));
    // the model got the normalized value...
    expect(outputChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ metadata: { a: '1' } })
    );
    // ...but the text still reads as typed
    expect(field('metadata')).toHaveValue('a = 1');

    await user.click(field('metadata'));
    await user.keyboard('{End}{Enter}b=2');
    await user.click(screen.getByRole('button', { name: 'save output' }));
    expect(field('metadata')).toHaveValue('a = 1\nb=2');
    expect(outputChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ metadata: { a: '1', b: '2' } })
    );
  });

  it('should rebuild the text for a different bound output', async () => {
    const { user, rerender } = await setup();
    await fill(user, 'metadata', 'a = 1');
    await user.click(screen.getByRole('button', { name: 'save output' }));
    await rerender({
      inputs: { mappingOutput: { metadata: { c: '3' } } },
      partialUpdate: true,
    });
    await waitFor(() => expect(field('metadata')).toHaveValue('c=3'));
  });

  it('should render no <form>, as it is embedded in the mapping editor', async () => {
    const { container } = await setup();
    expect(container.querySelector('form')).toBeNull();
  });

  it('should update when the bound output changes', async () => {
    const { rerender } = await setup({ metadata: { a: '1' } });
    await rerender({ inputs: { mappingOutput: undefined }, partialUpdate: true });
    await waitFor(() => expect(field('metadata')).toHaveValue(''));
    await rerender({
      inputs: { mappingOutput: { metadata: { b: '2' } } },
      partialUpdate: true,
    });
    await waitFor(() => expect(field('metadata')).toHaveValue('b=2'));
  });

  it('should emit close', async () => {
    const { user, editorClose, outputChange } = await setup();
    await user.click(screen.getByRole('button', { name: 'close output' }));
    expect(editorClose).toHaveBeenCalledTimes(1);
    expect(outputChange).not.toHaveBeenCalled();
  });
});
