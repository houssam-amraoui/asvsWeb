import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService, Requirement, VerificationItem } from './data.service';

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

  constructor(private readonly dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.getAsvsData().subscribe((data) => {
      this.asvsName = `${data.ShortName} - ${data.Name}`;
      this.asvsVersion = data.Version;
      this.requirements = data.Requirements;
      this.selectedRequirement = data.Requirements[0];
      this.selectedRequirement?.Items.forEach((section) => {
        section.Items.forEach((item) => {
          item.status = item.status ?? '';
        });
      });
    });
  }

  selectRequirement(requirement: Requirement): void {
    this.selectedRequirement = requirement;
    this.selectedRequirement.Items.forEach((section) => {
      section.Items.forEach((item) => {
        item.status = item.status ?? '';
      });
    });
  }

  setStatus(item: VerificationItem, status: 'PASS' | 'FAIL' | 'N/A'): void {
    item.status = status;
  }
}
