/**
 * HR System Shared Logic - Production Ready
 */

const App = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || '{}'),
    permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
    
    initialized: false,
    initPromise: null,

    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = (async () => {
            this.setupInterceptors(); // Patch immediately
            
            // Hide body until access check is done
            document.body.classList.add('opacity-0');

            if (!this.token) {
                this.checkAuth();
                return;
            }
            
            await this.loadUserInfo();
            this.checkAccess();
            this.renderLayout();
            this.loadUserInfoUI();

            this.initialized = true;
            document.body.classList.remove('opacity-0');
            document.body.classList.add('transition-opacity', 'duration-500');
        })();

        return this.initPromise;
    },

    checkAuth() {
        const path = window.location.pathname;
        if (!this.token && path !== '/login.html' && path !== '/' && !path.includes('/api/')) {
            window.location.href = '/login.html';
        }
    },

    checkAccess() {
        const path = window.location.pathname;
        const role = this.user.role_name;
        
        // Safe pages everyone can access
        if (path === '/login.html' || path === '/' || path === '/portal.html') return;

        // If employee (low role), only allow portal.html
        if (role === 'employee' && path !== '/portal.html') {
            window.location.href = '/portal.html';
            return;
        }

        // Specific page permission checks
        const permissionMap = {
            '/admin': 'dashboard.view',
            '/employees.html': 'employee.view',
            '/leave.html': 'leave.view',
            '/attendance': 'attendance.view',
            '/payroll': 'payroll.view',
            '/salary-config': 'system.settings',
            '/rbac': 'system.roles',
            '/logs': 'system.audit',
            '/security': 'system.settings',
            '/approval': 'payroll.approve'
        };

        // Find match (including partial match for subpages)
        const matchKey = Object.keys(permissionMap).find(k => path === k || path.startsWith(k + '/'));
        
        if (matchKey && role !== 'boss') {
            const requiredPerm = permissionMap[matchKey];
            const hasPerm = this.permissions.includes(requiredPerm);
            if (!hasPerm) {
                this.toast('Bạn không có quyền truy cập trang này', 'error');
                setTimeout(() => {
                    // Always redirect to portal if unauthorized for current admin page
                    window.location.href = '/portal.html';
                }, 1500);
                return;
            }
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
        localStorage.clear();
        window.location.href = '/login.html';
    },

    async loadUserInfo() {
        if (!this.token) return;
        try {
            const resp = await fetch('/api/auth/me');
            const result = await resp.json();
            if (result.success) {
                this.user = result.data;
                this.permissions = result.data.permissions || [];
                localStorage.setItem('user', JSON.stringify(this.user));
                localStorage.setItem('permissions', JSON.stringify(this.permissions));
            }
        } catch (e) {
            console.error('Failed to load user info', e);
        }
    },

    loadUserInfoUI() {
        const nameElems = document.querySelectorAll('.u-name');
        const roleElems = document.querySelectorAll('.u-role');
        const emailElems = document.querySelectorAll('.u-email');
        const avatarElems = document.querySelectorAll('.u-avatar');

        nameElems.forEach(el => el.textContent = this.user.full_name || 'Admin');
        roleElems.forEach(el => {
            const role = this.user.role_name_vi || this.user.role || 'Nhân viên';
            el.textContent = role.toUpperCase();
        });
        emailElems.forEach(el => el.textContent = this.user.email || '');
        avatarElems.forEach(el => {
            if (this.user.avatar_url && this.user.avatar_url.startsWith('http')) el.src = this.user.avatar_url;
            else el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.full_name || 'A')}&background=0ea5e9&color=fff`;
        });
    },

    renderLayout() {
        if (!document.getElementById('material-icons-round-link')) {
            const link = document.createElement('link');
            link.id = 'material-icons-round-link';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons+Round';
            document.head.appendChild(link);
        }

        const sidebarContainer = document.getElementById('sidebar-root');
        if (sidebarContainer) {
            const currentPath = window.location.pathname;
            const allItems = [
                { name: 'Bảng điều khiển', icon: 'grid_view', path: '/admin', perm: 'dashboard.view' },
                { name: 'Nhân viên', icon: 'badge', path: '/employees.html', perm: 'employee.view' },
                { name: 'Nghỉ phép', icon: 'event_available', path: '/leave.html', perm: 'leave.view' },
                { name: 'Cấu hình lịch', icon: 'calendar_today', path: '/calendar-config.html', perm: 'system.settings' },
                { name: 'Chấm công', icon: 'pending_actions', path: '/attendance', perm: 'attendance.view' },
                { name: 'Bảng lương', icon: 'account_balance_wallet', path: '/payroll', perm: 'payroll.view' },
                { name: 'Thưởng & Phạt', icon: 'stars', path: '/rewards.html', perm: 'payroll.view' },
                { name: 'Nhập dữ liệu', icon: 'cloud_upload', path: '/import.html', perm: 'employee.create' },
                { name: 'Báo cáo hệ thống', icon: 'analytics', path: '/reports.html', perm: 'dashboard.view' },
                { name: 'Nhật ký hệ thống', icon: 'history', path: '/logs', perm: 'system.audit' },
                { name: 'Kiểm tra bảo mật', icon: 'lock_person', path: '/security', perm: 'system.settings' },
                { name: 'Phân quyền (RBAC)', icon: 'admin_panel_settings', path: '/rbac', perm: 'system.roles' },
                { name: 'Cấu hình lương', icon: 'settings', path: '/salary-config', perm: 'system.settings' },
                { name: 'Cổng thông tin', icon: 'person_pin', path: '/portal.html' }
            ];

            // Filter items based on permissions
            const filteredItems = allItems.filter(item => {
                if (this.user.role_name === 'boss') return true;
                if (!item.perm) return true; // Portal or item without specific perm
                return this.permissions.includes(item.perm);
            });

            sidebarContainer.innerHTML = `
                <aside class="w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col fixed inset-y-0 z-40 shadow-2xl">
                    <div class="px-8 py-10 mb-2">
                        <div class="flex items-center gap-4 text-slate-900 dark:text-white font-black text-2xl tracking-tighter cursor-pointer group" onclick="window.location.href='/admin'">
                            <div class="w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
                                <span class="material-icons-round text-white">token</span>
                            </div>
                            <span class="uppercase">HR ADMIN</span>
                        </div>
                    </div>
                    <nav class="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                        ${filteredItems.map(item => {
                            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
                            return `
                                <a class="sidebar-item ${isActive ? 'sidebar-item-active' : ''}" href="${item.path}">
                                    <div class="flex items-center gap-4">
                                        <span class="material-icons-round">${item.icon}</span>
                                        <span class="text-sm font-black tracking-tight">${item.name}</span>
                                    </div>
                                    ${isActive ? '<span class="material-icons-round text-xs">chevron_right</span>' : ''}
                                </a>
                            `;
                        }).join('')}
                    </nav>
                </aside>
            `;
        }

        const headerContainer = document.getElementById('header-root');
        if (headerContainer) {
            headerContainer.innerHTML = `
                <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-10 sticky top-0 z-30 shadow-sm" style="margin-left: 256px;">
                    <div class="flex items-center gap-6">
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hệ thống Quản trị nội bộ</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-8">
                        <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/50">
                            <button onclick="App.setLanguage('vn')" class="lang-btn px-4 py-1.5 text-[9px] font-black rounded-full bg-white dark:bg-slate-700 shadow-sm text-sky-500" data-lang="vn">VN</button>
                            <button onclick="App.setLanguage('zh')" class="lang-btn px-4 py-1.5 text-[9px] font-black rounded-full text-slate-400" data-lang="zh">ZH</button>
                        </div>

                        <div class="flex items-center gap-4 pl-8 border-l border-slate-100 dark:border-slate-800 relative">
                            <div class="text-right hidden sm:block">
                                <p class="text-xs font-black text-slate-900 dark:text-white u-name tracking-tight">Phạm Văn Nhân Sự</p>
                                <p class="text-[9px] text-sky-500 font-black u-role uppercase tracking-widest">HR_MANAGER</p>
                            </div>
                            <div class="relative cursor-pointer" onclick="App.toggleDropdown()">
                                <img class="h-10 w-10 rounded-xl ring-2 ring-slate-50 dark:ring-slate-800 object-cover u-avatar shadow-lg" src="https://ui-avatars.com/api/?name=Admin&background=0ea5e9&color=fff" id="header-avatar" />
                                <div id="user-dropdown" class="hidden absolute right-0 mt-4 w-64 bg-white dark:bg-slate-900 rounded-[20px] shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in">
                                    <div class="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                        <p class="text-sm font-black text-slate-900 dark:text-white u-name truncate">Phạm Văn Nhân Sự</p>
                                        <p class="text-[10px] text-slate-400 u-email opacity-60 truncate">admin@hr.com</p>
                                    </div>
                                    <div class="p-2">
                                        <a href="/portal.html" class="flex items-center gap-3 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                                            <span class="material-icons-round opacity-50">person</span>
                                            <span class="font-black">Thông tin hồ sơ</span>
                                        </a>
                                        <button onclick="App.logout()" class="w-full flex items-center gap-3 px-3 py-3 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all font-black text-left">
                                            <span class="material-icons-round">logout</span>
                                            <span>ĐĂNG XUẤT</span>
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
        // Logic for translation can be added here
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    },

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('vi-VN');
    },

    toast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        const id = 'toast-' + Date.now();
        
        const colors = {
            success: 'bg-emerald-500',
            error: 'bg-red-500',
            warning: 'bg-amber-500',
            info: 'bg-sky-500'
        };

        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `flex items-center gap-3 px-6 py-4 rounded-2xl text-white shadow-2xl animate-in slide-in-from-right-full duration-300 mb-4 ${colors[type] || colors.success}`;
        toast.innerHTML = `
            <span class="material-icons-round">${icons[type] || icons.success}</span>
            <span class="text-sm font-black tracking-tight">${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-out', 'fade-out', 'slide-out-to-right-full');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-8 right-8 z-[100] flex flex-col items-end pointer-events-none';
        document.body.appendChild(container);
        return container;
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
