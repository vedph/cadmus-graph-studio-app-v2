import { Provider, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  NGX_MONACO_LOADER_PROVIDER,
  NgxMonacoEditorComponent,
} from '@jean-merelis/ngx-monaco-editor';
import {
  NgxMonacoEditorFakeComponent,
  provideMockMonacoEditor,
} from '@jean-merelis/ngx-monaco-editor/testing';

/**
 * Test helper: replace the Monaco editor (which cannot run in jsdom) with
 * its fake textarea-based counterpart in the specified app components.
 * Call this before rendering the component under test.
 * @param components The components importing NgxMonacoEditorComponent.
 */
export function useFakeMonacoEditor(...components: Type<unknown>[]): void {
  for (const component of components) {
    TestBed.overrideComponent(component, {
      remove: { imports: [NgxMonacoEditorComponent] },
      add: { imports: [NgxMonacoEditorFakeComponent] },
    });
  }
}

/**
 * Test helper: provide the fake Monaco editor configuration, with a mock
 * editor supporting the methods called by the components on init.
 */
export function provideFakeMonacoEditor(): Provider {
  return provideMockMonacoEditor({
    initializedEvent: { editor: { focus: () => {} } as any, monaco: {} },
  });
}

/**
 * Test helper: provide a Monaco loader which never loads, so that real
 * Monaco editors (e.g. inside library components) stay inert in tests.
 */
export function provideInertMonacoLoader(): Provider {
  return {
    provide: NGX_MONACO_LOADER_PROVIDER,
    useValue: { monacoLoaded: () => new Promise(() => {}) },
  };
}
