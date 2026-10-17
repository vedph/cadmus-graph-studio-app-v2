import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';

import { MappingEditorComponent } from './mapping-editor.component';
import { JmesComponent } from '../jmes/jmes.component';
import { MappingRunnerComponent } from '../mapping-runner/mapping-runner.component';
import { GraphStudioApiService } from '../../services/graph-studio-api.service';
import { NodeMapping } from '../../models';
import {
  provideFakeMonacoEditor,
  useFakeMonacoEditor,
} from '../../../testing/monaco-testing';

const ROOT: NodeMapping = {
  id: 1,
  ordinal: 3,
  name: 'person',
  sourceType: 2,
  facetFilter: 'person',
  groupFilter: 'g',
  flagsFilter: 4,
  titleFilter: 't',
  partTypeFilter: 'it.vedph.events',
  partRoleFilter: 'r',
  description: 'Map a person.',
  source: 'events',
  sid: '{$part-id}',
  scalarPattern: '^x',
  output: { metadata: { k: 'v' } },
};

describe('MappingEditorComponent', () => {
  let api: {
    jmesTransform: ReturnType<typeof vi.fn>;
    runMappings: ReturnType<typeof vi.fn>;
  };

  const setup = async (mapping?: NodeMapping) => {
    useFakeMonacoEditor(JmesComponent, MappingRunnerComponent);
    const mappingChange = vi.fn();
    const editorClose = vi.fn();
    const result = await render(MappingEditorComponent, {
      inputs: { mapping },
      on: { mapping: mappingChange, editorClose },
      providers: [
        provideFakeMonacoEditor(),
        { provide: GraphStudioApiService, useValue: api },
      ],
    });
    return { ...result, mappingChange, editorClose, user: userEvent.setup() };
  };

  const field = (name: string) => screen.getByRole('textbox', { name });
  const save = () => screen.getByRole('button', { name: /^save$/ });

  beforeEach(() => {
    api = {
      jmesTransform: vi.fn().mockReturnValue(of({ value: '' })),
      runMappings: vi.fn().mockReturnValue(of({ value: { nodes: [], triples: [] } })),
    };
  });

  it('should show the mapping metadata', async () => {
    await setup(ROOT);
    expect(field('name')).toHaveValue('person');
    expect(field('scalar pattern')).toHaveValue('^x');
    expect(field('SID')).toHaveValue('{$part-id}');
    expect(field('facet filter')).toHaveValue('person');
    expect(field('group filter')).toHaveValue('g');
    expect(screen.getByRole('spinbutton', { name: 'flags filter' })).toHaveValue(4);
    expect(field('part type filter')).toHaveValue('it.vedph.events');
    expect(field('part role filter')).toHaveValue('r');
    expect(field('description')).toHaveValue('Map a person.');
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'source type' })
      ).toHaveTextContent('part')
    );
  });

  it('should save the unchanged mapping', async () => {
    const { user, mappingChange } = await setup(ROOT);
    await user.click(save());
    expect(mappingChange).toHaveBeenCalledExactlyOnceWith(ROOT);
  });

  it('should save the edited mapping', async () => {
    const { user, mappingChange } = await setup(ROOT);

    await user.clear(field('name'));
    await user.type(field('name'), 'renamed');
    await user.click(screen.getByRole('combobox', { name: 'source type' }));
    await user.click(await screen.findByRole('option', { name: 'item' }));
    await user.clear(field('facet filter'));
    await user.clear(field('description'));
    const flags = screen.getByRole('spinbutton', { name: 'flags filter' });
    await user.clear(flags);
    await user.type(flags, '9');
    await user.click(save());

    expect(mappingChange).toHaveBeenCalledExactlyOnceWith({
      ...ROOT,
      name: 'renamed',
      sourceType: 1,
      facetFilter: undefined,
      description: undefined,
      flagsFilter: 9,
    });
  });

  it('should save a source type of n/a as 0', async () => {
    const { user, mappingChange } = await setup(ROOT);
    await user.click(screen.getByRole('combobox', { name: 'source type' }));
    await user.click(await screen.findByRole('option', { name: 'n/a' }));
    await user.click(save());
    expect(mappingChange.mock.calls[0][0].sourceType).toBe(0);
  });

  it('should require the name', async () => {
    const { user } = await setup(ROOT);
    await user.clear(field('name'));
    await user.tab();
    expect(await screen.findByText('name required')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('should limit the name length', async () => {
    const { user } = await setup(ROOT);
    await user.clear(field('name'));
    await user.click(field('name'));
    await user.paste('n'.repeat(101));
    await user.tab();
    expect(await screen.findByText('name too long')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('should require the SID for a root mapping', async () => {
    const { user } = await setup(ROOT);
    await user.clear(field('SID'));
    await user.tab();
    expect(await screen.findByText('SID required')).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('should not require the SID nor show the source type for a child', async () => {
    const child: NodeMapping = {
      id: 2,
      parentId: 1,
      name: 'child',
      sourceType: 0,
      source: 'x',
      sid: '',
    };
    const { user, mappingChange } = await setup(child);
    expect(
      screen.queryByRole('combobox', { name: 'source type' })
    ).not.toBeInTheDocument();
    expect(save()).toBeEnabled();

    await user.click(save());
    expect(mappingChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, parentId: 1, sid: '' })
    );
  });

  it('should treat a child of a new root (parent ID 0) as a child', async () => {
    const { user, mappingChange } = await setup({
      id: 5,
      parentId: 0,
      name: 'child',
      sourceType: 0,
      source: 'x',
      sid: '',
    });
    expect(save()).toBeEnabled();
    await user.click(save());
    expect(mappingChange.mock.calls[0][0].parentId).toBe(0);
  });

  it('should be empty and unsavable without a mapping', async () => {
    await setup();
    expect(field('name')).toHaveValue('');
    expect(save()).toBeDisabled();
  });

  it('should update when the bound mapping changes', async () => {
    const { rerender } = await setup(ROOT);
    await rerender({
      inputs: { mapping: { ...ROOT, name: 'other' } },
      partialUpdate: true,
    });
    await waitFor(() => expect(field('name')).toHaveValue('other'));
    await rerender({ inputs: { mapping: undefined }, partialUpdate: true });
    await waitFor(() => expect(field('name')).toHaveValue(''));
  });

  it('should emit close', async () => {
    const { user, editorClose, mappingChange } = await setup(ROOT);
    await user.click(screen.getByRole('button', { name: /close/ }));
    expect(editorClose).toHaveBeenCalledTimes(1);
    expect(mappingChange).not.toHaveBeenCalled();
  });

  it('should edit the source in the input tab', async () => {
    const { user, mappingChange } = await setup(ROOT);
    await user.click(screen.getByRole('tab', { name: /input/ }));

    const jmes = await screen.findByRole('textbox', { name: 'jmes' });
    expect(jmes).toHaveValue('events');
    await user.clear(jmes);
    // "[[" escapes "[" in user-event
    await user.type(jmes, 'events[[0]');
    // the expression is propagated after a 300ms debounce
    await new Promise((resolve) => setTimeout(resolve, 400));
    await user.click(save());
    expect(mappingChange.mock.calls[0][0].source).toBe('events[0]');
  });

  it('should edit the output in the output tab', async () => {
    const { user, mappingChange } = await setup(ROOT);
    await user.click(screen.getByRole('tab', { name: /output/ }));

    const metadata = await screen.findByRole('textbox', { name: 'metadata' });
    expect(metadata).toHaveValue('k=v');
    await user.clear(metadata);
    await user.type(metadata, 'a=1');
    await user.click(screen.getByRole('button', { name: 'save output' }));
    await user.click(save());

    expect(mappingChange.mock.calls[0][0].output).toEqual({
      nodes: undefined,
      triples: undefined,
      metadata: { a: '1' },
    });
  });

  it('should run the mapping in the test tab', async () => {
    const { user } = await setup(ROOT);
    await user.click(screen.getByRole('tab', { name: /test/ }));
    expect(
      await screen.findByRole('button', { name: 'prettify input' })
    ).toBeInTheDocument();
  });

  it('should show help', async () => {
    const { user } = await setup(ROOT);
    await user.click(screen.getByRole('tab', { name: /help/ }));
    expect(
      await screen.findByRole('heading', { name: 'Quick Help' })
    ).toBeInTheDocument();
  });
});
