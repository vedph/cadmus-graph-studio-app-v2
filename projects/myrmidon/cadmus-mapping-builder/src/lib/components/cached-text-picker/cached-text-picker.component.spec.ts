import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CachedTextPickerComponent } from './cached-text-picker.component';

describe('CachedTextPickerComponent', () => {
  let component: CachedTextPickerComponent;
  let fixture: ComponentFixture<CachedTextPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CachedTextPickerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CachedTextPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
