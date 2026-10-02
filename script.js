const WHATSAPP_NUMBER = '966555275203';

const LEADS_API_URL =
  'https://violeta.violeta-interiors.workers.dev/api/leads';

const ANALYTICS_API_URL =
  'https://violeta.violeta-interiors.workers.dev/api/analytics';

let currentLang = 'ar';

const $ = (s, scope = document) =>
  scope.querySelector(s);

const $$ = (s, scope = document) =>
  [...scope.querySelectorAll(s)];


// ======================================================
// Analytics
// ======================================================

function createSessionId() {
  if (
    window.crypto &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    '-' +
    Math.random()
      .toString(36)
      .slice(2)
  );
}


function getSessionId() {
  try {
    let sessionId =
      sessionStorage.getItem(
        'violeta_session_id'
      );

    if (!sessionId) {
      sessionId =
        createSessionId();

      sessionStorage.setItem(
        'violeta_session_id',
        sessionId
      );
    }

    return sessionId;

  } catch (error) {
    return createSessionId();
  }
}


function getSessionStartedAt() {
  try {
    let value =
      sessionStorage.getItem(
        'violeta_session_started_at'
      );

    if (!value) {
      value =
        String(Date.now());

      sessionStorage.setItem(
        'violeta_session_started_at',
        value
      );
    }

    return Number(value);

  } catch (error) {
    return Date.now();
  }
}


const analyticsSessionId =
  getSessionId();

const analyticsSessionStartedAt =
  getSessionStartedAt();


function trackEvent(
  eventName,
  step = '',
  metadata = {}
) {
  const payload = {
    session_id:
      analyticsSessionId,

    event_name:
      eventName,

    step:
      step || '',

    page:
      window.location.pathname || '/',

    metadata: {
      ...metadata,
      language:
        currentLang,

      referrer:
        document.referrer || '',

      url:
        window.location.href
    }
  };

  fetch(
    ANALYTICS_API_URL,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json'
      },

      body:
        JSON.stringify(payload),

      keepalive: true
    }
  ).catch(error => {
    console.warn(
      'Analytics event failed:',
      eventName,
      error
    );
  });
}


// ======================================================
// Page Load
// ======================================================

window.addEventListener(
  'load',
  () => {
    setTimeout(() => {
      $('#pageLoader')
        ?.classList
        .add('is-hidden');
    }, 350);

    trackEvent(
      'page_view',
      'home',
      {
        title:
          document.title
      }
    );
  }
);


window.addEventListener(
  'pagehide',
  () => {
    const durationSeconds =
      Math.max(
        0,
        Math.round(
          (
            Date.now() -
            analyticsSessionStartedAt
          ) / 1000
        )
      );

    trackEvent(
      'session_end',
      '',
      {
        duration_seconds:
          durationSeconds
      }
    );
  }
);


const yearEl =
  $('#year');

if (yearEl) {
  yearEl.textContent =
    new Date().getFullYear();
}


// ======================================================
// Header + Mobile Navigation
// ======================================================

const header =
  $('#siteHeader');

const menuToggle =
  $('#menuToggle');

const mainNav =
  $('#mainNav');


window.addEventListener(
  'scroll',
  () => {
    header
      ?.classList
      .toggle(
        'scrolled',
        window.scrollY > 25
      );
  },
  {
    passive: true
  }
);


menuToggle?.addEventListener(
  'click',
  () => {
    mainNav
      ?.classList
      .toggle('is-open');
  }
);


$$('#mainNav a').forEach(
  link => {
    link.addEventListener(
      'click',
      () => {
        mainNav
          ?.classList
          .remove('is-open');
      }
    );
  }
);


// ======================================================
// Hero Slider
// ======================================================

const heroSlides =
  $$('.hero-slide');

let heroSlideIndex = 0;


