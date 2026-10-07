import { Routes } from '@angular/router';
import { JoinPageComponent } from './join-page/join-page.component';
import { JoinSuccessPageComponent } from './join-success/join-success-page.component';
import { ActivatePageComponent } from './activate-page/activate-page.component';
import { communityAuthGuard } from './core/auth/community-auth.guard';
import { communityGuestGuard } from './core/auth/community-guest.guard';
import { SignInPageComponent } from './sign-in-page/sign-in-page.component';
import { ForgotPasswordPageComponent } from './forgot-password-page/forgot-password-page.component';
import { ResetPasswordPageComponent } from './reset-password-page/reset-password-page.component';
import { CommunityProfilePageComponent } from './community-profile/community-profile-page.component';
import { CommunityProfileEditPageComponent } from './community-profile-edit/community-profile-edit-page.component';
import { CommunityDirectoryPageComponent } from './community-directory/community-directory-page.component';
import { CommunityDirectoryProfilePageComponent } from './community-directory/community-directory-profile-page.component';
import { CommunityEmailChangeVerifyPageComponent } from './community-email-change-verify/community-email-change-verify-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'join' },
  { path: 'join', component: JoinPageComponent },
  { path: 'sign-in', component: SignInPageComponent, canActivate: [communityGuestGuard] },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: 'reset-password/:uid/:token', component: ResetPasswordPageComponent },
  { path: 'join/success', component: JoinSuccessPageComponent },
  { path: 'activate/invalid', component: ActivatePageComponent },
  { path: 'activate/:invitationId/:token', component: ActivatePageComponent },
  { path: 'community/account/verify-email/:requestId/:token', component: CommunityEmailChangeVerifyPageComponent },
  { path: 'community', loadComponent: () => import('./community-home/community-home-page.component').then((module) => module.CommunityHomePageComponent), canActivate: [communityAuthGuard] },
  { path: 'community/profile', component: CommunityProfilePageComponent, canActivate: [communityAuthGuard] },
  { path: 'community/profile/edit', component: CommunityProfileEditPageComponent, canActivate: [communityAuthGuard] },
  { path: 'community/account', loadComponent: () => import('./community-account/community-account-page.component').then((module) => module.CommunityAccountPageComponent), canActivate: [communityAuthGuard] },
  { path: 'community/directory', component: CommunityDirectoryPageComponent, canActivate: [communityAuthGuard] },
  { path: 'community/directory/connections', loadComponent: () => import('./community-directory/community-connections-page.component').then((module) => module.CommunityConnectionsPageComponent), data: { section: 'connections' }, canActivate: [communityAuthGuard] },
  { path: 'community/directory/requests', loadComponent: () => import('./community-directory/community-connections-page.component').then((module) => module.CommunityConnectionsPageComponent), data: { section: 'requests' }, canActivate: [communityAuthGuard] },
  { path: 'community/directory/:directoryId', component: CommunityDirectoryProfilePageComponent, canActivate: [communityAuthGuard] },
];
