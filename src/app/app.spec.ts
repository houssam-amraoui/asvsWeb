import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const req = TestBed.inject(HttpTestingController).expectOne('assets/result.json');
    req.flush({
      Name: 'ASVS',
      ShortName: 'ASVS',
      Version: '4.0.3',
      Description: 'desc',
      Requirements: []
    });

    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should compute compliance stats and detect unselected measures', () => {
    const fixture = TestBed.createComponent(App);
    const req = TestBed.inject(HttpTestingController).expectOne('assets/result.json');
    req.flush({
      Name: 'ASVS',
      ShortName: 'ASVS',
      Version: '4.0.3',
      Description: 'desc',
      Requirements: [
        {
          Shortcode: 'V1',
          Ordinal: 1,
          ShortName: 'Architecture',
          Name: 'Architecture requirements',
          Description: 'desc',
          Items: [
            {
              Shortcode: 'V1.1',
              Ordinal: 1,
              Name: 'Section',
              Items: [
                {
                  id: '1.1.1',
                  asvs_level: 1,
                  cwe: 'CWE-1',
                  verification_requirement: 'Req 1',
                  status: 'PASS'
                },
                {
                  id: '1.1.2',
                  asvs_level: 1,
                  cwe: 'CWE-2',
                  verification_requirement: 'Req 2',
                  status: 'FAIL'
                },
                {
                  id: '1.1.3',
                  asvs_level: 1,
                  cwe: 'CWE-3',
                  verification_requirement: 'Req 3',
                  status: ''
                },
                {
                  id: '1.1.4',
                  asvs_level: 1,
                  cwe: 'CWE-4',
                  verification_requirement: 'Req 4',
                  status: 'N/A'
                }
              ]
            }
          ]
        }
      ]
    });

    const app = fixture.componentInstance;

    expect(app.selectedRequirementStats.unselected).toBe(1);
    expect(app.selectedRequirementStats.score).toBe(50);
    expect(app.overallStats.total).toBe(4);
    expect(app.unselectedItems.map((item) => item.id)).toEqual(['1.1.3']);
  });
});
