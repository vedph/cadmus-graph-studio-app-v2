import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, debounceTime, startWith } from 'rxjs';

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
} from '@myrmidon/cadmus-mapping-builder';
import { SampleDataService } from '../../services/sample-data.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  public readonly jsonSources = signal<string[]>([
    'person-mappings.json',
    'sample-mappings.json',
  ]);
  public readonly presetSources = signal<string[]>([
    'person-presets.json',
    'sample-presets.json',
  ]);

  constructor(
    private _router: Router,
    private _sampleDataService: SampleDataService
  ) {
    // set default values to first items
    this.jsonSource.setValue(this.jsonSources()[0]);
    this.presetSource.setValue(this.presetSources()[0]);

    // combine both form control changes with debounce
    combineLatest([
      this.jsonSource.valueChanges.pipe(startWith(this.jsonSource.value)),
      this.presetSource.valueChanges.pipe(startWith(this.presetSource.value)),
    ])
      .pipe(debounceTime(100), takeUntilDestroyed())
      .subscribe(([jsonSource, presetSource]) => {
        if (jsonSource && presetSource) {
          this._sampleDataService.load(jsonSource, presetSource);
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
