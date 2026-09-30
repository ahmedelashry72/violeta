const WHATSAPP_NUMBER = '966555275203';
let currentLang = 'ar';
const $ = (s, scope=document) => scope.querySelector(s);
const $$ = (s, scope=document) => [...scope.querySelectorAll(s)];

window.addEventListener('load',()=>setTimeout(()=>$('#pageLoader')?.classList.add('is-hidden'),350));
$('#year').textContent = new Date().getFullYear();

// Header + mobile nav
const header = $('#siteHeader');
const menuToggle = $('#menuToggle');
const mainNav = $('#mainNav');
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>25),{passive:true});
menuToggle.addEventListener('click',()=>mainNav.classList.toggle('is-open'));
$$('#mainNav a').forEach(a=>a.addEventListener('click',()=>mainNav.classList.remove('is-open')));

// Hero slider
const heroSlides = $$('.hero-slide');
let heroSlideIndex = 0;
setInterval(()=>{
  heroSlides[heroSlideIndex].classList.remove('is-active');
  heroSlideIndex = (heroSlideIndex+1)%heroSlides.length;
  heroSlides[heroSlideIndex].classList.add('is-active');
},5500);

// Reveal on scroll
const revealObserver = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target)}})
},{threshold:.12});
$$('.reveal').forEach(el=>revealObserver.observe(el));

// Gallery filtering
const filterBtns = $$('.filter-btn');
const galleryItems = $$('.gallery-item');
filterBtns.forEach(btn=>btn.addEventListener('click',()=>{
  filterBtns.forEach(b=>b.classList.remove('is-active')); btn.classList.add('is-active');
  const filter=btn.dataset.filter; let visible=0;
  galleryItems.forEach(item=>{
    const show=filter==='all'||item.dataset.category===filter;
    item.classList.toggle('is-hidden',!show); if(show) visible++;
  });
  $('#emptyGallery').hidden=visible!==0;
}));

// Language
const langToggle = $('#langToggle');
function setLanguage(lang){
  currentLang=lang;
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  $$('[data-ar][data-en]').forEach(el=>{el.textContent=el.dataset[lang]});
  $$('[data-ph-ar][data-ph-en]').forEach(el=>{el.placeholder=lang==='ar'?el.dataset.phAr:el.dataset.phEn});
  langToggle.textContent=lang==='ar'?'EN':'AR';
}
langToggle.addEventListener('click',()=>setLanguage(currentLang==='ar'?'en':'ar'));
setLanguage('ar');

// Project wizard
const dialog = $('#projectDialog');
const progressBar = $('#progressBar');
let historyStack=[];
const flowOrder=['intro','type','commercial','service','location','scope','rooms','details','budget','contact','success'];
const formData={projectType:'',commercialType:'',service:'',region:'',city:'',scope:'',rooms:[],area:'',plan:'',budget:'',name:'',phone:'',email:'',whatsappPreferred:true};

