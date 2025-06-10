import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NodeMapping } from '@myrmidon/cadmus-mapping-builder';

import {
  MappingFilterComponent,
  MappingListComponent,
} from '../../../../projects/myrmidon/cadmus-mapping-builder/src/public-api';

@Component({
  selector: 'app-home',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    // local
    MappingFilterComponent,
    MappingListComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  constructor(private _router: Router) {}

  public onEditMapping(mapping: NodeMapping): void {
    this._router.navigate(['mappings', mapping.id]);
  }

  public addMapping(): void {
    this._router.navigate(['mappings', 0]);
  }
}
