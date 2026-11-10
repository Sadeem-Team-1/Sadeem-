/* =========================================================
   بوت سديم 🤖 — ويدجت المحادثة الذكية (محلي بالكامل)
   يجيب من: الأسئلة الشائعة + بنك المواد والملخصات + الإعلانات
   وعند سؤال جديد كلياً: يولّد إجابة مساعدة + يرفع السؤال للفريق
   ========================================================= */
(function () {
  'use strict';

  const esc = (s) => (window.escapeHtml ? escapeHtml(String(s)) : String(s));
  const norm = (s) => (window.normalizeAr ? normalizeAr(String(s || '')) : String(s || '').toLowerCase());

  /* ---------- محرك الإجابات ---------- */
  function listFaqs() { try { return Store.listFaqs() || []; } catch (e) { return []; } }
  function listSubjects() { try { return Store.listSubjects() || []; } catch (e) { return []; } }
  function listAnnouncements() {
    try { return (Store.listAnnouncements() || []).filter((a) => a.active); } catch (e) { return []; }
  }

  function scoreFaq(query, faq) {
    const qn = norm(query);
    const fq = norm(faq.q);
    let hits = 0;
    if (fq.includes(qn) || qn.includes(fq)) hits += 5;
    const targets = norm([faq.q, (faq.tags || []).join(' ')].join(' '));
    for (const t of qn.split(' ')) {
      if (t.length > 1 && targets.includes(t)) hits += 2;
    }
    return hits;
  }

  function bestFaq(query) {
    let best = null, bestScore = 0;
    for (const f of listFaqs()) {
      const s = scoreFaq(query, f);
      if (s > bestScore) { bestScore = s; best = f; }
    }
    return bestScore >= 4 ? best : null;
  }

  function searchMaterials(query) {
    const qn = norm(query);
    const results = [];
    for (const s of listSubjects()) {
      const words = norm(s.name).split(' ').filter((w) => w.length > 2);
      const subjectMatch = words.some((w) => qn.includes(w));
      for (const m of (s.materials || [])) {
        const mn = norm(m.title);
        const mTokens = mn.split(' ').filter((w) => w.length > 1);
        const tokenHits = mTokens.filter((w) => qn.includes(w)).length;
        const fullMatch = mTokens.length && mTokens.every((w) => qn.includes(w)) ? 3 : 0;
        if (tokenHits >= 2 || (subjectMatch && tokenHits >= 1)) {
          results.push({ s, m, score: tokenHits + fullMatch + (subjectMatch ? 2 : 0) });
        }
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 4);
  }

  const INTENTS = {
    greeting: /سلام|هلا|اهلا|أهلا|ازيك|إزيك|مرحبا|هاي|صباح الخير|مساء الخير/,
    thanks: /شكرا|شكرًا|تسلم|ربنا يخليك|ممتاز|جميل|تمام/,
    who: /مين انت|مين إنت|انت ايه|إنت إيه|انت مين|بتعمل ايه|بتعمل إيه|بوت|سديم بوت|ذكاء/,
    announcements: /امتحان|امتحانات|مراجعة|مراجعات|موعد|مواعيد|إعلان|اعلان|جدول|خبر|عاجل/,
    study: /ازاي اذاكر|إزاي أذاكر|ازاي أذاكر|مذاكرة|تنظيم وقت|نصايح|نصائح|ادرس|أدرس|مذاكره/,
    materials: /ملخص|محاضرة|محاضره|سكشن|سكرشن|مذكرة|مذكره|ملزمة|ملزمه|نظري|نظرى|عملي|عملى|شيت|فين|عايز|عاوز|اريد|أريد|ابحث|دور/
  };

  /* ---------- توليد الإجابات ---------- */
  function answerAnnouncements() {
    const anns = listAnnouncements();
    if (!anns.length) return 'مفيش إعلانات نشطة حالياً — أي خبر أو موعد امتحان هيظهر فوراً في الشريط المتحرك أعلى الموقع 🔴';
    return '<b>آخر الإعلانات:</b><br>' + anns.slice(0, 3).map((a) => `• ${esc(a.text)}`).join('<br>');
  }

  function answerMaterials(query) {
    const hits = searchMaterials(query);
    if (!hits.length) return null;
    const items = hits.map(({ s, m }) =>
      `<a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer" class="underline decoration-dotted text-brand-sky font-bold">${esc(m.title)}</a> <span class="text-[10px] text-slate-400">(${esc(s.name)} — ${esc(m.type)})</span>`
    ).join('<br>');
    return `<b>لقيتلك دول في بنك الملخصات:</b><br>${items}<br><span class="text-xs text-slate-400">تقدر كمان تدور بنفسك من شريط البحث فوق 🔍</span>`;
  }

  function answerStudy() {
    return 'نصائح سريعة للمذاكرة 📚<br>1️⃣ رتب المواد من الأصعب للأسهل وابدأ بالأصعب.<br>2️⃣ قسّم كل مادة لفصول صغيرة وذاكر بنظام بومودورو (25 دقيقة تركيز + 5 راحة).<br>3️⃣ حل أسئلة وفورمات السنين السابقة بعد كل فصل.<br>4️⃣ نزّل ملخصات كل المواد من «بنك الملخصات» فوق 👆';
  }

  function answerWho() {
    return 'أنا <b>سديم بوت 🤖</b> مساعدك الذكي في منصة تيم سديم! بقدر أساعدك في:<br>• البحث عن أي ملخص أو محاضرة أو سكشن<br>• الإجابة على أسئلتك الشائعة<br>• نصائح المذاكرة وتنظيم الوقت<br>• ولو سؤالك جديد كلياً هرفعه لفريق سديم وهيجاوبوك عليه 💙';
  }

  /* الإجابة الاحتياطية + رفع السؤال للفريق */
  function generate(query) {
    const hits = searchMaterials(query);
    let msg;
    if (hits.length) {
      msg = 'مش متأكد إن ده بالضبط اللي بتدور عليه، بس جرب دول 👇<br>' +
        hits.map(({ s, m }) => `<a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer" class="underline decoration-dotted text-brand-sky font-bold">${esc(m.title)}</a> <span class="text-[10px] text-slate-400">(${esc(s.name)})</span>`).join('<br>');
    } else {
      msg = 'سؤال حلو 💙 بس مش عندي إجابة جاهزة ليه دلوقتي.<br>جرب كده:<br>• ابحث في «بنك الملخصات» فوق — فيه كل المواد والملخصات<br>• اكتب اسم المادة مع سؤالك (مثال: فين ملخص مادة الميكرو؟)<br>• أو بص على الأسئلة الشائعة تحت 👇';
    }
    try {
      Store.addQuestion({ question: query, botAnswer: 'سؤال جديد من طالب عبر بوت سديم — يحتاج إجابة من الفريق.' });
      if (Store.addMyQuestion) Store.addMyQuestion(query); // لتصله إشعار بالرد على الجهاز ده
    } catch (e) { /* تجاهل */ }
    return msg + '<br><span class="text-xs text-emerald-300 font-bold">✅ سجّلت سؤالك لفريق سديم — هيتم الرد عليه وهيجيلك إشعار هنا أول ما يرد.</span>';
  }

  function answer(query) {
    const q = String(query || '').trim();
    if (!q) return 'اكتب سؤالك وأنا هساعدك 😊';
    if (INTENTS.greeting.test(q)) return 'أهلاً بيك في منصة تيم سديم 💙 إزاي أقدر أساعدك؟ اسألني عن أي ملخص أو مادة أو أي حاجة عن المنصة.';
    if (INTENTS.thanks.test(q)) return 'العفو 😄 بالتوفيق في مذاكرتك! لو محتاج أي حاجة تانية أنا موجود.';
    if (INTENTS.who.test(q)) return answerWho();
    if (INTENTS.study.test(q)) return answerStudy();
    if (INTENTS.announcements.test(q)) {
      const anns = listAnnouncements();
      if (anns.length) return answerAnnouncements();
      const faq = listFaqs().find((f) => norm(f.q).includes(norm('مواعيد الامتحانات')));
      if (faq) return faq.a;
    }
    if (INTENTS.materials.test(q)) {
      const m = answerMaterials(q);
      if (m) return m;
    }
    const faq = bestFaq(q);
    if (faq) return faq.a;
    if (INTENTS.materials.test(q) || q.includes('؟') || q.includes('?')) return generate(q);
    const faq2 = listFaqs().find((f) => scoreFaq(q, f) >= 3);
    return faq2 ? faq2.a : generate(q);
  }

  /* ---------- واجهة المحادثة ---------- */
  const K_CHAT = (window.SADEEM_CONFIG && SADEEM_CONFIG.storageKeys && SADEEM_CONFIG.storageKeys.chat) || 'sadeem_chat_v1';
  let root, panel, msgs, input, openState = false, welcomed = false;
  let history = [];

  function loadHistory() {
    try { history = JSON.parse(localStorage.getItem(K_CHAT)) || []; } catch (e) { history = []; }
    if (!Array.isArray(history)) history = [];
    history = history.slice(-40);
  }
  function saveHistory() {
    try { localStorage.setItem(K_CHAT, JSON.stringify(history.slice(-40))); } catch (e) { /* تجاهل */ }
  }

  function bubbleEl(role, html) {
    const wrap = document.createElement('div');
    if (role === 'user') {
      wrap.className = 'flex justify-end';
      wrap.innerHTML = `<div class="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-l from-sky-500/90 to-violet-600/90 text-white text-sm font-bold leading-relaxed px-4 py-2.5 shadow-lg">${html}</div>`;
    } else {
      wrap.className = 'flex gap-2 items-start';
      wrap.innerHTML = `
        <div class="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center text-sm shadow-lg">☁️</div>
        <div class="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[.07] border border-white/10 text-slate-200 text-sm leading-relaxed px-4 py-2.5">
          <span class="bot-text">${html}</span>
        </div>`;
    }
    return wrap;
  }

  function addMsg(role, html, { silent = false } = {}) {
    if (!silent) {
      history.push({ role, html });
      saveHistory();
    }
    if (!msgs) return;
    msgs.appendChild(bubbleEl(role, html));
    msgs.scrollTop = msgs.scrollHeight;
  }

  function typingOn() {
    const t = document.createElement('div');
    t.id = 'botTyping';
    t.className = 'flex gap-2 items-start';
    t.innerHTML = `
      <div class="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center text-sm">☁️</div>
      <div class="typing-dots flex items-center gap-1.5 bg-white/[.07] border border-white/10 rounded-2xl px-4 py-3">
        <span class="w-2 h-2 rounded-full bg-slate-400"></span><span class="w-2 h-2 rounded-full bg-slate-400"></span><span class="w-2 h-2 rounded-full bg-slate-400"></span>
      </div>`;
    msgs.appendChild(t);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function typingOff() { const t = document.getElementById('botTyping'); if (t) t.remove(); }

  /* إخراج تدريجي للنص */
  function botReply(html) {
    typingOn();
    setTimeout(() => {
      typingOff();
      const el = bubbleEl('bot', '');
      msgs.appendChild(el);
      const target = el.querySelector('.bot-text');
      const parts = String(html).split(/(<br>|<b>|<\/b>)/);
      let i = 0;
      (function step() {
        if (i >= parts.length) { msgs.scrollTop = msgs.scrollHeight; return; }
        target.innerHTML += parts[i++];
        msgs.scrollTop = msgs.scrollHeight;
        setTimeout(step, 28);
      })();
      history.push({ role: 'bot', html });
      saveHistory();
    }, 550 + Math.random() * 350);
  }

  function send() {
    const text = (input.value || '').trim();
    if (!text) return;
    addMsg('user', esc(text));
    input.value = '';
    botReply(answer(text));
  }

  const QUICK = ['فين الملخصات؟', 'إزاي أذاكر صح؟', 'مواعيد الامتحانات فين؟', 'مين إنت؟'];

  function buildPanel() {
    panel = document.createElement('div');
    panel.id = 'botPanel';
    panel.className = 'hidden fixed bottom-24 right-4 sm:right-6 z-[70] w-[calc(100vw-2rem)] max-w-sm h-[500px] max-h-[72vh] glass-strong rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10';
    panel.innerHTML = `
      <div class="p-4 bg-gradient-to-l from-sky-500/20 via-fuchsia-500/15 to-violet-600/20 border-b border-white/10 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center text-lg shadow-lg">☁️</div>
        <div class="flex-1">
          <p class="font-black text-white text-sm">سديم بوت</p>
          <p class="text-[10px] font-bold text-emerald-300 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>متصل الآن — يجيب فوراً</p>
        </div>
        <button id="botClose" aria-label="إغلاق المحادثة" class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-300"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div id="botMsgs" class="flex-1 overflow-y-auto nice-scroll p-4 flex flex-col gap-3"></div>
      <div id="botQuick" class="px-3 pb-2 flex flex-wrap gap-1.5"></div>
      <div class="p-3 border-t border-white/10 flex items-center gap-2">
        <input id="botInput" type="text" class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 font-bold outline-none focus:border-fuchsia-400/50" placeholder="اكتب سؤالك هنا..." />
        <button id="botSend" aria-label="إرسال" class="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-sky-400 via-fuchsia-500 to-violet-600 text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition"><i class="fa-solid fa-paper-plane"></i></button>
      </div>`;

    const bubble = document.createElement('button');
    bubble.id = 'botBubble';
    bubble.setAttribute('aria-label', 'افتح محادثة بوت سديم');
    bubble.className = 'float-btn pulse-ring fixed bottom-5 right-4 sm:right-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 via-fuchsia-500 to-violet-600 text-white flex items-center justify-center text-xl shadow-2xl shadow-fuchsia-600/40';
    bubble.innerHTML = '<i class="fa-solid fa-robot"></i>';

    root.innerHTML = '';
    root.appendChild(panel);
    root.appendChild(bubble);

    msgs = panel.querySelector('#botMsgs');
    input = panel.querySelector('#botInput');

    const quick = panel.querySelector('#botQuick');
    quick.innerHTML = QUICK.map((q) => `<button class="quick-chip text-[11px] font-extrabold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition">${esc(q)}</button>`).join('');
    quick.addEventListener('click', (e) => {
      const b = e.target.closest('.quick-chip');
      if (!b) return;
      addMsg('user', esc(b.textContent));
      botReply(answer(b.textContent));
    });

    bubble.addEventListener('click', () => (openState ? close() : open()));
    panel.querySelector('#botClose').addEventListener('click', close);
    panel.querySelector('#botSend').addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openState) close(); });
  }

  function open() {
    if (!panel) return;
    panel.classList.remove('hidden');
    openState = true;
    if (!welcomed) {
      addMsg('bot', 'أهلاً بيك في منصة تيم سديم 💙<br>أنا <b>سديم بوت</b> — اسألني عن أي ملخص أو محاضرة أو أي حاجة عن المنصة، ولو سؤالك جديد هرفعه للفريق وهيجاوبوك.', { silent: true });
      welcomed = true;
    } else {
      history.forEach(({ role, html }) => msgs.appendChild(bubbleEl(role, html)));
      msgs.scrollTop = msgs.scrollHeight;
    }
    setTimeout(() => input && input.focus(), 120);
  }

  function close() {
    if (!panel) return;
    panel.classList.add('hidden');
    openState = false;
  }

  function mount() {
    root = document.getElementById('botRoot');
    if (!root) root = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'botRoot' }));
    loadHistory();
    buildPanel();
    console.log('%cسديم بوت 🤖', 'font-weight:bold', 'جاهز');
  }

  window.ChatWidget = { mount, open, close };
})();
