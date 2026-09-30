import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { NotificationService } from '../shared/ui/notifications/notification.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

type ActivationState = 'form' | 'invalid' | 'unavailable';
type ActivationForm = { password: FormControl<string>; confirm_password: FormControl<string>; };
const numericOnly: ValidatorFn = (control): ValidationErrors | null => typeof control.value === 'string' && control.value.length > 0 && /^\d+$/.test(control.value) ? { numericOnly: true } : null;
const passwordsMatch: ValidatorFn = (control): ValidationErrors | null => {
  const group = control as FormGroup<ActivationForm>;
  return group.controls.password.value === group.controls.confirm_password.value ? null : { mismatch: true };
};

@Component({
  selector: 'app-activate-page', imports: [ReactiveFormsModule, CommunityHeaderComponent],
  templateUrl: './activate-page.component.html', styleUrl: './activate-page.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivatePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router);
  private readonly auth = inject(CommunityAuthService); private readonly notifications = inject(NotificationService);
  readonly activationForm = new FormGroup<ActivationForm>({
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8), numericOnly] }),
    confirm_password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: [passwordsMatch] });
  readonly state = signal<ActivationState>('form'); readonly submitting = signal(false);
  readonly showPassword = signal(false); readonly showConfirmPassword = signal(false);
  readonly serverErrors = signal<Partial<Record<keyof ActivationForm, string>>>({});
  private invitationId = ''; private token = '';

  ngOnInit(): void {
    this.invitationId = this.route.snapshot.paramMap.get('invitationId') ?? '';
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.invitationId || !this.token) this.state.set('invalid');
  }

  submit(): void {
    if (this.submitting()) return;
    this.serverErrors.set({}); this.activationForm.markAllAsTouched();
    if (this.activationForm.invalid || !this.invitationId || !this.token) { this.focusFirstInvalid(); return; }
    const { password, confirm_password } = this.activationForm.getRawValue();
    this.submitting.set(true);
    this.auth.activate(this.invitationId, this.token, password, confirm_password).subscribe({
      next: () => void this.router.navigateByUrl('/community', { replaceUrl: true }), error: (error: CommunityApiError) => this.handleError(error),
    });
  }

  togglePassword(field: 'password' | 'confirm'): void { field === 'password' ? this.showPassword.update((v) => !v) : this.showConfirmPassword.update((v) => !v); }
  passwordError(): string {
    const server = this.serverErrors().password; const control = this.activationForm.controls.password;
    if (server) return server; if (control.hasError('required')) return 'Enter a password.'; if (control.hasError('minlength')) return 'Use at least 8 characters.'; if (control.hasError('numericOnly')) return 'Do not use only numbers.'; return '';
  }
  confirmError(): string {
    const server = this.serverErrors().confirm_password; const control = this.activationForm.controls.confirm_password;
    if (server) return server; if (control.hasError('required')) return 'Confirm your password.'; if (this.activationForm.hasError('mismatch')) return 'The passwords do not match.'; return '';
  }
  hasPasswordError(): boolean { return (this.activationForm.controls.password.invalid && this.activationForm.controls.password.touched) || !!this.serverErrors().password; }
  hasConfirmError(): boolean { return (this.activationForm.controls.confirm_password.invalid && this.activationForm.controls.confirm_password.touched) || !!this.serverErrors().confirm_password; }
  backToElevate(): void { window.location.href = 'https://elevatemk.org/'; }

  private handleError(error: CommunityApiError): void {
    this.submitting.set(false); const body = error.body as Record<string, unknown> | null; const code = body && typeof body['code'] === 'string' ? body['code'] : '';
    if (code === 'INVALID_OR_EXPIRED_ACTIVATION') { void this.router.navigateByUrl('/activate/invalid', { replaceUrl: true }); return; }
    if (code === 'ACCOUNT_SETUP_UNAVAILABLE') { this.state.set('unavailable'); return; }
    if (code === 'PASSWORD_VALIDATION_ERROR') { this.applyServerErrors(body?.['fields']); this.focusFirstInvalid(); return; }
    this.notifications.error("We couldn't complete account setup right now. Please try again.");
  }

  private applyServerErrors(fields: unknown): void {
    if (!fields || typeof fields !== 'object') return;
    const next: Partial<Record<keyof ActivationForm, string>> = {};
    for (const field of ['password', 'confirm_password'] as const) {
      const messages = (fields as Record<string, unknown>)[field];
      if (Array.isArray(messages) && typeof messages[0] === 'string') { next[field] = messages[0]; this.activationForm.controls[field].setErrors({ server: true }); this.activationForm.controls[field].markAsTouched(); }
    }
    this.serverErrors.set(next);
  }
  private focusFirstInvalid(): void { setTimeout(() => { const target = this.activationForm.controls.password.invalid ? 'activation-password' : 'activation-confirm-password'; document.getElementById(target)?.focus(); }); }
}
