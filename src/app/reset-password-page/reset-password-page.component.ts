import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityAccountShellComponent } from '../shared/ui/account-shell/community-account-shell.component';

type ResetPasswordForm = { password: FormControl<string>; confirm_password: FormControl<string>; };
const numericOnly: ValidatorFn = (control): ValidationErrors | null => typeof control.value === 'string' && control.value.length > 0 && /^\d+$/.test(control.value) ? { numericOnly: true } : null;
const passwordsMatch: ValidatorFn = (control): ValidationErrors | null => {
  const form = control as FormGroup<ResetPasswordForm>;
  return form.controls.password.value === form.controls.confirm_password.value ? null : { mismatch: true };
};

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, CommunityAccountShellComponent],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(CommunityAuthService);
  readonly uid = this.route.snapshot.paramMap.get('uid') ?? '';
  readonly token = this.route.snapshot.paramMap.get('token') ?? '';
  readonly form = new FormGroup<ResetPasswordForm>({
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8), numericOnly] }),
    confirm_password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: [passwordsMatch] });
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly invalidLink = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly serverError = signal('');

  submit(): void {
    this.serverError.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.auth.confirmPasswordReset(this.uid, this.token, value.password, value.confirm_password).subscribe({
      next: () => this.success.set(true),
      error: (error: CommunityApiError) => this.handleError(error),
      complete: () => this.submitting.set(false),
    });
  }

  togglePassword(field: 'password' | 'confirm'): void {
    field === 'password' ? this.showPassword.update((value) => !value) : this.showConfirmPassword.update((value) => !value);
  }

  hasMismatch(): boolean {
    const value = this.form.getRawValue();
    return !!value.password && !!value.confirm_password && this.form.hasError('mismatch');
  }

  passwordError(): string {
    const control = this.form.controls.password;
    if (control.hasError('required')) return 'Enter a password.';
    if (control.hasError('minlength')) return 'Use at least 8 characters.';
    if (control.hasError('numericOnly')) return 'Do not use only numbers.';
    return '';
  }

  validationMessages(): string[] {
    const messages = [
      this.form.controls.password.invalid && this.form.controls.password.touched ? this.passwordError() : '',
      this.form.controls.confirm_password.invalid && this.form.controls.confirm_password.touched && !this.hasMismatch() ? 'Confirm your password.' : '',
      this.hasMismatch() ? 'Passwords do not match.' : '',
      this.serverError(),
    ];
    return [...new Set(messages.filter(Boolean))];
  }

  private handleError(error: CommunityApiError): void {
    this.submitting.set(false);
    const body = error.body as Record<string, unknown> | null;
    if (body?.['code'] === 'invalid_password_reset_token') {
      this.invalidLink.set(true);
      return;
    }
    const fields = body?.['new_password'];
    if (Array.isArray(fields) && typeof fields[0] === 'string') {
      this.serverError.set(fields[0]);
      return;
    }
    this.serverError.set('We could not reset your password right now. Please try again.');
  }
}
