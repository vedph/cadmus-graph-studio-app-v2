import { Component, effect, Input, model, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { GraphSet, NodeMapping } from '../../models';
import {
  GraphStudioApiService,
  NodeMappingMetadata,
} from '../../services/graph-studio-api.service';
import { CachedTextPickerComponent } from '../cached-text-picker/cached-text-picker.component';

/**
 * Node mapping runner component. This allows you to run a mapping
 * on a given input text, and see the resulting graph set.
 */
@Component({
  selector: 'cadmus-mapping-runner',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBar,
    MatSelectModule,
    MatTooltipModule,
    // vendor
    NgeMonacoModule,
    // local
    CachedTextPickerComponent,
  ],
  templateUrl: './mapping-runner.component.html',
  styleUrls: ['./mapping-runner.component.css'],
})
export class MappingRunnerComponent implements OnDestroy {
  // Monaco
  private readonly _disposables: monaco.IDisposable[] = [];
  private _editorModel?: monaco.editor.ITextModel;
  private _editor?: monaco.editor.IStandaloneCodeEditor;

  /**
   * The mapping to run.
   */
  public readonly mapping = model<NodeMapping>();

  public input: FormControl<string>;
  public form: FormGroup;

  public itemId: FormControl<string | null>;
  public partId: FormControl<string | null>;
  public partTypeId: FormControl<string | null>;
  public roleId: FormControl<string | null>;
  public facetId: FormControl<string | null>;
  public itemTitle: FormControl<string | null>;
  public itemUri: FormControl<string | null>;
  public itemLabel: FormControl<string | null>;
  public itemEid: FormControl<string | null>;
  public metadataPid: FormControl<string | null>;
  public groupId: FormControl<string | null>;
  public flags: FormControl<number>;
  public metaForm: FormGroup;

  public busy?: boolean;
  public error?: string;
  public graphSet?: GraphSet;

  constructor(
    formBuilder: FormBuilder,
    private _apiService: GraphStudioApiService
  ) {
    // runner form
    this.input = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(5000)],
      nonNullable: true,
    });
    this.form = formBuilder.group({
      input: this.input,
    });
    // metadata form
    // const guidPattern =
    //   '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
    this.itemId = formBuilder.control(
      'IID'
      // Validators.pattern(guidPattern)
    );
    this.partId = formBuilder.control(
      'PID'
      // Validators.pattern(guidPattern)
    );
    this.partTypeId = formBuilder.control(null, Validators.maxLength(50));
    this.roleId = formBuilder.control(null, Validators.maxLength(50));
    this.facetId = formBuilder.control(null, Validators.maxLength(50));
    this.itemTitle = formBuilder.control(
      'Alpha item',
      Validators.maxLength(500)
    );
    this.itemUri = formBuilder.control(null, Validators.maxLength(500));
    this.itemLabel = formBuilder.control(null, Validators.maxLength(500));
    this.itemEid = formBuilder.control('alpha', Validators.maxLength(100));
    this.metadataPid = formBuilder.control('MPID', Validators.maxLength(100));
    this.groupId = formBuilder.control(null, Validators.maxLength(100));
    this.flags = formBuilder.control(0, { nonNullable: true });
    this.metaForm = formBuilder.group({
      itemId: this.itemId,
      partId: this.partId,
      partTypeId: this.partTypeId,
      roleId: this.roleId,
      facetId: this.facetId,
      itemTitle: this.itemTitle,
      itemUri: this.itemUri,
      itemLabel: this.itemLabel,
      itemEid: this.itemEid,
      metadataPid: this.metadataPid,
      groupId: this.groupId,
      flags: this.flags,
    });

    effect(() => {
      const mapping = this.mapping();
      console.log('runner mapping', mapping);
      this.graphSet = undefined;
    });
  }

  public ngOnDestroy() {
    this._disposables.forEach((d) => d.dispose());
  }

  public onCreateEditor(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._editorModel =
      this._editorModel ||
      monaco.editor.createModel(this.input?.value || '', 'markdown');
    editor.setModel(this._editorModel);
    this._editor = editor as monaco.editor.IStandaloneCodeEditor;

    this._disposables.push(
      this._editorModel.onDidChangeContent((e) => {
        this.input.setValue(this._editorModel!.getValue());
        this.input.markAsDirty();
        this.input.updateValueAndValidity();
      })
    );
  }

  public onTextPick(text: string): void {
    this.input.setValue(text);
    this.input.markAsDirty();
    this.input.updateValueAndValidity();
  }

  private getMetadata(): NodeMappingMetadata {
    return {
      itemId: this.itemId.value || undefined,
      partId: this.partId.value || undefined,
      partTypeId: this.partTypeId.value || undefined,
      roleId: this.roleId.value || undefined,
      facetId: this.facetId.value || undefined,
      itemTitle: this.itemTitle.value || undefined,
      itemUri: this.itemUri.value || undefined,
      itemLabel: this.itemLabel.value || undefined,
      itemEid: this.itemEid.value || undefined,
      metadataPid: this.metadataPid.value || undefined,
      groupId: this.groupId.value || undefined,
      flags: this.flags.value || undefined,
    };
  }

  public prettifyInput(): void {
    this.input.setValue(
      JSON.stringify(JSON.parse(this.input.value || '{}'), null, 2)
    );
  }

  public run(): void {
    if (this.busy || this.form.invalid || !this.mapping()) {
      return;
    }
    this.busy = true;
    this.error = undefined;
    this._apiService
      .runMappings(this.input.value, [this.mapping()!], this.getMetadata())
      .pipe(take(1))
      .subscribe({
        next: (w) => {
          this.busy = false;
          if (w.error) {
            this.error = w.error;
          } else {
            this.graphSet = w.value;
          }
        },
        error: (error) => {
          this.busy = false;
          this.error = error;
        },
      });
  }
}
