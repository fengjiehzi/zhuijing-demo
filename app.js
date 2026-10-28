import { NOW, OPTIONS, reminderTime, followReasons, selectMatches, saveReminder } from './core.js';
import { games, entities, matches, entity } from './data.js';

/* ===== 图标 ===== */
const icons = {
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  heart: '<path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 20a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trophy: '<path d="M7 3h10v4a5 5 0 0 1-10 0V3zM4 8h3M17 8h3M9 14v5h6v-5"/>',
  tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escape = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const time = v => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(v));
const date = v => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' }).format(new Date(v));

/* ===== 状态 ===== */
const key = 'zhuijing-demo-v1';
let store = { following: [], reminders: [] };
let storageWarning = false;
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved) {
    store.following = Array.isArray(saved.following) ? [...new Set(saved.following.filter(id => entity(id)))] : [];
    for (const r of Array.isArray(saved.reminders) ? saved.reminders : []) {
      const match = matches.find(m => m.id === r?.matchId);
      if (match && OPTIONS.some(o => o.id === r.option)) {
        try { store.reminders = saveReminder(store.reminders, match, r.option); } catch { /* ignore */ }
      }
    }
  }
} catch { storageWarning = true; }

let page = ['schedule', 'following', 'reminders'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'schedule';
let filters = { platform: 'all', game: 'all', day: '0', mine: false, query: '' };
let followType = 'team';
let followQuery = '';
let onlyFollowing = false;

const main = document.querySelector('#main');
const modal = document.querySelector('#modal');
const tabBar = document.querySelector('#tab-bar');

/* ===== 工具 ===== */
let toastTimer;
function toast(msg) {
  clearTimeout(toastTimer);
  const el = document.querySelector('#toast');
  el.textContent = msg;
  el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
}
function persist() {
  try { localStorage.setItem(key, JSON.stringify(store)); } catch { toast('本地存储不可用，本次设置仅当前页面有效'); }
}

/* ===== 底部 Tab Bar ===== */
function renderTabBar() {
  const items = [
    ['schedule', 'calendar', '赛程'],
    ['following', 'heart', '关注'],
    ['reminders', 'bell', '提醒']
  ];
  tabBar.innerHTML = items.map(([id, svg, label]) => {
    const active = page === id;
    const badge = (id === 'reminders' && store.reminders.length) ? `<span class="badge">${store.reminders.length}</span>` : '';
    return `<button class="tab-item ${active ? 'active' : ''}" data-tab="${id}" aria-label="${label}">${icon(svg)}<span>${label}</span>${badge}</button>`;
  }).join('');
}

/* ===== 赛程页 ===== */
function schedulePage() {
  const selected = selectMatches(matches, filters, store.following, entities);
  const counts = {
    'all': games.length,
    'pc': games.filter(g => g.platform === 'pc').length,
    'mobile': games.filter(g => g.platform === 'mobile').length
  };
  const days = [
    ['0', '今天', '10.27'],
    ['1', '明天', '10.28'],
    ['2', '周四', '10.29'],
    ['3', '周五', '10.30'],
    ['week', '7天内', '全部']
  ];

  main.innerHTML = `
    <div class="page-title">
      <h1>赛程</h1>
      <div class="subtitle">你关心的比赛都在这里</div>
    </div>

    <div class="filter-bar">
      <div class="platform-seg" role="tablist">
        <button data-action="platform" data-id="all" class="${filters.platform === 'all' ? 'active' : ''}" aria-pressed="${filters.platform === 'all'}">全部</button>
        <button data-action="platform" data-id="pc" class="${filters.platform === 'pc' ? 'active' : ''}" aria-pressed="${filters.platform === 'pc'}">端游</button>
        <button data-action="platform" data-id="mobile" class="${filters.platform === 'mobile' ? 'active' : ''}" aria-pressed="${filters.platform === 'mobile'}">手游</button>
      </div>
      <div class="game-row">
        <select class="game-select" id="game" aria-label="游戏项目">
          <option value="all">全部游戏</option>
          ${games.filter(g => filters.platform === 'all' || g.platform === filters.platform).map(g =>
            `<option value="${g.id}" ${filters.game === g.id ? 'selected' : ''}>${g.name}</option>`
          ).join('')}
        </select>
        <label class="mine-switch">
          <input id="mine" type="checkbox" ${filters.mine ? 'checked' : ''}>
          <span class="switch-track"></span>
          只看关注
        </label>
      </div>
      <div class="day-scroll">
        ${days.map(([id, label, sub]) => `<button class="day-btn ${filters.day === id ? 'active' : ''}" data-action="day" data-id="${id}">
          <b>${label}</b><span>${sub}</span>
        </button>`).join('')}
      </div>
    </div>

    <label class="search-bar">
      ${icon('search')}
      <input id="match-search" placeholder="搜索赛事、战队、选手" aria-label="搜索" value="${escape(filters.query)}">
    </label>

    <div class="section-header">
      <h2>比赛列表</h2>
      <span class="count">${selected.length} 场</span>
    </div>

    <div class="match-list" id="match-list">
      ${selected.length ? selected.map(matchCard).join('') : emptyState('暂无比赛', filters.mine && !store.following.length ? '先关注一支战队或选手吧' : '换个筛选条件试试', '<button class="btn btn-primary btn-sm" data-action="clear-filters">清除筛选</button>')}
    </div>

    <div class="demo-footer">
      示例赛程 · 固定演示时间 2026.10.27 12:00<br>
      <a href="prd.html" target="_blank">查看完整 PRD →</a>
    </div>
  `;
}

function matchCard(match) {
  const game = entity(match.gameId);
  const reasons = followReasons(match, store.following);
  const reminder = store.reminders.find(r => r.matchId === match.id);
  return `<div class="match-card" data-match="${match.id}">
    <div class="match-card-head">
      <i class="game-dot" style="background:${game.color}"></i>
      <span>${game.name}</span>
      <span class="sep">·</span>
      <span>${entity(match.eventId).name}</span>
      <span class="format">${match.format}</span>
    </div>
    <button class="match-card-body" data-action="detail" data-id="${match.id}" aria-label="查看比赛详情">
      <div class="match-time">
        <span class="time">${time(match.startAt)}</span>
        <span class="date">${date(match.startAt)}</span>
      </div>
      <div class="match-teams">
        <div class="team">
          <span class="team-name">${entity(match.teamIds[0]).name}</span>
        </div>
        <span class="vs">VS</span>
        <div class="team">
          <span class="team-name">${entity(match.teamIds[1]).name}</span>
        </div>
      </div>
    </button>
    <div class="match-card-foot">
      <span class="stage">${match.stage}</span>
      <button class="remind-btn ${reminder ? 'active' : ''}" data-action="remind" data-id="${match.id}">
        ${icon(reminder ? 'check' : 'bell')}${reminder ? '已预约' : '提醒我'}
      </button>
    </div>
    ${reasons.length ? `<div class="match-reason">${icon('heart')}你关注的 ${reasons.map(id => entity(id).name).join('、')} 参与了这场</div>` : ''}
  </div>`;
}

/* ===== 关注页 ===== */
function followingPage() {
  const tabs = [
    ['game', '游戏', countsOfType('game')],
    ['event', '赛事', countsOfType('event')],
    ['team', '战队', countsOfType('team')],
    ['player', '选手', countsOfType('player')]
  ];
  main.innerHTML = `
    <div class="page-title">
      <h1>我的关注</h1>
      <div class="subtitle">让喜欢的战队和选手不再缺席</div>
      <span class="title-badge">已关注 ${store.following.length} 项</span>
    </div>

    <div class="follow-tabs" role="tablist">
      ${tabs.map(([id, label]) => `<button data-follow-type="${id}" class="${followType === id ? 'active' : ''}">${label}${countsOfFollowed(id) ? `<span class="count-chip">${countsOfFollowed(id)}</span>` : ''}</button>`).join('')}
    </div>

    <div class="section-header">
      <h2>${followType === 'game' ? '全部游戏' : followType === 'event' ? '全部赛事' : followType === 'team' ? '全部战队' : '全部选手'}</h2>
      <label class="mine-switch">
        <input id="only-following" type="checkbox" ${onlyFollowing ? 'checked' : ''}>
        <span class="switch-track"></span>
        只看已关注
      </label>
    </div>

    <label class="search-bar" style="margin-top:0;">
      ${icon('search')}
      <input id="follow-search" placeholder="搜索名称或所属游戏" aria-label="搜索" value="${escape(followQuery)}">
    </label>

    <div class="entity-list" id="entity-list">
      ${renderEntityItems()}
    </div>
  `;
}

function countsOfType(type) {
  return entities.filter(e => e.type === type).length;
}
function countsOfFollowed(type) {
  return entities.filter(e => e.type === type && store.following.includes(e.id)).length;
}
function renderEntityItems() {
  const list = entities.filter(e =>
    e.type === followType &&
    (!onlyFollowing || store.following.includes(e.id)) &&
    `${e.name} ${entity(e.gameId)?.name || ''}`.toLowerCase().includes(followQuery.toLowerCase().trim())
  );
  if (!list.length) return emptyState('没找到', onlyFollowing ? '先取消「只看已关注」来浏览全部' : '换个关键词试试');
  return list.map(e => {
    const followed = store.following.includes(e.id);
    const meta = e.type === 'game' ? (e.platform === 'pc' ? '端游电竞' : '手游电竞')
      : entity(e.gameId).name + (e.type === 'player' ? ` · ${entity(e.teamId).name}` : '');
    return `<div class="entity-item">
      <div class="entity-avatar" style="background:${e.type === 'game' ? e.color + '22' : 'var(--brand-light)'};color:${e.type === 'game' ? e.color : 'var(--brand-dark)'}">${e.short}</div>
      <div class="entity-info">
        <div class="name">${e.name}</div>
        <div class="meta">${meta}</div>
      </div>
      <button class="follow-btn ${followed ? 'active' : ''}" data-action="follow" data-id="${e.id}">${followed ? '已关注' : '关注'}</button>
    </div>`;
  }).join('');
}

/* ===== 提醒中心 ===== */
function remindersPage() {
  const sorted = [...store.reminders].sort((a, b) => a.at - b.at);
  main.innerHTML = `
    <div class="page-title">
      <h1>提醒中心</h1>
      <div class="subtitle">提前一点，刚好赶上心动的瞬间</div>
    </div>

    <div class="section-header">
      <h2>已预约的比赛</h2>
      <span class="count">${sorted.length} 场</span>
    </div>

    <div class="reminder-list" id="reminder-list">
      ${sorted.length ? sorted.map(reminderCard).join('') : emptyState('还没有预约', '去赛程页给下一场热爱留个提醒', '<button class="btn btn-primary btn-full" style="margin-top:16px" data-goto="#schedule">去看比赛</button>')}
    </div>

    ${sorted.length ? `
    <div class="demo-footer">
      本 Demo 为模拟预约，不会发送通知<br>
      提醒时间规则见 <a href="prd.html" target="_blank">PRD</a>
    </div>` : ''}
  `;
}

function reminderCard(r) {
  const match = matches.find(m => m.id === r.matchId);
  return `<div class="reminder-card">
    <div class="reminder-time-row">
      ${icon('bell')}
      <span class="time-text">${date(r.at)} ${time(r.at)}</span>
      <span class="status">模拟</span>
    </div>
    <div class="reminder-match">${entity(match.teamIds[0]).name} vs ${entity(match.teamIds[1]).name}</div>
    <div class="reminder-meta">${entity(match.gameId).name} · 开赛 ${time(match.startAt)} · ${OPTIONS.find(o => o.id === r.option).label}</div>
    <div class="reminder-footer">
      <span>${entity(match.eventId).name}</span>
      <div class="options">
        <button data-action="preview" data-id="${match.id}">预览</button>
        <button data-action="remind" data-id="${match.id}">修改</button>
        <button class="danger" data-action="cancel" data-id="${match.id}">取消</button>
      </div>
    </div>
  </div>`;
}

/* ===== 空态 ===== */
function emptyState(title, desc, action = '') {
  return `<div class="empty-state">
    <div class="empty-icon">${icon('calendar')}</div>
    <h3>${title}</h3>
    <p>${desc}</p>
    ${action}
  </div>`;
}

/* ===== 弹窗 ===== */
function openModal(content) {
  modal.innerHTML = content;
  if (!modal.open) modal.showModal();
}

function detailDialog(id) {
  const match = matches.find(m => m.id === id);
  const tm1 = entity(match.teamIds[0]);
  const tm2 = entity(match.teamIds[1]);
  const followedTeams = match.teamIds.filter(tid => store.following.includes(tid));
  const followedPlayers = match.playerIds.filter(pid => store.following.includes(pid));
  const followedEvent = store.following.includes(match.eventId);
  openModal(`
    <div class="detail-dialog-head">
      <button class="close-btn" data-action="close" aria-label="关闭">${icon('close')}</button>
      <div class="title-group">
        <h2>${entity(match.eventId).name}</h2>
        <p>${entity(match.gameId).name} · ${match.stage} · ${match.format}</p>
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-team-row">
        <div class="team-col">
          <div class="avatar" style="background:${entity(match.gameId).color}22;color:${entity(match.gameId).color}">${tm1.short}</div>
          <div class="name">${tm1.name}</div>
          <button class="follow-btn ${store.following.includes(tm1.id) ? 'active' : ''}" data-action="follow" data-id="${tm1.id}" style="padding:4px 10px;font-size:11px;min-height:26px;">${store.following.includes(tm1.id) ? '已关注' : '+关注'}</button>
        </div>
        <span class="vs-text">VS</span>
        <div class="team-col">
          <div class="avatar" style="background:${entity(match.gameId).color}22;color:${entity(match.gameId).color}">${tm2.short}</div>
          <div class="name">${tm2.name}</div>
          <button class="follow-btn ${store.following.includes(tm2.id) ? 'active' : ''}" data-action="follow" data-id="${tm2.id}" style="padding:4px 10px;font-size:11px;min-height:26px;">${store.following.includes(tm2.id) ? '已关注' : '+关注'}</button>
        </div>
      </div>

      <div class="detail-time-row">
        ${icon('clock')}
        <span>${date(match.startAt)} ${time(match.startAt)} 开赛</span>
      </div>

      <div class="detail-section-title">登场选手（示例阵容）</div>
      ${match.playerIds.map(pid => `<div class="detail-row">
        <span class="label">${entity(pid).name}</span>
        <button class="follow-btn ${store.following.includes(pid) ? 'active' : ''}" data-action="follow" data-id="${pid}" style="padding:3px 10px;font-size:11px;min-height:24px;">${store.following.includes(pid) ? '已关注' : '+关注'}</button>
      </div>`).join('')}

      <div class="detail-row" style="border-top:1px solid var(--line);margin-top:12px;padding-top:12px;">
        <span class="label">关注这场赛事</span>
        <button class="follow-btn ${followedEvent ? 'active' : ''}" data-action="follow" data-id="${match.eventId}">${followedEvent ? '已关注' : '+关注'}</button>
      </div>

      <p class="detail-footnote">* 赛程与阵容为体验示例，正式版以官方公布为准</p>

      <button class="btn btn-primary btn-full" style="margin-top:16px;" data-action="remind" data-id="${id}">${icon('bell')}预约这场比赛</button>
    </div>
  `);
}

function reminderDialog(id) {
  const match = matches.find(m => m.id === id);
  const existing = store.reminders.find(r => r.matchId === id);
  const options = OPTIONS.map(o => {
    const expired = reminderTime(match.startAt, o.id) <= NOW;
    const selected = !expired && (existing?.option || '60') === o.id;
    return `<label class="reminder-option ${expired ? 'disabled' : ''} ${selected ? 'selected' : ''}">
      <input type="radio" name="option" value="${o.id}" ${expired ? 'disabled' : ''} ${selected ? 'checked' : ''} aria-label="${o.label}">
      <span>
        <b>${o.label}</b>
        <small>${expired ? '已过期' : `${date(reminderTime(match.startAt, o.id))} ${time(reminderTime(match.startAt, o.id))} · ${o.description}`}</small>
      </span>
    </label>`;
  }).join('');
  openModal(`
    <h2>什么时候提醒你？</h2>
    <p class="muted">${entity(match.teamIds[0]).name} vs ${entity(match.teamIds[1]).name}<br>${time(match.startAt)} 开赛</p>
    <form id="reminder-form" data-id="${id}">
      <div class="dialog-body" style="padding:0 20px 16px;">
        ${options}
        <p class="consent-note">这是模拟授权，不会调用微信或发送真实消息。正式版需主动同意微信订阅消息。</p>
        <button type="submit" class="form-submit">${existing ? '保存预约' : '同意并预约'} ${icon('arrow')}</button>
      </div>
    </form>
  `);
}

function cancelDialog(id) {
  const match = matches.find(m => m.id === id);
  openModal(`
    <h2>取消这场提醒？</h2>
    <p class="muted">${entity(match.teamIds[0]).name} vs ${entity(match.teamIds[1]).name}<br>取消后比赛仍在赛程中。</p>
    <div class="dialog-actions">
      <button class="btn-cancel" data-action="close">保留</button>
      <button class="btn-confirm" data-action="confirm-cancel" data-id="${id}">取消预约</button>
    </div>
  `);
}

function resetDialog() {
  openModal(`
    <h2>清除体验数据？</h2>
    <p class="muted">仅清除本浏览器的关注和预约记录，不影响任何线上数据。</p>
    <div class="dialog-actions">
      <button class="btn-cancel" data-action="close">保留数据</button>
      <button class="btn-confirm" data-action="confirm-reset">确认清除</button>
    </div>
  `);
}

function previewDialog(id) {
  const match = matches.find(m => m.id === id);
  const reminder = store.reminders.find(r => r.matchId === id);
  if (!reminder) return;
  openModal(`
    <h2>通知预览</h2>
    <p class="muted">以下为样式预览，未发送真实消息。</p>
    <div class="dialog-body">
      <div class="notification-card">
        <div class="notification-head">
          <span class="mini-avatar">竞</span>
          <span class="brand-text">追竞 · 赛事提醒</span>
          <span class="preview-tag">模拟</span>
        </div>
        <div class="notification-title">${entity(match.teamIds[0]).name} vs ${entity(match.teamIds[1]).name}</div>
        <div class="notification-field"><span class="label">赛事</span><span class="value">${entity(match.eventId).name}</span></div>
        <div class="notification-field"><span class="label">开赛时间</span><span class="value">${date(match.startAt)} ${time(match.startAt)}</span></div>
        <div class="notification-field"><span class="label">提醒时间</span><span class="value">${date(reminder.at)} ${time(reminder.at)}</span></div>
      </div>
      <button class="btn btn-primary btn-full" data-action="close">知道了</button>
    </div>
  `);
}

/* ===== 路由渲染 ===== */
function render() {
  renderTabBar();
  ({ schedule: schedulePage, following: followingPage, reminders: remindersPage })[page]();
}

/* ===== 事件委托 ===== */
document.addEventListener('click', e => {
  // tab bar 切换
  const tab = e.target.closest('[data-tab]');
  if (tab) { page = tab.dataset.tab; location.hash = page; return; }
  const goto = e.target.closest('[data-goto]');
  if (goto) { location.hash = goto.dataset.goto.replace('#', ''); return; }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'close') return modal.close();

  if (action === 'detail') return detailDialog(id);
  if (action === 'remind') return reminderDialog(id);
  if (action === 'preview') return previewDialog(id);

  if (action === 'follow') {
    const active = store.following.includes(id);
    store.following = active ? store.following.filter(v => v !== id) : [...store.following, id];
    persist();
    // 如果 modal 还开着且页面有 detail 结构，刷新它
    if (modal.open && modal.querySelector('.detail-team-row')) {
      const matchId = modal.querySelector('[data-action="remind"]')?.dataset.id;
      if (matchId) detailDialog(matchId);
    }
    toast(active ? `已取消关注${entity(id).name}` : `已关注${entity(id).name}`);
    return render();
  }

  if (action === 'platform') { filters.platform = id; filters.game = 'all'; return schedulePage(); }
  if (action === 'day') { filters.day = id; return schedulePage(); }
  if (action === 'clear-filters') {
    filters = { platform: 'all', game: 'all', day: '0', mine: false, query: '' };
    followQuery = ''; onlyFollowing = false;
    location.hash = 'schedule';
    return render();
  }
  if (action === 'follow-type') { followType = id; return followingPage(); }

  if (action === 'cancel') return cancelDialog(id);
  if (action === 'confirm-cancel') {
    store.reminders = store.reminders.filter(r => r.matchId !== id);
    persist(); modal.close(); toast('已取消预约'); return render();
  }

  if (action === 'reset') return resetDialog();
  if (action === 'confirm-reset') {
    store = { following: [], reminders: [] };
    persist(); modal.close(); toast('体验数据已清除'); return render();
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'game') { filters.game = e.target.value; schedulePage(); }
  if (e.target.id === 'mine') { filters.mine = e.target.checked; schedulePage(); }
  if (e.target.id === 'only-following') { onlyFollowing = e.target.checked; followingPage(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'match-search') { filters.query = e.target.value; schedulePage(); }
  if (e.target.id === 'follow-search') { followQuery = e.target.value; followingPage(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'reminder-form') return;
  e.preventDefault();
  try {
    store.reminders = saveReminder(
      store.reminders,
      matches.find(m => m.id === e.target.dataset.id),
      new FormData(e.target).get('option')
    );
    persist(); modal.close(); toast('预约成功，可在提醒中心查看'); render();
  } catch (err) { toast(err.message); }
});

window.addEventListener('hashchange', () => {
  page = ['schedule', 'following', 'reminders'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'schedule';
  if (modal.open) modal.close();
  render(); window.scrollTo(0, 0);
});

render();
if (storageWarning) toast('无法读取本地数据，以新体验开始');
