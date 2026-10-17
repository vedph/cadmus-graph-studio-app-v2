import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject, of } from 'rxjs';

import {
  NODE_MAPPING_SERVICE,
  NodeMappingListService,
  RamCacheService,
} from '@myrmidon/cadmus-mapping-builder';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EnvService } from '@myrmidon/ngx-tools';

import { SampleDataService } from './services/sample-data.service';
import { App } from './app';

@Component({ template: 'doc page' })
class DocPageStub {}

describe('App', () => {
  let listService: { reset: ReturnType<typeof vi.fn> };
  let mappingService: {
    importMappings: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    exportMappings: ReturnType<typeof vi.fn>;
  };
  let sampleService: {
    json$: BehaviorSubject<string>;
    presets$: BehaviorSubject<Record<string, unknown>>;
  };
  let dialogService: { confirm: ReturnType<typeof vi.fn> };
  let cacheService: { add: ReturnType<typeof vi.fn> };

  const setup = async () => {
    const result = await render(App, {
      providers: [
        provideRouter([{ path: 'mappings-doc', component: DocPageStub }]),
        { provide: DialogService, useValue: dialogService },
        { provide: NodeMappingListService, useValue: listService },
        { provide: NODE_MAPPING_SERVICE, useValue: mappingService },
        { provide: SampleDataService, useValue: sampleService },
        { provide: RamCacheService, useValue: cacheService },
        {
          provide: EnvService,
          useValue: {
            get: (key: string) => (key === 'version' ? '9.9.9' : undefined),
          },
        },
      ],
    });
    return { ...result, user: userEvent.setup() };
  };

  const openFileMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'File' }));
  };

  beforeEach(() => {
    listService = { reset: vi.fn().mockResolvedValue(undefined) };
    mappingService = {
      importMappings: vi.fn().mockReturnValue(of([])),
      clear: vi.fn().mockReturnValue(of(null)),
      exportMappings: vi.fn().mockReturnValue(of('{"documentMappings":[]}')),
    };
    sampleService = {
      json$: new BehaviorSubject<string>('{"documentMappings":[]}'),
      presets$: new BehaviorSubject<Record<string, unknown>>({}),
    };
    dialogService = { confirm: vi.fn().mockReturnValue(of(true)) };
    cacheService = { add: vi.fn() };
  });

  afterEach(() => vi.restoreAllMocks());

  it('should render title, home link and version', async () => {
    await setup();
    expect(screen.getByText('Cadmus Graph Studio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/home'
    );
    expect(screen.getByText(/version 9\.9\.9/)).toBeInTheDocument();
  });

  it('should import the sample mappings and reset the list', async () => {
    await setup();
    expect(mappingService.importMappings).toHaveBeenCalledWith(
      '{"documentMappings":[]}'
    );
    expect(listService.reset).toHaveBeenCalled();

    sampleService.json$.next('{"documentMappings":[{"name":"x"}]}');
    expect(mappingService.importMappings).toHaveBeenLastCalledWith(
      '{"documentMappings":[{"name":"x"}]}'
    );
    expect(listService.reset).toHaveBeenCalledTimes(2);
  });

  it('should cache the sample presets as JSON', async () => {
    await setup();
    sampleService.presets$.next({ map_a: { x: 1 }, jms_b: [1] });
    expect(cacheService.add).toHaveBeenCalledWith(
      'map_a',
      JSON.stringify({ x: 1 }, null, 2)
    );
    expect(cacheService.add).toHaveBeenCalledWith(
      'jms_b',
      JSON.stringify([1], null, 2)
    );
  });

  it('should clear the mappings after confirmation', async () => {
    const { user } = await setup();
    listService.reset.mockClear();

    await openFileMenu(user);
    await user.click(
      await screen.findByRole('menuitem', { name: /Clear mappings/ })
    );

    expect(dialogService.confirm).toHaveBeenCalledWith(
      'WARNING',
      'Clear all mappings?'
    );
    expect(mappingService.clear).toHaveBeenCalledTimes(1);
    expect(listService.reset).toHaveBeenCalledTimes(1);
  });

  it('should not clear the mappings when not confirmed', async () => {
    dialogService.confirm.mockReturnValue(of(false));
    const { user } = await setup();

    await openFileMenu(user);
    await user.click(
      await screen.findByRole('menuitem', { name: /Clear mappings/ })
    );

    expect(mappingService.clear).not.toHaveBeenCalled();
  });

  it('should export the mappings to a file', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mappings');
    const revokeObjectURL = vi.fn();
    Object.assign(window.URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('mappings.json');
        expect(this.href).toBe('blob:mappings');
      });
    const { user } = await setup();

    await openFileMenu(user);
    await user.click(
      await screen.findByRole('menuitem', { name: /Export mappings/ })
    );

    expect(mappingService.exportMappings).toHaveBeenCalled();
    const blob: Blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe('{"documentMappings":[]}');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mappings');
  });

  it('should navigate to the mappings document', async () => {
    const { user } = await setup();
    await openFileMenu(user);
    await user.click(
      await screen.findByRole('menuitem', { name: /View mappings/ })
    );
    await waitFor(() =>
      expect(TestBed.inject(Router).url).toBe('/mappings-doc')
    );
    expect(await screen.findByText('doc page')).toBeInTheDocument();
  });
});
