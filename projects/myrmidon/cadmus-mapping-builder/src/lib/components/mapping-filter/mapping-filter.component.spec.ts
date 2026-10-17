import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Subject, firstValueFrom } from 'rxjs';

import { DataPage } from '@myrmidon/ngx-tools';

import { MappingFilterComponent } from './mapping-filter.component';
import { NODE_MAPPING_SERVICE, NodeMapping } from '../../models';
import { RamNodeMappingService } from '../../services/ram-node-mapping.service';
import { NodeMappingListService } from '../../state/node-mapping-list.service';

describe('MappingFilterComponent', () => {
  const setup = async () => {
    const result = await render(MappingFilterComponent, {
      providers: [
        { provide: NODE_MAPPING_SERVICE, useExisting: RamNodeMappingService },
      ],
    });
    const list = TestBed.inject(NodeMappingListService);
    return { ...result, list, user: userEvent.setup() };
  };

  it('should render all the filter fields', async () => {
    await setup();
    expect(screen.getByRole('combobox', { name: 'source type' })).toBeInTheDocument();
    for (const name of ['name', 'facet', 'group', 'title', 'part type', 'part role']) {
      expect(screen.getByRole('textbox', { name })).toHaveValue('');
    }
    expect(screen.getByRole('spinbutton', { name: 'flags' })).toHaveValue(0);
  });

  it('should show the current filter', async () => {
    const { list } = await setup();
    await list.setFilter({
      sourceType: 2,
      name: 'person',
      facet: 'f',
      group: 'g',
      flags: 3,
      title: 't',
      partType: 'pt',
      partRole: 'pr',
    });

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('person')
    );
    expect(screen.getByRole('textbox', { name: 'facet' })).toHaveValue('f');
    expect(screen.getByRole('textbox', { name: 'group' })).toHaveValue('g');
    expect(screen.getByRole('textbox', { name: 'title' })).toHaveValue('t');
    expect(screen.getByRole('textbox', { name: 'part type' })).toHaveValue('pt');
    expect(screen.getByRole('textbox', { name: 'part role' })).toHaveValue('pr');
    expect(screen.getByRole('spinbutton', { name: 'flags' })).toHaveValue(3);
    expect(screen.getByRole('combobox', { name: 'source type' })).toHaveTextContent(
      'part'
    );
  });

  it('should apply the edited filter', async () => {
    const { list, user } = await setup();

    await user.click(screen.getByRole('combobox', { name: 'source type' }));
    await user.click(await screen.findByRole('option', { name: 'item' }));
    await user.type(screen.getByRole('textbox', { name: 'name' }), 'person');
    await user.type(screen.getByRole('textbox', { name: 'facet' }), 'f');
    await user.type(screen.getByRole('textbox', { name: 'group' }), 'g');
    await user.type(screen.getByRole('textbox', { name: 'title' }), 't');
    await user.type(screen.getByRole('textbox', { name: 'part type' }), 'pt');
    await user.type(screen.getByRole('textbox', { name: 'part role' }), 'pr');
    const flags = screen.getByRole('spinbutton', { name: 'flags' });
    await user.clear(flags);
    await user.type(flags, '5');
    await user.click(screen.getByRole('button', { name: 'apply filters' }));

    await waitFor(() =>
      expect(list.getFilter()).toEqual({
        sourceType: 1,
        name: 'person',
        facet: 'f',
        group: 'g',
        flags: 5,
        title: 't',
        partType: 'pt',
        partRole: 'pr',
      })
    );
  });

  it('should drop empty values from the applied filter', async () => {
    const { list, user } = await setup();
    await user.type(screen.getByRole('textbox', { name: 'name' }), 'x');
    await user.clear(screen.getByRole('textbox', { name: 'name' }));
    await user.click(screen.getByRole('button', { name: 'apply filters' }));
    await waitFor(() => expect(list.getFilter()).toEqual({}));
    expect(Object.values(list.getFilter()).every((v) => v === undefined)).toBe(
      true
    );
  });

  it('should reset the filter', async () => {
    const { list, user } = await setup();
    await list.setFilter({ name: 'person', flags: 2 });
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('person')
    );

    await user.click(screen.getByRole('button', { name: 'reset filters' }));

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('')
    );
    expect(screen.getByRole('spinbutton', { name: 'flags' })).toHaveValue(0);
    expect(list.getFilter()).toEqual({});
  });

  it('should disable apply while loading', async () => {
    const pending = new Subject<DataPage<NodeMapping>>();
    const repository = {
      getMappings: vi.fn().mockReturnValue(pending),
    };
    await render(MappingFilterComponent, {
      providers: [{ provide: NODE_MAPPING_SERVICE, useValue: repository }],
    });
    const list = TestBed.inject(NodeMappingListService);

    // the initial page load is pending
    expect(await firstValueFrom(list.loading$)).toBe(true);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'apply filters' })).toBeDisabled()
    );

    pending.next({ pageNumber: 1, pageSize: 20, pageCount: 0, total: 0, items: [] });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'apply filters' })).toBeEnabled()
    );
  });
});
