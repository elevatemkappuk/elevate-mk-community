import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommunityAuthService, CommunityUser } from '../api/community-auth.service';
import { CommunityHeaderComponent } from '../shared/ui/community-header/community-header.component';

@Component({ selector: 'app-community-home-page', imports: [CommunityHeaderComponent], templateUrl: './community-home-page.component.html', styleUrl: './community-home-page.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class CommunityHomePageComponent implements OnInit {
  private readonly auth = inject(CommunityAuthService); readonly user = signal<CommunityUser | null>(null); readonly signingOut = signal(false);
  ngOnInit(): void { this.user.set(this.auth.currentUser()); }
  signOut(): void { if (this.signingOut()) return; this.signingOut.set(true); this.auth.logout().subscribe({ next: () => window.location.assign('/join'), error: () => this.signingOut.set(false) }); }
}
