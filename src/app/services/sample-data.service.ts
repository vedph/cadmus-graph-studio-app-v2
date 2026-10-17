import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, take } from 'rxjs';

import { EnvService } from '@myrmidon/ngx-tools';

import { AssetService } from './asset.service';

@Injectable({
  providedIn: 'root',
})
export class SampleDataService {
  private _json$: BehaviorSubject<any> = new BehaviorSubject<any>('{}');
  private _presets$: BehaviorSubject<any> = new BehaviorSubject<any>({});
  private readonly _mappings = signal<string | undefined>(undefined);
  private readonly _presets = signal<string | undefined>(undefined);

  /**
   * The currently loaded mappings sample file, if any.
   */
  public readonly mappings = this._mappings.asReadonly();

  /**
   * The currently loaded presets sample file, if any.
   */
  public readonly presets = this._presets.asReadonly();

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

  /**
   * Load the specified samples. Samples already loaded are not reloaded,
   * as reloading the mappings would replace all the edited mappings.
   * @param mappings The mappings sample file.
   * @param presets The presets sample file.
   */
  public load(mappings?: string, presets?: string): void {
    // if no mappings or presets are provided,
    if (!mappings) {
      mappings =
        this._envService.get('presetMappings') || 'person-mappings.json';
    }
    if (!presets) {
      presets = 'person-presets.json';
    }
    if (mappings === this._mappings() && presets === this._presets()) {
      return;
    }

    // load mappings
    if (mappings !== this._mappings()) {
      this._mappings.set(mappings);
      this._assetService
        .loadText(mappings)
        .pipe(take(1))
        .subscribe((json) => {
          this._json$.next(json);
        });
    }
    // load presets
    if (presets !== this._presets()) {
      this._presets.set(presets);
      this._assetService
        .loadObject(presets)
        .pipe(take(1))
        .subscribe((data: any) => {
          this._presets$.next(data);
        });
    }
  }

  /**
   * Reload the default samples.
   */
  public reset(): void {
    this._mappings.set(undefined);
    this._presets.set(undefined);
    this.load(
      this._envService.get('presetMappings') || 'sample-mappings.json',
      'person-presets.json'
    );
  }
}
