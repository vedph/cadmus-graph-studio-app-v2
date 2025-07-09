import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JmesComponent } from './jmes.component';

describe('JmesComponent', () => {
  let component: JmesComponent;
  let fixture: ComponentFixture<JmesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ JmesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JmesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
