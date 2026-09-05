import './style.css';
import { addReview, discardDemoCasebook, getAllCases, getAllReviews, importBackup, isDemoMode, recoverCasebook, removeCase, saveCase } from './db';
import { accuracy, createId, FREE_CASE_LIMIT, isDue, makeDemoBackup, makeExample, scheduleNextReview, validateBackup, validateCaseCard } from './domain';
import { captureReturnedLicense, checkoutUrl, clearDemoLicenseData, initialLicenseState, storeLicense, verifyLicense } from './license';
import type { BridgeBackup, CaseCard, LicenseState, ReviewRecord } from './types';

type View = 'library' | 'editor' | 'review' | 'license';

function viewFromLocation(): View {
  const url = new URL(location.href);
  const demoView = url.searchParams.get('view');
  if (DEMO_MODE && ['editor', 'review', 'license'].includes(demoView ?? '')) return demoView as View;
  if (url.pathname.replace(/\/$/, '') === '/write') return 'editor';
  if (url.pathname.replace(/\/$/, '') === '/review') return 'review';
  if (url.pathname.replace(/\/$/, '') === '/pricing') return 'license';
  return 'library';
}

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Application root is missing.');
const appRoot: HTMLDivElement = root;
const DEMO_MODE = isDemoMode();
const DEMO_SESSION_KEY = 'demo:concept-case-bridge:active';

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
  private view: View = viewFromLocation();
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
    if (!DEMO_MODE) {
      if (sessionStorage.getItem(DEMO_SESSION_KEY)) {
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        clearDemoLicenseData();
        discardDemoCasebook().catch(() => undefined);
      }
    }
    this.bindEvents();
    try {
      let recovered = await recoverCasebook();
      if (DEMO_MODE && !sessionStorage.getItem(DEMO_SESSION_KEY)) {
        await importBackup(makeDemoBackup(), true);
        sessionStorage.setItem(DEMO_SESSION_KEY, '1');
        recovered = await recoverCasebook();
      } else if (DEMO_MODE && recovered.cases.length === 0) {
        await importBackup(makeDemoBackup(), true);
        recovered = await recoverCasebook();
      }
      this.cases = recovered.cases;
      this.reviews = recovered.reviews;
      if (recovered.discarded) this.toast = `Recovered this casebook by removing ${recovered.discarded} malformed ${recovered.discarded === 1 ? 'record' : 'records'} from an older import.`;
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
    window.addEventListener('popstate', () => {
      this.view = viewFromLocation();
      this.editingId = null;
      this.reviewId = null;
      this.render();
      this.focusMain();
    });
    appRoot.addEventListener('click', (event) => this.onClick(event));
    appRoot.addEventListener('submit', (event) => this.onSubmit(event));
    appRoot.addEventListener('change', (event) => this.onChange(event));
    document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelector<HTMLElement>('#main')?.focus();
    });
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
    this.toast = 'An app update is ready.';
    this.render();
  }

  private shell(content: string): string {
    const active = (view: View) => this.view === view ? ' aria-current="page"' : '';
    return `
      <header class="site-header">
        <div class="masthead">
          <a class="brand-mark" href="/" aria-label="Go to case library" ${DEMO_MODE ? 'data-action="start-real"' : ''}><span aria-hidden="true"></span></a>
          <div class="title-lockup">
            <p class="eyebrow">Local decision practice</p>
            <a class="wordmark" href="/" ${DEMO_MODE ? 'data-action="start-real"' : ''}>Concept Case <em>Bridge</em></a>
          </div>
          <nav aria-label="Primary">
            <button type="button" data-nav="library"${active('library')}>Cases <span class="nav-count">${this.cases.length}</span></button>
            <button type="button" data-nav="review"${active('review')}>Review</button>
            <button type="button" data-nav="license"${active('license')}>${this.license.unlocked ? 'License active' : 'Pricing'}</button>
            <a href="/privacy/">Privacy</a>
          </nav>
        </div>
      </header>
      ${DEMO_MODE ? '<aside class="demo-banner" aria-label="Demo controls"><strong>Demo — sample data, nothing is saved</strong><span>Changes stay separate from your real casebook.</span><div><button type="button" data-action="reset-demo">Reset demo</button><a href="/" data-action="start-real">Start for real</a></div></aside>' : ''}
      ${this.online ? '' : '<aside class="offline-banner" role="status"><strong>Offline.</strong> Your saved cases and reviews still work on this device.</aside>'}
      <main id="main" tabindex="-1">${content}</main>
      <footer>
        <p>Practice technical choices in business cases. <span>Illustration generated for this product with Azure OpenAI. v1.1.0 · Built by Param Factory.</span></p>
        <nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-concept-case-bridge" rel="noreferrer">Source (external)</a></nav>
      </footer>
      <dialog id="delete-dialog" aria-labelledby="delete-title"><form method="dialog" class="dialog-sheet"><p class="stamp stamp-coral">Remove case</p><h2 id="delete-title">Delete this case and its review history?</h2><p id="delete-name"></p><div class="button-row"><button value="cancel" class="button secondary">Keep case</button><button value="confirm" class="button danger" id="confirm-delete">Delete case</button></div></form></dialog>
      <dialog id="import-dialog" aria-labelledby="import-title"><form method="dialog" class="dialog-sheet"><p class="stamp">Validated backup</p><h2 id="import-title">How should these cases be added?</h2><p id="import-summary"></p><p>Merge keeps existing cases. Replace permanently removes this device’s current casebook first.</p><div class="button-stack"><button value="merge" class="button" data-import-mode="merge">Merge with this casebook</button><button value="replace" class="button danger" data-import-mode="replace">Replace this casebook</button><button value="cancel" class="button text-button">Cancel</button></div></form></dialog>
      <div class="toast-region" aria-live="polite" aria-atomic="true">${this.toast ? `<div class="toast">${html(this.toast)}${this.updateReady ? '<button type="button" data-action="reload">Reload</button>' : ''}</div>` : ''}</div>
    `;
  }

  private render(): void {
    const content = this.view === 'editor' ? this.editorView()
      : this.view === 'review' ? this.reviewView()
        : this.view === 'license' ? this.licenseView()
          : this.libraryView();
    appRoot.innerHTML = this.shell(content);
    document.title = DEMO_MODE ? 'Demo — Concept Case Bridge' : this.view === 'library' ? 'Concept Case Bridge — Practice technical choices' : this.view === 'editor' ? 'Write a case — Concept Case Bridge' : this.view === 'review' ? 'Review cases — Concept Case Bridge' : 'Pricing — Concept Case Bridge';
    const canonicalPath = DEMO_MODE ? '/demo' : this.view === 'library' ? '/' : this.view === 'editor' ? '/write' : this.view === 'review' ? '/review' : '/pricing';
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `https://concept-case-bridge.sociobot.in${canonicalPath}`);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', `https://concept-case-bridge.sociobot.in${canonicalPath}`);
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', document.title);
    document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', document.title);
    appRoot.removeAttribute('data-loading');
    document.querySelector('#boot-loader')?.remove();
  }

  private libraryView(): string {
    const due = this.cases.filter((card) => isDue(card));
    const score = accuracy(this.reviews);
    const caseList = this.cases.length ? `
      <section class="case-section" aria-labelledby="case-heading">
        <div class="section-heading"><div><p class="eyebrow">Your saved cases</p><h2 id="case-heading">Case library</h2></div><button class="button secondary" type="button" data-action="new-case">Write a case</button></div>
        <div class="case-list">${this.cases.map((card, index) => this.caseRow(card, index)).join('')}</div>
      </section>` : this.emptyState();
    return `
      <section class="hero" aria-labelledby="hero-heading">
        <div class="hero-copy">
          <p class="stamp">Concept case practice</p>
          <h1 id="hero-heading">Practice technical choices in business cases</h1>
          <p>For professionals learning a technical stack and business domain, it turns notes into choices you can practice.</p>
          <div class="button-row">
            ${DEMO_MODE ? '<button class="button primary" type="button" data-action="practice" data-id="demo_inventory_retry">Try the sample review</button>' : '<a class="button primary" href="/demo">Try it with sample data</a>'}
            <button class="button secondary" type="button" data-action="new-case">Write your own case</button>
          </div>
          <p class="next-step">${DEMO_MODE ? 'The sample opens a ready case and hides its decision.' : 'The sample opens three ready cases without changing your casebook.'}</p>
          <ul class="plain-facts"><li>Cases stay in this browser.</li><li>Opens offline after your first visit.</li><li>15 cases free. $19 once for unlimited cases.</li></ul>
        </div>
        <figure class="hero-art"><picture><source media="(max-width: 600px)" srcset="/assets/bridge-workbench-720.webp"><img src="/assets/bridge-workbench.webp" width="1200" height="800" alt="Risograph collage of technical diagrams and business evidence joined by three blank decision slips" decoding="async" fetchpriority="high"></picture><figcaption>The illustration places technical details beside business evidence.</figcaption></figure>
      </section>
      <section class="ledger" aria-label="Practice summary">
        <div><span>Cases saved</span><strong>${this.cases.length}</strong><small>${DEMO_MODE ? 'Separate sample storage' : 'Stored in this browser'}</small></div>
        <div><span>Due now</span><strong>${due.length}</strong><small>Based on local review dates</small></div>
        <div><span>Decision accuracy</span><strong>${score === null ? '—' : `${score}%`}</strong><small>${this.reviews.length ? `${this.reviews.length} recorded checks` : 'Start a review to measure'}</small></div>
      </section>
      ${caseList}
      ${this.toolsPanel()}
      ${this.license.unlocked ? this.historyPanel() : ''}
      ${this.explainerSections()}
    `;
  }

  private emptyState(): string {
    return `<section class="empty-state" aria-labelledby="empty-heading">
      <div class="empty-number" aria-hidden="true">01</div>
      <div><p class="eyebrow">No cases yet</p><h2 id="empty-heading">Start with one business decision</h2><p>Write a sanitized scenario, its domain signal, the chosen concept, and why the closest alternative fails.</p><div class="button-row"><button class="button primary" type="button" data-action="new-case">Write a case</button><a class="button secondary" href="/demo">Try sample data</a></div></div>
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
    return `<section class="tools-panel" aria-labelledby="tools-heading"><div><p class="eyebrow">Backup tools</p><h2 id="tools-heading">Export or import your cases</h2><p>Export a complete JSON backup with attribution and review history. Import checks the file before changing cases.</p></div><div class="button-stack"><button class="button secondary" type="button" data-action="export">Export backup</button><button class="button secondary" type="button" data-action="choose-import">Import backup</button><input class="visually-hidden" id="import-file" type="file" accept="application/json,.json" aria-label="Choose a Concept Case Bridge JSON backup"></div></section>`;
  }

  private explainerSections(): string {
    return `<section class="how-panel" aria-labelledby="how-heading"><p class="eyebrow">How it works</p><h2 id="how-heading">Practice one decision in three steps</h2><ol><li><strong>Write a case.</strong><span>Use sanitized notes from a business situation.</span></li><li><strong>Choose a concept.</strong><span>Compare the intended concept with a plausible alternative.</span></li><li><strong>Check the reason.</strong><span>Reveal the decision and why the alternative does not fit.</span></li></ol></section>
      <section class="facts-panel" aria-labelledby="privacy-heading"><div><p class="eyebrow">Privacy and limits</p><h2 id="privacy-heading">Know where your cases go</h2><p>There is no account or cloud sync. Do not enter confidential, personal, or regulated facts.</p><p>Export a JSON backup before clearing browser data.</p><a href="/privacy/">Read the privacy policy</a></div><div><p class="eyebrow">Free and paid use</p><h2>Use 15 cases free</h2><p>Pay $19 once for unlimited cases and recent review history.</p>${DEMO_MODE ? '<a class="button secondary" href="/" data-action="start-real">Start for real</a>' : `<button class="button secondary" type="button" data-nav="license">See the one-time license</button>`}</div></section>`;
  }

  private historyPanel(): string {
    const recent = this.reviews.slice(0, 8);
    return `<section class="history-panel" aria-labelledby="history-heading"><div class="section-heading"><div><p class="eyebrow">Unlocked detail</p><h2 id="history-heading">Recent decision checks</h2></div><span class="paid-stamp">Unlimited</span></div>${recent.length ? `<ol>${recent.map((review) => { const card = this.cases.find((item) => item.id === review.caseId); return `<li><span aria-hidden="true">${review.correct ? '✓' : '×'}</span><div><strong>${html(card?.title ?? 'Imported case')}</strong><small>${review.correct ? 'Chose the intended concept' : `Chose ${html(review.selected)}`} · ${fullDate(review.reviewedAt)}</small></div></li>`; }).join('')}</ol>` : '<p>No reviews yet. Your last eight checks will appear here.</p>'}</section>`;
  }

  private editorView(): string {
    const card = this.editingId ? this.cases.find((item) => item.id === this.editingId) : undefined;
    const value = (key: keyof CaseCard) => html(card?.[key] ?? '');
    return `<section class="work-view editor-view" aria-labelledby="editor-heading">
      <div class="view-intro"><button class="back-button" type="button" data-nav="library">← Case library</button><p class="eyebrow">${card ? 'Edit case' : 'New case'}</p><h1 id="editor-heading">${card ? `Edit “${html(card.title)}”` : 'Write a case to practice'}</h1><p>Keep it short and specific. The domain signal should change the technical choice.</p></div>
      <form id="case-form" class="case-form" aria-describedby="case-requirements">
        <p id="case-requirements">All fields are required. Use sanitized details you are allowed to store.</p>
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
    if (!this.cases.length) return `<section class="work-view review-empty"><div class="view-intro"><p class="eyebrow">Review cases</p><h1>No cases to review yet</h1><p>Write one case, then choose between its concept and a plausible alternative.</p><button class="button primary" data-action="new-case">Write your first case</button></div></section>`;
    const card = this.reviewId ? this.cases.find((item) => item.id === this.reviewId) : undefined;
    if (!card) {
      const due = this.cases.filter((item) => isDue(item));
      return `<section class="work-view review-empty"><div class="view-intro"><p class="stamp">${due.length ? `${due.length} due` : 'No cases due'}</p><h1>${due.length ? 'Review your due cases' : 'Nothing is due right now'}</h1><p>${due.length ? 'The concept stays hidden until you choose.' : 'You can practice any case without changing its due date.'}</p><div class="button-row"><button class="button primary" data-action="begin-due">${due.length ? 'Begin due review' : 'Practice anyway'}</button><button class="button secondary" data-nav="library">Return to library</button></div></div></section>`;
    }
    const choices = card.id.charCodeAt(card.id.length - 1) % 2 ? [card.concept, card.alternative] : [card.alternative, card.concept];
    const correct = this.reviewChoice === card.concept;
    return `<section class="work-view review-view" aria-labelledby="review-heading">
      <div class="review-progress"><button class="back-button" data-action="leave-review">← End session</button><span>Decision check</span><span>${this.cases.filter((item) => isDue(item)).length} due</span></div>
      <article class="review-sheet">
        <div class="review-label"><span>Case</span><small>${html(card.attribution)}</small></div>
        <h1 id="review-heading">${html(card.title)}</h1>
        <p class="scenario">${html(card.scenario)}</p>
        <aside class="signal-strip"><strong>Domain signal</strong><p>${html(card.domainSignal)}</p></aside>
        <fieldset class="choice-set" ${this.revealed ? 'disabled' : ''}><legend>Which concept belongs here?</legend>${choices.map((choice, index) => `<label class="choice"><input type="radio" name="review-choice" value="${html(choice)}" ${this.reviewChoice === choice ? 'checked' : ''}><span class="choice-letter">${String.fromCharCode(65 + index)}</span><span>${html(choice)}</span></label>`).join('')}</fieldset>
        ${this.revealed ? `<section class="reveal ${correct ? 'correct' : 'incorrect'}" aria-live="polite"><p class="result-mark"><span aria-hidden="true">${correct ? '✓' : '×'}</span> ${correct ? 'Intended concept chosen' : 'Useful miss—inspect the signal'}</p><h3>${html(card.concept)}</h3><p>${html(card.decision)}</p><div class="counterexample"><strong>Why not “${html(card.alternative)}”?</strong><p>${html(card.whyNotAlternative)}</p></div></section><div class="review-actions"><button class="button primary" type="button" data-action="record-review">Record & next</button></div>` : `<div class="review-actions"><p id="choice-hint">Commit before revealing. Recognition—not recall—is the point.</p><button class="button primary" type="button" data-action="reveal" ${this.reviewChoice ? '' : 'disabled'}>Reveal decision</button></div>`}
      </article>
    </section>`;
  }

  private licenseView(): string {
    return `<section class="work-view license-view" aria-labelledby="license-heading">
      <div class="license-poster"><p class="stamp">One-time license</p><h1 id="license-heading">Use more than 15 cases</h1><p class="price"><strong>$19</strong> once</p><ul><li>Unlimited authored cases</li><li>Recent review history</li><li>Future local-only paid improvements</li></ul><p>The free version includes 15 cases, reviews, offline use, and complete backup export. Accessibility, privacy, and data ownership stay free.</p>${this.license.unlocked ? '<p class="unlocked-mark"><span aria-hidden="true">✓</span> This device is unlocked.</p>' : `<a class="button primary" href="${checkoutUrl}">Buy the one-time license</a>`}${this.license.notice ? `<p class="license-notice" role="status">${html(this.license.notice)} ${this.license.unlocked ? '' : `<a href="${checkoutUrl}">Get a new license</a>`}</p>` : ''}</div>
      <section class="restore-panel" aria-labelledby="restore-heading"><p class="eyebrow">Already purchased?</p><h2 id="restore-heading">Restore on this device</h2><p>Paste the license token from your receipt. It is stored only in this browser and checked with Sociobot at most once per day.</p><form id="license-form"><label>License token<input name="license" required autocomplete="off" spellcheck="false"></label><button class="button secondary" type="submit">Verify & restore</button><p id="license-error" class="form-error" role="alert"></p></form><small>Sociobot/Dodo is the merchant of record. Refunds are handled there and revoke the license automatically.</small></section>
    </section>`;
  }

  private async onClick(event: Event): Promise<void> {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action], [data-nav], [data-import-mode]');
    if (!button) return;
    const nav = button.dataset.nav as View | undefined;
    if (nav) { this.navigate(nav); return; }
    const action = button.dataset.action;
    if (action === 'reset-demo' && DEMO_MODE) {
      await importBackup(makeDemoBackup(), true);
      clearDemoLicenseData();
      this.license = initialLicenseState();
      await this.refresh();
      this.view = 'library'; this.reviewId = null; this.editingId = null; this.toast = 'Sample data reset.';
      this.pushView();
      this.render(); this.focusMain();
    } else if (action === 'start-real' && DEMO_MODE) {
      event.preventDefault();
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      clearDemoLicenseData();
      try {
        await discardDemoCasebook();
        location.assign('/');
      } catch (error) {
        this.toast = error instanceof Error ? error.message : 'The sample data could not be cleared.';
        this.render();
      }
    } else if (action === 'new-case') {
      if (!this.license.unlocked && this.cases.length >= FREE_CASE_LIMIT) { this.view = 'license'; this.toast = `The free casebook holds ${FREE_CASE_LIMIT} cases. Your existing work is safe.`; }
      else { this.view = 'editor'; this.editingId = null; }
      this.pushView(); this.render(); this.focusMain();
    } else if (action === 'add-example') {
      await saveCase(makeExample()); await this.refresh(); this.toast = 'Generic example added. Edit it to fit what you are learning.'; this.render();
    } else if (action === 'edit') {
      this.editingId = button.dataset.id ?? null; this.view = 'editor'; this.pushView(); this.render(); this.focusMain();
    } else if (action === 'practice') {
      this.startReview(button.dataset.id);
    } else if (action === 'start-review' || action === 'begin-due') {
      this.startReview();
    } else if (action === 'leave-review') {
      this.navigate('library');
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
      validateCaseCard(card);
      await saveCase(card); await this.refresh(); this.view = 'library'; this.pushView(); this.toast = existing ? 'Case updated.' : 'Case saved. It is ready to review.'; this.render(); this.focusMain();
    } catch (caught) {
      const error = document.querySelector('#form-error');
      if (error) error.textContent = caught instanceof Error && caught.message.startsWith('The ') ? caught.message : 'The case could not be saved. Check browser storage and try again.';
    }
  }

  private startReview(id?: string): void {
    const due = this.cases.find((card) => isDue(card));
    this.reviewId = id ?? due?.id ?? this.cases[0]?.id ?? null;
    this.reviewChoice = '';
    this.revealed = false;
    this.view = 'review';
    this.pushView();
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
      const collidingCases = this.importCandidate.cases.filter((card) => this.cases.some((local) => local.id === card.id));
      const importedNewCases = this.importCandidate.cases.length - collidingCases.length;
      const mergedCount = this.cases.length + importedNewCases;
      const replacementCount = this.importCandidate.cases.length;
      if (!this.license.unlocked && (mergedCount > FREE_CASE_LIMIT || replacementCount > FREE_CASE_LIMIT)) {
        this.importCandidate = null;
        throw new Error(`That backup would store up to ${Math.max(mergedCount, replacementCount)} cases. The free version stores ${FREE_CASE_LIMIT}. Buy a license or import fewer cases.`);
      }
      const dialog = document.querySelector<HTMLDialogElement>('#import-dialog');
      const summary = dialog?.querySelector('#import-summary');
      if (summary) summary.textContent = `${this.importCandidate.cases.length} cases and ${this.importCandidate.reviews.length} reviews are ready.${collidingCases.length ? ` ${collidingCases.length} case ID ${collidingCases.length === 1 ? 'matches' : 'match'} this device; Merge keeps the local version and skips the imported duplicate and its reviews.` : ''}`;
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

  private navigate(view: View): void {
    this.view = view;
    this.editingId = null;
    this.reviewId = null;
    this.pushView();
    this.render();
    this.focusMain();
  }

  private pushView(): void {
    const route = DEMO_MODE
      ? this.view === 'library' ? '/demo' : `/demo?view=${this.view}`
      : this.view === 'library' ? '/' : this.view === 'editor' ? '/write' : this.view === 'review' ? '/review' : '/pricing';
    if (`${location.pathname}${location.search}` !== route) history.pushState({ view: this.view }, '', route);
  }

  private focusMain(): void {
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('#main h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      } else {
        document.querySelector<HTMLElement>('#main')?.focus();
      }
    });
  }

  private renderFatal(message: string): void {
    appRoot.innerHTML = `<header class="site-header"><div class="masthead"><a class="wordmark" href="/">Concept Case <em>Bridge</em></a></div></header><main id="main"><section class="fatal-state" role="alert"><p class="stamp stamp-coral">Casebook unavailable</p><h1>We couldn’t open your local work</h1><p>${html(message)}</p><button class="button primary" type="button" data-action="reload">Try again</button></section></main>`;
    appRoot.removeAttribute('data-loading');
    document.querySelector('#boot-loader')?.remove();
  }
}

new BridgeApp().init();
