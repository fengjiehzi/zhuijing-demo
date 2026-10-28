export const NOW = Date.parse('2026-10-27T12:00:00+08:00');
export const DAY = 86400000;
export const OPTIONS = [
  { id: 'day', label: '比赛当天 09:00', description: '提前安排今天的观赛时间' },
  { id: '180', label: '赛前 3 小时', description: '给热爱留出时间' },
  { id: '60', label: '赛前 1 小时', description: '准备好，比赛快开始了' },
  { id: '15', label: '赛前 15 分钟', description: '刚好来得及入场' },
  { id: '0', label: '比赛开始时', description: '开赛时间一到就提醒' }
];
export function reminderTime(startAt, option) {
  if (!OPTIONS.some(item => item.id === option)) throw new Error('Invalid reminder option');
  const start = Date.parse(startAt);
  if (!Number.isFinite(start)) throw new Error('Invalid match time');
  return option === 'day' ? Math.floor((start + 8 * 3600000) / DAY) * DAY + 3600000 : start - Number(option) * 60000;
}
export function followReasons(match, following) {
  const set = new Set(following);
  return [match.gameId, match.eventId, ...match.teamIds, ...match.playerIds].filter(id => set.has(id));
}
export function selectMatches(matches, filters, following, entities) {
  const query = (filters.query || '').trim().toLowerCase();
  return matches.filter(match => {
    const game = entities.find(item => item.id === match.gameId);
    const offset = Math.floor((Date.parse(match.startAt) + 8 * 3600000) / DAY) - Math.floor((NOW + 8 * 3600000) / DAY);
    const names = [match.gameId, match.eventId, ...match.teamIds, ...match.playerIds].map(id => entities.find(item => item.id === id)?.name || '').join(' ').toLowerCase();
    return (filters.platform === 'all' || game.platform === filters.platform)
      && (filters.game === 'all' || match.gameId === filters.game)
      && (filters.day === 'week' ? offset >= 0 && offset < 7 : offset === Number(filters.day))
      && (!filters.mine || followReasons(match, following).length > 0)
      && (!query || names.includes(query));
  }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}
export function saveReminder(reminders, match, option, now = NOW) {
  const at = reminderTime(match.startAt, option);
  if (at <= now) throw new Error('这个提醒时间已过，请选择更晚的时间');
  if (at > Date.parse(match.startAt)) throw new Error('提醒时间不能晚于比赛开始时间');
  return [...reminders.filter(item => item.matchId !== match.id), { matchId: match.id, option, at }].sort((a, b) => a.at - b.at);
}
