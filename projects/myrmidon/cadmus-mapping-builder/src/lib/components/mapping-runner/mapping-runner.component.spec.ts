import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Subject, of, throwError } from 'rxjs';

import { NgxMonacoEditorFakeHarness } from '@jean-merelis/ngx-monaco-editor/testing';
import { ErrorWrapper } from '@myrmidon/ngx-tools';

import { MappingRunnerComponent } from './mapping-runner.component';
import { GraphStudioApiService } from '../../services/graph-studio-api.service';
import { RamCacheService } from '../../services/ram-cache.service';
import { GraphSet, NodeMapping } from '../../models';
import {
  provideFakeMonacoEditor,
  useFakeMonacoEditor,
} from '../../../testing/monaco-testing';

const MAPPING: NodeMapping = {
  id: 1,
  name: 'person',
  sourceType: 2,
  source: 'events',
  sid: '{$part-id}',
};

const GRAPH: GraphSet = {
  nodes: [
    { id: 1, label: 'Petrarch', uri: 'x:petrarch', sid: 'P1', sourceType: 2 },
  ],
  triples: [
    {
      id: 1,
      subjectId: 1,
      predicateId: 2,
      objectId: 3,
      subjectUri: 'x:petrarch',
      predicateUri: 'rdf:type',
      objectUri: 'crm:e21_person',
      sid: 'P1',
    },
    {
      id: 2,
      subjectId: 1,
      predicateId: 4,
      objectId: 0,
      subjectUri: 'x:petrarch',
      predicateUri: 'crm:p3_has_note',
      objectLiteral: 'poet',
      literalType: 'xs:string',
      literalLanguage: 'en',
      literalNumber: 1.234,
      sid: 'P1',
    },
  ],
};

