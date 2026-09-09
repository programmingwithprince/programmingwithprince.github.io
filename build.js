const fs = require('fs');

const GITHUB_USERNAME = 'programmingwithprince';
const BASE_SUBDOMAIN = 'https://tools.yourdomain.xyz'; // <-- Change this to your actual domain (e.g., https://tools.example.com)

async function fetchPagesRepos() {
  console.log(`Scanning GitHub repositories for user: ${GITHUB_USERNAME}...`);
  const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`;
  
  const headers = {
    'User-Agent': 'Pages-Directory-Builder',
    'Accept': 'application/vnd.github+json'
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API Error (${res.status}): ${await res.text()}`);
  }
  
  const repos = await res.json();
  console.log(`Total public repos fetched: ${repos.length}`);

  // Log which repos have Pages turned on
  const pagesRepos = repos.filter(repo => {
    const isPages = Boolean(repo.has_pages);
    const isSelf = repo.name.toLowerCase() === `${GITHUB_USERNAME}.github.io`.toLowerCase();
    return isPages && !isSelf;
  });

  console.log(`Repos with GitHub Pages active (${pagesRepos.length}):`, pagesRepos.map(r => r.name));
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
      console.warn('⚠️ Warning: No repositories with has_pages=true were found.');
      cardsHtml = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--muted);">
        <p>No tools currently detected with GitHub Pages enabled.</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">Turn on GitHub Pages in your repo settings to list them here automatically.</p>
      </div>`;
    } else {
      for (const repo of repos) {
        const title = cleanTitle(repo.name);
        const desc = repo.description || 'Web-based developer utility and open-source project.';
        const toolUrl = `${BASE_SUBDOMAIN}/${repo.name}/`;
        
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
            <span>Launch Tool</span> &rarr;
          </div>
        </a>\n`;
      }
    }

    if (!fs.existsSync('./template.html')) {
      throw new Error('template.html not found in the root directory!');
    }

    const template = fs.readFileSync('./template.html', 'utf8');
    const finalHtml = template.replace('<!-- STATIC_CONTENT_PLACEHOLDER -->', cardsHtml);

    fs.writeFileSync('./index.html', finalHtml);
    console.log('✅ Successfully wrote to index.html!');
  } catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
  }
}

build();
