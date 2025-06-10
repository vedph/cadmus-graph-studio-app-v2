import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  constructor(private _http: HttpClient) {}

  /**
   * Load a text from the specified path in the shop.
   *
   * @param path The path (relative to the root folder).
   */
  public loadText(path: string): Observable<string> {
    return this._http.get('./' + path, {
      responseType: 'text',
    });
  }

  /**
   * Load an object from a JSON resource.
   *
   * @param path The path (relative to the root folder).
   * @returns The object parsed from the loaded JSON code.
   */
  public loadObject<T>(path: string): Observable<T> {
    return this._http.get<T>('./' + path + '.json');
  }
}
