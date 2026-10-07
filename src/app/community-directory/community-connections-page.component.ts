import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityApiService, ConnectionPage, ConnectionRecord, ConnectionRequestRecord } from '../api/community-api.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';
import { CommunityConnectNavComponent } from './community-connect-nav.component';
import { CommunityConnectionCardComponent } from './community-connection-card.component';

type WorkspaceSection = 'connections' | 'requests';
type RequestDirection = 'incoming' | 'outgoing';
type WorkspaceRecord = ConnectionRecord | ConnectionRequestRecord;

@Component({
  selector: 'app-community-connections-page',
  imports: [CommunityHeaderComponent, CommunityConnectNavComponent, CommunityConnectionCardComponent, RouterLink],
  templateUrl: './community-connections-page.component.html',
  styleUrl: './community-connections-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityConnectionsPageComponent implements OnInit {
  private readonly api = inject(CommunityApiService);
  private readonly auth = inject(CommunityAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly section = signal<WorkspaceSection>('connections');
  readonly direction = signal<RequestDirection>('incoming');
  readonly records = signal<WorkspaceRecord[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly mutationError = signal<string | null>(null);
  readonly activeAction = signal<{ id: string; action: 'accept' | 'decline' } | null>(null);
  readonly signingOut = signal(false);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / 25)));

  ngOnInit(): void {
    this.section.set(this.route.snapshot.data['section'] === 'requests' ? 'requests' : 'connections');
    this.route.queryParamMap.subscribe((params) => {
      const pageValue = Number(params.get('page') || '1');
      this.page.set(Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1);
      this.direction.set(params.get('direction') === 'outgoing' ? 'outgoing' : 'incoming');
      this.load();
    });
  }

  retry(): void { this.load(); }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/join'),
      error: () => this.signingOut.set(false),
    });
  }

  setDirection(direction: RequestDirection): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { direction, page: null },
      queryParamsHandling: 'merge',
    });
  }

  goToPage(page: number): void {
    if (page < 1 || (page > this.page() && !this.hasNext()) || (page < this.page() && !this.hasPrevious())) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  accept(connectionId: string): void { this.mutate(connectionId, 'accept'); }
  decline(connectionId: string): void { this.mutate(connectionId, 'decline'); }

  cardLoadingAction(connectionId: string): 'accept' | 'decline' | null {
    const action = this.activeAction();
    return action?.id === connectionId ? action.action : null;
  }

  isIncoming(): boolean { return this.section() === 'requests' && this.direction() === 'incoming'; }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.mutationError.set(null);
    const request$ = this.section() === 'connections'
      ? this.api.getConnections(this.page())
      : this.api.getConnectionRequests(this.direction(), this.page());
    request$.subscribe({
      next: (response) => this.setPage(response),
      error: (error: CommunityApiError) => {
        this.loading.set(false);
        this.records.set([]);
        this.errorMessage.set(error.status === 429
          ? 'Connect is taking a short pause. Please wait a moment and try again.'
          : error.status === 403
            ? 'Community access is unavailable right now.'
            : 'We couldn’t load this Connect workspace right now. Please try again.');
      },
    });
  }

  private setPage(response: ConnectionPage<WorkspaceRecord>): void {
    if (!response.results.length && response.count > 0 && this.page() > 1) {
      this.goToPage(this.page() - 1);
      return;
    }
    this.records.set(response.results);
    this.totalCount.set(response.count);
    this.hasNext.set(Boolean(response.next));
    this.hasPrevious.set(Boolean(response.previous));
    this.loading.set(false);
  }

  private mutate(connectionId: string, action: 'accept' | 'decline'): void {
    if (this.activeAction()) return;
    this.activeAction.set({ id: connectionId, action });
    this.mutationError.set(null);
    const request$ = action === 'accept'
      ? this.api.acceptConnection(connectionId)
      : this.api.declineConnection(connectionId);
    request$.pipe(finalize(() => this.activeAction.set(null))).subscribe({
      next: () => this.load(),
      error: (error: CommunityApiError) => {
        if (error.status === 409) {
          this.mutationError.set('This request changed while you were viewing it. The list has been refreshed.');
          this.load();
        } else if (error.status === 429) {
          this.mutationError.set('Connect is taking a short pause. Please wait a moment and try again.');
        } else if (error.status === 404) {
          this.mutationError.set('This request is no longer available. The list has been refreshed.');
          this.load();
        } else {
          this.mutationError.set('We couldn’t update this request. Please try again.');
        }
      },
    });
  }
}
