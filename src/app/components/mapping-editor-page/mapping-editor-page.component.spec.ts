import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingEditorPageComponent } from './mapping-editor-page.component';

describe('MappingEditorPageComponent', () => {
  let component: MappingEditorPageComponent;
  let fixture: ComponentFixture<MappingEditorPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MappingEditorPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingEditorPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
