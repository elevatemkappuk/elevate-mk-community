import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild,
  forwardRef,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { SelectOption } from '../select/select.component';

@Component({
  selector: 'app-multi-select',
  standalone: true,
  templateUrl: './multi-select.component.html',
  styleUrl: './multi-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MultiSelectComponent), multi: true }],
})
export class MultiSelectComponent implements ControlValueAccessor, OnDestroy {
  private static nextId = 0;
  private static activeInstance: MultiSelectComponent | null = null;
  @Input() id = '';
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Add items';
  @Input() searchPlaceholder = 'Search';
  @Input() noResultsText = 'No options found';
  @Input() removeLabel = 'Remove';
  @Input() set disabled(value: boolean) { this.isDisabled = value; if (value) this.close(); }

  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;
  protected readonly isOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected isDisabled = false;
  private values: string[] = [];
  private readonly generatedId = `community-multi-select-${MultiSelectComponent.nextId++}`;
  private onChange: (value: string[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnDestroy(): void {
    if (MultiSelectComponent.activeInstance === this) MultiSelectComponent.activeInstance = null;
  }

  protected get controlId(): string { return this.id || this.generatedId; }
  protected get selectedOptions(): SelectOption[] { return this.values.map((value) => this.options.find((option) => option.value === value)).filter((option): option is SelectOption => !!option); }
  protected get filteredOptions(): SelectOption[] {
    const term = this.searchTerm().trim().toLocaleLowerCase();
    return this.options.filter((option) => !this.values.includes(option.value) && (!term || option.label.toLocaleLowerCase().includes(term)));
  }
  protected isSelected(value: string): boolean { return this.values.includes(value); }

  writeValue(value: string[] | null): void { this.values = [...(value ?? [])]; }
  registerOnChange(fn: (value: string[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; if (isDisabled) this.close(); }

  protected open(): void {
    if (this.isDisabled) return;
    MultiSelectComponent.activeInstance?.closeFromPeer();
    MultiSelectComponent.activeInstance = this;
    this.searchTerm.set('');
    this.isOpen.set(true);
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  private closeFromPeer(): void {
    this.isOpen.set(false);
    this.searchTerm.set('');
  }

  protected close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.searchTerm.set('');
    if (MultiSelectComponent.activeInstance === this) MultiSelectComponent.activeInstance = null;
    this.onTouched();
  }

  protected toggle(): void { this.isOpen() ? this.close() : this.open(); }

  protected choose(option: SelectOption): void {
    if (this.isSelected(option.value)) return;
    this.values = [...this.values, option.value];
    this.onChange([...this.values]);
    this.searchTerm.set('');
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  protected remove(value: string): void {
    this.values = this.values.filter((item) => item !== value);
    this.onChange([...this.values]);
  }

  protected onOptionKeydown(event: KeyboardEvent, option: SelectOption): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.choose(option);
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  protected onDocumentPointerdown(event: PointerEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) this.close();
  }
}
