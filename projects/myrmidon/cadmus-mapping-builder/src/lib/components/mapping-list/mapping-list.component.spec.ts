import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingListComponent } from './mapping-list.component';

describe('MappingListComponent', () => {
  let component: MappingListComponent;
  let fixture: ComponentFixture<MappingListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MappingListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
