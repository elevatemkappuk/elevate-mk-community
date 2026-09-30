import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { CommunityAuthService } from '../../api/community-auth.service';

export const communityGuestGuard: CanActivateFn = () => {
  const auth = inject(CommunityAuthService);
  const router = inject(Router);
  return auth.loadCurrentUser().pipe(
    map((user) => user ? router.parseUrl('/community') : true),
    catchError(() => of(true)),
  );
};
