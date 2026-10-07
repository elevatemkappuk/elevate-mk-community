import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityApiService, CommunityPost } from '../api/community-api.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';
import { ProfileAvatarComponent } from '../shared/ui/profile-avatar/profile-avatar.component';
import { audienceLabel, purposeLabel, relativePostTime } from './community-post-utils';

@Component({
  selector: 'app-community-post-detail-page',
  imports: [CommunityHeaderComponent, ProfileAvatarComponent, RouterLink],
  templateUrl: './community-post-detail-page.component.html',
  styleUrl: './community-post-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPostDetailPageComponent implements OnInit {
  private readonly api = inject(CommunityApiService);
  private readonly auth = inject(CommunityAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly post = signal<CommunityPost | null>(null);
  readonly loading = signal(true);
  readonly unavailable = signal(false);
  readonly signingOut = signal(false);

  ngOnInit(): void {
    const postId = this.route.snapshot.paramMap.get('postId');
    if (!postId) { this.loading.set(false); this.unavailable.set(true); return; }
    this.api.getCommunityPost(postId).subscribe({
      next: (post) => { this.post.set(post); this.loading.set(false); },
      error: (error: CommunityApiError) => { this.loading.set(false); this.unavailable.set(error.status === 404 || error.status === 403 || error.status === 0); },
    });
  }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({ next: () => void this.router.navigateByUrl('/join'), error: () => this.signingOut.set(false) });
  }

  initials(): string {
    const author = this.post()?.author;
    return author ? `${author.first_name.charAt(0)}${author.last_name.charAt(0)}`.toUpperCase() : '';
  }

  authorName(): string { const author = this.post()?.author; return author ? `${author.first_name} ${author.last_name}`.trim() : ''; }
  purposeLabel = purposeLabel;
  audienceLabel = audienceLabel;
  relativeTime = relativePostTime;
}
