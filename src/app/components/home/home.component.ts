import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { ReplaceStringPipe } from '@myrmidon/ngx-tools';
import { NodeMapping } from '@myrmidon/cadmus-mapping-builder';

import {
  MappingFilterComponent,
  MappingListComponent,
} from '../../../../projects/myrmidon/cadmus-mapping-builder/src/public-api';
import { SampleDataService } from '../../services/sample-data.service';

@Component({
  selector: 'app-home',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    ReplaceStringPipe,
    // local
    MappingFilterComponent,
    MappingListComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  public jsonSource: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });
  public presetSource: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  public jsonSources: string[] = [];
  public presetSources: string[] = [];

  constructor(
    private _router: Router,
    private _sampleDataService: SampleDataService
  ) {
    this.jsonSources = ['person-mappings.json', 'sample-mappings.json'];
    this.presetSources = ['sample-presets.json'];

    // Subscribe to form control changes
    this.jsonSource.valueChanges.subscribe((value) => {
      if (value) {
        this._sampleDataService.load(value);
      }
    });

    this.presetSource.valueChanges.subscribe((value) => {
      if (value) {
        this._sampleDataService.load(undefined, value);
      }
    });
  }

  public onEditMapping(mapping: NodeMapping): void {
    this._router.navigate(['mappings', mapping.id]);
  }

  public addMapping(): void {
    this._router.navigate(['mappings', 0]);
  }
}
