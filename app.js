const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('[data-view]');
const toast = document.querySelector('#toast');
let map;

const parkingLocationCatalog = {
  yuleStreet: { id: 'yuleStreet', name: '育樂街路邊機車格', location: '育樂街 · 成功大學旁', currentCapacity: 94, source: 'government_data', updatedAt: '2026/08/31' },
  universityRoad: { id: 'universityRoad', name: '大學路機車停車區', location: '大學路一段 · 東側', currentCapacity: 64, source: 'government_data', updatedAt: '2026/08/31' },
  lightRestoration: { id: 'lightRestoration', name: '成大光復校區周邊', location: '勝利路 · 光復校區', currentCapacity: 28, source: 'government_data', updatedAt: '2026/08/31' }
};
const REPORT_STORAGE_KEY = 'deal-parking-reports-v1';

function seedReports() {
  const existing = localStorage.getItem(REPORT_STORAGE_KEY);
  if (existing) return;
  const seeded = [
    { id: 'rpt-001', parking_id: 'yuleStreet', user_id: 'demo-user', current_capacity: 94, reported_capacity: 76, note: '部分停車格已取消，現場標線不一致。', status: 'pending', created_at: '2026-08-31T08:30:00Z', reviewed_at: null, reviewed_by: null, photos: ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80'], capacity_source: 'user_report_verified' },
    { id: 'rpt-002', parking_id: 'universityRoad', user_id: 'demo-user', current_capacity: 64, reported_capacity: 82, note: '新增了兩排機車位。', status: 'approved', created_at: '2026-08-21T09:10:00Z', reviewed_at: '2026-08-22T10:15:00Z', reviewed_by: 'admin-demo', photos: [], capacity_source: 'admin_verified' },
    { id: 'rpt-003', parking_id: 'lightRestoration', user_id: 'demo-user', current_capacity: 28, reported_capacity: 14, note: '現場只剩少數格位。', status: 'rejected', created_at: '2026-08-17T15:05:00Z', reviewed_at: '2026-08-18T09:00:00Z', reviewed_by: 'admin-demo', photos: [], capacity_source: 'government_data' }
  ];
  localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(seeded));
}

