const fs = require('fs');

const GITHUB_USERNAME = 'programmingwithprince';
const BASE_SUBDOMAIN = 'https://http://31415929.xyz/'; // domain

async function fetchPagesRepos() {
  console.log(`Scanning GitHub repositories for ${GITHUB_USERNAME}...`);
  const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner`;
  
  const headers = { 'User-Agent': 'Pages-Directory-Builder' };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API Error: ${res.status} ${res.statusText}`);
  
  const repos = await res.json();

  // Filter only repos with GitHub Pages enabled, excluding this directory hub itself
  return repos.filter(repo => 
    repo.has_pages && 
    repo.name.toLowerCase() !== `${GITHUB_USERNAME}.github.io`.toLowerCase()
  );
}

function cleanTitle(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

async function build() {
  try {
    const repos = await fetchPagesRepos();
    console.log(`Found ${repos.length} live tool repos with Pages active.`);

    let cardsHtml = '';

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

    const template = fs.readFileSync('./template.html', 'utf8');
    const finalHtml = template.replace('<!-- STATIC_CONTENT_PLACEHOLDER -->', cardsHtml);

    fs.writeFileSync('./index.html', finalHtml);
    console.log('Successfully generated static index.html with all active tools!');
  } catch (err) {
    console.error('Build process failed:', err);
    process.exit(1);
  }
}

build();
