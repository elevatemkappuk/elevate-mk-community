import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiSelectComponent } from './multi-select.component';

describe('MultiSelectComponent', () => {
  let fixture: ComponentFixture<MultiSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MultiSelectComponent] }).compileComponents();
    fixture = TestBed.createComponent(MultiSelectComponent);
    fixture.componentRef.setInput('options', [
      { value: 'strategy', label: 'Strategy' },
      { value: 'design', label: 'Design' },
    ]);
    fixture.componentRef.setInput('placeholder', 'Add skills');
    fixture.detectChanges();
  });

  it('selects multiple taxonomy values, filters them, and removes a chip', () => {
    const element = fixture.nativeElement as HTMLElement;
    let value: string[] = [];
    fixture.componentInstance.registerOnChange((next) => (value = next));
    (element.querySelector('.multi-select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    (element.querySelector('[role="option"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(value).toEqual(['strategy']);
    expect(element.querySelector('.selected-chip')?.textContent).toContain('Strategy');
    expect(element.querySelectorAll('[role="option"]').length).toBe(1);

    const search = element.querySelector('.multi-select-search') as HTMLInputElement;
    search.value = 'des';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelector('[role="option"]')?.textContent).toContain('Design');

    (element.querySelector('[aria-label="Remove Strategy"]') as HTMLButtonElement).click();
    expect(value).toEqual([]);
  });

  it('supports keyboard selection and accessible listbox semantics', () => {
    const element = fixture.nativeElement as HTMLElement;
    let value: string[] = [];
    fixture.componentInstance.registerOnChange((next) => (value = next));
    (element.querySelector('.multi-select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    const option = element.querySelector('[role="option"]') as HTMLButtonElement;
    option.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(value).toEqual(['strategy']);
    expect(element.querySelector('[role="listbox"]')?.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('keeps the selector compact and closes the previously open selector', () => {
    const first = fixture.nativeElement as HTMLElement;
    (first.querySelector('.multi-select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(first.querySelector('.multi-select-options')).not.toBeNull();

    const secondFixture = TestBed.createComponent(MultiSelectComponent);
    secondFixture.componentRef.setInput('options', [{ value: 'networking', label: 'Networking' }]);
    secondFixture.componentRef.setInput('placeholder', 'Add interests');
    secondFixture.detectChanges();
    (secondFixture.nativeElement.querySelector('.multi-select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    secondFixture.detectChanges();

    expect(first.querySelector('.multi-select-menu')).toBeNull();
    expect(secondFixture.nativeElement.querySelector('.multi-select-menu')).not.toBeNull();
    expect(secondFixture.nativeElement.querySelector('.multi-select-search')).not.toBeNull();
    expect(secondFixture.nativeElement.querySelector('.multi-select-options')).not.toBeNull();
  });
});
