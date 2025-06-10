import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { DataPage } from '@myrmidon/ngx-tools';

import { NodeMappingService, NodeMappingFilter, NodeMapping } from '../models';
import { MappingJsonService } from './mapping-json.service';

/**
 * RAM-based node mappings service. This edits a RAM-based mappings store.
 */
@Injectable({
  providedIn: 'root',
})
export class RamNodeMappingService implements NodeMappingService {
  private readonly _mappings: BehaviorSubject<NodeMapping[]>;

  constructor(private _jsonService: MappingJsonService) {
    this._mappings = new BehaviorSubject<NodeMapping[]>([]);
  }

  private filterMapping(
    mapping: NodeMapping,
    filter: NodeMappingFilter
  ): boolean {
    if (filter.parentId && mapping.parentId !== filter.parentId) {
      return false;
    }
    if (filter.sourceType && mapping.sourceType !== filter.sourceType) {
      return false;
    }
    if (filter.name && !mapping.name.includes(filter.name)) {
      return false;
    }
    if (filter.facet && mapping.facetFilter !== filter.facet) {
      return false;
    }
    if (filter.group && mapping.groupFilter !== filter.group) {
      return false;
    }
    if (
      filter.flags &&
      mapping.flagsFilter &&
      (mapping.flagsFilter & filter.flags) !== filter.flags
    ) {
      return false;
    }
    if (filter.title && !mapping.titleFilter?.includes(filter.title)) {
      return false;
    }
    if (filter.partType && mapping.partTypeFilter !== filter.partType) {
      return false;
    }
    if (filter.partRole && mapping.partRoleFilter !== filter.partRole) {
      return false;
    }
    return true;
  }

  public getMappings(
    filter: NodeMappingFilter,
    pageNumber: number,
    pageSize: number
  ): Observable<DataPage<NodeMapping>> {
    const mappings = this._mappings.value;
    const filtered = mappings.filter((m) => this.filterMapping(m, filter));
    return of({
      pageNumber: pageNumber,
      pageSize: pageSize || filtered.length,
      pageCount: Math.trunc(Math.ceil(filtered.length / pageSize)),
      total: filtered.length,
      items: pageSize
        ? filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
        : filtered,
    });
  }

  public getMapping(id: number): Observable<NodeMapping | null> {
    const mappings = this._mappings.value;
    const mapping = mappings.find((m) => m.id === id);
    return of(mapping || null);
  }

  public addMapping(mapping: NodeMapping): Observable<NodeMapping> {
    const mappings = [...this._mappings.value];
    if (!mapping.id) {
      const id = Math.max(...mappings.map((m) => m.id)) + 1;
      mapping.id = id;
    }
    mappings.push(mapping);
    // sort mappings by name
    mappings.sort((a, b) => a.name.localeCompare(b.name));
    this._mappings.next(mappings);
    return of(mapping);
  }

  public deleteMapping(id: number): Observable<any> {
    const mappings = [...this._mappings.value];
    const index = mappings.findIndex((m) => m.id === id);
    if (index > -1) {
      mappings.splice(index, 1);
      this._mappings.next(mappings);
    }
    return of(null);
  }

  public clear(): Observable<any> {
    this._mappings.next([]);
    return of(null);
  }

  public exportMappings(): Observable<string> {
    const sb: string[] = [];
    sb.push('{"documentMappings":[\n');
    for (let i = 0; i < this._mappings.value.length; i++) {
      if (i) {
        sb.push(',\n');
      }
      sb.push(this._jsonService.serializeMapping(this._mappings.value[i]));
    }
    sb.push(']}');
    const json = sb.join('');
    return of(JSON.stringify(JSON.parse(json), null, 2));
  }

  public importMappings(json: string): Observable<NodeMapping[]> {
    const mappings = this._jsonService.readMappingsDocument(json);
    // sort mappings by name
    mappings.sort((a, b) => a.name.localeCompare(b.name));

    // TODO: remove this once debugged
    const dump = mappings.map((m) => {
      return {
        ...m,
        parent: undefined, // remove parent to avoid circular references
        children: undefined, // remove children to avoid circular references
      };
    });
    console.log('Imported mappings:', dump);

    this._mappings.next(mappings);
    return of(mappings);
  }
}
