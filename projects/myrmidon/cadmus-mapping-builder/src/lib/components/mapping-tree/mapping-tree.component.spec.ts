import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingTreeComponent } from './mapping-tree.component';

describe('MappingTreeComponent', () => {
  let component: MappingTreeComponent;
  let fixture: ComponentFixture<MappingTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MappingTreeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
