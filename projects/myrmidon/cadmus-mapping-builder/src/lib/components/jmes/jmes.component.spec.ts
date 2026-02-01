import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { JmesComponent } from './jmes.component';

describe('JmesComponent', () => {
  let component: JmesComponent;
  let fixture: ComponentFixture<JmesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JmesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(JmesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
