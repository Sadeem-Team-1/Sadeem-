/* =========================================================
   أدوات مساعدة عامة (تُستخدم في كل صفحات المنصة)
   ========================================================= */

/* اختصارات الوصول للعناصر */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* تجزئة نصية بسيطة للتحقق من بيانات دخول المشرفين (djb2) */
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 33) + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

/* تطبيع النص العربي للبحث والمطابقة الذكية */
function normalizeAr(s = '') {
  return String(s)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // إزالة التشكيل
    .replace(/[\u0640]/g, '')                            // إزالة التطويل
    .replace(/[؟?!,،؛:.«»"'()\[\]{}\-_~]+/g, ' ')        // إزالة علامات الترقيم
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/* حماية من حقن HTML عند عرض أي نص ديناميكي */
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* معرّف فريد */
function uid(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* تأخير تنفيذ (للبحث الفوري) */
function debounce(fn, wait = 220) {
  let t = null;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* وقت نسبي بالعربية */
function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'الآن';
  const m = Math.floor(s / 60);
  if (m < 60) return 'منذ ' + m + (m === 1 ? ' دقيقة' : ' دقائق');
  const h = Math.floor(m / 60);
  if (h < 24) return 'منذ ' + h + (h === 1 ? ' ساعة' : ' ساعات');
  const d = Math.floor(h / 24);
  if (d < 30) return 'منذ ' + d + (d === 1 ? ' يوم' : ' أيام');
  return new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* تاريخ كامل بالعربية */
function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* تحقق من صحة رابط https */
function isValidUrl(u = '') {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (e) { return false; }
}

/* قصّ نص طويل */
function truncate(s = '', n = 46) {
  const t = String(s).trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}
