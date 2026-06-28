// ===== 66GM Game Station App =====

let gamesData = [];
let categoriesData = [];
let tagsData = [];
let currentCategory = 'all';
let currentTag = 'all';
let searchQuery = '';
const FEATURED_COUNT = 12;

// User-provided game covers for strip
const USER_COVERS = [
  'https://qn.ldxp.cn/a5/d1ec934abf3676156830a66b37dd20.png',
  'https://qn.ldxp.cn/77/7c4940f9affd0a9d7df027e95d06eb.png',
  'https://qn.ldxp.cn/99/3fba128bb48bc445a96364258e0732.png',
  'https://qn.ldxp.cn/c0/ff6b36536ef3900ed4232a99b5fd6a.png',
  'https://qn.ldxp.cn/6e/54b5fc337917fd8b47c2a84d80a406.png',
  "https://qn.ldxp.cn/8b/cd7d74e5d5714e593cd7bb16e293e8.png"
];
   
// 购买链接，与封面顺序一一对应
const USER_PURCHASE_LINKS = [
  'https://pay.ldxp.cn/item/mq74wg',
  'https://pay.ldxp.cn/item/dngf86',
  'https://pay.ldxp.cn/item/3cvvjy',
  'https://pay.ldxp.cn/item/sesdv3',
  'https://pay.ldxp.cn/item/cj6ezr',
  "https://pay.ldxp.cn/item/rrmpb9"
];

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  renderGameStrip();
  loadGames();
  initNavbar();
  initParticles();
});

