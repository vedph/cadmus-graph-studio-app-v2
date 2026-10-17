import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { MappingTreeService } from './mapping-tree.service';
import { NodeMapping } from '../models';
import { RamNodeMappingService } from '../services/ram-node-mapping.service';

function buildTree(): NodeMapping {
  return {
    id: 1,
    name: 'root',
    sourceType: 1,
    source: 'r',
    sid: 's',
    children: [
      { id: 2, parentId: 1, name: 'child', sourceType: 1, source: 'c', sid: '' },
    ],
  };
}

describe('MappingTreeService', () => {
  let service: MappingTreeService;

  const labels = async () =>
    (await firstValueFrom(service.store.nodes$)).map((n) => n.label);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MappingTreeService);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('should start with an empty store', async () => {
    expect(service.store.isEmpty()).toBe(true);
  });

  it('should load the tree of a mapping object', async () => {
    await service.reset(buildTree());
    expect(await labels()).toEqual(['root']);
    await service.store.expand(1);
    expect(await labels()).toEqual(['root', 'child']);
  });

  it('should load the tree of a mapping ID', async () => {
    const ram = TestBed.inject(RamNodeMappingService);
    await firstValueFrom(ram.addMapping(buildTree()));
    await service.reset(1);
    expect(await labels()).toEqual(['root']);
  });

  it('should clear the tree when reset without a mapping', async () => {
    await service.reset(buildTree());
    await service.reset();
    expect(service.store.isEmpty()).toBe(true);
  });
});