if (heroSlides.length > 1) {
  setInterval(
    () => {
      heroSlides[
        heroSlideIndex
      ]?.classList.remove(
        'is-active'
      );

      heroSlideIndex =
        (
          heroSlideIndex + 1
        ) %
        heroSlides.length;

      heroSlides[
        heroSlideIndex
      ]?.classList.add(
        'is-active'
      );
    },
    5500
  );
}


// ======================================================
// Reveal on Scroll
// ======================================================

const revealElements =
  $$('.reveal');


if (
  'IntersectionObserver'
  in window
) {
  const revealObserver =
    new IntersectionObserver(
      entries => {
        entries.forEach(
          entry => {
            if (
              entry.isIntersecting
            ) {
              entry.target
                .classList
                .add(
                  'is-visible'
                );

              revealObserver
                .unobserve(
                  entry.target
                );
            }
          }
        );
      },
      {
        threshold:
          0.12
      }
    );

  revealElements.forEach(
    element => {
      revealObserver.observe(
        element
      );
    }
  );

} else {
  revealElements.forEach(
    element => {
      element
        .classList
        .add(
          'is-visible'
        );
    }
  );
}


// ======================================================
// Gallery Filtering
// ======================================================

const filterBtns =
  $$('.filter-btn');

const galleryItems =
  $$('.gallery-item');


filterBtns.forEach(
  btn => {
    btn.addEventListener(
      'click',
      () => {
        filterBtns.forEach(
          item => {
            item.classList
              .remove(
                'is-active'
              );
          }
        );

        btn.classList.add(
          'is-active'
        );

        const filter =
          btn.dataset.filter ||
          'all';

        let visible = 0;

        galleryItems.forEach(
          item => {
            const show =
              filter === 'all' ||
              item.dataset.category ===
                filter;

            item.classList
              .toggle(
                'is-hidden',
                !show
              );

            if (show) {
              visible++;
            }
          }
        );

        const emptyGallery =
          $('#emptyGallery');

        if (emptyGallery) {
          emptyGallery.hidden =
            visible !== 0;
        }

        trackEvent(
          'gallery_filter',
          '',
          {
            filter
          }
        );
      }
    );
  }
);


// ======================================================
// Language
// ======================================================

const langToggle =
  $('#langToggle');


function setLanguage(lang) {
  currentLang = lang;

  document
    .documentElement
    .lang =
      lang;

  document
    .documentElement
    .dir =
      lang === 'ar'
        ? 'rtl'
        : 'ltr';

  $$(
    '[data-ar][data-en]'
  ).forEach(
    el => {
      const value =
        el.dataset[lang];

      if (
        value !== undefined
      ) {
        el.textContent =
          value;
      }
    }
  );

  $$(
    '[data-ph-ar][data-ph-en]'
  ).forEach(
    el => {
      el.placeholder =
        lang === 'ar'
          ? (
              el.dataset.phAr ||
              ''
            )
          : (
              el.dataset.phEn ||
              ''
            );
    }
  );

  if (langToggle) {
    langToggle.textContent =
      lang === 'ar'
        ? 'EN'
        : 'AR';
  }
}


langToggle?.addEventListener(
  'click',
  () => {
    const newLang =
      currentLang === 'ar'
        ? 'en'
        : 'ar';

    setLanguage(
      newLang
    );

    trackEvent(
      'language_change',
      '',
      {
        language:
          newLang
      }
    );
  }
);


setLanguage('ar');


// ======================================================
// Project Wizard
// ======================================================

const dialog =
  $('#projectDialog');

const progressBar =
  $('#progressBar');

let historyStack = [];
let isSubmitting = false;


const flowOrder = [
  'intro',
  'type',
  'commercial',
  'service',
  'location',
  'scope',
  'rooms',
  'details',
  'budget',
  'contact',
  'success'
];


const formData = {
  projectType: '',
  commercialType: '',
  service: '',
  region: '',
  city: '',
  scope: '',
  rooms: [],
  area: '',
  plan: '',
  budget: '',
  name: '',
  phone: '',
  email: '',
  whatsappPreferred: true,
  idempotencyKey: ''
};


// ======================================================
// Wizard Navigation
// ======================================================

