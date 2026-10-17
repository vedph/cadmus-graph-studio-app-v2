import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { firstValueFrom } from 'rxjs';

import {
  NODE_MAPPING_SERVICE,
  NodeMapping,
  RamNodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

import { MappingEditorPageComponent } from './mapping-editor-page.component';
import { provideInertMonacoLoader } from '../../../testing/monaco-testing';

const DOC = {
  documentMappings: [
    {
      name: 'person',
      sourceType: 2,
      source: 'events',
      sid: 'sid',
      children: [{ name: 'birth', source: 'birth' }],
    },
    { name: 'work', sourceType: 1, source: 'title', sid: 'w' },
  ],
};

describe('MappingEditorPageComponent', () => {
  const setup = async (id: string) => {
    const result = await render(MappingEditorPageComponent, {
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        provideInertMonacoLoader(),
        { provide: NODE_MAPPING_SERVICE, useExisting: RamNodeMappingService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
        },
      ],
      configureTestBed: (testBed) => {
        testBed
          .inject(RamNodeMappingService)
          .importMappings(JSON.stringify(DOC))
          .subscribe();
      },
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    const ram = TestBed.inject(RamNodeMappingService);
    return { ...result, navigate, ram, user: userEvent.setup() };
  };

  const editor = () => screen.getByRole('form', { name: 'mapping' });
  const nameField = () =>
    within(editor()).getByRole('textbox', { name: 'name' });
  const save = () => within(editor()).getByRole('button', { name: /^save$/ });

  /** The stored mappings (the RAM store is synchronous). */
  const stored = (ram: RamNodeMappingService): NodeMapping[] => {
    let items: NodeMapping[] = [];
    ram.getMappings({}, 1, 0).subscribe((page) => (items = page.items));
    return items;
  };

  /** The ID of the stored mapping with the specified name. */
  const idOf = (ram: RamNodeMappingService, name: string) =>
    stored(ram).find((m) => m.name === name)!.id;

  /** Fill the required SID and source (in the input tab) of a new mapping. */
  const fillNew = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(within(editor()).getByRole('textbox', { name: 'SID' }), 's');
    await user.click(screen.getByRole('tab', { name: /input/ }));
    await user.type(await screen.findByRole('textbox', { name: 'jmes' }), 'x');
    // the expression reaches the editor after a 300ms debounce
    await new Promise((resolve) => setTimeout(resolve, 400));
  };

  afterEach(() => vi.restoreAllMocks());

  it('should edit the mapping with the route ID', async () => {
    // person is imported first and gets ID 1
    await setup('1');
    await waitFor(() => expect(nameField()).toHaveValue('person'));
    expect(
      screen.getByRole('button', { name: 'actions for person' })
    ).toBeInTheDocument();
  });

  it('should be empty for an unknown mapping ID', async () => {
    await setup('99');
    expect(nameField()).toHaveValue('');
  });

  it('should save the edited mapping and stay in the editor', async () => {
    const { user, ram, navigate } = await setup('1');
    await waitFor(() => expect(nameField()).toHaveValue('person'));

    await user.clear(nameField());
    await user.type(nameField(), 'human');
    await user.click(save());

    await waitFor(() =>
      expect(stored(ram).map((m) => m.name)).toEqual(['human', 'work'])
    );
    const saved = stored(ram).find((m) => m.name === 'human')!;
    expect(saved.id).toBe(1);
    expect(saved.children![0].name).toBe('birth');
    expect(navigate).not.toHaveBeenCalled();
    expect(nameField()).toHaveValue('human');
  });

  it('should save a child added in the tree', async () => {
    const { user, ram } = await setup('1');
    await waitFor(() => expect(nameField()).toHaveValue('person'));

    await user.click(screen.getByRole('button', { name: 'actions for person' }));
    await user.click(await screen.findByRole('menuitem', { name: /add/ }));

    await waitFor(() => expect(nameField()).toHaveValue('New mapping'));
    const person = (await firstValueFrom(ram.getMapping(1)))!;
    expect(person.children!.map((c) => c.name)).toEqual([
      'birth',
      'New mapping',
    ]);
  });

  it('should create a new mapping for ID 0', async () => {
    const { user, ram, navigate } = await setup('0');
    await waitFor(() => expect(nameField()).toHaveValue('new mapping'));

    await fillNew(user);
    await user.click(save());

    await waitFor(() =>
      expect(stored(ram).map((m) => m.name)).toContain('new mapping')
    );
    expect(idOf(ram, 'new mapping')).toBeGreaterThan(idOf(ram, 'work'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should update a new mapping when saved again', async () => {
    const { user, ram } = await setup('0');
    await waitFor(() => expect(nameField()).toHaveValue('new mapping'));
    await fillNew(user);
    await user.click(save());

    await user.click(screen.getByRole('tab', { name: /metadata/ }));
    await user.clear(nameField());
    await user.type(nameField(), 'renamed');
    await user.click(save());

    await waitFor(() =>
      expect(stored(ram).map((m) => m.name)).toEqual([
        'person',
        'renamed',
        'work',
      ])
    );
  });

  it('should go home when the editor is closed', async () => {
    const { user, navigate } = await setup('1');
    await waitFor(() => expect(nameField()).toHaveValue('person'));
    await user.click(within(editor()).getByRole('button', { name: /close/ }));
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
