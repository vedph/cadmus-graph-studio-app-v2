import { TestBed } from '@angular/core/testing';

import { MappingJsonService } from './mapping-json.service';
import { NodeMapping } from '../models';

describe('MappingJsonService', () => {
  let service: MappingJsonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MappingJsonService);
  });

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
  });
});
