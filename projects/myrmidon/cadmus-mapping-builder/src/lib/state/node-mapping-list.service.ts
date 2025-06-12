import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { DataPage } from '@myrmidon/ngx-tools';
import {
  PagedListStore,
  PagedListStoreService,
} from '@myrmidon/paged-data-browsers';

import {
  NodeMappingService,
  NodeMapping,
  NodeMappingFilter,
  NODE_MAPPING_SERVICE,
} from '../models';

export interface NodeMappingListProps {
  filter: NodeMappingFilter;
}

/**
 * Service to manage a paged list of node mappings (NodeMapping).
 */
@Injectable({ providedIn: 'root' })
export class NodeMappingListService
  implements PagedListStoreService<NodeMappingFilter, NodeMapping>
{
  private _store: PagedListStore<NodeMappingFilter, NodeMapping>;
  private _loading$: BehaviorSubject<boolean | undefined>;

  public get filter$(): Observable<NodeMappingFilter> {
    return this._store.filter$;
  }
  public get page$(): Observable<DataPage<NodeMapping>> {
    return this._store.page$;
  }

  public get loading$(): Observable<boolean | undefined> {
    return this._loading$.asObservable();
  }

  constructor(
    @Inject(NODE_MAPPING_SERVICE)
    private _mappingRepository: NodeMappingService
  ) {
    // create store
    this._store = new PagedListStore<NodeMappingFilter, NodeMapping>(this);
    this._loading$ = new BehaviorSubject<boolean | undefined>(undefined);
    this._store.reset();
  }

  public loadPage(
    pageNumber: number,
    pageSize: number,
    filter: NodeMappingFilter
  ): Observable<DataPage<NodeMapping>> {
    this._loading$.next(true);
    return this._mappingRepository
      .getMappings(filter, pageNumber, pageSize)
      .pipe(
        tap({
          next: () => this._loading$.next(false),
          error: () => this._loading$.next(false),
        })
      );
  }

  public async reset(): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.reset();
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public async setFilter(filter: NodeMappingFilter): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.setFilter(filter);
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public getFilter(): NodeMappingFilter {
    return this._store.getFilter();
  }

  public async setPage(pageNumber: number, pageSize: number): Promise<void> {
    this._loading$.next(true);
    try {
      await this._store.setPage(pageNumber, pageSize);
    } catch (error) {
      throw error;
    } finally {
      this._loading$.next(false);
    }
  }

  public deleteMapping(id: NodeMapping['id']): void {
    this._loading$.next(true);

    this._mappingRepository.deleteMapping(id).subscribe({
      next: (_) => {
        this._loading$.next(false);
        this._store.reset();
      },
      error: (error) => {
        this._loading$.next(false);
        console.error(
          'Error deleting NodeMapping: ' + (error ? JSON.stringify(error) : '')
        );
      },
    });
  }

  public addMapping(entry: NodeMapping): void {
    this._loading$.next(true);

    this._mappingRepository.addMapping(entry).subscribe({
      next: (saved) => {
        this._loading$.next(false);
        this._store.reset();
      },
      error: (error) => {
        this._loading$.next(false);
        console.error(
          'Error saving NodeMapping: ' + (error ? JSON.stringify(error) : '')
        );
      },
    });
  }
}
