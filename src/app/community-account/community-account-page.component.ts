import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CommunityAccountResponse, CommunityAccountService } from '../api/community-account.service';
import { CommunityAuthService } from '../api/community-auth.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

type PasswordChangeForm = {
  current_password: FormControl<string>;
  new_password: FormControl<string>;
  confirm_password: FormControl<string>;
};

const numericOnly: ValidatorFn = (control): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.length > 0 && /^\d+$/.test(control.value)
    ? { numericOnly: true }
    : null;

const passwordsMatch: ValidatorFn = (control): ValidationErrors | null => {
  const form = control as FormGroup<PasswordChangeForm>;
  return form.controls.new_password.value === form.controls.confirm_password.value ? null : { mismatch: true };
};

@Component({
  selector: 'app-community-account-page',
  imports: [CommunityHeaderComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './community-account-page.component.html',
  styleUrl: './community-account-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityAccountPageComponent implements OnInit {
  private readonly accountService = inject(CommunityAccountService);
  private readonly auth = inject(CommunityAuthService);

  readonly account = signal<CommunityAccountResponse | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly signingOut = signal(false);
  readonly changingPassword = signal(false);
  readonly passwordEditorOpen = signal(false);
  readonly passwordSuccess = signal(false);
  readonly passwordSubmitError = signal(false);
  readonly passwordServerErrors = signal<Partial<Record<keyof PasswordChangeForm, string>>>({});
  readonly passwordForm = new FormGroup<PasswordChangeForm>({
    current_password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    new_password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8), numericOnly] }),
    confirm_password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: [passwordsMatch] });

  ngOnInit(): void {
    this.accountService.getAccount().subscribe({
      next: (account) => { this.account.set(account); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  retry(): void { this.loading.set(true); this.loadError.set(false); this.ngOnInit(); }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({ error: () => this.signingOut.set(false) });
  }

  beginPasswordChange(): void {
    this.passwordSuccess.set(false);
    this.passwordSubmitError.set(false);
    this.passwordServerErrors.set({});
    this.passwordSubmitError.set(false);
    this.passwordForm.reset();
    this.passwordEditorOpen.set(true);
  }

  cancelPasswordChange(): void {
    if (this.changingPassword()) return;
    this.passwordForm.reset();
    this.passwordServerErrors.set({});
    this.passwordEditorOpen.set(false);
  }

  submitPasswordChange(): void {
    if (this.changingPassword()) return;
    this.passwordServerErrors.set({});
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) return;
    this.changingPassword.set(true);
    const { current_password, new_password, confirm_password } = this.passwordForm.getRawValue();
    this.accountService.changePassword({ current_password, new_password, confirm_password }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordForm.reset();
        this.passwordEditorOpen.set(false);
        this.passwordSuccess.set(true);
      },
      error: (error: { body?: unknown }) => {
        this.changingPassword.set(false);
        this.applyPasswordServerErrors(error.body);
        const fields = error.body && typeof error.body === 'object' ? (error.body as Record<string, unknown>)['fields'] : null;
        this.passwordSubmitError.set(!fields || typeof fields !== 'object');
      },
    });
  }

  passwordError(field: 'current_password' | 'new_password' | 'confirm_password'): string {
    const server = this.passwordServerErrors()[field];
    const control = this.passwordForm.controls[field];
    if (server) return server;
    if (control.hasError('required')) return field === 'current_password' ? 'Enter your current password.' : field === 'new_password' ? 'Enter a new password.' : 'Confirm your new password.';
    if (field === 'new_password' && control.hasError('minlength')) return 'Use at least 8 characters.';
    if (field === 'new_password' && control.hasError('numericOnly')) return 'Do not use only numbers.';
    if (field === 'confirm_password' && this.hasPasswordMismatch()) return 'Passwords do not match.';
    return '';
  }

  hasPasswordError(field: 'current_password' | 'new_password' | 'confirm_password'): boolean {
    const control = this.passwordForm.controls[field];
    return (control.invalid && control.touched) || !!this.passwordServerErrors()[field] || (field === 'confirm_password' && this.hasPasswordMismatch());
  }

  marketingLabel(state: CommunityAccountResponse['email_marketing']['state']): string {
    return state === 'OPTED_IN' ? 'Subscribed' : state === 'OPTED_OUT' ? 'Unsubscribed' : 'No preference set';
  }

  marketingCopy(state: CommunityAccountResponse['email_marketing']['state']): string {
    return state === 'OPTED_IN'
      ? 'You are subscribed to Elevate MK Community email updates.'
      : state === 'OPTED_OUT'
        ? 'You are not subscribed to Elevate MK Community email updates.'
        : 'You have not set an email marketing preference.';
  }

  private hasPasswordMismatch(): boolean {
    const { new_password, confirm_password } = this.passwordForm.getRawValue();
    return !!new_password && !!confirm_password && this.passwordForm.hasError('mismatch');
  }

  private applyPasswordServerErrors(body: unknown): void {
    const fields = body && typeof body === 'object' ? (body as Record<string, unknown>)['fields'] : null;
    if (!fields || typeof fields !== 'object') return;
    const next: Partial<Record<keyof PasswordChangeForm, string>> = {};
    for (const field of ['current_password', 'new_password', 'confirm_password'] as const) {
      const messages = (fields as Record<string, unknown>)[field];
      if (Array.isArray(messages) && typeof messages[0] === 'string') {
        next[field] = messages[0];
        this.passwordForm.controls[field].setErrors({ server: true });
        this.passwordForm.controls[field].markAsTouched();
      }
    }
    this.passwordServerErrors.set(next);
  }
}
