import './style.css';
import { addReview, getAllCases, getAllReviews, importBackup, removeCase, saveCase } from './db';
import { accuracy, createId, FREE_CASE_LIMIT, isDue, makeExample, scheduleNextReview, validateBackup } from './domain';
import { captureReturnedLicense, checkoutUrl, initialLicenseState, storeLicense, verifyLicense } from './license';
import type { BridgeBackup, CaseCard, LicenseState, ReviewRecord } from './types';

type View = 'library' | 'editor' | 'review' | 'license';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Application root is missing.');
const appRoot: HTMLDivElement = root;

function html(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

function fullDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function download(filename: string, contents: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

class BridgeApp {
  private cases: CaseCard[] = [];
  private reviews: ReviewRecord[] = [];
  private view: View = 'library';
  private editingId: string | null = null;
  private reviewId: string | null = null;
  private reviewChoice = '';
  private revealed = false;
  private importCandidate: BridgeBackup | null = null;
  private license: LicenseState = initialLicenseState();
  private online = navigator.onLine;
  private toast = '';
  private updateReady = false;

  async init(): Promise<void> {
    captureReturnedLicense();
    this.license = initialLicenseState();
    this.bindEvents();
    try {
      [this.cases, this.reviews] = await Promise.all([getAllCases(), getAllReviews()]);
      this.render();
      this.registerServiceWorker();
      if (this.license.token) {
        this.license = await verifyLicense();
        this.render();
      }
    } catch (error) {
      this.renderFatal(error instanceof Error ? error.message : 'The local casebook could not be opened.');
    }
  }

  private bindEvents(): void {
    window.addEventListener('online', () => { this.online = true; this.toast = 'Back online.'; this.render(); });
    window.addEventListener('offline', () => { this.online = false; this.render(); });
    appRoot.addEventListener('click', (event) => this.onClick(event));
    appRoot.addEventListener('submit', (event) => this.onSubmit(event));
    appRoot.addEventListener('change', (event) => this.onChange(event));
  }

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      if (registration.waiting) this.showUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) this.showUpdate();
        });
      });
    } catch {
      this.toast = 'Offline setup is unavailable in this browser session.';
      this.render();
    }
  }

  private showUpdate(): void {
    this.updateReady = true;
    this.toast = 'A fresh workbench is ready.';
    this.render();
  }

  private shell(content: string): string {
    const active = (view: View) => this.view === view ? ' aria-current="page"' : '';
    return `
      <header class="site-header">
        <div class="masthead">
          <button class="brand-mark" type="button" data-nav="library" aria-label="Go to case library"><span aria-hidden="true"></span></button>
          <div class="title-lockup">
            <p class="eyebrow">A local decision practice</p>
            <h1>Concept Case <em>Bridge</em></h1>
          </div>
          <nav aria-label="Primary">
            <button type="button" data-nav="library"${active('library')}>Cases <span class="nav-count">${this.cases.length}</span></button>
            <button type="button" data-nav="review"${active('review')}>Review</button>
            <button type="button" data-nav="license"${active('license')}>${this.license.unlocked ? 'Unlocked' : 'Get unlimited'}</button>
          </nav>
        </div>
      </header>
      ${this.online ? '' : '<aside class="offline-banner" role="status"><strong>Offline.</strong> Your saved cases and reviews still work on this device.</aside>'}
      <main id="main" tabindex="-1">${content}</main>
      <footer>
        <p>Your cases stay in this browser unless you export them. <span>Illustration generated for this product with Azure OpenAI.</span></p>
        <nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-concept-case-bridge" rel="noreferrer">Source</a></nav>
      </footer>
      <dialog id="delete-dialog" aria-labelledby="delete-title"><form method="dialog" class="dialog-sheet"><p class="stamp stamp-coral">Remove case</p><h2 id="delete-title">Delete this case and its review history?</h2><p id="delete-name"></p><div class="button-row"><button value="cancel" class="button secondary">Keep case</button><button value="confirm" class="button danger" id="confirm-delete">Delete case</button></div></form></dialog>
      <dialog id="import-dialog" aria-labelledby="import-title"><form method="dialog" class="dialog-sheet"><p class="stamp">Validated backup</p><h2 id="import-title">How should these cases be added?</h2><p id="import-summary"></p><p>Merge keeps existing cases. Replace permanently removes this device’s current casebook first.</p><div class="button-stack"><button value="merge" class="button" data-import-mode="merge">Merge with this casebook</button><button value="replace" class="button danger" data-import-mode="replace">Replace this casebook</button><button value="cancel" class="button text-button">Cancel</button></div></form></dialog>
      <div class="toast-region" aria-live="polite" aria-atomic="true">${this.toast ? `<div class="toast">${html(this.toast)}${this.updateReady ? '<button type="button" data-action="reload">Reload</button>' : ''}</div>` : ''}</div>
    `;
  }

  private render(): void {
    let content = '';
    if (this.view === 'editor') content = this.editorView();
    else if (this.view === 'review') content = this.reviewView();
    else if (this.view === 'license') content = this.licenseView();
    else content = this.libraryView();
    appRoot.innerHTML = this.shell(content);
  }

  private libraryView(): string {
    const due = this.cases.filter((card) => isDue(card));
    const score = accuracy(this.reviews);
    const caseList = this.cases.length ? `
      <section class="case-section" aria-labelledby="case-heading">
        <div class="section-heading"><div><p class="eyebrow">Your authored links</p><h2 id="case-heading">Case library</h2></div><button class="button secondary" type="button" data-action="new-case">Write a case</button></div>
        <div class="case-list">${this.cases.map((card, index) => this.caseRow(card, index)).join('')}</div>
      </section>` : this.emptyState();
    return `
      <section class="hero" aria-labelledby="hero-heading">
        <div class="hero-copy">
          <p class="stamp">Signal → choice → reason</p>
          <h2 id="hero-heading">Don’t just know the concept.<br><em>Recognize when it belongs.</em></h2>
          <p>Build compact cases from the situations you’re learning. Hide the decision, choose under context, then confront the tempting alternative.</p>
          <div class="button-row">
            <button class="button primary" type="button" data-action="new-case">Write a case <span aria-hidden="true">↗</span></button>
            <button class="button secondary" type="button" data-action="start-review" ${this.cases.length ? '' : 'disabled'}>Review due cases <span class="button-count">${due.length}</span></button>
          </div>
          <p class="privacy-note"><span aria-hidden="true">●</span> Local-only by default. Keep employer-confidential details out.</p>
        </div>
        <figure class="hero-art"><picture><source media="(max-width: 600px)" srcset="/assets/bridge-workbench-720.webp"><img src="/assets/bridge-workbench.webp" width="1200" height="800" alt="Risograph collage of technical diagrams and business evidence joined by three blank decision slips" decoding="async" fetchpriority="high"></picture><figcaption>Build the missing bridge between isolated knowledge and a real decision.</figcaption></figure>
      </section>
      <section class="ledger" aria-label="Practice summary">
        <div><span>Bridges authored</span><strong>${this.cases.length}</strong><small>${this.cases.length >= 15 ? 'Pilot target reached' : `${15 - this.cases.length} to the pilot target`}</small></div>
        <div><span>Due now</span><strong>${due.length}</strong><small>Based on local review dates</small></div>
        <div><span>Decision accuracy</span><strong>${score === null ? '—' : `${score}%`}</strong><small>${this.reviews.length ? `${this.reviews.length} recorded checks` : 'Start a review to measure'}</small></div>
      </section>
      ${caseList}
      ${this.toolsPanel()}
      ${this.license.unlocked ? this.historyPanel() : ''}
    `;
  }

  private emptyState(): string {
    return `<section class="empty-state" aria-labelledby="empty-heading">
      <div class="empty-number" aria-hidden="true">01</div>
      <div><p class="eyebrow">Empty workbench</p><h2 id="empty-heading">Start with one decision you wish you had recognized sooner.</h2><p>Use a generic scenario or your own sanitized notes. A strong case includes the domain clue, the chosen concept, and why the closest alternative fails.</p><div class="button-row"><button class="button primary" type="button" data-action="new-case">Write from scratch</button><button class="button secondary" type="button" data-action="add-example">Add a generic example</button></div></div>
    </section>`;
  }

  private caseRow(card: CaseCard, index: number): string {
    const due = isDue(card);
    return `<article class="case-row">
      <div class="case-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
      <div class="case-body"><div class="tag-line"><span class="tag signal">Domain signal</span><span>${html(card.domainSignal)}</span></div><h3>${html(card.title)}</h3><div class="tag-line"><span class="tag concept">Concept</span><strong>${html(card.concept)}</strong></div><p class="case-meta">${due ? '<span class="due-mark">● Due now</span>' : `Next check ${shortDate(card.nextReviewAt)}`} · ${card.reviewCount} ${card.reviewCount === 1 ? 'review' : 'reviews'}</p></div>
      <div class="row-actions"><button type="button" class="button small" data-action="practice" data-id="${html(card.id)}">Practice</button><button type="button" class="icon-button" data-action="edit" data-id="${html(card.id)}" aria-label="Edit ${html(card.title)}">Edit</button><button type="button" class="icon-button danger-text" data-action="delete" data-id="${html(card.id)}" aria-label="Delete ${html(card.title)}">Delete</button></div>
    </article>`;
  }

  private toolsPanel(): string {
    return `<section class="tools-panel" aria-labelledby="tools-heading"><div><p class="eyebrow">Data ownership</p><h2 id="tools-heading">Carry your casebook yourself.</h2><p>Export a complete JSON backup with attribution and review history. Import validates the file before anything changes.</p></div><div class="button-stack"><button class="button secondary" type="button" data-action="export">Export backup</button><button class="button secondary" type="button" data-action="choose-import">Import backup</button><input class="visually-hidden" id="import-file" type="file" accept="application/json,.json" aria-label="Choose a Concept Case Bridge JSON backup"></div></section>`;
  }

  private historyPanel(): string {
    const recent = this.reviews.slice(0, 8);
    return `<section class="history-panel" aria-labelledby="history-heading"><div class="section-heading"><div><p class="eyebrow">Unlocked detail</p><h2 id="history-heading">Recent decision checks</h2></div><span class="paid-stamp">Unlimited</span></div>${recent.length ? `<ol>${recent.map((review) => { const card = this.cases.find((item) => item.id === review.caseId); return `<li><span aria-hidden="true">${review.correct ? '✓' : '×'}</span><div><strong>${html(card?.title ?? 'Imported case')}</strong><small>${review.correct ? 'Chose the intended concept' : `Chose ${html(review.selected)}`} · ${fullDate(review.reviewedAt)}</small></div></li>`; }).join('')}</ol>` : '<p>No reviews yet. Your last eight checks will appear here.</p>'}</section>`;
  }

  private editorView(): string {
    const card = this.editingId ? this.cases.find((item) => item.id === this.editingId) : undefined;
    const value = (key: keyof CaseCard) => html(card?.[key] ?? '');
    return `<section class="work-view editor-view" aria-labelledby="editor-heading">
      <div class="view-intro"><button class="back-button" type="button" data-nav="library">← Case library</button><p class="eyebrow">${card ? 'Refine the bridge' : 'Author a transfer decision'}</p><h2 id="editor-heading">${card ? `Edit “${html(card.title)}”` : 'Write a case worth revisiting.'}</h2><p>Keep it compact enough to scan, but specific enough that the domain signal changes the technical choice.</p></div>
      <form id="case-form" class="case-form">
        <fieldset><legend><span>1</span> Set the scene</legend>
          <label>Case title<input name="title" required maxlength="90" value="${value('title')}" autocomplete="off"><small>A memorable label, not the answer.</small></label>
          <label>Scenario<textarea name="scenario" required maxlength="900" rows="5">${value('scenario')}</textarea><small>Who is acting, what is happening, and what could go wrong?</small></label>
          <label>Domain signal<textarea name="domainSignal" required maxlength="360" rows="3">${value('domainSignal')}</textarea><small>The fact that should trigger recognition. Avoid employer-confidential facts.</small></label>
        </fieldset>
        <fieldset class="concept-fields"><legend><span>2</span> Make the choice</legend>
          <label>Technical concept<input name="concept" required maxlength="100" value="${value('concept')}" autocomplete="off"><small>The concept the learner should choose.</small></label>
          <label>Decision<textarea name="decision" required maxlength="600" rows="4">${value('decision')}</textarea><small>What would you do, using that concept?</small></label>
        </fieldset>
        <fieldset class="alternative-fields"><legend><span>3</span> Pressure-test it</legend>
          <label>Tempting alternative<input name="alternative" required maxlength="100" value="${value('alternative')}" autocomplete="off"><small>A plausible choice—not a joke answer.</small></label>
          <label>Why not the alternative?<textarea name="whyNotAlternative" required maxlength="600" rows="4">${value('whyNotAlternative')}</textarea><small>Name the signal or consequence that makes it weaker here.</small></label>
          <label>Attribution / source<input name="attribution" required maxlength="180" value="${card ? value('attribution') : 'Original case by me; scenario sanitized.'}" autocomplete="off"><small>Make the case trustworthy and portable. A URL, book, or authorship note works.</small></label>
        </fieldset>
        <div class="form-actions"><button class="button secondary" type="button" data-nav="library">Cancel</button><button class="button primary" type="submit">Save case</button></div>
        <p id="form-error" class="form-error" role="alert"></p>
      </form>
    </section>`;
  }

  private reviewView(): string {
    if (!this.cases.length) return `<section class="work-view review-empty"><div class="view-intro"><p class="eyebrow">Review desk</p><h2>No decisions to review yet.</h2><p>Author one compact case, then return here to choose between its concept and a plausible alternative.</p><button class="button primary" data-action="new-case">Write your first case</button></div></section>`;
    const card = this.reviewId ? this.cases.find((item) => item.id === this.reviewId) : undefined;
    if (!card) {
      const due = this.cases.filter((item) => isDue(item));
      return `<section class="work-view review-empty"><div class="view-intro"><p class="stamp">${due.length ? `${due.length} due` : 'Desk clear'}</p><h2>${due.length ? 'Ready for a delayed check?' : 'Nothing is due right now.'}</h2><p>${due.length ? 'The concept stays hidden until you commit to a choice.' : 'You can still practice the full casebook without changing its due dates.'}</p><div class="button-row"><button class="button primary" data-action="begin-due">${due.length ? 'Begin due review' : 'Practice anyway'}</button><button class="button secondary" data-nav="library">Return to library</button></div></div></section>`;
    }
    const choices = card.id.charCodeAt(card.id.length - 1) % 2 ? [card.concept, card.alternative] : [card.alternative, card.concept];
    const correct = this.reviewChoice === card.concept;
    return `<section class="work-view review-view" aria-labelledby="review-heading">
      <div class="review-progress"><button class="back-button" data-action="leave-review">← End session</button><span>Decision check</span><span>${this.cases.filter((item) => isDue(item)).length} due</span></div>
      <article class="review-sheet">
        <div class="review-label"><span>Case</span><small>${html(card.attribution)}</small></div>
        <h2 id="review-heading">${html(card.title)}</h2>
        <p class="scenario">${html(card.scenario)}</p>
        <aside class="signal-strip"><strong>Domain signal</strong><p>${html(card.domainSignal)}</p></aside>
        <fieldset class="choice-set" ${this.revealed ? 'disabled' : ''}><legend>Which concept belongs here?</legend>${choices.map((choice, index) => `<label class="choice"><input type="radio" name="review-choice" value="${html(choice)}" ${this.reviewChoice === choice ? 'checked' : ''}><span class="choice-letter">${String.fromCharCode(65 + index)}</span><span>${html(choice)}</span></label>`).join('')}</fieldset>
        ${this.revealed ? `<section class="reveal ${correct ? 'correct' : 'incorrect'}" aria-live="polite"><p class="result-mark"><span aria-hidden="true">${correct ? '✓' : '×'}</span> ${correct ? 'Intended concept chosen' : 'Useful miss—inspect the signal'}</p><h3>${html(card.concept)}</h3><p>${html(card.decision)}</p><div class="counterexample"><strong>Why not “${html(card.alternative)}”?</strong><p>${html(card.whyNotAlternative)}</p></div></section><div class="review-actions"><button class="button primary" type="button" data-action="record-review">Record & next</button></div>` : `<div class="review-actions"><p id="choice-hint">Commit before revealing. Recognition—not recall—is the point.</p><button class="button primary" type="button" data-action="reveal" ${this.reviewChoice ? '' : 'disabled'}>Reveal decision</button></div>`}
      </article>
    </section>`;
  }

  private licenseView(): string {
    return `<section class="work-view license-view" aria-labelledby="license-heading">
      <div class="license-poster"><p class="stamp">One-time unlock</p><h2 id="license-heading">Keep the practice private.<br><em>Remove the ceiling.</em></h2><p class="price"><strong>$19</strong> once</p><ul><li>Unlimited authored case links</li><li>Recent decision-check history</li><li>Future local-only pro improvements</li></ul><p>The free workbench includes 15 cases, delayed reviews, offline use, and complete backup export. Accessibility, privacy, and data ownership are never paywalled.</p>${this.license.unlocked ? '<p class="unlocked-mark"><span aria-hidden="true">✓</span> This device is unlocked.</p>' : `<a class="button primary" href="${checkoutUrl}">Buy the one-time unlock</a>`}${this.license.notice ? `<p class="license-notice" role="status">${html(this.license.notice)} ${this.license.unlocked ? '' : `<a href="${checkoutUrl}">Get a new license</a>`}</p>` : ''}</div>
      <aside class="restore-panel"><p class="eyebrow">Already purchased?</p><h2>Restore on this device</h2><p>Paste the license token from your receipt. It is stored only in this browser and checked with Sociobot at most once per day.</p><form id="license-form"><label>License token<input name="license" required autocomplete="off" spellcheck="false"></label><button class="button secondary" type="submit">Verify & restore</button><p id="license-error" class="form-error" role="alert"></p></form><small>Sociobot/Dodo is the merchant of record. Refunds are handled there and revoke the license automatically.</small></aside>
    </section>`;
  }

  private async onClick(event: Event): Promise<void> {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action], [data-nav], [data-import-mode]');
    if (!button) return;
    const nav = button.dataset.nav as View | undefined;
    if (nav) { this.view = nav; this.editingId = null; this.reviewId = null; this.render(); this.focusMain(); return; }
    const action = button.dataset.action;
    if (action === 'new-case') {
      if (!this.license.unlocked && this.cases.length >= FREE_CASE_LIMIT) { this.view = 'license'; this.toast = `The free casebook holds ${FREE_CASE_LIMIT} cases. Your existing work is safe.`; }
      else { this.view = 'editor'; this.editingId = null; }
      this.render(); this.focusMain();
    } else if (action === 'add-example') {
      await saveCase(makeExample()); await this.refresh(); this.toast = 'Generic example added. Edit it to fit what you are learning.'; this.render();
    } else if (action === 'edit') {
      this.editingId = button.dataset.id ?? null; this.view = 'editor'; this.render(); this.focusMain();
    } else if (action === 'practice') {
      this.startReview(button.dataset.id);
    } else if (action === 'start-review' || action === 'begin-due') {
      this.startReview();
    } else if (action === 'leave-review') {
      this.view = 'library'; this.reviewId = null; this.render(); this.focusMain();
    } else if (action === 'reveal' && this.reviewChoice) {
      this.revealed = true; this.render(); document.querySelector<HTMLElement>('.reveal')?.focus();
    } else if (action === 'record-review') {
      await this.recordReview();
    } else if (action === 'delete') {
      this.openDelete(button.dataset.id ?? '');
    } else if (action === 'export') {
      this.exportBackup();
    } else if (action === 'choose-import') {
      document.querySelector<HTMLInputElement>('#import-file')?.click();
    } else if (action === 'reload') {
      location.reload();
    }
    const mode = button.dataset.importMode;
    if (mode && this.importCandidate) await this.finishImport(mode === 'replace');
  }

  private async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    if (form.id === 'case-form') await this.submitCase(form);
    if (form.id === 'license-form') await this.submitLicense(form);
  }

  private async onChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.name === 'review-choice') { this.reviewChoice = input.value; this.render(); return; }
    if (input.id === 'import-file' && input.files?.[0]) await this.readImport(input.files[0]);
  }

  private async submitCase(form: HTMLFormElement): Promise<void> {
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const existing = this.editingId ? this.cases.find((card) => card.id === this.editingId) : undefined;
    const now = new Date().toISOString();
    const text = (name: string) => String(data.get(name) ?? '').trim();
    const card: CaseCard = {
      id: existing?.id ?? createId(), title: text('title'), scenario: text('scenario'), domainSignal: text('domainSignal'), concept: text('concept'), decision: text('decision'), alternative: text('alternative'), whyNotAlternative: text('whyNotAlternative'), attribution: text('attribution'), createdAt: existing?.createdAt ?? now, updatedAt: now, nextReviewAt: existing?.nextReviewAt ?? now, reviewCount: existing?.reviewCount ?? 0
    };
    try {
      await saveCase(card); await this.refresh(); this.view = 'library'; this.toast = existing ? 'Case updated.' : 'Case saved. It is ready to review.'; this.render(); this.focusMain();
    } catch {
      const error = document.querySelector('#form-error'); if (error) error.textContent = 'The case could not be saved. Check browser storage and try again.';
    }
  }

  private startReview(id?: string): void {
    const due = this.cases.find((card) => isDue(card));
    this.reviewId = id ?? due?.id ?? this.cases[0]?.id ?? null;
    this.reviewChoice = '';
    this.revealed = false;
    this.view = 'review';
    this.render(); this.focusMain();
  }

  private async recordReview(): Promise<void> {
    const card = this.cases.find((item) => item.id === this.reviewId);
    if (!card || !this.reviewChoice) return;
    const correct = this.reviewChoice === card.concept;
    const now = new Date();
    const record: ReviewRecord = { id: createId('review'), caseId: card.id, reviewedAt: now.toISOString(), selected: this.reviewChoice, correct };
    card.reviewCount += 1;
    card.nextReviewAt = scheduleNextReview(correct, card.reviewCount, now);
    card.updatedAt = now.toISOString();
    await Promise.all([addReview(record), saveCase(card)]);
    await this.refresh();
    const next = this.cases.find((item) => item.id !== card.id && isDue(item));
    this.reviewId = next?.id ?? null; this.reviewChoice = ''; this.revealed = false;
    this.toast = correct ? 'Review recorded. Next check scheduled.' : 'Review recorded. This case returns tomorrow.';
    this.render(); this.focusMain();
  }

  private openDelete(id: string): void {
    const card = this.cases.find((item) => item.id === id);
    const dialog = document.querySelector<HTMLDialogElement>('#delete-dialog');
    if (!card || !dialog) return;
    const name = dialog.querySelector('#delete-name'); if (name) name.textContent = `“${card.title}” will be removed from this device.`;
    const confirm = dialog.querySelector<HTMLButtonElement>('#confirm-delete');
    if (confirm) confirm.onclick = async () => { await removeCase(id); await this.refresh(); this.toast = 'Case and its review history deleted.'; this.render(); };
    dialog.showModal();
  }

  private exportBackup(): void {
    const backup: BridgeBackup = { format: 'concept-case-bridge', version: 1, exportedAt: new Date().toISOString(), cases: this.cases, reviews: this.reviews };
    download(`concept-case-bridge-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2));
    this.toast = `Exported ${this.cases.length} ${this.cases.length === 1 ? 'case' : 'cases'}.`; this.render();
  }

  private async readImport(file: File): Promise<void> {
    try {
      this.importCandidate = validateBackup(JSON.parse(await file.text()));
      const dialog = document.querySelector<HTMLDialogElement>('#import-dialog');
      const summary = dialog?.querySelector('#import-summary');
      if (summary) summary.textContent = `${this.importCandidate.cases.length} cases and ${this.importCandidate.reviews.length} reviews are ready.`;
      dialog?.showModal();
    } catch (error) {
      this.toast = error instanceof Error ? error.message : 'The backup could not be read.'; this.render();
    }
  }

  private async finishImport(replace: boolean): Promise<void> {
    if (!this.importCandidate) return;
    try {
      await importBackup(this.importCandidate, replace); this.importCandidate = null; await this.refresh(); this.toast = replace ? 'Casebook replaced from the validated backup.' : 'Backup merged into this casebook.'; this.render();
    } catch {
      this.toast = 'Import failed before completion. Your existing casebook is still available.'; this.render();
    }
  }

  private async submitLicense(form: HTMLFormElement): Promise<void> {
    const token = String(new FormData(form).get('license') ?? '').trim();
    if (!token) return;
    storeLicense(token); this.license = { token, unlocked: true, checking: true, notice: '' }; this.toast = 'License saved locally. Checking it now…'; this.render();
    this.license = await verifyLicense(true);
    this.toast = this.license.unlocked ? 'Unlimited casebook unlocked on this device.' : 'That license could not be verified.';
    this.render();
  }

  private async refresh(): Promise<void> {
    [this.cases, this.reviews] = await Promise.all([getAllCases(), getAllReviews()]);
  }

  private focusMain(): void {
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#main')?.focus());
  }

  private renderFatal(message: string): void {
    appRoot.innerHTML = `<header class="site-header"><div class="masthead"><div class="title-lockup"><p class="eyebrow">Local decision practice</p><h1>Concept Case <em>Bridge</em></h1></div></div></header><main id="main"><section class="fatal-state" role="alert"><p class="stamp stamp-coral">Casebook unavailable</p><h2>We couldn’t open your local work.</h2><p>${html(message)}</p><button class="button primary" type="button" onclick="location.reload()">Try again</button></section></main>`;
  }
}

new BridgeApp().init();
