import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MappingTreeEditorComponent } from './mapping-tree-editor.component';

describe('MappingTreeEditorComponent', () => {
  let component: MappingTreeEditorComponent;
  let fixture: ComponentFixture<MappingTreeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MappingTreeEditorComponent, NoopAnimationsModule ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
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
