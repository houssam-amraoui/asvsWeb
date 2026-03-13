import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VerificationItem {
  id: string;
  asvs_level: number;
  cwe?: string;
  verification_requirement: string;
  comment?: string;
  tool_used?: string;
  source_code_reference?: string;
  status?: 'PASS' | 'FAIL' | 'N/A' | '';
}

export interface RequirementSection {
  Shortcode: string;
  Ordinal: number;
  Name: string;
  Items: VerificationItem[];
}

export interface Requirement {
  Shortcode: string;
  Ordinal: number;
  ShortName: string;
  Name: string;
  Description?: string;
  Items: RequirementSection[];
}

export interface AsvsData {
  Name: string;
  ShortName: string;
  Version: string;
  Description: string;
  Requirements: Requirement[];
}

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private readonly http: HttpClient) {}

  getAsvsData(): Observable<AsvsData> {
    return this.http.get<AsvsData>('assets/result.json');
  }
}
