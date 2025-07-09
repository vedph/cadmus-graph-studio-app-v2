import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MappingEditorComponent } from './mapping-editor.component';

describe('MappingEditorComponent', () => {
  let component: MappingEditorComponent;
  let fixture: ComponentFixture<MappingEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MappingEditorComponent, NoopAnimationsModule ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
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
