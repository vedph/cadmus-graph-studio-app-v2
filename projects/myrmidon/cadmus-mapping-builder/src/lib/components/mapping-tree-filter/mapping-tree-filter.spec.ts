import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MappingTreeFilterComponent } from './mapping-tree-filter';
import { NODE_MAPPING_SERVICE } from '../../models';
import { RamNodeMappingService } from '../../services/ram-node-mapping.service';

describe('MappingTreeFilter', () => {
  let component: MappingTreeFilterComponent;
  let fixture: ComponentFixture<MappingTreeFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MappingTreeFilterComponent, NoopAnimationsModule],
      providers: [
        {
          provide: NODE_MAPPING_SERVICE,
          useClass: RamNodeMappingService
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingTreeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
