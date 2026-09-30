import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { NotificationService } from '../shared/ui/notifications/notification.service';
import { CommunityAccountShellComponent } from '../shared/ui/account-shell/community-account-shell.component';

type ForgotPasswordForm = { email: FormControl<string>; };

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, CommunityAccountShellComponent],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  private readonly auth = inject(CommunityAuthService);
  private readonly notifications = inject(NotificationService);

  readonly form = new FormGroup<ForgotPasswordForm>({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  readonly submitting = signal(false);
  readonly submitted = signal(false);

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.auth.requestPasswordReset(this.form.controls.email.value).subscribe({
      next: () => this.submitted.set(true),
      error: (_error: CommunityApiError) => {
        this.submitting.set(false);
        this.notifications.error("We couldn't process your request right now. Please try again.");
      },
      complete: () => this.submitting.set(false),
    });
  }
}
