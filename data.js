// All schedules, teams and player affiliations are fictional demo fixtures.
export const games = [
  ['lol', '英雄联盟', 'LOL', 'pc', '#d7b877', '峡谷巅峰赛'],
  ['hok', '王者荣耀', 'KOG', 'mobile', '#f0a76c', '王者邀请赛'],
  ['valorant', '无畏契约', 'VAL', 'pc', '#ff7078', '无畏挑战赛'],
  ['cs2', '反恐精英 2', 'CS2', 'pc', '#a9bee0', '精英对抗赛'],
  ['peace', '和平精英', 'PEL', 'mobile', '#c1d78f', '和平精英邀请赛'],
  ['dota2', 'Dota 2', 'DOTA', 'pc', '#ed8876', '远古竞技赛'],
  ['wildrift', '英雄联盟手游', 'WR', 'mobile', '#7ec9da', '峡谷新星赛'],
  ['cf', '穿越火线', 'CF', 'pc', '#c7b4ee', '火线挑战赛'],
  ['codm', '使命召唤手游', 'CODM', 'mobile', '#d9d586', '使命邀请赛'],
  ['mlbb', '决胜巅峰', 'MLBB', 'mobile', '#f5b0d3', '巅峰邀请赛'],
  ['brawl', '荒野乱斗', 'BS', 'mobile', '#f2c563', '荒野邀请赛'],
  ['ow2', '守望先锋', 'OW', 'pc', '#efab81', '先锋挑战赛']
].map(([id, name, short, platform, color, event]) => ({ id, name, short, platform, color, event, type: 'game' }));
const squads = [['赤焰', '北境', 'FLM', 'NTH', 'Echo', '星野'], ['逐光', '破晓', 'LUX', 'DAWN', '初七', '野渡'], ['凌空', '夜航', 'SKY', 'NITE', 'Zero', 'Kite'], ['银翼', '深蓝', 'WING', 'BLUE', 'Ace', 'Nova'], ['山海', '星河', 'MTN', 'STAR', '追风', '流光'], ['远征', '极昼', 'EXP', 'DAY', 'River', 'Orion'], ['曙光', '长风', 'SUN', 'WIND', '轻舟', '远山'], ['锋芒', '雷霆', 'EDGE', 'THD', '锋刃', '雷鸣'], ['猎鹰', '苍狼', 'HAWK', 'WOLF', '猎影', '南星'], ['晨星', '烈阳', 'AM', 'SOL', 'Milo', 'Rex'], ['橙子', '薄荷', 'ORG', 'MINT', '阿橙', '小荷'], ['天际', '回声', 'HZN', 'ECHO', 'Sky', 'Rain']];
export const entities = games.flatMap((game, i) => {
  const [a, b, x, y, p, q] = squads[i];
  return [game, { id: `${game.id}-event`, name: game.event, short: game.short, type: 'event', gameId: game.id },
    { id: `${game.id}-a`, name: `${a}战队`, short: x, type: 'team', gameId: game.id },
    { id: `${game.id}-b`, name: `${b}战队`, short: y, type: 'team', gameId: game.id },
    { id: `${game.id}-p`, name: p, short: p.slice(0, 2), type: 'player', teamId: `${game.id}-a`, gameId: game.id },
    { id: `${game.id}-q`, name: q, short: q.slice(0, 2), type: 'player', teamId: `${game.id}-b`, gameId: game.id }];
});
export const matches = games.map((game, i) => ({
  id: `match-${game.id}`, gameId: game.id, eventId: `${game.id}-event`,
  teamIds: [`${game.id}-a`, `${game.id}-b`], playerIds: [`${game.id}-p`, `${game.id}-q`],
  startAt: `2026-10-${27 + Math.floor(i / 4)}T${[19, 18, 20, 21][i % 4]}:00:00+08:00`,
  format: game.id === 'peace' ? '积分赛 · 示例对阵' : i % 2 ? 'BO5' : 'BO3', stage: i % 3 ? '小组赛' : '淘汰赛'
}));
matches.push({ ...matches[0], id: 'match-lol-next', startAt: '2026-10-30T19:00:00+08:00', stage: '第二轮' });
export const entity = id => entities.find(item => item.id === id);
