import { NOW, OPTIONS, reminderTime, followReasons, selectMatches, saveReminder } from './core.js';
import { games, entities, matches, entity } from './data.js';

const icons = {
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 1h8"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const time = value => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
const date = value => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' }).format(new Date(value));
const key = 'zhuijing-demo-v1';
let store = { following: [], reminders: [] };
let storageWarning = false;
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved) {
    store.following = Array.isArray(saved.following) ? [...new Set(saved.following.filter(id => entity(id)))] : [];
    for (const reminder of Array.isArray(saved.reminders) ? saved.reminders : []) {
      const match = matches.find(item => item.id === reminder?.matchId);
      if (match && OPTIONS.some(item => item.id === reminder.option)) {
        try { store.reminders = saveReminder(store.reminders, match, reminder.option); } catch { /* Ignore expired demo records. */ }
      }
    }
  }
} catch { storageWarning = true; }
let page = ['schedule', 'following', 'reminders'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'schedule';
let filters = { platform: 'all', game: 'all', day: '0', mine: false, query: '' };
let followType = 'team';
let followQuery = '';
let onlyFollowing = false;
let toastTimer;
const main = document.querySelector('#main');
const modal = document.querySelector('#modal');
function toast(message) {
  clearTimeout(toastTimer);
  document.querySelector('#toast').textContent = message;
  document.querySelector('#toast').classList.add('visible');
  toastTimer = setTimeout(() => document.querySelector('#toast').classList.remove('visible'), 3200);
}
function persist() {
  try { localStorage.setItem(key, JSON.stringify(store)); } catch { toast('浏览器无法保存，本次设置仅在当前页面有效'); }
}
function followButton(id, compact = false) {
  const active = store.following.includes(id);
  return `<button class="follow-btn ${active ? 'active' : ''}" data-action="follow" data-id="${id}" aria-pressed="${active}" aria-label="${active ? '取消关注' : '关注'}${entity(id).name}">${active ? icon('check') : '+'}${compact ? '' : active ? '已关注' : '关注'}</button>`;
}
function badge(id, size = '') {
  const item = entity(id), game = entity(item.gameId || item.id);
  return `<span class="emblem ${size} ${item.type === 'player' ? 'round' : ''}" style="--accent:${game.color}">${item.short}</span>`;
}
function nav() {
  document.querySelector('#navigation').innerHTML = [['schedule', 'calendar', '赛程'], ['following', 'heart', '我的关注'], ['reminders', 'bell', '提醒中心']].map(([id, svg, title]) => `<a class="nav-item ${page === id ? 'selected' : ''}" href="#${id}" ${page === id ? 'aria-current="page"' : ''}>${icon(svg)}<span>${title}</span>${id === 'reminders' && store.reminders.length ? `<b>${store.reminders.length}</b>` : ''}</a>`).join('');
}
function matchCard(match) {
  const game = entity(match.gameId), reasons = followReasons(match, store.following), reminder = store.reminders.find(item => item.matchId === match.id);
  return `<article class="match-card"><div class="match-meta"><span><i style="background:${game.color}"></i>${game.name}<span class="separator">/</span>${entity(match.eventId).name}</span><span>${match.format}</span></div><div class="match-body"><div class="match-time"><b>${time(match.startAt)}</b><span>${date(match.startAt)} · ${match.stage}</span></div><button class="match-teams" data-action="detail" data-id="${match.id}" aria-label="查看${entity(match.teamIds[0]).name}对阵${entity(match.teamIds[1]).name}详情">${badge(match.teamIds[0])}<strong>${entity(match.teamIds[0]).name}</strong><span class="versus">VS</span><strong>${entity(match.teamIds[1]).name}</strong>${badge(match.teamIds[1])}</button><button class="remind-btn ${reminder ? 'is-set' : ''}" data-action="remind" data-id="${match.id}">${icon(reminder ? 'check' : 'bell')}${reminder ? '已预约' : '提醒我'}</button></div>${reasons.length ? `<div class="match-reason">${icon('heart')}你关注的 ${reasons.map(id => entity(id).name).join('、')} 有比赛</div>` : ''}</article>`;
}
function empty(title, description, action = '') {
  return `<div class="empty">${icon('calendar')}<h3>${title}</h3><p>${description}</p>${action}</div>`;
}
function sidePanel() {
  const next = store.reminders[0];
  const match = next && matches.find(item => item.id === next.matchId);
  const followedMatches = matches.filter(item => followReasons(item, store.following).length).length;
  return `<aside class="insights"><section class="panel your-space"><div class="eyebrow">YOUR MATCHDAY</div><h3>专属你的比赛日</h3><div class="stats"><div><b>${store.following.length.toString().padStart(2, '0')}</b><span>正在关注</span></div><div><b>${followedMatches.toString().padStart(2, '0')}</b><span>相关比赛</span></div></div><a class="panel-link" href="#following">管理我的关注 ${icon('arrow')}</a></section><section class="panel"><div class="section-heading"><h3>下一条提醒</h3>${icon('bell')}</div>${next ? `<p class="lime">${date(next.at)} ${time(next.at)}</p><h4>${entity(match.teamIds[0]).name} vs ${entity(match.teamIds[1]).name}</h4><p class="muted">${OPTIONS.find(item => item.id === next.option).label} · 模拟预约</p><button class="subtle full" data-action="preview" data-id="${match.id}">预览通知效果</button>` : `<p class="muted panel-copy">把喜欢的比赛交给追竞。<br>点击「提醒我」，预约你的第一场。</p><div class="dashed-note">暂无已预约提醒</div>`}</section><section class="how-to"><span class="eyebrow">HOW IT WORKS</span><h3>热爱三步，准时到场。</h3><p><b>01</b> 关注赛事、战队或选手</p><p><b>02</b> 为相关比赛预约提醒</p><p><b>03</b> 在微信服务通知中接收消息</p><small>当前为体验版，仅模拟第 3 步。</small></section></aside>`;
}
function schedule() {
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">STAY IN THE GAME</div><h1>下一场热爱，不缺席<span class="lime">.</span></h1><p>从峡谷到赛场，你关心的比赛都在这里。</p></div><span class="date-label">10 / 27 <small>TUE</small></span></div><div class="dashboard"><div class="schedule-main"><section class="hero"><div class="hero-text"><span class="hero-kicker"><span class="tiny-dot"></span> 今晚焦点 · 示例</span><h2>为热爱<br>留个位置。</h2><p>英雄联盟 · 峡谷巅峰赛</p><button data-action="detail" data-id="match-lol" class="hero-link">赤焰 vs 北境 <span>19:00 ${icon('arrow')}</span></button></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="ticket"><span>MATCH / 001</span><b>GAME<br>ON<span>↗</span></b><div class="ticket-line"></div><small>OCT 27 · 19:00</small><div class="barcode"></div></div><span class="art-caption">THE NEXT MOMENT IS YOURS.</span></div></section><section class="schedule-section"><div class="section-heading"><h2>比赛日历 <span id="match-count"></span></h2><label class="switch-label"><input id="mine" type="checkbox" ${filters.mine ? 'checked' : ''}><span class="switch"></span>只看关注</label></div><div class="filter-row"><div class="segmented" aria-label="平台筛选">${[['all', '全部'], ['pc', '端游'], ['mobile', '手游']].map(([id, name]) => `<button data-action="platform" data-id="${id}" class="${filters.platform === id ? 'active' : ''}" aria-pressed="${filters.platform === id}">${name}</button>`).join('')}</div><label class="game-select"><span class="sr-only">游戏项目</span><select id="game"><option value="all">所有游戏</option>${games.filter(item => filters.platform === 'all' || item.platform === filters.platform).map(item => `<option value="${item.id}" ${filters.game === item.id ? 'selected' : ''}>${item.name}</option>`).join('')}</select></label></div><div class="days">${[['0', '今天', '10.27'], ['1', '明天', '10.28'], ['2', '周四', '10.29'], ['3', '周五', '10.30'], ['week', '未来 7 天', '10.27 – 11.02']].map(([id, name, sub]) => `<button data-action="day" data-id="${id}" class="${filters.day === id ? 'active' : ''}" aria-pressed="${filters.day === id}"><b>${name}</b><span>${sub}</span></button>`).join('')}</div><label class="search">${icon('search')}<input id="match-search" placeholder="搜索赛事、战队、选手" aria-label="搜索赛事、战队、选手" value="${escape(filters.query)}"><span>示例数据</span></label><div id="match-list"></div></section></div>${sidePanel()}</div>`;
  renderMatches();
}
function renderMatches() {
  const selected = selectMatches(matches, filters, store.following, entities);
  document.querySelector('#match-count').textContent = `${selected.length} 场`;
  document.querySelector('#match-list').innerHTML = selected.length ? selected.map(matchCard).join('') : empty('这里暂时没有比赛', filters.mine && !store.following.length ? '先关注一支战队或一位选手，再来查看专属赛程。' : '试试其他日期、游戏，或清除筛选条件。', '<button class="subtle" data-action="clear-filters">清除筛选</button>');
}
function following() {
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">YOUR SIDE OF THE GAME</div><h1>喜欢谁，就追谁<span class="lime">.</span></h1><p>无论主场在哪里，让每一次出场都与你有关。</p></div><span class="outline-label">已关注 ${store.following.length}</span></div><div class="info-banner">${icon('heart')}关注会聚合相关赛程；微信提醒需要为比赛单独预约。<a href="#schedule">查看赛程 ↗</a></div><div class="section-heading following-heading"><div class="segmented">${[['game', '游戏'], ['event', '赛事'], ['team', '战队'], ['player', '选手']].map(([id, name]) => `<button class="${followType === id ? 'active' : ''}" data-action="follow-type" data-id="${id}" aria-pressed="${followType === id}">${name}</button>`).join('')}</div><label class="switch-label"><input id="only-following" type="checkbox" ${onlyFollowing ? 'checked' : ''}><span class="switch"></span>已关注</label></div><label class="search">${icon('search')}<input id="follow-search" value="${escape(followQuery)}" placeholder="搜索名称或所属游戏" aria-label="搜索关注对象"><span>虚构阵容</span></label><div id="entity-grid" class="entity-grid"></div><p class="footnote">体验目录包含 12 个端游／手游项目。赛程和阵容仅为演示，不代表真实赛况或实际覆盖范围。</p>`;
  renderEntities();
}
function renderEntities() {
  const list = entities.filter(item => item.type === followType && (!onlyFollowing || store.following.includes(item.id)) && `${item.name} ${entity(item.gameId)?.name || ''}`.toLowerCase().includes(followQuery.toLowerCase().trim()));
  document.querySelector('#entity-grid').innerHTML = list.length ? list.map(item => `<article class="entity-card">${badge(item.id, 'large')}<div><h3>${item.name}</h3><p>${item.type === 'game' ? item.platform === 'pc' ? '端游电竞' : '手游电竞' : entity(item.gameId).name}${item.type === 'player' ? ` · ${entity(item.teamId).name}` : ''}</p></div>${followButton(item.id)}</article>`).join('') : empty('还没有找到关注对象', '换一个关键词，或关闭「已关注」筛选。');
}
function reminders() {
  main.innerHTML = `<div class="page-heading"><div><div class="eyebrow">WE SAVE YOU A SEAT</div><h1>你的观赛备忘录<span class="lime">.</span></h1><p>提前一点提醒，刚好赶上心动的瞬间。</p></div><span class="outline-label">${store.reminders.length} 场已预约</span></div><div class="info-banner">${icon('bell')}当前均为模拟预约，不会发送微信或系统通知。<button class="text-button" data-action="about">提醒规则 ↗</button></div><div class="reminder-layout"><section>${store.reminders.length ? store.reminders.map(reminder => { const match = matches.find(item => item.id === reminder.matchId); return `<article class="reminder-card"><div class="reminder-date">${icon('bell')}<b>${date(reminder.at)} ${time(reminder.at)}</b><span class="status-pill">模拟 · 待提醒</span></div><h3>${entity(match.teamIds[0]).name} <span class="muted">vs</span> ${entity(match.teamIds[1]).name}</h3><p>${entity(match.gameId).name} · 开赛 ${date(match.startAt)} ${time(match.startAt)}</p><div class="reminder-actions"><span>${OPTIONS.find(item => item.id === reminder.option).label}</span><button class="text-button" data-action="preview" data-id="${match.id}">预览通知</button><button class="text-button" data-action="remind" data-id="${match.id}">修改</button><button class="text-button muted" data-action="cancel" data-id="${match.id}">取消</button></div></article>`; }).join('') : empty('还没有预约比赛', '去赛程页，给下一场热爱留个位置。', '<a class="primary inline-button" href="#schedule">去看看比赛 →</a>')}</section><aside class="panel reminder-guide"><span class="eyebrow">A LITTLE HEADS-UP</span><h3>关注 ≠ 预约提醒</h3><p>关注帮你找到喜欢的比赛。预约时，你再决定哪一场、提前多久收到提醒。</p><hr><h4>微信小程序正式版</h4><p>每场选择一个提醒时间，并主动授权一次订阅消息。授权是否成功，以微信实际返回为准。</p><p>本 Demo 固定演示时间：<br>2026.10.27 12:00（UTC+8）</p><button class="subtle full" data-action="about">了解完整规则</button></aside></div>`;
}
function render() { nav(); ({ schedule, following, reminders })[page](); }
function openModal(content) {
  modal.innerHTML = `<button class="modal-close" data-action="close" aria-label="关闭弹窗">${icon('close')}</button>${content}`;
  if (!modal.open) modal.showModal();
}
function detail(id) {
  const match = matches.find(item => item.id === id);
  openModal(`<span class="eyebrow">MATCH DETAILS · 示例</span><h2 id="modal-title">${entity(match.eventId).name}</h2><p class="muted">${entity(match.gameId).name} · ${match.stage} · ${match.format}</p><div class="detail-teams">${match.teamIds.map(team => `<div>${badge(team, 'large')}<h3>${entity(team).name}</h3>${followButton(team)}</div>`).join('<span class="versus">VS</span>')}</div><div class="detail-time">${date(match.startAt)} <b>${time(match.startAt)}</b><span>北京时间</span></div><h4>登场选手 · 虚构阵容</h4><div class="detail-players">${match.playerIds.map(id => `<div><span>${entity(id).name}</span>${followButton(id)}</div>`).join('')}</div><div class="detail-event"><span>关注这项赛事</span>${followButton(match.eventId)}</div><p class="footnote">此赛程为体验示例；正式版须以赛事官方公布时间与阵容为准。</p><button class="primary full" data-action="remind" data-id="${id}">${icon('bell')}预约这场比赛</button>`);
}
function reminderDialog(id) {
  const match = matches.find(item => item.id === id), existing = store.reminders.find(item => item.matchId === id);
  openModal(`<span class="eyebrow">DON'T MISS THE MOMENT</span><h2 id="modal-title">什么时候提醒你？</h2><p class="muted">${entity(match.teamIds[0]).name} vs ${entity(match.teamIds[1]).name}<br>${date(match.startAt)} ${time(match.startAt)} 开赛</p><form id="reminder-form" data-id="${id}"><fieldset><legend class="sr-only">选择提醒时间</legend>${OPTIONS.map(option => { const expired = reminderTime(match.startAt, option.id) <= NOW; return `<label class="reminder-option ${expired ? 'disabled' : ''}"><input type="radio" name="option" value="${option.id}" ${expired ? 'disabled' : ''} ${(!expired && (existing?.option || '60') === option.id) ? 'checked' : ''}><span><b>${option.label}</b><small>${expired ? '演示时间已过，请选择其他时间' : `${date(reminderTime(match.startAt, option.id))} ${time(reminderTime(match.startAt, option.id))} · ${option.description}`}</small></span></label>`; }).join('')}</fieldset><div class="consent-note">这是模拟订阅授权，不会调用微信或发送真实消息。正式版需由你主动点击并同意微信授权。</div><button type="submit" class="primary full">${existing ? '保存模拟预约' : '模拟同意订阅并预约'} ${icon('arrow')}</button></form>`);
}
function preview(id) {
  const match = matches.find(item => item.id === id), reminder = store.reminders.find(item => item.matchId === id);
  if (!reminder) return;
  openModal(`<span class="eyebrow">NOTIFICATION PREVIEW</span><h2 id="modal-title">给热爱的一声提醒</h2><p class="muted">以下为样式预览，未发送真实消息。</p><div class="notification"><div class="notification-brand"><span class="avatar">竞</span><b>追竞 · 赛事提醒</b><small>模拟通知</small></div><h3>${entity(match.teamIds[0]).name} vs ${entity(match.teamIds[1]).name}</h3><dl><dt>赛事名称</dt><dd>${entity(match.eventId).name}</dd><dt>开赛时间</dt><dd>${date(match.startAt)} ${time(match.startAt)}</dd><dt>提醒时间</dt><dd>${date(reminder.at)} ${time(reminder.at)}</dd></dl><button data-action="detail" data-id="${id}">查看比赛详情 <span>›</span></button></div><p class="footnote">真实微信消息样式和字段取决于审核通过的订阅消息模板。</p><button class="primary full" data-action="close">知道了</button>`);
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'close') return modal.close();
  if (action === 'detail') return detail(id);
  if (action === 'remind') return reminderDialog(id);
  if (action === 'preview') return preview(id);
  if (action === 'follow') {
    const active = store.following.includes(id);
    store.following = active ? store.following.filter(value => value !== id) : [...store.following, id];
    persist(); render();
    if (modal.open) { const match = modal.querySelector('[data-action="remind"]'); if (match) detail(match.dataset.id); }
    return toast(active ? `已取消关注${entity(id).name}，已有预约仍保留` : `已关注${entity(id).name}，相关比赛已加入关注赛程`);
  }
  if (action === 'platform') { filters.platform = id; filters.game = 'all'; }
  if (action === 'day') filters.day = id;
  if (action === 'clear-filters') filters = { platform: 'all', game: 'all', day: 'week', mine: false, query: '' };
  if (action === 'follow-type') followType = id;
  if (action === 'cancel') {
    openModal(`<h2 id="modal-title">取消这场提醒？</h2><p class="muted">取消后，比赛仍会保留在赛程中。</p><div class="dialog-actions"><button class="subtle" data-action="close">保留提醒</button><button class="primary" data-action="confirm-cancel" data-id="${id}">确认取消</button></div>`); return;
  }
  if (action === 'confirm-cancel') { store.reminders = store.reminders.filter(item => item.matchId !== id); persist(); modal.close(); toast('已取消预约'); }
  if (action === 'about') return openModal('<span class="eyebrow">REMINDER RULES</span><h2 id="modal-title">准时提醒，先约定好</h2><div class="rule-list"><p>① 关注游戏、赛事、战队或选手，聚合相关比赛。</p><p>② 为比赛选择一个提醒时间；同场比赛重复设置会更新预约。</p><p>③ 正式版使用微信一次性订阅消息，预约需主动授权；关注不代表永久授权。</p><p>④ 比赛改期后重新计算提醒时间；取消或时间待定的比赛停止旧任务。</p><p>⑤ Demo 不计时发送、不请求通知权限，点击「预览通知」体验消息效果。</p></div><button class="primary full" data-action="close">了解了</button>');
  if (action === 'reset') return openModal('<h2 id="modal-title">重新开始体验？</h2><p class="muted">只清除本浏览器的 Demo 关注和预约记录。</p><div class="dialog-actions"><button class="subtle" data-action="close">保留数据</button><button class="primary" data-action="confirm-reset">确认重置</button></div>');
  if (action === 'confirm-reset') { store = { following: [], reminders: [] }; persist(); modal.close(); toast('体验数据已重置'); }
  render();
});
document.addEventListener('change', event => {
  if (event.target.id === 'game') { filters.game = event.target.value; renderMatches(); }
  if (event.target.id === 'mine') { filters.mine = event.target.checked; renderMatches(); }
  if (event.target.id === 'only-following') { onlyFollowing = event.target.checked; renderEntities(); }
});
document.addEventListener('input', event => {
  if (event.target.id === 'match-search') { filters.query = event.target.value; renderMatches(); }
  if (event.target.id === 'follow-search') { followQuery = event.target.value; renderEntities(); }
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'reminder-form') return;
  event.preventDefault();
  try {
    store.reminders = saveReminder(store.reminders, matches.find(item => item.id === event.target.dataset.id), new FormData(event.target).get('option'));
    persist(); modal.close(); render(); toast('模拟预约成功，可在提醒中心预览通知');
  } catch (error) { toast(error.message); }
});
window.addEventListener('hashchange', () => {
  page = ['schedule', 'following', 'reminders'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'schedule';
  if (modal.open) modal.close();
  render(); window.scrollTo(0, 0); main.focus({ preventScroll: true });
});
render();
if (storageWarning) toast('无法读取保存的数据，本次以新体验开始');


