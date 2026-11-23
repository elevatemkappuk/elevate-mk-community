import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

type VerificationState = 'loading' | 'success' | 'invalid' | 'error';

@Component({
  selector: 'app-community-email-change-verify-page',
  standalone: true,
  imports: [RouterLink, CommunityHeaderComponent],
  templateUrl: './community-email-change-verify-page.component.html',
  styleUrl: './community-email-change-verify-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityEmailChangeVerifyPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly auth = inject(CommunityAuthService);

  readonly state = signal<VerificationState>('loading');
  readonly detail = signal('');
  private verificationStarted = false;
  private requestId = '';
  private token = '';

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('requestId') ?? '';
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.verify();
  }

  retry(): void {
    this.verificationStarted = false;
    this.state.set('loading');
    this.verify();
  }

  private verify(): void {
    if (this.verificationStarted) return;
    this.verificationStarted = true;
    if (!this.requestId || !this.token) {
      this.showResult('invalid');
      return;
    }
    this.auth.verifyEmailChange(this.requestId, this.token).subscribe({
      next: (response) => {
        this.auth.clearCurrentUser();
        this.detail.set(response.detail);
        this.showResult('success');
      },
      error: (error: CommunityApiError) => {
        this.showResult(error.status === 400 ? 'invalid' : 'error');
      },
    });
  }

  private showResult(state: Exclude<VerificationState, 'loading'>): void {
    this.state.set(state);
    this.location.replaceState('/community/account/verify-email/result');
  }
}
