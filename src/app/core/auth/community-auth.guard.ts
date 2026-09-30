import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { CommunityAuthService } from '../../api/community-auth.service';

export const communityAuthGuard: CanActivateFn = () => {
  const auth = inject(CommunityAuthService);
  const router = inject(Router);
  return auth.loadCurrentUser().pipe(map((user) => user ? true : router.parseUrl('/join')), catchError(() => of(router.parseUrl('/join'))));
};
