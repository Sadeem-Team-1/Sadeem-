/* =========================================================
   إعدادات منصة تيم سديم العامة
   عدّل من هنا ما تحتاجه فقط، وإدارة كل شيء يومية تتم من لوحة التحكم
   ========================================================= */
const SADEEM_CONFIG = {
  brandName: 'تيم سديم',
  brandLatin: 'SADEEM TEAM',
  version: '1.0.0',

  // زر الواتساب اختياري — يظهر فقط لو المشرف حدّد رقم دولي (مثل 201234567890) أو رابط من: لوحة التحكم ← الإعدادات
  whatsappDefault: '201000000000',
  whatsappGreeting: 'أهلاً تيم سديم 👋 عندي استفسار بخصوص الملخصات والمحاضرات...',

  // بيانات دخول المشرفين الافتراضية (مُجزَّأة بأمان، الأصل مذكور في README):
  //   البريد: admin@sadeem.team   |   كلمة المرور: sadeem2026   |   كود التيم: SADEEM2026
  // كلها قابلة للتغيير من: لوحة التحكم ← الإعدادات
  admin: {
    email: 'admin@sadeem.team',
    passHash: 'c56eb6be',      // تجزئة sadeem2026
    teamCodeHash: '402419fe'   // تجزئة SADEEM2026
  },

  /* --------------------------------------------------------
     المزامنة السحابية (اختيارية) عبر Firebase Realtime Database
     لتظهر تعديلات المشرف فورياً لجميع الطلاب:
       1) أنشئ مشروعاً مجانياً على console.firebase.google.com
       2) فعّل Realtime Database وانسخ إعدادات الويب هنا
       3) اجعل enabled: true
     بدون هذه الخطوة يعمل الموقع بنظام التخزين المحلي بشكل كامل.
     الشرح التفصيلي في README.md
     -------------------------------------------------------- */
  firebase: {
    enabled: false,
    config: {
      apiKey: '',
      authDomain: '',
      databaseURL: '',   // مثل: https://PROJECT-ID-default-rtdb.firebaseio.com
      projectId: '',
      appId: ''
    }
  },

  // مفاتيح التخزين في المتصفح (لا تغيّرها إلا إذا كنت تعرف ما تفعل)
  storageKeys: {
    db: 'sadeem_db_v1',
    chat: 'sadeem_chat_v1',
    auth: 'sadeem_admin_session',
    lock: 'sadeem_login_lock'
  }
};
