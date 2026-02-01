import { ChangeDetectionStrategy, Component, effect, model, signal } from '@angular/core';

import { NodeMapping } from '../../models';
import { MappingJsonService } from '../../services/mapping-json.service';
import { MappingTreeComponent } from '../mapping-tree/mapping-tree.component';
import { MappingEditorComponent } from '../mapping-editor/mapping-editor.component';

/**
 * The mapping tree editor component. This orchestrates editing a mapping
 * and all its descendants, if any. It composes together a mapping tree
 * component and a mapping editor component.
 * The tree component displays the mapping tree and allows the user to
 * select the node to edit, delete a node and all its descendants, and
 * add a new child node to a selected node. The tree just requests these
 * operations to this component.
 * The editor component allows the user to edit a mapping node. It is
 * bound to the currently edited mapping node, which is set by the tree.
 * Whenever a change is made to the mapping, this component fires the
 * `mappingChange` event.
 */
@Component({
  selector: 'cadmus-mapping-tree-editor',
  imports: [MappingTreeComponent, MappingEditorComponent],
  templateUrl: './mapping-tree-editor.component.html',
  styleUrls: ['./mapping-tree-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingTreeEditorComponent {
  /**
   * The root mapping to edit. This also sets the currently edited mapping.
   */
  public readonly mapping = model<NodeMapping>();

  /**
   * The mapping's node being edited.
   */
  public readonly editedMapping = signal<NodeMapping | undefined>(undefined);

  constructor(private _jsonService: MappingJsonService) {
    // whenever the mapping changes, update the edited mapping
    // to the root mapping
    effect(() => {
      const mapping = this.mapping();
      this.editedMapping.set(mapping);
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

  /**
   * Deep clone a NodeMapping tree, properly handling parent-child
   * relationships.
   */
  private cloneMappingTree(mapping: NodeMapping): NodeMapping {
    const cloneNode = (
      node: NodeMapping,
      parent?: NodeMapping
    ): NodeMapping => {
      const cloned: NodeMapping = {
        ...node,
        parent: parent,
        children: undefined, // will be set below
      };

      if (node.children) {
        cloned.children = node.children.map((child) =>
          cloneNode(child, cloned)
        );
      }

      return cloned;
    };

    return cloneNode(mapping);
  }

  /**
   * Set the mapping to edit.
   * @param id The ID of the mapping to edit.
   */
  public onMappingEdit(id: number): void {
    const mapping = this.mapping();
    if (!mapping) return;

    this.editedMapping.set(this.findMappingById(mapping, id));
  }

  /**
   * Save the specified mapping in its edited tree.
   * @param mapping The mapping to save.
   */
  public onMappingSave(mapping: NodeMapping): void {
    const currentMapping = this.mapping();
    if (!currentMapping) return; // Add null check

    // clone the entire tree
    const clonedMapping = this.cloneMappingTree(currentMapping);

    if (!mapping.parent && mapping.id === currentMapping.id) {
      // if editing the root, replace it with the new mapping data
      // but keep the existing children structure
      Object.assign(clonedMapping, mapping, {
        children: clonedMapping.children, // Preserve children
      });
    } else {
      if (!mapping.id) {
        // insert as new child
        const parent = this.findMappingById(clonedMapping, mapping.parentId!);
        if (parent) {
          // calculate the max ID in the cloned tree
          let maxId = 0;
          this._jsonService.visitMappings(clonedMapping, false, (m) => {
            if (m.id && m.id > maxId) {
              maxId = m.id;
            }
            return true;
          });

          const newMapping: NodeMapping = {
            ...mapping,
            id: maxId + 1,
            parent: parent,
          };

          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(newMapping);

          // update edited references for new mapping
          this.editedMapping.set(newMapping);
        }
      } else {
        // replace existing mapping
        const existingMapping = this.findMappingById(clonedMapping, mapping.id);
        if (existingMapping) {
          // update the mapping data but preserve parent and children references
          Object.assign(existingMapping, mapping, {
            parent: existingMapping.parent,
            children: existingMapping.children,
          });

          // Update edited reference
          this.editedMapping.set(existingMapping);
        }
      }
    }

    this.mapping.set(clonedMapping);
  }

  /**
   * Delete the mapping with the specified ID and all its descendants.
   */
  public onMappingDelete(id: number): void {
    const currentMapping = this.mapping();
    if (!currentMapping) return; // Add null check

    // cannot delete the root mapping
    if (id === currentMapping.id) {
      return;
    }

    // close edited mapping if it is the one being deleted
    if (this.editedMapping()?.id === id) {
      this.editedMapping.set(undefined);
    }

    // clone the entire tree
    const clonedMapping = this.cloneMappingTree(currentMapping);

    // find the mapping to delete in the cloned tree
    const mappingToDelete = this.findMappingById(clonedMapping, id);
    if (!mappingToDelete || !mappingToDelete.parent) {
      return;
    }

    // remove it from its parent's children array
    const parent = mappingToDelete.parent;
    if (parent.children) {
      parent.children = parent.children.filter((child) => child.id !== id);
    }

    this.mapping.set(clonedMapping);
  }

  // ...existing code...

  public onMappingAddChild(id: number): void {
    const currentMapping = this.mapping();
    if (!currentMapping) return;

    // clone the entire tree
    const clonedMapping = this.cloneMappingTree(currentMapping);

    // find the parent mapping in the cloned tree
    const parent = this.findMappingById(clonedMapping, id);
    if (!parent) {
      return;
    }

    // get an ID for the new mapping
    let newId = this._jsonService.getNextId();

    // create the new mapping
    const newMapping: NodeMapping = {
      id: newId,
      parentId: id,
      parent: parent,
      name: 'New mapping',
      sourceType: 2,
      source: '',
      sid: '',
    };

    // add it to the parent's children
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(newMapping);

    this.mapping.set(clonedMapping);

    // find the mapping in the updated tree to avoid stale references
    const updatedMapping = this.findMappingById(this.mapping()!, newId);
    this.editedMapping.set(updatedMapping);
  }

  public closeEditor(): void {
    this.editedMapping.set(undefined);
  }
}
