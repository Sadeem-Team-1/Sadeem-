/* =========================================================
   طبقة البيانات الموحدة — Store
   تخزين محلي (localStorage) + مزامنة سحابية اختيارية (Firebase)
   كل التعديلات تمر من هنا وتُبث لكل الواجهات عبر حدث sadeem:change
   ========================================================= */
const Store = (() => {
  const K = SADEEM_CONFIG.storageKeys;
  let db = null;
  let mode = 'local';      // local | firebase
  let fbRoot = null;
  let applyingRemote = false;

  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- البذرة ---------- */
  function seedDb() {
    const d = clone(SADEEM_SEED);
    d.meta = { seedVersion: SADEEM_SEED.seedVersion, updatedAt: Date.now() };
    return d;
  }

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(K.db)); } catch (e) { return null; }
  }

  function persistLocalOnly() {
    try { localStorage.setItem(K.db, JSON.stringify(db)); } catch (e) { console.warn('تعذر الحفظ المحلي', e); }
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('sadeem:change', { detail: { mode } }));
  }

  /* ---------- حفظ + رفع سحابي ---------- */
  function persist() {
    if (!db) return;
    db.meta = Object.assign({}, db.meta || {}, { updatedAt: Date.now() });
    persistLocalOnly();

    if (mode === 'firebase' && fbRoot) {
      applyingRemote = true;
      fbRoot.set(db)
        .catch((err) => console.warn('تعذر الرفع السحابي', err))
        .finally(() => setTimeout(() => { applyingRemote = false; }, 400));
    }
    emit();
  }

  /* ---------- Firebase (اختياري — يعمل في الخلفية ولا يحجب تحميل الموقع) ---------- */
  function loadScript(src) {
    return new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error('مهلة تحميل ' + src)), 8000);
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { clearTimeout(timer); res(); };
      s.onerror = () => { clearTimeout(timer); rej(new Error('فشل تحميل ' + src)); };
      document.head.appendChild(s);
    });
  }

  function attachRemoteListener(root) {
    root.on('value', (s) => {
      if (applyingRemote || !s.exists()) return;
      const incoming = s.val();
      if (!incoming || !incoming.subjects) return;
      if (JSON.stringify(incoming) === JSON.stringify(db)) return;
      db = incoming;
      persistLocalOnly();
      emit();
    });
  }

  /* الاتصال بالسحابة: يجرب مرة واحدة بمهلة قصوى، ولو فشل يفضل الموقع محلياً */
  async function connectFirebase() {
    const cfg = (SADEEM_CONFIG.firebase && SADEEM_CONFIG.firebase.config) || {};
    if (!cfg.apiKey || !cfg.databaseURL) return;

    const withTimeout = (p, ms) => Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error('مهلة الاتصال بالسحابة انتهت')), ms))
    ]);

    try {
      await withTimeout(loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'), 8000);
      await withTimeout(loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'), 8000);

      firebase.initializeApp(cfg);
      const root = firebase.database().ref('sadeem');

      const snap = await withTimeout(root.get(), 8000);
      if (snap.exists() && snap.val() && snap.val().subjects) {
        db = snap.val();                 // السحابة هي المصدر — نحدث الكاش المحلي
        persistLocalOnly();
      } else {
        await withTimeout(root.set(db), 8000); // أول رفع للبيانات المحلية
      }

      fbRoot = root;                     // نجحت — نفعّل الرفع السحابي في persist()
      mode = 'firebase';
      attachRemoteListener(root);
      emit();                            // نحدث كل الواجهات الآن ببيانات السحابة
      console.log('%c☁️ تيم سديم', 'font-weight:bold', 'المزامنة السحابية نشطة');
    } catch (e) {
      mode = 'local';
      fbRoot = null;
      console.warn('Firebase غير متاح حالياً — الموقع يعمل بالتخزين المحلي ولن يتأثر أي شيء', e);
    }
  }

  /* ---------- التهيئة ---------- */
  /* آمنة للاستدعاء المتكرر: أول استدعاء يشغّل التهيئة فعلياً،
     والاستدعاءات التالية تعيد نفس النتيجة فوراً (مهم لنسخة الملف الواحد) */
  let initPromise = null;
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      db = readLocal();
      if (!db || !Array.isArray(db.subjects)) {
        db = seedDb();
        persistLocalOnly();
        seedMyDemo();
      } else if (!db.meta || !(db.meta.seedVersion >= SADEEM_SEED.seedVersion)) {
        /* بيانات محلية من نسخة بذرة أقدم — تحديثها للنسخة الأحدث */
        db = seedDb();
        persistLocalOnly();
      }
      emit();

      /* المزامنة السحابية تبدأ في الخلفية — الموقع يعرض بياناته المحلية فوراً
         وأول ما السحابة توصل، الواجهات تتحدث تلقائياً عبر حدث sadeem:change */
      if (SADEEM_CONFIG.firebase && SADEEM_CONFIG.firebase.enabled) {
        connectFirebase();
      }

      return mode;
    })();
    return initPromise;
  }

  const getMode = () => mode;
  const getMeta = () => clone(db.meta || {});

  /* =========================================================
     المواد والمقررات
     ========================================================= */
  const listSubjects = () => clone(db.subjects || []);

  function addSubject({ name, code = '', semester = '', note = '' }) {
    const s = { id: uid('sub'), name: String(name).trim(), code, semester, note, materials: [] };
    db.subjects.push(s);
    persist();
    return s.id;
  }

  function updateSubject(id, patch) {
    const s = db.subjects.find((x) => x.id === id);
    if (!s) return false;
    ['name', 'code', 'semester', 'note'].forEach((k) => {
      if (patch[k] !== undefined) s[k] = patch[k];
    });
    persist();
    return true;
  }

  function deleteSubject(id) {
    db.subjects = db.subjects.filter((x) => x.id !== id);
    persist();
    return true;
  }

  /* =========================================================
     الملخصات والمحاضرات داخل كل مادة
     ========================================================= */
  function addMaterial(subId, { title, type, url }) {
    const s = db.subjects.find((x) => x.id === subId);
    if (!s) return null;
    const m = { id: uid('mat'), title: String(title).trim(), type, url, addedAt: Date.now() };
    s.materials = s.materials || [];
    s.materials.push(m);
    persist();
    return m;
  }

  function updateMaterial(subId, matId, patch) {
    const s = db.subjects.find((x) => x.id === subId);
    if (!s) return false;
    const m = (s.materials || []).find((x) => x.id === matId);
    if (!m) return false;
    ['title', 'type', 'url'].forEach((k) => { if (patch[k] !== undefined) m[k] = patch[k]; });
    persist();
    return true;
  }

  function deleteMaterial(subId, matId) {
    const s = db.subjects.find((x) => x.id === subId);
    if (!s) return false;
    s.materials = (s.materials || []).filter((x) => x.id !== matId);
    persist();
    return true;
  }

  /* =========================================================
     الأسئلة الشائعة FAQ
     ========================================================= */
  const listFaqs = () => clone(db.faqs || []);

  function addFaq({ q, a, tags = [] }) {
    const f = { id: uid('faq'), q: String(q).trim(), a: String(a).trim(), tags, source: 'admin', createdAt: Date.now() };
    db.faqs.unshift(f);
    persist();
    return f;
  }

  function updateFaq(id, patch) {
    const f = db.faqs.find((x) => x.id === id);
    if (!f) return false;
    ['q', 'a'].forEach((k) => { if (patch[k] !== undefined) f[k] = patch[k]; });
    if (patch.tags) f.tags = patch.tags;
    persist();
    return true;
  }

  function deleteFaq(id) {
    db.faqs = (db.faqs || []).filter((x) => x.id !== id);
    persist();
    return true;
  }

  /* =========================================================
     الأسئلة الواردة من الطلاب (عبر سديم بوت أو زر «اسأل سؤال»)
     ========================================================= */
  const listQuestions = () => clone(db.questions || []);

  /* تسجيل سؤال جديد مع دمج المتكرر تلقائياً */
  function addQuestion({ question, botAnswer }) {
    const norm = normalizeAr(question);
    const existing = (db.questions || []).find(
      (x) => x.status === 'pending' && normalizeAr(x.question) === norm
    );
    if (existing) {
      existing.askCount = (existing.askCount || 1) + 1;
      existing.lastAskedAt = Date.now();
      if (botAnswer && botAnswer.length > existing.botAnswer.length) existing.botAnswer = botAnswer;
      persist();
      return existing;
    }
    const item = {
      id: uid('q'),
      question: String(question).trim(),
      botAnswer: String(botAnswer || ''),
      status: 'pending',           // pending | approved | dismissed
      askCount: 1,
      createdAt: Date.now(),
      lastAskedAt: Date.now()
    };
    db.questions = db.questions || [];
    db.questions.unshift(item);
    persist();
    return item;
  }

  /* اعتماد الإجابة ونشرها في الأسئلة الشائعة (مع خيار التثبيت في الصفحة الرئيسية) */
  function approveQuestion(id, { answer, tags = [], featured = false }) {
    const q = (db.questions || []).find((x) => x.id === id);
    if (!q) return null;
    q.status = 'approved';
    q.finalAnswer = String(answer).trim();
    q.approvedAt = Date.now();
    const faq = {
      id: uid('faq'),
      q: q.question,
      a: q.finalAnswer,
      tags: tags.length ? tags : ['سؤال طالب'],
      source: 'admin',
      featured: !!featured,          // مثبتة في الصفحة الرئيسية لكل الطلاب؟
      createdAt: Date.now()
    };
    q.faqId = faq.id;                // لربط الرد بسؤال الطالب (الإشعارات)
    db.faqs = db.faqs || [];
    db.faqs.unshift(faq);
    persist();
    return faq;
  }

  /* تشغيل/إيقاف تثبيت رد معتمد في الصفحة الرئيسية لكل الطلاب */
  function setQuestionFeatured(questionId, featured) {
    const q = (db.questions || []).find((x) => x.id === questionId);
    if (!q || !q.faqId) return false;
    const f = (db.faqs || []).find((x) => x.id === q.faqId);
    if (!f) return false;
    f.featured = !!featured;
    persist();
    return true;
  }

  function dismissQuestion(id) {
    const q = (db.questions || []).find((x) => x.id === id);
    if (!q) return false;
    q.status = 'dismissed';
    persist();
    return true;
  }

  function deleteQuestion(id) {
    db.questions = (db.questions || []).filter((x) => x.id !== id);
    persist();
    return true;
  }

  /* =========================================================
     الإعلانات والتنبيهات العامة (Broadcast)
     ========================================================= */
  const listAnnouncements = () => clone(db.announcements || []);

  function addAnnouncement({ text, type = 'info', active = true }) {
    const a = { id: uid('ann'), text: String(text).trim(), type, active, createdAt: Date.now() };
    db.announcements = db.announcements || [];
    db.announcements.unshift(a);
    persist();
    return a;
  }

  function updateAnnouncement(id, patch) {
    const a = (db.announcements || []).find((x) => x.id === id);
    if (!a) return false;
    ['text', 'type', 'active'].forEach((k) => { if (patch[k] !== undefined) a[k] = patch[k]; });
    persist();
    return true;
  }

  function deleteAnnouncement(id) {
    db.announcements = (db.announcements || []).filter((x) => x.id !== id);
    persist();
    return true;
  }

  /* =========================================================
     أسئلتي على الجهاز (لإشعار الطالب عند رد الفريق)
     تُخزن في مفتاح منفصل — تفضل خاصة بالجهاز حتى مع المزامنة السحابية
     ========================================================= */
  const K_MY = 'sadeem_my_v1';

  function readMy() {
    try {
      const v = JSON.parse(localStorage.getItem(K_MY));
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function writeMy(list) {
    try { localStorage.setItem(K_MY, JSON.stringify(list.slice(-60))); } catch (e) { /* تجاهل */ }
  }

  /* الطالب سأل من الجهاز ده — سجّلها عندنا عشان نعرف نبلغه بالرد */
  function addMyQuestion(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    const list = readMy();
    const norm = normalizeAr(t);
    const existing = list.find((x) => normalizeAr(x.text) === norm);
    if (existing) { existing.askedAt = Date.now(); if (existing.repliedFaqId && !existing.seenAt) { existing.repliedFaqId = null; existing.repliedAt = null; } writeMy(list); return existing; }
    const item = { id: uid('myq'), text: t, askedAt: Date.now(), repliedFaqId: null, repliedAt: null, seenAt: null };
    list.push(item);
    writeMy(list);
    return item;
  }

  /* مطابقة أسئلة الطالب مع الردود المنشورة حديثاً */
  function matchMyReplies() {
    const list = readMy();
    const faqs = db.faqs || [];
    let changed = false;
    for (const item of list) {
      if (item.repliedFaqId) continue;
      const iTokens = normalizeAr(item.text).split(' ').filter((w) => w.length > 2);
      let best = null, bestScore = 0;
      for (const f of faqs) {
        if ((f.createdAt || 0) < (item.askedAt || 0) - 2000) continue; // رد لازم يكون بعد السؤال
        const fTokens = normalizeAr(f.q + ' ' + (f.tags || []).join(' ')).split(' ').filter((w) => w.length > 2);
        let hits = 0;
        for (const t of iTokens) { if (fTokens.includes(t)) hits++; }
        const score = iTokens.length ? hits / iTokens.length : 0;
        if (score > bestScore) { bestScore = score; best = f; }
      }
      if (best && bestScore >= 0.5) {
        item.repliedFaqId = best.id;
        item.repliedAt = best.createdAt || Date.now();
        changed = true;
      }
    }
    if (changed) writeMy(list);
    return list.filter((x) => x.repliedFaqId && !x.seenAt);
  }

  /* تحديد الإشعار كمقروء (بعد ما الطالب يشوف الرد أو يخفيه) */
  function markReplySeen(myqId) {
    const list = readMy();
    const item = list.find((x) => x.id === myqId);
    if (item) { item.seenAt = Date.now(); writeMy(list); }
  }

  /* بذرة عرض للتجربة: أول زيارة بس — عشان الطالب يشوف شكل الإشعار */
  function seedMyDemo() {
    if (localStorage.getItem(K_MY)) return;
    const faq = (SADEEM_SEED.faqs || []).find((f) => f.id === 'faq_5');
    if (!faq) return;
    writeMy([{
      id: 'myq_demo',
      text: 'إمتى مراجعة مادة الأراضي قبل الامتحان؟',
      askedAt: (faq.createdAt || Date.now()) - 86400000,
      repliedFaqId: faq.id,
      repliedAt: faq.createdAt || Date.now(),
      seenAt: null
    }]);
  }

  /* =========================================================
     الإعدادات
     ========================================================= */
  const getSettings = () => clone(db.settings || {});

  function updateSettings(patch) {
    db.settings = Object.assign({}, db.settings || {}, patch);
    persist();
    return true;
  }

  /* =========================================================
     إحصائيات + أدوات نسخ احتياطي
     ========================================================= */
  function stats() {
    const materials = (db.subjects || []).reduce((acc, s) => acc + (s.materials || []).length, 0);
    const questions = db.questions || [];
    return {
      subjects: (db.subjects || []).length,
      materials,
      faqs: (db.faqs || []).length,
      pending: questions.filter((q) => q.status === 'pending').length,
      approved: questions.filter((q) => q.status === 'approved').length,
      activeAnnouncements: (db.announcements || []).filter((a) => a.active).length
    };
  }

  function exportJSON() {
    return JSON.stringify(db, null, 2);
  }

  function importJSON(text) {
    const obj = JSON.parse(text); // قد يرمي خطأ يُلتقط في الواجهة
    if (!obj || !Array.isArray(obj.subjects)) throw new Error('الملف غير صالح: لا يحتوي على بيانات المواد');
    db = Object.assign(seedDb(), obj);
    persist();
    return true;
  }

  function resetToSeed() {
    db = seedDb();
    persist();
    return true;
  }

  /* تحديث الكاش من التخزين المحلي (عندما يعدّل مشرف في تبويب آخر) */
  function refreshFromLocal() {
    if (mode === 'firebase') return;
    const fresh = readLocal();
    if (fresh && fresh.subjects && JSON.stringify(fresh) !== JSON.stringify(db)) {
      db = fresh;
      emit();
    }
  }

  return {
    init, getMode, getMeta,
    listSubjects, addSubject, updateSubject, deleteSubject,
    addMaterial, updateMaterial, deleteMaterial,
    listFaqs, addFaq, updateFaq, deleteFaq,
    listQuestions, addQuestion, approveQuestion, dismissQuestion, deleteQuestion, setQuestionFeatured,
    addMyQuestion, matchMyReplies, markReplySeen,
    listAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement,
    getSettings, updateSettings,
    stats, exportJSON, importJSON, resetToSeed, refreshFromLocal
  };
})();
