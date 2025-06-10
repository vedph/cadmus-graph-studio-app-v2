import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingTreeEditorComponent } from './mapping-tree-editor.component';

describe('MappingTreeEditorComponent', () => {
  let component: MappingTreeEditorComponent;
  let fixture: ComponentFixture<MappingTreeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MappingTreeEditorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingTreeEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
