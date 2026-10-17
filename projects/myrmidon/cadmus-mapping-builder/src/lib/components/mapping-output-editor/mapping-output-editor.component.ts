import {
  ChangeDetectionStrategy,
  Component,
  effect,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, pattern } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MappedNode, MappedTriple, NodeMappingOutput } from '../../models';

/**
 * The editable output: one entry per line in each text.
 */
interface MappingOutputControls {
  nodes: string;
  triples: string;
  metadata: string;
}

//#region helpers
function parseNode(
  text: string | null | undefined
): { key: string; value: MappedNode } | null {
  if (!text) {
    return null;
  }
  // parse node from "key uid [label|tag]" (key uid required)
  const m = text.match(
    /^(\S+)\s+((?:(?!\[[^\[\]]+\]$).)*)(?:\[([^\]\|]+)?(?:\|([^\]]+))?\])?/
  );
  if (!m) {
    return null;
  }
  return {
    key: m[1],
    value: {
      uid: m[2].trim(),
      label: m[3]?.trim(),
      tag: m[4]?.trim(),
    },
  };
}

function parseNodes(
  text: string | null | undefined
): { [key: string]: MappedNode } | null {
  if (!text) {
    return null;
  }
  return text
    .split('\n')
    .map((s) => parseNode(s))
    .filter((kv) => kv !== null)
    .reduce((p, c) => {
      p[c!.key] = c!.value;
      return p;
    }, {} as { [key: string]: MappedNode });
}

function nodeToString(key: string, node: MappedNode | null): string | null {
  if (!node) {
    return null;
  }
  const sb: string[] = [];
  sb.push(key);
  sb.push(' ');
  sb.push(node.uid);
  if (node.label || node.tag) {
    sb.push(' [');
    if (node.label) {
      sb.push(node.label);
    }
    if (node.tag) {
      sb.push('|');
      sb.push(node.tag);
    }
    sb.push(']');
  }
  return sb.join('');
}

function parseTriple(text: string | null | undefined): MappedTriple | null {
  // parse triple from "s p o" or "s p "ol"" or "s p "ol"@lang" or "s p "ol"^^type"
  if (!text) {
    return null;
  }
  const m = text.match(/^(\S+)\s+(\S+)\s+(.+)$/);
  if (!m) {
    return null;
  }
  return m[3].startsWith('"')
    ? {
        s: m[1],
        p: m[2],
        ol: m[3],
      }
    : {
        s: m[1],
        p: m[2],
        o: m[3],
      };
}

function parseTriples(text: string | null | undefined): MappedTriple[] | null {
  if (!text) {
    return null;
  }
  return text
    .split('\n')
    .map((s) => parseTriple(s))
    .filter((t) => t !== null) as MappedTriple[];
}

function tripleToString(triple: MappedTriple | null): string | null {
  if (!triple) {
    return null;
  }
  let o: string;
  if (triple.o) {
    o = triple.o;
  } else {
    o = triple.ol || '';
    if (!o.startsWith('"')) {
      o = `"${o}"`;
    }
  }
  return `${triple.s} ${triple.p} ${o}`;
}

function parseMetadatum(
  text: string | null | undefined
): { key: string; value: string } | null {
  if (!text) {
    return null;
  }
  const i = text.indexOf('=');
  if (i === -1) {
    return null;
  }
  return {
    key: text.substring(0, i).trim(),
    value: text.substring(i + 1).trim(),
  };
}

function parseMetadata(
  text: string | null | undefined
): { [key: string]: string } | null {
  if (!text) {
    return null;
  }
  return text
    .split('\n')
    .map((s) => parseMetadatum(s))
    .filter((kv) => kv !== null)
    .reduce((p, c) => {
      p[c!.key] = c!.value;
      return p;
    }, {} as { [key: string]: string });
}

function metadataToString(
  metadata: { [key: string]: string } | null | undefined
): string {
  return metadata
    ? Object.keys(metadata)
        .map((k) => `${k}=${metadata[k]}`)
        .join('\n')
    : '';
}
//#endregion

/**
 * Bound output -> editable draft. Pure, so it can be called from inside the
 * linkedSignal computation.
 */
function toDraft(output: NodeMappingOutput | undefined): MappingOutputControls {
  if (!output) {
    return { nodes: '', triples: '', metadata: '' };
  }
  return {
    nodes: output.nodes
      ? Object.keys(output.nodes)
          .map((k) => nodeToString(k, output.nodes![k]))
          .join('\n')
      : '',
    triples: output.triples
      ? output.triples.map((t) => tripleToString(t)).join('\n')
      : '',
    metadata: metadataToString(output.metadata),
  };
}

/**
 * Editable draft -> output. Parsing normalizes the text (e.g. it trims
 * metadata and drops unparsable lines), so the draft and the output are not
 * interchangeable: see the echo check on the draft.
 */
function toData(draft: MappingOutputControls): NodeMappingOutput {
  return {
    nodes: parseNodes(draft.nodes) || undefined,
    triples: parseTriples(draft.triples) || undefined,
    metadata: parseMetadata(draft.metadata) || undefined,
  };
}

/**
 * Node mapping output editor. This allows the user to edit the output in text
 * boxes, where each line is an entry; nodes have form "key uid [label|tag]";
 * triples have form "s p o" or "s p "ol""; metadata have form "key=value".
 */
@Component({
  selector: 'cadmus-mapping-output-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './mapping-output-editor.component.html',
  styleUrls: ['./mapping-output-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingOutputEditorComponent {
  public readonly mappingOutput = model<NodeMappingOutput>();

  public readonly editorClose = output();

  /**
   * The editable draft. `previous` tells the echo of our own save apart
   * from a new output: as saving normalizes the text, rebuilding the draft
   * from the echo would reformat what the user typed.
   */
  private readonly _draft = linkedSignal<
    NodeMappingOutput | undefined,
    MappingOutputControls
  >({
    source: () => this.mappingOutput(),
    computation: (output, previous) =>
      previous &&
      JSON.stringify(output) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(output),
  });

  public readonly form = form(this._draft, (path) => {
    // each line is "key uid [label|tag]" (uid may contain spaces and
    // brackets, as it is a template); blank lines are ignored
    pattern(path.nodes, /^(?:(?:\S+[ \t]+\S[^\r\n]*)?(?:\r?\n|$))+$/);
    maxLength(path.nodes, 5000);
    pattern(path.triples, /^(?:(\S+)\s+(.+?)\s+([^\r\n]+)[\r\n]?)+$/);
    maxLength(path.triples, 5000);
    pattern(path.metadata, /^(?:([^=\r\n]+)=([^\r\n]+)[\r\n]?)+$/);
    maxLength(path.metadata, 5000);
  });

  constructor() {
    // once the draft mirrors the bound output again, clear interaction
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

  /** True when the draft still mirrors the bound output. */
  private isDraftInSync(draft: MappingOutputControls): boolean {
    return JSON.stringify(draft) === JSON.stringify(toDraft(this.mappingOutput()));
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.mappingOutput.set(toData(this._draft()));
    this.form().reset();
  }
}
