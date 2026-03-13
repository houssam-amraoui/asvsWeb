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

export interface MissingMeasurePayload {
  id: string;
  asvs_level: number;
  requirement: string;
  cwe?: string;
  requirement_shortcode: string;
  section_shortcode: string;
  status: 'FAIL' | 'UNSELECTED';
  comment?: string;
  tool_used?: string;
  source_code_reference?: string;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private readonly http: HttpClient) {}

  getAsvsData(): Observable<AsvsData> {
    return this.http.get<AsvsData>('assets/result.json');
  }

  generateRecommendations(apiKey: string, model: string, payload: MissingMeasurePayload[]): Observable<GeminiGenerateContentResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = [
      'Tu es un expert en sécurité applicative (OWASP ASVS).',
      'Analyse uniquement les mesures manquantes au format JSON ci-dessous.',
      'Pour chaque mesure, fournis:',
      '1) ce qu\'il faut implémenter,',
      '2) comment le faire (étapes concrètes),',
      '3) les bonnes pratiques à appliquer.',
      'Réponds en français, en Markdown, avec une section par mesure (id).',
      'JSON des mesures manquantes :',
      JSON.stringify(payload, null, 2)
    ].join('\n');

    return this.http.post<GeminiGenerateContentResponse>(endpoint, {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    });
  }
}
