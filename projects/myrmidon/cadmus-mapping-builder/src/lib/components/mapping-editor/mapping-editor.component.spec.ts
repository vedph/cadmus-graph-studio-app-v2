import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingEditorComponent } from './mapping-editor.component';

describe('MappingEditorComponent', () => {
  let component: MappingEditorComponent;
  let fixture: ComponentFixture<MappingEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MappingEditorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
