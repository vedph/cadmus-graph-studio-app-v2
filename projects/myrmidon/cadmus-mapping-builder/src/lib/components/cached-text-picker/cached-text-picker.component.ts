import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RamCacheService } from '../../services/ram-cache.service';

/**
 * Cached text picker. This allows the user to pick a text from a cache
 * by selecting its key, or to add a new text to the cache with the
 * specified key.
 */
@Component({
  selector: 'cadmus-cached-text-picker',
  imports: [
    ReactiveFormsModule,
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

  public key: FormControl<string | null>;

  public newKey: FormControl<string>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _cacheService: RamCacheService,
  ) {
    this.key = formBuilder.control(null);

    // new key form
    this.newKey = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(50)],
      nonNullable: true,
    });
    this.form = formBuilder.group({
      newKey: this.newKey,
    });

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
    if (!this.key.value) {
      return;
    }
    const text = this._cacheService.get(
      this.buildPrefixedKey(this.key.value),
    ) as string;
    if (text) {
      this.textPick.emit(text);
    }
  }

  public add(): void {
    if (this.form.invalid || !this.text() || !this.keyPrefix()) {
      return;
    }
    // keys are listed with their prefix, as they are loaded from the cache
    const key = this.buildPrefixedKey(this.newKey.value);
    this._cacheService.add(key, this.text()!);
    if (!this.keys().includes(key)) {
      this.keys.set([...this.keys(), key].sort());
    }
  }

  public remove(): void {
    if (!this.key.value) {
      return;
    }
    const key = this.buildPrefixedKey(this.key.value);
    this._cacheService.remove(key);
    this.keys.set(this.keys().filter((k) => k !== key));
    this.key.setValue(null);
  }
}
