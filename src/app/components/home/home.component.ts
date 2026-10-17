import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { ReplaceStringPipe } from '@myrmidon/ngx-tools';
import { NodeMapping } from '@myrmidon/cadmus-mapping-builder';

import {
  MappingFilterComponent,
  MappingListComponent,
} from '@myrmidon/cadmus-mapping-builder';
import { SampleDataService } from '../../services/sample-data.service';

@Component({
  selector: 'app-home',
  imports: [
    FormField,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  public readonly jsonSources = signal<string[]>([
    'person-mappings.json',
    'sample-mappings.json',
  ]);
  public readonly presetSources = signal<string[]>([
    'person-presets.json',
    'sample-presets.json',
  ]);

  /** The selected samples, defaulting to the first ones. */
  public readonly sources = form(
    signal({
      jsonSource: this.jsonSources()[0],
      presetSource: this.presetSources()[0],
    })
  );

  constructor(
    private _router: Router,
    private _sampleDataService: SampleDataService
  ) {
    // load the selected samples (initially and on change), debounced
    toObservable(this.sources().value)
      .pipe(debounceTime(100), takeUntilDestroyed())
      .subscribe(({ jsonSource, presetSource }) => {
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
