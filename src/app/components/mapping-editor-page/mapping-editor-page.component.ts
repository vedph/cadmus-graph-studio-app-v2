import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, switchMap, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';

import {
  MappingTreeEditorComponent,
  NODE_MAPPING_SERVICE,
  NodeMapping,
  NodeMappingListService,
  NodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

import { SampleDataService } from '../../services/sample-data.service';

@Component({
  selector: 'app-mapping-editor-page',
  imports: [MatCardModule, MappingTreeEditorComponent],
  templateUrl: './mapping-editor-page.component.html',
  styleUrls: ['./mapping-editor-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingEditorPageComponent {
  public readonly editedMapping = signal<NodeMapping | undefined>(undefined);

  constructor(
    route: ActivatedRoute,
    @Inject(NODE_MAPPING_SERVICE)
    mappingService: NodeMappingService,
    private _router: Router,
    private _listService: NodeMappingListService,
    sampleDataService: SampleDataService
  ) {
    // get mapping from id parameter: 0 means a new mapping
    const id = +(route.snapshot.paramMap.get('id') || 0);
    if (!id) {
      this.editedMapping.set({
        id: 0,
        name: 'new mapping',
        sourceType: 1,
        source: '',
        sid: '',
      });
    } else {
      // on a deep link (e.g. a page reload) the mappings may not be
      // imported yet: get the mapping again whenever samples are loaded,
      // until it is found (the app shell imports them before this runs,
      // as it subscribed first)
      sampleDataService.json$
        .pipe(
          switchMap(() => mappingService.getMapping(id).pipe(take(1))),
          filter((m) => !!m),
          take(1),
          takeUntilDestroyed()
        )
        .subscribe((m) => {
          this.editedMapping.set(m!);
        });
    }
  }

  /**
   * Save the mapping whenever the tree editor changes it (also when adding
   * or deleting a child), staying in the editor: the user leaves it by
   * closing it.
   */
  public onMappingChange(mapping: NodeMapping): void {
    this._listService.addMapping(mapping);
  }

  public close(): void {
    this._router.navigate(['/']);
  }
}
