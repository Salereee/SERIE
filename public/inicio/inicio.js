// Página de presentación (/inicio/): idioma ES/EN y timer de muestra.
// Archivo aparte porque la CSP del sitio (script-src 'self') no permite scripts en línea.
(function(){
  // La app vive en el mismo origen, en la raíz.
  const APP_URL = '../';
  document.querySelectorAll('.app-link').forEach(a => a.href = APP_URL);

  const EN = {
    'nav.feat':'Features','nav.priv':'Privacy','nav.install':'Install','cta.short':'Open',
    'hero.eyebrow':'Workout log','hero.folio':'No. 01 · v1.0','hero.l1':'Every set,','hero.l2':'logged',
    'hero.lead':'Plan your split, log weight and reps in one tap and watch yourself get stronger. Free, no account, no internet needed: everything stays on your phone.',
    'cta.open':'Open SERIE','cta.install':'How to install',
    'f.ex':'exercises, gym-floor names','f.splits':'recommended splits','f.acc':'accounts or emails','f.price':'forever',
    'cap.today':'Today · Legs B','timer.label':'Rest · Deadlift','timer.aria':'Sample rest timer',
    'how.eyebrow':'How it works','how.title':'Three steps, no sign-up.',
    's1.t':'Answer 4 questions','s1.p':'Days available, experience, goal and equipment. SERIE recommends a split: Full Body, Upper/Lower, PPL, PHUL, Arnold or Bro Split. Or build your own.',
    's2.t':'Train and log','s2.p':'Every set comes prefilled with last time’s numbers. Tap to log it and the rest timer starts by itself.',
    's3.t':'Track your progress','s3.p':'Live PRs, weekly frequency and volume per muscle group. It suggests when to add weight and when to deload.',
    'feat.eyebrow':'Features','feat.title':'Built to use between sets.','feat.lead':'Big buttons, numbers you can read at arm’s length, and the screen stays on while you train.',
    'a.eyebrow':'Live session','a.t':'One set, one tap','a.p':'Weight and reps prefilled, last session’s sets in view, and a concrete suggestion for the next set.',
    'a.1':'Auto rest timer','a.2':'End-of-rest alert','a.2v':'sound + flash','a.3':'PRs','a.3v':'live','a.4':'Advanced',
    'b.eyebrow':'Per-exercise progress','b.t':'Watch yourself get stronger','b.p':'Each exercise keeps its top weight, best volume and, in advanced mode, its estimated 1RM using the Epley formula. The chart highlights every PR.',
    'b.1v':'weight × (1 + reps / 30)','b.2':'Progressive overload','b.2v':'suggested, optional','b.3':'Units',
    'c.eyebrow':'Consistency','c.t':'Your streak, in plain sight','c.p':'Sessions this month, weekly average, weeks in a row and a 16-week calendar. Below it, volume for each muscle group.',
    'desk.cap':'Also on desktop','desk.cap2':'Light and dark theme · keyboard navigation',
    'p.eyebrow':'Privacy','p.title':'No accounts. Your data, yours.','p.lead':'SERIE has no server. What you log lives in your browser’s database and never leaves your device.',
    'p.note':'Since there’s no cloud, your phone and computer don’t share data. To switch devices, export a backup from Settings and import it on the other one.',
    'p.1':'No sign-up, email or password','p.2':'Stored locally in IndexedDB','p.3':'Works offline after the first visit','p.4':'Installs as an app on iPhone and Android','p.5':'Back up to a JSON file anytime','p.6':'No ads, no third-party trackers',
    'i.eyebrow':'Install','i.title':'Put it on your home screen.','i.lead':'No app store needed. Open SERIE in your browser and add it in three taps.',
    'ios.1':'Tap <b>Share</b> (the square with the up arrow).','ios.2':'Scroll and choose <b>Add to Home Screen</b>.','ios.3':'Confirm with <b>Add</b> and open it from the new icon.',
    'ios.note':'On iPhone, installing matters: if you only use it inside Safari and go weeks without opening it, iOS may clear its data.',
    'and.1':'Open SERIE in Chrome.','and.2':'Tap <b>Install app</b> in the prompt, or from the <b>⋮</b> menu.','and.3':'Confirm. It lands in your app drawer like any other app.',
    'q.eyebrow':'Questions','q.title':'What people usually ask.',
    'q1':'How much does it cost?','a1':'Nothing. SERIE is free, with no paid plan and no ads.',
    'q2':'Do I need an account?','a2':'No. Open the app and start. It never asks for an email, phone number or password.',
    'q3':'What if I switch phones?','a3':'Before switching, go to Settings → Export to save a backup file. On the new phone, open SERIE and use Import. The app also reminds you to back up every 14 days or 10 sessions.',
    'q4':'Does it work offline?','a4':'Yes. After the first visit it works without a connection, so a basement gym is no problem.',
    'q5':'Can I use my own exercises and routines?','a5':'Yes. Beyond the 99 built-in exercises you can add your own, and in advanced mode you build your split with drag and drop, supersets, warm-ups and RIR/RPE.',
    'q6':'Pounds or kilos?','a6':'Both. Switch units in Settings and the app converts your history.',
    'fin.eyebrow':'Your next session','fin.l1':'Start today.','fin.l2':'Log every set',
    'foot':'v1.0.2 · 2026 · Free, no account',
    'alt.hoy':'SERIE Today screen: Legs B day with six exercises and a Start button (app UI in Spanish)',
    'alt.ses':'Deadlift session: two 115 kg sets logged, plates per side and rest timer at 2:25 (app UI in Spanish)',
    'alt.ex':'Lat pulldown progress: top weight goes from 50 to 55 kg (app UI in Spanish)',
    'alt.prog':'Progress summary: 16 sessions in 30 days, 10-week streak (app UI in Spanish)',
    'alt.desk':'SERIE on desktop with sidebar, today’s workout and recent PRs (app UI in Spanish)'
  };
  const ES = {};
  document.querySelectorAll('[data-i]').forEach(el => ES[el.dataset.i] = el.innerHTML);
  document.querySelectorAll('[data-i-alt]').forEach(el => ES[el.dataset.iAlt] = el.alt);
  document.querySelectorAll('[data-i-aria]').forEach(el => ES[el.dataset.iAria] = el.getAttribute('aria-label'));
  const TITLES = {es:'SERIE — Cada serie, anotada.', en:'SERIE — Every set, logged.'};

  function setLang(l){
    const d = l === 'en' ? EN : ES;
    document.querySelectorAll('[data-i]').forEach(el => { const v = d[el.dataset.i]; if (v != null) el.innerHTML = v; });
    document.querySelectorAll('[data-i-alt]').forEach(el => { const v = d[el.dataset.iAlt]; if (v) el.alt = v; });
    document.querySelectorAll('[data-i-aria]').forEach(el => { const v = d[el.dataset.iAria]; if (v) el.setAttribute('aria-label', v); });
    document.documentElement.lang = l === 'en' ? 'en' : 'es-MX';
    document.title = TITLES[l];
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    try { localStorage.setItem('serie-lang', l); } catch (e) {}
  }
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  let start = 'es';
  try { start = localStorage.getItem('serie-lang') || (location.hash === '#en' ? 'en' : ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en')); } catch (e) {}
  if (location.hash === '#en') start = 'en';
  setLang(start);

  // Timer de descanso de muestra (2:30 → 0:00, vuelve a empezar)
  const clock = document.getElementById('clock'), bar = document.getElementById('bar');
  const TOTAL = 150;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    let left = TOTAL;
    setInterval(() => {
      left = left <= 0 ? TOTAL : left - 1;
      clock.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      bar.style.transform = 'scaleX(' + (left / TOTAL) + ')';
    }, 1000);
  }
})();
