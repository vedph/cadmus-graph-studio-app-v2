import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { firstValueFrom } from 'rxjs';

import { NgxMonacoEditorFakeHarness } from '@jean-merelis/ngx-monaco-editor/testing';
import {
  NODE_MAPPING_SERVICE,
  NodeMappingListService,
  RamNodeMappingService,
} from '@myrmidon/cadmus-mapping-builder';

import { MappingDocPageComponent } from './mapping-doc-page.component';
import {
  provideFakeMonacoEditor,
  useFakeMonacoEditor,
} from '../../../testing/monaco-testing';

const DOC = {
  documentMappings: [
    { name: 'beta', sourceType: 1, source: 'b', sid: 'b' },
    { name: 'alpha', sourceType: 2, source: 'a', sid: 'a' },
  ],
};

describe('MappingDocPageComponent', () => {
  const setup = async () => {
    useFakeMonacoEditor(MappingDocPageComponent);
    const result = await render(MappingDocPageComponent, {
      providers: [
        provideFakeMonacoEditor(),
        { provide: NODE_MAPPING_SERVICE, useExisting: RamNodeMappingService },
      ],
      configureTestBed: (testBed) => {
        testBed
          .inject(RamNodeMappingService)
          .importMappings(JSON.stringify(DOC))
          .subscribe();
      },
    });
    const loader = TestbedHarnessEnvironment.loader(result.fixture);
    const editor = await loader.getHarness(NgxMonacoEditorFakeHarness);
    const ram = TestBed.inject(RamNodeMappingService);
    return { ...result, editor, ram, user: userEvent.setup() };
  };

  /** Replace the editor's text (the fake harness only appends). */
  const setText = async (
    user: ReturnType<typeof userEvent.setup>,
    editor: NgxMonacoEditorFakeHarness,
    text: string
  ) => {
    await user.clear(screen.getByRole('textbox'));
    if (text) {
      await editor.setValue(text);
    }
  };

  const importButton = () =>
    screen.getByRole('button', { name: /import from doc/ });

  const storedNames = async (ram: RamNodeMappingService) =>
    (await firstValueFrom(ram.getMappings({}, 1, 0))).items.map((m) => m.name);

  it('should show the exported mappings document', async () => {
    const { editor } = await setup();
    const doc = JSON.parse(await editor.getText());
    expect(doc.documentMappings.map((m: any) => m.name)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('should import the edited document', async () => {
    const { editor, ram, user } = await setup();
    const list = TestBed.inject(NodeMappingListService);
    const reset = vi.spyOn(list, 'reset');

    await setText(
      user,
      editor,
      JSON.stringify({
        documentMappings: [{ name: 'gamma', sourceType: 1, source: 'g', sid: 'g' }],
      })
    );
    await user.click(importButton());

    expect(await storedNames(ram)).toEqual(['gamma']);
    expect(reset).toHaveBeenCalled();
    expect(
      await screen.findByText('Mappings imported: 1')
    ).toBeInTheDocument();
  });

  it('should report an invalid mappings document', async () => {
    const { editor, ram, user } = await setup();

    await setText(
      user,
      editor,
      JSON.stringify({
        documentMappings: [
          {
            name: 'bad',
            sourceType: 1,
            source: 'x',
            sid: 'x',
            output: { triples: ['not-a-triple'] },
          },
        ],
      })
    );
    await user.click(importButton());

    expect(
      await screen.findByText(/Error importing mappings: Invalid triple format/)
    ).toBeInTheDocument();
    // the store is unchanged
    expect(await storedNames(ram)).toEqual(['alpha', 'beta']);
  });

  it('should disable import for invalid JSON', async () => {
    const { editor, user } = await setup();
    await setText(user, editor, '{not json');
    await waitFor(() => expect(importButton()).toBeDisabled());
  });

  it('should require some text', async () => {
    const { editor, user } = await setup();
    await setText(user, editor, '');
    expect(await screen.findByText('please enter some text')).toBeInTheDocument();
    expect(importButton()).toBeDisabled();
  });

  it('should refresh the document from the store', async () => {
    const { editor, ram, user } = await setup();
    await firstValueFrom(ram.clear());

    await user.click(screen.getByRole('button', { name: /export in doc/ }));

    expect(JSON.parse(await editor.getText())).toEqual({ documentMappings: [] });
  });
});