function getReports() {
  const raw = localStorage.getItem(REPORT_STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (error) { return []; }
}

function saveReports(reports) {
  localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function renderShops(shops) {
  const grid = document.querySelector('#shop-grid');
  if (!grid) return;
  const foodShops = shops.filter(shop => shop.main_category.includes('飲食')).slice(0, 8);
  grid.innerHTML = foodShops.map((shop, index) => `
    <article class="shop-card ${index === 0 ? 'feature' : ''}">
      <div class="shop-image shop-photo shop-photo-${index % 3}"><span>${index === 0 ? '育樂街店家' : '附近店家'}</span></div>
      <div class="shop-body"><div class="shop-type">${shop.shop_type || 'SHOP'} · ${index + 3} min walk</div>
      <h3>${shop.name_zh}</h3><p>${shop.weekday_hours ? `平日營業：${shop.weekday_hours.replaceAll('\n', ' · ')}` : '營業時間請以店家公告為準。'}</p>
      <div class="shop-footer"><span class="friendly">✓ 店家資料已定位</span><a class="round-arrow" href="${shop.google_maps_url}" target="_blank" rel="noopener" aria-label="在 Google Maps 開啟 ${shop.name_zh}">↗</a></div></div>
    </article>`).join('');
}

fetch('shops.json').then(response => response.json()).then(renderShops).catch(() => {
  const grid = document.querySelector('#shop-grid');
  if (grid) grid.innerHTML = '<p class="loading">目前無法載入店家資料。</p>';
});

document.querySelectorAll('.parking-meta span').forEach(element => { element.textContent = '即時空位：尚未連線'; });
document.querySelector('.intent-card.walk strong').textContent = '步行';
document.querySelector('.intent-card.walk small').textContent = '探索附近好去處';
document.querySelector('.parking-card .park-btn').firstChild.textContent = '選擇此位置 ';

function updateParkingCardDisplay() {
  document.querySelectorAll('.parking-card').forEach(card => {
    const parkingId = card.dataset.parkingId;
    const detail = parkingLocationCatalog[parkingId];
    if (!detail) return;
    const currentValue = card.querySelector('.parking-meta strong');
    const metaLine = card.querySelector('.parking-meta span');
    if (currentValue) currentValue.textContent = `容量 ${detail.currentCapacity} 格`;
    if (metaLine) metaLine.textContent = `資料更新：${detail.updatedAt}`;
    const reportButton = card.querySelector('.report-link');
    if (reportButton) {
      reportButton.dataset.locationName = detail.name;
      reportButton.dataset.location = detail.location;
      reportButton.dataset.currentCapacity = detail.currentCapacity;
      reportButton.dataset.parkingId = detail.id;
    }
  });
}

const quizKey = `deal-quiz-${new Date().toISOString().slice(0, 10)}`;
const pointsBalance = document.querySelector('.points-hero strong');
const authActions = document.createElement('div');
authActions.className = 'auth-actions';
authActions.innerHTML = '<button id="google-login">使用 Google 登入</button><button id="email-login">使用 Email 登入</button><small>目前為 prototype；正式登入需要 Firebase 設定。</small>';
document.querySelector('#profile .profile-card').after(authActions);
authActions.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { toast.textContent = '請先完成 Firebase 設定，再啟用正式登入。'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }));
StepService.getTodaySteps().then(steps => {
  PointsLedgerService.awardWalkingMilestones(steps);
  const walkingPoints = Math.min(Math.floor(steps / 500), 20);
  document.querySelector('.walking-summary strong').textContent = steps.toLocaleString();
  document.querySelector('.walking-summary .summary-stat:last-of-type b').textContent = `${walkingPoints} P`;
  const rankElement = document.querySelector('.walking-summary .summary-stat b');
  if (rankElement) rankElement.textContent = `#${LeaderboardService.getUserRank('me', 'daily')}`;
  document.querySelector('.walking-summary small').innerHTML = '今日步數 <i class="mock-label">示範資料</i>';
  if (pointsBalance) pointsBalance.textContent = PointsLedgerService.getBalance();
});
document.querySelectorAll('[data-answer]').forEach(option => option.addEventListener('click', () => {
  const result = document.querySelector('.quiz-result');
  if (localStorage.getItem(quizKey)) { result.textContent = '今天已完成，明天再來挑戰。'; return; }
  const correct = option.dataset.answer === 'right';
  result.textContent = correct ? '答對了！已獲得 +1 point。' : '再想一下：行人空間應保持連續暢通。';
  if (correct) {
    localStorage.setItem(quizKey, 'completed');
    if (pointsBalance) pointsBalance.textContent = String(Number(pointsBalance.textContent) + 1);
    document.querySelectorAll('[data-answer]').forEach(item => { item.disabled = true; item.classList.toggle('correct', item.dataset.answer === 'right'); });
  }
}));

function showView(id) {
  views.forEach(view => view.classList.toggle('active', view.id === id));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === id));
  if (id === 'ride') initMap();
  if (id === 'admin') renderAdminReports();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navItems.forEach(item => item.addEventListener('click', () => showView(item.dataset.view)));

function renderLeaderboard(period = 'daily') {
  const list = document.querySelector('#leaderboard-list');
  if (!list) return;
  const rows = LeaderboardService.get(period);
  list.innerHTML = rows.slice(0, 20).map((user, index) => `<div class="leader-row ${user.id === 'me' ? 'current' : ''}"><b>${index + 1}</b><span class="leader-photo">${user.photo}</span><span class="leader-name">${user.displayName}</span><span class="leader-steps">${user[period].toLocaleString()} 步</span></div>`).join('');
  const currentIndex = rows.findIndex(user => user.id === 'me');
  if (currentIndex >= 20) list.insertAdjacentHTML('beforeend', `<div class="leader-separator">…</div><div class="leader-row current"><b>${currentIndex + 1}</b><span class="leader-photo">M</span><span class="leader-name">我</span><span class="leader-steps">${rows[currentIndex][period].toLocaleString()} 步</span></div>`);
}

