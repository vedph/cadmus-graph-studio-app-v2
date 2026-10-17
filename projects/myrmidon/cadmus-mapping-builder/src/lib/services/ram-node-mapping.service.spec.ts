import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { RamNodeMappingService } from './ram-node-mapping.service';
import { NodeMapping } from '../models';

function mapping(id: number, name: string, extra?: Partial<NodeMapping>) {
  return {
    id,
    name,
    sourceType: 1,
    source: 'src',
    sid: 'sid',
    ...extra,
  } as NodeMapping;
}

describe('RamNodeMappingService', () => {
  let service: RamNodeMappingService;

  const seed = async (...mappings: NodeMapping[]) => {
    for (const m of mappings) {
      await firstValueFrom(service.addMapping(m));
    }
  };

  const getItems = async (filter = {}, pageNumber = 1, pageSize = 0) =>
    (await firstValueFrom(service.getMappings(filter, pageNumber, pageSize)))
      .items;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RamNodeMappingService);
  });

  it('should be created empty', async () => {
    const page = await firstValueFrom(service.getMappings({}, 1, 20));
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
    expect(page.pageCount).toBe(0);
  });

  describe('addMapping', () => {
    it('should assign ID 1 to the first new mapping', async () => {
      const saved = await firstValueFrom(
        service.addMapping(mapping(0, 'first'))
      );
      expect(saved.id).toBe(1);
    });

    it('should assign the next ID to new mappings', async () => {
      await seed(mapping(5, 'five'));
      const saved = await firstValueFrom(service.addMapping(mapping(0, 'new')));
      expect(saved.id).toBe(6);
    });

    it('should set the new parent ID in the children of a new mapping', async () => {
      const child = mapping(10, 'child', { parentId: 0 });
      const saved = await firstValueFrom(
        service.addMapping(mapping(0, 'root', { children: [child] }))
      );
      expect(child.parentId).toBe(saved.id);
    });

    it('should replace an existing mapping with the same ID', async () => {
      await seed(mapping(1, 'old'), mapping(2, 'other'));
      await seed(mapping(1, 'renamed'));
      const items = await getItems();
      expect(items.length).toBe(2);
      expect(items.find((m) => m.id === 1)!.name).toBe('renamed');
    });

    it('should keep mappings sorted by name', async () => {
      await seed(mapping(1, 'charlie'), mapping(2, 'alpha'), mapping(3, 'bravo'));
      expect((await getItems()).map((m) => m.name)).toEqual([
        'alpha',
        'bravo',
        'charlie',
      ]);
    });
  });

  describe('getMapping', () => {
    it('should get an existing mapping', async () => {
      await seed(mapping(1, 'one'));
      expect((await firstValueFrom(service.getMapping(1)))!.name).toBe('one');
    });

    it('should return null for a missing mapping', async () => {
      expect(await firstValueFrom(service.getMapping(99))).toBeNull();
    });
  });

  describe('getMappings', () => {
    it('should page results', async () => {
      await seed(
        mapping(1, 'a'),
        mapping(2, 'b'),
        mapping(3, 'c'),
        mapping(4, 'd'),
        mapping(5, 'e')
      );
      const page = await firstValueFrom(service.getMappings({}, 2, 2));
      expect(page.pageNumber).toBe(2);
      expect(page.pageSize).toBe(2);
      expect(page.pageCount).toBe(3);
      expect(page.total).toBe(5);
      expect(page.items.map((m) => m.name)).toEqual(['c', 'd']);
    });

    it('should return all the items in a single page when page size is 0', async () => {
      await seed(mapping(1, 'a'), mapping(2, 'b'));
      const page = await firstValueFrom(service.getMappings({}, 1, 0));
      expect(page.pageSize).toBe(2);
      expect(page.pageCount).toBe(1);
      expect(page.items.length).toBe(2);
    });

    it('should filter by parent ID', async () => {
      await seed(mapping(1, 'a', { parentId: 7 }), mapping(2, 'b'));
      expect((await getItems({ parentId: 7 })).map((m) => m.id)).toEqual([1]);
    });

    it('should filter by source type', async () => {
      await seed(mapping(1, 'a', { sourceType: 2 }), mapping(2, 'b'));
      expect((await getItems({ sourceType: 2 })).map((m) => m.id)).toEqual([1]);
    });

    it('should filter by name substring', async () => {
      await seed(mapping(1, 'person_birth'), mapping(2, 'event'));
      expect((await getItems({ name: 'birth' })).map((m) => m.id)).toEqual([1]);
    });

    it('should filter by facet, group, part type and role', async () => {
      await seed(
        mapping(1, 'a', {
          facetFilter: 'f',
          groupFilter: 'g',
          partTypeFilter: 'pt',
          partRoleFilter: 'pr',
        }),
        mapping(2, 'b')
      );
      expect((await getItems({ facet: 'f' })).map((m) => m.id)).toEqual([1]);
      expect((await getItems({ group: 'g' })).map((m) => m.id)).toEqual([1]);
      expect((await getItems({ partType: 'pt' })).map((m) => m.id)).toEqual([
        1,
      ]);
      expect((await getItems({ partRole: 'pr' })).map((m) => m.id)).toEqual([
        1,
      ]);
      expect(await getItems({ facet: 'x' })).toEqual([]);
    });

    it('should filter by title substring', async () => {
      await seed(
        mapping(1, 'a', { titleFilter: 'Petrarch letters' }),
        mapping(2, 'b')
      );
      expect((await getItems({ title: 'letters' })).map((m) => m.id)).toEqual([
        1,
      ]);
    });

    it('should filter by flags, requiring all of them', async () => {
      await seed(
        mapping(1, 'a', { flagsFilter: 3 }),
        mapping(2, 'b', { flagsFilter: 1 })
      );
      expect((await getItems({ flags: 3 })).map((m) => m.id)).toEqual([1]);
      expect((await getItems({ flags: 1 })).map((m) => m.id)).toEqual([1, 2]);
    });
  });

  describe('deleteMapping', () => {
    it('should delete an existing mapping', async () => {
      await seed(mapping(1, 'a'), mapping(2, 'b'));
      await firstValueFrom(service.deleteMapping(1));
      expect((await getItems()).map((m) => m.id)).toEqual([2]);
    });

    it('should ignore a missing mapping', async () => {
      await seed(mapping(1, 'a'));
      await firstValueFrom(service.deleteMapping(99));
      expect((await getItems()).length).toBe(1);
    });
  });

  it('should clear all the mappings', async () => {
    await seed(mapping(1, 'a'), mapping(2, 'b'));
    await firstValueFrom(service.clear());
    expect(await getItems()).toEqual([]);
  });

  describe('import/export', () => {
    const doc = {
      documentMappings: [
        {
          name: 'zeta',
          sourceType: 1,
          source: 'z',
          sid: 'z-sid',
          children: [{ name: 'zeta_child', source: 'c' }],
        },
        { name: 'alpha', sourceType: 2, source: 'a', sid: 'a-sid' },
      ],
    };

    it('should import mappings sorted by name, replacing existing ones', async () => {
      await seed(mapping(100, 'old'));
      const imported = await firstValueFrom(
        service.importMappings(JSON.stringify(doc))
      );
      expect(imported.map((m) => m.name)).toEqual(['alpha', 'zeta']);
      expect((await getItems()).map((m) => m.name)).toEqual(['alpha', 'zeta']);
    });

    it('should export mappings as a prettified document', async () => {
      await firstValueFrom(service.importMappings(JSON.stringify(doc)));
      const json = await firstValueFrom(service.exportMappings());
      expect(json).toContain('\n  "documentMappings": [');
      const exported = JSON.parse(json);
      expect(exported.documentMappings.map((m: any) => m.name)).toEqual([
        'alpha',
        'zeta',
      ]);
      expect(exported.documentMappings[1].children[0].name).toBe('zeta_child');
    });

    it('should export an empty document', async () => {
      const json = await firstValueFrom(service.exportMappings());
      expect(JSON.parse(json)).toEqual({ documentMappings: [] });
    });

    it('should round-trip export and import', async () => {
      await firstValueFrom(service.importMappings(JSON.stringify(doc)));
      const json = await firstValueFrom(service.exportMappings());
      const reimported = await firstValueFrom(service.importMappings(json));
      expect(reimported.map((m) => m.name)).toEqual(['alpha', 'zeta']);
      expect(reimported[1].children![0].parentId).toBe(reimported[1].id);
    });
  });
});
