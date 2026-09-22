// dev note: automated pages builder for tools.31415929.xyz
// fetches public repos with has_pages=true and compiles template.html -> index.html

const fs = require('fs');

const GITHUB_USERNAME = 'programmingwithprince';
const BASE_SUBDOMAIN = 'https://tools.31415929.xyz';

async function fetchPagesRepos() {
  console.log(`[SYS] Scanning repositories for @${GITHUB_USERNAME}...`);
  const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`;
  
  const headers = {
    'User-Agent': 'Pages-Directory-Builder',
    'Accept': 'application/vnd.github+json'
  };

  // Bump rate limits in CI if GITHUB_TOKEN exists
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API Error (${res.status}): ${await res.text()}`);
  }
  
  const repos = await res.json();
  console.log(`[SYS] Total repos received: ${repos.length}`);

  // Filter only repos with pages active, skip the username.github.io root repo
  const pagesRepos = repos.filter(repo => {
    const isPages = Boolean(repo.has_pages);
    const isSelf = repo.name.toLowerCase() === `${GITHUB_USERNAME}.github.io`.toLowerCase();
    return isPages && !isSelf;
  });

  console.log(`[SYS] Active Pages nodes detected (${pagesRepos.length}):`, pagesRepos.map(r => r.name));
  return pagesRepos;
}

function cleanTitle(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

async function build() {
  try {
    const repos = await fetchPagesRepos();

    let cardsHtml = '';

    if (repos.length === 0) {
      console.warn('⚠️ No repositories with has_pages=true found.');
      cardsHtml = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--muted); font-family: var(--font-mono); font-size: 13px;">
        <p>[WARN] No active GitHub Pages nodes detected on this registry.</p>
        <p style="margin-top: 6px; font-size: 11px;">Enable GitHub Pages in repository settings to index new tools automatically.</p>
      </div>`;
    } else {
      for (const repo of repos) {
        const title = cleanTitle(repo.name);
        const desc = repo.description || 'Web-based developer utility and open-source project node.';
        const toolUrl = `${BASE_SUBDOMAIN}/${repo.name}/`;
        
        // Grab topics or fallback to repo language
        const tags = (repo.topics && repo.topics.length > 0) 
          ? repo.topics 
          : [repo.language].filter(Boolean);

        const tagsHtml = tags
          .map(tag => `<span class="tag">${tag}</span>`)
          .join('');

        cardsHtml += `
        <a class="tool-card" href="${toolUrl}" target="_blank" rel="noopener">
          <div>
            <div class="card-header">
              <h2 class="card-title">${title}</h2>
            </div>
            <p class="card-desc">${desc}</p>
            <div class="tags">${tagsHtml}</div>
          </div>
          <div class="card-footer">
            <span class="launch-btn">[LAUNCH MODULE]</span>
            <span>&rarr;</span>
          </div>
        </a>\n`;
      }
    }

    if (!fs.existsSync('./template.html')) {
      throw new Error('template.html not found in root directory.');
    }

    const template = fs.readFileSync('./template.html', 'utf8');
    const finalHtml = template.replace('<!-- STATIC_CONTENT_PLACEHOLDER -->', cardsHtml);

    fs.writeFileSync('./index.html', finalHtml);
    console.log('✅ Successfully compiled and baked index.html!');
  } catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
  }
}

build();
