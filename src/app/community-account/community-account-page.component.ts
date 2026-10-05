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

type MobileForm = { mobile: FormControl<string>; phone_region: FormControl<string> };

const numericOnly: ValidatorFn = (control): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.length > 0 && /^\d+$/.test(control.value)
    ? { numericOnly: true }
    : null;

const passwordsMatch: ValidatorFn = (control): ValidationErrors | null => {
  const form = control as FormGroup<PasswordChangeForm>;
  return form.controls.new_password.value === form.controls.confirm_password.value ? null : { mismatch: true };
};

const mobileRegionRequired: ValidatorFn = (control): ValidationErrors | null => {
  const form = control as FormGroup<MobileForm>;
  return form.controls.mobile.value.trim() && !form.controls.phone_region.value ? { phoneRegionRequired: true } : null;
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
  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showPasswordConfirmation = signal(false);
  readonly mobileEditorOpen = signal(false);
  readonly mobileRemoveConfirmationOpen = signal(false);
  readonly savingMobile = signal(false);
  readonly mobileSuccess = signal('');
  readonly mobileSubmitError = signal('');
  readonly mobileServerErrors = signal<Partial<Record<keyof MobileForm, string>>>({});
  readonly mobileForm = new FormGroup<MobileForm>({
    mobile: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone_region: new FormControl('GB', { nonNullable: true }),
  }, { validators: [mobileRegionRequired] });
  readonly phoneRegions = [{ value: 'GB', label: 'GB +44' }];
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
    this.resetPasswordVisibility();
    this.passwordForm.reset();
    this.passwordEditorOpen.set(true);
  }

  cancelPasswordChange(): void {
    if (this.changingPassword()) return;
    this.passwordForm.reset();
    this.resetPasswordVisibility();
    this.passwordServerErrors.set({});
    this.passwordEditorOpen.set(false);
  }

  beginMobileEdit(): void {
    this.mobileEditorOpen.set(true);
    this.mobileRemoveConfirmationOpen.set(false);
    this.mobileSuccess.set('');
    this.mobileSubmitError.set('');
    this.mobileServerErrors.set({});
    this.mobileForm.reset({ mobile: '', phone_region: 'GB' });
  }

  cancelMobileEdit(): void {
    if (this.savingMobile()) return;
    this.mobileEditorOpen.set(false);
    this.mobileServerErrors.set({});
    this.mobileSubmitError.set('');
  }

  saveMobile(): void {
    if (this.savingMobile()) return;
    this.mobileServerErrors.set({});
    this.mobileSubmitError.set('');
    this.mobileForm.markAllAsTouched();
    if (this.mobileForm.invalid) return;
    this.savingMobile.set(true);
    this.accountService.updateMobile(this.mobileForm.getRawValue()).subscribe({
      next: (account) => {
        this.account.set(account);
        this.savingMobile.set(false);
        this.mobileEditorOpen.set(false);
        this.mobileSuccess.set('Your mobile number has been updated.');
      },
      error: (error: { status?: number; body?: unknown }) => {
        this.savingMobile.set(false);
        this.applyMobileServerErrors(error);
      },
    });
  }

  requestMobileRemoval(): void {
    this.mobileEditorOpen.set(false);
    this.mobileRemoveConfirmationOpen.set(true);
    this.mobileSuccess.set('');
    this.mobileSubmitError.set('');
  }

  cancelMobileRemoval(): void {
    if (this.savingMobile()) return;
    this.mobileRemoveConfirmationOpen.set(false);
  }

  confirmMobileRemoval(): void {
    if (this.savingMobile()) return;
    this.savingMobile.set(true);
    this.mobileSubmitError.set('');
    this.accountService.updateMobile({ mobile: '', phone_region: '' }).subscribe({
      next: (account) => {
        this.account.set(account);
        this.savingMobile.set(false);
        this.mobileRemoveConfirmationOpen.set(false);
        this.mobileSuccess.set('Your mobile number has been removed.');
      },
      error: (error: { body?: unknown }) => {
        this.savingMobile.set(false);
        this.applyMobileServerErrors(error);
      },
    });
  }

  mobileError(field: 'mobile' | 'phone_region'): string {
    const server = this.mobileServerErrors()[field];
    if (server) return server;
    if (field === 'mobile' && this.mobileForm.controls.mobile.hasError('required')) return 'Enter a mobile number.';
    if (field === 'phone_region' && this.mobileForm.hasError('phoneRegionRequired')) return 'Choose a country for this number.';
    return '';
  }

  hasMobileError(field: 'mobile' | 'phone_region'): boolean {
    const control = this.mobileForm.controls[field];
    return (control.invalid && control.touched) || !!this.mobileServerErrors()[field] || (field === 'phone_region' && this.mobileForm.hasError('phoneRegionRequired'));
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
        this.resetPasswordVisibility();
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

  togglePassword(field: 'current' | 'new' | 'confirmation'): void {
    if (field === 'current') this.showCurrentPassword.update((visible) => !visible);
    if (field === 'new') this.showNewPassword.update((visible) => !visible);
    if (field === 'confirmation') this.showPasswordConfirmation.update((visible) => !visible);
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

  private resetPasswordVisibility(): void {
    this.showCurrentPassword.set(false);
    this.showNewPassword.set(false);
    this.showPasswordConfirmation.set(false);
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

  private applyMobileServerErrors(error: { status?: number; body?: unknown }): void {
    const body = error.body && typeof error.body === 'object' ? error.body as Record<string, unknown> : null;
    const fields = body?.['fields'];
    if (fields && typeof fields === 'object') {
      const next: Partial<Record<keyof MobileForm, string>> = {};
      for (const field of ['mobile', 'phone_region'] as const) {
        const messages = (fields as Record<string, unknown>)[field];
        if (Array.isArray(messages) && typeof messages[0] === 'string') {
          next[field] = messages[0];
          this.mobileForm.controls[field].setErrors({ server: true });
          this.mobileForm.controls[field].markAsTouched();
        }
      }
      this.mobileServerErrors.set(next);
      return;
    }
    if (error.status === 409 && typeof body?.['detail'] === 'string') {
      this.mobileSubmitError.set(body['detail']);
    } else {
      this.mobileSubmitError.set("We couldn't update your mobile number right now. Please try again.");
    }
  }
}
