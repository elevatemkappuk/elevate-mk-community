import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationAction {
  label: string;
  callback: () => void;
}

export interface NotificationOptions {
  title?: string;
  duration?: number;
  dismissible?: boolean;
  action?: NotificationAction;
}

export interface CommunityNotification {
  id: number;
  type: NotificationType;
  title?: string;
  message: string;
  duration: number;
  dismissible: boolean;
  action?: NotificationAction;
}

const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 4500,
  error: 0,
  warning: 6000,
  info: 5000,
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationState = signal<CommunityNotification[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly notifications = this.notificationState.asReadonly();

  success(message: string, options: NotificationOptions = {}): number {
    return this.add('success', message, options);
  }

  error(message: string, options: NotificationOptions = {}): number {
    return this.add('error', message, options);
  }

  warning(message: string, options: NotificationOptions = {}): number {
    return this.add('warning', message, options);
  }

  info(message: string, options: NotificationOptions = {}): number {
    return this.add('info', message, options);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.notificationState.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    for (const id of this.timers.keys()) {
      this.dismiss(id);
    }
    this.notificationState.set([]);
  }

  private add(type: NotificationType, message: string, options: NotificationOptions): number {
    const duplicate = this.notificationState().find((item) => item.type === type && item.message === message);
    if (duplicate) {
      return duplicate.id;
    }

    const id = this.nextId++;
    const notification: CommunityNotification = {
      id,
      type,
      title: options.title,
      message,
      duration: options.duration ?? DEFAULT_DURATIONS[type],
      dismissible: options.dismissible ?? true,
      action: options.action,
    };

    const visible = this.notificationState();
    for (const evicted of visible.slice(0, Math.max(0, visible.length - 2))) {
      const timer = this.timers.get(evicted.id);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(evicted.id);
      }
    }
    this.notificationState.set([...visible, notification].slice(-3));
    if (notification.duration > 0) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), notification.duration));
    }
    return id;
  }
}
