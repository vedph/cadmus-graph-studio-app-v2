import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';

import { MappingTreeEditorComponent } from './mapping-tree-editor.component';
import { JmesComponent } from '../jmes/jmes.component';
import { MappingRunnerComponent } from '../mapping-runner/mapping-runner.component';
import { GraphStudioApiService } from '../../services/graph-studio-api.service';
import { MappingJsonService } from '../../services/mapping-json.service';
import { NodeMapping } from '../../models';
import {
  provideFakeMonacoEditor,
  useFakeMonacoEditor,
} from '../../../testing/monaco-testing';

/** Build a hydrated tree: root (1) > alpha (2) > alpha_one (4); beta (3). */
function buildTree(): NodeMapping {
  const root: NodeMapping = {
    id: 1,
    name: 'root',
    sourceType: 2,
    source: 'r',
    sid: 's',
    children: [
      {
        id: 2,
        name: 'alpha',
        sourceType: 0,
        source: 'a',
        sid: '',
        children: [
          { id: 4, name: 'alpha_one', sourceType: 0, source: 'a1', sid: '' },
        ],
      },
      { id: 3, name: 'beta', sourceType: 0, source: 'b', sid: '' },
    ],
  };
  new MappingJsonService().visitMappings(root, true);
  return root;
}

function collectNames(mapping: NodeMapping): string[] {
  return [mapping.name, ...(mapping.children || []).flatMap(collectNames)];
}

function collectIds(mapping: NodeMapping): number[] {
  return [mapping.id, ...(mapping.children || []).flatMap(collectIds)];
}