function showStep(
  step,
  pushHistory = true
) {
  if (!dialog) {
    return;
  }

  const current =
    $(
      '.wizard-step.active',
      dialog
    );

  if (
    pushHistory &&
    current &&
    current.dataset.step !==
      step
  ) {
    historyStack.push(
      current.dataset.step
    );
  }

  $$(
    '.wizard-step',
    dialog
  ).forEach(
    item => {
      item.classList
        .remove(
          'active'
        );
    }
  );

  const target =
    $(
      `.wizard-step[data-step="${step}"]`,
      dialog
    );

  if (target) {
    target.classList.add(
      'active'
    );
  }

  const index =
    Math.max(
      0,
      flowOrder.indexOf(
        step
      )
    );

  if (progressBar) {
    const percentage =
      Math.max(
        7,
        (
          index /
          (
            flowOrder.length -
            1
          )
        ) * 100
      );

    progressBar.style.width =
      `${percentage}%`;
  }

  $('.dialog-shell', dialog)
    ?.scrollTo(
      {
        top: 0,
        behavior:
          'smooth'
      }
    );

  trackEvent(
    'wizard_step',
    step,
    {
      step_index:
        index,

      progress:
        Math.round(
          (
            index /
            (
              flowOrder.length -
              1
            )
          ) * 100
        )
    }
  );
}


function openWizard(
  service = ''
) {
  if (!dialog) {
    return;
  }

  historyStack = [];

  if (service) {
    formData.service =
      service;
  }

  trackEvent(
    'wizard_open',
    'intro',
    {
      preselected_service:
        service || ''
    }
  );

  showStep(
    'intro',
    false
  );

  dialog.showModal();

  document.body.style.overflow =
    'hidden';
}


function closeWizard() {
  if (!dialog) {
    return;
  }

  const currentStep =
    $(
      '.wizard-step.active',
      dialog
    )?.dataset.step || '';

  trackEvent(
    'wizard_close',
    currentStep
  );

  dialog.close();

  document.body.style.overflow =
    '';
}


$$('.js-start').forEach(
  btn => {
    btn.addEventListener(
      'click',
      () => {
        openWizard(
          btn.dataset.service ||
          ''
        );
      }
    );
  }
);


$('#dialogClose')
  ?.addEventListener(
    'click',
    closeWizard
  );


dialog?.addEventListener(
  'cancel',
  event => {
    event.preventDefault();

    closeWizard();
  }
);


$$('.wizard-next').forEach(
  btn => {
    btn.addEventListener(
      'click',
      () => {
        const next =
          btn.dataset.next;

        if (next) {
          showStep(next);
        }
      }
    );
  }
);


$$('.wizard-back').forEach(
  btn => {
    btn.addEventListener(
      'click',
      () => {
        const previous =
          historyStack.pop();

        if (previous) {
          showStep(
            previous,
            false
          );
        }
      }
    );
  }
);


$$('.choice').forEach(
  btn => {
    btn.addEventListener(
      'click',
      () => {
        const field =
          btn.dataset.field;

        const value =
          btn.dataset.value;

        if (field) {
          formData[field] =
            value || '';
        }

        trackEvent(
          'choice_selected',
          field || '',
          {
            field:
              field || '',

            value:
              value || ''
          }
        );

        const next =
          btn.dataset.next;

        if (next) {
          showStep(next);
        }
      }
    );
  }
);


// ======================================================
// Location
// ======================================================

$('#locationNext')
  ?.addEventListener(
    'click',
    () => {
      formData.region =
        $('#regionSelect')
          ?.value ||
        '';

      formData.city =
        $('#cityInput')
          ?.value.trim() ||
        '';

      if (
        !formData.region ||
        !formData.city
      ) {
        alert(
          currentLang === 'ar'
            ? 'حدد المنطقة والمدينة أول.'
            : 'Please choose the region and enter the city.'
        );

        return;
      }

      trackEvent(
        'location_completed',
        'location',
        {
          region:
            formData.region,

          city:
            formData.city
        }
      );

      showStep(
        'scope'
      );
    }
  );


