const LeaderboardService = {
  sampleUsers: [
    { id: 'amy', displayName: 'Amy', photo: 'A', daily: 12430, weekly: 38420, monthly: 142100 },
    { id: 'ken', displayName: 'Ken', photo: 'K', daily: 11980, weekly: 36110, monthly: 139800 },
    { id: 'yuki', displayName: 'Yuki', photo: 'Y', daily: 10650, weekly: 33880, monthly: 131240 },
    ...Array.from({ length: 23 }, (_, index) => ({ id: `walker-${index}`, displayName: `Walker ${index + 1}`, photo: 'W', daily: 6400 - index * 7, weekly: 22500 - index * 40, monthly: 90000 - index * 120 })),
    { id: 'me', displayName: '我', photo: 'M', daily: 6240, weekly: 21840, monthly: 86240 }
  ],
  get(period = 'daily') { return [...this.sampleUsers].sort((a, b) => b[period] - a[period] || (a.reachedAt || 0) - (b.reachedAt || 0)); },
  getUserRank(userId = 'me', period = 'daily') { return this.get(period).findIndex(user => user.id === userId) + 1; },
  getStepsToNextRank(userId = 'me', period = 'daily') {
    const list = this.get(period); const index = list.findIndex(user => user.id === userId);
    return index > 0 ? Math.max(0, list[index - 1][period] - list[index][period]) : 0;
  },
  getDailyLeaderboard() { return this.get('daily'); },
  getWeeklyLeaderboard() { return this.get('weekly'); },
  getMonthlyLeaderboard() { return this.get('monthly'); }
};
if (typeof window !== 'undefined') window.LeaderboardService = LeaderboardService;
