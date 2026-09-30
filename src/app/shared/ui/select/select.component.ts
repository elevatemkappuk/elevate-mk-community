import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  forwardRef,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

type MenuPlacement = 'above' | 'below';

@Component({
  selector: 'app-select',
  standalone: true,
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  private static nextId = 0;

  @Input() id = '';
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Select an option';
  @Input() searchPlaceholder = 'Search';
  @Input() noResultsText = 'No options found';
  @Input() searchable = false;
  @Input() required = false;
  @Input() invalid = false;
  @Input() describedBy = '';
  @Input() set disabled(value: boolean) {
    this.setDisabledState(value);
  }

  @ViewChild('trigger', { static: true }) private readonly trigger?: ElementRef<HTMLElement>;
  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;

  protected readonly isOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly activeIndex = signal(-1);
  protected readonly placement = signal<MenuPlacement>('below');

  private value = '';
  private readonly generatedId = `community-select-${SelectComponent.nextId++}`;
  protected isDisabled = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  protected get selectedOption(): SelectOption | undefined {
    return this.options.find((option) => option.value === this.value);
  }

  protected get filteredOptions(): SelectOption[] {
    const term = this.searchTerm().trim().toLocaleLowerCase();
    return term
      ? this.options.filter((option) => option.label.toLocaleLowerCase().includes(term))
      : this.options;
  }

  protected get activeOptionId(): string | null {
    const option = this.filteredOptions[this.activeIndex()];
    return option ? this.optionId(option.value) : null;
  }

  protected get controlId(): string {
    return this.id || this.generatedId;
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    if (isDisabled) {
      this.close();
    }
  }

  protected open(): void {
    if (this.isDisabled || this.isOpen()) {
      return;
    }

    this.placement.set(this.getPlacement());
    this.searchTerm.set('');
    this.activeIndex.set(this.selectedOption ? this.options.indexOf(this.selectedOption) : 0);
    this.isOpen.set(true);

    if (this.searchable) {
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
  }

  protected close(): void {
    if (!this.isOpen()) {
      return;
    }

    this.isOpen.set(false);
    this.searchTerm.set('');
    this.activeIndex.set(-1);
    this.onTouched();
  }

  protected toggle(): void {
    this.isOpen() ? this.close() : this.open();
  }

  protected choose(option: SelectOption): void {
    this.value = option.value;
    this.onChange(option.value);
    this.close();
    this.trigger?.nativeElement.focus();
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key === 'Enter' && this.isOpen()) {
      event.preventDefault();
      const option = this.filteredOptions[this.activeIndex()];
      if (option) {
        this.choose(option);
      }
      return;
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.isOpen()) {
        this.moveActive(event.key === 'ArrowUp' ? -1 : 1);
      } else {
        this.open();
        if (event.key === 'ArrowUp') {
          this.activeIndex.set(this.options.length - 1);
        }
      }
    }
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(event.key === 'ArrowUp' ? -1 : 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = this.filteredOptions[this.activeIndex()];
      if (option) {
        this.choose(option);
      }
    }
  }

  protected moveActive(direction: number): void {
    const options = this.filteredOptions;
    if (!options.length) {
      this.activeIndex.set(-1);
      return;
    }

    const current = this.activeIndex() < 0 ? (direction > 0 ? 0 : options.length - 1) : this.activeIndex() + direction;
    this.activeIndex.set((current + options.length) % options.length);
  }

  protected optionId(value: string): string {
    return `${this.controlId}-option-${value.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }

  private getPlacement(): MenuPlacement {
    const rect = this.trigger?.nativeElement.getBoundingClientRect();
    if (!rect) {
      return 'below';
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    return spaceBelow < 280 && spaceAbove > spaceBelow ? 'above' : 'below';
  }

  @HostListener('document:pointerdown', ['$event'])
  protected onDocumentPointerdown(event: PointerEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