// ===== Particle System =====
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;

  function resize() {
    const hero = canvas.parentElement;
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  const PARTICLE_COUNT = 50;
  const colors = ['rgba(255,45,120,', 'rgba(0,212,255,', 'rgba(168,85,247,', 'rgba(255,215,0,'];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const colorBase = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 0.5,
      color: colorBase,
      alpha: Math.random() * 0.3 + 0.1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(100,120,200,${0.05 * (1 - dist / 120)})`;
          ctx.lineWidth = 1;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();

      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
      ctx.fillStyle = p.color + (p.alpha * 0.05) + ')';
      ctx.fill();
    });

    animationId = requestAnimationFrame(draw);
  }

  draw();
}

// ===== Load Games Data =====
async function loadGames() {
  try {
    let data = window.GAMES_DATA;
    if (!data) {
      const response = await fetch('data/games.json');
      if (!response.ok) throw new Error(`游戏数据加载失败：${response.status}`);
      data = await response.json();
    }
    gamesData = data.games || [];
    categoriesData = data.categories || [];
    tagsData = data.tags || [];

    renderFeaturedGames();
    renderFreeGames();
    updateGamesCount();
  } catch (error) {
    console.error('Failed to load games:', error);
    document.getElementById('gamesGrid').innerHTML = renderError();
  }
}

// ===== Render Featured Games =====
function renderFeaturedGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  let filtered = filterGames();
  if (currentCategory === 'all' && currentTag === 'all' && !searchQuery) {
    filtered = filtered.filter(game => game.tags.includes('hot'));
  }
  filtered = filtered.slice(0, FEATURED_COUNT);

  if (filtered.length === 0) {
    grid.innerHTML = renderNoResults();
    return;
  }

  grid.innerHTML = filtered.map((game, index) => createGameCard(game, index)).join('');
  applyStaggerAnimation(grid);
}

// ===== Render Free Games =====
function renderFreeGames() {
  const grid = document.getElementById('freeGamesGrid');
  if (!grid) return;

  const freeGames = gamesData.filter(g => g.category === 'free');

  if (freeGames.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">暂无免费游戏数据</div>';
    return;
  }

  grid.innerHTML = freeGames.map((game, index) => createGameCard(game, index)).join('');
  applyStaggerAnimation(grid);
}

// ===== Render Game Strip =====
function renderGameStrip() {
  const track = document.getElementById('gamestripTrack');
  if (!track) return;

  // Use user-provided covers for the strip
  const covers = USER_COVERS.slice(0, 10);
  // Duplicate for seamless loop
  const items = [...covers, ...covers];

  track.innerHTML = items.map((cover, i) => {
    const itemIndex = i % covers.length;
    const purchaseLink = USER_PURCHASE_LINKS[itemIndex];
    return `
      <a class="gamestrip-item" href="${purchaseLink}" target="_blank" rel="noopener noreferrer" title="点击购买游戏" aria-label="购买热门游戏 ${itemIndex + 1}">
        <img src="${cover}" alt="" loading="eager">
      </a>
    `;
  }).join('');
}

// ===== Create Game Card =====
function createGameCard(game, index) {
  const tagColors = {
    'hot': '#ff4757', 'free': '#2ed573', 'no-ad': '#3498db', 'gm': '#9b59b6',
    'relax': '#1dd1a1', 'horror': '#57606f', 'sim': '#2980b9', 'puzzle': '#8e44ad',
    'action': '#e67e22', 'casual': '#10ac84', 'tower': '#d35400', 'food': '#ff6b81'
  };
  const tagNames = {
    'hot': '抖音爆款', 'free': '免费', 'no-ad': '免广告', 'gm': 'GM特权',
    'relax': '解压', 'horror': '恐怖', 'sim': '模拟', 'puzzle': '益智',
    'action': '动作', 'casual': '休闲', 'tower': '塔防', 'food': '美食'
  };

  const isFree = game.access === 'free';
  const badgeClass = game.badge === '抖音爆款' ? 'hot' :
                     game.badge === '免费' ? 'free' :
                     game.badge === 'GM' ? 'gm' :
                     game.badge === 'APP' ? 'app' :
                     game.badge === '推荐' ? 'vip' :
                     game.badge === '精选' ? 'featured' : '';

  const gameTags = game.tags.slice(0, 3).map(tag => {
    const color = tagColors[tag] || '#64748b';
    const name = tagNames[tag] || tag;
    return `<span class="game-tag" style="background: ${color}18; color: ${color};">${name}</span>`;
  }).join('');

  const accessClass = isFree ? 'free' : 'permanent';
  const accessLabel = isFree ? '免费' : '永久解锁';
  const btnClass = isFree ? 'free' : '';
  const btnLabel = isFree ? '立即玩' : '解锁';

  const placeholder = generatePlaceholderSvg(game.name, index);

  return `
    <div class="game-card" onclick="goToGame('${game.id}')" style="opacity:0">
      <div class="game-image">
        <img src="${game.image || placeholder}" alt="${game.name}" loading="lazy">
        ${game.badge ? `<span class="game-badge ${badgeClass}">${game.badge}</span>` : ''}
        <span class="game-access-tag ${accessClass}">${accessLabel}</span>
      </div>
      <div class="game-info">
        <h3 class="game-title">${game.name}</h3>
        <div class="game-tags">${gameTags}</div>
        <div class="game-footer">
          <span class="game-access-label ${accessClass}">${accessLabel}</span>
          <button class="btn-play ${btnClass}" onclick="event.stopPropagation(); goToGame('${game.id}')">${btnLabel}</button>
        </div>
      </div>
    </div>
  `;
}

// ===== Generate Placeholder SVG =====
function generatePlaceholderSvg(name, index) {
  const colors = [
    ['#ff2d78', '#ff6b9d'], ['#00d4ff', '#5dade2'], ['#a855f7', '#bb8fce'],
    ['#00e676', '#2ecc71'], ['#ff9f43', '#f5b041'], ['#ff4757', '#ff6b81'],
    ['#2980b9', '#42a5f5'], ['#e67e22', '#f39c12'], ['#1dd1a1', '#4db6ac'],
  ];
  const [c1, c2] = colors[(index || 0) % colors.length];

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' style='stop-color:${c1}'/>
        <stop offset='100%' style='stop-color:${c2}'/>
      </linearGradient>
    </defs>
    <rect width='400' height='300' fill='url(#g)'/>
    <rect x='140' y='90' width='120' height='80' rx='10' fill='rgba(255,255,255,0.15)'/>
    <circle cx='170' cy='130' r='8' fill='rgba(255,255,255,0.3)'/>
    <rect x='190' y='118' width='50' height='6' rx='3' fill='rgba(255,255,255,0.3)'/>
    <rect x='190' y='130' width='40' height='6' rx='3' fill='rgba(255,255,255,0.2)'/>
    <rect x='140' y='190' width='120' height='8' rx='4' fill='rgba(255,255,255,0.15)'/>
    <rect x='160' y='206' width='80' height='6' rx='3' fill='rgba(255,255,255,0.1)'/>
  </svg>`;

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// ===== Filter Games =====
function filterGames() {
  return gamesData.filter(game => {
    if (currentCategory !== 'all' && game.category !== currentCategory) return false;
    if (currentTag !== 'all' && !game.tags.includes(currentTag)) return false;
    if (searchQuery && !game.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
}

// ===== Category Filter =====
function filterCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.category === category);
  });
  renderFeaturedGames();
  updateGamesCount();
  document.getElementById('games')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== Tag Filter =====
function filterTag(tag) {
  currentTag = tag;
  document.querySelectorAll('.tag-filter').forEach(t => {
    t.classList.toggle('active', t.dataset.tag === tag);
  });
  renderFeaturedGames();
  updateGamesCount();
}

// ===== Search =====
function searchGames(query) {
  searchQuery = query;
  renderFeaturedGames();
  updateGamesCount();
}

// ===== Update Count =====
function updateGamesCount() {
  let count = filterGames().length;
  if (currentCategory === 'all' && currentTag === 'all' && !searchQuery) {
    count = gamesData.filter(game => game.tags.includes('hot')).length;
  }
  const el = document.getElementById('gamesCount');
  if (el) el.textContent = `店铺同步30+款 · 首页精选 ${Math.min(count, FEATURED_COUNT)} 款`;
}

// ===== Go to Game =====
function goToGame(gameId) {
  const game = gamesData.find(g => g.id === gameId);
  if (!game) return;
  if (game.link && game.link.includes('pay.ldxp.cn')) {
    window.open(game.link, '_blank');
  }
}

// ===== Navbar =====
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.style.borderColor = window.scrollY > 10 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)';
  });
}

// ===== Mobile Menu =====
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('active');
}

// ===== Toast =====
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== Helpers =====
function applyStaggerAnimation(container) {
  const cards = container.querySelectorAll('.game-card');
  cards.forEach((card, i) => {
    card.style.animation = `fadeIn 0.5s ease ${i * 0.07}s forwards`;
  });
}

function renderNoResults() {
  return `<div class="no-results"><div class="no-results-title">没有找到相关游戏</div><p>试试其他关键词或筛选条件</p></div>`;
}

function renderError() {
  return `<div class="no-results"><div class="no-results-title">数据加载失败</div><p>请检查网络连接或刷新页面重试</p></div>`;
}

// Close mobile menu on link click
document.querySelectorAll('.mobile-menu a').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('mobileMenu')?.classList.remove('active');
  });
});
