import { Component, Inject, OnDestroy } from '@angular/core';
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

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import {
  NODE_MAPPING_SERVICE,
  NodeMappingListService,
  NodeMappingService,
} from '../../../../projects/myrmidon/cadmus-mapping-builder/src/public-api';

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
    NgeMonacoModule,
  ],
  templateUrl: './mapping-doc-page.component.html',
  styleUrls: ['./mapping-doc-page.component.css'],
})
export class MappingDocPageComponent implements OnDestroy {
  // Monaco
  private readonly _disposables: monaco.IDisposable[] = [];
  private _editorModel?: monaco.editor.ITextModel;
  private _editor?: monaco.editor.IStandaloneCodeEditor;

  public json: FormControl<string>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _snackbar: MatSnackBar,
    private _repository: NodeMappingListService,
    @Inject(NODE_MAPPING_SERVICE) private _mappingService: NodeMappingService
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
      monaco.editor.createModel(this.json?.value || '', 'json');
    editor.setModel(this._editorModel);
    this._editor = editor as monaco.editor.IStandaloneCodeEditor;

    this._disposables.push(
      this._editorModel.onDidChangeContent((e) => {
        this.json.setValue(this._editorModel!.getValue());
        this.json.markAsDirty();
        this.json.updateValueAndValidity();
      })
    );
  }

  public ngOnDestroy() {
    this._disposables.forEach((d) => d.dispose());
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
