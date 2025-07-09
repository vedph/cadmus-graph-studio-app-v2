import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingTreeFilterComponent } from './mapping-tree-filter';

describe('MappingTreeFilter', () => {
  let component: MappingTreeFilterComponent;
  let fixture: ComponentFixture<MappingTreeFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MappingTreeFilterComponent]
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
