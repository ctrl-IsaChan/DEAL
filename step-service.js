const StepService = {
  isMocked: true,
  async requestPermission() { return this.isAvailable(); },
  isAvailable() { return this.isMocked; },
  async getTodaySteps() { return Number(localStorage.getItem('deal-today-steps') || 6240); },
  async getStepsForDate(date) {
    const key = `deal-steps-${new Date(date).toISOString().slice(0, 10)}`;
    return Number(localStorage.getItem(key) || (date.toDateString() === new Date().toDateString() ? 6240 : 0));
  },
  setMockSteps(steps) { localStorage.setItem('deal-today-steps', String(Math.max(0, Math.floor(steps)))); }
};
if (typeof window !== 'undefined') window.StepService = StepService;
