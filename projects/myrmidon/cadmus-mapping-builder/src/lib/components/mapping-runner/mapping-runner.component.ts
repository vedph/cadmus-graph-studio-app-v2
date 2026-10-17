import {
  ChangeDetectionStrategy,
  Component,
  effect,
  model,
  signal,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneCodeEditor,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';

import { GraphSet, NodeMapping } from '../../models';
import {
  GraphStudioApiService,
  NodeMappingMetadata,
} from '../../services/graph-studio-api.service';
import { CachedTextPickerComponent } from '../cached-text-picker/cached-text-picker.component';

/**
 * The runner's input and metadata: local to this component.
 * Text fields use '' as their empty value.
 */
interface MappingRunnerControls {
  input: string;
  itemId: string;
  partId: string;
  partTypeId: string;
  roleId: string;
  facetId: string;
  itemTitle: string;
  itemUri: string;
  itemLabel: string;
  itemEid: string;
  metadataPid: string;
  groupId: string;
  flags: number | null;
}

/** The empty metadata, as set by the metadata reset button. */
const EMPTY_METADATA: Omit<MappingRunnerControls, 'input'> = {
  itemId: '',
  partId: '',
  partTypeId: '',
  roleId: '',
  facetId: '',
  itemTitle: '',
  itemUri: '',
  itemLabel: '',
  itemEid: '',
  metadataPid: '',
  groupId: '',
  flags: 0,
};

/**
 * Node mapping runner component. This allows you to run a mapping
 * on a given input text, and see the resulting graph set.
 */
@Component({
  selector: 'cadmus-mapping-runner',
  imports: [
    CommonModule,
    FormField,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBar,
    MatSelectModule,
    MatTooltipModule,
    // vendor
    NgxMonacoEditorComponent,
    // local
    CachedTextPickerComponent,
  ],
  templateUrl: './mapping-runner.component.html',
  styleUrls: ['./mapping-runner.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingRunnerComponent {
  // Monaco
  private _editor?: StandaloneCodeEditor;

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };

  /**
   * The mapping to run.
   */
  public readonly mapping = model<NodeMapping>();

  private readonly _draft = signal<MappingRunnerControls>({
    ...EMPTY_METADATA,
    input: '',
    // sample metadata
    itemId: 'IID',
    partId: 'PID',
    itemTitle: 'Alpha item',
    itemEid: 'alpha',
    metadataPid: 'MPID',
  });

  public readonly form = form(this._draft, (path) => {
    required(path.input);
    maxLength(path.input, 5000);
    maxLength(path.partTypeId, 50);
    maxLength(path.roleId, 50);
    maxLength(path.facetId, 50);
    maxLength(path.itemTitle, 500);
    maxLength(path.itemUri, 500);
    maxLength(path.itemLabel, 500);
    maxLength(path.itemEid, 100);
    maxLength(path.metadataPid, 100);
    maxLength(path.groupId, 100);
  });

  public readonly busy = signal<boolean>(false);
  public readonly error = signal<string | undefined>(undefined);
  public readonly graphSet = signal<GraphSet | undefined>(undefined);

  constructor(private _apiService: GraphStudioApiService) {
    effect(() => {
      // a new mapping invalidates the previous result
      this.mapping();
      this.graphSet.set(undefined);
    });
  }

  public onEditorInit(event: EditorInitializedEvent) {
    this._editor = event.editor;
    this._editor.focus();
  }

  public onTextPick(text: string): void {
    this.form.input().value.set(text);
    this.form.input().markAsDirty();
  }

  private getMetadata(): NodeMappingMetadata {
    const v = this._draft();
    return {
      itemId: v.itemId || undefined,
      partId: v.partId || undefined,
      partTypeId: v.partTypeId || undefined,
      roleId: v.roleId || undefined,
      facetId: v.facetId || undefined,
      itemTitle: v.itemTitle || undefined,
      itemUri: v.itemUri || undefined,
      itemLabel: v.itemLabel || undefined,
      itemEid: v.itemEid || undefined,
      metadataPid: v.metadataPid || undefined,
      groupId: v.groupId || undefined,
      flags: v.flags || undefined,
    };
  }

  /**
   * Clear all the metadata (but not the input).
   */
  public resetMetadata(): void {
    this._draft.update((v) => ({ ...v, ...EMPTY_METADATA }));
    for (const key of Object.keys(EMPTY_METADATA)) {
      this.form[key as keyof typeof EMPTY_METADATA]().reset();
    }
  }

  public prettifyInput(): void {
    try {
      this.form
        .input()
        .value.set(
          JSON.stringify(JSON.parse(this.form.input().value() || '{}'), null, 2),
        );
      this.error.set(undefined);
    } catch (error) {
      this.error.set(`Invalid JSON: ${(error as Error).message}`);
    }
  }

  public run(): void {
    if (this.busy() || this.form().invalid() || !this.mapping()) {
      return;
    }
    this.busy.set(true);
    this.error.set(undefined);
    this._apiService
      .runMappings(this.form.input().value(), [this.mapping()!], this.getMetadata())
      .pipe(take(1))
      .subscribe({
        next: (w) => {
          this.busy.set(false);
          if (w.error) {
            this.error.set(w.error);
          } else {
            this.graphSet.set(w.value);
          }
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(error);
        },
      });
  }
}
