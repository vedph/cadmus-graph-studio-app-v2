import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RamCacheService } from '../../services/ram-cache.service';

interface CachedTextPickerControls {
  /** The selected preset key, if any (bound to a mat-select). */
  key: string | null;
  /** The key for a new preset. */
  newKey: string;
}

/**
 * Cached text picker. This allows the user to pick a text from a cache
 * by selecting its key, or to add a new text to the cache with the
 * specified key.
 */
@Component({
  selector: 'cadmus-cached-text-picker',
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './cached-text-picker.component.html',
  styleUrls: ['./cached-text-picker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CachedTextPickerComponent {
  /**
   * The cache key prefix to use for this picker.
   */
  public readonly keyPrefix = input<string>();

  /**
   * The text, as set by consumer code. This can be added to the cache
   * with the specified key.
   */
  public readonly text = input<string>();

  /**
   * Emitted whenever a text is picked from the cache.
   */
  public readonly textPick = output<string>();

  public readonly keys = signal<string[]>([]);

  // local state only: nothing here derives from a model
  private readonly _draft = signal<CachedTextPickerControls>({
    key: null,
    newKey: '',
  });

  public readonly form = form(this._draft, (path) => {
    required(path.newKey);
    maxLength(path.newKey, 50);
  });

  constructor(private _cacheService: RamCacheService) {
    effect(() => {
      this.loadKeys(this.keyPrefix());
    });
  }

  private loadKeys(keyPrefix?: string): void {
    this.keys.set(this._cacheService.getKeys(keyPrefix).sort());
  }

  private buildPrefixedKey(key: string): string {
    const prefix = this.keyPrefix() || '';
    return key.startsWith(prefix) ? key : `${prefix}${key}`;
  }

  public pick(): void {
    const key = this.form.key().value();
    if (!key) {
      return;
    }
    const text = this._cacheService.get(this.buildPrefixedKey(key)) as string;
    if (text) {
      this.textPick.emit(text);
    }
  }

  /** True when the text can be added as a preset. */
  public canAdd(): boolean {
    return this.form.newKey().valid() && !!this.text();
  }

  public add(): void {
    if (!this.canAdd() || !this.keyPrefix()) {
      return;
    }
    // keys are listed with their prefix, as they are loaded from the cache
    const key = this.buildPrefixedKey(this.form.newKey().value());
    this._cacheService.add(key, this.text()!);
    if (!this.keys().includes(key)) {
      this.keys.set([...this.keys(), key].sort());
    }
  }

  public remove(): void {
    const key = this.form.key().value();
    if (!key) {
      return;
    }
    const prefixedKey = this.buildPrefixedKey(key);
    this._cacheService.remove(prefixedKey);
    this.keys.set(this.keys().filter((k) => k !== prefixedKey));
    this.form.key().value.set(null);
  }
}
