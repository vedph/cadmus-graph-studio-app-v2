import { Injectable } from '@angular/core';
import { BehaviorSubject, take } from 'rxjs';

import { EnvService } from '@myrmidon/ngx-tools';

import { AssetService } from './asset.service';

@Injectable({
  providedIn: 'root',
})
export class SampleDataService {
  private _json$: BehaviorSubject<any> = new BehaviorSubject<any>('{}');
  private _presets$: BehaviorSubject<any> = new BehaviorSubject<any>({});

  constructor(
    private _assetService: AssetService,
    private _envService: EnvService
  ) {
    this.reset();
  }

  public get json$() {
    return this._json$.asObservable();
  }

  public get presets$() {
    return this._presets$.asObservable();
  }

  public load(mappings?: string, presets?: string): void {
    console.log('SampleDataService.load', mappings, presets);
    // if no mappings or presets are provided,
    if (!mappings) {
      mappings =
        this._envService.get('presetMappings') || 'person-mappings.json';
    }
    if (!presets) {
      presets = 'person-presets.json';
    }
    // load mappings
    this._assetService
      .loadText(mappings)
      .pipe(take(1))
      .subscribe((json) => {
        this._json$.next(json);
      });
    // load presets
    this._assetService
      .loadObject(presets)
      .pipe(take(1))
      .subscribe((data: any) => {
        this._presets$.next(data);
      });
  }

  public reset(): void {
    this.load(
      this._envService.get('presetMappings') || 'sample-mappings.json',
      'person-presets.json'
    );
  }
}