describe('MappingRunnerComponent', () => {
  let api: { runMappings: ReturnType<typeof vi.fn> };
  let cache: RamCacheService;

  /** Render the runner, with the default mapping unless null. */
  const setup = async (mapping: NodeMapping | null = MAPPING) => {
    useFakeMonacoEditor(MappingRunnerComponent);
    const result = await render(MappingRunnerComponent, {
      inputs: { mapping: mapping ?? undefined },
      providers: [
        provideFakeMonacoEditor(),
        { provide: GraphStudioApiService, useValue: api },
        { provide: RamCacheService, useValue: cache },
      ],
    });
    const loader = TestbedHarnessEnvironment.loader(result.fixture);
    const editor = await loader.getHarness(NgxMonacoEditorFakeHarness);
    return { ...result, editor, user: userEvent.setup() };
  };

  const run = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: /run/ }));

  const openMetadata = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'metadata' }));
  };

  beforeEach(() => {
    api = { runMappings: vi.fn().mockReturnValue(of({ value: GRAPH })) };
    cache = new RamCacheService();
  });

  it('should not run without input', async () => {
    const { user } = await setup();
    await run(user);
    expect(api.runMappings).not.toHaveBeenCalled();
  });

  it('should not run without a mapping', async () => {
    const { user, editor } = await setup(null);
    await editor.setValue('{}');
    await run(user);
    expect(api.runMappings).not.toHaveBeenCalled();
  });

  it('should run the mapping with the default metadata', async () => {
    const { user, editor } = await setup();
    await editor.setValue('{"events":[]}');
    await run(user);

    expect(api.runMappings).toHaveBeenCalledExactlyOnceWith(
      '{"events":[]}',
      [MAPPING],
      {
        itemId: 'IID',
        partId: 'PID',
        partTypeId: undefined,
        roleId: undefined,
        facetId: undefined,
        itemTitle: 'Alpha item',
        itemUri: undefined,
        itemLabel: undefined,
        itemEid: 'alpha',
        metadataPid: 'MPID',
        groupId: undefined,
        flags: undefined,
      }
    );
  });

  it('should show the resulting nodes and triples', async () => {
    const { user, editor } = await setup();
    await editor.setValue('{}');
    await run(user);

    const nodesTable = (await screen.findByText('Petrarch')).closest('table')!;
    expect(within(nodesTable).getByText('x:petrarch')).toBeInTheDocument();
    expect(within(nodesTable).getByText('P1')).toBeInTheDocument();

    const typeCell = screen.getByText('crm:e21_person');
    const triplesTable = typeCell.closest('table')!;
    expect(within(triplesTable).getAllByRole('row')).toHaveLength(3);
    const literalCell = within(triplesTable).getByText(/poet/).closest('td')!;
    expect(literalCell).toHaveTextContent('type: xs:string');
    expect(literalCell).toHaveTextContent('language: en');
    expect(literalCell).toHaveTextContent('numeric: 1.23');
  });

  it('should send the edited metadata', async () => {
    const { user, editor } = await setup();
    await openMetadata(user);
    const itemId = screen.getByRole('textbox', { name: 'item ID' });
    await user.clear(itemId);
    await user.type(itemId, 'my-item');
    await user.type(screen.getByRole('textbox', { name: 'facet ID' }), 'person');
    await user.type(screen.getByRole('textbox', { name: 'group ID' }), 'g');
    const flags = screen.getByRole('spinbutton', { name: 'flags' });
    await user.clear(flags);
    await user.type(flags, '6');

    await editor.setValue('{}');
    await run(user);

    expect(api.runMappings.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        itemId: 'my-item',
        facetId: 'person',
        groupId: 'g',
        flags: 6,
      })
    );
  });

  it('should reset the metadata', async () => {
    const { user, editor } = await setup();
    await openMetadata(user);
    await user.click(screen.getByRole('button', { name: 'reset' }));

    expect(screen.getByRole('textbox', { name: 'item ID' })).toHaveValue('');
    await editor.setValue('{}');
    await run(user);
    expect(api.runMappings.mock.calls[0][2]).toEqual({});
  });

  it('should cap the typed metadata length', async () => {
    const { user } = await setup();
    await openMetadata(user);
    expect(
      screen.getByRole('textbox', { name: 'part type ID' })
    ).toHaveAttribute('maxlength', '50');
    expect(screen.getByRole('textbox', { name: 'item title' })).toHaveAttribute(
      'maxlength',
      '500'
    );
    expect(screen.getByRole('textbox', { name: 'item EID' })).toHaveAttribute(
      'maxlength',
      '100'
    );
  });

  it('should keep the input when resetting the metadata', async () => {
    const { user, editor } = await setup();
    await editor.setValue('{"kept":true}');
    await openMetadata(user);
    await user.click(screen.getByRole('button', { name: 'reset' }));
    expect(await editor.getText()).toBe('{"kept":true}');
  });

  it('should render no <form>, as it is embedded in the mapping editor', async () => {
    const { container } = await setup();
    expect(container.querySelector('form')).toBeNull();
  });

  it('should show the error returned by the run', async () => {
    api.runMappings.mockReturnValue(of({ error: 'mapping failed' }));
    const { user, editor } = await setup();
    await editor.setValue('{}');
    await run(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('mapping failed');
    expect(screen.queryByText('Petrarch')).not.toBeInTheDocument();
  });

  it('should show the HTTP error', async () => {
    api.runMappings.mockReturnValue(throwError(() => 'Server error: down'));
    const { user, editor } = await setup();
    await editor.setValue('{}');
    await run(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Server error: down'
    );
  });

  it('should show progress while running and ignore further runs', async () => {
    const response = new Subject<ErrorWrapper<GraphSet>>();
    api.runMappings.mockReturnValue(response);
    const { user, editor } = await setup();
    await editor.setValue('{}');

    await run(user);
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    await run(user);
    expect(api.runMappings).toHaveBeenCalledTimes(1);

    response.next({ value: GRAPH });
    await waitFor(() =>
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Petrarch')).toBeInTheDocument();
  });

  it('should clear the result when the mapping changes', async () => {
    const { user, editor, rerender } = await setup();
    await editor.setValue('{}');
    await run(user);
    expect(await screen.findByText('Petrarch')).toBeInTheDocument();

    await rerender({
      inputs: { mapping: { ...MAPPING, name: 'other' } },
      partialUpdate: true,
    });
    await waitFor(() =>
      expect(screen.queryByText('Petrarch')).not.toBeInTheDocument()
    );
  });

  it('should prettify JSON input', async () => {
    const { user, editor } = await setup();
    await editor.setValue('{"a":[1,2]}');
    await user.click(screen.getByRole('button', { name: 'prettify input' }));
    expect(await editor.getText()).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
  });

  it('should report invalid JSON when prettifying', async () => {
    const { user, editor } = await setup();
    await editor.setValue('{oops');
    await user.click(screen.getByRole('button', { name: 'prettify input' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid JSON');
    expect(await editor.getText()).toBe('{oops');
  });

  it('should set the input from a picked preset', async () => {
    cache.add('map_sample', '{"x":1}');
    const { user, editor } = await setup();

    await user.click(screen.getByRole('combobox', { name: 'preset' }));
    await user.click(await screen.findByRole('option', { name: 'map_sample' }));
    await user.click(screen.getByRole('button', { name: 'pick preset' }));

    expect(await editor.getText()).toBe('{"x":1}');
  });
});
