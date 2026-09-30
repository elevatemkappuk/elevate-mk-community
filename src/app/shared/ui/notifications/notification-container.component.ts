import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notification-container',
  imports: [],
  templateUrl: './notification-container.component.html',
  styleUrl: './notification-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationContainerComponent {
  protected readonly notificationService = inject(NotificationService);

  protected dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }

  protected activateAction(id: number, callback: () => void): void {
    this.notificationService.dismiss(id);
    callback();
  }
}
