const AuthService = {
  currentUser: null,
  async signInWithGoogle() { throw new Error('Firebase 尚未設定，請先加入 Firebase configuration。'); },
  async signUpWithEmail() { throw new Error('Firebase 尚未設定，請先加入 Firebase configuration。'); },
  async signInWithEmail() { throw new Error('Firebase 尚未設定，請先加入 Firebase configuration。'); },
  async logout() { this.currentUser = null; localStorage.removeItem('deal-user'); },
  getCurrentUser() { return this.currentUser || JSON.parse(localStorage.getItem('deal-user') || 'null'); },
  setPrototypeUser(user) { this.currentUser = user; localStorage.setItem('deal-user', JSON.stringify(user)); }
};
if (typeof window !== 'undefined') window.AuthService = AuthService;
