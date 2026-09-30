import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationContainerComponent } from './notification-container.component';
import { NotificationService } from './notification.service';

describe('NotificationContainerComponent', () => {
  let fixture: ComponentFixture<NotificationContainerComponent>;
  let service: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NotificationContainerComponent] }).compileComponents();
    service = TestBed.inject(NotificationService);
    service.clear();
    fixture = TestBed.createComponent(NotificationContainerComponent);
    fixture.detectChanges();
  });

  it('renders multiple notifications as text with semantic live-region treatment', () => {
    service.success('<strong>Saved</strong>');
    service.error('Failed.');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.notification')).toHaveLength(2);
    expect(host.querySelector('.notification-success')?.textContent).toContain('<strong>Saved</strong>');
    expect(host.querySelector('.notification-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('.notification-error')?.getAttribute('aria-live')).toBe('assertive');
  });

  it('invokes an action and provides an accessible dismiss button', () => {
    let called = false;
    service.error('Try again.', {
      action: { label: 'Retry', callback: () => { called = true; } },
    });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.notification-action') as HTMLButtonElement).click();
    expect(called).toBe(true);
    expect(fixture.nativeElement.querySelector('.notification')).toBeNull();

    service.info('Close me.');
    fixture.detectChanges();
    const close = fixture.nativeElement.querySelector('.notification-dismiss') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Dismiss notification');
    close.click();
    expect(fixture.nativeElement.querySelector('.notification')).toBeNull();
  });
});
