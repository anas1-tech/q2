const KAABA = { lat: 21.4225, lon: 39.8262 };
const needle = document.getElementById('needle');
const kaabaMarker = document.getElementById('kaabaMarker');
const statusEl = document.getElementById('status');
let qibla = null;
let current = 0;

document.getElementById('startBtn').addEventListener('click', startAll);

// حساب اتجاه القبلة من موقع المستخدم
function computeQibla(lat, lon){
  const KaabaLat = KAABA.lat * Math.PI/180;
  const KaabaLon = KAABA.lon * Math.PI/180;
  const φ = lat * Math.PI/180, λ = lon * Math.PI/180;
  const y = Math.sin(KaabaLon - λ) * Math.cos(KaabaLat);
  const x = Math.cos(φ)*Math.sin(KaabaLat) - Math.sin(φ)*Math.cos(KaabaLat)*Math.cos(KaabaLon - λ);
  return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
}

async function startAll(){
  statusEl.textContent = 'جاري طلب الأذونات...';

  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'){
    try{
      const res = await DeviceOrientationEvent.requestPermission();
      if(res !== 'granted'){ statusEl.textContent = '❌ لم يتم منح إذن البوصلة.'; return; }
    }catch(e){ statusEl.textContent = '❌ تعذّر إذن البوصلة.'; return; }
  }

  if(!navigator.geolocation){ statusEl.textContent='❌ لا يوجد GPS.'; return; }

  statusEl.textContent='جاري تحديد الموقع...';
  navigator.geolocation.getCurrentPosition(pos=>{
    qibla = computeQibla(pos.coords.latitude, pos.coords.longitude);
    updateKaabaMarker();
    statusEl.textContent='حرّك الهاتف حتى يثبت السهم على القبلة.';
    window.addEventListener('deviceorientation', onOrient, true);
  }, _=>{
    statusEl.textContent='❌ فشل تحديد الموقع.';
  }, {enableHighAccuracy:true, timeout:10000});
}

function norm(deg){ let d=(deg%360+360)%360; if(d>180)d-=360; return d; }
function lerp(a,b,t){ return a+(b-a)*t; }

function updateKaabaMarker(){
  if(!kaabaMarker || qibla==null) return;
  kaabaMarker.style.transform =
    `translate(-50%, -50%) rotate(${qibla}deg) translateY(-120px) rotate(${-qibla}deg)`;
  kaabaMarker.style.opacity = '1';
}

function onOrient(e){
  if(qibla==null) return;
  let heading = (typeof e.webkitCompassHeading==='number') ? e.webkitCompassHeading : (360 - (e.alpha||0));
  if(isNaN(heading)) { statusEl.textContent='⚠️ فعّل مستشعر الحركة.'; return; }

  const target = qibla - heading;
  const delta  = norm(target - current);
  current = lerp(current, current + delta, 0.22);
  needle.style.transform = `translate(-50%, 0) rotate(${current}deg)`;

  const ok = Math.abs(norm(target)) <= 0.5;
  if(ok){
    statusEl.textContent = 'اتجاه القبلة صحيح ✅';
    statusEl.classList.add('success');
    if(navigator.vibrate) navigator.vibrate([0,40,40,40]);
  }else{
    statusEl.classList.remove('success');
    statusEl.textContent = 'اضغط ابدأ ثم حرّك الهاتف حتى يثبت السهم على القبلة.';
  }
}