// ======================================================
// Rooms
// ======================================================

$('#roomsNext')
  ?.addEventListener(
    'click',
    () => {
      formData.rooms =
        $$(
          '#roomChecks input:checked'
        )
          .map(
            input =>
              input.value
          );

      if (
        !formData.rooms.length
      ) {
        alert(
          currentLang === 'ar'
            ? 'اختَر مساحة واحدة على الأقل.'
            : 'Choose at least one space.'
        );

        return;
      }

      trackEvent(
        'rooms_completed',
        'rooms',
        {
          rooms:
            formData.rooms
        }
      );

      showStep(
        'details'
      );
    }
  );


// ======================================================
// Details
// ======================================================

$('#detailsNext')
  ?.addEventListener(
    'click',
    () => {
      formData.area =
        $('#areaInput')
          ?.value.trim() ||
        '';

      formData.plan =
        $(
          'input[name="plan"]:checked'
        )
          ?.value ||
        '';

      if (
        !formData.area
      ) {
        alert(
          currentLang === 'ar'
            ? 'اكتب المساحة التقريبية.'
            : 'Enter the approximate area.'
        );

        return;
      }

      trackEvent(
        'details_completed',
        'details',
        {
          area:
            formData.area,

          plan:
            formData.plan
        }
      );

      showStep(
        'budget'
      );
    }
  );


// ======================================================
// Idempotency Key
// ======================================================

function createIdempotencyKey() {
  if (
    window.crypto &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return crypto.randomUUID();
  }

  return (
    Date.now()
      .toString(36) +
    '-' +
    Math.random()
      .toString(36)
      .slice(2)
  );
}


// ======================================================
// Save Lead to Cloudflare Worker / D1
// ======================================================

async function saveLeadToDatabase() {
  if (
    !formData.idempotencyKey
  ) {
    formData.idempotencyKey =
      createIdempotencyKey();
  }

  const notes = [
    formData.city
      ? `City: ${formData.city}`
      : '',

    formData.scope
      ? `Scope: ${formData.scope}`
      : '',

    formData.area
      ? `Area: ${formData.area} m²`
      : '',

    formData.plan
      ? `Plan: ${formData.plan}`
      : '',

    formData.email
      ? `Email: ${formData.email}`
      : ''
  ]
    .filter(Boolean)
    .join(' | ');

  const payload = {
    name:
      formData.name ||
      '',

    mobile:
      formData.phone ||
      '',

    project_type:
      formData.projectType ||
      '',

    service:
      formData.service ||
      '',

    spaces:
      Array.isArray(
        formData.rooms
      )
        ? formData.rooms.join(
            ', '
          )
        : (
            formData.rooms ||
            ''
          ),

    region:
      formData.region ||
      '',

    budget:
      formData.budget ||
      '',

    notes,

    language:
      currentLang,

    lead_source:
      'website',

    status:
      'new',

    idempotency_key:
      formData.idempotencyKey
  };

  const response =
    await fetch(
      LEADS_API_URL,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify(
            payload
          )
      }
    );

  let result;

  try {
    result =
      await response.json();

  } catch (error) {
    throw new Error(
      `Invalid API response (${response.status})`
    );
  }

  if (
    !response.ok ||
    result?.success !== true
  ) {
    throw new Error(
      result?.error ||
      `Lead save failed (${response.status})`
    );
  }

  return result;
}


// ======================================================
// Submit Project
// ======================================================

