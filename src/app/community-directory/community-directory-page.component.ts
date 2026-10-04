import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CommunityApiError, CommunityAuthService } from '../api/community-auth.service';
import { CommunityApiService, DirectoryMember } from '../api/community-api.service';
import { CommunityProfileOptions, CommunityProfileService } from '../api/community-profile.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';
import { SelectComponent, SelectOption } from '../shared/ui/select/select.component';
import { CommunityDirectoryMemberCardComponent } from './community-directory-member-card.component';
import { CommunityConnectNavComponent } from './community-connect-nav.component';

@Component({
  selector: 'app-community-directory-page',
  imports: [CommunityHeaderComponent, CommunityDirectoryMemberCardComponent, CommunityConnectNavComponent, ReactiveFormsModule, SelectComponent],
  templateUrl: './community-directory-page.component.html',
  styleUrl: './community-directory-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityDirectoryPageComponent implements OnInit {
  private readonly api = inject(CommunityApiService);
  private readonly auth = inject(CommunityAuthService);
  private readonly profileService = inject(CommunityProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly members = signal<DirectoryMember[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly loading = signal(true);
  readonly loaded = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly optionsError = signal(false);
  readonly signingOut = signal(false);
  readonly options = signal<CommunityProfileOptions | null>(null);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / 25)));

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly filterForm = new FormGroup({
    industry: new FormControl('', { nonNullable: true }),
    skill: new FormControl('', { nonNullable: true }),
    interest: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.navigateWithState(1, true));

    this.filterForm.valueChanges.pipe(
      distinctUntilChanged((before, after) => before.industry === after.industry && before.skill === after.skill && before.interest === after.interest),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.navigateWithState(1, false));

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const pageValue = Number(params.get('page') || '1');
      this.page.set(Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1);
      this.searchControl.setValue(params.get('q')?.trim() || '', { emitEvent: false });
      this.filterForm.setValue({
        industry: params.get('industry') || '',
        skill: params.get('skill') || '',
        interest: params.get('interest') || '',
      }, { emitEvent: false });
      this.loadDirectory();
    });

    this.profileService.getProfileOptions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (options) => this.options.set(options),
      error: () => this.optionsError.set(true),
    });
  }

  industryOptions(): SelectOption[] { return this.toSelectOptions(this.options()?.industries); }
  skillOptions(): SelectOption[] { return this.toSelectOptions(this.options()?.skills); }
  interestOptions(): SelectOption[] { return this.toSelectOptions(this.options()?.interests); }

  retry(): void {
    this.loadDirectory();
  }

  signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/join'),
      error: () => this.signingOut.set(false),
    });
  }

  clearSearch(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.navigateWithState(1, false);
  }

  clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.filterForm.setValue({ industry: '', skill: '', interest: '' }, { emitEvent: false });
    this.navigateWithState(1, false);
  }

  goToPage(page: number): void {
    if (page < 1 || (page > this.page() && !this.hasNext()) || (page < this.page() && !this.hasPrevious())) return;
    this.navigateWithState(page, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  hasActiveState(): boolean {
    return Boolean(this.searchControl.value.trim() || this.filterForm.controls.industry.value || this.filterForm.controls.skill.value || this.filterForm.controls.interest.value);
  }

  connectQueryParams(): Record<string, string> {
    const params: Record<string, string> = {};
    const q = this.searchControl.value.trim();
    if (q) params['q'] = q;
    for (const key of ['industry', 'skill', 'interest'] as const) {
      const value = this.filterForm.controls[key].value;
      if (value) params[key] = value;
    }
    if (this.page() > 1) params['page'] = String(this.page());
    return params;
  }

  private loadDirectory(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.api.getDirectory({
      q: this.searchControl.value,
      industry: this.filterForm.controls.industry.value,
      skill: this.filterForm.controls.skill.value,
      interest: this.filterForm.controls.interest.value,
      page: this.page(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.members.set(response.results);
        this.totalCount.set(response.count);
        this.hasNext.set(Boolean(response.next));
        this.hasPrevious.set(Boolean(response.previous));
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (error: CommunityApiError) => {
        this.loading.set(false);
        this.loaded.set(true);
        this.errorMessage.set(error.status === 429
          ? 'Connect is taking a short pause. Please wait a moment and try again.'
          : 'We couldn’t load Connect right now. Please try again.');
      },
    });
  }

  private navigateWithState(page: number, replaceUrl: boolean): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl,
      queryParams: {
        q: this.searchControl.value.trim() || null,
        industry: this.filterForm.controls.industry.value || null,
        skill: this.filterForm.controls.skill.value || null,
        interest: this.filterForm.controls.interest.value || null,
        page: page > 1 ? page : null,
      },
    });
  }

  private toSelectOptions(options: Array<{ slug: string; label: string }> | undefined): SelectOption[] {
    return (options || []).map((option) => ({ value: option.slug, label: option.label }));
  }
}
