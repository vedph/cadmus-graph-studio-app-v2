import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { DataPage } from '@myrmidon/ngx-tools';

import { NodeMappingListService } from './node-mapping-list.service';
import {
  NODE_MAPPING_SERVICE,
  NodeMapping,
  NodeMappingService,
} from '../models';
import { RamNodeMappingService } from '../services/ram-node-mapping.service';

function mapping(id: number, name: string): NodeMapping {
  return { id, name, sourceType: 1, source: 's', sid: 'sid' };
}

describe('NodeMappingListService', () => {
  let service: NodeMappingListService;
  let repository: NodeMappingService;

  const currentPage = () => firstValueFrom(service.page$);
  const loading = () => firstValueFrom(service.loading$);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: NODE_MAPPING_SERVICE, useExisting: RamNodeMappingService },
      ],
    });
    repository = TestBed.inject(NODE_MAPPING_SERVICE);
    for (let i = 1; i <= 25; i++) {
      await firstValueFrom(
        repository.addMapping(mapping(i, `m${String(i).padStart(2, '0')}`))
      );
    }
    service = TestBed.inject(NodeMappingListService);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('should load the first page on creation', async () => {
    // the constructor reset is not awaited
    await service.reset();
    const page = await currentPage();
    expect(page.pageNumber).toBe(1);
    expect(page.total).toBe(25);
    expect(page.items.length).toBe(20);
    expect(await loading()).toBe(false);
  });

  it('should set the page and page size', async () => {
    await service.setPage(2, 10);
    const page = await currentPage();
    expect(page.pageNumber).toBe(2);
    expect(page.items.map((m) => m.id)).toEqual([
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    expect(await loading()).toBe(false);
  });

  it('should not reuse a cached page after the page size changes', async () => {
    await service.setPage(1, 20);
    await service.setPage(1, 5);
    const page = await currentPage();
    expect(page.items.length).toBe(5);
    expect(page.pageSize).toBe(5);
  });

  it('should set and get the filter', async () => {
    await service.setFilter({ name: 'm1' });
    expect(service.getFilter()).toEqual({ name: 'm1' });
    expect(await firstValueFrom(service.filter$)).toEqual({ name: 'm1' });
    const page = await currentPage();
    expect(page.items.map((m) => m.name)).toEqual([
      'm10',
      'm11',
      'm12',
      'm13',
      'm14',
      'm15',
      'm16',
      'm17',
      'm18',
      'm19',
    ]);
  });

  it('should reset the filter', async () => {
    await service.setFilter({ name: 'm1' });
    await service.reset();
    expect(service.getFilter()).toEqual({});
    expect((await currentPage()).total).toBe(25);
  });

  it('should signal loading while loading a page', async () => {
    const states: (boolean | undefined)[] = [];
    service.loading$.subscribe((l) => states.push(l));
    await service.setPage(2, 20);
    expect(states).toContain(true);
    expect(states[states.length - 1]).toBe(false);
  });

  it('should add a mapping and reload', async () => {
    service.addMapping(mapping(0, 'aaa'));
    // the reload is not awaited by addMapping
    await service.reset();
    const page = await currentPage();
    expect(page.total).toBe(26);
    expect(page.items[0].name).toBe('aaa');
  });

  it('should delete a mapping and reload', async () => {
    service.deleteMapping(1);
    await service.reset();
    const page = await currentPage();
    expect(page.total).toBe(24);
    expect(page.items[0].id).toBe(2);
  });

  it('should reset loading and log on add error', async () => {
    vi.spyOn(repository, 'addMapping').mockReturnValue(
      throwError(() => 'fail')
    );
    service.addMapping(mapping(0, 'x'));
    expect(await loading()).toBe(false);
    expect(console.error).toHaveBeenCalledWith('Error saving NodeMapping: "fail"');
  });

  it('should reset loading and log on delete error', async () => {
    vi.spyOn(repository, 'deleteMapping').mockReturnValue(
      throwError(() => 'fail')
    );
    service.deleteMapping(1);
    expect(await loading()).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      'Error deleting NodeMapping: "fail"'
    );
  });

  it('should propagate page load errors and reset loading', async () => {
    vi.spyOn(repository, 'getMappings').mockReturnValue(
      throwError(() => 'fail')
    );
    await expect(service.setPage(3, 5)).rejects.toBe('fail');
    expect(await loading()).toBe(false);
    await expect(service.setFilter({ name: 'zz' })).rejects.toBe('fail');
    expect(await loading()).toBe(false);
    await expect(service.reset()).rejects.toBe('fail');
    expect(await loading()).toBe(false);
  });

  it('should load a page from the repository', async () => {
    const page: DataPage<NodeMapping> = {
      pageNumber: 1,
      pageSize: 1,
      pageCount: 1,
      total: 1,
      items: [mapping(1, 'x')],
    };
    const spy = vi.spyOn(repository, 'getMappings').mockReturnValue(of(page));
    expect(await firstValueFrom(service.loadPage(1, 1, { name: 'x' }))).toBe(
      page
    );
    expect(spy).toHaveBeenCalledWith({ name: 'x' }, 1, 1);
    expect(await loading()).toBe(false);
  });
});
