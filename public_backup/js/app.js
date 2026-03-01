/**
 * HR System Shared Logic - Production Ready
 */

const App = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || '{}'),
    
    init() {
        this.checkAuth();
        this.setupInterceptors();
        this.renderLayout();
        this.loadUserInfo();
    },

    checkAuth() {
        const path = window.location.pathname;
        if (!this.token && path !== '/login.html' && path !== '/' && !path.includes('/api/')) {
            window.location.href = '/login.html';
        }
    },

    setupInterceptors() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [url, config = {}] = args;
            if (this.token) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                };
            }
            const response = await originalFetch(url, config);
            if (response.status === 401 && !url.includes('/login')) {
                this.logout();
            }
            return response;
        };
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    },

    async loadUserInfo() {
        if (!this.token) return;
        try {
            const resp = await fetch('/api/auth/me');
            const data = await resp.json();
            if (data.success) {
                this.user = data.data;
                localStorage.setItem('user', JSON.stringify(this.user));
                this.updateUserUI();
            }
        } catch (e) {
            console.error('Failed to load user info', e);
        }
    },

    updateUserUI() {
        const nameElems = document.querySelectorAll('.u-name');
        const roleElems = document.querySelectorAll('.u-role');
        const emailElems = document.querySelectorAll('.u-email');
        const avatarElems = document.querySelectorAll('.u-avatar');

        nameElems.forEach(el => el.textContent = this.user.full_name || 'Admin');
        roleElems.forEach(el => {
            const role = this.user.role_name || this.user.role || 'ADMIN';
            el.textContent = role.toUpperCase();
        });
        emailElems.forEach(el => el.textContent = this.user.email || '');
        avatarElems.forEach(el => {
            if (this.user.avatar_url) el.src = this.user.avatar_url;
            else el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.full_name || 'A')}&background=0ea5e9&color=fff`;
        });
    },

    renderLayout() {
        const sidebarContainer = document.getElementById('sidebar-root');
        if (sidebarContainer) {
            const currentPath = window.location.pathname;
            const items = [
                { name: 'Bảng điều khiển', icon: 'grid_view', path: '/admin' },
                { name: 'Nhân viên', icon: 'badge', path: '/employees.html' }, // No clean route for list yet in server.js
                { name: 'Chấm công', icon: 'event_available', path: '/attendance' },
                { name: 'Bảng lương', icon: 'account_balance_wallet', path: '/payroll' },
                { name: 'Nhật ký hệ thống', icon: 'analytics', path: '/logs' },
                { name: 'Kiểm tra bảo mật', icon: 'lock_person', path: '/security' },
                { name: 'Phân quyền (RBAC)', icon: 'admin_panel_settings', path: '/rbac' }
            ];

            sidebarContainer.innerHTML = `
                <aside class="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed inset-y-0 z-40 shadow-xl">
                    <div class="p-6 mb-4 mt-10">
                        <div class="flex items-center gap-3 text-slate-900 dark:text-white font-bold text-xl tracking-tight cursor-pointer" onclick="window.location.href='/admin'">
                            <div class="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                                <span class="material-icons-round text-white">shield</span>
                            </div>
                            <span>HR ADMIN</span>
                        </div>
                    </div>
                    <nav class="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                        ${items.map(item => {
                            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
                            return `
                                <a class="sidebar-item ${isActive ? 'sidebar-item-active' : ''}" href="${item.path}">
                                    <span class="material-icons-round" style="font-size: 20px;">${item.icon}</span>
                                    <span style="font-size: 14px; font-weight: 600;">${item.name}</span>
                                </a>
                            `;
                        }).join('')}
                    </nav>
                    <div class="p-4 border-t border-slate-100 dark:border-slate-800">
                        <a class="sidebar-item ${currentPath === '/salary-config' ? 'sidebar-item-active' : ''}" href="/salary-config">
                            <span class="material-icons-round" style="font-size: 20px;">settings</span>
                            <span style="font-size: 14px; font-weight: 600;">Cấu hình lương</span>
                        </a>
                    </div>
                </aside>
            `;
        }

        const headerContainer = document.getElementById('header-root');
        if (headerContainer) {
            headerContainer.innerHTML = `
                <header class="bg-white dark:bg-slate-900 h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm" style="margin-left: 256px;">
                    <div class="flex items-center gap-4">
                        <div class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <h2 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded">Hệ thống Quản trị nội bộ</h2>
                    </div>
                    <div class="flex items-center gap-6">
                        <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                            <button onclick="App.setLanguage('vn')" class="lang-btn px-4 py-1.5 text-xs font-bold rounded-full bg-white dark:bg-slate-600 shadow-sm text-sky-500" data-lang="vn">VN</button>
                            <button onclick="App.setLanguage('zh')" class="lang-btn px-4 py-1.5 text-xs font-bold rounded-full text-slate-400 hover:text-slate-600" data-lang="zh">ZH</button>
                        </div>
                        <div class="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-700 relative">
                            <div class="text-right hidden md:block">
                                <p class="text-xs font-bold text-slate-900 dark:text-white u-name">Admin User</p>
                                <p class="text-[10px] text-sky-500 font-bold u-role uppercase tracking-tighter">ADMIN</p>
                            </div>
                            <div class="relative cursor-pointer" onclick="App.toggleDropdown()">
                                <img class="h-10 w-10 rounded-xl ring-2 ring-slate-100 dark:ring-slate-800 object-cover u-avatar shadow-md" src="https://ui-avatars.com/api/?name=Admin&background=0ea5e9&color=fff" id="header-avatar" />
                                <div class="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                <div id="user-dropdown" class="hidden absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden transform origin-top-right transition-all">
                                    <div class="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <p class="text-sm font-bold text-slate-900 dark:text-white truncate u-name">Admin User</p>
                                        <p class="text-[10px] text-slate-400 truncate u-email">admin@hr.com</p>
                                    </div>
                                    <div class="p-2">
                                        <a href="/employees.html" class="flex items-center gap-3 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                            <span class="material-icons-round text-lg opacity-50">person</span>
                                            <div class="flex flex-col">
                                                <span class="font-bold">Hồ sơ cá nhân</span>
                                                <span class="text-[9px] opacity-70">Xem và sửa thông tin cá nhân</span>
                                            </div>
                                        </a>
                                        <a href="/security" class="flex items-center gap-3 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                            <span class="material-icons-round text-lg opacity-50">security</span>
                                            <div class="flex flex-col">
                                                <span class="font-bold">Bảo mật tài khoản</span>
                                                <span class="text-[9px] opacity-70">Đổi mật khẩu & 2FA</span>
                                            </div>
                                        </a>
                                        <div class="border-t border-slate-100 dark:border-slate-800 my-2"></div>
                                        <button onclick="App.logout()" class="w-full flex items-center gap-3 px-3 py-3 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-bold text-left">
                                            <span class="material-icons-round text-lg">logout</span>
                                            <span>Đăng xuất hệ thống</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
            `;
        }
    },

    toggleDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        dropdown.classList.toggle('hidden');
    },

    setLanguage(lang) {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            if (btn.dataset.lang === lang) {
                btn.classList.add('bg-white', 'dark:bg-slate-600', 'text-sky-500', 'shadow-sm');
                btn.classList.remove('text-slate-400');
            } else {
                btn.classList.remove('bg-white', 'dark:bg-slate-600', 'text-sky-500', 'shadow-sm');
                btn.classList.add('text-slate-400');
            }
        });
        alert(`Đã chuyển sang: ${lang === 'vn' ? 'Tiếng Việt' : '中文'}`);
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    },

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('vi-VN');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    const avatar = document.getElementById('header-avatar');
    if (dropdown && !dropdown.contains(e.target) && e.target !== avatar && !avatar.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});
