import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityApiService, CommunityPost, CommunityPostAudience, CommunityPostPurpose, CommunityPostUpdatePayload } from '../api/community-api.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

const noWhitespace: ValidatorFn = (control): ValidationErrors | null => typeof control.value === 'string' && !control.value.trim() ? { whitespace: true } : null;

@Component({
  selector: 'app-community-post-edit-page',
  imports: [CommunityHeaderComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './community-post-edit-page.component.html',
  styleUrl: './community-post-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPostEditPageComponent implements OnInit {
  private readonly api = inject(CommunityApiService);
  private readonly auth = inject(CommunityAuthService);
  private readonly route = inject(ActivatedRoute);
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
    audience: new FormControl<CommunityPostAudience | null>(null, { validators: Validators.required }),
  });
  readonly post = signal<CommunityPost | null>(null);
  readonly loading = signal(true);
  readonly unavailable = signal(false);
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly signingOut = signal(false);

  ngOnInit(): void {
    const postId = this.route.snapshot.paramMap.get('postId');
    if (!postId) { this.loading.set(false); this.unavailable.set(true); return; }
    this.loadPost(postId);
  }

  selectedPurpose(): typeof this.purposes[number] | undefined { return this.purposes.find((item) => item.value === this.form.controls.purpose.value); }
  selectPurpose(purpose: CommunityPostPurpose): void { if (this.post()?.capabilities.can_edit_purpose) this.form.controls.purpose.setValue(purpose); }
  showError(control: keyof typeof this.form.controls): boolean { const field = this.form.controls[control]; return field.invalid && (field.touched || this.submitted()); }
  errorText(control: keyof typeof this.form.controls): string {
    const field = this.form.controls[control];
    if (field.hasError('required') || field.hasError('whitespace')) return control === 'purpose' ? 'Choose a purpose.' : 'This field is required.';
    if (field.hasError('maxlength')) return control === 'headline' ? 'Headline must be 120 characters or fewer.' : 'Body must be 2,000 characters or fewer.';
    return '';
  }
  remaining(control: 'headline' | 'body', maximum: number): number { return maximum - (this.form.controls[control].value?.length ?? 0); }

  save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting() || !this.post()) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    const payload: CommunityPostUpdatePayload = { headline: value.headline!.trim(), body: value.body!.trim() };
    if (this.post()!.capabilities.can_edit_purpose) payload.purpose = value.purpose!;
    if (this.post()!.capabilities.can_edit_audience) payload.audience = value.audience!;
    this.api.updateCommunityPost(this.post()!.public_id, payload).subscribe({
      next: (post) => { this.submitting.set(false); void this.router.navigate(['/community/community/post', post.public_id]); },
      error: (error: CommunityApiError) => {
        this.submitting.set(false);
        if (error.status === 404 || error.status === 403) { this.unavailable.set(true); return; }
        const errorBody = error.body as { purpose?: unknown } | null;
        if (error.status === 400 && errorBody?.purpose) this.errorMessage.set('This conversation has started, so purpose and audience can no longer be changed.');
        else if (error.status === 429) this.errorMessage.set('Community is taking a short pause. Please try again in a moment.');
        else this.errorMessage.set('We couldn’t save your changes right now. Please try again.');
        if (error.status === 400 && errorBody?.purpose) this.loadPost(this.post()!.public_id);
      },
    });
  }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({ next: () => void this.router.navigateByUrl('/join'), error: () => this.signingOut.set(false) });
  }

  private loadPost(postId: string): void {
    this.loading.set(true);
    this.api.getCommunityPost(postId).subscribe({
      next: (post) => {
        this.post.set(post);
        this.loading.set(false);
        this.unavailable.set(!post.capabilities.can_edit);
        if (post.capabilities.can_edit) {
          this.form.reset({ purpose: post.purpose, headline: post.headline, body: post.body, audience: post.audience });
          post.capabilities.can_edit_purpose ? this.form.controls.purpose.enable() : this.form.controls.purpose.disable();
          post.capabilities.can_edit_audience ? this.form.controls.audience.enable() : this.form.controls.audience.disable();
        }
      },
      error: (error: CommunityApiError) => { this.loading.set(false); this.unavailable.set(error.status === 404 || error.status === 403 || error.status === 0); },
    });
  }
}
