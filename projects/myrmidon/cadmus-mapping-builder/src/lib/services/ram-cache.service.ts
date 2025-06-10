import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RamCacheService {
  private _cache: { [key: string]: any } = {};

  public add(key: string, value: any): void {
    this._cache[key] = value;
  }

  public has(key: string): boolean {
    return this._cache[key] !== undefined;
  }

  public get(key: string): any | undefined {
    return this._cache[key];
  }

  public remove(key: string): void {
    delete this._cache[key];
  }

  public clear(): void {
    this._cache = {};
  }

  public getKeys(prefix?: string): string[] {
    return prefix
      ? Object.keys(this._cache).filter((k) => k.startsWith(prefix))
      : Object.keys(this._cache);
  }
}
