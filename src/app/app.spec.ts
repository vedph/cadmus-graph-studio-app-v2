import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { vi } from 'vitest';

import {
  NODE_MAPPING_SERVICE,
  NodeMapping,
  NodeMappingListService,
  NodeMappingService,
  RamCacheService,
} from '@myrmidon/cadmus-mapping-builder';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EnvService } from '@myrmidon/ngx-tools';

import { SampleDataService } from './services/sample-data.service';
import { App } from './app';

class MockNodeMappingListService {
  reset = vi.fn().mockResolvedValue(undefined);
  addMapping = vi.fn();
}

class MockNodeMappingService implements NodeMappingService {
  getMappings(): Observable<any> {
    return of({
      pageNumber: 1,
      pageSize: 0,
      pageCount: 0,
      total: 0,
      items: [],
    });
  }
  getMapping(): Observable<NodeMapping | null> {
    return of(null);
  }
  addMapping(mapping: NodeMapping): Observable<NodeMapping> {
    return of(mapping);
  }
  deleteMapping(): Observable<null> {
    return of(null);
  }
  clear(): Observable<null> {
    return of(null);
  }
  exportMappings(): Observable<string> {
    return of('{}');
  }
  importMappings(): Observable<NodeMapping[]> {
    return of([]);
  }
}

class MockSampleDataService {
  json$ = new BehaviorSubject<string>('{}');
  presets$ = new BehaviorSubject<Record<string, unknown>>({});
  load = vi.fn();
  reset = vi.fn();
}

class MockDialogService {
  confirm = vi.fn().mockReturnValue(of(true));
}

class MockEnvService {
  get(key: string): string | undefined {
    return key === 'version' ? 'test-version' : undefined;
  }
}

class MockRamCacheService {
  add = vi.fn();
}

describe('App', () => {
  const renderApp = async () => {
    return render(App, {
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DialogService, useClass: MockDialogService },
        {
          provide: NodeMappingListService,
          useClass: MockNodeMappingListService,
        },
        { provide: NODE_MAPPING_SERVICE, useClass: MockNodeMappingService },
        { provide: SampleDataService, useClass: MockSampleDataService },
        { provide: RamCacheService, useClass: MockRamCacheService },
        { provide: EnvService, useClass: MockEnvService },
      ],
    });
  };

  it('should create the app', async () => {
    const { fixture } = await renderApp();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render title', async () => {
    await renderApp();
    const titleElement = document.getElementById('title');
    expect(titleElement).toBeTruthy();
    expect(titleElement?.textContent).toContain('Cadmus Graph Studio');
  });
});
