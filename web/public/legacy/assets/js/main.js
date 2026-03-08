// ===== FIX MOJIBAKE (ACCENTS + EMOJIS) =====
// Normalizes common broken UTF-8 sequences that may appear as mojibake.
function fixMojibake() {
  const map = new Map([
    ['Ã¡', 'á'], ['Ã ', 'à'], ['Ã¢', 'â'], ['Ã£', 'ã'], ['Ã¤', 'ä'],
    ['Ã©', 'é'], ['Ãª', 'ê'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ã´', 'ô'],
    ['Ãµ', 'õ'], ['Ãº', 'ú'], ['Ã§', 'ç'], ['Ã‰', 'É'], ['Â©', '©'],
    ['Â·', '·'], ['â€“', '–'], ['â€”', '-'], ['â†’', '→'], ['â†‘', '↑'],
    ['âœ‚', '✂'], ['âœ¦', '✦'], ['â˜…', '★'], ['â­', '⭐'],
    ['â±', '⏱'], ['â¤', '❤'], ['âš ï¸', '⚠️'],
    ['ðŸ’¬', '💬'], ['ðŸ’ˆ', '💈'], ['ðŸ“', '📍'], ['ðŸ“ž', '📞'],
    ['ðŸ“¸', '📸'], ['ðŸ—ºï¸', '🗺️'], ['ðŸª’', '🪒'],
    ['ðŸ’Ž', '💎'], ['ðŸ‘', '👁'], ['ðŸ¦¶', '🦶']
  ]);

  const replaceText = (text) => {
    let out = text;
    for (const [bad, good] of map) out = out.split(bad).join(good);
    return out;
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const fixed = replaceText(node.nodeValue || '');
    if (fixed !== node.nodeValue) node.nodeValue = fixed;
  });

  document.querySelectorAll('[title],[aria-label],img[alt],meta[content]').forEach((el) => {
    ['title', 'aria-label', 'alt', 'content'].forEach((attr) => {
      if (!el.hasAttribute(attr)) return;
      const value = el.getAttribute(attr) || '';
      const fixed = replaceText(value);
      if (fixed !== value) el.setAttribute(attr, fixed);
    });
  });
}

fixMojibake();
// ===== MOBILE MENU =====
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    hamburger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // ===== SMOOTH SCROLL WITH HEADER OFFSET =====
    const HEADER_HEIGHT = 76;
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });

    // ===== FAQ ACCORDION =====
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => {
          i.classList.remove('open');
          i.querySelector('.faq-answer').style.maxHeight = '0';
          i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
          i.querySelector('.faq-answer').setAttribute('aria-hidden', 'true');
        });
        if (!isOpen) {
          item.classList.add('open');
          const answer = item.querySelector('.faq-answer');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          btn.setAttribute('aria-expanded', 'true');
          answer.setAttribute('aria-hidden', 'false');
        }
      });
    });

    // ===== SCROLL TO TOP =====
    const scrollTopBtn = document.getElementById('scrollTop');
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    });
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // ===== FADE IN ON SCROLL =====
    const fadeEls = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    fadeEls.forEach(el => observer.observe(el));

    // ===== HEADER SHADOW ON SCROLL =====
    window.addEventListener('scroll', () => {
      document.getElementById('header').style.boxShadow =
        window.scrollY > 10 ? '0 2px 24px rgba(0,0,0,.4)' : 'none';
    });

