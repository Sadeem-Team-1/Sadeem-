/* =========================================================
   أدوات واجهة مشتركة — إشعارات Toast + نوافذ منبثقة Modal + تأكيد
   ========================================================= */

const UI = (() => {
  /* ---------- إشعارات فورية ---------- */
  function ensureToastRoot() {
    let root = document.getElementById('toastRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toastRoot';
      root.className = 'fixed top-24 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 w-[min(94vw,420px)]';
      document.body.appendChild(root);
    }
    return root;
  }

  const TOAST_STYLE = {
    success: { icon: 'fa-circle-check', ring: 'border-emerald-400/40', iconColor: 'text-emerald-400' },
    info:    { icon: 'fa-circle-info',  ring: 'border-sky-400/40',     iconColor: 'text-sky-400' },
    warning: { icon: 'fa-triangle-exclamation', ring: 'border-amber-400/40', iconColor: 'text-amber-400' },
    error:   { icon: 'fa-circle-xmark', ring: 'border-rose-400/40',    iconColor: 'text-rose-400' },
    chat:    { icon: 'fa-comment-dots', ring: 'border-violet-400/40',  iconColor: 'text-violet-300' }
  };

  function toast(message, type = 'success', title = '', duration = 4200) {
    const root = ensureToastRoot();
    const st = TOAST_STYLE[type] || TOAST_STYLE.success;

    const el = document.createElement('div');
    el.className = `toast-item glass-strong ${st.ring} rounded-2xl px-4 py-3 flex items-start gap-3 shadow-2xl w-full`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <i class="fa-solid ${st.icon} ${st.iconColor} text-lg mt-0.5"></i>
      <div class="flex-1 min-w-0">
        ${title ? `<p class="font-bold text-sm text-white">${escapeHtml(title)}</p>` : ''}
        <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(message)}</p>
      </div>
      <button class="text-slate-500 hover:text-white transition text-xs mt-1 shrink-0" aria-label="إغلاق التنبيه">
        <i class="fa-solid fa-xmark"></i>
      </button>`;

    const remove = () => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 320);
    };
    el.querySelector('button').addEventListener('click', remove);
    root.appendChild(el);
    setTimeout(remove, duration);
    return el;
  }

  /* ---------- نافذة منبثقة عامة ---------- */
  function openModal(innerHtml, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4';
    const card = document.createElement('div');
    card.className = 'modal-card glass-strong rounded-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto nice-scroll shadow-2xl';
    card.innerHTML = innerHtml;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function close() {
      overlay.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (options.onClose) options.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    $$('[data-close]', card).forEach((b) => b.addEventListener('click', close));

    return { overlay, card, close };
  }

  /* ---------- تأكيد (Promise) ---------- */
  function confirmDialog({ title = 'تأكيد', message = '', okText = 'تأكيد', danger = false }) {
    return new Promise((resolve) => {
      const m = openModal(`
        <div class="p-6 text-center">
          <div class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl ${danger ? 'bg-rose-500/15 text-rose-400' : 'bg-violet-500/15 text-violet-300'}">
            <i class="fa-solid ${danger ? 'fa-triangle-exclamation' : 'fa-circle-question'}"></i>
          </div>
          <h3 class="text-lg font-extrabold mt-4">${escapeHtml(title)}</h3>
          <p class="text-sm text-slate-400 mt-2 leading-relaxed">${escapeHtml(message)}</p>
          <div class="flex gap-3 mt-6">
            <button id="uiCancel" class="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition font-bold text-sm">إلغاء</button>
            <button id="uiOk" class="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition ${danger ? 'bg-rose-500 hover:bg-rose-400' : 'bg-gradient-to-l from-pink-500 via-fuchsia-500 to-sky-500 hover:opacity-90'}">${escapeHtml(okText)}</button>
          </div>
        </div>`);
      m.card.querySelector('#uiOk').addEventListener('click', () => { m.close(); resolve(true); });
      m.card.querySelector('#uiCancel').addEventListener('click', () => { m.close(); resolve(false); });
      m.overlay.addEventListener('mousedown', (e) => { if (e.target === m.overlay) resolve(false); });
    });
  }

  /* ---------- اهتزاز عنصر عند الخطأ ---------- */
  function shake(el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth; // إعادة تشغيل الأنيميشن
    el.classList.add('shake');
  }

  return { toast, openModal, confirmDialog, shake };
})();
