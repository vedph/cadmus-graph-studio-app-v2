import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';

import {
  NODE_MAPPING_SERVICE,
  NodeMapping,
  NodeMappingFilter,
  NodeMappingListService,
  NodeMappingService,
  RamCacheService,
} from '@myrmidon/cadmus-mapping-builder';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EnvService } from '@myrmidon/ngx-tools';

import { SampleDataService } from './services/sample-data.service';
import { App } from './app';

class MockNodeMappingListService {
  reset = jasmine.createSpy('reset').and.resolveTo();
  addMapping = jasmine.createSpy('addMapping');
}

class MockNodeMappingService implements NodeMappingService {
  getMappings(): Observable<any> {
    return of({ pageNumber: 1, pageSize: 0, pageCount: 0, total: 0, items: [] });
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
  load = jasmine.createSpy('load');
  reset = jasmine.createSpy('reset');
}

class MockDialogService {
  confirm = jasmine.createSpy('confirm').and.returnValue(of(true));
}

class MockEnvService {
  get(key: string): string | undefined {
    return key === 'version' ? 'test-version' : undefined;
  }
}

class MockRamCacheService {
  add = jasmine.createSpy('add');
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DialogService, useClass: MockDialogService },
        { provide: NodeMappingListService, useClass: MockNodeMappingListService },
        { provide: NODE_MAPPING_SERVICE, useClass: MockNodeMappingService },
        { provide: SampleDataService, useClass: MockSampleDataService },
        { provide: RamCacheService, useClass: MockRamCacheService },
        { provide: EnvService, useClass: MockEnvService },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#title')?.textContent).toContain(
      'Cadmus Graph Studio'
    );
  });
});
