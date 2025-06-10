import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingRunnerComponent } from './mapping-runner.component';

describe('MappingRunnerComponent', () => {
  let component: MappingRunnerComponent;
  let fixture: ComponentFixture<MappingRunnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MappingRunnerComponent ]
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
