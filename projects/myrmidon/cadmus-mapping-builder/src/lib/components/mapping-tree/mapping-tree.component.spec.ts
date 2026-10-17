import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { MappingTreeComponent } from './mapping-tree.component';
import { NodeMapping } from '../../models';

function buildTree(): NodeMapping {
  const root: NodeMapping = {
    id: 1,
    name: 'root',
    sourceType: 1,
    source: 'r',
    sid: 's',
    children: [
      {
        id: 2,
        parentId: 1,
        name: 'alpha',
        sourceType: 1,
        source: 'a',
        sid: '',
        children: [
          {
            id: 4,
            parentId: 2,
            name: 'alpha_one',
            sourceType: 1,
            source: 'a1',
            sid: '',
          },
        ],
      },
      { id: 3, parentId: 1, name: 'beta', sourceType: 1, source: 'b', sid: '' },
    ],
  };
  return root;
}

describe('MappingTreeComponent', () => {
  const setup = async (mapping: NodeMapping | undefined, editedId?: number) => {
    const editedIdChange = vi.fn();
    const addRequest = vi.fn();
    const deleteRequest = vi.fn();
    const result = await render(MappingTreeComponent, {
      inputs: { mapping, editedId },
      on: { editedId: editedIdChange, addRequest, deleteRequest },
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = userEvent.setup();
    if (mapping) {
      await screen.findByText(/root/);
    }
    return { ...result, editedIdChange, addRequest, deleteRequest, user };
  };

  /** Node labels in display order. */
  const labels = () =>
    screen
      .queryAllByRole('button', { name: /^actions for / })
      .map((b) => b.getAttribute('aria-label')!.replace('actions for ', ''));

  const expandButtons = () =>
    screen.getAllByRole('button', { description: /Expand|Collapse/ });

  const nodeAction = async (
    user: ReturnType<typeof userEvent.setup>,
    label: string,
    action: RegExp
  ) => {
    await user.click(
      screen.getByRole('button', { name: `actions for ${label}` })
    );
    await user.click(await screen.findByRole('menuitem', { name: action }));
  };

  afterEach(() => vi.restoreAllMocks());

  it('should show nothing without a mapping', async () => {
    await setup(undefined);
    expect(labels()).toEqual([]);
  });

  it('should show the root mapping with its location', async () => {
    await setup(buildTree());
    expect(labels()).toEqual(['root']);
    expect(screen.getByText('1.1')).toBeInTheDocument();
  });

  it('should expand and collapse a node', async () => {
    const { user } = await setup(buildTree());

    await user.click(expandButtons()[0]);
    await waitFor(() => expect(labels()).toEqual(['root', 'alpha', 'beta']));

    await user.click(expandButtons()[0]);
    await waitFor(() => expect(labels()).toEqual(['root']));
  });

  it('should expand and collapse all the nodes', async () => {
    const { user } = await setup(buildTree());

    await user.click(screen.getByRole('button', { name: 'expand all' }));
    await waitFor(() =>
      expect(labels()).toEqual(['root', 'alpha', 'alpha_one', 'beta'])
    );

    await user.click(screen.getByRole('button', { name: 'collapse all' }));
    await waitFor(() => expect(labels()).toEqual(['root']));
  });

  it('should page the children of a node', async () => {
    const root = buildTree();
    root.children = Array.from({ length: 25 }, (_, i) => ({
      id: 10 + i,
      parentId: 1,
      name: `child${String(i + 1).padStart(2, '0')}`,
      sourceType: 1,
      source: 'c',
      sid: '',
    }));
    const { user } = await setup(root);
    await user.click(expandButtons()[0]);
    await waitFor(() => expect(labels()).toHaveLength(21));

    // the pager buttons (from paged-data-browsers) have no accessible name,
    // so they are located from the page indicator: first, prev, next, last
    const pager = screen.getByText('1/2').parentElement!;
    await user.click(within(pager).getAllByRole('button')[2]);

    await waitFor(() =>
      expect(labels()).toEqual(['root', 'child21', 'child22', 'child23', 'child24', 'child25'])
    );
  });

  it('should rebuild the tree when the mapping changes', async () => {
    const { rerender } = await setup(buildTree());
    const other = buildTree();
    other.name = 'other root';
    await rerender({ inputs: { mapping: other }, partialUpdate: true });
    await waitFor(() => expect(labels()).toEqual(['other root']));
  });

  it('should clear the tree when the mapping is removed', async () => {
    const { rerender } = await setup(buildTree());
    await rerender({ inputs: { mapping: undefined }, partialUpdate: true });
    await waitFor(() => expect(labels()).toEqual([]));
  });

  it('should filter the child nodes by name', async () => {
    const { user } = await setup(buildTree());
    await user.type(screen.getByRole('textbox', { name: 'name' }), 'bet');
    await user.click(screen.getByRole('button', { name: 'apply filter' }));
    await user.click(screen.getByRole('button', { name: 'expand all' }));
    await waitFor(() => expect(labels()).toEqual(['root', 'beta']));

    await user.click(screen.getByRole('button', { name: 'reset filter' }));
    await user.click(screen.getByRole('button', { name: 'expand all' }));
    await waitFor(() =>
      expect(labels()).toEqual(['root', 'alpha', 'alpha_one', 'beta'])
    );
  });

  it('should toggle debug info and location', async () => {
    const { user } = await setup(buildTree());
    expect(screen.queryByText(/#1/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'more' }));
    expect(await screen.findByText(/#1/)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'no loc.' }));
    await waitFor(() => expect(screen.queryByText('1.1')).not.toBeInTheDocument());
  });

  it('should request to edit a node when none is edited', async () => {
    const { user, editedIdChange } = await setup(buildTree());
    await user.click(expandButtons()[0]);
    await nodeAction(user, 'beta', /edit/);
    expect(editedIdChange).toHaveBeenCalledExactlyOnceWith(3);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should ignore editing the node being edited', async () => {
    const { user, editedIdChange } = await setup(buildTree(), 1);
    await nodeAction(user, 'root', /edit/);
    expect(editedIdChange).not.toHaveBeenCalled();
  });

  it('should confirm before switching the edited node', async () => {
    const { user, editedIdChange } = await setup(buildTree(), 1);
    await user.click(expandButtons()[0]);
    await nodeAction(user, 'beta', /edit/);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Edit mapping beta?');
    await user.click(within(dialog).getByRole('button', { name: 'yes' }));
    await waitFor(() => expect(editedIdChange).toHaveBeenCalledWith(3));
  });

  it('should not switch the edited node when not confirmed', async () => {
    const { user, editedIdChange } = await setup(buildTree(), 1);
    await user.click(expandButtons()[0]);
    await nodeAction(user, 'beta', /edit/);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'no' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(editedIdChange).not.toHaveBeenCalled();
  });

  it('should request to add a child', async () => {
    const { user, addRequest } = await setup(buildTree());
    await nodeAction(user, 'root', /add/);
    expect(addRequest).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('should not offer to delete the root', async () => {
    const { user } = await setup(buildTree());
    await user.click(screen.getByRole('button', { name: 'actions for root' }));
    await screen.findByRole('menuitem', { name: /edit/ });
    expect(
      screen.queryByRole('menuitem', { name: /delete/ })
    ).not.toBeInTheDocument();
  });

  it('should request to delete a node after confirmation', async () => {
    const { user, deleteRequest } = await setup(buildTree());
    await user.click(expandButtons()[0]);
    await nodeAction(user, 'alpha', /delete/);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete mapping alpha?');
    await user.click(within(dialog).getByRole('button', { name: 'yes' }));
    await waitFor(() => expect(deleteRequest).toHaveBeenCalledWith(2));
  });

  it('should not delete a node when not confirmed', async () => {
    const { user, deleteRequest } = await setup(buildTree());
    await user.click(expandButtons()[0]);
    await nodeAction(user, 'alpha', /delete/);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'no' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(deleteRequest).not.toHaveBeenCalled();
  });
});
