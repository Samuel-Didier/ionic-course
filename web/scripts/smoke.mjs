/**
 * scripts/smoke.mjs — test de fumée du site généré (headless Chrome).
 *   node scripts/smoke.mjs [--shots]
 * Vérifie : absence d'erreur console, navigation, recherche, filtres de
 * tableaux, checklists persistées, quiz, capture d'écran (option --shots).
 */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const PORT = 4199;
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = resolve(dirname(HERE), '.shots');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok, extra });
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn(process.execPath, [resolve(dirname(HERE), 'serve.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 500));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const shot = async (name) => {
  if (!SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: false });
};

try {
  /* 1. accueil */
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.hero h1');
  const cards = await page.$$eval('.chapter-card', (n) => n.length);
  check('accueil rendu', cards >= 14, `${cards} cartes`);
  check('meta du build affichée', /Build :/.test(await page.$eval('#build-info', (e) => e.textContent)));
  await shot('01-accueil');

  /* 2. navigation vers une fiche + TOC + tableaux filtrables */
  await page.click('.chapter-card[href="#/03-composants"]');
  await page.waitForSelector('.chapter-head h1');
  const title = await page.$eval('.chapter-head h1', (e) => e.textContent);
  check('fiche 03 ouverte', /composants/i.test(title), title);
  check('sidebar actif', !!(await page.$('.nav a.active')));
  const tocLinks = await page.$$eval('.toc a[data-goto]', (n) => n.length);
  check('TOC générée', tocLinks > 3, `${tocLinks} entrées`);
  const filters = await page.$$eval('.md .table-filter input', (n) => n.length);
  check('filtres de tableaux injectés', filters > 0, `${filters} filtres`);
  const h1Inside = await page.$$eval('.md h1', (n) => n.length);
  check('pas de <h1> dupliqué dans le corps', h1Inside === 0);
  const rawTag = await page.$$eval('.md ion-tabs', (n) => n.length);
  check('HTML brut échappé (code inline)', rawTag === 0);
  await shot('02-fiche');

  /* 3. filtre de tableau */
  await page.type('.md .table-filter input', 'modal');
  await page.waitForFunction(() => {
    const w = document.querySelector('.md .table-wrap.filtered');
    return w && w.querySelectorAll('tr.hidden').length > 0;
  });
  const shown = await page.$eval('.md .table-wrap.filtered span', (e) => e.textContent);
  check('filtre de tableau', /\d+ \/ \d+/.test(shown), shown);

  /* 4. scroll = lecture auto + barre de progression */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 500));
  const readLabel = await page.$eval('#read-label', (e) => e.textContent);
  check('marquage auto « lue »', /2 \/ 13/.test(readLabel), readLabel);

  /* 5. checkpoint interactif + persistance */
  await page.click('a[href="#/06-donnees"]');
  await page.waitForSelector('.checkpoint input[type=checkbox]');
  await page.click('.checkpoint input[type=checkbox]');
  await new Promise((r) => setTimeout(r, 200));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ionic-course:v1') || '{}'));
  const checkCount = Object.keys(stored.checks || {}).length;
  check('checkpoint coché et persisté', checkCount === 1, `${checkCount} checkbox en localStorage`);

  /* 6. persistance après rechargement */
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.checkpoint input[type=checkbox]');
  const stillChecked = await page.$eval('.checkpoint input[type=checkbox]', (e) => e.checked);
  check('progression conservée au reload', stillChecked === true);
  const hashAfter = await page.evaluate(() => location.hash);
  check('dernière fiche restaurée', hashAfter.includes('06-donnees'), hashAfter);

  /* 7. recherche */
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyK');
  await page.keyboard.up('Control');
  await page.waitForSelector('#search-modal:not([hidden])');
  await page.type('#search-field', 'convertFileSrc');
  await page.waitForFunction(() => document.querySelectorAll('.res').length > 0);
  const first = await page.$eval('.res', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  check('recherche Ctrl+K', /convertFileSrc|Natif|Capacitor/i.test(first), first.slice(0, 70));
  await shot('03-recherche');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 600));
  const flashed = await page.$('.md .flash');
  check('surlignage du terme trouvé', !!flashed);

  /* 8. lien interne .md → route SPA */
  await page.evaluate(() => { location.hash = '#/README'; });
  await page.waitForFunction(() => /Ionic 9 . cours express/.test(document.querySelector('.chapter-head h1')?.textContent || ''));
  const internal = await page.$$eval('.md a[href^="#/"]', (n) => n.map((a) => a.getAttribute('href')));
  check('liens .md convertis en routes', internal.length > 0, `${internal.length} liens, ex. ${internal[0]}`);

  /* 9. quiz */
  await page.goto(BASE + '#/quiz', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.q');
  const qCount = await page.$$eval('.q', (n) => n.length);
  check('quiz rendu', qCount === 10, `${qCount} questions`);
  await page.click('.q .opt:nth-child(2) input');   // bonne réponse de la Q1
  await page.waitForSelector('.q .opt.correct');
  const score = await page.$eval('.quiz-head .score', (e) => e.textContent);
  check('quiz : score mis à jour', score.trim() === '10 %', score.trim());

  await page.click('#q2 .opt:nth-child(1) input');  // mauvaise réponse de la Q2
  await new Promise((r) => setTimeout(r, 300));
  const wrong = await page.$$eval('#q2 .opt.wrong', (n) => n.length);
  const stillTen = await page.$eval('.quiz-head .score', (e) => e.textContent.trim());
  check('quiz : mauvaise réponse marquée, score inchangé', wrong === 1 && stillTen === '10 %', `${wrong} option(s) en rouge, score ${stillTen}`);
  const quizStored = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ionic-course:v1')).quiz).length);
  check('quiz : réponses persistées', quizStored === 2, `${quizStored} réponses`);
  check('quiz : explication affichée', !!(await page.$('.q .explain')));
  await shot('04-quiz');

  /* 10. thème */
  await page.click('#btn-theme');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  check('bascule de thème', theme === 'light', theme);
  await shot('05-theme-clair');

  /* 11. mobile */
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.click('#btn-theme');
  await page.evaluate(() => { location.hash = '#/03-composants'; });
  await page.waitForSelector('.chapter-head');
  await new Promise((r) => setTimeout(r, 400));   // laisse la transition du tiroir se poser
  const drawerHidden = await page.evaluate(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 1);
  check('sidebar repliée sur mobile', drawerHidden);
  await page.click('#btn-menu');
  await new Promise((r) => setTimeout(r, 350));
  const drawerOpen = await page.evaluate(() => document.querySelector('.sidebar').getBoundingClientRect().right > 100);
  check('drawer mobile ouvert', drawerOpen);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('pas de débordement horizontal', overflow <= 1, `${overflow}px`);
  await shot('06-mobile');

  /* 12. erreurs console */
  const real = errors.filter((e) => !/favicon|ERR_FILE|Autofill/i.test(e));
  check('aucune erreur console', real.length === 0, real.slice(0, 3).join(' | '));
} catch (err) {
  check('exécution du test', false, err.message);
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications OK`);
process.exit(failed.length ? 1 : 0);
