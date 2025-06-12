import { Injectable } from '@angular/core';
import { PagedTreeStore } from '@myrmidon/paged-data-browsers';

import {
  MappingPagedTreeStoreService,
  MappingTreeFilter,
  MappingPagedTreeNode,
} from '../services/mapping-paged-tree-store.service';

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

  public async reset(mappingId: number): Promise<void> {
    await this._service.reset(mappingId);
    setTimeout(() => {
      this.store.reset();
    }, 0);
  }
}
