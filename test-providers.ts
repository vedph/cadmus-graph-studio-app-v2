// Providers added to every test's TestBed environment (see the
// `providersFile` option of the test targets in angular.json).
import { Provider } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';

const providers: Provider[] = [
  // disable Material animations so that dialogs, menus, etc. open and close
  // synchronously in tests
  { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
];

export default providers;