document.querySelector('[data-view="leaderboard"]').addEventListener('click', event => { event.stopPropagation(); showView('leaderboard'); renderLeaderboard(); });
document.querySelector('.avatar').addEventListener('click', () => showView('profile'));
document.querySelectorAll('.leader-tabs button').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.leader-tabs button').forEach(item => item.classList.remove('active'));
  tab.classList.add('active'); renderLeaderboard(tab.dataset.period);
}));
document.querySelector('.privacy-setting input').addEventListener('change', event => { localStorage.setItem('deal-leaderboard-opt-in', String(event.target.checked)); });

document.querySelector('.park-btn').addEventListener('click', () => {
  toast.textContent = '已選擇停車位置。準備開始步行！';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
});

document.querySelectorAll('.add-btn').forEach(button => button.addEventListener('click', () => {
  button.textContent = '✓';
  button.style.background = 'var(--mint)';
  button.style.color = 'var(--ink)';
  const orderStatus = document.querySelector('.order-status');
  if (orderStatus) orderStatus.textContent = 'CART 1';
}));

function initMap() {
  if (map) { map.invalidateSize(); return; }
  map = L.map('map', { zoomControl: false, attributionControl: true }).setView([22.9957, 120.2153], 16);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  fetch('detection_points.geojson').then(response => response.json()).then(data => {
    const aggregate = ParkingAggregationService.aggregate(data.features);
    const observationFeatures = ParkingAggregationService.clusterForDisplay(data.features).map(point => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] }, properties: { street: '育樂街', motorcycleSpaces: point.motorcycleSpaces, observationCount: point.observationCount } }));
    const layer = L.geoJSON(observationFeatures, { pointToLayer: (feature, latlng) => {
      const count = feature.properties.motorcycleSpaces;
      return L.circleMarker(latlng, { radius: count ? 6 : 4, color: count ? '#ee8066' : '#55aa88', fillColor: count ? '#ee8066' : '#91cbb5', fillOpacity: .78, weight: 1 });
    }, onEachFeature: (feature, layer) => {
      layer.bindPopup(`<strong>${feature.properties.street}</strong><br>機車位：${feature.properties.motorcycleSpaces}`);
    }}).addTo(map);
    document.querySelector('.legend-count').textContent = `${observationFeatures.length} 個觀察群組（每組約 4 點）`;
    const estimatedCapacity = aggregate.streets.reduce((sum, street) => sum + street.motorcycleSpaces, 0);
    const firstCapacity = document.querySelector('.parking-card strong');
    const firstLabel = document.querySelector('.parking-card .parking-meta span');
    if (firstCapacity) firstCapacity.textContent = `影像推估 ${estimatedCapacity} 格`;
    if (firstLabel) firstLabel.textContent = '非即時資料 · ZenSVI';
    if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [25, 25] });
  }).catch(() => {
    L.marker([22.9957, 120.2153]).addTo(map).bindPopup('育樂街研究範圍').openPopup();
  });
}

const translations = {
  en: {
    location: 'Yule Street · Tainan',
    qrTitle: 'Scan to open DEAL',
    qrCopy: 'Scan with your phone to carry your parking and walking journey.',
    toast: 'Parking spot selected. Your walk is ready!'
  },
  zh: {
    location: '育樂街 · Tainan',
    qrTitle: '掃描開啟 DEAL',
    qrCopy: '使用手機掃描，開始您的停車及步行旅程。',
    toast: '已選擇停車位置，準備開始步行！'
  }
};
let language = 'zh';