$('#submitProject')
  ?.addEventListener(
    'click',
    async () => {
      if (
        isSubmitting
      ) {
        return;
      }

      formData.name =
        $('#nameInput')
          ?.value.trim() ||
        '';

      formData.phone =
        $('#phoneInput')
          ?.value.trim() ||
        '';

      formData.email =
        $('#emailInput')
          ?.value.trim() ||
        '';

      formData.whatsappPreferred =
        $('#whatsappPref')
          ?.checked ??
        true;

      if (
        !formData.name ||
        !formData.phone
      ) {
        alert(
          currentLang === 'ar'
            ? 'اكتب الاسم ورقم التواصل.'
            : 'Enter your name and phone number.'
        );

        return;
      }

      const submitButton =
        $('#submitProject');

      const originalText =
        submitButton
          ?.textContent ||
        '';

      isSubmitting =
        true;

      if (
        submitButton
      ) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          currentLang === 'ar'
            ? 'جاري إرسال الطلب...'
            : 'Sending...';
      }

      trackEvent(
        'lead_submit_attempt',
        'contact',
        {
          project_type:
            formData.projectType,

          service:
            formData.service,

          region:
            formData.region,

          budget:
            formData.budget
        }
      );

      try {
        const result =
          await saveLeadToDatabase();

        trackEvent(
          'lead_submitted',
          'success',
          {
            lead_id:
              result?.id ||
              '',

            project_type:
              formData.projectType,

            service:
              formData.service,

            region:
              formData.region,

            city:
              formData.city,

            budget:
              formData.budget
          }
        );

        const summaryBox =
          $('#summaryBox');

        if (summaryBox) {
          summaryBox.value =
            buildSummary();
        }

        showStep(
          'success'
        );

      } catch (error) {
        console.error(
          'Lead save failed:',
          error
        );

        trackEvent(
          'lead_submit_failed',
          'contact',
          {
            error:
              error?.message ||
              'unknown'
          }
        );

        alert(
          currentLang === 'ar'
            ? 'تعذر حفظ طلبك حاليًا. لم يتم تسجيل الطلب، حاول مرة أخرى.'
            : 'We could not save your request. Please try again.'
        );

        return;

      } finally {
        isSubmitting =
          false;

        if (
          submitButton
        ) {
          submitButton.disabled =
            false;

          submitButton.textContent =
            originalText;
        }
      }
    }
  );


// ======================================================
// Build Summary
// ======================================================

function buildSummary() {
  const roomsText =
    formData.rooms.length
      ? ` — ${formData.rooms.join('، ')}`
      : '';

  const commercialText =
    formData.commercialType
      ? ` — ${formData.commercialType}`
      : '';

  return `طلب مشروع جديد — VIOLETA

الاسم: ${formData.name}
رقم التواصل: ${formData.phone}
البريد: ${formData.email || '-'}
نوع المشروع: ${formData.projectType}${commercialText}
الخدمة: ${formData.service}
الموقع: ${formData.region} — ${formData.city}
نطاق المشروع: ${formData.scope}${roomsText}
المساحة التقريبية: ${formData.area} م²
يوجد مخطط: ${formData.plan || '-'}
الميزانية: ${formData.budget}
يفضل واتساب: ${formData.whatsappPreferred ? 'نعم' : 'لا'}

سأرفق صور/مخطط المكان في الرسالة التالية إن كانت متوفرة.`;
}


// ======================================================
// WhatsApp
// ======================================================

$('#whatsappSend')
  ?.addEventListener(
    'click',
    () => {
      trackEvent(
        'whatsapp_click',
        'success',
        {
          lead_name:
            formData.name ||
            ''
        }
      );

      const message =
        encodeURIComponent(
          buildSummary()
        );

      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
        '_blank',
        'noopener'
      );
    }
  );


// ======================================================
// Copy Summary
// ======================================================

$('#copySummary')
  ?.addEventListener(
    'click',
    async () => {
      try {
        await navigator
          .clipboard
          .writeText(
            buildSummary()
          );

        trackEvent(
          'summary_copied',
          'success'
        );

        alert(
          currentLang === 'ar'
            ? 'تم نسخ الملخص.'
            : 'Summary copied.'
        );

      } catch (error) {
        console.error(
          'Copy failed:',
          error
        );

        alert(
          currentLang === 'ar'
            ? 'تعذر نسخ الملخص.'
            : 'Could not copy the summary.'
        );
      }
    }
  );
