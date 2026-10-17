import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { EnvService } from '@myrmidon/ngx-tools';

import { SampleDataService } from './sample-data.service';
import { AssetService } from './asset.service';

describe('SampleDataService', () => {
  let assets: {
    loadText: ReturnType<typeof vi.fn>;
    loadObject: ReturnType<typeof vi.fn>;
  };
  let env: Record<string, string>;

  const create = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AssetService, useValue: assets },
        { provide: EnvService, useValue: { get: (key: string) => env[key] } },
      ],
    });
    return TestBed.inject(SampleDataService);
  };

  beforeEach(() => {
    assets = {
      loadText: vi.fn((path: string) => of(`text of ${path}`)),
      loadObject: vi.fn((path: string) => of({ path })),
    };
    env = {};
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('should load the default samples on creation', async () => {
    const service = create();
    expect(assets.loadText).toHaveBeenCalledWith('sample-mappings.json');
    expect(assets.loadObject).toHaveBeenCalledWith('person-presets.json');
    expect(await firstValueFrom(service.json$)).toBe(
      'text of sample-mappings.json'
    );
    expect(await firstValueFrom(service.presets$)).toEqual({
      path: 'person-presets.json',
    });
  });

  it('should load the mappings configured in the environment on creation', () => {
    env['presetMappings'] = 'env-mappings.json';
    create();
    expect(assets.loadText).toHaveBeenCalledWith('env-mappings.json');
  });

  it('should load the specified samples', async () => {
    const service = create();
    service.load('a.json', 'b.json');
    expect(await firstValueFrom(service.json$)).toBe('text of a.json');
    expect(await firstValueFrom(service.presets$)).toEqual({ path: 'b.json' });
  });

  it('should default unspecified samples', () => {
    const service = create();
    service.load('a.json', 'b.json');
    assets.loadText.mockClear();
    assets.loadObject.mockClear();
    service.load();
    expect(assets.loadText).toHaveBeenCalledWith('person-mappings.json');
    expect(assets.loadObject).toHaveBeenCalledWith('person-presets.json');
  });

  it('should default unspecified mappings from the environment', () => {
    env['presetMappings'] = 'env-mappings.json';
    const service = create();
    service.load('a.json', 'p.json');
    assets.loadText.mockClear();
    service.load(undefined, 'p.json');
    expect(assets.loadText).toHaveBeenCalledWith('env-mappings.json');
  });

  it('should expose the loaded samples', () => {
    const service = create();
    expect(service.mappings()).toBe('sample-mappings.json');
    expect(service.presets()).toBe('person-presets.json');
    service.load('a.json', 'b.json');
    expect(service.mappings()).toBe('a.json');
    expect(service.presets()).toBe('b.json');
  });

  it('should not reload samples already loaded', () => {
    const service = create();
    assets.loadText.mockClear();
    assets.loadObject.mockClear();
    service.load('sample-mappings.json', 'person-presets.json');
    expect(assets.loadText).not.toHaveBeenCalled();
    expect(assets.loadObject).not.toHaveBeenCalled();
  });

  it('should not reload the mappings when only the presets change', async () => {
    const service = create();
    const jsons: string[] = [];
    service.json$.subscribe((j) => jsons.push(j));
    service.load('sample-mappings.json', 'other-presets.json');
    expect(jsons).toEqual(['text of sample-mappings.json']);
    expect(assets.loadObject).toHaveBeenLastCalledWith('other-presets.json');
    expect(await firstValueFrom(service.presets$)).toEqual({
      path: 'other-presets.json',
    });
  });

  it('should reload the defaults on reset, even if loaded', () => {
    const service = create();
    assets.loadText.mockClear();
    service.reset();
    expect(assets.loadText).toHaveBeenCalledWith('sample-mappings.json');
    service.load('a.json', 'b.json');
    service.reset();
    expect(assets.loadText).toHaveBeenLastCalledWith('sample-mappings.json');
    expect(assets.loadObject).toHaveBeenLastCalledWith('person-presets.json');
  });
});
