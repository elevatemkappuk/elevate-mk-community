import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectComponent, SelectOption } from './select.component';

describe('SelectComponent', () => {
  let fixture: ComponentFixture<SelectComponent>;
  let component: SelectComponent;
  const options: SelectOption[] = [
    { value: 'technology', label: 'Technology' },
    { value: 'finance', label: 'Finance' },
    { value: 'health', label: 'Health' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SelectComponent] }).compileComponents();
    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'industry');
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('placeholder', 'Select your industry');
    fixture.componentRef.setInput('searchPlaceholder', 'Search industries');
    fixture.componentRef.setInput('searchable', true);
    fixture.detectChanges();
  });

  it('renders a placeholder and supplied options when opened', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.select-trigger')?.textContent).toContain('Select your industry');
    (element.querySelector('.select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelectorAll('[role="option"]').length).toBe(3);
  });

  it('filters options case-insensitively and reports no matches', () => {
    const element = fixture.nativeElement as HTMLElement;
    (element.querySelector('.select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    const search = element.querySelector('.select-search') as HTMLInputElement;
    search.value = 'FIN';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelectorAll('[role="option"]').length).toBe(1);
    expect(element.querySelector('[role="option"]')?.textContent).toContain('Finance');

    search.value = 'unknown';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelector('.select-empty')?.textContent).toContain('No industries found');
  });

  it('writes the selected value, displays its label, and marks itself touched', () => {
    const element = fixture.nativeElement as HTMLElement;
    let selectedValue = '';
    let touched = false;
    component.registerOnChange((value) => (selectedValue = value));
    component.registerOnTouched(() => (touched = true));
    (element.querySelector('.select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    (element.querySelector('[role="option"]') as HTMLElement).click();
    fixture.detectChanges();

    expect(selectedValue).toBe('technology');
    expect(element.querySelector('.select-trigger')?.textContent).toContain('Technology');
    expect(touched).toBe(true);
  });

  it('supports non-searchable mode and keyboard navigation', () => {
    const element = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('searchable', false);
    fixture.detectChanges();
    const trigger = element.querySelector('.select-trigger') as HTMLButtonElement;

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(element.querySelector('.select-search')).toBeNull();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(element.querySelector('.select-trigger')?.textContent).toContain('Finance');
  });

  it('supports Escape, disabled state, and outside-click closing', () => {
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector('.select-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element.querySelector('.select-menu')).toBeNull();

    trigger.click();
    fixture.detectChanges();
    document.dispatchEvent(new Event('pointerdown'));
    fixture.detectChanges();
    expect(element.querySelector('.select-menu')).toBeNull();

    component.setDisabledState(true);
    fixture.detectChanges();
    expect(trigger.disabled).toBe(true);
  });
});
