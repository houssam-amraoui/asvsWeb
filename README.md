# ASVS Auditor Web

A modern Angular web application to review OWASP ASVS controls, track verification status, and generate AI-powered remediation recommendations for missing security measures.

## Features

- Browse ASVS requirements from a local JSON dataset (`src/assets/result.json`).
- Drill down by requirement, section, and verification item.
- Mark each verification item as **PASS**, **FAIL**, or **N/A**.
- Track auditor notes with:
  - Comment
  - Tool used
  - Source code reference
- View compliance indicators:
  - Global compliance score
  - Current requirement coverage
  - PASS/FAIL/N/A/Unselected counters
- Highlight unselected controls to speed up audit completion.
- Persist audit progress in browser local storage.
- Generate AI recommendations (Gemini API) for one selected missing measure at a time.
- Preview the exact JSON payload sent to the AI model.

## Technologies Used

- **Angular 21** (standalone components)
- **TypeScript**
- **RxJS**
- **Angular HTTP Client**
- **Bootstrap 5.3** (via CDN)
- **Google Gemini API** (`generateContent`) for AI recommendations

## Installation

### Prerequisites

- Node.js (recommended LTS)
- npm

### Steps

1. Clone the repository:

   ```bash
   git clone <your-repository-url>
   cd asvsWeb
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure AI settings (optional but required for AI recommendations):

   Edit `src/app/ai.config.ts` and set:
   - `apiKey`: your Google AI Studio API key
   - `model`: your Gemini model name (for example `gemini-3.1-flash-lite-preview`)

## Usage

1. Start the development server:

   ```bash
   npm start
   ```

2. Open the app:

   ```text
   http://localhost:4200
   ```

3. Audit workflow:
   - Select a requirement from the left sidebar.
   - Expand sections and review verification items.
   - Set status (PASS / FAIL / N/A).
   - Fill optional audit details (comment, tool used, source code reference).
   - For missing controls (FAIL or unselected), select one item for AI.
   - Click **Générer les recommandations IA** to receive remediation guidance.


## Screenshots

### Home
![home](docs/screenshots/home.png)
### Section
![Section](docs/screenshots/items.png)
### Verification Item
![Verification Item](docs/screenshots/item.png)
### Select Item
![Select Item](docs/screenshots/select.png)
### AI Result
![iaresult](docs/screenshots/iaresult.png)



