import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingListComponent } from './mapping-list.component';
import { NODE_MAPPING_SERVICE } from '../../models';
import { RamNodeMappingService } from '../../services/ram-node-mapping.service';

describe('MappingListComponent', () => {
  let component: MappingListComponent;
  let fixture: ComponentFixture<MappingListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MappingListComponent],
      providers: [
        {
          provide: NODE_MAPPING_SERVICE,
          useClass: RamNodeMappingService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MappingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
