import { TestBed } from '@angular/core/testing';

import { MappingJsonService } from './mapping-json.service';
import { NodeMapping } from '../models';

describe('MappingJsonService', () => {
  let service: MappingJsonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MappingJsonService);
  });

  function collectAllIds(mapping: NodeMapping): number[] {
    const ids: number[] = [];
    service.visitMappings(mapping, false, (m) => {
      if (m.id) {
        ids.push(m.id);
      }
      return true;
    });
    return ids;
  }

  function hasDuplicateIds(ids: number[]): boolean {
    const seen = new Set<number>();
    for (const id of ids) {
      if (seen.has(id)) {
        return true;
      }
      seen.add(id);
    }
    return false;
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('readMappingsDocument', () => {
    it('should read simple document mapping without named mappings', () => {
      const json = JSON.stringify({
        documentMappings: [
          {
            name: 'simple_mapping',
            sourceType: 1,
            source: 'test',
            sid: 'test-sid',
            output: {
              triples: ['test:subject test:predicate "test object"'],
            },
          },
        ],
      });

      const result = service.readMappingsDocument(json);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('simple_mapping');
      expect(result[0].sourceType).toBe(1);
      expect(result[0].source).toBe('test');
      expect(result[0].sid).toBe('test-sid');
      expect(result[0].id).toBeDefined();
      expect(result[0].output?.triples?.length).toBe(1);
      expect(result[0].output?.triples![0].s).toBe('test:subject');
      expect(result[0].output?.triples![0].p).toBe('test:predicate');
      expect(result[0].output?.triples![0].ol).toBe('"test object"');
    });

    it('should read document mapping with child but no named mappings', () => {
      const json = JSON.stringify({
        documentMappings: [
          {
            name: 'parent_mapping',
            sourceType: 1,
            source: 'parent',
            sid: 'parent-sid',
            children: [
              {
                name: 'child_mapping',
                sourceType: 2,
                source: 'child',
                sid: 'child-sid',
                output: {
                  triples: ['child:subject child:predicate "child object"'],
                },
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('parent_mapping');
      expect(result[0].children?.length).toBe(1);

      const child = result[0].children![0];
      expect(child.name).toBe('child_mapping');
      expect(child.parentId).toBe(result[0].id);
      expect(child.parent).toBe(result[0]);
      expect(child.output?.triples?.length).toBe(1);
    });

    it('should resolve simple named mapping reference', () => {
      const json = JSON.stringify({
        namedMappings: {
          test_template: {
            name: 'test_template',
            source: 'template_source',
            sid: 'template-sid',
            output: {
              triples: [
                'template:subject template:predicate "template object"',
              ],
            },
          },
        },
        documentMappings: [
          {
            name: 'main_mapping',
            sourceType: 1,
            source: 'main',
            sid: 'main-sid',
            children: [
              {
                name: 'test_template',
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('main_mapping');
      expect(result[0].children?.length).toBe(1);

      const child = result[0].children![0];
      expect(child.name).toBe('test_template');
      expect(child.source).toBe('template_source');
      expect(child.sid).toBe('template-sid');
      expect(child.parentId).toBe(result[0].id);
      expect(child.parent).toBe(result[0]);
      expect(child.output?.triples?.length).toBe(1);
      expect(child.output?.triples![0].s).toBe('template:subject');
    });

    it('should resolve nested named mapping references', () => {
      const json = JSON.stringify({
        namedMappings: {
          leaf_template: {
            name: 'leaf_template',
            source: 'leaf_source',
            sid: 'leaf-sid',
            output: {
              triples: ['leaf:subject leaf:predicate "leaf object"'],
            },
          },
          branch_template: {
            name: 'branch_template',
            source: 'branch_source',
            sid: 'branch-sid',
            children: [
              {
                name: 'leaf_template',
              },
            ],
          },
        },
        documentMappings: [
          {
            name: 'root_mapping',
            sourceType: 1,
            source: 'root',
            sid: 'root-sid',
            children: [
              {
                name: 'branch_template',
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('root_mapping');
      expect(result[0].children?.length).toBe(1);

      const branch = result[0].children![0];
      expect(branch.name).toBe('branch_template');
      expect(branch.source).toBe('branch_source');
      expect(branch.parentId).toBe(result[0].id);
      expect(branch.children?.length).toBe(1);

      const leaf = branch.children![0];
      expect(leaf.name).toBe('leaf_template');
      expect(leaf.source).toBe('leaf_source');
      expect(leaf.parentId).toBe(branch.id);
      expect(leaf.parent).toBe(branch);
      expect(leaf.output?.triples?.length).toBe(1);
    });

    it('should handle multiple references to same named mapping', () => {
      const json = JSON.stringify({
        namedMappings: {
          shared_template: {
            name: 'shared_template',
            source: 'shared_source',
            sid: 'shared-sid',
            output: {
              triples: ['shared:subject shared:predicate "shared object"'],
            },
          },
        },
        documentMappings: [
          {
            name: 'main_mapping',
            sourceType: 1,
            source: 'main',
            sid: 'main-sid',
            children: [
              {
                name: 'shared_template',
              },
              {
                name: 'shared_template',
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);

      expect(result.length).toBe(1);
      expect(result[0].children?.length).toBe(2);

      const child1 = result[0].children![0];
      const child2 = result[0].children![1];

      // both should be expanded from the same template
      expect(child1.name).toBe('shared_template');
      expect(child2.name).toBe('shared_template');
      expect(child1.source).toBe('shared_source');
      expect(child2.source).toBe('shared_source');

      // but they should have different IDs
      expect(child1.id).not.toBe(child2.id);
      expect(child1.parentId).toBe(result[0].id);
      expect(child2.parentId).toBe(result[0].id);
    });

    it('should distinguish between named references and regular children with same name', () => {
      const json = JSON.stringify({
        namedMappings: {
          template_name: {
            name: 'template_name',
            source: 'template_source',
            sid: 'template-sid',
            output: {
              triples: [
                'template:subject template:predicate "template object"',
              ],
            },
          },
        },
        documentMappings: [
          {
            name: 'main_mapping',
            sourceType: 1,
            source: 'main',
            sid: 'main-sid',
            children: [
              {
                name: 'template_name', // This is a reference (no source)
              },
              {
                name: 'template_name', // This is NOT a reference (has source)
                source: 'different_source',
                sid: 'different-sid',
                output: {
                  triples: [
                    'different:subject different:predicate "different object"',
                  ],
                },
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);

      expect(result.length).toBe(1);
      expect(result[0].children?.length).toBe(2);

      const reference = result[0].children![0];
      const regularChild = result[0].children![1];

      // the reference should be expanded from template
      expect(reference.source).toBe('template_source');
      expect(reference.output?.triples![0].s).toBe('template:subject');

      // the regular child should keep its own properties
      expect(regularChild.source).toBe('different_source');
      expect(regularChild.output?.triples![0].s).toBe('different:subject');
    });

    it('should handle complex nodes and triples in named mappings', () => {
      const json = JSON.stringify({
        namedMappings: {
          complex_template: {
            name: 'complex_template',
            source: 'complex_source',
            sid: 'complex-sid',
            output: {
              nodes: {
                node1: 'uri1 [label1|tag1]',
                node2: 'uri2 [label2]',
                node3: 'uri3',
              },
              triples: [
                'subj1 pred1 obj1',
                'subj2 pred2 "literal"',
                'subj3 pred3 "literal"@en',
              ],
              metadata: {
                key1: 'value1',
                key2: 'value2',
              },
            },
          },
        },
        documentMappings: [
          {
            name: 'main_mapping',
            sourceType: 1,
            source: 'main',
            sid: 'main-sid',
            children: [
              {
                name: 'complex_template',
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);

      expect(result.length).toBe(1);
      const child = result[0].children![0];

      // check nodes parsing
      expect(child.output?.nodes).toBeDefined();
      expect(Object.keys(child.output!.nodes!).length).toBe(3);
      expect(child.output!.nodes!['node1'].uid).toBe('uri1');
      expect(child.output!.nodes!['node1'].label).toBe('label1');
      expect(child.output!.nodes!['node1'].tag).toBe('tag1');
      expect(child.output!.nodes!['node2'].uid).toBe('uri2');
      expect(child.output!.nodes!['node2'].label).toBe('label2');
      expect(child.output!.nodes!['node2'].tag).toBeUndefined();
      expect(child.output!.nodes!['node3'].uid).toBe('uri3');

      // check triples parsing
      expect(child.output?.triples?.length).toBe(3);
      expect(child.output!.triples![0].s).toBe('subj1');
      expect(child.output!.triples![0].p).toBe('pred1');
      expect(child.output!.triples![0].o).toBe('obj1');
      expect(child.output!.triples![1].ol).toBe('"literal"');
      expect(child.output!.triples![2].ol).toBe('"literal"@en');

      // check metadata
      expect(child.output?.metadata).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('should handle empty document', () => {
      const json = JSON.stringify({
        documentMappings: [],
      });

      const result = service.readMappingsDocument(json);
      expect(result.length).toBe(0);
    });

    it('should handle missing namedMappings section', () => {
      const json = JSON.stringify({
        documentMappings: [
          {
            name: 'simple_mapping',
            sourceType: 1,
            source: 'test',
            sid: 'test-sid',
          },
        ],
      });

      const result = service.readMappingsDocument(json);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('simple_mapping');
    });
  });

  describe('ID Assignment and Uniqueness', () => {

    it('should assign unique IDs to all mappings in a simple document', () => {
      const json = JSON.stringify({
        documentMappings: [
          {
            name: 'root_mapping',
            sourceType: 1,
            source: 'root',
            sid: 'root-sid',
            children: [
              {
                name: 'child1',
                sourceType: 2,
                source: 'child1',
                sid: 'child1-sid',
              },
              {
                name: 'child2',
                sourceType: 2,
                source: 'child2',
                sid: 'child2-sid',
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);
      const allIds = collectAllIds(result[0]);

      expect(allIds.length).toBe(3); // root + 2 children
      expect(hasDuplicateIds(allIds)).toBe(false);
      expect(result[0].id).toBeDefined();
      expect(result[0].children![0].id).toBeDefined();
      expect(result[0].children![1].id).toBeDefined();
    });

    it('should assign unique IDs when expanding named mapping references', () => {
      const json = JSON.stringify({
        namedMappings: {
          shared_template: {
            name: 'shared_template',
            source: 'shared_source',
            sid: 'shared-sid',
            children: [
              {
                name: 'template_child',
                source: 'template_child_source',
                sid: 'template-child-sid',
              },
            ],
          },
        },
        documentMappings: [
          {
            name: 'root_mapping',
            sourceType: 1,
            source: 'root',
            sid: 'root-sid',
            children: [
              {
                name: 'shared_template', // Reference 1
              },
              {
                name: 'shared_template', // Reference 2
              },
              {
                name: 'regular_child',
                source: 'regular_source',
                sid: 'regular-sid',
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);
      const allIds = collectAllIds(result[0]);

      // Should have: root + 2 expanded templates (each with 1 child) + 1 regular child = 6 total
      expect(allIds.length).toBe(6);
      expect(hasDuplicateIds(allIds)).toBe(false);

      // Verify structure
      expect(result[0].children!.length).toBe(3);
      expect(result[0].children![0].name).toBe('shared_template');
      expect(result[0].children![1].name).toBe('shared_template');
      expect(result[0].children![2].name).toBe('regular_child');

      // The two shared template references should have different IDs
      expect(result[0].children![0].id).not.toBe(result[0].children![1].id);

      // Their children should also have different IDs
      expect(result[0].children![0].children![0].id).not.toBe(
        result[0].children![1].children![0].id
      );
    });

    it('should assign unique IDs in nested named mapping references', () => {
      const json = JSON.stringify({
        namedMappings: {
          leaf_template: {
            name: 'leaf_template',
            source: 'leaf_source',
            sid: 'leaf-sid',
          },
          branch_template: {
            name: 'branch_template',
            source: 'branch_source',
            sid: 'branch-sid',
            children: [
              {
                name: 'leaf_template', // Reference to leaf_template
              },
              {
                name: 'leaf_template', // Another reference to leaf_template
              },
            ],
          },
        },
        documentMappings: [
          {
            name: 'root_mapping',
            sourceType: 1,
            source: 'root',
            sid: 'root-sid',
            children: [
              {
                name: 'branch_template', // This will expand to include 2 leaf references
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);
      const allIds = collectAllIds(result[0]);

      // Should have: root + branch + 2 expanded leaf templates = 4 total
      expect(allIds.length).toBe(4);
      expect(hasDuplicateIds(allIds)).toBe(false);

      const branch = result[0].children![0];
      expect(branch.name).toBe('branch_template');
      expect(branch.children!.length).toBe(2);

      // The two leaf references should have different IDs
      expect(branch.children![0].id).not.toBe(branch.children![1].id);
      expect(branch.children![0].name).toBe('leaf_template');
      expect(branch.children![1].name).toBe('leaf_template');
    });

    it('should maintain unique IDs across multiple document mappings', () => {
      const json = JSON.stringify({
        namedMappings: {
          common_template: {
            name: 'common_template',
            source: 'common_source',
            sid: 'common-sid',
          },
        },
        documentMappings: [
          {
            name: 'doc1_mapping',
            sourceType: 1,
            source: 'doc1',
            sid: 'doc1-sid',
            children: [
              {
                name: 'common_template',
              },
            ],
          },
          {
            name: 'doc2_mapping',
            sourceType: 1,
            source: 'doc2',
            sid: 'doc2-sid',
            children: [
              {
                name: 'common_template',
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);

      const allIdsDoc1 = collectAllIds(result[0]);
      const allIdsDoc2 = collectAllIds(result[1]);
      const combinedIds = [...allIdsDoc1, ...allIdsDoc2];

      expect(hasDuplicateIds(combinedIds)).toBe(false);
      expect(result[0].id).not.toBe(result[1].id);
      expect(result[0].children![0].id).not.toBe(result[1].children![0].id);
    });

    it('should handle pre-existing IDs and not create duplicates', () => {
      const json = JSON.stringify({
        documentMappings: [
          {
            id: 100, // Pre-existing ID
            name: 'root_mapping',
            sourceType: 1,
            source: 'root',
            sid: 'root-sid',
            children: [
              {
                // No ID specified, should get assigned one
                name: 'child1',
                sourceType: 2,
                source: 'child1',
                sid: 'child1-sid',
              },
              {
                id: 200, // Another pre-existing ID
                name: 'child2',
                sourceType: 2,
                source: 'child2',
                sid: 'child2-sid',
              },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);
      const allIds = collectAllIds(result[0]);

      expect(allIds.length).toBe(3);
      expect(hasDuplicateIds(allIds)).toBe(false);
      expect(result[0].id).toBe(100);
      expect(result[0].children![1].id).toBe(200);
      expect(result[0].children![0].id).toBeDefined();
      expect(result[0].children![0].id).not.toBe(100);
      expect(result[0].children![0].id).not.toBe(200);
    });

    it('should not assign IDs colliding with low pre-existing IDs', () => {
      const json = JSON.stringify({
        namedMappings: {
          tpl: { name: 'tpl', source: 'tpl', sid: 'tpl-sid' },
        },
        documentMappings: [
          {
            id: 1,
            name: 'root',
            sourceType: 1,
            source: 'root',
            sid: 'root-sid',
            children: [
              { id: 2, name: 'explicit', source: 'x' },
              { name: 'implicit', source: 'y' },
              { name: 'tpl' },
            ],
          },
        ],
      });

      const result = service.readMappingsDocument(json);
      const allIds = collectAllIds(result[0]);

      expect(allIds.length).toBe(4);
      expect(hasDuplicateIds(allIds)).toBe(false);
      expect(result[0].id).toBe(1);
      expect(result[0].children![0].id).toBe(2);
    });

    it('should keep the next ID above the document IDs', () => {
      service.readMappingsDocument(
        JSON.stringify({
          documentMappings: [
            {
              id: 5,
              name: 'root',
              sourceType: 1,
              source: 'r',
              sid: 's',
              children: [{ id: 9, name: 'c', source: 'c' }],
            },
          ],
        })
      );
      expect(service.getNextId()).toBe(10);
    });

    it('should continue numbering when not resetting IDs', () => {
      const json = JSON.stringify({
        documentMappings: [{ name: 'a', sourceType: 1, source: 'a', sid: 'a' }],
      });
      const first = service.readMappingsDocument(json);
      const second = service.readMappingsDocument(json, false);
      expect(first[0].id).toBe(1);
      expect(second[0].id).toBe(2);
      // reset restarts from 1
      expect(service.readMappingsDocument(json)[0].id).toBe(1);
    });
  });

  describe('readMappingsDocument output parsing', () => {
    it('should parse nodes with label and tag', () => {
      const result = service.readMappingsDocument(
        JSON.stringify({
          documentMappings: [
            {
              name: 'm',
              sourceType: 1,
              source: 's',
              sid: 'sid',
              output: {
                nodes: {
                  plain: 'x:plain',
                  labeled: 'x:labeled [Label]',
                  tagged: 'x:tagged [Label|tag]',
                  tagOnly: 'x:tag-only [|tag]',
                  bracketed: 'x:{@a[0]} [L]',
                },
                metadata: { k: 'v' },
              },
            },
          ],
        })
      );
      const nodes = result[0].output!.nodes!;
      expect(nodes['plain']).toEqual({
        uid: 'x:plain',
        label: undefined,
        tag: undefined,
      });
      expect(nodes['labeled']).toEqual({
        uid: 'x:labeled',
        label: 'Label',
        tag: undefined,
      });
      expect(nodes['tagged']).toEqual({
        uid: 'x:tagged',
        label: 'Label',
        tag: 'tag',
      });
      expect(nodes['tagOnly']).toEqual({
        uid: 'x:tag-only',
        label: undefined,
        tag: 'tag',
      });
      expect(nodes['bracketed']).toEqual({
        uid: 'x:{@a[0]}',
        label: 'L',
        tag: undefined,
      });
      expect(result[0].output!.metadata).toEqual({ k: 'v' });
    });

    it('should parse entity and literal triples', () => {
      const result = service.readMappingsDocument(
        JSON.stringify({
          documentMappings: [
            {
              name: 'm',
              sourceType: 1,
              source: 's',
              sid: 'sid',
              output: {
                triples: [
                  '{?a} a crm:E21_Person',
                  '{?a} crm:P3_has_note "a note with spaces"@en',
                ],
              },
            },
          ],
        })
      );
      expect(result[0].output!.triples).toEqual([
        { s: '{?a}', p: 'a', o: 'crm:E21_Person' },
        { s: '{?a}', p: 'crm:P3_has_note', ol: '"a note with spaces"@en' },
      ]);
    });

    it('should throw on an invalid triple', () => {
      expect(() =>
        service.readMappingsDocument(
          JSON.stringify({
            documentMappings: [
              {
                name: 'm',
                sourceType: 1,
                source: 's',
                sid: 'sid',
                output: { triples: ['only-two tokens'] },
              },
            ],
          })
        )
      ).toThrowError(/Invalid triple format/);
    });

    it('should default missing source type, source and SID', () => {
      const result = service.readMappingsDocument(
        JSON.stringify({ documentMappings: [{ name: 'bare' }] })
      );
      expect(result[0].sourceType).toBe(0);
      expect(result[0].source).toBe('');
      expect(result[0].sid).toBe('');
      expect(result[0].output).toBeUndefined();
    });
  });

  describe('serializeMapping', () => {
    const buildMapping = (): NodeMapping => ({
      id: 3,
      parentId: 1,
      ordinal: 2,
      name: 'person',
      sourceType: 2,
      facetFilter: 'person',
      groupFilter: 'g',
      flagsFilter: 4,
      titleFilter: 't',
      partTypeFilter: 'it.vedph.events',
      partRoleFilter: 'r',
      description: 'd',
      source: 'events',
      sid: '{$part-id}',
      scalarPattern: '^x',
      output: {
        nodes: {
          plain: { uid: 'x:plain', label: '' },
          labeled: { uid: 'x:labeled', label: 'Label' },
          tagged: { uid: 'x:tagged', label: 'Label', tag: 'tag' },
          tagOnly: { uid: 'x:tag-only', label: '', tag: 'tag' },
        },
        triples: [
          { s: '{?a}', p: 'a', o: 'crm:E21_Person' },
          { s: '{?a}', p: 'crm:P3_has_note', ol: '"quoted"' },
          { s: '{?a}', p: 'crm:P3_has_note', ol: 'unquoted' },
          { s: '{?a}', p: 'crm:P3_has_note' },
        ],
        metadata: { key: 'value' },
      },
      children: [{ id: 4, parentId: 3, name: 'child', sourceType: 2, source: 'c', sid: '' }],
    });

    it('should serialize all the properties in compact format', () => {
      const obj = JSON.parse(service.serializeMapping(buildMapping()));
      expect(obj.id).toBe(3);
      expect(obj.parentId).toBe(1);
      expect(obj.ordinal).toBe(2);
      expect(obj.name).toBe('person');
      expect(obj.sourceType).toBe(2);
      expect(obj.facetFilter).toBe('person');
      expect(obj.groupFilter).toBe('g');
      expect(obj.flagsFilter).toBe(4);
      expect(obj.titleFilter).toBe('t');
      expect(obj.partTypeFilter).toBe('it.vedph.events');
      expect(obj.partRoleFilter).toBe('r');
      expect(obj.description).toBe('d');
      expect(obj.source).toBe('events');
      expect(obj.sid).toBe('{$part-id}');
      expect(obj.scalarPattern).toBe('^x');
      expect(obj.output.nodes).toEqual({
        plain: 'x:plain',
        labeled: 'x:labeled [Label]',
        tagged: 'x:tagged [Label|tag]',
        tagOnly: 'x:tag-only [|tag]',
      });
      expect(obj.output.triples).toEqual([
        '{?a} a crm:E21_Person',
        '{?a} crm:P3_has_note "quoted"',
        '{?a} crm:P3_has_note "unquoted"',
        '{?a} crm:P3_has_note ""',
      ]);
      expect(obj.output.metadata).toEqual({ key: 'value' });
      expect(obj.children.length).toBe(1);
      expect(obj.children[0].id).toBe(4);
      expect(obj.children[0].parentId).toBe(3);
    });

    it('should drop IDs when requested', () => {
      const obj = JSON.parse(service.serializeMapping(buildMapping(), true));
      expect(obj.id).toBeUndefined();
      expect(obj.parentId).toBeUndefined();
      expect(obj.children[0].id).toBeUndefined();
      expect(obj.children[0].parentId).toBeUndefined();
    });

    it('should omit an empty output', () => {
      const obj = JSON.parse(
        service.serializeMapping({
          id: 1,
          name: 'm',
          sourceType: 1,
          source: 's',
          sid: 'sid',
          output: {},
        })
      );
      expect(obj.output).toBeUndefined();
      expect(obj.children).toBeUndefined();
    });

    it('should round-trip through readMappingsDocument', () => {
      const original = buildMapping();
      original.parentId = undefined;
      const json = `{"documentMappings":[${service.serializeMapping(original)}]}`;
      const read = service.readMappingsDocument(json)[0];

      expect(read.name).toBe(original.name);
      expect(read.output!.nodes!['tagged']).toEqual({
        uid: 'x:tagged',
        label: 'Label',
        tag: 'tag',
      });
      expect(read.output!.nodes!['tagOnly']).toEqual({
        uid: 'x:tag-only',
        label: undefined,
        tag: 'tag',
      });
      expect(read.output!.triples![1]).toEqual({
        s: '{?a}',
        p: 'crm:P3_has_note',
        ol: '"quoted"',
      });
      expect(read.children![0].parent).toBe(read);
    });
  });

  describe('visitMappings', () => {
    const buildTree = (): NodeMapping => ({
      id: 0,
      name: 'root',
      sourceType: 1,
      source: 'r',
      sid: 's',
      children: [
        {
          id: 0,
          name: 'a',
          sourceType: 1,
          source: 'a',
          sid: '',
          children: [{ id: 0, name: 'a1', sourceType: 1, source: 'a1', sid: '' }],
        },
        { id: 0, name: 'b', sourceType: 1, source: 'b', sid: '' },
      ],
    });

    it('should do nothing for a null mapping', () => {
      const visitor = vi.fn().mockReturnValue(true);
      service.visitMappings(null, true, visitor);
      expect(visitor).not.toHaveBeenCalled();
    });

    it('should visit all the mappings depth-first', () => {
      const names: string[] = [];
      service.visitMappings(buildTree(), false, (m) => {
        names.push(m.name);
        return true;
      });
      expect(names).toEqual(['root', 'a', 'a1', 'b']);
    });

    it('should hydrate IDs and parents', () => {
      const root = buildTree();
      service.visitMappings(root);
      const a = root.children![0];
      expect(root.id).toBeTruthy();
      expect(a.parentId).toBe(root.id);
      expect(a.parent).toBe(root);
      expect(a.children![0].parent).toBe(a);
      const ids = collectAllIds(root);
      expect(hasDuplicateIds(ids)).toBe(false);
    });

    it('should not hydrate when not requested', () => {
      const root = buildTree();
      service.visitMappings(root, false);
      expect(root.id).toBe(0);
      expect(root.children![0].parent).toBeUndefined();
    });

    it('should skip descendants when the visitor returns false', () => {
      const names: string[] = [];
      service.visitMappings(buildTree(), false, (m) => {
        names.push(m.name);
        return m.name !== 'a';
      });
      expect(names).toEqual(['root', 'a', 'b']);
    });
  });

  describe('getNextId', () => {
    it('should return increasing IDs', () => {
      const a = service.getNextId();
      const b = service.getNextId();
      expect(b).toBe(a + 1);
    });
  });
});
