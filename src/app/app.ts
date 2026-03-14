import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AI_CONFIG } from './ai.config';
import { DataService, MissingMeasurePayload, Requirement, RequirementSection, VerificationItem } from './data.service';

type VerificationStatus = 'PASS' | 'FAIL' | 'N/A' | '';

interface ComplianceStats {
  total: number;
  passed: number;
  failed: number;
  notApplicable: number;
  unselected: number;
  applicable: number;
  score: number;
}

interface PersistedItemState {
  status: VerificationStatus;
  comment?: string;
  tool_used?: string;
  source_code_reference?: string;
}

interface PersistedSelectionState {
  selectedRequirementShortcode?: string;
  items: Record<string, PersistedItemState>;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  asvsName = '';
  asvsVersion = '';
  requirements: Requirement[] = [];
  selectedRequirement?: Requirement;
  isLoading = true;
  errorMessage = '';

  private readonly aiApiKey = AI_CONFIG.apiKey;
  private readonly aiModel = AI_CONFIG.model;
  aiRecommendations = '';
  aiErrorMessage = '';
  isGeneratingRecommendations = false;
  selectedMissingMeasureId = '';

  private readonly storageKey = 'asvs-selection-state-v1';

  constructor(
    private readonly dataService: DataService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.dataService.getAsvsData().subscribe({
      next: (data) => {
        this.asvsName = `${data.ShortName} - ${data.Name}`;
        this.asvsVersion = data.Version;
        this.requirements = data.Requirements;
        this.applyPersistedState();
        this.selectedRequirement = this.resolveSelectedRequirement() ?? data.Requirements[0];
        this.ensureItemStatuses();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage =
          'Unable to load ASVS data from src/assets/result.json. Please verify the file exists and is included in angular.json assets.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectRequirement(requirement: Requirement): void {
    this.selectedRequirement = requirement;
    this.selectedMissingMeasureId = '';
    this.aiRecommendations = '';
    this.aiErrorMessage = '';
    this.ensureItemStatuses();
    this.persistSelectionState();
  }

  setStatus(item: VerificationItem, status: 'PASS' | 'FAIL' | 'N/A'): void {
    item.status = status;

    if (!this.isItemEligibleForAi(item) && this.selectedMissingMeasureId === item.id) {
      this.selectedMissingMeasureId = '';
      this.aiRecommendations = '';
    }

    this.persistSelectionState();
  }

  onItemUpdated(): void {
    this.persistSelectionState();
  }

  isItemEligibleForAi(item: VerificationItem): boolean {
    const status: VerificationStatus = item.status ?? '';
    return status === 'FAIL' || status === '';
  }

  toggleMissingMeasureSelection(item: VerificationItem): void {
    if (!this.isItemEligibleForAi(item)) {
      return;
    }

    this.selectedMissingMeasureId = this.selectedMissingMeasureId === item.id ? '' : item.id;
    this.aiRecommendations = '';
    this.aiErrorMessage = '';
  }

  generateIaRecommendations(): void {
    this.aiErrorMessage = '';
    this.aiRecommendations = '';

    if (!this.aiApiKey.trim() || this.aiApiKey === 'REPLACE_WITH_GOOGLE_AI_STUDIO_API_KEY') {
      this.aiErrorMessage = 'Veuillez configurer la clé API dans src/app/ai.config.ts.';
      return;
    }

    const payload = this.selectedMissingMeasurePayload;
    if (!payload) {
      this.aiErrorMessage = 'Veuillez sélectionner une mesure manquante (FAIL ou non sélectionnée).';
      return;
    }

    this.isGeneratingRecommendations = true;

    this.dataService.generateRecommendations(this.aiApiKey.trim(), this.aiModel.trim(), payload).subscribe({
      next: (response) => {
        const recommendationText =
          response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n').trim() ?? '';

        this.aiRecommendations = recommendationText ||
          'Aucune recommandation textuelle retournée par le modèle. Vérifiez la configuration du modèle et la réponse API.';
        this.isGeneratingRecommendations = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.aiErrorMessage = this.buildIaErrorMessage(error);
        this.isGeneratingRecommendations = false;
        this.cdr.detectChanges();
      }
    });
  }

  get overallStats(): ComplianceStats {
    return this.computeStats(this.requirements.flatMap((requirement) => requirement.Items));
  }

  get selectedRequirementStats(): ComplianceStats {
    const sections = this.selectedRequirement?.Items ?? [];
    return this.computeStats(sections);
  }

  get unselectedItems(): VerificationItem[] {
    return (this.selectedRequirement?.Items ?? [])
      .flatMap((section) => section.Items)
      .filter((item) => item.status === '');
  }

  get selectedMissingMeasurePayload(): MissingMeasurePayload | null {
    const currentRequirement = this.selectedRequirement;
    if (!currentRequirement || !this.selectedMissingMeasureId) {
      return null;
    }

    for (const section of currentRequirement.Items) {
      const item = section.Items.find((currentItem) => currentItem.id === this.selectedMissingMeasureId);
      if (!item) {
        continue;
      }

      if (!this.isItemEligibleForAi(item)) {
        return null;
      }

      const status: VerificationStatus = item.status ?? '';

      return {
        id: item.id,
        asvs_level: item.asvs_level,
        requirement: item.verification_requirement,
        cwe: item.cwe,
        requirement_shortcode: currentRequirement.Shortcode,
        section_shortcode: section.Shortcode,
        status: status === 'FAIL' ? 'FAIL' : 'UNSELECTED',
        comment: item.comment,
        tool_used: item.tool_used,
        source_code_reference: item.source_code_reference
      };
    }

    return null;
  }

  get missingMeasuresJson(): string {
    return JSON.stringify(this.selectedMissingMeasurePayload ?? {}, null, 2);
  }


  private buildIaErrorMessage(error: HttpErrorResponse): string {
    const apiMessage =
      (error.error?.error?.message as string | undefined) ??
      (error.error?.message as string | undefined) ??
      (typeof error.error === 'string' ? error.error : undefined);

    const statusPart = error.status ? `HTTP ${error.status}` : 'Erreur réseau';

    if (apiMessage && apiMessage.trim()) {
      return `Échec de la génération IA (${statusPart}) : ${apiMessage}`;
    }

    if (error.status === 0) {
      return 'Échec de la génération IA : requête bloquée ou inaccessible (CORS/réseau). Vérifiez que la clé API Google AI Studio est valide et autorisée pour Generative Language API.';
    }

    return 'Échec de la génération IA. Vérifiez la clé API, le modèle, le quota, et les autorisations de votre clé API.';
  }

  private computeStats(sections: RequirementSection[]): ComplianceStats {
    const counters: ComplianceStats = {
      total: 0,
      passed: 0,
      failed: 0,
      notApplicable: 0,
      unselected: 0,
      applicable: 0,
      score: 0
    };

    sections.forEach((section) => {
      section.Items.forEach((item) => {
        counters.total += 1;

        const status: VerificationStatus = item.status ?? '';

        if (status === 'PASS') {
          counters.passed += 1;
          counters.applicable += 1;
        } else if (status === 'FAIL') {
          counters.failed += 1;
          counters.applicable += 1;
        } else if (status === 'N/A') {
          counters.notApplicable += 1;
        } else {
          counters.unselected += 1;
        }
      });
    });

    counters.score = counters.applicable > 0 ? Math.round((counters.passed / counters.applicable) * 100) : 0;

    return counters;
  }

  private ensureItemStatuses(): void {
    this.selectedRequirement?.Items.forEach((section) => {
      section.Items.forEach((item) => {
        item.status = item.status ?? '';
      });
    });
  }

  private resolveSelectedRequirement(): Requirement | undefined {
    const state = this.getPersistedState();
    if (!state?.selectedRequirementShortcode) {
      return undefined;
    }

    return this.requirements.find((requirement) => requirement.Shortcode === state.selectedRequirementShortcode);
  }

  private applyPersistedState(): void {
    const state = this.getPersistedState();
    if (!state) {
      return;
    }

    this.requirements.forEach((requirement) => {
      requirement.Items.forEach((section) => {
        section.Items.forEach((item) => {
          const persistedItem = state.items[item.id];
          if (!persistedItem) {
            return;
          }

          item.status = persistedItem.status ?? '';
          item.comment = persistedItem.comment;
          item.tool_used = persistedItem.tool_used;
          item.source_code_reference = persistedItem.source_code_reference;
        });
      });
    });
  }

  private persistSelectionState(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const items: Record<string, PersistedItemState> = {};

    this.requirements.forEach((requirement) => {
      requirement.Items.forEach((section) => {
        section.Items.forEach((item) => {
          items[item.id] = {
            status: item.status ?? '',
            comment: item.comment,
            tool_used: item.tool_used,
            source_code_reference: item.source_code_reference
          };
        });
      });
    });

    const state: PersistedSelectionState = {
      selectedRequirementShortcode: this.selectedRequirement?.Shortcode,
      items
    };

    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private getPersistedState(): PersistedSelectionState | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const rawState = localStorage.getItem(this.storageKey);
    if (!rawState) {
      return null;
    }

    try {
      const parsedState = JSON.parse(rawState) as PersistedSelectionState;
      return {
        selectedRequirementShortcode: parsedState.selectedRequirementShortcode,
        items: parsedState.items ?? {}
      };
    } catch {
      return null;
    }
  }
}
