/* =========================================================
   منطق الواجهة العامة — تيم سديم
   (شريط الإعلانات، بنك الملخصات، البحث الذكي، الأسئلة الشائعة، واتساب)
   ========================================================= */
(async function () {
  'use strict';

  const mode = await Store.init();

  /* حالة الواجهة */
  const state = { query: '', type: 'الكل' };

  /* ---------- ألوان وأيقونات أنواع الملفات ---------- */
  const TYPE_STYLE = {
    'محاضرة': { icon: 'fa-video',        chip: 'bg-sky-400/15 text-sky-300 border-sky-400/30' },
    'ملخص':   { icon: 'fa-file-lines',   chip: 'bg-violet-400/15 text-violet-300 border-violet-400/30' },
    'سكشن':   { icon: 'fa-pencil',       chip: 'bg-pink-400/15 text-pink-300 border-pink-400/30' },
    'مذكرة':   { icon: 'fa-book',         chip: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
    'عملي':    { icon: 'fa-flask',        chip: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' },
    'أسئلة':   { icon: 'fa-circle-question', chip: 'bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30' },
    'شيت':    { icon: 'fa-table-list',   chip: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
    'تطبيق':  { icon: 'fa-code',         chip: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' }
  };
  const FALLBACK_TYPE = { icon: 'fa-file', chip: 'bg-white/10 text-slate-300 border-white/20' };
  const SUBJECT_EMOJIS = ['📚', '🧮', '💻', '🧠', '🔭', '⚗️', '🌐', '📊'];

  const subjectEmoji = (name) => {
    let h = 0;
    const n = normalizeAr(name);
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return SUBJECT_EMOJIS[h % SUBJECT_EMOJIS.length];
  };

  const matchText = (needle, hay) => normalizeAr(hay).includes(normalizeAr(needle));

  /* =========================================================
     شريط الإعلانات المتحرك
     ========================================================= */
  function renderTicker() {
    const bar = $('#tickerBar');
    const track = $('#tickerTrack');
    const list = Store.listAnnouncements().filter((a) => a.active);
    if (!list.length) { bar.classList.add('hidden'); return; }

    const style = {
      info:    { icon: 'fa-star',                cls: 'text-sky-300' },
      urgent:  { icon: 'fa-circle-exclamation',  cls: 'text-rose-300' },
      exam:    { icon: 'fa-clipboard-question',  cls: 'text-amber-300' }
    };

    const item = (a) => {
      const st = style[a.type] || style.info;
      return `<span class="inline-flex items-center gap-2 text-sm font-bold whitespace-nowrap ${st.cls}" dir="rtl">
        <i class="fa-solid ${st.icon} text-xs"></i>${escapeHtml(a.text)}
        <i class="fa-solid fa-diamond text-[6px] text-white/25 mx-2"></i>
      </span>`;
    };

    const half = `<div class="flex items-center">${list.map(item).join('')}</div>`;
    track.innerHTML = half + half; // نسختان لحلقة متحركة بلا فواصل
    bar.classList.remove('hidden');
  }

  /* =========================================================
     بنك الملخصات والمحاضرات
     ========================================================= */
  function materialRow(m) {
    const st = TYPE_STYLE[m.type] || FALLBACK_TYPE;
    return `
      <div class="flex items-center gap-3 py-3 border-t border-white/5 first:border-t-0" data-mat="${escapeHtml(m.id)}">
        <span class="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border ${st.chip}">
          <i class="fa-solid ${st.icon}"></i>${escapeHtml(m.type)}
        </span>
        <p class="flex-1 min-w-0 text-sm font-bold text-slate-200 truncate" title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</p>
        <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer"
           class="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 hover:opacity-90 active:scale-95 transition"
           aria-label="فتح رابط ${escapeHtml(m.title)} على Google Drive">
          <i class="fa-brands fa-google-drive"></i>فتح الرابط
        </a>
      </div>`;
  }

  function renderSubjects() {
    const grid = $('#subjectsGrid');
    const empty = $('#bankEmpty');
    const subjects = Store.listSubjects();

    const q = state.query.trim();
    const cards = [];

    subjects.forEach((sub, idx) => {
      const qMatchSubject = q && (matchText(q, sub.name) || matchText(q, sub.code || ''));
      let mats = (sub.materials || []).filter((m) => {
        const typeOk = state.type === 'الكل' || m.type === state.type;
        if (!typeOk) return false;
        if (!q) return true;
        return qMatchSubject || matchText(q, m.title);
      });

      // بدون بحث وبدون فلتر: أظهر المادة حتى لو فاضية (مع تنبيه داخل الكارت)
      const showEmptyCard = !q && state.type === 'الكل' && !(sub.materials || []).length;
      if (!mats.length && !showEmptyCard) return;

      cards.push(`
        <article id="card-sub-${escapeHtml(sub.id)}" class="glass rounded-3xl overflow-hidden card-hover" style="animation-delay:${idx * 60}ms">
          <div class="p-5 pb-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-11 h-11 rounded-2xl bg-white/[.08] border border-white/10 flex items-center justify-center text-xl shrink-0">${subjectEmoji(sub.name)}</span>
                <div class="min-w-0">
                  <h3 class="font-black text-white text-lg leading-tight truncate">${escapeHtml(sub.name)}</h3>
                  <p class="text-xs text-slate-400 font-bold mt-1 flex items-center gap-2 flex-wrap">
                    ${sub.code ? `<span class="bg-white/[.08] border border-white/10 rounded-md px-1.5 py-0.5" dir="ltr">${escapeHtml(sub.code)}</span>` : ''}
                    ${sub.semester ? `<span><i class="fa-regular fa-calendar text-brand-violet"></i> ${escapeHtml(sub.semester)}</span>` : ''}
                    <span class="text-brand-sky">${mats.length} ملف</span>
                  </p>
                </div>
              </div>
            </div>
            ${sub.note ? `<p class="mt-3 text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl px-3 py-2 leading-relaxed"><i class="fa-solid fa-lightbulb text-brand-gold ml-1"></i>${escapeHtml(sub.note)}</p>` : ''}
          </div>
          <div class="px-5 pb-5">
            ${mats.length
              ? mats.map(materialRow).join('')
              : `<p class="py-3 border-t border-white/5 text-sm text-slate-500 font-bold"><i class="fa-regular fa-folder-open ml-1"></i>لم تُضف ملخصات لهذه المادة بعد</p>`}
          </div>
        </article>`);
    });

    grid.innerHTML = cards.join('');
    empty.classList.toggle('hidden', cards.length > 0);
  }

  function renderTypeChips() {
    const types = ['الكل', 'محاضرة', 'سكشن', 'ملخص', 'مذكرة', 'عملي', 'أسئلة'];
    const subjects = Store.listSubjects();
    const counts = {};
    types.forEach((t) => { counts[t] = 0; });
    subjects.forEach((s) => (s.materials || []).forEach((m) => {
      if (counts[m.type] !== undefined) counts[m.type]++;
      else counts[m.type] = 1;
    }));

    $('#typeChips').innerHTML = types.map((t) => {
      const active = state.type === t;
      const label = t === 'الكل' ? 'الكل' : `${t} (${counts[t] || 0})`;
      return `<button data-type="${escapeHtml(t)}" class="px-4 py-2 rounded-xl text-sm font-extrabold transition border ${
        active ? 'text-white bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 border-transparent shadow-lg shadow-fuchsia-500/25'
               : 'text-slate-300 bg-white/5 border-white/10 hover:bg-white/10'}">${escapeHtml(label)}</button>`;
    }).join('');
  }

  $('#typeChips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    state.type = btn.dataset.type;
    renderTypeChips();
    renderSubjects();
  });

  $('#bankEmptyReset').addEventListener('click', () => {
    state.query = '';
    state.type = 'الكل';
    $('#searchInput').value = '';
    hideSearchResults();
    renderTypeChips();
    renderSubjects();
  });

  /* =========================================================
     الأسئلة الشائعة (أكورديون)
     ========================================================= */
  function renderFaqs() {
    const list = Store.listFaqs();
    const wrap = $('#faqList');
    if (!list.length) {
      wrap.innerHTML = `
        <div class="glass rounded-2xl p-8 text-center text-slate-400 font-bold">
          <i class="fa-regular fa-comment-dots text-2xl block mb-2 text-slate-500"></i>
          لا توجد أسئلة منشورة بعد — اضغط زر «اسأل سؤال» العائم وسؤالك هيتنشر هنا بعد ما يرد عليه الفريق.
        </div>`;
      return;
    }
    wrap.innerHTML = list.map((f, i) => `
      <div id="faq-item-${escapeHtml(f.id)}" class="faq-item glass rounded-2xl overflow-hidden card-hover ${i === 0 ? 'open' : ''}">
        <button class="faq-q w-full flex items-center justify-between gap-3 px-5 py-4 text-right" aria-expanded="${i === 0}">
          <span class="font-extrabold text-white text-sm sm:text-base leading-relaxed">${escapeHtml(f.q)}</span>
          <i class="fa-solid fa-chevron-down faq-chevron text-brand-violet shrink-0 text-sm"></i>
        </button>
        <div class="faq-answer px-5">
          <p class="pb-4 text-sm text-slate-300 leading-loose">${escapeHtml(f.a)}</p>
        </div>
      </div>`).join('');

    $$('.faq-q', wrap).forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const wasOpen = item.classList.contains('open');
        $$('.faq-item.open', wrap).forEach((x) => { x.classList.remove('open'); x.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
        if (!wasOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  /* فتح سؤال شائع من نتائج البحث */
  window.openFaqById = function (id) {
    const item = document.getElementById('faq-item-' + id);
    if (!item) return;
    $$('.faq-item.open').forEach((x) => x.classList.remove('open'));
    item.classList.add('open');
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    item.classList.add('highlight-flash');
    setTimeout(() => item.classList.remove('highlight-flash'), 1800);
  };

  window.scrollToSubjectCard = function (id) {
    const card = document.getElementById('card-sub-' + id);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('highlight-flash');
    setTimeout(() => card.classList.remove('highlight-flash'), 1800);
  };

  /* =========================================================
     البحث الذكي (مواد + ملفات + أسئلة شائعة)
     ========================================================= */
  const searchInput = $('#searchInput');
  const searchResults = $('#searchResults');

  function searchScore(query, target) {
    const nq = normalizeAr(query);
    const nt = normalizeAr(target);
    if (!nq) return 0;
    if (nt.includes(nq)) return 2;
    const tokens = nq.split(' ').filter((t) => t.length >= 2);
    let hit = 0;
    tokens.forEach((t) => { if (nt.includes(t)) hit++; });
    return hit / Math.max(1, tokens.length);
  }

  function buildResults(q) {
    const subjects = Store.listSubjects();
    const faqs = Store.listFaqs();

    const subjectHits = subjects
      .map((s) => ({ s, score: Math.max(searchScore(q, s.name), searchScore(q, s.code || '')) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const materialHits = [];
    subjects.forEach((s) => (s.materials || []).forEach((m) => {
      const score = Math.max(searchScore(q, m.title), searchScore(q, s.name) * 0.9);
      if (score > 0) materialHits.push({ s, m, score });
    }));
    materialHits.sort((a, b) => b.score - a.score);
    const materialTop = materialHits.slice(0, 6);

    const faqHits = faqs
      .map((f) => ({ f, score: searchScore(q, f.q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    return { subjectHits, materialTop, faqHits, total: subjectHits.length + materialTop.length + faqHits.length };
  }

  function groupLabel(icon, text, color) {
    return `<p class="px-4 pt-3 pb-1 text-[11px] font-black ${color} flex items-center gap-2"><i class="fa-solid ${icon}"></i>${text}</p>`;
  }

  function renderSearchResults(q) {
    if (!q || q.trim().length < 2) { hideSearchResults(); return; }
    const r = buildResults(q.trim());

    if (!r.total) {
      searchResults.innerHTML = `
        <div class="p-6 text-center text-sm text-slate-400 font-bold">
          <i class="fa-solid fa-face-meh text-2xl block mb-2 text-slate-500"></i>
          مفيش نتائج لـ «${escapeHtml(q.trim())}» — جرب كلمة أبسط، أو اضغط زر «اسأل سؤال» العائم 👇
        </div>`;
      searchResults.classList.remove('hidden');
      return;
    }

    let html = '';
    if (r.subjectHits.length) {
      html += groupLabel('fa-book', 'المواد', 'text-brand-gold');
      html += r.subjectHits.map(({ s }) => `
        <button class="sr-subject w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[.08] transition text-right" data-sub="${escapeHtml(s.id)}">
          <span class="w-9 h-9 rounded-xl bg-white/[.08] border border-white/10 flex items-center justify-center text-lg shrink-0">${subjectEmoji(s.name)}</span>
          <span class="min-w-0">
            <span class="block text-sm font-extrabold text-white truncate">${escapeHtml(s.name)}</span>
            <span class="block text-xs text-slate-400">${(s.materials || []).length} ملف ${s.code ? '• ' + escapeHtml(s.code) : ''}</span>
          </span>
          <i class="fa-solid fa-arrow-left text-slate-500 text-xs mr-auto"></i>
        </button>`).join('');
    }
    if (r.materialTop.length) {
      html += groupLabel('fa-folder-open', 'ملخصات ومحاضرات', 'text-brand-pink');
      html += r.materialTop.map(({ s, m }) => {
        const st = TYPE_STYLE[m.type] || FALLBACK_TYPE;
        return `
        <button class="sr-material w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[.08] transition text-right" data-url="${escapeHtml(m.url)}" data-sub="${escapeHtml(s.id)}">
          <span class="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-1 rounded-lg border ${st.chip}"><i class="fa-solid ${st.icon}"></i>${escapeHtml(m.type)}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-bold text-white truncate">${escapeHtml(m.title)}</span>
            <span class="block text-xs text-slate-400">${escapeHtml(s.name)}</span>
          </span>
          <i class="fa-brands fa-google-drive text-slate-500"></i>
        </button>`;
      }).join('');
    }
    if (r.faqHits.length) {
      html += groupLabel('fa-circle-question', 'أسئلة شائعة', 'text-brand-sky');
      html += r.faqHits.map(({ f }) => `
        <button class="sr-faq w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[.08] transition text-right" data-faq="${escapeHtml(f.id)}">
          <i class="fa-solid fa-circle-question text-brand-sky shrink-0"></i>
          <span class="min-w-0 flex-1 text-sm font-bold text-slate-200 truncate">${escapeHtml(f.q)}</span>
          <i class="fa-solid fa-arrow-left text-slate-500 text-xs"></i>
        </button>`).join('');
    }

    searchResults.innerHTML = html;
    searchResults.classList.remove('hidden');
  }

  function hideSearchResults() { searchResults.classList.add('hidden'); }

  searchInput.addEventListener('input', debounce(() => {
    state.query = searchInput.value;
    renderSubjects();
    renderSearchResults(state.query);
  }, 180));

  searchInput.addEventListener('focus', () => renderSearchResults(searchInput.value));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchWrap')) hideSearchResults();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideSearchResults(); });

  searchResults.addEventListener('click', (e) => {
    const sub = e.target.closest('.sr-subject');
    const mat = e.target.closest('.sr-material');
    const faq = e.target.closest('.sr-faq');
    if (sub) {
      hideSearchResults();
      window.scrollToSubjectCard(sub.dataset.sub);
    } else if (mat) {
      window.open(mat.dataset.url, '_blank', 'noopener');
      hideSearchResults();
      window.scrollToSubjectCard(mat.dataset.sub);
    } else if (faq) {
      hideSearchResults();
      window.openFaqById(faq.dataset.faq);
    }
  });

  /* =========================================================
     ردود مثبتة من الفريق في الصفحة الرئيسية (الأدمن يختارها)
     ========================================================= */
  function renderPinned() {
    const section = $('#pinned');
    const grid = $('#pinnedGrid');
    const list = Store.listFaqs().filter((f) => f.featured);
    if (!list.length) { section.classList.add('hidden'); grid.innerHTML = ''; return; }

    grid.innerHTML = list.slice(0, 6).map((f, i) => `
      <article class="glass rounded-3xl p-5 card-hover flex flex-col" style="animation-delay:${i * 60}ms">
        <div class="flex items-center gap-2 text-[11px] font-extrabold text-emerald-300">
          <i class="fa-solid fa-circle-check"></i>
          <span>اترد عليه من فريق سديم</span>
          <i class="fa-solid fa-thumbtack mr-auto text-slate-500" title="مثبتة في الصفحة الرئيسية من الأدمن"></i>
        </div>
        <h3 class="mt-3 font-black text-white text-sm sm:text-base leading-relaxed">${escapeHtml(f.q)}</h3>
        <p class="mt-2 text-sm text-slate-400 leading-relaxed flex-1">${escapeHtml(truncate(f.a, 150))}</p>
        <button data-pin-faq="${escapeHtml(f.id)}" class="mt-4 inline-flex items-center justify-center gap-2 self-start px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-l from-emerald-500 to-teal-500 hover:opacity-90 active:scale-95 transition">
          <i class="fa-solid fa-eye"></i>شوف الإجابة كاملة
        </button>
      </article>`).join('');

    section.classList.remove('hidden');
  }

  /* فتح رد مثبت في قسم الأسئلة الشائعة */
  $('#pinnedGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pin-faq]');
    if (!b) return;
    window.openFaqById(b.dataset.pinFaq);
  });

  /* =========================================================
     إشعار الطالب: الفريق رد على سؤالك 🔔
     ========================================================= */
  let currentReply = null; // {id, text, repliedFaqId}

  function showReplyBanner() {
    const unseen = Store.matchMyReplies();
    if (!unseen.length) return;
    currentReply = unseen[0];
    const faqs = Store.listFaqs();
    const faq = faqs.find((f) => f.id === currentReply.repliedFaqId);
    if (!faq) return;
    $('#replyBannerQ').textContent = '«' + currentReply.text + '»';
    $('#replyBanner').classList.remove('hidden');
    UI.toast('فريق سديم رد على سؤالك 🔔 — بص على الإشعار في أعلى الصفحة', 'success', 'رد جديد ليك 💙', 7000);
  }

  $('#replyBannerOpen').addEventListener('click', () => {
    if (currentReply) Store.markReplySeen(currentReply.id);
    $('#replyBanner').classList.add('hidden');
    if (currentReply) window.openFaqById(currentReply.repliedFaqId);
    currentReply = null;
  });

  $('#replyBannerDismiss').addEventListener('click', () => {
    if (currentReply) Store.markReplySeen(currentReply.id);
    $('#replyBanner').classList.add('hidden');
    currentReply = null;
  });

  /* =========================================================
     الإحصائيات (عدّ تصاعدي)
     ========================================================= */
  function animateNumber(el, to) {
    const from = parseInt(el.textContent, 10) || 0;
    if (from === to) { el.textContent = to; return; }
    const start = performance.now();
    const dur = 700;
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderStats(animate = true) {
    const st = Store.stats();
    const pairs = [[$('#statSubjects'), st.subjects], [$('#statMaterials'), st.materials], [$('#statFaqs'), st.faqs]];
    pairs.forEach(([el, v]) => (animate ? animateNumber(el, v) : (el.textContent = v)));
  }

  /* =========================================================
   مجتمع الواتساب (انضمام فقط) — يظهر لو المشرف حدّد رقم أو رابط من الإعدادات
   ========================================================= */
  function renderWhatsapp() {
    const s = Store.getSettings();
    const raw = String(s.whatsapp || '').trim();
    const isUrl = /^https?:\/\//i.test(raw);
    const digits = raw.replace(/\D/g, '');
    const href = isUrl ? raw : (digits ? `https://wa.me/${digits}?text=${encodeURIComponent(SADEEM_CONFIG.whatsappGreeting)}` : null);

    const els = [$('#whatsBtn'), $('#ctaWhats'), $('#footerWhats')];
    els.forEach((el) => {
      if (!el) return;
      if (!href) { el.classList.add('hidden'); el.removeAttribute('href'); }
      else { el.classList.remove('hidden'); el.href = href; }
    });
  }

/* =========================================================
     قائمة الهواتف + تأثيرات التمرير
     ========================================================= */
  const menuBtn = $('#menuBtn');
  const mobileMenu = $('#mobileMenu');
  menuBtn.addEventListener('click', () => {
    const hidden = mobileMenu.classList.toggle('hidden');
    menuBtn.setAttribute('aria-expanded', String(!hidden));
    menuBtn.innerHTML = hidden ? '<i class="fa-solid fa-bars text-white"></i>' : '<i class="fa-solid fa-xmark text-white"></i>';
  });
  $$('.mobile-link').forEach((a) => a.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.innerHTML = '<i class="fa-solid fa-bars text-white"></i>';
  }));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('show'); revealObserver.unobserve(en.target); } });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  /* =========================================================
     التشغيل + التحديث عند أي تغيير في البيانات
     ========================================================= */
  function renderAll() {
    renderTicker();
    renderTypeChips();
    renderSubjects();
    renderFaqs();
    renderStats();
    renderWhatsapp();
    renderPinned();
  }

  renderAll();
  $('#yearNow').textContent = new Date().getFullYear();

  /* فحص ردود الفريق على أسئلة الطالب (عند الفتح وعند أي تحديث بيانات) */
  let replyTimer = null;
  function checkRepliesSoon() {
    clearTimeout(replyTimer);
    replyTimer = setTimeout(() => { if (!$('#replyBanner').classList.contains('hidden')) return; showReplyBanner(); }, 1500);
  }
  checkRepliesSoon();
  document.addEventListener('sadeem:change', checkRepliesSoon);

  let changeTimer = null;
  document.addEventListener('sadeem:change', () => {
    clearTimeout(changeTimer);
    changeTimer = setTimeout(renderAll, 120);
  });

  /* تحديث فوري عندما يعدّل المشرف البيانات من تبويب آخر (الوضع المحلي) */
  window.addEventListener('storage', (e) => {
    if (e.key === SADEEM_CONFIG.storageKeys.db) Store.refreshFromLocal();
  });

  /* زر «اسأل سؤال» — سؤالك يوصل مباشرة لفريق سديم (لوحة التحكم ← الأسئلة الواردة) */
  $('#askBtn').addEventListener('click', () => {
    const m = UI.openModal(`
      <form id="askForm" class="p-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-fuchsia-500/15 text-fuchsia-300 flex items-center justify-center text-xl shrink-0"><i class="fa-solid fa-circle-question"></i></div>
          <h3 class="text-lg font-black text-white">اسأل فريق سديم</h3>
        </div>
        <p class="mt-3 text-sm text-slate-400 font-bold leading-relaxed">اكتب سؤالك وهيتسجل على المنصة ويوصَل للفريق مباشرة — وهيتم الرد عليك في أسرع وقت، ولو اعتمدنا إجابتك هتنزل في الأسئلة الشائعة.</p>
        <textarea id="askText" rows="4" class="input-dark resize-none leading-loose mt-4" placeholder="مثال: فين ملخص محاضرة 5 بساتين؟" required></textarea>
        <div class="flex gap-3 mt-6">
          <button type="button" data-close class="flex-1 py-3 rounded-xl font-extrabold text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition">إلغاء</button>
          <button type="submit" class="flex-1 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-l from-sky-500 via-fuchsia-500 to-violet-600 hover:opacity-90 transition">إرسال السؤال</button>
        </div>
      </form>`);
    m.card.querySelector('#askForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = m.card.querySelector('#askText').value.trim();
      if (!q) return;
      Store.addQuestion({ question: q, botAnswer: '' });
      try { Store.addMyQuestion(q); } catch (err) { /* تجاهل */ }
      m.close();
      UI.toast('سؤالك وصل لفريق سديم ✅ هيتم الرد عليه قريباً، وهيجيلك إشعار هنا أول ما يرد.', 'success', 'تم إرسال سؤالك');
    });
  });

  /* تشغيل بوت سديم + أزرار فتح المحادثة */
  if (typeof ChatWidget !== 'undefined' && ChatWidget.mount) ChatWidget.mount();
  const openBot = () => { if (typeof ChatWidget !== 'undefined' && ChatWidget.open) ChatWidget.open(); };
  $('#ctaAsk').addEventListener('click', openBot);
  $('#footerAsk').addEventListener('click', openBot);

  /* إشعار ترحيبي خفيف لأول زيارة */
  try {
    if (!localStorage.getItem('sadeem_seen_v1')) {
      localStorage.setItem('sadeem_seen_v1', '1');
      setTimeout(() => UI.toast('اسأل بوت سديم العائم 🤖 أي سؤال — هيجيبك فوراً، ولو مش عارف هيرفع سؤالك للفريق 💙', 'info', 'أهلاً بيك في تيم سديم!', 6000), 1400);
    }
  } catch (e) { /* تجاهل */ }

  console.log('%cتيم سديم 💙', 'font-size:16px;font-weight:bold', 'الوضع:', mode === 'firebase' ? 'مزامنة سحابية' : 'تخزين محلي');
})();