document.querySelector('#language-toggle').addEventListener('click', () => {
  language = language === 'zh' ? 'en' : 'zh';
  const copy = translations[language];
  document.querySelector('#language-toggle').textContent = language === 'zh' ? 'EN' : '中';
  document.querySelector('[data-i18n="location"]').textContent = copy.location;
  document.querySelector('#qr-title').textContent = copy.qrTitle;
  document.querySelector('#qr-copy').textContent = copy.qrCopy;
  document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
  const bilingual = language === 'en' ? {
    '.hero h1': 'How do you<br><em>want to walk?</em>', '.hero-lede': 'Start with one parking spot, then walk through Yule Street.<br>Explore shops, complete walking challenges and earn rewards.',
    '.ride h2': 'Find a good spot.', '.ride .section-heading p:not(.eyebrow)': 'Park once, then walk the rest of the way.',
    '.walk h2': 'Take it slow.', '.walk .section-heading p:not(.eyebrow)': 'Explore something good nearby.',
    '.points h2': 'Walk, earn rewards.', '.points .section-heading p:not(.eyebrow)': 'Complete routes and the daily quiz to redeem local offers.',
    '.intent-card.ride strong': 'Ride', '.intent-card.ride small': 'Find parking, keep walking', '.intent-card.walk strong': 'Walk', '.intent-card.walk small': 'Explore nearby places', '.intent-card.points strong': 'Points', '.intent-card.points small': 'Daily quiz, local rewards',
    '.bottom-nav .nav-item:nth-child(1)': '⌂ Home', '.bottom-nav .nav-item:nth-child(2)': '◎ Park', '.bottom-nav .nav-item:nth-child(3)': '⌁ Explore', '.bottom-nav .nav-item:nth-child(4)': '＋ Order'
  } : {
    '.hero h1': '今天，想要<br><em>什麼？</em>', '.hero-lede': '從一個停車位開始，慢慢走進育樂街。<br>用餐、逛街、取餐，一次完成。',
    '.ride h2': '尋找合適的位置。', '.ride .section-heading p:not(.eyebrow)': '停好車，接下來的路用走的。', '.walk h2': '附近，慢慢走。', '.walk .section-heading p:not(.eyebrow)': '今天適合步行探索的店家。', '.points h2': '步行，獲得回饋。', '.points .section-heading p:not(.eyebrow)': '完成步行路線與每日 Quiz，兌換附近店家的優惠。',
    '.intent-card.ride strong': '騎車', '.intent-card.ride small': '找到位置後繼續步行', '.intent-card.walk strong': '步行', '.intent-card.walk small': '探索附近好去處', '.intent-card.points strong': '積分', '.intent-card.points small': '每日挑戰，兌換優惠',
    '.bottom-nav .nav-item:nth-child(1)': '⌂ 主頁', '.bottom-nav .nav-item:nth-child(2)': '◎ 停車', '.bottom-nav .nav-item:nth-child(3)': '⌁ 探索', '.bottom-nav .nav-item:nth-child(4)': '＋ 點餐'
  };
  Object.entries(bilingual).forEach(([selector, value]) => { const element = document.querySelector(selector); if (element) element.innerHTML = value; });
});

