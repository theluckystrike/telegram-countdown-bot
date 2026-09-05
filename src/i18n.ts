// Static-text localization for CountdownBot. Only user-facing static copy lives here —
// the countdown card itself (title is user-supplied) stays in English/plain text in
// index.ts/logic.ts so it reads the same for every member of a group.

export const LANGS = ["en", "ru", "es", "pt", "id", "de", "tr", "uk", "fa", "ar", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export type Key =
  | "help" | "start" | "limitReached" | "proGroupInfo" | "proDescription" | "thankYou" | "needMember" | "usage" | "tzUsage" | "tzSaved" | "tzAdminOnly"
  | "noActiveCountdowns" | "stopUsage" | "stopNotAllowed"
  | "btn_addToGroup" | "btn_shareBot" | "btn_unlockProStars"
  // Mini App (MINIAPP-SPEC.md): the 14 shared app_* keys, app_storyText, and this bot's
  // own app_title / app_itsTime / app_daysLeft — 18 keys total, embedded via appDict().
  | "app_title" | "app_loading" | "app_moreApps" | "app_shareChat" | "app_shareStory" | "app_storyText" | "app_shareFail"
  | "app_errNoInit" | "app_errExpired" | "app_errBadSig" | "app_unlockPro" | "app_proOneTime" | "app_proMonthly"
  | "app_payDone" | "app_payCancelled" | "app_payFailed" | "app_itsTime" | "app_daysLeft";

/** ctx.from.language_code -> first two letters -> known table language, else "en". */
export function resolveLang(code?: string | null): Lang {
  const c = (code ?? "").slice(0, 2).toLowerCase();
  return (LANGS as readonly string[]).includes(c) ? (c as Lang) : "en";
}

/** Look up `key` for `lang` (falling back to English), substituting `{name}` tokens from `vars`. */
export function t(lang: string | undefined | null, key: Key, vars?: Record<string, string | number>): string {
  const l: Lang = (LANGS as readonly string[]).includes(lang ?? "") ? (lang as Lang) : "en";
  let s = TABLE[key][l] ?? TABLE[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

const TABLE: Record<Key, Record<Lang, string>> = {
  help: {
    en: "🎯 *CountdownBot* — live countdown cards for a date that matters.\n\n`/countdown 2026-12-25 Christmas` — new card, midnight in this chat's timezone\n`/countdown 2026-12-25 18:00 Launch` — with a time\n`/countdowns` — list active ones with their #id\n`/stop 3` — stop countdown #3 (creator or admin)\n`/ctz +2` — this chat's UTC offset\n\nFree: {free} active per chat, daily updates. Pro (per chat): unlimited, custom emoji (`/countdown 🎄 2026-12-25 Christmas`), hourly updates under 2 days, and a share button — one-time {stars} ⭐ — /pro",
    ru: "🎯 *CountdownBot* — живые карточки обратного отсчёта до важной даты.\n\n`/countdown 2026-12-25 Christmas` — новая карточка, полночь по времени этого чата\n`/countdown 2026-12-25 18:00 Launch` — с указанием времени\n`/countdowns` — список активных с их #id\n`/stop 3` — остановить отсчёт #3 (создатель или админ)\n`/ctz +2` — часовой пояс этого чата\n\nБесплатно: {free} активных на чат, обновление раз в день. Pro (на чат): без ограничений, свой эмодзи (`/countdown 🎄 2026-12-25 Christmas`), обновление по часам за 2 дня до срока и кнопка «поделиться» — разово {stars} ⭐ — /pro",
    es: "🎯 *CountdownBot* — tarjetas de cuenta regresiva en vivo para una fecha importante.\n\n`/countdown 2026-12-25 Christmas` — tarjeta nueva, medianoche en la zona horaria de este chat\n`/countdown 2026-12-25 18:00 Launch` — con hora\n`/countdowns` — lista de activas con su #id\n`/stop 3` — detener la cuenta #3 (creador o admin)\n`/ctz +2` — zona horaria de este chat\n\nGratis: {free} activas por chat, actualización diaria. Pro (por chat): ilimitado, emoji personalizado (`/countdown 🎄 2026-12-25 Christmas`), actualización por hora bajo 2 días y botón de compartir — pago único {stars} ⭐ — /pro",
    pt: "🎯 *CountdownBot* — cartões de contagem regressiva ao vivo para uma data importante.\n\n`/countdown 2026-12-25 Christmas` — novo cartão, meia-noite no fuso deste chat\n`/countdown 2026-12-25 18:00 Launch` — com horário\n`/countdowns` — lista das ativas com seu #id\n`/stop 3` — parar a contagem #3 (criador ou admin)\n`/ctz +2` — fuso horário deste chat\n\nGrátis: {free} ativas por chat, atualização diária. Pro (por chat): ilimitado, emoji personalizado (`/countdown 🎄 2026-12-25 Christmas`), atualização por hora abaixo de 2 dias e botão de compartilhar — pagamento único {stars} ⭐ — /pro",
    id: "🎯 *CountdownBot* — kartu hitung mundur langsung untuk tanggal penting.\n\n`/countdown 2026-12-25 Christmas` — kartu baru, tengah malam sesuai zona waktu chat ini\n`/countdown 2026-12-25 18:00 Launch` — dengan jam\n`/countdowns` — daftar yang aktif beserta #id\n`/stop 3` — hentikan hitung mundur #3 (pembuat atau admin)\n`/ctz +2` — zona waktu chat ini\n\nGratis: {free} aktif per chat, update harian. Pro (per chat): tanpa batas, emoji kustom (`/countdown 🎄 2026-12-25 Christmas`), update per jam di bawah 2 hari, dan tombol bagikan — sekali bayar {stars} ⭐ — /pro",
    de: "🎯 *CountdownBot* — Live-Countdown-Karten für ein wichtiges Datum.\n\n`/countdown 2026-12-25 Christmas` — neue Karte, Mitternacht in der Zeitzone dieses Chats\n`/countdown 2026-12-25 18:00 Launch` — mit Uhrzeit\n`/countdowns` — aktive Countdowns mit #id\n`/stop 3` — Countdown #3 stoppen (Ersteller oder Admin)\n`/ctz +2` — Zeitzone dieses Chats\n\nKostenlos: {free} aktive pro Chat, tägliches Update. Pro (pro Chat): unbegrenzt, eigenes Emoji (`/countdown 🎄 2026-12-25 Christmas`), stündliches Update unter 2 Tagen und Teilen-Button — einmalig {stars} ⭐ — /pro",
    tr: "🎯 *CountdownBot* — önemli bir tarih için canlı geri sayım kartları.\n\n`/countdown 2026-12-25 Christmas` — yeni kart, bu sohbetin saat diliminde gece yarısı\n`/countdown 2026-12-25 18:00 Launch` — saatli\n`/countdowns` — aktif olanları #id ile listele\n`/stop 3` — #3 geri sayımı durdur (oluşturan veya admin)\n`/ctz +2` — bu sohbetin UTC farkı\n\nÜcretsiz: sohbet başına {free} aktif, günlük güncelleme. Pro (sohbet başına): sınırsız, özel emoji (`/countdown 🎄 2026-12-25 Christmas`), 2 günün altında saatlik güncelleme ve paylaş butonu — tek seferlik {stars} ⭐ — /pro",
    uk: "🎯 *CountdownBot* — живі картки зворотного відліку до важливої дати.\n\n`/countdown 2026-12-25 Christmas` — нова картка, північ за часом цього чату\n`/countdown 2026-12-25 18:00 Launch` — із часом\n`/countdowns` — список активних із їхнім #id\n`/stop 3` — зупинити відлік #3 (creator або адмін)\n`/ctz +2` — часовий пояс цього чату\n\nБезкоштовно: {free} активних на чат, оновлення раз на день. Pro (на чат): без обмежень, власний емодзі (`/countdown 🎄 2026-12-25 Christmas`), погодинне оновлення за 2 дні до строку та кнопка «поділитися» — разово {stars} ⭐ — /pro",
    fa: "🎯 *CountdownBot* — کارت‌های شمارش معکوس زنده برای یک تاریخ مهم.\n\n`/countdown 2026-12-25 Christmas` — کارت جدید، نیمه‌شب به وقت این چت\n`/countdown 2026-12-25 18:00 Launch` — با ساعت\n`/countdowns` — فهرست فعال‌ها همراه با #id\n`/stop 3` — توقف شمارش معکوس #3 (سازنده یا ادمین)\n`/ctz +2` — منطقه زمانی این چت\n\nرایگان: {free} مورد فعال در هر چت، به‌روزرسانی روزانه. Pro (به ازای هر چت): نامحدود، ایموجی سفارشی (`/countdown 🎄 2026-12-25 Christmas`)، به‌روزرسانی ساعتی زیر ۲ روز و دکمه اشتراک‌گذاری — پرداخت یک‌باره {stars} ⭐ — /pro",
    ar: "🎯 *CountdownBot* — بطاقات عد تنازلي حية لتاريخ مهم.\n\n`/countdown 2026-12-25 Christmas` — بطاقة جديدة، منتصف الليل بتوقيت هذه المحادثة\n`/countdown 2026-12-25 18:00 Launch` — مع وقت محدد\n`/countdowns` — قائمة النشطة مع #id\n`/stop 3` — إيقاف العد التنازلي رقم 3 (المنشئ أو المشرف)\n`/ctz +2` — المنطقة الزمنية لهذه المحادثة\n\nمجانًا: {free} نشطة لكل محادثة، تحديث يومي. Pro (لكل محادثة): غير محدود، إيموجي مخصص (`/countdown 🎄 2026-12-25 Christmas`)، تحديث كل ساعة عند اقتراب أقل من يومين، وزر مشاركة — دفعة واحدة {stars} ⭐ — /pro",
    hi: "🎯 *CountdownBot* — किसी ज़रूरी तारीख़ के लिए लाइव काउंटडाउन कार्ड।\n\n`/countdown 2026-12-25 Christmas` — नया कार्ड, इस चैट के टाइमज़ोन में आधी रात\n`/countdown 2026-12-25 18:00 Launch` — समय के साथ\n`/countdowns` — सक्रिय काउंटडाउन #id सहित\n`/stop 3` — काउंटडाउन #3 रोकें (क्रिएटर या एडमिन)\n`/ctz +2` — इस चैट का UTC ऑफ़सेट\n\nमुफ़्त: प्रति चैट {free} सक्रिय, रोज़ाना अपडेट। Pro (प्रति चैट): असीमित, कस्टम इमोजी (`/countdown 🎄 2026-12-25 Christmas`), 2 दिन से कम पर घंटेवार अपडेट, और शेयर बटन — एकमुश्त {stars} ⭐ — /pro",
  },
  start: {
    en: "🎯 A card in your chat that counts down every day.\nTry: `/countdown {date} Christmas`\nIt updates itself until the day arrives.\nFree: {free} per chat · /help",
    ru: "🎯 Карточка в вашем чате, которая каждый день отсчитывает время.\nПопробуйте: `/countdown {date} Christmas`\nОна обновляется сама вплоть до нужного дня.\nБесплатно: {free} на чат · /help",
    es: "🎯 Una tarjeta en tu chat que cuenta los días.\nPrueba: `/countdown {date} Christmas`\nSe actualiza sola hasta que llega el día.\nGratis: {free} por chat · /help",
    pt: "🎯 Um cartão no seu chat que faz a contagem todo dia.\nExperimente: `/countdown {date} Christmas`\nEle se atualiza sozinho até o dia chegar.\nGrátis: {free} por chat · /help",
    id: "🎯 Kartu di chatmu yang menghitung mundur setiap hari.\nCoba: `/countdown {date} Christmas`\nKartu ini update sendiri sampai harinya tiba.\nGratis: {free} per chat · /help",
    de: "🎯 Eine Karte in deinem Chat, die jeden Tag herunterzählt.\nProbier's: `/countdown {date} Christmas`\nSie aktualisiert sich selbst bis zum großen Tag.\nKostenlos: {free} pro Chat · /help",
    tr: "🎯 Sohbetinde her gün geri sayan bir kart.\nDene: `/countdown {date} Christmas`\nGün gelene kadar kendini günceller.\nÜcretsiz: sohbet başına {free} · /help",
    uk: "🎯 Картка у вашому чаті, яка щодня рахує дні.\nСпробуйте: `/countdown {date} Christmas`\nВона сама оновлюється аж до потрібного дня.\nБезкоштовно: {free} на чат · /help",
    fa: "🎯 کارتی در چت شما که هر روز شمارش معکوس می‌کند.\nامتحان کنید: `/countdown {date} Christmas`\nتا رسیدن آن روز خودش به‌روزرسانی می‌شود.\nرایگان: {free} در هر چت · /help",
    ar: "🎯 بطاقة في محادثتك تعد تنازليًا كل يوم.\nجرّب: `/countdown {date} Christmas`\nتتحدّث تلقائيًا حتى يحين اليوم.\nمجانًا: {free} لكل محادثة · /help",
    hi: "🎯 आपकी चैट में एक कार्ड जो रोज़ गिनती करता है।\nआज़माएं: `/countdown {date} Christmas`\nयह दिन आने तक खुद अपडेट होता रहता है।\nमुफ़्त: प्रति चैट {free} · /help",
  },
  limitReached: {
    en: "This chat reached the free limit of {free} active countdowns. Pro is unlimited (one-time {stars} ⭐).",
    ru: "Этот чат достиг бесплатного лимита в {free} активных отсчётов. Pro без ограничений (разово {stars} ⭐).",
    es: "Este chat alcanzó el límite gratuito de {free} cuentas activas. Pro es ilimitado (pago único {stars} ⭐).",
    pt: "Este chat atingiu o limite grátis de {free} contagens ativas. Pro é ilimitado (pagamento único {stars} ⭐).",
    id: "Chat ini mencapai batas gratis {free} hitung mundur aktif. Pro tanpa batas (sekali bayar {stars} ⭐).",
    de: "Dieser Chat hat das kostenlose Limit von {free} aktiven Countdowns erreicht. Pro ist unbegrenzt (einmalig {stars} ⭐).",
    tr: "Bu sohbet ücretsiz {free} aktif geri sayım sınırına ulaştı. Pro sınırsızdır (tek seferlik {stars} ⭐).",
    uk: "Цей чат досяг безкоштовного ліміту в {free} активних відліків. Pro без обмежень (разово {stars} ⭐).",
    fa: "این چت به محدودیت رایگان {free} شمارش معکوس فعال رسیده است. Pro نامحدود است (پرداخت یک‌باره {stars} ⭐).",
    ar: "وصلت هذه المحادثة إلى الحد المجاني وهو {free} عد تنازلي نشط. Pro غير محدود (دفعة واحدة {stars} ⭐).",
    hi: "इस चैट ने मुफ़्त सीमा {free} सक्रिय काउंटडाउन पूरी कर ली है। Pro असीमित है (एकमुश्त {stars} ⭐)।",
  },
  proGroupInfo: {
    en: "Pro for this chat: unlimited countdowns, custom emoji, hourly precision + share button, one-time {stars} ⭐.",
    ru: "Pro для этого чата: неограниченные отсчёты, свой эмодзи, точность до часа и кнопка «поделиться», разово {stars} ⭐.",
    es: "Pro para este chat: cuentas ilimitadas, emoji personalizado, precisión por hora y botón de compartir, pago único {stars} ⭐.",
    pt: "Pro para este chat: contagens ilimitadas, emoji personalizado, precisão por hora e botão de compartilhar, pagamento único {stars} ⭐.",
    id: "Pro untuk chat ini: hitung mundur tanpa batas, emoji kustom, presisi per jam + tombol bagikan, sekali bayar {stars} ⭐.",
    de: "Pro für diesen Chat: unbegrenzte Countdowns, eigenes Emoji, stündliche Genauigkeit + Teilen-Button, einmalig {stars} ⭐.",
    tr: "Bu sohbet için Pro: sınırsız geri sayım, özel emoji, saatlik hassasiyet + paylaş butonu, tek seferlik {stars} ⭐.",
    uk: "Pro для цього чату: необмежені відліки, власний емодзі, погодинна точність і кнопка «поділитися», разово {stars} ⭐.",
    fa: "Pro برای این چت: شمارش معکوس نامحدود، ایموجی سفارشی، دقت ساعتی + دکمه اشتراک‌گذاری، پرداخت یک‌باره {stars} ⭐.",
    ar: "Pro لهذه المحادثة: عد تنازلي غير محدود، إيموجي مخصص، دقة بالساعة وزر مشاركة، دفعة واحدة {stars} ⭐.",
    hi: "इस चैट के लिए Pro: असीमित काउंटडाउन, कस्टम इमोजी, घंटेवार सटीकता + शेयर बटन, एकमुश्त {stars} ⭐।",
  },
  proDescription: {
    en: "Unlimited countdowns, custom emoji, hourly precision and a share button for one chat. One-time payment, no subscription.",
    ru: "Неограниченные отсчёты, свой эмодзи, точность до часа и кнопка «поделиться» для одного чата. Разовый платёж, без подписки.",
    es: "Cuentas ilimitadas, emoji personalizado, precisión por hora y botón de compartir para un chat. Pago único, sin suscripción.",
    pt: "Contagens ilimitadas, emoji personalizado, precisão por hora e botão de compartilhar para um chat. Pagamento único, sem assinatura.",
    id: "Hitung mundur tanpa batas, emoji kustom, presisi per jam dan tombol bagikan untuk satu chat. Sekali bayar, tanpa langganan.",
    de: "Unbegrenzte Countdowns, eigenes Emoji, stündliche Genauigkeit und Teilen-Button für einen Chat. Einmalzahlung, kein Abo.",
    tr: "Bir sohbet için sınırsız geri sayım, özel emoji, saatlik hassasiyet ve paylaş butonu. Tek seferlik ödeme, abonelik yok.",
    uk: "Необмежені відліки, власний емодзі, погодинна точність і кнопка «поділитися» для одного чату. Разовий платіж, без підписки.",
    fa: "شمارش معکوس نامحدود، ایموجی سفارشی، دقت ساعتی و دکمه اشتراک‌گذاری برای یک چت. پرداخت یک‌باره، بدون اشتراک.",
    ar: "عد تنازلي غير محدود، إيموجي مخصص، دقة بالساعة وزر مشاركة لمحادثة واحدة. دفعة واحدة، بدون اشتراك.",
    hi: "एक चैट के लिए असीमित काउंटडाउन, कस्टम इमोजी, घंटेवार सटीकता और शेयर बटन। एकमुश्त भुगतान, कोई सब्सक्रिप्शन नहीं।",
  },
  thankYou: {
    en: "✅ Pro unlocked for this chat. Unlimited countdowns, custom emoji, hourly precision + share button.\n\n/more — more free tools",
    ru: "✅ Pro активирован для этого чата. Неограниченные отсчёты, свой эмодзи, точность до часа и кнопка «поделиться».\n\n/more — другие бесплатные инструменты",
    es: "✅ Pro activado para este chat. Cuentas ilimitadas, emoji personalizado, precisión por hora y botón de compartir.\n\n/more — más herramientas gratis",
    pt: "✅ Pro ativado para este chat. Contagens ilimitadas, emoji personalizado, precisão por hora e botão de compartilhar.\n\n/more — mais ferramentas grátis",
    id: "✅ Pro aktif untuk chat ini. Hitung mundur tanpa batas, emoji kustom, presisi per jam + tombol bagikan.\n\n/more — alat gratis lainnya",
    de: "✅ Pro für diesen Chat freigeschaltet. Unbegrenzte Countdowns, eigenes Emoji, stündliche Genauigkeit + Teilen-Button.\n\n/more — weitere kostenlose Tools",
    tr: "✅ Bu sohbet için Pro açıldı. Sınırsız geri sayım, özel emoji, saatlik hassasiyet + paylaş butonu.\n\n/more — daha fazla ücretsiz araç",
    uk: "✅ Pro активовано для цього чату. Необмежені відліки, власний емодзі, погодинна точність і кнопка «поділитися».\n\n/more — інші безкоштовні інструменти",
    fa: "✅ Pro برای این چت فعال شد. شمارش معکوس نامحدود، ایموجی سفارشی، دقت ساعتی + دکمه اشتراک‌گذاری.\n\n/more — ابزارهای رایگان بیشتر",
    ar: "✅ تم تفعيل Pro لهذه المحادثة. عد تنازلي غير محدود، إيموجي مخصص، دقة بالساعة وزر مشاركة.\n\n/more — أدوات مجانية أخرى",
    hi: "✅ इस चैट के लिए Pro अनलॉक हुआ। असीमित काउंटडाउन, कस्टम इमोजी, घंटेवार सटीकता + शेयर बटन।\n\n/more — और मुफ़्त टूल्स",
  },
  needMember: {
    en: "You need to be a member of that chat to unlock Pro for it.",
    ru: "Чтобы открыть Pro для этого чата, вы должны быть его участником.",
    es: "Debes ser miembro de ese chat para desbloquear Pro allí.",
    pt: "Você precisa ser membro desse chat para desbloquear o Pro nele.",
    id: "Kamu harus menjadi anggota chat itu untuk membuka Pro di sana.",
    de: "Du musst Mitglied dieses Chats sein, um Pro dort freizuschalten.",
    tr: "Orada Pro açmak için o sohbetin üyesi olmalısın.",
    uk: "Щоб відкрити Pro для того чату, потрібно бути його учасником.",
    fa: "برای فعال‌سازی Pro در آن چت باید عضو آن باشید.",
    ar: "يجب أن تكون عضوًا في تلك المحادثة لفتح Pro لها.",
    hi: "उस चैट के लिए Pro अनलॉक करने के लिए आपको उसका सदस्य होना ज़रूरी है।",
  },
  usage: {
    en: "Usage: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    ru: "Использование: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    es: "Uso: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    pt: "Uso: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    id: "Cara pakai: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    de: "Verwendung: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    tr: "Kullanım: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    uk: "Використання: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    fa: "روش استفاده: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    ar: "الاستخدام: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
    hi: "उपयोग: /countdown 2026-12-25 Christmas  ·  /countdown 2026-12-25 18:00 Launch",
  },
  tzUsage: {
    en: "Usage: /ctz +2  or  /ctz -5:30",
    ru: "Использование: /ctz +2  или  /ctz -5:30",
    es: "Uso: /ctz +2  o  /ctz -5:30",
    pt: "Uso: /ctz +2  ou  /ctz -5:30",
    id: "Cara pakai: /ctz +2  atau  /ctz -5:30",
    de: "Verwendung: /ctz +2  oder  /ctz -5:30",
    tr: "Kullanım: /ctz +2  veya  /ctz -5:30",
    uk: "Використання: /ctz +2  або  /ctz -5:30",
    fa: "روش استفاده: /ctz +2  یا  /ctz -5:30",
    ar: "الاستخدام: /ctz +2  أو  /ctz -5:30",
    hi: "उपयोग: /ctz +2  या  /ctz -5:30",
  },
  tzSaved: {
    en: "🕒 Timezone saved for this chat.",
    ru: "🕒 Часовой пояс сохранён для этого чата.",
    es: "🕒 Zona horaria guardada para este chat.",
    pt: "🕒 Fuso horário salvo para este chat.",
    id: "🕒 Zona waktu disimpan untuk chat ini.",
    de: "🕒 Zeitzone für diesen Chat gespeichert.",
    tr: "🕒 Bu sohbet için saat dilimi kaydedildi.",
    uk: "🕒 Часовий пояс збережено для цього чату.",
    fa: "🕒 منطقه زمانی برای این چت ذخیره شد.",
    ar: "🕒 تم حفظ المنطقة الزمنية لهذه المحادثة.",
    hi: "🕒 इस चैट के लिए टाइमज़ोन सेव हो गया।",
  },
  tzAdminOnly: {
    en: "Only a group admin can change the timezone.",
    ru: "Изменить часовой пояс может только администратор группы.",
    es: "Solo un admin del grupo puede cambiar la zona horaria.",
    pt: "Só um admin do grupo pode alterar o fuso horário.",
    id: "Hanya admin grup yang bisa mengubah zona waktu.",
    de: "Nur ein Gruppenadmin kann die Zeitzone ändern.",
    tr: "Saat dilimini yalnızca grup yöneticisi değiştirebilir.",
    uk: "Змінити часовий пояс може лише адміністратор групи.",
    fa: "فقط ادمین گروه می‌تواند منطقهٔ زمانی را تغییر دهد.",
    ar: "يمكن لمشرف المجموعة فقط تغيير المنطقة الزمنية.",
    hi: "टाइमज़ोन केवल ग्रुप एडमिन ही बदल सकता है।",
  },
  noActiveCountdowns: {
    en: "No active countdowns. /countdown 2026-12-25 Christmas",
    ru: "Нет активных отсчётов. /countdown 2026-12-25 Christmas",
    es: "No hay cuentas regresivas activas. /countdown 2026-12-25 Christmas",
    pt: "Nenhuma contagem regressiva ativa. /countdown 2026-12-25 Christmas",
    id: "Tidak ada hitung mundur aktif. /countdown 2026-12-25 Christmas",
    de: "Keine aktiven Countdowns. /countdown 2026-12-25 Christmas",
    tr: "Aktif geri sayım yok. /countdown 2026-12-25 Christmas",
    uk: "Немає активних відліків. /countdown 2026-12-25 Christmas",
    fa: "شمارش معکوس فعالی وجود ندارد. /countdown 2026-12-25 Christmas",
    ar: "لا توجد عدادات تنازلية نشطة. /countdown 2026-12-25 Christmas",
    hi: "कोई सक्रिय काउंटडाउन नहीं। /countdown 2026-12-25 Christmas",
  },
  stopUsage: {
    en: "Usage: /stop <id>",
    ru: "Использование: /stop <id>",
    es: "Uso: /stop <id>",
    pt: "Uso: /stop <id>",
    id: "Penggunaan: /stop <id>",
    de: "Verwendung: /stop <id>",
    tr: "Kullanım: /stop <id>",
    uk: "Використання: /stop <id>",
    fa: "روش استفاده: /stop <id>",
    ar: "الاستخدام: /stop <id>",
    hi: "उपयोग: /stop <id>",
  },
  stopNotAllowed: {
    en: "Only the creator or a chat admin can stop this.",
    ru: "Остановить может только создатель или админ чата.",
    es: "Solo el creador o un admin del chat puede detenerlo.",
    pt: "Somente o criador ou um admin do chat pode parar isso.",
    id: "Hanya pembuat atau admin chat yang bisa menghentikannya.",
    de: "Nur der Ersteller oder ein Chat-Admin kann das stoppen.",
    tr: "Bunu yalnızca oluşturan kişi veya sohbet yöneticisi durdurabilir.",
    uk: "Зупинити може лише творець або адмін чату.",
    fa: "فقط سازنده یا ادمین چت می‌تواند این را متوقف کند.",
    ar: "يمكن فقط لمنشئه أو مشرف المحادثة إيقافه.",
    hi: "इसे केवल बनाने वाला या चैट एडमिन ही रोक सकता है।",
  },
  btn_addToGroup: {
    en: "Add me to a group", ru: "Добавить в группу", es: "Añadirme a un grupo",
    pt: "Adicionar a um grupo", id: "Tambahkan ke grup", de: "Zu Gruppe hinzufügen",
    tr: "Gruba ekle", uk: "Додати до групи", fa: "افزودن به گروه",
    ar: "أضفني إلى مجموعة", hi: "ग्रुप में जोड़ें",
  },
  btn_shareBot: {
    en: "Share this bot", ru: "Поделиться ботом", es: "Compartir este bot",
    pt: "Compartilhar este bot", id: "Bagikan bot ini", de: "Bot teilen",
    tr: "Botu paylaş", uk: "Поділитися ботом", fa: "اشتراک‌گذاری ربات",
    ar: "شارك هذا البوت", hi: "यह बॉट शेयर करें",
  },
  btn_unlockProStars: {
    en: "Unlock Pro, {stars} ⭐", ru: "Купить Pro, {stars} ⭐", es: "Desbloquear Pro, {stars} ⭐",
    pt: "Desbloquear Pro, {stars} ⭐", id: "Buka Pro, {stars} ⭐", de: "Pro freischalten, {stars} ⭐",
    tr: "Pro'yu aç, {stars} ⭐", uk: "Купити Pro, {stars} ⭐", fa: "باز کردن Pro، {stars} ⭐",
    ar: "فتح Pro، {stars} ⭐", hi: "Pro अनलॉक करें, {stars} ⭐",
  },
  // --- Mini App (MINIAPP-SPEC.md §1/§5) --------------------------------------------------
  // The 14 shared keys below are copied verbatim from habit/src/i18n.ts (identical
  // translation in every bot). app_title/app_storyText/app_itsTime/app_daysLeft are this
  // bot's own strings.
  app_title: {
    en: "Countdown Days", ru: "Countdown Days", es: "Countdown Days", pt: "Countdown Days",
    id: "Countdown Days", de: "Countdown Days", tr: "Countdown Days", uk: "Countdown Days",
    fa: "Countdown Days", ar: "Countdown Days", hi: "Countdown Days",
  },
  app_loading: {
    en: "Loading…", ru: "Загрузка…", es: "Cargando…", pt: "Carregando…", id: "Memuat…",
    de: "Wird geladen…", tr: "Yükleniyor…", uk: "Завантаження…", fa: "در حال بارگذاری…",
    ar: "جارٍ التحميل…", hi: "लोड हो रहा है…",
  },
  app_moreApps: {
    en: "More apps", ru: "Другие приложения", es: "Más apps", pt: "Mais apps",
    id: "Aplikasi lain", de: "Mehr Apps", tr: "Diğer uygulamalar", uk: "Інші застосунки",
    fa: "برنامه‌های بیشتر", ar: "تطبيقات أخرى", hi: "और ऐप्स",
  },
  app_shareChat: {
    en: "💬 Share to a chat", ru: "💬 Отправить в чат", es: "💬 Compartir en chat",
    pt: "💬 Enviar no chat", id: "💬 Bagikan ke chat", de: "💬 In Chat teilen",
    tr: "💬 Sohbette paylaş", uk: "💬 Надіслати в чат", fa: "💬 ارسال به گفتگو",
    ar: "💬 مشاركة في محادثة", hi: "💬 चैट में भेजें",
  },
  app_shareStory: {
    en: "📣 Share to story", ru: "📣 В историю", es: "📣 A tu historia", pt: "📣 Nos stories",
    id: "📣 Bagikan ke story", de: "📣 Als Story teilen", tr: "📣 Hikâyede paylaş",
    uk: "📣 В історію", fa: "📣 اشتراک در استوری", ar: "📣 مشاركة في قصة",
    hi: "📣 स्टोरी में साझा करें",
  },
  app_storyText: {
    en: "Live countdown cards for the date that matters — right in the chat.",
    ru: "Живые карточки обратного отсчёта до важной даты — прямо в чате.",
    es: "Tarjetas de cuenta regresiva en vivo para la fecha que importa, directo en el chat.",
    pt: "Cartões de contagem regressiva ao vivo para a data que importa, direto no chat.",
    id: "Kartu hitung mundur langsung untuk tanggal yang penting, langsung di chat.",
    de: "Live-Countdown-Karten für das Datum, das zählt — direkt im Chat.",
    tr: "Önemli bir tarih için canlı geri sayım kartları — doğrudan sohbette.",
    uk: "Живі картки зворотного відліку до важливої дати — прямо в чаті.",
    fa: "کارت‌های شمارش معکوس زنده برای تاریخی که اهمیت دارد — درست در چت.",
    ar: "بطاقات عد تنازلي حية للتاريخ المهم — مباشرة في المحادثة.",
    hi: "उस तारीख़ के लिए लाइव काउंटडाउन कार्ड जो मायने रखती है — सीधे चैट में।",
  },
  app_shareFail: {
    en: "Sharing is unavailable right now.", ru: "Поделиться сейчас не получилось.",
    es: "Ahora mismo no se puede compartir.", pt: "Não foi possível compartilhar agora.",
    id: "Berbagi sedang tidak tersedia.", de: "Teilen ist gerade nicht möglich.",
    tr: "Şu anda paylaşılamıyor.", uk: "Поділитися зараз не вдалося.",
    fa: "در حال حاضر اشتراک‌گذاری ممکن نیست.", ar: "المشاركة غير متاحة الآن.",
    hi: "अभी साझा नहीं किया जा सकता।",
  },
  app_errNoInit: {
    en: "Open this app from the bot — tap the menu button.",
    ru: "Откройте это приложение из бота — кнопка меню.",
    es: "Abre esta app desde el bot — toca el botón de menú.",
    pt: "Abra este app pelo bot — toque no botão de menu.",
    id: "Buka aplikasi ini dari bot — ketuk tombol menu.",
    de: "Öffne diese App über den Bot — tippe auf den Menü-Button.",
    tr: "Bu uygulamayı bottan aç — menü düğmesine dokun.",
    uk: "Відкрийте застосунок із бота — кнопка меню.",
    fa: "این برنامه را از داخل ربات باز کنید — دکمه منو.",
    ar: "افتح هذا التطبيق من البوت — زر القائمة.",
    hi: "यह ऐप बॉट से खोलें — मेनू बटन दबाएँ।",
  },
  app_errExpired: {
    en: "This session expired. Close and reopen the app.",
    ru: "Сессия истекла. Закройте и откройте приложение снова.",
    es: "La sesión caducó. Cierra y vuelve a abrir la app.",
    pt: "A sessão expirou. Feche e abra o app de novo.",
    id: "Sesi berakhir. Tutup lalu buka lagi aplikasinya.",
    de: "Sitzung abgelaufen. App schließen und neu öffnen.",
    tr: "Oturum doldu. Uygulamayı kapatıp yeniden aç.",
    uk: "Сесія завершилася. Закрийте й відкрийте застосунок.",
    fa: "نشست منقضی شد. برنامه را ببندید و دوباره باز کنید.",
    ar: "انتهت الجلسة. أغلق التطبيق ثم افتحه من جديد.",
    hi: "सेशन खत्म हो गया। ऐप बंद करके फिर खोलें।",
  },
  app_errBadSig: {
    en: "This link is not valid. Reopen the app from the bot.",
    ru: "Ссылка недействительна. Откройте приложение из бота.",
    es: "Este enlace no es válido. Abre la app desde el bot.",
    pt: "Este link não é válido. Abra o app pelo bot.",
    id: "Tautan ini tidak valid. Buka aplikasi dari bot.",
    de: "Dieser Link ist ungültig. Öffne die App über den Bot.",
    tr: "Bu bağlantı geçersiz. Uygulamayı bottan aç.",
    uk: "Посилання недійсне. Відкрийте застосунок із бота.",
    fa: "این پیوند معتبر نیست. برنامه را از ربات باز کنید.",
    ar: "هذا الرابط غير صالح. افتح التطبيق من البوت.",
    hi: "यह लिंक मान्य नहीं है। ऐप बॉट से खोलें।",
  },
  app_unlockPro: {
    en: "🔓 Unlock Pro", ru: "🔓 Открыть Pro", es: "🔓 Desbloquear Pro", pt: "🔓 Desbloquear Pro",
    id: "🔓 Buka Pro", de: "🔓 Pro freischalten", tr: "🔓 Pro'yu aç", uk: "🔓 Відкрити Pro",
    fa: "🔓 فعال‌سازی Pro", ar: "🔓 تفعيل Pro", hi: "🔓 Pro अनलॉक करें",
  },
  app_proOneTime: {
    en: "One-time {n} ⭐", ru: "Разово {n} ⭐", es: "Pago único {n} ⭐", pt: "Único {n} ⭐",
    id: "Sekali bayar {n} ⭐", de: "Einmalig {n} ⭐", tr: "Tek seferlik {n} ⭐",
    uk: "Разово {n} ⭐", fa: "یک‌باره {n} ⭐", ar: "مرة واحدة {n} ⭐", hi: "एकमुश्त {n} ⭐",
  },
  app_proMonthly: {
    en: "Monthly {n} ⭐/mo", ru: "Ежемесячно {n} ⭐", es: "Mensual {n} ⭐/mes",
    pt: "Mensal {n} ⭐/mês", id: "Bulanan {n} ⭐/bln", de: "Monatlich {n} ⭐",
    tr: "Aylık {n} ⭐/ay", uk: "Щомісяця {n} ⭐", fa: "ماهانه {n} ⭐", ar: "شهريًا {n} ⭐",
    hi: "मासिक {n} ⭐",
  },
  app_payDone: {
    en: "✅ Pro unlocked. Thank you.", ru: "✅ Pro активирован. Спасибо.",
    es: "✅ Pro activado. Gracias.", pt: "✅ Pro ativado. Obrigado.",
    id: "✅ Pro aktif. Terima kasih.", de: "✅ Pro aktiviert. Danke.",
    tr: "✅ Pro açıldı. Teşekkürler.", uk: "✅ Pro активовано. Дякуємо.",
    fa: "✅ Pro فعال شد. سپاسگزاریم.", ar: "✅ تم تفعيل Pro. شكرًا لك.",
    hi: "✅ Pro चालू हो गया। धन्यवाद।",
  },
  app_payCancelled: {
    en: "Payment cancelled.", ru: "Оплата отменена.", es: "Pago cancelado.",
    pt: "Pagamento cancelado.", id: "Pembayaran dibatalkan.", de: "Zahlung abgebrochen.",
    tr: "Ödeme iptal edildi.", uk: "Оплату скасовано.", fa: "پرداخت لغو شد.",
    ar: "أُلغيت عملية الدفع.", hi: "भुगतान रद्द हुआ।",
  },
  app_payFailed: {
    en: "Payment failed. Please try again.", ru: "Оплата не прошла. Попробуйте ещё раз.",
    es: "El pago falló. Inténtalo de nuevo.", pt: "O pagamento falhou. Tente de novo.",
    id: "Pembayaran gagal. Coba lagi.", de: "Zahlung fehlgeschlagen. Bitte erneut versuchen.",
    tr: "Ödeme başarısız. Tekrar dene.", uk: "Оплата не пройшла. Спробуйте ще раз.",
    fa: "پرداخت ناموفق بود. دوباره تلاش کنید.", ar: "فشل الدفع. حاول مرة أخرى.",
    hi: "भुगतान विफल। फिर कोशिश करें।",
  },
  app_itsTime: {
    en: "It's time!", ru: "Время пришло!", es: "¡Es la hora!", pt: "Chegou a hora!",
    id: "Waktunya tiba!", de: "Es ist so weit!", tr: "Vakit geldi!", uk: "Час настав!",
    fa: "وقتشه!", ar: "حان الوقت!", hi: "समय आ गया!",
  },
  app_daysLeft: {
    en: "{n}d left", ru: "осталось {n} дн.", es: "quedan {n} d", pt: "faltam {n} d",
    id: "{n} hari lagi", de: "noch {n} T.", tr: "{n} gün kaldı", uk: "залишилось {n} дн.",
    fa: "{n} روز مانده", ar: "باقي {n} يوم", hi: "{n} दिन बाकी",
  },
};

/** The 11 language codes this bot ships, in table order. */
export const APP_LANGS: Lang[] = [...LANGS];

/** Every `app_*` key, for every language, as a plain object — the Mini App's embedded
 * `APP_I18N` dictionary. English fills any gap so a client lookup can never miss.
 * Both loops are bounded by the static table (11 languages x the app_* key set). */
export function appDict(): Record<string, Record<string, string>> {
  const keys = (Object.keys(TABLE) as Key[]).filter((k) => k.startsWith("app_"));
  const out: Record<string, Record<string, string>> = {};
  for (const l of LANGS) {
    const m: Record<string, string> = {};
    for (const k of keys) m[k] = TABLE[k][l] ?? TABLE[k].en;
    out[l] = m;
  }
  return out;
}
