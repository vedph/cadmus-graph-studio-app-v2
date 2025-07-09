import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MappingRunnerComponent } from './mapping-runner.component';

describe('MappingRunnerComponent', () => {
  let component: MappingRunnerComponent;
  let fixture: ComponentFixture<MappingRunnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MappingRunnerComponent, NoopAnimationsModule ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MappingRunnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
