import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import {
  NODE_MAPPING_SERVICE,
  NodeMappingListService,
  RamNodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

import { HomeComponent } from './home.component';
import { SampleDataService } from '../../services/sample-data.service';

describe('HomeComponent', () => {
  let sampleService: { load: ReturnType<typeof vi.fn> };

  const setup = async () => {
    const result = await render(HomeComponent, {
      providers: [
        provideRouter([]),
        { provide: SampleDataService, useValue: sampleService },
        { provide: NODE_MAPPING_SERVICE, useExisting: RamNodeMappingService },
      ],
      configureTestBed: (testBed) => {
        testBed
          .inject(RamNodeMappingService)
          .addMapping({
            id: 7,
            name: 'person',
            sourceType: 2,
            source: 'events',
            sid: 'sid',
          })
          .subscribe();
      },
    });
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    await TestBed.inject(NodeMappingListService).reset();
    return { ...result, navigate, user: userEvent.setup() };
  };

  beforeEach(() => {
    sampleService = { load: vi.fn() };
  });

  afterEach(() => vi.restoreAllMocks());

  it('should show the filters and the mappings list', async () => {
    await setup();
    expect(screen.getByRole('group', { name: 'filters' })).toBeInTheDocument();
    expect(await screen.findByText('person')).toBeInTheDocument();
  });

  it('should select and load the default samples', async () => {
    await setup();
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'mappings' })
      ).toHaveTextContent('person-mappings')
    );
    expect(
      screen.getByRole('combobox', { name: 'sample data' })
    ).toHaveTextContent('person-presets');
    await waitFor(() =>
      expect(sampleService.load).toHaveBeenCalledExactlyOnceWith(
        'person-mappings.json',
        'person-presets.json'
      )
    );
  });

  it('should load the selected samples', async () => {
    const { user } = await setup();
    await waitFor(() => expect(sampleService.load).toHaveBeenCalled());

    await user.click(screen.getByRole('combobox', { name: 'mappings' }));
    await user.click(
      await screen.findByRole('option', { name: 'sample-mappings' })
    );
    await waitFor(() =>
      expect(sampleService.load).toHaveBeenLastCalledWith(
        'sample-mappings.json',
        'person-presets.json'
      )
    );

    await user.click(screen.getByRole('combobox', { name: 'sample data' }));
    await user.click(
      await screen.findByRole('option', { name: 'sample-presets' })
    );
    await waitFor(() =>
      expect(sampleService.load).toHaveBeenLastCalledWith(
        'sample-mappings.json',
        'sample-presets.json'
      )
    );
  });

  it('should navigate to edit a mapping', async () => {
    const { user, navigate } = await setup();
    await user.click(await screen.findByRole('button', { name: 'edit person' }));
    expect(navigate).toHaveBeenCalledWith(['mappings', 7]);
  });

  it('should navigate to add a new mapping', async () => {
    const { user, navigate } = await setup();
    await user.click(screen.getByRole('button', { name: /mapping/ }));
    expect(navigate).toHaveBeenCalledWith(['mappings', 0]);
  });
});
