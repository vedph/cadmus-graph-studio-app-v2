import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneCodeEditor,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';

import {
  NODE_MAPPING_SERVICE,
  NodeMappingListService,
  NodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-mapping-doc-page',
  imports: [
    FormField,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    NgxMonacoEditorComponent,
  ],
  templateUrl: './mapping-doc-page.component.html',
  styleUrls: ['./mapping-doc-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingDocPageComponent {
  // Monaco
  private _editor?: StandaloneCodeEditor;

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };

  public readonly form = form(signal({ json: '' }), (path) => {
    required(path.json);
    validate(path.json, ({ value }) =>
      isJson(value()) ? undefined : { kind: 'invalidJson' }
    );
  });

  constructor(
    private _snackbar: MatSnackBar,
    private _repository: NodeMappingListService,
    @Inject(NODE_MAPPING_SERVICE) private _mappingService: NodeMappingService,
  ) {
    this.exportToDocument();
  }

  public onEditorInit(event: EditorInitializedEvent) {
    this._editor = event.editor;
    this._editor.focus();
  }

  public exportToDocument() {
    this._mappingService.exportMappings().subscribe((json) => {
      this.form.json().value.set(json);
    });
  }

  private reportImportError(error: unknown): void {
    this._snackbar.open(
      'Error importing mappings: ' +
        (error instanceof Error ? error.message : String(error)),
      'OK'
    );
  }

  public importFromDocument() {
    // a valid JSON document may still be an invalid mappings document,
    // which makes the import throw
    try {
      this._mappingService.importMappings(this.form.json().value()).subscribe({
        next: (mappings) => {
          this._repository.reset();
          this._snackbar.open('Mappings imported: ' + mappings.length, 'OK', {
            duration: 3000,
          });
        },
        error: (error) => this.reportImportError(error),
      });
    } catch (error) {
      this.reportImportError(error);
    }
  }
}
