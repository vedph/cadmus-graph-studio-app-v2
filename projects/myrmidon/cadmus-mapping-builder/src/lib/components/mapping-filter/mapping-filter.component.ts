import {
  ChangeDetectionStrategy,
  Component,
  inject,
  linkedSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, form, max, min } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NodeMappingFilter } from '../../models';
import { NodeMappingListService } from '../../state/node-mapping-list.service';

/**
 * The editable filter. Text fields use '' as their empty value.
 */
interface MappingFilterControls {
  sourceType: number;
  name: string;
  facet: string;
  group: string;
  flags: number | null;
  title: string;
  partType: string;
  partRole: string;
}

function toDraft(filter: NodeMappingFilter): MappingFilterControls {
  return {
    sourceType: filter.sourceType || 0,
    name: filter.name || '',
    facet: filter.facet || '',
    group: filter.group || '',
    flags: filter.flags || 0,
    title: filter.title || '',
    partType: filter.partType || '',
    partRole: filter.partRole || '',
  };
}

function toData(draft: MappingFilterControls): NodeMappingFilter {
  return {
    sourceType: draft.sourceType || undefined,
    name: draft.name || undefined,
    facet: draft.facet || undefined,
    group: draft.group || undefined,
    flags: draft.flags || undefined,
    title: draft.title || undefined,
    partType: draft.partType || undefined,
    partRole: draft.partRole || undefined,
  };
}

@Component({
  selector: 'cadmus-mapping-filter',
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './mapping-filter.component.html',
  styleUrls: ['./mapping-filter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingFilterComponent {
  private readonly _repository = inject(NodeMappingListService);

  /** The current filter in the list (a BehaviorSubject: sync). */
  public readonly filter = toSignal(this._repository.filter$, {
    requireSync: true,
  });

  public readonly loading = toSignal(this._repository.loading$);

  /**
   * The edited filter, rebuilt from every filter set in the list (including
   * the one applied from here, as filters are applied explicitly).
   */
  private readonly _draft = linkedSignal(() => toDraft(this.filter()));

  public readonly form = form(this._draft, (path) => {
    // were static min/max attributes, which [formField] does not allow
    min(path.flags, 0);
    max(path.flags, 2147483647);
  });

  /** True when the filter can be applied. */
  public canApply(): boolean {
    return !this.form().invalid() && !this.loading();
  }

  public reset(): void {
    // signal forms reset() clears interaction state, not values
    this.form().reset(toDraft({}));
    this.apply();
  }

  public apply(): void {
    if (this.form().invalid()) {
      return;
    }
    // update filter in state
    this._repository.setFilter(toData(this._draft()));
  }

  /**
   * Apply on Enter in an input, as the former implicit form submission did
   * (it did nothing while the apply button was disabled).
   */
  public onEnter(event: Event): void {
    event.preventDefault();
    if (this.canApply()) {
      this.apply();
    }
  }
}
