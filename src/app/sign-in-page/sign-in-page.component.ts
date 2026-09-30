import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityAccountShellComponent } from '../shared/ui/account-shell/community-account-shell.component';
import { NotificationService } from '../shared/ui/notifications/notification.service';

type SignInForm = { email: FormControl<string>; password: FormControl<string>; };

@Component({
  selector: 'app-sign-in-page',
  imports: [ReactiveFormsModule, RouterLink, CommunityAccountShellComponent],
  templateUrl: './sign-in-page.component.html',
  styleUrl: './sign-in-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPageComponent {
  private readonly auth = inject(CommunityAuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly signInForm = new FormGroup<SignInForm>({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly credentialError = signal(false);
  readonly accessUnavailable = signal(false);

  submit(): void {
    this.credentialError.set(false);
    this.accessUnavailable.set(false);
    this.signInForm.markAllAsTouched();
    if (this.signInForm.invalid || this.submitting()) return;

    const { email, password } = this.signInForm.getRawValue();
    this.submitting.set(true);
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl('/community', { replaceUrl: true }),
      error: (error: CommunityApiError) => this.handleError(error),
    });
  }

  togglePassword(): void { this.showPassword.update((visible) => !visible); }

  private handleError(error: CommunityApiError): void {
    this.submitting.set(false);
    const body = error.body as Record<string, unknown> | null;
    const code = body && typeof body['code'] === 'string' ? body['code'] : '';
    if (code === 'INVALID_CREDENTIALS') {
      this.credentialError.set(true);
      this.signInForm.controls.password.reset('');
      return;
    }
    if (code === 'COMMUNITY_ACCESS_UNAVAILABLE') {
      this.accessUnavailable.set(true);
      this.signInForm.controls.password.reset('');
      return;
    }
    this.notifications.error("We couldn't sign you in right now. Please try again.");
  }
}
