import { Component, Inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';

import { MatCardModule } from '@angular/material/card';

import {
  MappingTreeEditorComponent,
  NODE_MAPPING_SERVICE,
  NodeMapping,
  NodeMappingListService,
  NodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

@Component({
  selector: 'app-mapping-editor-page',
  imports: [MatCardModule, MappingTreeEditorComponent],
  templateUrl: './mapping-editor-page.component.html',
  styleUrls: ['./mapping-editor-page.component.css'],
})
export class MappingEditorPageComponent {
  public readonly editedMapping = signal<NodeMapping | undefined>(undefined);

  constructor(
    route: ActivatedRoute,
    @Inject(NODE_MAPPING_SERVICE)
    mappingService: NodeMappingService,
    private _router: Router,
    private _listService: NodeMappingListService
  ) {
    // get mapping from id parameter
    const id = route.snapshot.paramMap.get('id');
    if (id) {
      mappingService
        .getMapping(+id)
        .pipe(take(1))
        .subscribe((m) => {
          this.editedMapping.set(m || undefined);
        });
    }
  }

  public onMappingChange(mapping: NodeMapping): void {
    this._listService.addMapping(mapping);
    this.close();
  }

  public close(): void {
    this._router.navigate(['/']);
  }
}
