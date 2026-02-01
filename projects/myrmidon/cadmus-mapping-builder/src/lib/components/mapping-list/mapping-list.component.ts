import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DataPage, FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { NodeMappingListService } from '../../state/node-mapping-list.service';
import { NodeMapping } from '../../models';

@Component({
  selector: 'cadmus-mapping-list',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatProgressBar,
    MatSelectModule,
    MatTooltipModule,
    // myrmidon
    FlatLookupPipe,
  ],
  templateUrl: './mapping-list.component.html',
  styleUrls: ['./mapping-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingListComponent {
  public page$: Observable<DataPage<NodeMapping>>;
  public loading$: Observable<boolean | undefined>;
  public readonly sourceTypes = [
    { id: 0, label: 'any' },
    { id: 1, label: 'item' },
    { id: 2, label: 'part' },
  ];

  public readonly mappingEdit = output<NodeMapping>();

  constructor(
    private _listService: NodeMappingListService,
    private _dialogService: DialogService,
  ) {
    this.page$ = _listService.page$;
    this.loading$ = _listService.loading$;
  }

  public onPageChange(event: PageEvent): void {
    this._listService.setPage(event.pageIndex + 1, event.pageSize);
  }

  public reset(): void {
    this._listService.reset();
  }

  public deleteMapping(mapping: NodeMapping): void {
    this._dialogService
      .confirm(`Delete mapping ${mapping.name}?`, 'Delete')
      .subscribe((yes) => {
        if (yes) {
          this._listService.deleteMapping(mapping.id);
        }
      });
  }

  public editMapping(mapping: NodeMapping): void {
    this.mappingEdit.emit(mapping);
  }
}
