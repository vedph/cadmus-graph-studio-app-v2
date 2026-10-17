import {
  ChangeDetectionStrategy,
  Component,
  effect,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NodeMapping, NodeMappingOutput } from '../../models';
import { JmesComponent } from '../jmes/jmes.component';
import { MappingOutputEditorComponent } from '../mapping-output-editor/mapping-output-editor.component';
import { MappingRunnerComponent } from '../mapping-runner/mapping-runner.component';

/**
 * The editable mapping. Text fields use '' as their empty value. ID and
 * parent ID are not editable, so they are not here: they come from the
 * bound mapping.
 */
interface MappingControls {
  ordinal: number;
  name: string;
  sourceType: number;
  facetFilter: string;
  groupFilter: string;
  flagsFilter: number | null;
  titleFilter: string;
  partTypeFilter: string;
  partRoleFilter: string;
  description: string;
  source: string;
  sid: string;
  scalarPattern: string;
  output: NodeMappingOutput | null;
}

/**
 * Copy an output, so that the draft never shares objects with the bound
 * mapping or with the saved one.
 */
function copyOutput(
  output: NodeMappingOutput | null | undefined
): NodeMappingOutput | null {
  return output ? JSON.parse(JSON.stringify(output)) : null;
}

/**
 * Bound mapping -> editable draft. Pure, so it can be called from inside
 * the linkedSignal computation.
 */
function toDraft(mapping: NodeMapping | undefined): MappingControls {
  return {
    ordinal: mapping?.ordinal || 0,
    name: mapping?.name || '',
    sourceType: mapping?.sourceType || 0,
    facetFilter: mapping?.facetFilter || '',
    groupFilter: mapping?.groupFilter || '',
    flagsFilter: mapping?.flagsFilter || 0,
    titleFilter: mapping?.titleFilter || '',
    partTypeFilter: mapping?.partTypeFilter || '',
    partRoleFilter: mapping?.partRoleFilter || '',
    description: mapping?.description || '',
    source: mapping?.source || '',
    sid: mapping?.sid || '',
    scalarPattern: mapping?.scalarPattern || '',
    output: copyOutput(mapping?.output),
  };
}

/**
 * Editable draft -> mapping, with ID and parent ID from the bound mapping.
 * This maps empty values to undefined, so the draft and the mapping are not
 * interchangeable: see the echo check on the draft.
 */
function toData(
  draft: MappingControls,
  mapping: NodeMapping | undefined
): NodeMapping {
  return {
    id: mapping?.id || 0,
    parentId: mapping?.parentId ?? undefined,
    ordinal: draft.ordinal || undefined,
    name: draft.name,
    sourceType: draft.sourceType,
    facetFilter: draft.facetFilter || undefined,
    groupFilter: draft.groupFilter || undefined,
    flagsFilter: draft.flagsFilter || undefined,
    titleFilter: draft.titleFilter || undefined,
    partTypeFilter: draft.partTypeFilter || undefined,
    partRoleFilter: draft.partRoleFilter || undefined,
    description: draft.description || undefined,
    source: draft.source,
    sid: draft.sid,
    scalarPattern: draft.scalarPattern || undefined,
    output: copyOutput(draft.output) || undefined,
  };
}

/**
 * The comparable form of a mapping: its own data only, without the parent
 * and children references (which may be circular).
 */
function toComparable(mapping: NodeMapping | undefined): string {
  return JSON.stringify(toData(toDraft(mapping), mapping));
}

/**
 * Single node mapping editor. Note that ID and parent ID are not editable.
 */
@Component({
  selector: 'cadmus-mapping-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    // local
    JmesComponent,
    MappingOutputEditorComponent,
    MappingRunnerComponent,
  ],
  templateUrl: './mapping-editor.component.html',
  styleUrls: ['./mapping-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingEditorComponent {
  public readonly mapping = model<NodeMapping>();

  public readonly editorClose = output();

  /**
   * The editable draft. `previous` tells the echo of our own save (or the
   * same mapping data sent again by the consumer) apart from a new mapping:
   * in that case the draft is kept rather than rebuilt.
   */
  private readonly _draft = linkedSignal<NodeMapping | undefined, MappingControls>(
    {
      source: () => this.mapping(),
      computation: (mapping, previous) =>
        previous &&
        toComparable(mapping) ===
          JSON.stringify(toData(previous.value, previous.source))
          ? previous.value
          : toDraft(mapping),
    }
  );

  public readonly form = form(this._draft, (path) => {
    required(path.name);
    maxLength(path.name, 100);
    maxLength(path.facetFilter, 100);
    maxLength(path.groupFilter, 100);
    // was a static min attribute, which [formField] does not allow
    min(path.flagsFilter, 0);
    maxLength(path.titleFilter, 100);
    maxLength(path.partTypeFilter, 100);
    maxLength(path.partRoleFilter, 100);
    maxLength(path.description, 1000);
    required(path.source);
    maxLength(path.source, 500);
    // SID is required for root mappings only
    required(path.sid, { when: () => !this.isChild() });
    maxLength(path.sid, 500);
    maxLength(path.scalarPattern, 500);
  });

  constructor() {
    // once the draft mirrors the bound mapping again, clear interaction
    // state; keyed on the draft, so an echo of our own save does not run it
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (this.isDraftInSync(draft)) {
          this.form().reset();
        }
      });
    });
  }

  /** True when the draft still mirrors the bound mapping. */
  private isDraftInSync(draft: MappingControls): boolean {
    const mapping = this.mapping();
    return JSON.stringify(toData(draft, mapping)) === toComparable(mapping);
  }

  /**
   * True if the edited mapping is a child mapping. A root mapping has no
   * parent ID (note that a child of a new root has parent ID 0).
   */
  public isChild(): boolean {
    const mapping = this.mapping();
    return !!mapping?.parent || (mapping?.parentId ?? null) !== null;
  }

  public onOutputChange(output: NodeMappingOutput): void {
    this.form.output().value.set(copyOutput(output));
    this.form.output().markAsDirty();
  }

  public onExpressionChange(expression: string): void {
    this.form.source().value.set(expression);
    this.form.source().markAsDirty();
  }

  /**
   * Save on Enter in a single-line input, as the former implicit form
   * submission did (it did nothing while the save button was disabled).
   */
  public onEnter(event: Event): void {
    event.preventDefault();
    if (!this.form().invalid()) {
      this.save();
    }
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.mapping.set(toData(this._draft(), this.mapping()));
    this.form().reset();
  }
}
