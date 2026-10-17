import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MappingTreeFilterComponent } from './mapping-tree-filter';
import { MappingTreeFilter } from '../../services/mapping-paged-tree-store.service';

describe('MappingTreeFilterComponent', () => {
  describe('standalone', () => {
    const setup = async (filter?: MappingTreeFilter) => {
      const filterChange = vi.fn();
      const result = await render(MappingTreeFilterComponent, {
        inputs: { filter },
        on: { filter: filterChange },
      });
      return { ...result, filterChange, user: userEvent.setup() };
    };

    it('should show the filter', async () => {
      await setup({ name: 'event' });
      expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('event');
    });

    it('should be empty without a filter', async () => {
      await setup();
      expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('');
    });

    it('should apply the edited filter', async () => {
      const { user, filterChange } = await setup();
      await user.type(screen.getByRole('textbox', { name: 'name' }), 'birth');
      await user.click(screen.getByRole('button', { name: 'apply filter' }));
      expect(filterChange).toHaveBeenCalledExactlyOnceWith({ name: 'birth' });
    });

    it('should apply an empty filter', async () => {
      const { user, filterChange } = await setup();
      await user.click(screen.getByRole('button', { name: 'apply filter' }));
      expect(filterChange).toHaveBeenCalledWith({ name: undefined });
    });

    it('should reset the filter', async () => {
      const { user, filterChange } = await setup({ name: 'event' });
      await user.click(screen.getByRole('button', { name: 'reset filter' }));
      expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('');
      expect(filterChange).toHaveBeenCalledExactlyOnceWith(undefined);
    });

    it('should apply on Enter', async () => {
      const { user, filterChange } = await setup();
      await user.type(screen.getByRole('textbox', { name: 'name' }), 'b{Enter}');
      expect(filterChange).toHaveBeenCalledExactlyOnceWith({ name: 'b' });
    });

    it('should keep the typed text when the applied filter echoes back', async () => {
      const { user, filterChange } = await setup();
      const name = screen.getByRole('textbox', { name: 'name' });
      await user.type(name, 'ab ');
      await user.click(screen.getByRole('button', { name: 'apply filter' }));
      await user.type(name, 'c');
      expect(name).toHaveValue('ab c');
      await user.click(screen.getByRole('button', { name: 'apply filter' }));
      expect(filterChange).toHaveBeenLastCalledWith({ name: 'ab c' });
    });

    it('should clear typed text on reset without a filter', async () => {
      const { user } = await setup();
      const name = screen.getByRole('textbox', { name: 'name' });
      await user.type(name, 'x');
      await user.click(screen.getByRole('button', { name: 'reset filter' }));
      expect(name).toHaveValue('');
    });

    it('should render no <form> element', async () => {
      const { container } = await setup();
      expect(container.querySelector('form')).toBeNull();
    });

    it('should update when the bound filter changes', async () => {
      const { rerender } = await setup({ name: 'a' });
      await rerender({ inputs: { filter: { name: 'b' } }, partialUpdate: true });
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('b')
      );
    });
  });

  describe('in a dialog', () => {
    const setup = async (data: unknown) => {
      const dialogRef = { close: vi.fn() };
      await render(MappingTreeFilterComponent, {
        providers: [
          { provide: MatDialogRef, useValue: dialogRef },
          { provide: MAT_DIALOG_DATA, useValue: data },
        ],
      });
      return { dialogRef, user: userEvent.setup() };
    };

    it('should show the filter from the dialog data', async () => {
      await setup({ filter: { name: 'event' } });
      expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('event');
    });

    it('should work without dialog data', async () => {
      await setup(null);
      expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('');
    });

    it('should close with the applied filter', async () => {
      const { user, dialogRef } = await setup({ filter: { name: 'a' } });
      const name = screen.getByRole('textbox', { name: 'name' });
      await user.clear(name);
      await user.type(name, 'b');
      await user.click(screen.getByRole('button', { name: 'apply filter' }));
      expect(dialogRef.close).toHaveBeenCalledExactlyOnceWith({ name: 'b' });
    });

    it('should close with null when reset', async () => {
      const { user, dialogRef } = await setup({ filter: { name: 'a' } });
      await user.click(screen.getByRole('button', { name: 'reset filter' }));
      expect(dialogRef.close).toHaveBeenCalledExactlyOnceWith(null);
    });
  });
});
