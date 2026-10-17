import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

/**
 * Get the specified options, adding the current value when not among them.
 */
function withCurrent(options: string[], current: string | undefined): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}

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
  private readonly _router = inject(Router);
  private readonly _sampleDataService = inject(SampleDataService);

  public readonly jsonSources = signal<string[]>(
    withCurrent(
      ['person-mappings.json', 'sample-mappings.json'],
      this._sampleDataService.mappings()
    )
  );
  public readonly presetSources = signal<string[]>(
    withCurrent(
      ['person-presets.json', 'sample-presets.json'],
      this._sampleDataService.presets()
    )
  );

  /**
   * The selected samples: the ones already loaded, if any (so that coming
   * back here does not reload them over the edited mappings), else the
   * first ones.
   */
  public readonly sources = form(
    signal({
      jsonSource:
        this._sampleDataService.mappings() || this.jsonSources()[0],
      presetSource:
        this._sampleDataService.presets() || this.presetSources()[0],
    })
  );

  constructor() {
    // load the selected samples (initially and on change), debounced;
    // the service does not reload samples already loaded
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
