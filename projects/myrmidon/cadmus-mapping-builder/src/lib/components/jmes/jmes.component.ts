import {
  ChangeDetectionStrategy,
  Component,
  effect,
  linkedSignal,
  model,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { debounceTime, take } from 'rxjs';

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

import { GraphStudioApiService } from '../../services/graph-studio-api.service';
import { CachedTextPickerComponent } from '../cached-text-picker/cached-text-picker.component';

/**
 * The JMES test data: local to this component, not part of its model.
 */
interface JmesTestControls {
  input: string;
  output: string;
}

/**
 * JMES expression editor with inline test.
 */
@Component({
  selector: 'cadmus-jmes',
  imports: [
    FormField,
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
export class JmesComponent {
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

  /**
   * The edited expression. It is saved into the model unchanged (no
   * normalization), so the echo of our own autosave recomputes the very
   * same string, which does not notify: no `previous` check is needed.
   */
  private readonly _jmes = linkedSignal(() => this.expression() || '');

  public readonly jmes = form(this._jmes, (path) => {
    required(path);
    maxLength(path, 500);
  });

  private readonly _test = signal<JmesTestControls>({ input: '', output: '' });

  public readonly test = form(this._test, (path) => {
    required(path.input);
    maxLength(path.input, 5000);
  });

  public readonly busy = signal<boolean>(false);
  public readonly error = signal<string | undefined>(undefined);

  constructor(private _apiService: GraphStudioApiService) {
    // once the expression mirrors the model again (a new value from the
    // consumer), clear interaction state; keyed on the draft, so that the
    // echo of our own autosave does not clear it under the user
    effect(() => {
      const jmes = this._jmes();
      untracked(() => {
        if (jmes === (this.expression() || '')) {
          this.jmes().reset();
        }
      });
    });

    // autosave the expression after a pause in typing (also when invalid,
    // as the consumer validates it as its own source)
    toObservable(this._jmes)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((jmes) => {
        if (jmes !== (this.expression() || '')) {
          this.expression.set(jmes);
        }
      });
  }

  public onInEditorInit(event: EditorInitializedEvent) {
    this._inEditor = event.editor;
    this._inEditor.focus();
  }

  public onOutEditorInit(event: EditorInitializedEvent) {
    this._outEditor = event.editor;
    this._outEditor.focus();
  }

  /** True when the transform can be run. */
  public canTransform(): boolean {
    return !this.busy() && this.jmes().valid() && this.test().valid();
  }

  public transform(): void {
    if (!this.canTransform()) {
      return;
    }
    this.busy.set(true);
    this.error.set(undefined);
    this._apiService
      .jmesTransform(this.test.input().value(), this._jmes())
      .pipe(take(1))
      .subscribe({
        next: (w) => {
          this.busy.set(false);
          if (w.error) {
            this.error.set(w.error);
          } else {
            this.test.output().value.set(w.value || '');
            this.test.output().markAsDirty();
          }
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(error);
        },
      });
  }

  public onTextPick(text: string): void {
    this.test.input().value.set(text);
    this.test.input().markAsDirty();
  }
}