function showStep(step,pushHistory=true){
  const current=$('.wizard-step.active',dialog);
  if(pushHistory&&current&&current.dataset.step!==step) historyStack.push(current.dataset.step);
  $$('.wizard-step',dialog).forEach(s=>s.classList.remove('active'));
  const target=$(`.wizard-step[data-step="${step}"]`,dialog); if(target) target.classList.add('active');
  const idx=Math.max(0,flowOrder.indexOf(step)); progressBar.style.width=`${Math.max(7,(idx/(flowOrder.length-1))*100)}%`;
  $('.dialog-shell',dialog).scrollTo({top:0,behavior:'smooth'});
}
function openWizard(service=''){
  historyStack=[]; if(service) formData.service=service; showStep('intro',false); dialog.showModal(); document.body.style.overflow='hidden';
}
function closeWizard(){dialog.close();document.body.style.overflow=''}
$$('.js-start').forEach(btn=>btn.addEventListener('click',()=>openWizard(btn.dataset.service||'')));
$('#dialogClose').addEventListener('click',closeWizard);
dialog.addEventListener('cancel',e=>{e.preventDefault();closeWizard()});
$$('.wizard-next').forEach(btn=>btn.addEventListener('click',()=>showStep(btn.dataset.next)));
$$('.wizard-back').forEach(btn=>btn.addEventListener('click',()=>{const prev=historyStack.pop();if(prev)showStep(prev,false)}));
$$('.choice').forEach(btn=>btn.addEventListener('click',()=>{
  const field=btn.dataset.field,value=btn.dataset.value;if(field)formData[field]=value;
  if(btn.dataset.next)showStep(btn.dataset.next);
}));
$('#locationNext').addEventListener('click',()=>{
  formData.region=$('#regionSelect').value;formData.city=$('#cityInput').value.trim();
  if(!formData.region||!formData.city){alert(currentLang==='ar'?'حدد المنطقة والمدينة أول.':'Please choose the region and enter the city.');return}showStep('scope');
});
$('#roomsNext').addEventListener('click',()=>{
  formData.rooms=$$('#roomChecks input:checked').map(i=>i.value);
  if(!formData.rooms.length){alert(currentLang==='ar'?'اختَر مساحة واحدة على الأقل.':'Choose at least one space.');return}showStep('details');
});
$('#detailsNext').addEventListener('click',()=>{
  formData.area=$('#areaInput').value;formData.plan=$('input[name="plan"]:checked')?.value||'';
  if(!formData.area){alert(currentLang==='ar'?'اكتب المساحة التقريبية.':'Enter the approximate area.');return}showStep('budget');
});
$('#submitProject').addEventListener('click',()=>{
  saveLeadToDatabase();
  formData.name=$('#nameInput').value.trim();formData.phone=$('#phoneInput').value.trim();formData.email=$('#emailInput').value.trim();formData.whatsappPreferred=$('#whatsappPref').checked;
  if(!formData.name||!formData.phone){alert(currentLang==='ar'?'اكتب الاسم ورقم التواصل.':'Enter your name and phone number.');return}
  $('#summaryBox').value=buildSummary();showStep('success');
});
function buildSummary(){
  return `طلب مشروع جديد — VIOLETA\n\nالاسم: ${formData.name}\nرقم التواصل: ${formData.phone}\nالبريد: ${formData.email||'-'}\nنوع المشروع: ${formData.projectType}${formData.commercialType?` — ${formData.commercialType}`:''}\nالخدمة: ${formData.service}\nالموقع: ${formData.region} — ${formData.city}\nنطاق المشروع: ${formData.scope}${formData.rooms.length?` — ${formData.rooms.join('، ')}`:''}\nالمساحة التقريبية: ${formData.area} م²\nيوجد مخطط: ${formData.plan||'-'}\nالميزانية: ${formData.budget}\nيفضل واتساب: ${formData.whatsappPreferred?'نعم':'لا'}\n\nسأرفق صور/مخطط المكان في الرسالة التالية إن كانت متوفرة.`;
}
$('#whatsappSend').addEventListener('click',()=>window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildSummary())}`,'_blank','noopener'));
$('#copySummary').addEventListener('click',async()=>{await navigator.clipboard.writeText(buildSummary());alert(currentLang==='ar'?'تم نسخ الملخص.':'Summary copied.')});
async function saveLeadToDatabase(){
  const payload={
    name:formData.name||'',
    mobile:formData.phone||'',
    project_type:formData.projectType||'',
    service:formData.service||'',
    spaces:Array.isArray(formData.rooms)?formData.rooms.join(', '):(formData.rooms||''),
    region:formData.region||'',
    budget:formData.budget||'',
    notes:formData.details||'',
    language:currentLang,
    lead_source:'website',
    status:'new'
  };
  const response=await fetch('/api/leads',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  if(!response.ok)throw new Error('Lead save failed');
  return response.json();
}
