import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityApiService, CommunityPostAudience, CommunityPostPurpose } from '../api/community-api.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

const noWhitespace: ValidatorFn = (control): ValidationErrors | null => typeof control.value === 'string' && !control.value.trim() ? { whitespace: true } : null;

@Component({
  selector: 'app-community-post-create-page',
  imports: [CommunityHeaderComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './community-post-create-page.component.html',
  styleUrl: './community-post-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPostCreatePageComponent implements OnInit {
  private readonly api = inject(CommunityApiService);
  private readonly auth = inject(CommunityAuthService);
  private readonly router = inject(Router);

  readonly purposes: Array<{ value: CommunityPostPurpose; label: string; prompt: string; help: string }> = [
    { value: 'ASK', label: 'ASK', prompt: 'What would you like help with?', help: 'Be specific about what you’re looking for so other members can help.' },
    { value: 'OFFER', label: 'OFFER', prompt: 'What can you offer the community?', help: 'Describe the help, expertise, introduction or resource you’re offering.' },
    { value: 'OPPORTUNITY', label: 'OPPORTUNITY', prompt: 'What’s the opportunity?', help: 'Tell members what it is, who it’s for and what they need to do next.' },
    { value: 'UPDATE', label: 'UPDATE', prompt: 'What would you like the community to know?', help: 'Share something relevant about your work, organisation, project or involvement in the community.' },
  ];
  readonly form = new FormGroup({
    purpose: new FormControl<CommunityPostPurpose | null>(null, Validators.required),
    headline: new FormControl('', [Validators.required, noWhitespace, Validators.maxLength(120)]),
    body: new FormControl('', [Validators.required, noWhitespace, Validators.maxLength(2000)]),
    audience: new FormControl<CommunityPostAudience>('ELEVATE_COMMUNITY', { nonNullable: true, validators: Validators.required }),
  });
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly signingOut = signal(false);
  private idempotencyKey: string | null = null;

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => { this.idempotencyKey = null; this.errorMessage.set(null); });
  }

  selectPurpose(purpose: CommunityPostPurpose): void { this.form.controls.purpose.setValue(purpose); this.form.controls.purpose.markAsTouched(); }
  selectedPurpose(): typeof this.purposes[number] | undefined { return this.purposes.find((item) => item.value === this.form.controls.purpose.value); }
  showError(control: keyof typeof this.form.controls): boolean { const field = this.form.controls[control]; return field.invalid && (field.touched || this.submitted()); }
  errorText(control: keyof typeof this.form.controls): string {
    const field = this.form.controls[control];
    if (field.hasError('required') || field.hasError('whitespace')) return control === 'purpose' ? 'Choose a purpose.' : 'This field is required.';
    if (field.hasError('maxlength')) return control === 'headline' ? 'Headline must be 120 characters or fewer.' : 'Body must be 2,000 characters or fewer.';
    return '';
  }
  remaining(control: 'headline' | 'body', maximum: number): number { return maximum - (this.form.controls[control].value?.length ?? 0); }

  publish(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.idempotencyKey ??= this.newIdempotencyKey();
    const value = this.form.getRawValue();
    this.api.createCommunityPost({ purpose: value.purpose!, headline: value.headline!.trim(), body: value.body!.trim(), audience: value.audience }, this.idempotencyKey).subscribe({
      next: (post) => { this.submitting.set(false); void this.router.navigate(['/community/community/post', post.public_id]); },
      error: (error: CommunityApiError) => {
        this.submitting.set(false);
        this.errorMessage.set(error.status === 409 ? 'This post could not be confirmed safely. Please try again.' : error.status === 429 ? 'Community is taking a short pause. Please try again in a moment.' : 'We couldn’t post to Community right now. Please try again.');
      },
    });
  }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({ next: () => void this.router.navigateByUrl('/join'), error: () => this.signingOut.set(false) });
  }

  private newIdempotencyKey(): string { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}
