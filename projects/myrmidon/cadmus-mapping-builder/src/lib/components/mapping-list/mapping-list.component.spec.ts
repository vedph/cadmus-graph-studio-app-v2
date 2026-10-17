import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Subject } from 'rxjs';

import { DataPage } from '@myrmidon/ngx-tools';

import { MappingListComponent } from './mapping-list.component';
import { NODE_MAPPING_SERVICE, NodeMapping } from '../../models';
import { RamNodeMappingService } from '../../services/ram-node-mapping.service';
import { NodeMappingListService } from '../../state/node-mapping-list.service';

function mapping(id: number, extra?: Partial<NodeMapping>): NodeMapping {
  return {
    id,
    name: `m${String(id).padStart(2, '0')}`,
    sourceType: 1,
    source: `src${id}`,
    sid: `sid${id}`,
    ...extra,
  };
}

describe('MappingListComponent', () => {
  const setup = async (mappings: NodeMapping[]) => {
    const mappingEdit = vi.fn();
    const result = await render(MappingListComponent, {
      on: { mappingEdit },
      providers: [
        { provide: NODE_MAPPING_SERVICE, useExisting: RamNodeMappingService },
      ],
      // seed the RAM store (synchronous) before the component is created
      configureTestBed: (testBed) => {
        const ram = testBed.inject(RamNodeMappingService);
        mappings.forEach((m) => ram.addMapping(m).subscribe());
      },
    });
    const list = TestBed.inject(NodeMappingListService);
    await list.reset();
    await result.fixture.whenStable();
    return { ...result, list, mappingEdit, user: userEvent.setup() };
  };

  const dataRows = () => screen.getAllByRole('row').slice(1);

  it('should list the mappings with their properties', async () => {
    await setup([
      mapping(1, {
        name: 'events',
        sourceType: 2,
        facetFilter: 'person',
        partTypeFilter: 'it.vedph.events',
        partRoleFilter: 'r',
      }),
      mapping(2, { name: 'work', sourceType: 0 }),
    ]);

    const rows = dataRows();
    expect(rows).toHaveLength(2);
    const cells = within(rows[0])
      .getAllByRole('cell')
      .map((c) => c.textContent?.trim());
    expect(cells.slice(1)).toEqual([
      '1',
      'events',
      'part',
      'person',
      'it.vedph.events',
      'r',
      'src1',
      'sid1',
    ]);
    expect(within(rows[1]).getByRole('cell', { name: 'any' })).toBeInTheDocument();
  });

  it('should list nothing when there are no mappings', async () => {
    await setup([]);
    expect(dataRows()).toHaveLength(0);
  });

  it('should emit the mapping to edit', async () => {
    const { user, mappingEdit } = await setup([mapping(1), mapping(2)]);
    await user.click(screen.getByRole('button', { name: 'edit m02' }));
    expect(mappingEdit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: 2, name: 'm02' })
    );
  });

  it('should delete a mapping after confirmation', async () => {
    const { user } = await setup([mapping(1), mapping(2)]);

    await user.click(screen.getByRole('button', { name: 'delete m01' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete mapping m01?');
    await user.click(within(dialog).getByRole('button', { name: 'yes' }));

    await waitFor(() => expect(dataRows()).toHaveLength(1));
    expect(screen.queryByText('m01')).not.toBeInTheDocument();
  });

  it('should not delete a mapping when not confirmed', async () => {
    const { user } = await setup([mapping(1), mapping(2)]);

    await user.click(screen.getByRole('button', { name: 'delete m01' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'no' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(dataRows()).toHaveLength(2);
  });

  it('should page the mappings', async () => {
    const mappings = Array.from({ length: 25 }, (_, i) => mapping(i + 1));
    const { user } = await setup(mappings);
    expect(dataRows()).toHaveLength(20);

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(dataRows()).toHaveLength(5));
    expect(screen.getByText('m21')).toBeInTheDocument();
  });

  it('should change the page size', async () => {
    const mappings = Array.from({ length: 25 }, (_, i) => mapping(i + 1));
    const { user } = await setup(mappings);

    await user.click(screen.getByRole('combobox', { name: /items per page/i }));
    await user.click(await screen.findByRole('option', { name: '5' }));

    await waitFor(() => expect(dataRows()).toHaveLength(5));
  });

  it('should show a progress bar while loading', async () => {
    const pending = new Subject<DataPage<NodeMapping>>();
    await render(MappingListComponent, {
      providers: [
        {
          provide: NODE_MAPPING_SERVICE,
          useValue: { getMappings: vi.fn().mockReturnValue(pending) },
        },
      ],
    });
    const list = TestBed.inject(NodeMappingListService);
    list.setPage(1, 20);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    pending.next({
      pageNumber: 1,
      pageSize: 20,
      pageCount: 1,
      total: 1,
      items: [mapping(1)],
    });
    await waitFor(() =>
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    );
    expect(screen.getByText('m01')).toBeInTheDocument();
  });
});
