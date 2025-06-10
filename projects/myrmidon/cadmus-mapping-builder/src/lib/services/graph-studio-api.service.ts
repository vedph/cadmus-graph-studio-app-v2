import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  EnvService,
  ErrorService,
  ErrorWrapper,
  deepCopy,
} from '@myrmidon/ngx-tools';

import { GraphSet, NodeMapping } from '../models';
import { MappingJsonService } from './mapping-json.service';

export interface NodeMappingMetadata {
  itemId?: string;
  partId?: string;
  partTypeId?: string;
  roleId?: string;
  facetId?: string;
  itemTitle?: string;
  itemUri?: string;
  itemLabel?: string;
  itemEid?: string;
  metadataPid?: string;
  groupId?: string;
  flags?: number;
}

@Injectable({
  providedIn: 'root',
})
export class GraphStudioApiService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService,
    private _mappingJsonService: MappingJsonService
  ) {}

  public runMappings(
    source: string,
    mappings: NodeMapping[],
    metadata?: NodeMappingMetadata
  ): Observable<ErrorWrapper<GraphSet>> {
    const url = this._env.get('apiUrl') + 'mappings/run';
    // remove references, make a copy and restore them
    for (let i = 0; i < mappings.length; i++) {
      this._mappingJsonService.visitMappings(mappings[i], false, (m) => {
        m.parent = undefined;
        return true;
      });
    }
    const txMappings = deepCopy(mappings);
    for (let i = 0; i < mappings.length; i++) {
      this._mappingJsonService.visitMappings(mappings[i], true);
    }

    return this._http
      .post<ErrorWrapper<GraphSet>>(
        url,
        Object.assign(metadata || {}, { source: source, mappings: txMappings })
      )
      .pipe(catchError(this._error.handleError));
  }

  public jmesTransform(
    json: string,
    expression: string
  ): Observable<ErrorWrapper<string>> {
    const url = this._env.get('apiUrl') + 'jmes/transform';
    return this._http
      .post<ErrorWrapper<string>>(url, {
        json: json,
        expression: expression,
      })
      .pipe(catchError(this._error.handleError));
  }
}
