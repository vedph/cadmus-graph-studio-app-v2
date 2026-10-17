import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  linkedSignal,
  model,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MappingTreeFilter } from '../../services/mapping-paged-tree-store.service';

interface MappingTreeFilterControls {
  name: string;
}

function toDraft(
  filter: MappingTreeFilter | null | undefined
): MappingTreeFilterControls {
  return { name: filter?.name ?? '' };
}

function toData(draft: MappingTreeFilterControls): MappingTreeFilter {
  return { name: draft.name || undefined };
}

@Component({
  selector: 'cadmus-mapping-tree-filter',
  imports: [
    FormField,
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
export class MappingTreeFilterComponent {
  public readonly dialogRef = inject<MatDialogRef<MappingTreeFilterComponent>>(
    MatDialogRef,
    {
      optional: true,
    }
  );
  public readonly data = inject(MAT_DIALOG_DATA, { optional: true });

  /**
   * The filter.
   */
  public readonly filter = model<MappingTreeFilter>();

  public readonly wrapped = signal<boolean>(!!this.dialogRef);

  /**
   * The edited filter. `previous` tells the echo of an applied filter apart
   * from a new filter, so that applying keeps the text as typed.
   */
  private readonly _draft = linkedSignal<
    MappingTreeFilter | undefined,
    MappingTreeFilterControls
  >({
    source: () => this.filter(),
    computation: (filter, previous) =>
      previous &&
      JSON.stringify(filter) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(filter),
  });

  public readonly form = form(this._draft);

  constructor() {
    // bind dialog data if any
    if (this.dialogRef && this.data) {
      this.filter.set(this.data.filter);
    }

    // once the draft mirrors the bound filter again, clear interaction
    // state; keyed on the draft, so the echo of an applied filter does not
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (JSON.stringify(draft) === JSON.stringify(toDraft(this.filter()))) {
          this.form().reset();
        }
      });
    });
  }

  public reset(): void {
    // signal forms reset() clears interaction state, not values; the value
    // must be cleared too, as the filter might already be undefined
    this.form().reset(toDraft(undefined));
    this.filter.set(undefined);
    this.dialogRef?.close(null);
  }

  public apply(): void {
    this.filter.set(toData(this._draft()));
    this.dialogRef?.close(this.filter());
  }
}
