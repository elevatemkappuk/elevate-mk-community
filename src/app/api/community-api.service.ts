import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../core/http/api-config';

export interface IndustryOption {
  slug: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class CommunityApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  getIndustries(): Observable<IndustryOption[]> {
    return this.http.get<IndustryOption[]>(`${this.apiConfig.apiBaseUrl}/community/industries/`);
  }
}
