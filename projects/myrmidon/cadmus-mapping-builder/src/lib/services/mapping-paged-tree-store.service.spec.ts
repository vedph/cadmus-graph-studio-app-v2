import { TestBed } from '@angular/core/testing';
import { firstValueFrom, throwError } from 'rxjs';

import {
  MappingPagedTreeStoreService,
  MappingPagedTreeNode,
} from './mapping-paged-tree-store.service';
import { RamNodeMappingService } from './ram-node-mapping.service';
import { NodeMapping } from '../models';

function buildTree(): NodeMapping {
  return {
    id: 1,
    name: 'root',
    sourceType: 1,
    source: 'r',
    sid: 's',
    children: [
      {
        id: 2,
        parentId: 1,
        name: 'alpha',
        sourceType: 1,
        source: 'a',
        sid: '',
        children: [
          { id: 4, parentId: 2, name: 'alpha_one', sourceType: 1, source: 'a1', sid: '' },
        ],
      },
      { id: 3, parentId: 1, name: 'Beta', sourceType: 1, source: 'b', sid: '' },
    ],
  };
}

describe('MappingPagedTreeStoreService', () => {
  let service: MappingPagedTreeStoreService;
  let ram: RamNodeMappingService;

  const getNodes = async (
    filter = {},
    pageNumber = 1,
    pageSize = 20
  ): Promise<MappingPagedTreeNode[]> =>
    (await firstValueFrom(service.getNodes(filter, pageNumber, pageSize)))
      .items;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MappingPagedTreeStoreService);
    ram = TestBed.inject(RamNodeMappingService);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('should return an empty page when no mapping is set', async () => {
    const page = await firstValueFrom(service.getNodes({}, 1, 20));
    expect(page).toEqual({
      pageNumber: 0,
      pageSize: 0,
      pageCount: 0,
      total: 0,
      items: [],
    });
  });

  it('should flatten a mapping object into tree nodes', async () => {
    await service.reset(buildTree());
    const roots = await getNodes();
    expect(roots.length).toBe(1);
    const root = roots[0];
    expect(root.id).toBe(1);
    expect(root.label).toBe('root');
    expect(root.y).toBe(1);
    expect(root.x).toBe(1);
    expect(root.hasChildren).toBe(true);
    expect(root.parentId).toBeUndefined();
    // the flattened mapping has no children/parent references
    expect(root.mapping).toBeDefined();
    expect((root.mapping as NodeMapping).children).toBeUndefined();
  });

  it('should get children by parent ID with levels and sibling indexes', async () => {
    await service.reset(buildTree());
    const children = await getNodes({ parentId: 1 });
    expect(children.map((n) => [n.id, n.y, n.x, n.hasChildren])).toEqual([
      [2, 2, 1, true],
      [3, 2, 2, false],
    ]);
    const grandchildren = await getNodes({ parentId: 2 });
    expect(grandchildren.map((n) => [n.id, n.y, n.x])).toEqual([[4, 3, 1]]);
  });

  it('should filter by name, case-insensitively', async () => {
    await service.reset(buildTree());
    expect(
      (await getNodes({ parentId: 1, name: ' beta ' })).map((n) => n.id)
    ).toEqual([3]);
    expect(await getNodes({ parentId: 1, name: 'zzz' })).toEqual([]);
    // a blank name is ignored
    expect((await getNodes({ parentId: 1, name: '  ' })).length).toBe(2);
  });

  it('should not filter the root by name', async () => {
    await service.reset(buildTree());
    expect((await getNodes({ name: 'beta' })).map((n) => n.id)).toEqual([1]);
  });

  it('should page nodes', async () => {
    await service.reset(buildTree());
    const page = await firstValueFrom(service.getNodes({ parentId: 1 }, 2, 1));
    expect(page.pageNumber).toBe(2);
    expect(page.pageSize).toBe(1);
    expect(page.pageCount).toBe(2);
    expect(page.total).toBe(2);
    expect(page.items.map((n) => n.id)).toEqual([3]);
  });

  it('should label a nameless node by its ID', async () => {
    await service.reset({ id: 7, name: '', sourceType: 1, source: '', sid: '' });
    expect((await getNodes())[0].label).toBe('7');
  });

  it('should reset from a mapping ID in the RAM store', async () => {
    await firstValueFrom(ram.addMapping(buildTree()));
    expect(await service.reset(1)).toBe(true);
    expect((await getNodes({ parentId: 1 })).length).toBe(2);
  });

  it('should be empty for a missing mapping ID', async () => {
    await service.reset(99);
    expect(await getNodes()).toEqual([]);
  });

  it('should clear when reset without a mapping', async () => {
    await service.reset(buildTree());
    await service.reset();
    expect(await getNodes()).toEqual([]);
  });

  it('should reject and clear when fetching fails', async () => {
    await service.reset(buildTree());
    vi.spyOn(ram, 'getMapping').mockReturnValue(throwError(() => 'error'));
    await expect(service.reset(1)).rejects.toBe('error');
    expect(await getNodes()).toEqual([]);
  });
});
