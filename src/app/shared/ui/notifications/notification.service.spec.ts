import { TestBed } from '@angular/core/testing';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = TestBed.inject(NotificationService);
    service.clear();
  });

  it('creates each supported notification type with unique ids', () => {
    const successId = service.success('Saved.');
    const errorId = service.error('Something went wrong.');
    const warningId = service.warning('Check this first.');
    const infoId = service.info('A new update is available.');

    expect(service.notifications().map((item) => item.type)).toEqual(['success', 'error', 'warning', 'info']);
    expect(new Set([successId, errorId, warningId, infoId]).size).toBe(4);
  });

  it('supports configured duration and keeps action notifications until dismissed', () => {
    service.success('Short notice.', { duration: 12000 });
    service.error('Retryable failure.', {
      duration: 0,
      action: { label: 'Try again', callback: () => undefined },
    });

    expect(service.notifications()[0].duration).toBe(12000);
    expect(service.notifications()[1].action?.label).toBe('Try again');
  });

  it('dismisses individual notifications and clears the bounded collection', () => {
    const id = service.info('Dismiss me.');
    service.dismiss(id);
    expect(service.notifications()).toEqual([]);

    service.success('One');
    service.warning('Two');
    service.error('Three');
    service.info('Four');
    expect(service.notifications()).toHaveLength(3);
    service.clear();
    expect(service.notifications()).toEqual([]);
  });

  it('does not add an identical visible notification twice', () => {
    const first = service.info('Only once.');
    const second = service.info('Only once.');

    expect(second).toBe(first);
    expect(service.notifications()).toHaveLength(1);
  });
});
