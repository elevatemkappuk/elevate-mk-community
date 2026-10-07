import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityApiService, CommunityPost, CommunityReply, CommunityReportPayload } from '../api/community-api.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';
import { ProfileAvatarComponent } from '../shared/ui/profile-avatar/profile-avatar.component';
import { audienceLabel, purposeLabel, relativePostTime } from './community-post-utils';
import { CommunityReportDialogComponent } from './community-report-dialog.component';

@Component({
  selector: 'app-community-post-detail-page',
  imports: [CommunityHeaderComponent, ProfileAvatarComponent, RouterLink, ReactiveFormsModule, CommunityReportDialogComponent],
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
  readonly replies = signal<CommunityReply[]>([]);
  readonly repliesLoading = signal(false);
  readonly repliesLoaded = signal(false);
  readonly repliesError = signal<string | null>(null);
  readonly repliesPage = signal(1);
  readonly hasMoreReplies = signal(false);
  readonly repliesLoadingMore = signal(false);
  readonly replyBody = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] });
  readonly replySubmitted = signal(false);
  readonly replySubmitting = signal(false);
  readonly replyTo = signal<CommunityReply | null>(null);
  readonly replyError = signal<string | null>(null);
  readonly editingReplyId = signal<string | null>(null);
  readonly editBody = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] });
  readonly editError = signal<string | null>(null);
  readonly deletingReplyId = signal<string | null>(null);
  readonly reportTarget = signal<'post' | 'reply' | null>(null);
  readonly reportReply = signal<CommunityReply | null>(null);
  readonly reportSubmitting = signal(false);
  readonly reportAcknowledgement = signal<string | null>(null);
  readonly reportError = signal<string | null>(null);
  readonly signingOut = signal(false);
  private replyIdempotencyKey: string | null = null;

  ngOnInit(): void {
    const postId = this.route.snapshot.paramMap.get('postId');
    if (!postId) { this.loading.set(false); this.unavailable.set(true); return; }
    this.replyBody.valueChanges.subscribe(() => { this.replyIdempotencyKey = null; this.replyError.set(null); });
    this.api.getCommunityPost(postId).subscribe({
      next: (post) => { this.post.set(post); this.loading.set(false); this.loadReplies(postId, 1, false); },
      error: (error: CommunityApiError) => { this.loading.set(false); this.unavailable.set(error.status === 404 || error.status === 403 || error.status === 0); },
    });
  }

  showReplyError(): boolean { return this.replyBody.invalid && this.replySubmitted(); }
  replyToName(reply: CommunityReply): string { const author = reply.replying_to?.author; return author ? `${author.first_name} ${author.last_name}`.trim() : 'another member'; }
  authorNameForReply(reply: CommunityReply): string { const author = reply.author; return author ? `${author.first_name} ${author.last_name}`.trim() : ''; }
  replyInitials(reply: CommunityReply): string { const author = reply.author; return author ? `${author.first_name.charAt(0)}${author.last_name.charAt(0)}`.toUpperCase() : ''; }
  replyIsPlaceholder(reply: CommunityReply): boolean { return !reply.author; }
  replyCanReport(reply: CommunityReply): boolean { return Boolean(reply.author && !reply.is_own_reply); }
  replyCanManage(reply: CommunityReply): boolean { return Boolean(reply.author && reply.is_own_reply); }

  chooseReplyTarget(reply: CommunityReply): void { this.replyTo.set(reply); this.replyError.set(null); }
  cancelReplyTarget(): void { this.replyTo.set(null); }

  submitReply(): void {
    this.replySubmitted.set(true);
    this.replyBody.markAsTouched();
    if (this.replyBody.invalid || this.replySubmitting() || !this.post()) return;
    this.replySubmitting.set(true);
    this.replyError.set(null);
    this.replyIdempotencyKey ??= this.newIdempotencyKey();
    const post = this.post()!;
    this.api.createCommunityReply(post.public_id, { body: this.replyBody.value.trim(), reply_to_id: this.replyTo()?.public_id ?? null }, this.replyIdempotencyKey).subscribe({
      next: (reply) => {
        const existed = this.replies().some((item) => item.public_id === reply.public_id);
        this.replies.update((items) => existed ? items.map((item) => item.public_id === reply.public_id ? reply : item) : [...items, reply]);
        if (!existed) this.post.update((current) => current ? { ...current, reply_count: current.reply_count + 1 } : current);
        this.replyBody.reset(''); this.replySubmitted.set(false); this.replyTo.set(null); this.replySubmitting.set(false); this.replyIdempotencyKey = null;
      },
      error: (error: CommunityApiError) => { this.replySubmitting.set(false); this.replyError.set(error.status === 409 ? 'This reply could not be confirmed safely. Please try again.' : error.status === 429 ? 'Replies are taking a short pause. Please try again in a moment.' : 'We couldn’t add your reply right now. Please try again.'); },
    });
  }

  beginEdit(reply: CommunityReply): void { this.editingReplyId.set(reply.public_id); this.editBody.setValue(reply.body); this.editError.set(null); }
  cancelEdit(): void { this.editingReplyId.set(null); this.editError.set(null); }
  saveEdit(reply: CommunityReply): void {
    this.editBody.markAsTouched();
    if (this.editBody.invalid || !this.post()) return;
    this.api.editCommunityReply(this.post()!.public_id, reply.public_id, this.editBody.value.trim()).subscribe({
      next: (updated) => { this.replies.update((items) => items.map((item) => item.public_id === updated.public_id ? updated : item)); this.cancelEdit(); },
      error: () => this.editError.set('We couldn’t update this reply right now. Please try again.'),
    });
  }

  requestDelete(reply: CommunityReply): void { this.deletingReplyId.set(reply.public_id); }
  cancelDelete(): void { this.deletingReplyId.set(null); }
  confirmDelete(reply: CommunityReply): void {
    if (!this.post()) return;
    this.api.deleteCommunityReply(this.post()!.public_id, reply.public_id).subscribe({
      next: () => { this.deletingReplyId.set(null); this.loadReplies(this.post()!.public_id, 1, false); },
      error: () => { this.deletingReplyId.set(null); this.replyError.set('We couldn’t remove this reply right now. Please try again.'); },
    });
  }

  openPostReport(): void { this.reportTarget.set('post'); this.reportReply.set(null); this.reportError.set(null); this.reportAcknowledgement.set(null); }
  openReplyReport(reply: CommunityReply): void { this.reportTarget.set('reply'); this.reportReply.set(reply); this.reportError.set(null); this.reportAcknowledgement.set(null); }
  closeReport(): void { if (!this.reportSubmitting()) this.reportTarget.set(null); }
  submitReport(payload: CommunityReportPayload): void {
    const post = this.post();
    if (!post || this.reportSubmitting()) return;
    this.reportSubmitting.set(true); this.reportError.set(null);
    const request$ = this.reportTarget() === 'post' ? this.api.reportCommunityPost(post.public_id, payload) : this.api.reportCommunityReply(post.public_id, this.reportReply()!.public_id, payload);
    request$.subscribe({ next: () => { this.reportSubmitting.set(false); this.reportTarget.set(null); this.reportAcknowledgement.set('REPORT RECEIVED — Thank you. The Elevate team will review it.'); }, error: (error: CommunityApiError) => { this.reportSubmitting.set(false); this.reportError.set(error.status === 429 ? 'Reports are taking a short pause. Please try again later.' : 'We couldn’t send the report right now. Please try again.'); } });
  }

  loadMoreReplies(): void { if (!this.post() || this.repliesLoading() || this.repliesLoadingMore() || !this.hasMoreReplies()) return; this.loadReplies(this.post()!.public_id, this.repliesPage() + 1, true); }

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

  private loadReplies(postId: string, page: number, append: boolean): void {
    if (append) this.repliesLoadingMore.set(true); else { this.repliesLoading.set(true); this.repliesError.set(null); }
    this.api.getCommunityReplies(postId, page).subscribe({
      next: (response) => { this.replies.update((items) => append ? [...items, ...response.results] : response.results); this.repliesPage.set(page); this.hasMoreReplies.set(Boolean(response.next)); this.repliesLoaded.set(true); this.repliesLoading.set(false); this.repliesLoadingMore.set(false); },
      error: (error: CommunityApiError) => { this.repliesLoading.set(false); this.repliesLoadingMore.set(false); this.repliesLoaded.set(true); if (append) this.repliesError.set(error.status === 429 ? 'Conversation is taking a short pause. Please try again.' : 'We couldn’t load more replies. Please try again.'); else this.repliesError.set('We couldn’t load the conversation right now. Please try again.'); },
    });
  }

  retryReplies(): void { if (this.post()) this.loadReplies(this.post()!.public_id, 1, false); }
  private newIdempotencyKey(): string { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}
