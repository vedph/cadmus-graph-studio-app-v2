import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingTreeFilter } from './mapping-tree-filter';

describe('MappingTreeFilter', () => {
  let component: MappingTreeFilter;
  let fixture: ComponentFixture<MappingTreeFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MappingTreeFilter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingTreeFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
