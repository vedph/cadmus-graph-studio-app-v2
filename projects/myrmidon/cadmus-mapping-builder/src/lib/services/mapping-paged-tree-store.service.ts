import { Injectable } from '@angular/core';
import {
  PagedTreeNode,
  PagedTreeStoreService,
  TreeNode,
  TreeNodeFilter,
} from '@myrmidon/paged-data-browsers';
import { DataPage } from '@myrmidon/ngx-tools';
import { Observable, of } from 'rxjs';

import { RamNodeMappingService } from './ram-node-mapping.service';
import { Mapping, NodeMapping } from '../models';

/**
 * Filter for a MappingTreeNode.
 */
export interface MappingTreeFilter extends TreeNodeFilter {
  name?: string;
}

/**
 * A node representing a mapping in a single mapping tree.
 */
export interface MappingTreeNode extends PagedTreeNode<TreeNodeFilter> {
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
  private _nodes: MappingTreeNode[] = [];

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
    flatNodes: MappingTreeNode[],
    parentId?: number,
    level: number = 0,
    siblingIndex: number = 0
  ): void {
    // Create flat mapping by extracting data without parent and children
    const { children, parent, ...mappingData } = node;

    const flatNode: MappingTreeNode = {
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

    // recursively flatten children
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
  private flattenMapping(nodeMapping: NodeMapping): MappingTreeNode[] {
    const flatNodes: MappingTreeNode[] = [];
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
        resolve(true);
        return;
      }

      this._fetchService.getMapping(mappingId).subscribe({
        next: (mapping) => {
          this._mapping = mapping || undefined;
          this._nodes = this._mapping ? this.flattenMapping(this._mapping) : [];
          resolve(true);
        },
        error: (err) => {
          console.error('Error getting mapping', err);
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
    nodes: MappingTreeNode[],
    filter: MappingTreeFilter
  ): MappingTreeNode[] {
    if (!filter) {
      return nodes;
    }

    let filtered = nodes;

    // name filter
    if (filter.name?.trim()) {
      const name = filter.name.toLowerCase().trim();
      filtered = filtered.filter(
        (node) =>
          node.mapping?.name && node.mapping.name.toLowerCase().includes(name)
      );
    }

    // parentId filter
    if (filter.parentId !== undefined) {
      filtered = filtered.filter((node) => node.parentId === filter.parentId);
    }

    return filtered;
  }

  /**
   * Check if a node has children.
   * @param nodeId The node ID to check.
   * @param nodes The flat nodes array.
   * @returns True if the node has children.
   */
  private hasChildren(nodeId: number, nodes: MappingTreeNode[]): boolean {
    return nodes.some((node) => node.parentId === nodeId);
  }

  /**
   * Get the specified page of nodes.
   * @param filter The filter.
   * @param pageNumber The page number.
   * @param pageSize The page size.
   * @param hasMockRoot If true, the root node is a mock node provided by your
   * service, which implies that its Y value is 0 rather than 1. Default is
   * false, meaning that your service will return a single root node with Y
   * value 1.
   */
  public getNodes(
    filter: MappingTreeFilter,
    pageNumber: number,
    pageSize: number
  ): Observable<DataPage<TreeNode>> {
    // empty if no mapping
    if (!this._mapping) {
      return of({
        pageNumber: 0,
        pageSize: 0,
        pageCount: 0,
        total: 0,
        items: [],
      } as DataPage<TreeNode>);
    }

    // apply filtering
    let filteredNodes = this.applyFilter(this._nodes, filter);

    // update hasChildren property based on filtered results
    filteredNodes = filteredNodes.map((node) => ({
      ...node,
      hasChildren: this.hasChildren(node.id, filteredNodes),
    }));

    // apply paging
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedItems = filteredNodes.slice(startIndex, endIndex);

    const totalCount = filteredNodes.length;
    const pageCount = Math.ceil(totalCount / pageSize);

    return of({
      pageNumber,
      pageSize,
      pageCount,
      total: totalCount,
      items: pagedItems,
    } as DataPage<TreeNode>);
  }
}
