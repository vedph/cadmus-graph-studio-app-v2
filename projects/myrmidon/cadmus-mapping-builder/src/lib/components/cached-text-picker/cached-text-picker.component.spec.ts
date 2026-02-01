import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CachedTextPickerComponent } from './cached-text-picker.component';

describe('CachedTextPickerComponent', () => {
  let component: CachedTextPickerComponent;
  let fixture: ComponentFixture<CachedTextPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CachedTextPickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CachedTextPickerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
