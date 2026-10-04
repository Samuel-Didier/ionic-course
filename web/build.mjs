/**
 * build.mjs — génère le site statique du cours Ionic dans ./site/
 *
 *   node build.mjs            build unique
 *   node build.mjs --watch    rebuild à chaque modification des .md
 *   node build.mjs --src=../  dossier source des fiches (défaut : parent)
 *
 * Sortie : site/ (100 % statique, aucun CDN, aucun runtime réseau)
 *   index.html, styles.css, app.js, quiz.js, content.js (généré), .nojekyll
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'site');
const SRC = resolve(HERE, process.argv.find((a) => a.startsWith('--src='))?.slice(6) ?? '..');

/* ------------------------------------------------------------------ */
/* Métadonnées des fiches                                              */
/* ------------------------------------------------------------------ */
const ORDER = [
  ['README.md', 'Accueil', 'Commencer', 5],
  ['00-modele-mental.md', '00', 'Commencer', 5],
  ['01-demarrage.md', '01', 'Le cours', 10],
  ['02-navigation.md', '02', 'Le cours', 10],
  ['03-composants.md', '03', 'Le cours', 12],
  ['04-overlays.md', '04', 'Le cours', 12],
  ['05-styling.md', '05', 'Le cours', 10],
  ['06-donnees.md', '06', 'Le cours', 12],
  ['07-capacitor.md', '07', 'Le cours', 12],
  ['08-tests-et-livraison.md', '08', 'Le cours', 10],
  ['90-cheatsheet.md', '90', 'Annexes', 10],
  ['91-pieges-v9.md', '91', 'Annexes', 10],
  ['92-atelier-fil-rouge.md', '92', 'Annexes', 30],
];
const GROUPS = ['Commencer', 'Le cours', 'Annexes'];

/* ------------------------------------------------------------------ */
/* Markdown : renderer                                                  */
/* ------------------------------------------------------------------ */
const slugify = (s) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[`*_[\]()#]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'section';

const md = new MarkdownIt({ html: true, linkify: true, breaks: false, typographer: false });

// 1. identifiants + ancres sur les titres
md.core.ruler.push('heading_ids', (state) => {
  const used = new Map();
  for (let i = 0; i < state.tokens.length; i++) {
    if (state.tokens[i].type !== 'heading_open') continue;
    const inline = state.tokens[i + 1];
    let base = slugify(inline.content);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const id = n > 1 ? `${base}-${n}` : base;
    state.tokens[i].attrSet('id', id);
    inline.meta = { ...(inline.meta ?? {}), id };
  }
});

// 2. en-tête de page : on retire le <h1> (le site l'affiche lui-même)
md.core.ruler.push('strip_h1', (state) => {
  const start = state.tokens.findIndex((t) => t.type === 'heading_open' && t.tag === 'h1');
  if (start === -1) return true;
  let end = start;
  let depth = 0;
  do {
    const t = state.tokens[end];
    if (t.type === 'heading_open') depth++;
    else if (t.type === 'heading_close') depth--;
    end++;
  } while (depth > 0 && end < state.tokens.length);
  state.tokens.splice(start, end - start);
  return true;
});

// 3. <table> scrollable + badge de langage sur les blocs de code
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
md.renderer.rules.table_close = () => '</table></div>';
md.renderer.rules.fence = (tokens, idx) => {
  const t = tokens[idx];
  const lang = (t.info || '').trim().split(/\s+/)[0] || 'text';
  return `<div class="code" data-lang="${md.utils.escapeHtml(lang)}">` +
    `<button class="code-copy" type="button" aria-label="Copier le code">Copier</button>` +
    `<pre><code class="language-${md.utils.escapeHtml(lang)}">${md.utils.escapeHtml(t.content)}</code></pre></div>\n`;
};

// 4. liens : .md → route interne du SPA ; externes → nouvelle fenêtre
md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
  const href = tokens[idx].attrGet('href') ?? '';
  if (/\.md($|[#?])/.test(href)) {
    const target = href.split('#')[0].replace(/\.md$/, '');
    tokens[idx].attrSet('href', `#/${target}`);
    tokens[idx].attrSet('data-md-link', target);
  } else if (/^https?:\/\//.test(href)) {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
  }
  return self.renderToken(tokens, idx, opts);
};

