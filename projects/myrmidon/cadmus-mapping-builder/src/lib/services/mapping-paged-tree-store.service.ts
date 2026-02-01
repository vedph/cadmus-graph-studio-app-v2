import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { DataPage } from '@myrmidon/ngx-tools';
import {
  PagedTreeNode,
  PagedTreeStoreService,
  TreeNodeFilter,
} from '@myrmidon/paged-data-browsers';

import { RamNodeMappingService } from './ram-node-mapping.service';
import { Mapping, NodeMapping } from '../models';

/**
 * Filter for a MappingTreeNode.
 */
export interface MappingTreeFilter extends TreeNodeFilter {
  name?: string;
}

/**
 * A node representing a mapping in a single mapping flat tree.
 */
export interface MappingPagedTreeNode extends PagedTreeNode<TreeNodeFilter> {
  mapping?: Mapping;
}

/**
 * Service to get pages of nodes for a specified mapping tree.
 * This service is used to browse the tree of a single mapping,
 * set via reset.
 */
@Injectable({
  providedIn: 'root',
})
export class MappingPagedTreeStoreService
  implements PagedTreeStoreService<MappingTreeFilter>
{
  private _mapping?: NodeMapping;
  private _nodes: MappingPagedTreeNode[] = [];

  constructor(private _fetchService: RamNodeMappingService) {}

  /**
   * Recursively flatten a single node and its children.
   * @param node The node to flatten.
   * @param flatNodes The array to store flattened nodes.
   * @param parentId The parent node ID.
   * @param level The current level in the tree.
   * @param siblingIndex The index among siblings.
   */
  private flattenNode(
    node: NodeMapping,
    flatNodes: MappingPagedTreeNode[],
    parentId?: number,
    level: number = 0,
    siblingIndex: number = 0
  ): void {
    // create flat mapping by extracting data without parent and children
    const { children, parent, ...mappingData } = node;

    const flatNode: MappingPagedTreeNode = {
      id: node.id,
      label: node.name || node.id?.toString() || '',
      y: level + 1,
      x: siblingIndex + 1,
      hasChildren: !!(children && children.length > 0),
      parentId: parentId,
      mapping: mappingData as Mapping,
      paging: {
        pageNumber: 0,
        pageCount: 0,
        total: 0,
      },
    };

    flatNodes.push(flatNode);

    // recursively flatten children with correct sibling indices
    if (children && children.length > 0) {
      children.forEach((child, index) => {
        this.flattenNode(child, flatNodes, node.id, level + 1, index);
      });
    }
  }

  /**
   * Flatten a nested NodeMapping into an array of flat Mapping objects.
   * @param nodeMapping The root node mapping to flatten.
   * @returns Array of flat mapping objects.
   */
  private flattenMapping(nodeMapping: NodeMapping): MappingPagedTreeNode[] {
    const flatNodes: MappingPagedTreeNode[] = [];
    this.flattenNode(nodeMapping, flatNodes, undefined, 0, 0);
    return flatNodes;
  }

  /**
   * Reset the store with a new mapping.
   * If no mapping ID is provided, it clears the current mapping and nodes.
   * @param mappingId The ID of the mapping to set.
   * @returns A Promise that resolves when the reset operation is complete.
   */
  public reset(mappingId?: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!mappingId) {
        this._mapping = undefined;
        this._nodes = [];
        console.log('resetting mapping tree store');
        resolve(true);
        return;
      }

      this._fetchService.getMapping(mappingId).subscribe({
        next: (mapping) => {
          this._mapping = mapping || undefined;
          this._nodes = this._mapping ? this.flattenMapping(this._mapping) : [];
          console.log(
            `mapping tree store reset with mapping ID ${mappingId}`,
            this._mapping
          );
          resolve(true);
        },
        error: (err) => {
          console.error('error getting store mapping', err);
          this._mapping = undefined;
          this._nodes = [];
          reject(err);
        },
      });
    });
  }

  /**
   * Apply filter to the flat nodes array.
   * @param nodes The flat nodes array.
   * @param filter The filter to apply.
   * @returns Filtered array of nodes.
   */
  private applyFilter(
    nodes: MappingPagedTreeNode[],
    filter: MappingTreeFilter
  ): MappingPagedTreeNode[] {
    if (!filter) {
      return nodes;
    }

    let filtered = nodes;

    // filter by parentId first (this is crucial for tree hierarchy)
    if (filter.parentId !== undefined) {
      filtered = filtered.filter((node) => node.parentId === filter.parentId);
    } else {
      // if no parentId specified, get root nodes (parentId is undefined)
      filtered = filtered.filter((node) => node.parentId === undefined);
    }

    // name filter
    if (filter.name?.trim()) {
      const name = filter.name.toLowerCase().trim();
      filtered = filtered.filter(
        (node) =>
          node.mapping?.name && node.mapping.name.toLowerCase().includes(name)
      );
    }

    return filtered;
  }

  /**
   * Get the specified page of nodes.
   * @param filter The filter.
   * @param pageNumber The page number.
   * @param pageSize The page size.
   */
  public getNodes(
    filter: MappingTreeFilter,
    pageNumber: number,
    pageSize: number
  ): Observable<DataPage<MappingPagedTreeNode>> {
    // empty if no mapping
    if (!this._mapping) {
      return of({
        pageNumber: 0,
        pageSize: 0,
        pageCount: 0,
        total: 0,
        items: [],
      } as DataPage<MappingPagedTreeNode>);
    }

    // apply filtering
    let nodes = this.applyFilter(this._nodes, filter);

    // apply paging
    const total = nodes.length;
    const pageCount = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedNodes = nodes.slice(startIndex, endIndex);

    return of({
      pageNumber,
      pageSize,
      pageCount,
      total,
      items: pagedNodes,
    } as DataPage<MappingPagedTreeNode>);
  }
}
