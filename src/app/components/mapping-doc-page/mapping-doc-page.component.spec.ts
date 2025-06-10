import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingDocPageComponent } from './mapping-doc-page.component';

describe('MappingDocPageComponent', () => {
  let component: MappingDocPageComponent;
  let fixture: ComponentFixture<MappingDocPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MappingDocPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingDocPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
