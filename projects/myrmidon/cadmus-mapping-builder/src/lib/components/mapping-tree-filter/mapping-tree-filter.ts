import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  model,
  OnInit,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MappingTreeFilter } from '../../services/mapping-paged-tree-store.service';

@Component({
  selector: 'cadmus-mapping-tree-filter',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './mapping-tree-filter.html',
  styleUrl: './mapping-tree-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingTreeFilterComponent implements OnInit {
  public readonly dialogRef = inject<MatDialogRef<MappingTreeFilterComponent>>(
    MatDialogRef,
    {
      optional: true,
    }
  );
  public readonly data = inject(MAT_DIALOG_DATA, { optional: true });
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * The filter.
   */
  public readonly filter = model<MappingTreeFilter>();

  public readonly wrapped = signal<boolean>(false);

  public name: FormControl<string | null>;
  public form: FormGroup;

  constructor() {
    const formBuilder = inject(FormBuilder);
    const data = this.data;

    // form
    this.name = formBuilder.control<string | null>(null);
    this.form = formBuilder.group({
      name: this.name,
    });
    // bind dialog data if any
    if (this.dialogRef) {
      this.wrapped.set(true);
      if (data) {
        this.filter.set(data.filter);
      }
    } else {
      this.wrapped.set(false);
    }

    // update form when filter changes
    effect(() => {
      this.updateForm(this.filter());
    });
  }

  public ngOnInit(): void {
    this.updateForm(this.filter());
  }

  private updateForm(filter?: MappingTreeFilter | null): void {
    if (!filter) {
      this.form.reset();
      this._cdr.markForCheck();
      return;
    }
    this.name.setValue(filter.name ?? null);
    this.form.markAsPristine();
    this._cdr.markForCheck();
  }

  private getFilter(): MappingTreeFilter {
    return {
      name: this.name.value ?? undefined,
    };
  }

  public reset(): void {
    this.form.reset();
    this._cdr.markForCheck();
    this.filter.set(undefined);
    this.dialogRef?.close(null);
  }

  public apply(): void {
    this.filter.set(this.getFilter());
    this.dialogRef?.close(this.filter());
  }
}
