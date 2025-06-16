import { Component, effect, model, output } from '@angular/core';
import { take } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { deepCopy } from '@myrmidon/ngx-tools';

import { Mapping, NodeMapping } from '../../models';
import { MappingJsonService } from '../../services/mapping-json.service';
import { MappingTreeComponent } from '../mapping-tree/mapping-tree.component';
import { MappingEditorComponent } from '../mapping-editor/mapping-editor.component';
import { MappingPagedTreeNode } from '../../services/mapping-paged-tree-store.service';

/**
 * The mapping tree editor component. This orchestrates editing a mapping
 * and all its descendants, if any. It composes together a mapping tree
 * component and a mapping editor component. Any edit is in-memory, and
 * is persisted only when the user clicks the Save button for the whole
 * root mapping.
 */
@Component({
  selector: 'cadmus-mapping-tree-editor',
  imports: [MappingTreeComponent, MappingEditorComponent],
  templateUrl: './mapping-tree-editor.component.html',
  styleUrls: ['./mapping-tree-editor.component.css'],
})
export class MappingTreeEditorComponent {
  /**
   * The root mapping to edit. This also sets the currently edited mapping.
   */
  public readonly mapping = model<NodeMapping>();

  /**
   * Emitted when the user requests to close the editor.
   */
  public readonly editorClose = output();

  public editedMapping?: NodeMapping;

  constructor(
    private _jsonService: MappingJsonService,
    private _dialogService: DialogService
  ) {
    effect(() => {
      const mapping = this.mapping();
      this.editedMapping = mapping;
      // if (!mapping) {
      //   this.editedMapping = undefined;
      // } else {
      //   // this._jsonService.visitMappings(mapping);
      //   this.editedMapping = mapping;
      // }
    });
  }

  private findMappingById(
    mapping: NodeMapping,
    id: number
  ): NodeMapping | undefined {
    if (mapping.id === id) {
      return mapping;
    }
    if (mapping.children) {
      for (let child of mapping.children) {
        const found = this.findMappingById(child, id);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  public onMappingEdit(id: number): void {
    this.editedMapping = this.findMappingById(this.mapping()!, id);
  }

  /**
   * Save the specified mapping in its edited tree.
   * @param mapping The mapping to save.
   */
  public onMappingSave(mapping: NodeMapping): void {
    const children = this.editedMapping?.children;
    this.editedMapping = Object.assign(mapping, { children: children });

    // if editing the root, just replace it and relink
    // its children to the new root
    if (!mapping.parent) {
      for (let child of this.mapping()!.children!) {
        child.parent = mapping;
      }
      this.mapping.set(mapping);
    } else {
      // else insert/replace the descendant mapping in the tree
      if (!mapping.id) {
        // insert as last child
        this._jsonService.visitMappings(this.mapping()!, false, (m) => {
          if (m.id === mapping.parent!.id) {
            if (!m.children) {
              m.children = [];
            }
            m.children?.push(mapping);
            mapping.parent = m;
            return false;
          } else {
            return true;
          }
        });
      } else {
        // replace
        this._jsonService.visitMappings(this.mapping()!, false, (m) => {
          if (m.id === mapping.id) {
            // remove the old mapping from m.parent.children
            const siblings: NodeMapping[] = [];
            for (let i = 0; i < m.parent!.children!.length; i++) {
              if (m.parent!.children![i].id === m.id) {
                siblings.push(mapping);
                // update parent of all the children
                for (let child of m.children!) {
                  child.parent = mapping;
                }
              } else {
                siblings.push(m.parent!.children![i]);
              }
            }
            m.parent!.children = siblings;
            return false;
          }
          return true;
        });
      }
    }
  }

  public onMappingDelete(id: number): void {
    // cannot delete the root mapping
    if (id === this.mapping()?.id) {
      return;
    }

    // TODO implement delete

    // this._dialogService
    //   .confirm('Delete', `Delete mapping ${node.mapping!.name}?`)
    //   .pipe(take(1))
    //   .subscribe((yes) => {
    //     if (yes) {
    //       // close edited mapping if it is the one being deleted
    //       if (this.editedMapping?.id === node.mapping!.id) {
    //         this.editedMapping = undefined;
    //       }

    //       // locate the mapping in the mapping() tree and remove it
    //       this._jsonService.visitMappings(this.mapping()!, false, (m) => {
    //         if (m.id === node.mapping!.id) {
    //           // remove the mapping from m.parent.children
    //           const siblings: NodeMapping[] = [];
    //           for (let i = 0; i < m.parent!.children!.length; i++) {
    //             if (m.parent!.children![i].id !== m.id) {
    //               siblings.push(m.parent!.children![i]);
    //             }
    //           }
    //           m.parent!.children = siblings;
    //           return false;
    //         }
    //         return true;
    //       });
    //     }

    //     // update the mapping tree
    //     this.mapping.set({ ...this.mapping()! });
    //   });
  }

  public onMappingAddChild(id: number): void {
    // calculate the max ID by visiting mapping
    // TODO
    // let maxId = 0;
    // this._jsonService.visitMappings(node, false, (m) => {
    //   if (m.id && m.id > maxId) {
    //     maxId = m.id;
    //   }
    //   return true;
    // });
    // edit the new mapping (it will be inserted on save)
    // this.editedMapping = {
    //   id: maxId + 1,
    //   parentId: id,
    //   parent: node.mapping!,
    //   name: 'New mapping',
    //   sourceType: 2,
    //   source: '',
    //   sid: '',
    // };
  }

  public save(): void {
    // TODO
  }

  public close(): void {
    this.editorClose.emit();
  }
}
