import { Component, OnDestroy, effect, inject, input, model, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Observable, Subscription } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';

import {
  BrowserTreeNodeComponent,
  PageChangeRequest,
  PagedTreeStore,
} from '@myrmidon/paged-data-browsers';

import { MappingTreeFilterComponent } from '../mapping-tree-filter/mapping-tree-filter';
import { MappingTreeService } from '../../state/mapping-tree.service';
import {
  MappingTreeFilter,
  MappingPagedTreeNode,
} from '../../services/mapping-paged-tree-store.service';
import { Mapping, NodeMapping } from '../../models';

/**
 * Node mapping tree component. This represents the hierarchy of mappings
 * of a root mapping, allowing users to select any of the mapping descendants,
 * or the root mapping itself; add new children to a mapping; and delete a
 * mapping.
 */
@Component({
  selector: 'cadmus-mapping-tree',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
    // myrmidon
    BrowserTreeNodeComponent,
    // local
    MappingTreeFilterComponent,
  ],
  templateUrl: './mapping-tree.component.html',
  styleUrls: ['./mapping-tree.component.css'],
})
export class MappingTreeComponent implements OnDestroy {
  private readonly _store: PagedTreeStore<MappingPagedTreeNode, MappingTreeFilter>;
  private _dialog = inject(MatDialog);
  private _sub?: Subscription;

  /**
   * The single node mapping whose tree is displayed by this component.
   * This is a nested node mapping. Internally, a tree of flat nodes
   * will be built from it.
   */
  public readonly mapping = input<NodeMapping>();

  public readonly selected = model<Mapping>();

  /**
   * Emitted when the user requests to add a child node to a mapping.
   * The number is the parent mapping ID.
   */
  public readonly mappingAdd = output<number>();

  /**
   * Emitted when the user requests to delete a mapping.
   * The number is the mapping ID.
   */
  public readonly mappingDelete = output<number>();

  public debug: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });
  public mockRoot: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });
  public hideLoc: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });

  public loading?: boolean;
  public filter$: Observable<Readonly<MappingTreeFilter>>;
  public nodes$: Observable<Readonly<MappingPagedTreeNode[]>>;

  constructor(private _service: MappingTreeService) {
    this._store = this._service.store;
    this.nodes$ = this._store.nodes$;
    this.filter$ = this._store.filter$;

    effect(() => {
      const mapping = this.mapping();
      if (mapping) {
        console.log('tree mapping', mapping);
        this._service.reset(mapping.id);
      }
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public reset(): void {
    this.loading = true;
    this._store.reset().finally(() => {
      this.loading = false;
    });
  }

  public onToggleExpanded(node: MappingPagedTreeNode): void {
    this.loading = true;
    if (node.expanded) {
      this._store.collapse(node.id).finally(() => {
        this.loading = false;
      });
    } else {
      this._store.expand(node.id).finally(() => {
        this.loading = false;
      });
    }
  }

  public onPageChangeRequest(request: PageChangeRequest): void {
    this.loading = true;
    this._store
      .changePage(request.node.id, request.paging.pageNumber)
      .finally(() => {
        this.loading = false;
      });
  }

  public onFilterChange(filter: MappingTreeFilter | null | undefined): void {
    console.log('filter change', filter);
    this.loading = true;
    this._store.setFilter(filter || {}).finally(() => {
      this.loading = false;
    });
  }

  public onEditFilterRequest(node: MappingPagedTreeNode): void {
    const dialogRef = this._dialog.open(MappingTreeFilterComponent, {
      data: {
        filter: node.filter,
      },
    });
    dialogRef.afterClosed().subscribe((filter) => {
      // undefined = user dismissed without changes
      if (filter === null) {
        this._store.setNodeFilter(node.id, null);
      } else if (filter) {
        this._store.setNodeFilter(node.id, filter);
      }
    });
  }

  public async expandAll(): Promise<void> {
    await this._store.expandAll();
  }

  public async collapseAll(): Promise<void> {
    await this._store.collapseAll();
  }

  public addChildNode(node: MappingPagedTreeNode): void {
    this.mappingAdd.emit(node.mapping!.id);
  }

  public deleteNode(node: MappingPagedTreeNode): void {
    this.mappingDelete.emit(node.mapping!.id);
  }

  public selectNode(node: MappingPagedTreeNode): void {
    // TODO
  }

  public clear(): void {
    this._store.clear();
  }
}