document.querySelector('#qr-toggle').addEventListener('click', () => {
  const modal = document.querySelector('#qr-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.querySelector('#qr-url').textContent = window.location.href;
  document.querySelector('#qrcode').replaceChildren();
  if (window.QRCode) new QRCode(document.querySelector('#qrcode'), { text: window.location.href, width: 180, height: 180, colorDark: '#18251f', colorLight: '#ffffff' });
});
document.querySelector('#qr-close').addEventListener('click', () => {
  document.querySelector('#qr-modal').classList.remove('open');
  document.querySelector('#qr-modal').setAttribute('aria-hidden', 'true');
});

function openReportSheet(trigger) {
  const title = document.querySelector('#report-sheet-title');
  const locationName = document.querySelector('#report-location-name');
  const currentCapacity = document.querySelector('#report-current-capacity');
  const reportForm = document.querySelector('#report-form');
  const reportSuccess = document.querySelector('#report-success');
  const photoInput = document.querySelector('#report-photo-input');
  const noteField = document.querySelector('#report-note');
  const capacityField = document.querySelector('#reported-capacity');
  const backdrop = document.querySelector('#report-sheet-backdrop');
  reportForm.classList.remove('hidden');
  reportSuccess.classList.remove('show');
  const parkingId = trigger.dataset.parkingId || 'yuleStreet';
  const parking = parkingLocationCatalog[parkingId];
  const capacity = Number(trigger.dataset.currentCapacity || parking.currentCapacity || 0);
  title.textContent = '回報停車位資料';
  locationName.textContent = `${trigger.dataset.locationName || parking.name} · ${trigger.dataset.location || parking.location}`;
  currentCapacity.textContent = `目前資料：${capacity} 格`;
  capacityField.value = '';
  capacityField.min = '0';
  noteField.value = '';
  photoInput.value = '';
  renderPhotoPreview([]);
  reportForm.dataset.parkingId = parkingId;
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
}

function closeReportSheet() {
  const backdrop = document.querySelector('#report-sheet-backdrop');
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
}

function renderPhotoPreview(files) {
  const preview = document.querySelector('#photo-preview');
  preview.innerHTML = files.map((file, index) => `
    <div class="photo-thumb">
      <button type="button" class="photo-remove" data-photo-index="${index}" aria-label="Remove photo">×</button>
      <img src="${file}" alt="Uploaded report image ${index + 1}">
    </div>
  `).join('');
}

document.addEventListener('click', event => {
  const reportTrigger = event.target.closest('.report-link');
  if (reportTrigger) {
    openReportSheet(reportTrigger);
    return;
  }

  const tab = event.target.closest('[data-admin-filter]');
  if (tab) {
    document.querySelectorAll('[data-admin-filter]').forEach(button => button.classList.toggle('active', button === tab));
    renderAdminReports(tab.dataset.adminFilter);
    return;
  }

  const reportAction = event.target.closest('[data-report-action]');
  if (reportAction) {
    const reportId = reportAction.dataset.reportId;
    const action = reportAction.dataset.reportAction;
    applyReportDecision(reportId, action);
    return;
  }

  const photoRemove = event.target.closest('.photo-remove');
  if (photoRemove) {
    const input = document.querySelector('#report-photo-input');
    const current = Array.from(input.files || []);
    current.splice(Number(photoRemove.dataset.photoIndex), 1);
    const dataTransfer = new DataTransfer();
    current.forEach(file => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
    const urls = Array.from(input.files || []).map(file => URL.createObjectURL(file));
    renderPhotoPreview(urls);
    return;
  }

  if (event.target.closest('#report-close') || event.target.closest('#report-sheet-backdrop') && event.target === document.querySelector('#report-sheet-backdrop')) {
    closeReportSheet();
  }
});

document.querySelector('#report-photo-input').addEventListener('change', event => {
  const files = Array.from(event.target.files || []).slice(0, 3);
  const dataTransfer = new DataTransfer();
  files.forEach(file => dataTransfer.items.add(file));
  event.target.files = dataTransfer.files;
  renderPhotoPreview(files.map(file => URL.createObjectURL(file)));
});

document.querySelector('#report-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const parkingId = form.dataset.parkingId || 'yuleStreet';
  const capacityValue = Number(document.querySelector('#reported-capacity').value);
  if (Number.isNaN(capacityValue) || capacityValue < 0) {
    toast.textContent = '請輸入有效的機車位數量。';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
    return;
  }

  const files = Array.from(document.querySelector('#report-photo-input').files || []);
  const photoUrls = files.map(file => URL.createObjectURL(file));
  const report = {
    id: `rpt-${Date.now()}`,
    parking_id: parkingId,
    user_id: 'anonymous-user',
    current_capacity: Number(parkingLocationCatalog[parkingId]?.currentCapacity || 0),
    reported_capacity: capacityValue,
    note: document.querySelector('#report-note').value.trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    photos: photoUrls,
    capacity_source: 'user_report_verified'
  };

  const reports = getReports();
  reports.unshift(report);
  saveReports(reports);
  renderAdminReports();

  form.classList.add('hidden');
  document.querySelector('#report-success').classList.add('show');
  setTimeout(() => closeReportSheet(), 2200);
  toast.textContent = '回報已送出，等待管理員審核。';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
});

function renderAdminReports(filter = 'pending') {
  const list = document.querySelector('#report-admin-list');
  if (!list) return;
  const reports = getReports().filter(report => report.status === filter);
  if (!reports.length) {
    list.innerHTML = '<div class="admin-report-card"><h4>沒有符合條件的回報</h4><p class="sheet-location">目前沒有這個狀態的停車資料回報。</p></div>';
    return;
  }
  list.innerHTML = reports.map(report => {
    const parking = parkingLocationCatalog[report.parking_id] || { name: '未知停車位', location: '地圖位置', currentCapacity: report.current_capacity };
    const photos = Array.isArray(report.photos) && report.photos.length ? report.photos : [];
    return `
      <article class="admin-report-card">
        <div>
          <h4>${parking.name}</h4>
          <div class="report-card-meta">
            <span>${parking.location}</span>
            <span>${formatDate(report.created_at)}</span>
          </div>
        </div>
        <div class="report-card-body">
          <div class="data-chip"><span>Current</span><strong>${report.current_capacity} 格</strong></div>
          <div class="data-chip"><span>User Report</span><strong>${report.reported_capacity} 格</strong></div>
          <div class="data-chip"><span>Difference</span><strong>${report.current_capacity} → ${report.reported_capacity}</strong></div>
        </div>
        ${photos.length ? `<div class="admin-photo-grid">${photos.map(photo => `<img src="${photo}" alt="Report evidence">`).join('')}</div>` : '<p class="sheet-location">未上傳照片</p>'}
        ${report.note ? `<p class="sheet-location">補充說明：${report.note}</p>` : ''}
        <div class="admin-actions">
          <button class="approve-btn" data-report-action="approve" data-report-id="${report.id}">批准並更新<br><span class="secondary-text">Approve & Update</span></button>
          <button class="reject-btn" data-report-action="reject" data-report-id="${report.id}">拒絕<br><span class="secondary-text">Reject</span></button>
        </div>
      </article>
    `;
  }).join('');
}

function applyReportDecision(reportId, action) {
  const reports = getReports();
  const index = reports.findIndex(report => report.id === reportId);
  if (index === -1) return;
  const report = reports[index];
  if (action === 'approve') {
    report.status = 'approved';
    report.reviewed_at = new Date().toISOString();
    report.reviewed_by = 'admin-demo';
    if (parkingLocationCatalog[report.parking_id]) {
      parkingLocationCatalog[report.parking_id].currentCapacity = Number(report.reported_capacity);
      parkingLocationCatalog[report.parking_id].source = 'admin_verified';
      parkingLocationCatalog[report.parking_id].updatedAt = formatDate(new Date().toISOString());
    }
    updateParkingCardDisplay();
    toast.textContent = '回報已通過並更新容量資料。';
  }
  if (action === 'reject') {
    report.status = 'rejected';
    report.reviewed_at = new Date().toISOString();
    report.reviewed_by = 'admin-demo';
    toast.textContent = '回報已拒絕，官方資料維持不變。';
  }
  reports[index] = report;
  saveReports(reports);
  renderAdminReports(document.querySelector('.admin-tabs button.active')?.dataset.adminFilter || 'pending');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

seedReports();
updateParkingCardDisplay();
renderAdminReports();

if (document.querySelector('[data-view="leaderboard"]')) {
  document.querySelector('[data-view="leaderboard"]').addEventListener('click', event => { event.stopPropagation(); showView('leaderboard'); renderLeaderboard(); });
}

