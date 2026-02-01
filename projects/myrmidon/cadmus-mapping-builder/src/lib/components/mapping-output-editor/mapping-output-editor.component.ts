import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  model,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MappedNode, NodeMappingOutput } from '../../models';
import { MappedTriple } from '../../models';

/**
 * Node mapping output editor. This allows the user to edit the output in text
 * boxes, where each line is an entry; nodes have form "key uid [label|tag]";
 * triples have form "s p o" or "s p "ol""; metadata have form "key=value".
 */
@Component({
  selector: 'cadmus-mapping-output-editor',
  imports: [
    ReactiveFormsModule,
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

  public nodes: FormControl<string | null>;
  public triples: FormControl<string | null>;
  public metadata: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder, private _cdr: ChangeDetectorRef) {
    this.nodes = formBuilder.control(null, [
      Validators.pattern(
        /^(?:(\S+)\s*(\S+)\s+([^[\r\n]+)(?:\[([^\]]+)\])?[\r\n]?)+$/
      ),
      Validators.maxLength(5000),
    ]);
    this.triples = formBuilder.control(null, [
      Validators.pattern(/^(?:(\S+)\s+(.+?)\s+([^\r\n]+)[\r\n]?)+$/),
      Validators.maxLength(5000),
    ]);
    this.metadata = formBuilder.control(null, [
      Validators.pattern(/^(?:([^=\r\n]+)=([^\r\n]+)[\r\n]?)+$/),
      Validators.maxLength(5000),
    ]);
    this.form = formBuilder.group({
      nodes: this.nodes,
      triples: this.triples,
      metadata: this.metadata,
    });

    effect(() => {
      this.updateForm(this.mappingOutput());
    });
  }

  //#region helpers
  private parseNode(
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

  private parseNodes(
    text: string | null | undefined
  ): { [key: string]: MappedNode } | null {
    if (!text) {
      return null;
    }
    return text
      .split('\n')
      .map((s) => this.parseNode(s))
      .filter((kv) => kv !== null)
      .reduce((p, c) => {
        p[c!.key] = c!.value;
        return p;
      }, {} as { [key: string]: MappedNode });
  }

  private nodeToString(key: string, node: MappedNode | null): string | null {
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

  private parseTriple(text: string | null | undefined): MappedTriple | null {
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

  private parseTriples(text: string | null | undefined): MappedTriple[] | null {
    if (!text) {
      return null;
    }
    return text
      .split('\n')
      .map((s) => this.parseTriple(s))
      .filter((t) => t !== null) as MappedTriple[];
  }

  private tripleToString(triple: MappedTriple | null): string | null {
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

  private parseMetadatum(
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

  private parseMetadata(
    text: string | null | undefined
  ): { [key: string]: string } | null {
    if (!text) {
      return null;
    }
    return text
      .split('\n')
      .map((s) => this.parseMetadatum(s))
      .filter((kv) => kv !== null)
      .reduce((p, c) => {
        p[c!.key] = c!.value;
        return p;
      }, {} as { [key: string]: string });
  }

  private metadataToString(
    metadata: { [key: string]: string } | null | undefined
  ): string | null {
    return metadata
      ? Object.keys(metadata)
          .map((k) => `${k}=${metadata[k]}`)
          .join('\n')
      : null;
  }
  //#endregion

  private updateForm(output: NodeMappingOutput | undefined): void {
    if (!output) {
      this.form.reset();
      this._cdr.markForCheck();
      return;
    }
    // nodes
    this.nodes.setValue(
      output.nodes
        ? Object.keys(output.nodes)
            .map((k) => this.nodeToString(k, output.nodes![k]))
            .join('\n')
        : null
    );
    // triples
    this.triples.setValue(
      output.triples
        ? output.triples.map((t) => this.tripleToString(t)).join('\n')
        : null
    );
    // metadata
    this.metadata.setValue(this.metadataToString(output.metadata));
    this._cdr.markForCheck();
  }

  private getOutput(): NodeMappingOutput {
    return {
      nodes: this.parseNodes(this.nodes.value) || undefined,
      triples: this.parseTriples(this.triples.value) || undefined,
      metadata: this.parseMetadata(this.metadata.value) || undefined,
    };
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    this.mappingOutput.set(this.getOutput());
  }
}