describe('MappingTreeEditorComponent', () => {
  const setup = async (mapping?: NodeMapping) => {
    useFakeMonacoEditor(JmesComponent, MappingRunnerComponent);
    const mappingChange = vi.fn();
    const editorClose = vi.fn();
    const result = await render(MappingTreeEditorComponent, {
      inputs: { mapping },
      on: { mapping: mappingChange, editorClose },
      providers: [
        provideFakeMonacoEditor(),
        {
          provide: GraphStudioApiService,
          useValue: {
            jmesTransform: vi.fn().mockReturnValue(of({ value: '' })),
            runMappings: vi.fn(),
          },
        },
      ],
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    if (mapping) {
      await screen.findByRole('button', { name: `actions for ${mapping.name}` });
    }
    return { ...result, mappingChange, editorClose, user: userEvent.setup() };
  };

  const editor = () => screen.getByRole('form', { name: 'mapping' });
  const nameField = () =>
    within(editor()).getByRole('textbox', { name: 'name' });
  const save = () => within(editor()).getByRole('button', { name: /^save$/ });
  const lastSaved = (spy: ReturnType<typeof vi.fn>): NodeMapping =>
    spy.mock.calls[spy.mock.calls.length - 1][0];

  const expandAll = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'expand all' }));
  };

  const nodeAction = async (
    user: ReturnType<typeof userEvent.setup>,
    label: string,
    action: RegExp
  ) => {
    await user.click(
      await screen.findByRole('button', { name: `actions for ${label}` })
    );
    await user.click(await screen.findByRole('menuitem', { name: action }));
  };

  const confirm = async (user: ReturnType<typeof userEvent.setup>) => {
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'yes' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  };

  afterEach(() => vi.restoreAllMocks());

  it('should show the root mapping in tree and editor', async () => {
    await setup(buildTree());
    expect(screen.getByText('root', { selector: '#header' })).toBeInTheDocument();
    expect(nameField()).toHaveValue('root');
  });

  it('should be empty without a mapping', async () => {
    await setup();
    expect(nameField()).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: /^actions for / })
    ).not.toBeInTheDocument();
  });

  it('should save the edited root preserving its children', async () => {
    const { user, mappingChange } = await setup(buildTree());

    await user.clear(nameField());
    await user.type(nameField(), 'new root');
    await user.click(save());

    const saved = lastSaved(mappingChange);
    expect(saved.name).toBe('new root');
    expect(collectNames(saved)).toEqual([
      'new root',
      'alpha',
      'alpha_one',
      'beta',
    ]);
    expect(saved.children![0].parent).toBe(saved);
  });

  it('should keep editing the root after saving it', async () => {
    const { user, mappingChange } = await setup(buildTree());

    await user.clear(nameField());
    await user.type(nameField(), 'first');
    await user.click(save());
    await user.clear(nameField());
    await user.type(nameField(), 'second');
    await user.click(save());

    const saved = lastSaved(mappingChange);
    expect(saved.name).toBe('second');
    expect(saved.children!.length).toBe(2);
  });

  it('should edit and save a child', async () => {
    const { user, mappingChange } = await setup(buildTree());
    await expandAll(user);

    await nodeAction(user, 'alpha_one', /edit/);
    await confirm(user);
    await waitFor(() => expect(nameField()).toHaveValue('alpha_one'));

    await user.clear(nameField());
    await user.type(nameField(), 'renamed');
    await user.click(save());

    const saved = lastSaved(mappingChange);
    expect(collectNames(saved)).toEqual(['root', 'alpha', 'renamed', 'beta']);
    const child = saved.children![0].children![0];
    expect(child.id).toBe(4);
    expect(child.parent).toBe(saved.children![0]);
    // the editor keeps editing the saved child
    expect(nameField()).toHaveValue('renamed');
  });

  it('should not modify the original mapping', async () => {
    const original = buildTree();
    const { user } = await setup(original);
    await user.clear(nameField());
    await user.type(nameField(), 'changed');
    await user.click(save());
    expect(original.name).toBe('root');
  });

  it('should add a child with a unique ID and edit it', async () => {
    const { user, mappingChange } = await setup(buildTree());
    await expandAll(user);

    await nodeAction(user, 'beta', /add/);

    const saved = lastSaved(mappingChange);
    const added = saved.children![1].children![0];
    expect(added.name).toBe('New mapping');
    expect(added.parentId).toBe(3);
    expect(added.parent).toBe(saved.children![1]);
    const ids = collectIds(saved);
    expect(new Set(ids).size).toBe(ids.length);
    await waitFor(() => expect(nameField()).toHaveValue('New mapping'));
  });

  it('should not reuse IDs of a tree not numbered by the JSON service', async () => {
    const { user, mappingChange } = await setup(buildTree());
    // the JSON service counter restarts from 1, while the tree has IDs 1-4
    TestBed.inject(MappingJsonService).readMappingsDocument(
      '{"documentMappings":[{"name":"x"}]}'
    );

    await nodeAction(user, 'root', /add/);
    await nodeAction(user, 'root', /add/);

    const ids = collectIds(lastSaved(mappingChange));
    expect(ids.length).toBe(6);
    expect(new Set(ids).size).toBe(6);
  });

  it('should delete a child and its descendants', async () => {
    const { user, mappingChange } = await setup(buildTree());
    await expandAll(user);

    await nodeAction(user, 'alpha', /delete/);
    await confirm(user);

    await waitFor(() => expect(mappingChange).toHaveBeenCalled());
    expect(collectNames(lastSaved(mappingChange))).toEqual(['root', 'beta']);
    // the root is still being edited
    expect(nameField()).toHaveValue('root');
  });

  it('should close the editor when deleting the edited mapping', async () => {
    const { user, mappingChange } = await setup(buildTree());
    await expandAll(user);
    await nodeAction(user, 'beta', /edit/);
    await confirm(user);
    await waitFor(() => expect(nameField()).toHaveValue('beta'));

    await nodeAction(user, 'beta', /delete/);
    await confirm(user);

    await waitFor(() => expect(nameField()).toHaveValue(''));
    expect(collectNames(lastSaved(mappingChange))).toEqual([
      'root',
      'alpha',
      'alpha_one',
    ]);
  });

  it('should keep editing a child when deleting another node', async () => {
    const { user } = await setup(buildTree());
    await expandAll(user);
    await nodeAction(user, 'beta', /edit/);
    await confirm(user);
    await waitFor(() => expect(nameField()).toHaveValue('beta'));

    await nodeAction(user, 'alpha', /delete/);
    await confirm(user);

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'actions for alpha' })
      ).not.toBeInTheDocument()
    );
    expect(nameField()).toHaveValue('beta');
  });

  it('should edit the root of a mapping set by the consumer', async () => {
    const { user, rerender } = await setup(buildTree());
    await expandAll(user);
    await nodeAction(user, 'beta', /edit/);
    await confirm(user);
    await waitFor(() => expect(nameField()).toHaveValue('beta'));

    const other = buildTree();
    other.name = 'other';
    await rerender({ inputs: { mapping: other }, partialUpdate: true });

    await waitFor(() => expect(nameField()).toHaveValue('other'));
  });

  it('should close the editor and notify', async () => {
    const { user, editorClose } = await setup(buildTree());
    await user.click(within(editor()).getByRole('button', { name: /close/ }));
    expect(editorClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(nameField()).toHaveValue(''));
  });
});
