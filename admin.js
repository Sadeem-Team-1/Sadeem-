/* =========================================================
   لوحة تحكم المشرفين — تيم سديم
   (دخول آمن، الأسئلة الواردة، إدارة الملخصات، الإعلانات، الإعدادات)
   ========================================================= */
(async function () {
  'use strict';

  const K = SADEEM_CONFIG.storageKeys;
  await Store.init();

  const state = { sec: 'overview', qFilter: 'all' };

  /* أنماط الشارات */
  const TYPE_STYLE = {
    'محاضرة': { icon: 'fa-video',      chip: 'bg-sky-400/15 text-sky-300 border-sky-400/30' },
    'ملخص':   { icon: 'fa-file-lines', chip: 'bg-violet-400/15 text-violet-300 border-violet-400/30' },
    'سكشن':   { icon: 'fa-pencil',     chip: 'bg-pink-400/15 text-pink-300 border-pink-400/30' },
    'مذكرة':   { icon: 'fa-book',       chip: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
    'عملي':    { icon: 'fa-flask',      chip: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' },
    'أسئلة':   { icon: 'fa-circle-question', chip: 'bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30' },
    'شيت':    { icon: 'fa-table-list', chip: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
    'تطبيق':  { icon: 'fa-code',       chip: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' }
  };
  const FALLBACK_TYPE = { icon: 'fa-file', chip: 'bg-white/10 text-slate-300 border-white/20' };
  const ANN_STYLE = {
    info:   { label: 'معلومة',        icon: 'fa-star',                 chip: 'bg-sky-400/15 text-sky-300 border-sky-400/30' },
    urgent: { label: 'عاجل',          icon: 'fa-triangle-exclamation', chip: 'bg-rose-400/15 text-rose-300 border-rose-400/30' },
    exam:   { label: 'امتحان/مراجعة', icon: 'fa-clipboard-question',   chip: 'bg-amber-400/15 text-amber-300 border-amber-400/30' }
  };
  const SUBJECT_EMOJIS = ['📚', '🧮', '💻', '🧠', '🔭', '⚗️', '🌐', '📊'];
  const subjectEmoji = (name) => {
    let h = 0;
    const n = normalizeAr(name);
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return SUBJECT_EMOJIS[h % SUBJECT_EMOJIS.length];
  };

  const btnGhost = 'px-3 py-2 rounded-lg text-xs font-extrabold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 transition';
  const btnDanger = 'px-3 py-2 rounded-lg text-xs font-extrabold text-rose-300 bg-rose-500/10 border border-rose-400/30 hover:bg-rose-500/20 transition';

  /* =========================================================
     الدخول والجلسة
     ========================================================= */
  const loginView = $('#loginView');
  const panelView = $('#panelView');
  const loginCard = $('#loginCard');
  const loginMsg = $('#loginMsg');

  const isAuthed = () => sessionStorage.getItem(K.auth) === '1';

  function showLoginMsg(text, type = 'error') {
    loginMsg.textContent = text;
    loginMsg.classList.remove('hidden');
    if (type === 'error') UI.shake(loginCard);
    clearTimeout(showLoginMsg._t);
    showLoginMsg._t = setTimeout(() => loginMsg.classList.add('hidden'), 4000);
  }

  function getFails() { return parseInt(sessionStorage.getItem('sadeem_fails') || '0', 10); }
  function getLockUntil() {
    const v = parseInt(sessionStorage.getItem(K.lock) || '0', 10);
    return v > Date.now() ? v : 0;
  }

  function startLockTimer() {
    const remain = Math.ceil((getLockUntil() - Date.now()) / 1000);
    if (remain <= 0) return;
    $$('.login-submit').forEach((b) => {
      if (!b.dataset.label) b.dataset.label = b.innerHTML;
      b.disabled = true;
      b.classList.add('opacity-60', 'cursor-not-allowed');
      b.innerHTML = `<i class="fa-solid fa-hourglass-half ml-1"></i>مقفول مؤقتاً — ${remain} ثانية`;
    });
    const tick = () => {
      const r = Math.ceil((getLockUntil() - Date.now()) / 1000);
      if (r <= 0) {
        $$('.login-submit').forEach((b) => {
          b.disabled = false;
          b.classList.remove('opacity-60', 'cursor-not-allowed');
          b.innerHTML = b.dataset.label;
        });
        return;
      }
      $$('.login-submit').forEach((b) => {
        b.innerHTML = `<i class="fa-solid fa-hourglass-half ml-1"></i>مقفول مؤقتاً — ${r} ثانية`;
      });
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 1000);
  }

  function failAttempt() {
    const f = getFails() + 1;
    if (f >= 5) {
      sessionStorage.setItem(K.lock, String(Date.now() + 60000));
      sessionStorage.setItem('sadeem_fails', '0');
      startLockTimer();
      showLoginMsg('تم إيقاف المحاولات مؤقتاً لمدة دقيقة لأسباب أمنية 🔒');
    } else {
      sessionStorage.setItem('sadeem_fails', String(f));
      showLoginMsg(`بيانات الدخول غير صحيحة — محاولة ${f} من 5`);
    }
  }

  function doLogin() {
    sessionStorage.setItem(K.auth, '1');
    sessionStorage.removeItem('sadeem_fails');
    showPanel();
    UI.toast('أهلاً بيك تاني يا مشرف 💪 البيانات جاهزة للإدارة.', 'success', 'تم تسجيل الدخول');
  }

  function setTab(which) {
    const ACTIVE = 'login-tab py-2.5 rounded-xl transition bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 text-white shadow-lg shadow-fuchsia-500/25';
    const INACTIVE = 'login-tab py-2.5 rounded-xl transition text-slate-300 hover:text-white';
    const email = $('#tabEmailBtn'), code = $('#tabCodeBtn');
    if (which === 'email') {
      email.className = ACTIVE; code.className = INACTIVE;
      email.setAttribute('aria-selected', 'true'); code.setAttribute('aria-selected', 'false');
      $('#emailForm').classList.remove('hidden');
      $('#codeForm').classList.add('hidden');
    } else {
      code.className = ACTIVE; email.className = INACTIVE;
      code.setAttribute('aria-selected', 'true'); email.setAttribute('aria-selected', 'false');
      $('#codeForm').classList.remove('hidden');
      $('#emailForm').classList.add('hidden');
    }
    loginMsg.classList.add('hidden');
  }

  $('#tabEmailBtn').addEventListener('click', () => setTab('email'));
  $('#tabCodeBtn').addEventListener('click', () => setTab('code'));

  $('#emailForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (getLockUntil()) { showLoginMsg('الدخول مقفول مؤقتاً — انتظر انتهاء المدة 🔒'); return; }
    const s = Store.getSettings();
    const email = $('#loginEmail').value.trim().toLowerCase();
    const pass = $('#loginPass').value;
    if (email === String(s.adminEmail || '').toLowerCase() && hashStr(pass) === s.passHash) doLogin();
    else failAttempt();
  });

  $('#codeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (getLockUntil()) { showLoginMsg('الدخول مقفول مؤقتاً — انتظر انتهاء المدة 🔒'); return; }
    const s = Store.getSettings();
    const code = $('#loginCode').value.trim();
    if (code && hashStr(code) === s.teamCodeHash) doLogin();
    else failAttempt();
  });

  $('#logoutBtn').addEventListener('click', async () => {
    const ok = await UI.confirmDialog({ title: 'تسجيل الخروج؟', message: 'ستحتاج لتسجيل الدخول مرة أخرى للوصول للوحة.', okText: 'خروج', danger: true });
    if (!ok) return;
    sessionStorage.removeItem(K.auth);
    location.reload();
  });

  /* =========================================================
     التنقل بين الأقسام
     ========================================================= */
  function setSection(sec) {
    state.sec = sec;
    $$('.side-btn').forEach((b) => b.classList.toggle('active-sec', b.dataset.sec === sec));
    ['overview', 'questions', 'materials', 'broadcast', 'settings'].forEach((s) => {
      const el = document.getElementById('sec-' + s);
      if (el) el.classList.toggle('hidden', s !== sec);
    });
    renderSection(sec);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $$('.side-btn').forEach((b) => b.addEventListener('click', () => setSection(b.dataset.sec)));

  function renderSection(sec) {
    if (sec === 'overview') renderOverview();
    if (sec === 'questions') renderQuestions();
    if (sec === 'materials') renderMaterials();
    if (sec === 'broadcast') renderBroadcast();
    if (sec === 'settings') fillSettings();
  }

  function renderBadges() {
    const st = Store.stats();
    ['#badgePending', '#badgePendingMobile'].forEach((sel) => {
      const el = $(sel);
      if (el) el.textContent = st.pending > 0 ? String(st.pending) : '';
    });
  }

  function renderSyncBadge() {
    const b = $('#syncBadge');
    if (!b) return;
    if (Store.getMode() === 'firebase') {
      b.className = 'hidden sm:inline-flex items-center gap-2 text-xs font-extrabold px-3 py-2 rounded-xl bg-emerald-400/10 text-emerald-300 border border-emerald-400/30';
      b.title = 'البيانات متزامنة سحابياً وتظهر لكل الطلاب فوراً';
      b.innerHTML = '<i class="fa-solid fa-cloud"></i>مزامنة سحابية متصلة';
    } else {
      b.className = 'hidden sm:inline-flex items-center gap-2 text-xs font-extrabold px-3 py-2 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/30';
      b.title = 'البيانات محفوظة في متصفح المشرف — فعّل Firebase من js/config.js لمزامنتها مع كل الطلاب';
      b.innerHTML = '<i class="fa-solid fa-database"></i>تخزين محلي';
    }
  }

  /* =========================================================
     نظرة عامة
     ========================================================= */
  function renderOverview() {
    const st = Store.stats();

    /* مؤشر حالة المزامنة (سحابي / محلي) */
    const syncMode = Store.getMode();
    $('#ovSync').innerHTML = syncMode === 'firebase'
      ? `<div class="glass rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 border border-emerald-400/25">
           <span class="inline-flex items-center gap-2 text-sm font-extrabold text-emerald-300"><i class="fa-solid fa-cloud-bolt"></i>المزامنة السحابية شغالة 🌩️</span>
           <span class="text-xs font-bold text-slate-400">كل تعديلاتك بتوصل لكل الطلاب فوراً على كل الأجهزة — والإشعارات بتوصل عبر الأجهزة كمان.</span>
         </div>`
      : `<div class="glass rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 border border-white/10">
           <span class="inline-flex items-center gap-2 text-sm font-extrabold text-amber-300"><i class="fa-solid fa-hard-drive"></i>وضع التخزين المحلي</span>
           <span class="text-xs font-bold text-slate-400 flex-1 min-w-[220px]">التعديلات شغالة، بس بتظهر على الجهاز ده بس. عشان كل الطلاب يشوفوا التحديثات فوراً و توصل إشعارات الرد عبر الأجهزة — فعّل المزامنة السحابية المجانية: افتح ملف <b class="text-slate-200" dir="ltr">FIREBASE_SETUP.html</b> واتبع الخطوات (5 دقائق).</span>
         </div>`;

    const cards = [
      ['fa-folder-open', 'مواد ومقررات', st.subjects, 'from-sky-400 to-violet-500'],
      ['fa-file-lines', 'ملخصات ومحاضرات', st.materials, 'from-violet-400 to-pink-500'],
      ['fa-circle-question', 'أسئلة شائعة', st.faqs, 'from-pink-400 to-rose-500'],
      ['fa-inbox', 'بانتظار الاعتماد', st.pending, 'from-amber-400 to-orange-500']
    ];
    $('#ovStats').innerHTML = cards.map(([icon, label, v, grad]) => `
      <div class="glass rounded-3xl p-5 card-hover">
        <span class="w-10 h-10 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center text-sm"><i class="fa-solid ${icon}"></i></span>
        <p class="mt-3 text-3xl font-black text-white">${v}</p>
        <p class="text-xs font-extrabold text-slate-400 mt-1">${label}</p>
      </div>`).join('');

    const pending = Store.listQuestions().filter((q) => q.status === 'pending').slice(0, 3);
    $('#ovQuestions').innerHTML = pending.length ? pending.map((q) => `
      <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5">
        <p class="text-sm font-extrabold text-white leading-relaxed">${escapeHtml(truncate(q.question, 90))}</p>
        <div class="flex items-center gap-2 mt-2.5">
          <button data-action="approve" data-qid="${escapeHtml(q.id)}" class="text-xs font-extrabold text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-3 py-1.5 hover:bg-emerald-400/20 transition"><i class="fa-solid fa-circle-check ml-1"></i>اعتماد ونشر</button>
          <button data-goto="questions" class="text-xs font-extrabold text-slate-300 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 hover:bg-white/10 transition">فتح القسم</button>
        </div>
      </div>`).join('')
      : `<p class="text-sm text-slate-500 font-bold">لا توجد أسئلة واردة حالياً — كل شيء تحت السيطرة ✅</p>`;

    const anns = Store.listAnnouncements().slice(0, 3);
    $('#ovAnnouncements').innerHTML = anns.length ? anns.map((a) => {
      const st2 = ANN_STYLE[a.type] || ANN_STYLE.info;
      return `
      <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-start gap-3">
        <span class="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border shrink-0 ${st2.chip}"><i class="fa-solid ${st2.icon}"></i>${st2.label}</span>
        <p class="flex-1 text-sm font-bold text-slate-200 leading-relaxed">${escapeHtml(truncate(a.text, 110))}</p>
        <span class="text-[10px] font-bold text-slate-500 shrink-0">${a.active ? 'ظاهر' : 'موقوف'}</span>
      </div>`;
    }).join('') : `<p class="text-sm text-slate-500 font-bold">لا إعلانات بعد — اكتب أول إعلان من قسم الإعلانات.</p>`;
  }

  /* =========================================================
     الأسئلة الواردة
     ========================================================= */
  function renderQuestionFilter() {
    const qs = Store.listQuestions();
    const counts = { all: qs.length, pending: 0, approved: 0, dismissed: 0 };
    qs.forEach((q) => { if (counts[q.status] !== undefined) counts[q.status]++; });
    const defs = [['all', 'الكل'], ['pending', 'بانتظار الاعتماد'], ['approved', 'معتمدة ومنشورة'], ['dismissed', 'متجاهلة']];
    $('#qFilter').innerHTML = defs.map(([k, label]) => {
      const active = state.qFilter === k;
      return `<button data-qf="${k}" class="px-4 py-2 rounded-xl text-sm font-extrabold transition border ${active ? 'text-white bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 border-transparent shadow-lg shadow-fuchsia-500/25' : 'text-slate-300 bg-white/5 border-white/10 hover:bg-white/10'}">${label} (${counts[k]})</button>`;
    }).join('');
  }

  const Q_STATUS = {
    pending: { label: 'بانتظار الاعتماد', cls: 'bg-amber-400/15 text-amber-300 border-amber-400/30', icon: 'fa-hourglass-half' },
    approved: { label: 'معتمدة ومنشورة', cls: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30', icon: 'fa-circle-check' },
    dismissed: { label: 'متجاهلة', cls: 'bg-white/10 text-slate-400 border-white/20', icon: 'fa-eye-slash' }
  };

  function renderQuestions() {
    renderQuestionFilter();
    const qs = Store.listQuestions().filter((q) => state.qFilter === 'all' || q.status === state.qFilter);
    const wrap = $('#questionsList');
    if (!qs.length) {
      wrap.innerHTML = `
        <div class="glass rounded-3xl border-dashed border-white/20 p-10 text-center">
          <i class="fa-solid fa-inbox text-4xl text-slate-500"></i>
          <p class="mt-4 font-extrabold text-lg">صندوق الأسئلة فاضي</p>
          <p class="mt-1 text-sm text-slate-400">أي سؤال يجيلنا من الطلاب (عبر سديم بوت أو زر «اسأل سؤال») هيوصل هنا فوراً.</p>
        </div>`;
      return;
    }
    wrap.innerHTML = qs.map((q) => {
      const st = Q_STATUS[q.status] || Q_STATUS.dismissed;
      const faqs = Store.listFaqs();
      const linkedFaq = q.faqId ? faqs.find((f) => f.id === q.faqId) : null;
      const isFeatured = !!(linkedFaq && linkedFaq.featured);
      return `
      <article class="glass rounded-3xl p-5" data-qid="${escapeHtml(q.id)}">
        <div class="flex flex-wrap items-center gap-2 text-xs font-extrabold">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${st.cls}"><i class="fa-solid ${st.icon}"></i>${st.label}</span>
          ${q.askCount > 1 ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-400/15 text-violet-300 border border-violet-400/30"><i class="fa-solid fa-users"></i>سُئل ${q.askCount} مرات</span>` : ''}
          ${isFeatured ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"><i class="fa-solid fa-thumbtack"></i>مثبتة في الرئيسية</span>` : ''}
          <span class="text-slate-500 font-bold">${timeAgo(q.lastAskedAt || q.createdAt)}</span>
        </div>
        <p class="mt-3 text-white font-extrabold text-base leading-relaxed"><i class="fa-solid fa-circle-question text-brand-sky ml-1"></i>${escapeHtml(q.question)}</p>
        <div class="mt-3 bg-white/5 border border-white/10 rounded-2xl p-4">
          <p class="text-[11px] font-black text-brand-violet flex items-center gap-1.5 mb-2"><i class="fa-solid fa-comment-dots"></i>${q.status === 'approved' && q.finalAnswer ? 'الإجابة المنشورة:' : (q.botAnswer ? 'الإجابة المقترحة:' : 'الإجابة (تُكتب عند الاعتماد):')}</p>
          <p class="text-sm text-slate-300 leading-loose whitespace-pre-line">${escapeHtml(q.status === 'approved' && q.finalAnswer ? q.finalAnswer : q.botAnswer)}</p>
        </div>
        <div class="flex flex-wrap gap-2 mt-4 items-center">
          ${q.status === 'pending' ? `
            <button data-action="approve" data-qid="${escapeHtml(q.id)}" class="px-4 py-2.5 rounded-xl text-sm font-extrabold text-white bg-gradient-to-l from-emerald-500 to-teal-500 hover:opacity-90 transition shadow-lg shadow-emerald-500/20"><i class="fa-solid fa-circle-check ml-1"></i>اعتماد الإجابة ونشرها</button>
            <button data-action="dismiss" data-qid="${escapeHtml(q.id)}" class="${btnGhost}"><i class="fa-solid fa-eye-slash ml-1"></i>تجاهل</button>` : ''}
          ${q.status === 'approved' ? `
            <span class="text-xs font-extrabold text-emerald-300"><i class="fa-solid fa-check-double ml-1"></i>منشور الآن في الأسئلة الشائعة للطلاب</span>
            ${q.faqId ? `<button data-action="toggle-featured" data-qid="${escapeHtml(q.id)}" class="px-4 py-2.5 rounded-xl text-sm font-extrabold transition ${isFeatured ? 'text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 hover:bg-emerald-400/20' : 'text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10'}">
              <i class="fa-solid fa-thumbtack ml-1"></i>${isFeatured ? 'مثبتة في الرئيسية — إلغاء التثبيت' : 'ثبّتيها في الصفحة الرئيسية'}
            </button>` : ''}` : ''}
          <button data-action="del-question" data-qid="${escapeHtml(q.id)}" class="${btnDanger}"><i class="fa-solid fa-trash-can ml-1"></i>حذف</button>
        </div>
      </article>`;
    }).join('');
  }

  function openApproveModal(q) {
    const m = UI.openModal(`
      <form id="approveForm" class="p-6">
        <h3 class="text-lg font-black text-white"><i class="fa-solid fa-circle-check text-emerald-400 ml-1"></i>اعتماد الإجابة ونشرها</h3>
        <p class="mt-3 text-sm bg-white/5 border border-white/10 rounded-xl p-3 font-extrabold text-white leading-relaxed">${escapeHtml(q.question)}</p>
        <label for="apAnswer" class="block text-xs font-extrabold text-slate-300 mt-4 mb-2">الإجابة النهائية (عدّلها قبل النشر إن أردت)</label>
        <textarea id="apAnswer" rows="6" class="input-dark resize-none leading-loose" required>${escapeHtml(q.botAnswer)}</textarea>
        <label for="apTags" class="block text-xs font-extrabold text-slate-300 mt-4 mb-2">كلمات مفتاحية للبحث (بفواصل)</label>
        <input id="apTags" type="text" class="input-dark" placeholder="مثال: هياكل بيانات، مراجعة، امتحانات" />
        <label class="mt-4 flex items-start gap-3 bg-emerald-400/5 border border-emerald-400/25 rounded-xl p-3.5 cursor-pointer hover:bg-emerald-400/10 transition">
          <input id="apFeatured" type="checkbox" checked class="mt-1 w-4 h-4 accent-emerald-400 shrink-0" />
          <span class="text-sm font-bold text-slate-200 leading-relaxed">
            <i class="fa-solid fa-thumbtack text-emerald-300 ml-1"></i>ثبّتيها في <b class="text-white">الصفحة الرئيسية</b> لكل الطلاب
            <span class="block text-xs text-slate-400 mt-1 font-normal">هتظهر كبطاقة «رد الفريق» فوق بنك الملخصات — ومن غير علامة هتنزل في الأسئلة الشائعة بس.</span>
          </span>
        </label>
        <div class="flex gap-3 mt-6">
          <button type="button" data-close class="flex-1 py-3 rounded-xl font-extrabold text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition">إلغاء</button>
          <button type="submit" class="flex-1 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-l from-emerald-500 to-teal-500 hover:opacity-90 transition">نشر في الأسئلة الشائعة</button>
        </div>
      </form>`);
    m.card.querySelector('#approveForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const answer = m.card.querySelector('#apAnswer').value.trim();
      if (!answer) { UI.toast('اكتب الإجابة أولاً', 'warning'); return; }
      const tags = m.card.querySelector('#apTags').value.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
      const featured = m.card.querySelector('#apFeatured').checked;
      Store.approveQuestion(q.id, { answer, tags, featured });
      m.close();
      UI.toast(featured
        ? 'اتنشرت في الأسئلة الشائعة واتثبت في الصفحة الرئيسية لكل الطلاب ✅'
        : 'ظهر السؤال الآن في قسم الأسئلة الشائعة على واجهة الطلاب ✅', 'success', 'تم اعتماد الإجابة ونشرها');
    });
  }

  /* =========================================================
     إدارة الملخصات
     ========================================================= */
  function materialRowAdmin(sub, m) {
    const st = TYPE_STYLE[m.type] || FALLBACK_TYPE;
    return `
      <div class="flex flex-wrap items-center gap-2 sm:gap-3 py-3 border-t border-white/5" data-mat="${escapeHtml(m.id)}">
        <span class="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border ${st.chip}"><i class="fa-solid ${st.icon}"></i>${escapeHtml(m.type)}</span>
        <p class="flex-1 min-w-[180px] text-sm font-bold text-slate-200">${escapeHtml(m.title)}</p>
        <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold text-brand-sky hover:underline truncate max-w-[180px]" dir="ltr">${escapeHtml(truncate(m.url, 34))}</a>
        <button data-action="edit-material" data-sub="${escapeHtml(sub.id)}" data-mat="${escapeHtml(m.id)}" class="${btnGhost}" title="تعديل"><i class="fa-solid fa-pen"></i></button>
        <button data-action="del-material" data-sub="${escapeHtml(sub.id)}" data-mat="${escapeHtml(m.id)}" class="${btnDanger}" title="حذف"><i class="fa-solid fa-trash-can"></i></button>
      </div>`;
  }

  function renderMaterials() {
    const subjects = Store.listSubjects();
    const wrap = $('#subjectsWrap');
    if (!subjects.length) {
      wrap.innerHTML = `
        <div class="glass rounded-3xl border-dashed border-white/20 p-10 text-center">
          <i class="fa-solid fa-folder-open text-4xl text-slate-500"></i>
          <p class="mt-4 font-extrabold text-lg">لا توجد مواد بعد</p>
          <p class="mt-1 text-sm text-slate-400">ابدأ بإضافة مادة ثم ارفع روابط ملخصاتها ومحاضراتها.</p>
          <button id="emptyAddSubject" class="mt-5 px-5 py-2.5 rounded-xl text-sm font-extrabold text-white bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 hover:opacity-90 transition"><i class="fa-solid fa-plus ml-1"></i>إضافة أول مادة</button>
        </div>`;
      const b = $('#emptyAddSubject');
      if (b) b.addEventListener('click', () => openSubjectModal(null));
      return;
    }
    wrap.innerHTML = subjects.map((sub) => {
      const mats = sub.materials || [];
      return `
      <div class="glass rounded-3xl overflow-hidden" data-sub="${escapeHtml(sub.id)}">
        <div class="p-5 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-xl shrink-0">${subjectEmoji(sub.name)}</span>
            <div class="min-w-0">
              <h3 class="font-black text-white text-lg leading-tight truncate">${escapeHtml(sub.name)}</h3>
              <p class="text-xs text-slate-400 font-bold mt-1 flex items-center gap-2 flex-wrap">
                ${sub.code ? `<span class="bg-white/10 border border-white/10 rounded-md px-1.5 py-0.5" dir="ltr">${escapeHtml(sub.code)}</span>` : ''}
                ${sub.semester ? `<span><i class="fa-regular fa-calendar text-brand-violet"></i> ${escapeHtml(sub.semester)}</span>` : ''}
                <span class="text-brand-sky">${mats.length} ملف</span>
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button data-action="add-material" data-sub="${escapeHtml(sub.id)}" class="px-3.5 py-2 rounded-lg text-xs font-extrabold text-white bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 hover:opacity-90 transition"><i class="fa-brands fa-google-drive ml-1"></i>إضافة ملف</button>
            <button data-action="edit-subject" data-sub="${escapeHtml(sub.id)}" class="${btnGhost}"><i class="fa-solid fa-pen ml-1"></i>تعديل المادة</button>
            <button data-action="del-subject" data-sub="${escapeHtml(sub.id)}" class="${btnDanger}"><i class="fa-solid fa-trash-can ml-1"></i>حذف</button>
          </div>
        </div>
        <div class="px-5 pb-5">
          ${mats.length ? mats.map((m) => materialRowAdmin(sub, m)).join('') : '<p class="py-4 text-sm text-slate-500 font-bold border-t border-white/5">لا ملفات بعد — اضغط «إضافة ملف» لرفع رابط Drive.</p>'}
        </div>
      </div>`;
    }).join('');
  }

  function openSubjectModal(sub) {
    const isNew = !sub;
    const s = sub || { name: '', code: '', semester: '', note: '' };
    const m = UI.openModal(`
      <form id="subjectForm" class="p-6 flex flex-col gap-4">
        <h3 class="text-lg font-black text-white">${isNew ? '<i class="fa-solid fa-plus text-brand-violet ml-1"></i>إضافة مادة جديدة' : '<i class="fa-solid fa-pen text-brand-violet ml-1"></i>تعديل المادة'}</h3>
        <div>
          <label for="sbName" class="block text-xs font-extrabold text-slate-300 mb-2">اسم المادة *</label>
          <input id="sbName" type="text" class="input-dark" placeholder="مثال: هياكل بيانات" value="${escapeHtml(s.name)}" required />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="sbCode" class="block text-xs font-extrabold text-slate-300 mb-2">كود المادة</label>
            <input id="sbCode" type="text" class="input-dark" placeholder="CS202" dir="ltr" value="${escapeHtml(s.code)}" />
          </div>
          <div>
            <label for="sbSemester" class="block text-xs font-extrabold text-slate-300 mb-2">الفصل الدراسي</label>
            <input id="sbSemester" type="text" class="input-dark" placeholder="الفصل الأول" value="${escapeHtml(s.semester)}" />
          </div>
        </div>
        <div>
          <label for="sbNote" class="block text-xs font-extrabold text-slate-300 mb-2">ملاحظة للطلاب (اختياري)</label>
          <input id="sbNote" type="text" class="input-dark" placeholder="مثال: ركز على الأشجار والرسوم البيانية" value="${escapeHtml(s.note)}" />
        </div>
        <div class="flex gap-3 mt-2">
          <button type="button" data-close class="flex-1 py-3 rounded-xl font-extrabold text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition">إلغاء</button>
          <button type="submit" class="flex-1 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 hover:opacity-90 transition">${isNew ? 'إضافة المادة' : 'حفظ التعديلات'}</button>
        </div>
      </form>`);

    m.card.querySelector('#subjectForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        name: m.card.querySelector('#sbName').value.trim(),
        code: m.card.querySelector('#sbCode').value.trim(),
        semester: m.card.querySelector('#sbSemester').value.trim(),
        note: m.card.querySelector('#sbNote').value.trim()
      };
      if (!data.name) { UI.toast('اكتب اسم المادة', 'warning'); return; }
      if (isNew) { Store.addSubject(data); UI.toast('تمت إضافة المادة — أضف الآن ملفاتها 📚', 'success'); }
      else { Store.updateSubject(sub.id, data); UI.toast('تم حفظ تعديلات المادة ✅', 'success'); }
      m.close();
    });
  }

  function openMaterialModal(subId, mat) {
    const isNew = !mat;
    const subjects = Store.listSubjects();
    if (!subjects.length) { UI.toast('أضف مادة أولاً ثم ارفع ملفاتها', 'warning'); return; }
    const types = ['محاضرة', 'سكشن', 'ملخص', 'مذكرة', 'عملي', 'أسئلة'];
    const m0 = mat || { title: '', type: 'محاضرة', url: '' };

    const m = UI.openModal(`
      <form id="materialForm" class="p-6 flex flex-col gap-4">
        <h3 class="text-lg font-black text-white">${isNew ? '<i class="fa-brands fa-google-drive text-brand-sky ml-1"></i>إضافة ملف جديد' : '<i class="fa-solid fa-pen text-brand-sky ml-1"></i>تعديل الملف'}</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="mtSubject" class="block text-xs font-extrabold text-slate-300 mb-2">المادة *</label>
            <select id="mtSubject" class="input-dark">${subjects.map((s) => `<option value="${escapeHtml(s.id)}" ${s.id === subId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select>
          </div>
          <div>
            <label for="mtType" class="block text-xs font-extrabold text-slate-300 mb-2">النوع *</label>
            <select id="mtType" class="input-dark">${types.map((t) => `<option ${t === m0.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
          </div>
        </div>
        <div>
          <label for="mtTitle" class="block text-xs font-extrabold text-slate-300 mb-2">عنوان الملف *</label>
          <input id="mtTitle" type="text" class="input-dark" placeholder="مثال: محاضرة 3 — الأشجار الثنائية" value="${escapeHtml(m0.title)}" required />
        </div>
        <div>
          <label for="mtUrl" class="block text-xs font-extrabold text-slate-300 mb-2">رابط Google Drive *</label>
          <input id="mtUrl" type="url" class="input-dark" dir="ltr" placeholder="https://drive.google.com/drive/folders/..." value="${escapeHtml(m0.url)}" required />
          <p class="text-[11px] text-slate-500 font-bold mt-1.5"><i class="fa-solid fa-circle-info ml-1"></i>شغّل مشاركة الرابط على «أي شخص لديه الرابط» ليفتحه الطلاب.</p>
        </div>
        <div class="flex gap-3 mt-2">
          <button type="button" data-close class="flex-1 py-3 rounded-xl font-extrabold text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition">إلغاء</button>
          <button type="submit" class="flex-1 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 hover:opacity-90 transition">${isNew ? 'إضافة الملف' : 'حفظ التعديلات'}</button>
        </div>
      </form>`);

    m.card.querySelector('#materialForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        subjectId: m.card.querySelector('#mtSubject').value,
        title: m.card.querySelector('#mtTitle').value.trim(),
        type: m.card.querySelector('#mtType').value,
        url: m.card.querySelector('#mtUrl').value.trim()
      };
      if (!data.title || !isValidUrl(data.url)) {
        UI.toast('تأكد من عنوان الملف ورابط Drive الصحيح (https://...)', 'error');
        UI.shake(m.card.querySelector('#materialForm'));
        return;
      }
      if (isNew) { Store.addMaterial(data.subjectId, data); UI.toast('تمت إضافة الملف — ظاهر الآن للطلاب في البنك ✅', 'success'); }
      else {
        const { subjectId, ...patch } = data;
        Store.updateMaterial(subId, mat.id, patch);
        UI.toast('تم حفظ تعديلات الملف ✅', 'success');
      }
      m.close();
    });
  }

  /* =========================================================
     الإعلانات
     ========================================================= */
  function renderBroadcast() {
    const anns = Store.listAnnouncements();
    const wrap = $('#annList');
    wrap.innerHTML = anns.length ? anns.map((a) => {
      const st = ANN_STYLE[a.type] || ANN_STYLE.info;
      return `
      <div class="glass rounded-2xl p-4 flex flex-wrap items-center gap-3" data-ann="${escapeHtml(a.id)}">
        <span class="inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 rounded-lg border shrink-0 ${st.chip}"><i class="fa-solid ${st.icon}"></i>${st.label}</span>
        <p class="flex-1 min-w-[220px] text-sm font-bold text-white leading-relaxed">${escapeHtml(a.text)}</p>
        <span class="text-xs text-slate-500 font-bold shrink-0">${timeAgo(a.createdAt)}</span>
        <button data-action="toggle-ann" data-ann="${escapeHtml(a.id)}" class="px-3 py-2 rounded-lg text-xs font-extrabold transition ${a.active ? 'text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 hover:bg-emerald-400/20' : 'text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10'}" title="${a.active ? 'مظاهر للطلاب — اضغط للإيقاف' : 'موقوف — اضغط للإظهار'}">
          <i class="fa-solid ${a.active ? 'fa-toggle-on' : 'fa-toggle-off'} ml-1"></i>${a.active ? 'شغّال' : 'موقوف'}
        </button>
        <button data-action="edit-ann" data-ann="${escapeHtml(a.id)}" class="${btnGhost}" title="تعديل"><i class="fa-solid fa-pen"></i></button>
        <button data-action="del-ann" data-ann="${escapeHtml(a.id)}" class="${btnDanger}" title="حذف"><i class="fa-solid fa-trash-can"></i></button>
      </div>`;
    }).join('')
      : `<div class="glass rounded-3xl border-dashed border-white/20 p-10 text-center">
          <i class="fa-solid fa-bullhorn text-4xl text-slate-500"></i>
          <p class="mt-4 font-extrabold text-lg">لا إعلانات منشورة</p>
          <p class="mt-1 text-sm text-slate-400">اكتب أول إعلان في النموذج أعلاه — سيظهر فوراً في شريط واجهة الطلاب.</p>
        </div>`;
  }

  function openAnnModal(a) {
    const m = UI.openModal(`
      <form id="annEditForm" class="p-6 flex flex-col gap-4">
        <h3 class="text-lg font-black text-white"><i class="fa-solid fa-pen text-brand-pink ml-1"></i>تعديل الإعلان</h3>
        <div>
          <label for="eaText" class="block text-xs font-extrabold text-slate-300 mb-2">النص</label>
          <textarea id="eaText" rows="3" class="input-dark resize-none" required>${escapeHtml(a.text)}</textarea>
        </div>
        <div>
          <label for="eaType" class="block text-xs font-extrabold text-slate-300 mb-2">النوع</label>
          <select id="eaType" class="input-dark">
            <option value="info" ${a.type === 'info' ? 'selected' : ''}>معلومة عامة</option>
            <option value="urgent" ${a.type === 'urgent' ? 'selected' : ''}>عاجل 🔴</option>
            <option value="exam" ${a.type === 'exam' ? 'selected' : ''}>امتحان / مراجعة</option>
          </select>
        </div>
        <div class="flex gap-3 mt-2">
          <button type="button" data-close class="flex-1 py-3 rounded-xl font-extrabold text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition">إلغاء</button>
          <button type="submit" class="flex-1 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 hover:opacity-90 transition">حفظ التعديلات</button>
        </div>
      </form>`);
    m.card.querySelector('#annEditForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = m.card.querySelector('#eaText').value.trim();
      if (!text) { UI.toast('اكتب نص الإعلان', 'warning'); return; }
      Store.updateAnnouncement(a.id, { text, type: m.card.querySelector('#eaType').value });
      m.close();
      UI.toast('تم تحديث الإعلان — الشريط اتحدث فوراً ✅', 'success');
    });
  }

  /* =========================================================
     الإعدادات
     ========================================================= */
  function fillSettings() {
    const s = Store.getSettings();
    $('#setWhats').value = s.whatsapp || '';
    $('#setEmail').value = s.adminEmail || '';
    $('#setPass1').value = '';
    $('#setPass2').value = '';
    $('#setCode').value = '';
  }

  $('#settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const rawWa = $('#setWhats').value.trim();
    const patch = {};
    // سيب خانة الواتساب فاضية = إخفاء زر الواتساب من الموقع كله
    if (rawWa) {
      const isUrl = /^https?:\/\//i.test(rawWa);
      const digits = rawWa.replace(/\D/g, '');
      if (!isUrl && digits.length < 10) {
        UI.toast('أدخل رابط مجتمع واتساب صحيح أو رقم واتساب بالصيغة الدولية (مثال: 201234567890) — أو سيبه فاضي لإخفاء الزر', 'error');
        UI.shake($('#setWhats'));
        return;
      }
      patch.whatsapp = isUrl ? rawWa : digits;
    } else {
      patch.whatsapp = '';
    }
    const email = $('#setEmail').value.trim();
    if (email) patch.adminEmail = email;

    const p1 = $('#setPass1').value, p2 = $('#setPass2').value;
    if (p1 || p2) {
      if (p1.length < 6) { UI.toast('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error'); UI.shake($('#setPass1')); return; }
      if (p1 !== p2) { UI.toast('كلمتا المرور غير متطابقتين', 'error'); UI.shake($('#setPass2')); return; }
      patch.passHash = hashStr(p1);
    }
    const code = $('#setCode').value.trim();
    if (code) {
      if (code.length < 4) { UI.toast('كود التيم قصير جداً — 4 أحرف على الأقل', 'error'); UI.shake($('#setCode')); return; }
      patch.teamCodeHash = hashStr(code);
    }
    Store.updateSettings(patch);
    fillSettings();
    UI.toast('تم حفظ الإعدادات — زر الواتساب وبيانات الدخول اتحدثوا ✅', 'success');
  });

  $('#btnExport').addEventListener('click', () => {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sadeem-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('تم تنزيل النسخة الاحتياطية ✅', 'success');
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(String(reader.result));
        UI.toast('تم استيراد البيانات بنجاح ✅', 'success', 'استيراد مكتمل');
      } catch (err) {
        UI.toast('الملف غير صالح: ' + err.message, 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  $('#btnReset').addEventListener('click', async () => {
    const ok = await UI.confirmDialog({ title: 'استعادة البيانات الافتراضية؟', message: 'سيتم حذف كل تعديلاتك (المواد، الأسئلة، الإعلانات، الإعدادات) واستعادة البيانات التجريبية الأصلية.', okText: 'استعادة', danger: true });
    if (!ok) return;
    Store.resetToSeed();
    UI.toast('تمت استعادة البيانات الافتراضية ✅', 'success');
  });

  /* =========================================================
     معالج الأحداث الموحد (تفويض)
     ========================================================= */
  panelView.addEventListener('click', async (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) { setSection(goto.dataset.goto); return; }

    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    /* --- أسئلة --- */
    if (action === 'approve') {
      const q = Store.listQuestions().find((x) => x.id === el.dataset.qid);
      if (q) openApproveModal(q);
    }
    if (action === 'dismiss') {
      Store.dismissQuestion(el.dataset.qid);
      UI.toast('تم تجاهل السؤال (يمكن العودة له من فلتر «متجاهلة»)', 'info');
    }
    if (action === 'toggle-featured') {
      const q = Store.listQuestions().find((x) => x.id === el.dataset.qid);
      if (q && q.faqId) {
        const faqs = Store.listFaqs();
        const faq = faqs.find((f) => f.id === q.faqId);
        const now = !(faq && faq.featured);
        Store.setQuestionFeatured(q.id, now);
        UI.toast(now
          ? 'الرد اتثبت في الصفحة الرئيسية وهيشوفه كل الطلاب 📌'
          : 'تم إلغاء التثبيت — الرد هيفضل موجود في الأسئلة الشائعة بس', 'info');
      }
    }
    if (action === 'del-question') {
      const ok = await UI.confirmDialog({ title: 'حذف السؤال؟', message: 'سيتم حذف السؤال نهائياً من النظام.', okText: 'حذف', danger: true });
      if (ok) { Store.deleteQuestion(el.dataset.qid); UI.toast('تم حذف السؤال', 'success'); }
    }

    /* --- مواد وملفات --- */
    if (action === 'add-subject') openSubjectModal(null);
    if (action === 'edit-subject') {
      const sub = Store.listSubjects().find((s) => s.id === el.dataset.sub);
      if (sub) openSubjectModal(sub);
    }
    if (action === 'del-subject') {
      const sub = Store.listSubjects().find((s) => s.id === el.dataset.sub);
      if (!sub) return;
      const ok = await UI.confirmDialog({ title: `حذف مادة «${sub.name}»؟`, message: 'سيتم حذف المادة وكل ملفاتها نهائياً.', okText: 'حذف', danger: true });
      if (ok) { Store.deleteSubject(sub.id); UI.toast('تم حذف المادة وملفاتها', 'success'); }
    }
    if (action === 'add-material') openMaterialModal(el.dataset.sub, null);
    if (action === 'edit-material') {
      const sub = Store.listSubjects().find((s) => s.id === el.dataset.sub);
      const mat = sub && (sub.materials || []).find((x) => x.id === el.dataset.mat);
      if (sub && mat) openMaterialModal(sub.id, mat);
    }
    if (action === 'del-material') {
      const ok = await UI.confirmDialog({ title: 'حذف الملف؟', message: 'سيتم إزالة الملف من بنك الملخصات نهائياً.', okText: 'حذف', danger: true });
      if (ok) { Store.deleteMaterial(el.dataset.sub, el.dataset.mat); UI.toast('تم حذف الملف', 'success'); }
    }

    /* --- إعلانات --- */
    if (action === 'toggle-ann') {
      const a = Store.listAnnouncements().find((x) => x.id === el.dataset.ann);
      if (a) {
        Store.updateAnnouncement(a.id, { active: !a.active });
        UI.toast(a.active ? 'تم إيقاف ظهور الإعلان عن الطلاب' : 'الإعلان ظاهر للطلاب الآن 📢', 'info');
      }
    }
    if (action === 'edit-ann') {
      const a = Store.listAnnouncements().find((x) => x.id === el.dataset.ann);
      if (a) openAnnModal(a);
    }
    if (action === 'del-ann') {
      const ok = await UI.confirmDialog({ title: 'حذف الإعلان؟', message: 'سيتم حذف الإعلان نهائياً من شريط الطلاب.', okText: 'حذف', danger: true });
      if (ok) { Store.deleteAnnouncement(el.dataset.ann); UI.toast('تم حذف الإعلان', 'success'); }
    }
  });

  $('#btnAddSubject').addEventListener('click', () => openSubjectModal(null));
  $('#btnAddMaterial').addEventListener('click', () => {
    const subjects = Store.listSubjects();
    openMaterialModal(subjects.length ? subjects[0].id : null, null);
  });

  /* نموذج الإعلان */
  $('#annForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('#annText').value.trim();
    if (!text) { UI.toast('اكتب نص الإعلان أولاً', 'warning'); return; }
    Store.addAnnouncement({ text, type: $('#annType').value, active: true });
    $('#annText').value = '';
    UI.toast('الإعلان ظاهر الآن في الشريط المتحرك أعلى واجهة الطلاب 📢', 'success', 'تم النشر الفوري');
  });

  /* =========================================================
     التشغيل
     ========================================================= */
  function showPanel() {
    loginView.classList.add('hidden');
    panelView.classList.remove('hidden');
    renderSyncBadge();
    renderBadges();
    setSection('overview');
  }
  function showLogin() {
    panelView.classList.add('hidden');
    loginView.classList.remove('hidden');
    if (getLockUntil()) startLockTimer();
  }

  if (isAuthed()) showPanel(); else showLogin();

  let changeTimer = null;
  document.addEventListener('sadeem:change', () => {
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      renderSyncBadge();
      renderBadges();
      if (isAuthed()) renderSection(state.sec);
    }, 120);
  });

  /* تحديث فوري عند التعديل من تبويب آخر (الوضع المحلي) */
  window.addEventListener('storage', (e) => {
    if (e.key === SADEEM_CONFIG.storageKeys.db) Store.refreshFromLocal();
  });
})();
