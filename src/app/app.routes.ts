import { Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { MappingDocPageComponent } from './components/mapping-doc-page/mapping-doc-page.component';
import { MappingEditorPageComponent } from './components/mapping-editor-page/mapping-editor-page.component';

export const routes: Routes = [
  // editor
  { path: 'mappings/:id', component: MappingEditorPageComponent },
  // doc
  { path: 'mappings-doc', component: MappingDocPageComponent },
  // home
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  // fallback
  { path: '**', component: HomeComponent },
];
