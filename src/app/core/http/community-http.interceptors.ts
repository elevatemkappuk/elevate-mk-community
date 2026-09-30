import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_CONFIG } from './api-config';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let csrfToken: string | null = null;

export function setCommunityCsrfToken(token: string): void {
  csrfToken = token;
}

export const communityCredentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const { apiBaseUrl } = inject(API_CONFIG);

  if (!request.url.startsWith(apiBaseUrl)) {
    return next(request);
  }

  const token = csrfToken ?? readCookie('csrftoken');
  const withCsrf = UNSAFE_METHODS.has(request.method) && token && !request.headers.has('X-CSRFToken')
    ? request.clone({ headers: request.headers.set('X-CSRFToken', token) })
    : request;

  return next(withCsrf.clone({ withCredentials: true }));
};

function readCookie(name: string): string | null {
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}
