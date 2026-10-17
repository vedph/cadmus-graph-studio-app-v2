import { Injectable } from '@angular/core';
import { PagedTreeStore } from '@myrmidon/paged-data-browsers';

import {
  MappingPagedTreeStoreService,
  MappingTreeFilter,
  MappingPagedTreeNode,
} from '../services/mapping-paged-tree-store.service';
import { NodeMapping } from '../models';

/**
 * Wrapper service for a paged tree store. This service is used to
 * persist the state of the mapping tree in the wrapped store.
 */
@Injectable({
  providedIn: 'root',
})
export class MappingTreeService {
  public store: PagedTreeStore<MappingPagedTreeNode, MappingTreeFilter>;

  constructor(private _service: MappingPagedTreeStoreService) {
    this.store = new PagedTreeStore<MappingPagedTreeNode, MappingTreeFilter>(
      _service
    );
  }

  /**
   * Reset the tree to the specified mapping.
   * @param mapping The mapping to display, or the ID of the mapping to
   * fetch from the RAM mappings store; if undefined, the tree is cleared.
   */
  public async reset(mapping?: number | NodeMapping): Promise<void> {
    await this._service.reset(mapping);
    await this.store.reset();
  }
}
