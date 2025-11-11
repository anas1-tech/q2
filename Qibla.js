const KAABA = { lat: 21.4225, lon: 39.8262 };
const compass = document.getElementById('compass');
const kaabaMarker = document.getElementById('kaabaMarker');
const statusEl = document.getElementById('status');
let qibla = null;

// عند الضغط على زر البدء
document.getElementById('startBtn').addEventListener('click', startAll);

async function startAll(){
  statusEl.textContent = 'جاري طلب الأذونات...';

  // iOS: إذن المستشعر
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
    statusEl.textContent='وجّه الهاتف نحو الكعبة.';
    window.addEventListener('deviceorientation', onOrient, true);
  }, _=>{
    statusEl.textContent='❌ فشل تحديد الموقع.';
  }, {enableHighAccuracy:true, timeout:10000});
}

// حساب زاوية القبلة من موقع المستخدم
function computeQibla(lat, lon){
  const KaabaLat = KAABA.lat * Math.PI/180;
  const KaabaLon = KAABA.lon * Math.PI/180;
  const φ = lat * Math.PI/180, λ = lon * Math.PI/180;
  const y = Math.sin(KaabaLon - λ) * Math.cos(KaabaLat);
  const x = Math.cos(φ)*Math.sin(KaabaLat) - Math.sin(φ)*Math.cos(KaabaLat)*Math.cos(KaabaLon - λ);
  return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
}

function norm(deg){ let d=(deg%360+360)%360; if(d>180)d-=360; return d; }

function updateKaabaMarker(){
  if(!kaabaMarker || qibla==null) return;
  kaabaMarker.style.transform =
    `translate(-50%, -50%) rotate(${qibla}deg) translateY(-120px) rotate(${-qibla}deg)`;
}

function onOrient(e){
  if(qibla==null) return;

  let heading = (typeof e.webkitCompassHeading==='number') ? e.webkitCompassHeading : (360 - (e.alpha||0));
  if(isNaN(heading)) { statusEl.textContent='⚠️ فعّل مستشعر الحركة.'; return; }

  // تدوير البوصلة حسب اتجاه الجوال
  compass.style.transform = `rotate(${heading}deg)`;

  // الفرق بين اتجاه الجوال والقبلة
  const diff = Math.abs(norm(qibla - heading));

  if(diff <= 1.5){
    statusEl.textContent = 'اتجاه القبلة صحيح ✅';
    statusEl.classList.add('success');
    if(navigator.vibrate) navigator.vibrate([0,40,40,40]);
  }else{
    statusEl.classList.remove('success');
    statusEl.textContent = 'وجّه الهاتف نحو الكعبة.';
  }
}