/* ------------------------------------------------------------------ */
/* Extraction du checkpoint (blockquote)                                */
/* ------------------------------------------------------------------ */
function extractCheckpoint(src) {
  const lines = src.split('\n');
  const start = lines.findIndex((l) => /^>\s*\*\*(Checkpoint|Auto-évaluation)\*\*/.test(l));
  if (start === -1) return { checkpoint: [], body: src };
  const collected = [];
  for (let i = start; i < lines.length && lines[i].startsWith('>'); i++) collected.push(lines[i].replace(/^>\s?/, ''));
  const body = [...lines.slice(0, start), ...lines.slice(start + collected.length)].join('\n');
  const text = collected.join(' ').replace(/\*\*/g, '');
  const items = text
    .split(/[;·]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { checkpoint: items.length ? items : [text.trim()], body };
}

const stripTags = (html) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:[a-z]+|#\d+);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */
function build() {
  const chapters = [];
  const missing = [];

  for (const [file, num, group, minutes] of ORDER) {
    const path = join(SRC, file);
    if (!existsSync(path)) { missing.push(file); continue; }

    const raw = readFileSync(path, 'utf8');
    const { checkpoint, body } = extractCheckpoint(raw);
    const html = md.render(body);
    const title = (raw.match(/^#\s+(.+)$/m)?.[1] ?? file).replace(/[`*]/g, '').trim();
    const text = stripTags(html);

    const headings = [];
    const re = /<(h[23])\s+id="([^"]+)"[^>]*>(.*?)<\/\1>/g;
    let m;
    while ((m = re.exec(html)) !== null) headings.push({ level: +m[1][1], id: m[2], text: stripTags(m[3]) });

    chapters.push({
      id: file.replace(/\.md$/, ''),
      file,
      num,
      group,
      minutes,
      title,
      isHome: file === 'README.md',
      isAnnex: group === 'Annexes',
      checkpoint,
      headings,
      html,
      text,
      words: text.split(/\s+/).length,
      minutesRead: Math.max(1, Math.round(text.split(/\s+/).length / 180)),
    });
  }

  if (missing.length) console.warn('⚠️  fiches manquantes :', missing.join(', '));

  const payload = {
    generatedAt: new Date().toISOString(),
    counts: {
      chapters: chapters.length,
      words: chapters.reduce((n, c) => n + c.words, 0),
      minutes: chapters.reduce((n, c) => n + (c.isHome ? 0 : c.minutes), 0),
      checkpoints: chapters.reduce((n, c) => n + c.checkpoint.length, 0),
    },
    groups: GROUPS,
    chapters,
  };

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(join(HERE, 'src'), OUT, { recursive: true });

  // contenu sérialisé (le < est échappé : sûr même si le fichier finit inliné)
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  writeFileSync(join(OUT, 'content.js'), `/* généré par build.mjs — ne pas éditer */\nwindow.COURSE = ${json};\n`);
  writeFileSync(join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  writeFileSync(join(OUT, '.nojekyll'), '');
  // GH Pages : sert index.html pour toute URL inconnue (utile si /quiz est lié directement)
  cpSync(join(OUT, 'index.html'), join(OUT, '404.html'));

  const kb = (f) => (statSync(join(OUT, f)).size / 1024).toFixed(1) + ' ko';
  console.log('✅ build →', OUT);
  console.log(`   ${chapters.length} fiches · ${payload.counts.words} mots · ~${payload.counts.minutes} min · ${payload.counts.checkpoints} checkpoints`);
  for (const f of ['index.html', 'styles.css', 'app.js', 'quiz.js', 'content.js'])
    console.log(`   ${f.padEnd(12)} ${kb(f)}`);
}

build();

if (process.argv.includes('--watch')) {
  console.log('👀 watch — Ctrl+C pour arrêter');
  const { watch } = await import('node:fs');
  let timer;
  const dirs = [HERE, join(HERE, 'src'), SRC].filter((d) => existsSync(d));
  for (const dir of dirs) {
    watch(dir, (_event, name) => {
      if (name && !/\.(md|html|css|js)$/.test(name)) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { build(); } catch (err) { console.error(err); }
      }, 120);
    });
  }
}
