/* =========================================================================
   Fujimoto Ikuto — Research Homepage
   - Language toggle (JA / EN) persisted to localStorage
   - Email obfuscation reveal
   - Subtle reveal-on-scroll for sections (IntersectionObserver)
   - Smooth scroll already handled by CSS (scroll-behavior: smooth)
   ========================================================================= */

(function () {
    'use strict';

    /* ---------- Language toggle ---------- */
    const STORAGE_KEY = 'fi-lang';
    const validLangs = ['ja', 'en'];

    function applyLang(lang) {
        if (!validLangs.includes(lang)) lang = 'ja';
        document.body.setAttribute('data-lang', lang);
        document.documentElement.setAttribute('lang', lang);

        // Update nav link labels (data-i18n attrs swap text)
        document.querySelectorAll('[data-i18n-ja][data-i18n-en]').forEach((el) => {
            el.textContent = el.getAttribute('data-i18n-' + lang);
        });

        // Update lang-toggle active state
        document.querySelectorAll('.lang-opt').forEach((opt) => {
            opt.classList.toggle('is-active', opt.getAttribute('data-set-lang') === lang);
        });
    }

    // Restore saved language (default: ja)
    const saved = (function () {
        try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    })();
    applyLang(saved || 'ja');

    // Bind toggle clicks
    document.querySelectorAll('.lang-opt').forEach((opt) => {
        opt.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = opt.getAttribute('data-set-lang');
            applyLang(lang);
            try { localStorage.setItem(STORAGE_KEY, lang); } catch (err) { /* ignore */ }
        });
    });

    // Click anywhere on the toggle container to flip (better UX)
    const toggleBtn = document.querySelector('.lang-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            // If a child handler already ran, skip
            if (e.target.classList.contains('lang-opt')) return;
            const current = document.body.getAttribute('data-lang') || 'ja';
            const next = current === 'ja' ? 'en' : 'ja';
            applyLang(next);
            try { localStorage.setItem(STORAGE_KEY, next); } catch (err) { /* ignore */ }
        });
    }

    /* ---------- Mobile nav drawer ---------- */
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        const setNavOpen = (open) => {
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            navLinks.classList.toggle('is-open', open);
            document.body.classList.toggle('nav-open', open);
        };
        navToggle.addEventListener('click', () => {
            const open = navToggle.getAttribute('aria-expanded') !== 'true';
            setNavOpen(open);
        });
        navLinks.querySelectorAll('a').forEach((a) => {
            a.addEventListener('click', () => setNavOpen(false));
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setNavOpen(false);
        });
        // Close the drawer if the viewport grows past the mobile breakpoint.
        const mql = window.matchMedia('(min-width: 721px)');
        const onChange = (e) => { if (e.matches) setNavOpen(false); };
        if (mql.addEventListener) mql.addEventListener('change', onChange);
        else if (mql.addListener) mql.addListener(onChange);
    }

    /* ---------- Email obfuscation reveal ---------- */
    document.querySelectorAll('a.email[data-user][data-domain]').forEach((a) => {
        const user = a.getAttribute('data-user');
        const domain = a.getAttribute('data-domain');
        if (!user || !domain) return;
        const addr = user + '@' + domain;
        a.href = 'mailto:' + addr;
        a.textContent = addr;
    });

    /* ---------- Reveal-on-scroll ---------- */
    const revealables = document.querySelectorAll('.hero, .section');
    revealables.forEach((el) => el.classList.add('reveal'));

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
        revealables.forEach((el) => io.observe(el));
    } else {
        // Fallback: just reveal everything
        revealables.forEach((el) => el.classList.add('is-in'));
    }

    /* ---------- Scroll progress bar ---------- */
    const progress = document.querySelector('.scroll-progress > span');
    if (progress) {
        let ticking = false;
        const updateProgress = () => {
            const doc = document.documentElement;
            const scrollable = doc.scrollHeight - doc.clientHeight;
            const pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
            progress.style.width = pct.toFixed(2) + '%';
            ticking = false;
        };
        window.addEventListener('scroll', () => {
            if (!ticking) { window.requestAnimationFrame(updateProgress); ticking = true; }
        }, { passive: true });
        updateProgress();
    }

    /* ---------- Scroll-spy: highlight current section in nav ---------- */
    const navMap = new Map();
    document.querySelectorAll('.nav-links a[href^="#"]').forEach((a) => {
        const id = a.getAttribute('href').slice(1);
        const sec = document.getElementById(id);
        if (sec) navMap.set(sec, a);
    });

    if (navMap.size && 'IntersectionObserver' in window) {
        let current = null;
        const setCurrent = (link) => {
            if (link === current) return;
            navMap.forEach((a) => a.classList.remove('is-current'));
            if (link) link.classList.add('is-current');
            current = link;
        };
        const spy = new IntersectionObserver((entries) => {
            // Pick the entry whose section is nearest the top of the viewport.
            const visible = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (visible.length) setCurrent(navMap.get(visible[0].target));
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        navMap.forEach((_, sec) => spy.observe(sec));
    }

    /* ---------- Tasteful hero load reveal (staggered) ---------- */
    const reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
        const heroText = document.querySelector('.hero-text');
        const portrait = document.querySelector('.hero-portrait');
        const items = [];
        if (portrait) items.push(portrait);
        if (heroText) items.push.apply(items, Array.prototype.slice.call(heroText.children));
        if (items.length) {
            items.forEach((el, i) => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(14px)';
                el.style.transition = 'opacity .7s var(--ease), transform .7s var(--ease)';
                el.style.transitionDelay = (0.08 * i + 0.05).toFixed(2) + 's';
            });
            requestAnimationFrame(() => requestAnimationFrame(() => {
                items.forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
            }));
        }
    }

    /* ---------- Gallery videos: muted autoplay + loop (paused if reduced-motion) ---------- */
    const galleryVideos = document.querySelectorAll('.media-frame video');
    galleryVideos.forEach((v) => {
        v.muted = true;              // browsers require muted for autoplay
        v.loop = true;
        v.setAttribute('muted', '');
        if (reduceMotion) {
            v.removeAttribute('autoplay');
            try { v.pause(); } catch (e) { /* ignore */ }
        } else {
            const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
            if (v.readyState >= 2) tryPlay();
            else v.addEventListener('loadeddata', tryPlay, { once: true });
        }
    });
})();
