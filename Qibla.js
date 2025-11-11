const KAABA = { lat: 21.4225, lon: 39.8262 };
const needle = document.getElementById('needle');
const kaabaMarker = document.getElementById('kaabaMarker');
const statusEl = document.getElementById('status');

let qibla = null;
let currentRotation = 0;

// عند الضغط على زر "ابدأ"
document.getElementById('startBtn').addEventListener('click', startAll);

async function startAll() {
  statusEl.textContent = 'جاري طلب الأذونات...';

  // إذن مستشعر الاتجاه لـ iOS
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') {
        statusEl.textContent = '❌ لم يتم منح إذن البوصلة.';
        return;
      }
    } catch (e) {
      statusEl.textContent = '❌ تعذّر إذن البوصلة.';
      return;
    }
  }

  // موقع المستخدم
  if (!navigator.geolocation) {
    statusEl.textContent = '❌ لا يوجد GPS.';
    return;
  }

  statusEl.textContent = 'جاري تحديد الموقع...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      qibla = computeQibla(pos.coords.latitude, pos.coords.longitude);
      updateKaabaMarker();
      statusEl.textContent = 'وجّه الهاتف نحو الكعبة.';
      window.addEventListener('deviceorientation', onOrient, true);
    },
    _ => {
      statusEl.textContent = '❌ فشل تحديد الموقع.';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// حساب زاوية القبلة من موقع المستخدم
function computeQibla(lat, lon) {
  const KaabaLat = KAABA.lat * Math.PI / 180;
  const KaabaLon = KAABA.lon * Math.PI / 180;
  const φ = lat * Math.PI / 180, λ = lon * Math.PI / 180;
  const y = Math.sin(KaabaLon - λ) * Math.cos(KaabaLat);
  const x = Math.cos(φ) * Math.sin(KaabaLat) - Math.sin(φ) * Math.cos(KaabaLat) * Math.cos(KaabaLon - λ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function norm(deg) {
  let d = (deg % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

// تحديث موقع الكعبة الثابت في البوصلة
function updateKaabaMarker() {
  if (!kaabaMarker || qibla == null) return;
  kaabaMarker.style.transform =
    `translate(-50%, -50%) rotate(${qibla}deg) translateY(-120px) rotate(${-qibla}deg)`;
}

// تحديث حركة الإبرة حسب دوران الجهاز
function onOrient(e) {
  if (qibla == null) return;

  let heading = (typeof e.webkitCompassHeading === 'number')
    ? e.webkitCompassHeading
    : (360 - (e.alpha || 0));

  if (isNaN(heading)) {
    statusEl.textContent = '⚠️ فعّل مستشعر الحركة.';
    return;
  }

  // الفرق بين اتجاه الجوال والقبلة
  const targetAngle = heading - qibla;
  const delta = norm(targetAngle - currentRotation);
  currentRotation += delta * 0.22; // حركة ناعمة

compass.style.transform = `rotate(${heading}deg)`;

  const diff = Math.abs(norm(heading - qibla));
  if (diff <= 1.5) {
    statusEl.textContent = 'اتجاه القبلة صحيح ✅';
    statusEl.classList.add('success');
    if (navigator.vibrate) navigator.vibrate([0, 40, 40, 40]);
  } else {
    statusEl.classList.remove('success');
    statusEl.textContent = 'وجّه الهاتف نحو الكعبة.';
  }
}
