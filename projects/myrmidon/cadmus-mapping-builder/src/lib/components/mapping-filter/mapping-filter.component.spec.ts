import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MappingFilterComponent } from './mapping-filter.component';
import { NODE_MAPPING_SERVICE } from '../../models';
import { RamNodeMappingService } from '../../services/ram-node-mapping.service';

describe('MappingFilterComponent', () => {
  let component: MappingFilterComponent;
  let fixture: ComponentFixture<MappingFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MappingFilterComponent, NoopAnimationsModule ],
      providers: [
        {
          provide: NODE_MAPPING_SERVICE,
          useClass: RamNodeMappingService,
        },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
