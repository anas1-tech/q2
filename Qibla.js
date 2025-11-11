// إحداثيات الكعبة المشرفة
const KAABA_COORDS = { lat: 21.4225, lon: 39.8262 };

// دالة حساب اتجاه القبلة من موقع المستخدم إلى الكعبة
function computeQibla(lat, lon) {
  const KaabaLat = KAABA_COORDS.lat * Math.PI / 180;
  const KaabaLon = KAABA_COORDS.lon * Math.PI / 180;
  const φ = lat * Math.PI / 180, λ = lon * Math.PI / 180;
  const y = Math.sin(KaabaLon - λ) * Math.cos(KaabaLat);
  const x = Math.cos(φ) * Math.sin(KaabaLat) - Math.sin(φ) * Math.cos(KaabaLat) * Math.cos(KaabaLon - λ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; // درجة من الشمال
}

const needle = document.getElementById('needle');
const statusEl = document.getElementById('status');
let qibla = null;

// زر البدء
document.getElementById('startBtn').addEventListener('click', startAll);

async function startAll() {
  statusEl.textContent = 'جاري طلب الأذونات...';

  // iOS: طلب إذن لاستخدام مستشعر الاتجاه
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

  // GPS
  if (!navigator.geolocation) {
    statusEl.textContent = '❌ المتصفح لا يدعم GPS.';
    return;
  }

  statusEl.textContent = 'جاري تحديد الموقع...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      qibla = computeQibla(pos.coords.latitude, pos.coords.longitude);
      statusEl.textContent = 'حرّك الهاتف حتى يثبت السهم على القبلة.';
      window.addEventListener('deviceorientation', onOrient, true);
    },
    _ => {
      statusEl.textContent = '❌ فشل تحديد الموقع. فعّل GPS ومنح الإذن.';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

let current = 0;
function norm(deg) {
  let d = (deg % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function onOrient(e) {
  if (qibla == null) return;

  let heading = (typeof e.webkitCompassHeading === 'number')
    ? e.webkitCompassHeading
    : (360 - (e.alpha || 0));

  if (isNaN(heading)) {
    statusEl.textContent = '⚠️ فعّل مستشعر الحركة.';
    return;
  }

  // الفرق بين اتجاه الجهاز واتجاه القبلة الحقيقي
  let target = qibla - heading;
  let delta = norm(target - current);
  current = lerp(current, current + delta, 0.22);
  needle.style.transform = `translate(-50%, 0) rotate(${current}deg)`;

  // ✅ لا يتم عرض الرسالة إلا إذا الاتجاه مضبوط تمامًا على القبلة
  const isExactQibla = Math.abs(norm(target)) <= 0.5; // نصف درجة فقط سماحية
  if (isExactQibla) {
    statusEl.textContent = 'اتجاه القبلة صحيح ✅';
    statusEl.classList.add('success');
    if (navigator.vibrate) navigator.vibrate([0, 40, 40, 40]);
  } else {
    statusEl.classList.remove('success');
    statusEl.textContent = 'اضغط ابدأ ثم حرّك الهاتف حتى يثبت السهم على القبلة.';
  }
}
