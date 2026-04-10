import Header from './components/Header.js';
import HomePage from './pages/HomePage.js';
import LoginPage from './pages/LoginPage.js';
import RegisterPage from './pages/RegisterPage.js';
import MoviesPage from './pages/MoviesPage.js';
import MovieDetailsPage from './pages/MovieDetailsPage.js';
import AdminLoginPage from './pages/AdminLoginPage.js';
import AdminDashboardPage from './pages/AdminDashboardPage.js';
import AdminMoviesPage from './pages/AdminMoviesPage.js';
import AdminShowtimesPage from './pages/AdminShowtimesPage.js';
import AdminBookingsPage from './pages/AdminBookingsPage.js';
import AdminUsersPage from './pages/AdminUsersPage.js';
import BookingsPage from './pages/BookingsPage.js';
import MyBookingsPage from './pages/MyBookingsPage.js';
import PaymentPage from './pages/PaymentPage.js';
import ProfilePage from './pages/ProfilePage.js';
import './index.css';

// Hỗ trợ Router
const parseUrl = () => {
    const path = window.location.pathname.toLowerCase() || '/';
    const r = path.split("/");
    // path: /resource/id/verb
    return {
        resource: r[1],
        id: r[2],
        verb: r[3]
    };
}

const routes = {
    '/': HomePage,
    '/login': LoginPage,
    '/register': RegisterPage,
    '/profile': ProfilePage,
    '/admin/login': AdminLoginPage,
    '/admin/dashboard': AdminDashboardPage,
    '/admin/movies/manage': AdminMoviesPage,
    '/admin/showtimes/manage': AdminShowtimesPage,
    '/admin/bookings/manage': AdminBookingsPage,
    '/admin/users/manage': AdminUsersPage,
    '/movies': MoviesPage,
    '/movies/:id': MovieDetailsPage,
    '/book/:id': BookingsPage,
    '/my-bookings': MyBookingsPage,
    '/payment': PaymentPage
};

const router = async () => {
    const content = document.getElementById('root');
    let path = window.location.pathname.toLowerCase() || '/';
    
    // Loại bỏ trailing slash nếu có (trừ khi là root /)
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }
    
    let page = routes[path];

    if (!page) {
        // Nếu không tìm thấy exact match, thử tìm match kiểu :id
        // Giả sử chỉ hỗ trợ cấu trúc /resource/:id
        const r = path.split("/");
        // path: /resource/id -> resource: r[1], id: r[2]
        
        if (r.length >= 3) {
            const parsedUrl = `/${r[1]}/:id`;
            page = routes[parsedUrl];
        }
        
        // Vẫn chưa tìm thấy?
        if (!page) {
             page = HomePage;
        }
    }

    // --- Route Protection ---
    const isAdminRoute = path.startsWith('/admin');
    const isLoginPage = path === '/admin/login';
    
    if (isAdminRoute && !isLoginPage) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') {
            console.warn("Access Denied: Redirecting to Admin Login");
            navigateTo('/admin/login');
            return;
        }
    }

    // Render Header only if not in Admin area
    const headerHTML = isAdminRoute ? '' : Header.render();
    content.innerHTML = headerHTML + '<div id="page-container"></div>';

    // Render Page
    const pageContainer = document.getElementById('page-container');
    pageContainer.innerHTML = await page.render();

    // After Render
    if (!isAdminRoute && Header.afterRender) Header.afterRender();
    if (page.afterRender) await page.afterRender();
};

// Navigation helper
const navigateTo = (url) => {
    history.pushState(null, null, url);
    router();
};

window.addEventListener('popstate', router);

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', e => {
        // Tìm thẻ a gần nhất
        const target = e.target.closest('a'); 
        
        // Kiểm tra nếu là link nội bộ (cùng host) và không phải là download/external
        if (target && target.href && target.host === window.location.host && !target.hasAttribute('download')) {
             e.preventDefault();
             navigateTo(target.href);
        }
    });
    router();
});
