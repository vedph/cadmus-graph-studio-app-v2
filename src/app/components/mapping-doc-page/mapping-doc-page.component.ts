import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';

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

function jsonValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    try {
      JSON.parse(control.value);
      return null;
    } catch (error) {
      return { invalidJson: true };
    }
  };
}

@Component({
  selector: 'app-mapping-doc-page',
  imports: [
    ReactiveFormsModule,
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

  public json: FormControl<string>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _snackbar: MatSnackBar,
    private _repository: NodeMappingListService,
    @Inject(NODE_MAPPING_SERVICE) private _mappingService: NodeMappingService,
  ) {
    this.json = formBuilder.control('', {
      validators: [Validators.required, jsonValidator()],
      nonNullable: true,
    });
    this.form = formBuilder.group({
      json: this.json,
    });
    this.exportToDocument();
  }

  public onEditorInit(event: EditorInitializedEvent) {
    this._editor = event.editor;
    this._editor.focus();
  }

  public exportToDocument() {
    this._mappingService.exportMappings().subscribe((json) => {
      this.json.setValue(json);
    });
  }

  public importFromDocument() {
    this._mappingService
      .importMappings(this.json.value)
      .subscribe((mappings) => {
        this._repository.reset();
        this._snackbar.open('Mappings imported: ' + mappings.length, 'OK', {
          duration: 3000,
        });
      });
  }
}
