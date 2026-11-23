import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CommunityApiError, CommunityAuthService, CommunityUser } from '../api/community-auth.service';
import { CommunityApiService, CommunityPost, ConnectionRequestRecord } from '../api/community-api.service';
import { CommunityProfileResponse, CommunityProfileService } from '../api/community-profile.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';
import { CommunityConnectionCardComponent } from '../community-directory/community-connection-card.component';
import { ProfileAvatarComponent } from '../shared/ui/profile-avatar/profile-avatar.component';
import { CommunityPostCardComponent } from '../community-feed/community-post-card.component';

@Component({ selector: 'app-community-home-page', imports: [CommunityHeaderComponent, CommunityConnectionCardComponent, CommunityPostCardComponent, ProfileAvatarComponent, RouterLink], templateUrl: './community-home-page.component.html', styleUrl: './community-home-page.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class CommunityHomePageComponent implements OnInit {
  private readonly auth = inject(CommunityAuthService);
  private readonly api = inject(CommunityApiService);
  private readonly profileService = inject(CommunityProfileService);
  private readonly router = inject(Router);

  readonly user = signal<CommunityUser | null>(null);
  readonly profile = signal<CommunityProfileResponse | null>(null);
  readonly profileLoading = signal(true);
  readonly profileError = signal(false);
  readonly signingOut = signal(false);
  readonly requests = signal<ConnectionRequestRecord[]>([]);
  readonly requestsLoading = signal(true);
  readonly requestsError = signal<string | null>(null);
  readonly activeAction = signal<{ id: string; action: 'accept' | 'decline' } | null>(null);
  readonly communityPosts = signal<CommunityPost[]>([]);
  readonly communityPostsLoading = signal(true);
  readonly communityPostsError = signal(false);

  ngOnInit(): void {
    this.user.set(this.auth.currentUser());
    this.loadProfile();
    this.loadRequests();
    this.loadCommunityPosts();
  }

  signOut(): void { if (this.signingOut()) return; this.signingOut.set(true); this.auth.logout().subscribe({ next: () => this.router.navigateByUrl('/join'), error: () => this.signingOut.set(false) }); }

  accept(connectionId: string): void { this.mutate(connectionId, 'accept'); }
  decline(connectionId: string): void { this.mutate(connectionId, 'decline'); }

  cardLoadingAction(connectionId: string): 'accept' | 'decline' | null {
    const action = this.activeAction();
    return action?.id === connectionId ? action.action : null;
  }

  retryRequests(): void { this.loadRequests(); }

  retryProfile(): void { this.loadProfile(); }
  retryCommunityPosts(): void { this.loadCommunityPosts(); }

  isProfileIncomplete(profile: CommunityProfileResponse): boolean {
    return Object.values(profile.completion).some((complete) => !complete);
  }

  profileCompletionItems(profile: CommunityProfileResponse): Array<{ label: string; complete: boolean }> {
    return [
      { label: 'Name', complete: profile.completion.name },
      { label: 'Professional details', complete: profile.completion.professional_details },
      { label: 'Bio', complete: profile.completion.bio },
      { label: 'Skills', complete: profile.completion.skills },
      { label: 'Interests', complete: profile.completion.interests },
    ];
  }

  completedProfileCount(profile: CommunityProfileResponse): number {
    return this.profileCompletionItems(profile).filter((item) => item.complete).length;
  }

  profileCompletionPercent(profile: CommunityProfileResponse): number {
    return Math.round((this.completedProfileCount(profile) / 5) * 100);
  }

  private loadProfile(): void {
    this.profileLoading.set(true);
    this.profileError.set(false);
    this.profileService.getProfile().subscribe({
      next: (profile) => { this.profile.set(profile); this.profileLoading.set(false); },
      error: () => { this.profileLoading.set(false); this.profileError.set(true); },
    });
  }

  private loadRequests(): void {
    this.requestsLoading.set(true);
    this.requestsError.set(null);
    this.api.getConnectionRequests('incoming', 1, 3).subscribe({
      next: (response) => {
        this.requests.set(response.results.slice(0, 3));
        this.requestsLoading.set(false);
      },
      error: (error: CommunityApiError) => {
        this.requestsLoading.set(false);
        this.requestsError.set(error.status === 429
          ? 'Requests are taking a short pause. Please try again.'
          : 'Connection requests are temporarily unavailable.');
      },
    });
  }

  private loadCommunityPosts(): void {
    this.communityPostsLoading.set(true);
    this.communityPostsError.set(false);
    this.api.getCommunityPosts({ page: 1 }).subscribe({
      next: (response) => { this.communityPosts.set(response.results.slice(0, 3)); this.communityPostsLoading.set(false); },
      error: () => { this.communityPosts.set([]); this.communityPostsLoading.set(false); this.communityPostsError.set(true); },
    });
  }

  private mutate(connectionId: string, action: 'accept' | 'decline'): void {
    if (this.activeAction()) return;
    this.activeAction.set({ id: connectionId, action });
    this.requestsError.set(null);
    const request$ = action === 'accept' ? this.api.acceptConnection(connectionId) : this.api.declineConnection(connectionId);
    request$.pipe(finalize(() => this.activeAction.set(null))).subscribe({
      next: () => this.loadRequests(),
      error: (error: CommunityApiError) => {
        if (error.status === 409 || error.status === 404) {
          this.loadRequests();
          this.requestsError.set('This request changed. The list has been refreshed.');
        } else if (error.status === 429) {
          this.requestsError.set('Requests are taking a short pause. Please try again.');
        } else {
          this.requestsError.set('We couldn’t update this request. Please try again.');
        }
      },
    });
  }
}
