import {
  ChangeDetectionStrategy,
  Component,
  effect,
  model,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, take } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneCodeEditor,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';

import { RamCacheService } from '../../services/ram-cache.service';
import { GraphStudioApiService } from '../../services/graph-studio-api.service';
import { CachedTextPickerComponent } from '../cached-text-picker/cached-text-picker.component';

/**
 * JMES expression editor with inline test.
 */
@Component({
  selector: 'cadmus-jmes',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
    // vendor
    NgxMonacoEditorComponent,
    // local
    CachedTextPickerComponent,
  ],
  templateUrl: './jmes.component.html',
  styleUrls: ['./jmes.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JmesComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _updatingForm?: boolean;

  // monaco
  private _inEditor?: StandaloneCodeEditor;
  private _outEditor?: StandaloneCodeEditor;

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };

  /**
   * The JMES expression being edited.
   */
  public readonly expression = model<string>();

  public jmes: FormControl<string>;
  public input: FormControl<string>;
  public output: FormControl<string | null>;
  public form: FormGroup;

  public sampleKey: FormControl<string>;
  public sampleForm: FormGroup;

  public readonly busy = signal<boolean>(false);
  public readonly error = signal<string | undefined>(undefined);
  public readonly sampleKeys = signal<string[]>([]);

  constructor(
    formBuilder: FormBuilder,
    private _apiService: GraphStudioApiService,
    private _cacheService: RamCacheService,
  ) {
    // form
    this.jmes = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(500)],
      nonNullable: true,
    });
    this.input = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(5000)],
      nonNullable: true,
    });
    this.output = formBuilder.control(null);
    this.form = formBuilder.group({
      jmes: this.jmes,
      input: this.input,
      output: this.output,
    });
    // sample
    this.sampleKeys.set(
      Object.keys(this._cacheService.get('jmes') || {}).sort(),
    );
    this.sampleKey = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(50)],
      nonNullable: true,
    });
    this.sampleForm = formBuilder.group({
      sampleKey: this.sampleKey,
    });

    // when the expression changes, update the JMES form control
    effect(() => {
      const expression = this.expression();
      this._updatingForm = true;
      this.jmes.setValue(expression || '', { emitEvent: false });
      this.jmes.markAsDirty();
      this.jmes.updateValueAndValidity();
      this._updatingForm = false;
    });
  }

  public ngOnInit(): void {
    // when the JMES expression changes, update the model
    this._sub = this.jmes.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(300))
      .subscribe((_) => {
        if (this._updatingForm) {
          return;
        }
        this.expression.set(this.jmes.value);
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onInEditorInit(event: EditorInitializedEvent) {
    this._inEditor = event.editor;
    this._inEditor.focus();
  }

  public onOutEditorInit(event: EditorInitializedEvent) {
    this._outEditor = event.editor;
    this._outEditor.focus();
  }

  public transform(): void {
    if (this.busy() || this.form.invalid) {
      return;
    }
    this.busy.set(true);
    this.error.set(undefined);
    this._apiService
      .jmesTransform(this.input.value, this.jmes.value)
      .pipe(take(1))
      .subscribe({
        next: (w) => {
          this.busy.set(false);
          if (w.error) {
            this.error.set(w.error);
          } else {
            this.output.setValue(w.value || '');
            this.output.updateValueAndValidity();
            this.output.markAsDirty();
          }
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(error);
        },
      });
  }

  public onTextPick(text: string): void {
    this.input.setValue(text);
    this.input.updateValueAndValidity();
    this.input.markAsDirty();
  }

  public addSample(): void {
    if (this.sampleForm.invalid) {
      return;
    }
    this._cacheService.add('jmes', {
      ...(this._cacheService.get('jmes') || {}),
      [this.sampleKey.value]: this.input.value,
    });
    this.sampleKeys.set([...this.sampleKeys(), this.sampleKey.value].sort());
  }
}
