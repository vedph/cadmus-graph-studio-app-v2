import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingOutputEditorComponent } from './mapping-output-editor.component';

describe('MappingOutputEditorComponent', () => {
  let component: MappingOutputEditorComponent;
  let fixture: ComponentFixture<MappingOutputEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MappingOutputEditorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingOutputEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
