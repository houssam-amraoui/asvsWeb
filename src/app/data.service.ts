import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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
    return this.http.get<unknown>('assets/result.json').pipe(map((raw) => this.normalizeAsvsData(raw)));
  }

  private normalizeAsvsData(raw: unknown): AsvsData {
    const data = this.asRecord(raw);
    const requirementsRaw = this.asArray(this.pick(data, ['Requirements', 'requirements']));

    return {
      Name: this.asString(this.pick(data, ['Name', 'name'])),
      ShortName: this.asString(this.pick(data, ['ShortName', 'shortName', 'shortname'])),
      Version: this.asString(this.pick(data, ['Version', 'version'])),
      Description: this.asString(this.pick(data, ['Description', 'description'])),
      Requirements: requirementsRaw.map((entry, index) => this.normalizeRequirement(entry, index + 1))
    };
  }

  private normalizeRequirement(raw: unknown, fallbackOrdinal: number): Requirement {
    const row = this.asRecord(raw);
    const sectionsRaw = this.asArray(this.pick(row, ['Items', 'items']));

    return {
      Shortcode: this.asString(this.pick(row, ['Shortcode', 'shortcode'])),
      Ordinal: this.asNumber(this.pick(row, ['Ordinal', 'ordinal']), fallbackOrdinal),
      ShortName: this.asString(this.pick(row, ['ShortName', 'shortName', 'shortname'])),
      Name: this.asString(this.pick(row, ['Name', 'name'])),
      Description: this.asString(this.pick(row, ['Description', 'description'])),
      Items: sectionsRaw.map((entry, index) => this.normalizeSection(entry, index + 1))
    };
  }

  private normalizeSection(raw: unknown, fallbackOrdinal: number): RequirementSection {
    const row = this.asRecord(raw);
    const itemsRaw = this.asArray(this.pick(row, ['Items', 'items']));

    return {
      Shortcode: this.asString(this.pick(row, ['Shortcode', 'shortcode'])),
      Ordinal: this.asNumber(this.pick(row, ['Ordinal', 'ordinal']), fallbackOrdinal),
      Name: this.asString(this.pick(row, ['Name', 'name'])),
      Items: itemsRaw.map((entry) => this.normalizeVerificationItem(entry))
    };
  }

  private normalizeVerificationItem(raw: unknown): VerificationItem {
    const row = this.asRecord(raw);

    return {
      id: this.asString(this.pick(row, ['id', 'Id'])),
      asvs_level: this.asNumber(this.pick(row, ['asvs_level', 'asvsLevel', 'level']), 0),
      cwe: this.asString(this.pick(row, ['cwe', 'CWE'])),
      verification_requirement: this.asString(
        this.pick(row, ['verification_requirement', 'verificationRequirement', 'requirement'])
      ),
      comment: this.asString(this.pick(row, ['comment'])),
      tool_used: this.asString(this.pick(row, ['tool_used', 'toolUsed'])),
      source_code_reference: this.asString(this.pick(row, ['source_code_reference', 'sourceCodeReference'])),
      status: ''
    };
  }

  private pick(source: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (key in source) return source[key];
    }
    return undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private asNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
  }
}
