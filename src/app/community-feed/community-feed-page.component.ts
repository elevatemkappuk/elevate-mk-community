import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityApiService, CommunityPost, CommunityPostPurpose } from '../api/community-api.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';
import { CommunityPostCardComponent } from './community-post-card.component';

interface PurposeFilter { label: string; value: CommunityPostPurpose | null; }

@Component({
  selector: 'app-community-feed-page',
  imports: [CommunityHeaderComponent, CommunityPostCardComponent],
  templateUrl: './community-feed-page.component.html',
  styleUrl: './community-feed-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityFeedPageComponent implements OnInit {
  private readonly api = inject(CommunityApiService);
  private readonly auth = inject(CommunityAuthService);
  private readonly router = inject(Router);

  readonly filters: PurposeFilter[] = [
    { label: 'ALL', value: null },
    { label: 'ASKS', value: 'ASK' },
    { label: 'OFFERS', value: 'OFFER' },
    { label: 'OPPORTUNITIES', value: 'OPPORTUNITY' },
    { label: 'UPDATES', value: 'UPDATE' },
  ];
  readonly posts = signal<CommunityPost[]>([]);
  readonly selectedPurpose = signal<CommunityPostPurpose | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly loaded = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly loadMoreError = signal<string | null>(null);
  readonly hasNext = signal(false);
  readonly page = signal(1);
  readonly signingOut = signal(false);

  ngOnInit(): void { this.loadPosts(1, false); }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({ next: () => void this.router.navigateByUrl('/join'), error: () => this.signingOut.set(false) });
  }

  choosePurpose(value: CommunityPostPurpose | null): void {
    if (this.selectedPurpose() === value && !this.errorMessage()) return;
    this.selectedPurpose.set(value);
    this.loadPosts(1, false);
  }

  retry(): void { this.loadPosts(1, false); }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasNext()) return;
    this.loadPosts(this.page() + 1, true);
  }

  private loadPosts(page: number, append: boolean): void {
    if (append && (this.loading() || this.loadingMore())) return;
    if (append) { this.loadingMore.set(true); this.loadMoreError.set(null); }
    else { this.loading.set(true); this.loaded.set(false); this.errorMessage.set(null); this.loadMoreError.set(null); }
    this.api.getCommunityPosts({ purpose: this.selectedPurpose() ?? undefined, page }).pipe(
      finalize(() => { this.loading.set(false); this.loadingMore.set(false); }),
    ).subscribe({
      next: (response) => {
        this.posts.update((current) => append ? [...current, ...response.results] : response.results);
        this.page.set(page);
        this.hasNext.set(Boolean(response.next));
        this.loaded.set(true);
      },
      error: (error: CommunityApiError) => {
        if (append) this.loadMoreError.set(error.status === 429 ? 'Community is taking a short pause. Please try again.' : 'We couldn’t load more posts. Please try again.');
        else { this.loaded.set(true); this.errorMessage.set(error.status === 429 ? 'Community is taking a short pause. Please wait a moment and try again.' : 'We couldn’t load Community right now. Please try again.'); }
      },
    });
  }
}
