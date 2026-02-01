import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';

import { EnvService } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  NODE_MAPPING_SERVICE,
  NodeMappingListService,
  NodeMappingService,
  RamCacheService,
} from '@myrmidon/cadmus-mapping-builder';
import { SampleDataService } from './services/sample-data.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  public readonly version = signal<string>('');

  constructor(
    private _router: Router,
    private _dialogService: DialogService,
    private _listService: NodeMappingListService,
    @Inject(NODE_MAPPING_SERVICE) private _mappingService: NodeMappingService,
    private _sampleService: SampleDataService,
    cacheService: RamCacheService,
    envService: EnvService
  ) {
    this.version.set(envService.get('version') || '');

    this._sampleService.json$.pipe(takeUntilDestroyed()).subscribe((json) => {
      // import mappings
      _mappingService.importMappings(json);
      // reset the list
      _listService.reset();
    });

    this._sampleService.presets$
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        // for each property of data (jmes/map)
        for (let key in data) {
          cacheService.add(key, JSON.stringify(data[key], null, 2));
        }
      });
  }

  public clear(): void {
    this._dialogService
      .confirm('WARNING', 'Clear all mappings?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          this._mappingService.clear();
          this._listService.reset();
        }
      });
  }

  public view(): void {
    this._router.navigate(['/mappings-doc']);
  }

  public async export() {
    this._mappingService
      .exportMappings()
      .pipe(take(1))
      .subscribe((json) => {
        // save to file
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mappings.json';
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }
}
