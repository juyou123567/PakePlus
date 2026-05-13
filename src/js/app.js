// ============================================
// 轨距智测先锋 - 智能轨距测量系统
// 主应用 JavaScript
// ============================================

// ===== 全局状态 =====
const AppState = {
    currentPage: 'dashboard',
    isMeasuring: false,
    isConnected: false,
    isScanning: false,
    currentMode: 'single',
    measurementData: {
        gauge: 1435.0,
        level: 0.0,
        twist: 0.0,
        align: 0.0,
        temperature: 25.3,
        humidity: 62,
        battery: 85,
        compensation: 0.02
    },
    chartData: {
        labels: [],
        gauge: [],
        level: [],
        twist: []
    },
    records: [],
    savedDevices: [
        { id: 'Gauge-001', name: '轨距尺001', rssi: -65, battery: 85, lastConnected: '2026-05-12', isCurrent: false },
        { id: 'Gauge-002', name: '轨距尺002', rssi: -78, battery: 62, lastConnected: '2026-05-10', isCurrent: false },
        { id: 'Gauge-004', name: '轨距尺004', rssi: -88, battery: 35, lastConnected: '2026-04-28', isCurrent: false }
    ],
    alarms: {
        gauge: { threshold: 4.0, status: 'safe' },
        level: { threshold: 5.0, status: 'safe' },
        twist: { threshold: 3.0, status: 'safe' }
    },
    dataCounter: 0
};

// ===== DOM 引用 =====
const DOM = {};

function cacheDOM() {
    DOM.sidebar = document.getElementById('sidebar');
    DOM.menuToggle = document.getElementById('menuToggle');
    DOM.sidebarClose = document.getElementById('sidebarClose');
    DOM.menuItems = document.querySelectorAll('.menu-item');
    DOM.pages = document.querySelectorAll('.page');
    DOM.pageTitle = document.getElementById('pageTitle');
    DOM.pageSubtitle = document.getElementById('pageSubtitle');
    DOM.statusText = document.getElementById('statusText');
    DOM.statusDot = document.querySelector('.status-dot');
    DOM.btnStartMeasure = document.getElementById('btnStartMeasure');
    DOM.recordingIndicator = document.getElementById('recordingIndicator');
    DOM.modeBtns = document.querySelectorAll('.mode-btn');
    DOM.gaugeGauge = document.getElementById('gaugeGauge');
    DOM.gaugeLevel = document.getElementById('gaugeLevel');
    DOM.gaugeTwist = document.getElementById('gaugeTwist');
    DOM.gaugeAlign = document.getElementById('gaugeAlign');
    DOM.envTemp = document.getElementById('envTemp');
    DOM.envHumidity = document.getElementById('envHumidity');
    DOM.envComp = document.getElementById('envComp');
    DOM.envBattery = document.getElementById('envBattery');
    DOM.alarmList = document.getElementById('alarmList');
    DOM.btnAlarmSettings = document.getElementById('btnAlarmSettings');
    DOM.btnScan = document.getElementById('btnScan');
    DOM.scanningIndicator = document.getElementById('scanningIndicator');
    DOM.deviceList = document.getElementById('deviceList');
    DOM.btnDisconnect = document.getElementById('btnDisconnect');
    DOM.btnForget = document.getElementById('btnForget');
    DOM.savedDevicesContainer = document.querySelector('.saved-devices-list');
    DOM.btnSaveRecord = document.getElementById('btnSaveRecord');
    DOM.btnGetGps = document.getElementById('btnGetGps');
    DOM.recordGps = document.getElementById('recordGps');
    DOM.recordSearch = document.getElementById('recordSearch');
    DOM.recordFilter = document.getElementById('recordFilter');
    DOM.recordList = document.getElementById('recordList');
    DOM.btnCompare = document.getElementById('btnCompare');
    DOM.btnZeroCal = document.getElementById('btnZeroCal');
    DOM.btnSensorCal = document.getElementById('btnSensorCal');
    DOM.btnTempComp = document.getElementById('btnTempComp');
    DOM.btnFirmwareUpdate = document.getElementById('btnFirmwareUpdate');
    DOM.btnSelfCheck = document.getElementById('btnSelfCheck');
    DOM.checkResults = document.getElementById('checkResults');
    DOM.btnExport = document.getElementById('btnExport');
    DOM.exportOptions = document.querySelectorAll('.export-option');
    DOM.toggles = document.querySelectorAll('.toggle');
    DOM.modalOverlay = document.getElementById('modalOverlay');
    DOM.modalClose = document.getElementById('modalClose');
    DOM.modalConfirm = document.getElementById('modalConfirm');
    DOM.modalTitle = document.getElementById('modalTitle');
    DOM.modalMessage = document.getElementById('modalMessage');
    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.btnNotification = document.getElementById('btnNotification');
    DOM.btnFullscreen = document.getElementById('btnFullscreen');
}

// ===== 登录/注册系统 =====
var userAccounts = [];
var currentUser = null;

function initAuth() {
    // 从 localStorage 加载已注册账号
    try {
        var saved = localStorage.getItem('gaugeApp_users');
        if (saved) userAccounts = JSON.parse(saved);
    } catch(e) { userAccounts = []; }
    
    // 确保默认管理员账号存在
    var hasAdmin = false;
    for (var i = 0; i < userAccounts.length; i++) {
        if (userAccounts[i].username === 'admin') { hasAdmin = true; break; }
    }
    if (!hasAdmin) {
        userAccounts.push({ username: 'admin', password: '123456', company: '沈阳铁路局工务段', phone: '138-0000-0000' });
        saveAccounts();
    }
    
    // 检查是否已登录（记住我）
    var savedUser = localStorage.getItem('gaugeApp_loggedIn');
    if (savedUser) {
        try {
            var userData = JSON.parse(savedUser);
            for (var i = 0; i < userAccounts.length; i++) {
                if (userAccounts[i].username === userData.username) {
                    currentUser = userAccounts[i];
                    break;
                }
            }
        } catch(e) {}
    }
    
    if (currentUser) {
        showApp();
    } else {
        showLogin();
    }
    
    // 登录按钮
    document.getElementById('btnLogin').addEventListener('click', handleLogin);
    document.getElementById('loginPassword').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('loginUsername').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('loginPassword').focus();
    });
    
    // 注册按钮
    document.getElementById('btnRegister').addEventListener('click', handleRegister);
    
    // 切换登录/注册
    document.getElementById('switchToRegister').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    });
    document.getElementById('switchToLogin').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });
    
    // 退出登录
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
}

function handleLogin() {
    var username = document.getElementById('loginUsername').value.trim();
    var password = document.getElementById('loginPassword').value.trim();
    var remember = document.getElementById('rememberMe').checked;
    
    if (!username || !password) {
        showToast('请输入用户名和密码', 'warning');
        return;
    }
    
    var found = false;
    for (var i = 0; i < userAccounts.length; i++) {
        if (userAccounts[i].username === username && userAccounts[i].password === password) {
            currentUser = userAccounts[i];
            found = true;
            break;
        }
    }
    
    if (!found) {
        showToast('用户名或密码错误', 'error');
        return;
    }
    
    if (remember) {
        localStorage.setItem('gaugeApp_loggedIn', JSON.stringify({ username: currentUser.username }));
    } else {
        localStorage.removeItem('gaugeApp_loggedIn');
    }
    
    showToast('登录成功，欢迎 ' + currentUser.username, 'success');
    showApp();
}

function handleRegister() {
    var username = document.getElementById('regUsername').value.trim();
    var password = document.getElementById('regPassword').value.trim();
    var confirmPwd = document.getElementById('regConfirmPassword').value.trim();
    var company = document.getElementById('regCompany').value.trim();
    var agree = document.getElementById('agreeTerms').checked;
    
    if (!username || !password || !confirmPwd) {
        showToast('请填写所有必填项', 'warning');
        return;
    }
    
    if (username.length < 2) {
        showToast('用户名至少2个字符', 'warning');
        return;
    }
    
    if (password.length < 4) {
        showToast('密码至少4个字符', 'warning');
        return;
    }
    
    if (password !== confirmPwd) {
        showToast('两次密码输入不一致', 'error');
        return;
    }
    
    if (!agree) {
        showToast('请同意服务条款', 'warning');
        return;
    }
    
    for (var i = 0; i < userAccounts.length; i++) {
        if (userAccounts[i].username === username) {
            showToast('用户名已存在', 'error');
            return;
        }
    }
    
    userAccounts.push({ username: username, password: password, company: company || '未设置', phone: '' });
    saveAccounts();
    
    // 注册成功后自动登录
    currentUser = userAccounts[userAccounts.length - 1];
    localStorage.setItem('gaugeApp_loggedIn', JSON.stringify({ username: currentUser.username }));
    
    showToast('注册成功，欢迎 ' + username, 'success');
    showApp();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('gaugeApp_loggedIn');
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('loginPassword').value = '';
    showToast('已退出登录', 'info');
}

function showApp() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    // 更新用户显示
    var nameEl = document.getElementById('headerUserName');
    if (nameEl) nameEl.textContent = currentUser ? currentUser.username : '管理员';
    var pUsername = document.getElementById('profileUsername');
    if (pUsername) pUsername.textContent = currentUser ? currentUser.username : '管理员';
    var pCompany = document.getElementById('profileCompany');
    if (pCompany) pCompany.textContent = currentUser && currentUser.company ? currentUser.company : '未设置';
    var pPhone = document.getElementById('profilePhone');
    if (pPhone) pPhone.textContent = currentUser && currentUser.phone ? currentUser.phone : '未设置';
}

function showLogin() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function saveAccounts() {
    try { localStorage.setItem('gaugeApp_users', JSON.stringify(userAccounts)); } catch(e) {}
}

// ===== 页面导航 =====
function initNavigation() {
    DOM.menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });
    DOM.menuToggle.addEventListener('click', () => DOM.sidebar.classList.toggle('open'));
    DOM.sidebarClose.addEventListener('click', () => DOM.sidebar.classList.remove('open'));
}

function navigateTo(page) {
    DOM.menuItems.forEach(item => item.classList.toggle('active', item.dataset.page === page));
    DOM.pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
    const titles = { dashboard: '实时测量', devices: '设备管理', records: '数据记录', analysis: '数据分析', calibration: '校准维护', export: '导出分享', settings: '系统设置' };
    DOM.pageTitle.textContent = titles[page] || '实时测量';
    DOM.pageSubtitle.textContent = '轨距智测先锋 · ' + (titles[page] || '智能测量系统');
    AppState.currentPage = page;
    DOM.sidebar.classList.remove('open');
    if (page === 'dashboard') initRealtimeChart();
    if (page === 'analysis') initAnalysisCharts();
}

// ===== Toast =====
function showToast(message, type) {
    if (!type) type = 'info';
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-circle' };
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i> ' + message;
    DOM.toastContainer.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(function() { toast.remove(); }, 300); }, 3000);
}

// ===== 模态框 =====
function showModal(title, message, callback) {
    DOM.modalTitle.textContent = title;
    DOM.modalMessage.textContent = message;
    DOM.modalOverlay.classList.add('active');
    function handleConfirm() { DOM.modalOverlay.classList.remove('active'); DOM.modalConfirm.removeEventListener('click', handleConfirm); if (callback) callback(); }
    DOM.modalConfirm.addEventListener('click', handleConfirm);
    DOM.modalClose.addEventListener('click', handleConfirm);
    DOM.modalOverlay.addEventListener('click', function(e) { if (e.target === DOM.modalOverlay) handleConfirm(); });
}

// ===== 模拟仪表盘 =====
function drawAnalogGauge(value) {
    var canvas = document.getElementById('analogGauge');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2 + 10, radius = Math.min(w, h) / 2 - 30;
    ctx.clearRect(0, 0, w, h);
    var startAngle = -Math.PI * 0.75, endAngle = Math.PI * 0.75, range = endAngle - startAngle;
    var normalizedValue = Math.max(0, Math.min(1, (value - 1425) / 20));
    var valueAngle = startAngle + normalizedValue * range;
    ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.stroke();
    var gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#34a853'); gradient.addColorStop(0.5, '#fbbc04'); gradient.addColorStop(1, '#ea4335');
    ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle, Math.min(valueAngle, endAngle));
    ctx.strokeStyle = gradient; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.stroke();
    for (var i = 0; i <= 10; i++) {
        var angle = startAngle + (i / 10) * range, innerR = radius - 15, outerR = radius + 5;
        ctx.beginPath(); ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
        ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
        ctx.strokeStyle = i % 5 === 0 ? '#333' : '#999'; ctx.lineWidth = i % 5 === 0 ? 2 : 1; ctx.stroke();
        if (i % 5 === 0) {
            var labelR = radius + 20, label = '' + (1425 + i * 2);
            ctx.fillStyle = '#666'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, cx + labelR * Math.cos(angle), cy + labelR * Math.sin(angle));
        }
    }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(valueAngle);
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -radius + 25); ctx.lineTo(8, 0); ctx.closePath();
    ctx.fillStyle = '#1a73e8'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fillStyle = '#1a73e8'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#333'; ctx.font = 'bold 18px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(1) + ' mm', cx, cy + radius + 40);
}

// ===== 生成真实感数据 =====
function generateRealisticData() {
    var c = AppState.dataCounter++;
    var gauge = 1435 + Math.sin(c * 0.3) * 1.2 + (Math.random() - 0.5) * 0.8;
    var level = Math.sin(c * 0.2 + 1) * 2.5 + (Math.random() - 0.5) * 1.2;
    var twist = Math.sin(c * 0.25 + 2) * 1.0 + (Math.random() - 0.5) * 0.6;
    var align = Math.sin(c * 0.15 + 3) * 1.5 + (Math.random() - 0.5) * 1.0;
    var temp = 25.3 + Math.sin(c * 0.05) * 1.5 + (Math.random() - 0.5) * 0.5;
    var humidity = 62 + Math.sin(c * 0.03 + 1) * 5 + (Math.random() - 0.5) * 2;
    var battery = Math.max(10, AppState.measurementData.battery - Math.random() * 0.05);
    var compensation = Math.sin(c * 0.1) * 0.02 + (Math.random() - 0.5) * 0.01;
    return { gauge: gauge, level: level, twist: twist, align: align, temperature: temp, humidity: humidity, battery: battery, compensation: compensation };
}

// ===== 实时测量 =====
function initRealtimeMeasurement() {
    DOM.btnStartMeasure.addEventListener('click', toggleMeasurement);
    DOM.modeBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            DOM.modeBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            AppState.currentMode = btn.dataset.mode;
            var modeName = btn.textContent.trim();
            showToast('已切换到' + modeName + '模式', 'info');
            // 如果正在测量，根据新模式调整行为
            if (AppState.isMeasuring) {
                if (AppState.currentMode === 'single') {
                    // 单次测量：只显示当前值，不自动连续更新
                    showToast('单次测量模式：点击"开始测量"获取单次读数', 'info');
                } else if (AppState.currentMode === 'continuous') {
                    // 连续扫描：加快更新频率，模拟沿轨道推行
                    showToast('连续扫描模式：模拟沿轨道推行，自动记录轨迹数据', 'info');
                } else if (AppState.currentMode === 'marker') {
                    // 手动打点：在连续扫描基础上，可标记关键点
                    showToast('手动打点模式：点击"标记"按钮记录关键点位置', 'info');
                }
            }
        });
    });
    setInterval(function() { 
        if (AppState.isMeasuring) {
            if (AppState.currentMode === 'single') {
                // 单次测量：每2秒更新一次（模拟单次读数）
                if (AppState._singleCounter === undefined) AppState._singleCounter = 0;
                AppState._singleCounter++;
                if (AppState._singleCounter % 4 === 0) { // 每2秒更新一次（500ms * 4）
                    updateMeasurementData();
                }
            } else if (AppState.currentMode === 'continuous') {
                // 连续扫描：每500ms更新一次，数据变化更连续（模拟沿轨道推行）
                updateMeasurementData();
                // 连续扫描模式下自动保存记录
                if (AppState._autoSaveCounter === undefined) AppState._autoSaveCounter = 0;
                AppState._autoSaveCounter++;
                if (AppState._autoSaveCounter % 10 === 0) { // 每5秒自动保存一条记录
                    autoSaveRecord();
                }
            } else if (AppState.currentMode === 'marker') {
                // 手动打点：每500ms更新，但只记录标记点
                updateMeasurementData();
            }
        }
    }, 500);
}

// 自动保存记录（连续扫描模式）
function autoSaveRecord() {
    var lines = ['京沪高铁', '京广高铁', '沪昆高铁', '哈大高铁', '京津城际'];
    var dirs = ['上行', '下行'];
    var line = lines[Math.floor(Math.random() * lines.length)];
    var dir = dirs[Math.floor(Math.random() * dirs.length)];
    var km = 'K' + (100 + Math.floor(Math.random() * 50)) + '+' + pad(Math.floor(Math.random() * 1000), 3);
    var record = {
        id: Date.now() + Math.random(),
        date: new Date().toLocaleString('zh-CN'),
        line: line,
        direction: dir,
        track: 'I道',
        switchVal: '',
        startKm: km,
        endKm: km,
        operator: '自动记录',
        gps: '41.8054°N, 123.4315°E',
        note: '连续扫描自动记录',
        data: {}
    };
    for (var key in AppState.measurementData) { record.data[key] = AppState.measurementData[key]; }
    AppState.records.unshift(record);
    updateRecordList();
}

function toggleMeasurement() {
    // 检查是否已连接设备
    if (!AppState.isConnected) {
        showToast('请先连接轨距尺设备后再进行测量', 'warning');
        return;
    }
    AppState.isMeasuring = !AppState.isMeasuring;
    AppState._singleCounter = 0;
    AppState._autoSaveCounter = 0;
    if (AppState.isMeasuring) {
        var modeName = '';
        if (AppState.currentMode === 'single') modeName = '单次测量';
        else if (AppState.currentMode === 'continuous') modeName = '连续扫描';
        else if (AppState.currentMode === 'marker') modeName = '手动打点';
        
        DOM.btnStartMeasure.innerHTML = '<i class="fas fa-stop"></i> 停止测量';
        DOM.btnStartMeasure.classList.remove('btn-primary'); DOM.btnStartMeasure.classList.add('btn-danger');
        DOM.recordingIndicator.classList.add('active');
        showToast('开始' + modeName + '...', 'success');
        
        // 单次测量模式：立即获取一次读数然后停止
        if (AppState.currentMode === 'single') {
            updateMeasurementData();
            showToast('单次测量完成：轨距 ' + AppState.measurementData.gauge.toFixed(1) + 'mm', 'success');
            // 单次测量后自动停止
            setTimeout(function() {
                if (AppState.isMeasuring && AppState.currentMode === 'single') {
                    AppState.isMeasuring = false;
                    DOM.btnStartMeasure.innerHTML = '<i class="fas fa-play"></i> 开始测量';
                    DOM.btnStartMeasure.classList.remove('btn-danger'); DOM.btnStartMeasure.classList.add('btn-primary');
                    DOM.recordingIndicator.classList.remove('active');
                    showToast('单次测量完成', 'info');
                }
            }, 100);
        } else if (AppState.currentMode === 'continuous') {
            showToast('连续扫描中：沿轨道推行，自动记录轨迹数据...', 'info');
        } else if (AppState.currentMode === 'marker') {
            showToast('手动打点模式：点击"标记"按钮记录关键点', 'info');
            // 在手动打点模式下，添加一个标记按钮
            addMarkerButton();
        }
    } else {
        DOM.btnStartMeasure.innerHTML = '<i class="fas fa-play"></i> 开始测量';
        DOM.btnStartMeasure.classList.remove('btn-danger'); DOM.btnStartMeasure.classList.add('btn-primary');
        DOM.recordingIndicator.classList.remove('active');
        showToast('测量已停止', 'info');
        // 移除标记按钮
        removeMarkerButton();
    }
}

// 手动打点标记按钮
function addMarkerButton() {
    var existingBtn = document.getElementById('btnMarkPoint');
    if (!existingBtn) {
        var actions = document.querySelector('.gauge-panel .card-actions');
        if (actions) {
            var btn = document.createElement('button');
            btn.id = 'btnMarkPoint';
            btn.className = 'btn-sm btn-warning';
            btn.innerHTML = '<i class="fas fa-map-pin"></i> 标记关键点';
            btn.style.background = '#ff6d01';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.padding = '6px 14px';
            btn.style.borderRadius = '6px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '13px';
            btn.addEventListener('click', function() {
                var km = 'K' + (100 + Math.floor(Math.random() * 50)) + '+' + pad(Math.floor(Math.random() * 1000), 3);
                var types = ['道岔', '焊缝', '接头', '桥头', '隧道口', '曲线中点'];
                var type = types[Math.floor(Math.random() * types.length)];
                var record = {
                    id: Date.now(),
                    date: new Date().toLocaleString('zh-CN'),
                    line: '当前线路',
                    direction: '上行',
                    track: 'I道',
                    switchVal: '',
                    startKm: km,
                    endKm: km,
                    operator: '手动打点',
                    gps: '41.8054°N, 123.4315°E',
                    note: '关键点: ' + type,
                    data: {}
                };
                for (var key in AppState.measurementData) { record.data[key] = AppState.measurementData[key]; }
                AppState.records.unshift(record);
                updateRecordList();
                showToast('已标记 ' + type + ' @ ' + km + '，轨距: ' + AppState.measurementData.gauge.toFixed(1) + 'mm', 'success');
            });
            actions.appendChild(btn);
        }
    }
}

function removeMarkerButton() {
    var btn = document.getElementById('btnMarkPoint');
    if (btn) btn.remove();
}

function updateMeasurementData() {
    var data = generateRealisticData();
    for (var key in data) { AppState.measurementData[key] = data[key]; }
    DOM.gaugeGauge.textContent = data.gauge.toFixed(1);
    DOM.gaugeLevel.textContent = data.level.toFixed(1);
    DOM.gaugeTwist.textContent = data.twist.toFixed(1);
    DOM.gaugeAlign.textContent = data.align.toFixed(1);
    DOM.envTemp.textContent = data.temperature.toFixed(1) + '°C';
    DOM.envHumidity.textContent = data.humidity.toFixed(0) + '%';
    DOM.envComp.textContent = (data.compensation >= 0 ? '+' : '') + data.compensation.toFixed(2) + 'mm';
    DOM.envBattery.textContent = data.battery.toFixed(0) + '%';
    drawAnalogGauge(data.gauge);
    var gaugeFill = document.querySelector('.gauge-fill');
    if (gaugeFill) { var d = Math.abs(data.gauge - 1435); gaugeFill.style.width = Math.min(100, (d / 5) * 100) + '%'; }
    updateAlarms(data);
    updateRealtimeChart(data);
}

function updateAlarms(data) {
    var alarms = [
        { name: '轨距', value: data.gauge, standard: 1435, threshold: AppState.alarms.gauge.threshold },
        { name: '水平', value: data.level, standard: 0, threshold: AppState.alarms.level.threshold },
        { name: '三角坑', value: data.twist, standard: 0, threshold: AppState.alarms.twist.threshold }
    ];
    DOM.alarmList.innerHTML = '';
    alarms.forEach(function(alarm) {
        var dev = Math.abs(alarm.value - alarm.standard);
        var status = 'safe', icon = 'fa-check-circle', st = '正常';
        if (dev > alarm.threshold * 0.8) { status = 'warning'; icon = 'fa-exclamation-triangle'; st = '接近超限'; }
        if (dev > alarm.threshold) { status = 'danger'; icon = 'fa-times-circle'; st = '超限!'; showToast(alarm.name + '超限! 当前值: ' + alarm.value.toFixed(1) + 'mm', 'error'); }
        var item = document.createElement('div');
        item.className = 'alarm-item ' + status;
        item.innerHTML = '<i class="fas ' + icon + '"></i><span>' + alarm.name + ': ' + alarm.value.toFixed(1) + 'mm (' + st + ')</span>';
        DOM.alarmList.appendChild(item);
    });
}

// ===== 实时图表 =====
var realtimeChartInstance = null;

function initRealtimeChart() {
    var canvas = document.getElementById('realtimeChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (realtimeChartInstance) realtimeChartInstance.destroy();
    
    // 预填充初始数据，让曲线一开始就有起伏
    var initLabels = [];
    var initGauge = [];
    var initLevel = [];
    var initTwist = [];
    for (var i = 0; i < 20; i++) {
        var ts = pad(Math.floor(i / 60), 2) + ':' + pad(Math.floor((i % 60) * 1), 2) + ':' + pad(Math.floor(Math.random() * 60), 2);
        initLabels.push(ts);
        initGauge.push(1435 + Math.sin(i * 0.5) * 1.2 + Math.sin(i * 0.2) * 0.8 + (Math.random() - 0.5) * 0.6);
        initLevel.push(Math.sin(i * 0.4 + 1) * 2.5 + Math.sin(i * 0.15) * 1.0 + (Math.random() - 0.5) * 0.8);
        initTwist.push(Math.sin(i * 0.6 + 2) * 1.0 + Math.sin(i * 0.25) * 0.5 + (Math.random() - 0.5) * 0.4);
    }
    AppState.chartData.labels = initLabels.slice();
    AppState.chartData.gauge = initGauge.slice();
    AppState.chartData.level = initLevel.slice();
    AppState.chartData.twist = initTwist.slice();
    
    realtimeChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: initLabels, datasets: [
            { label: '轨距', data: initGauge, borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 },
            { label: '水平', data: initLevel, borderColor: '#fbbc04', backgroundColor: 'rgba(251,188,4,0.1)', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 },
            { label: '三角坑', data: initTwist, borderColor: '#ea4335', backgroundColor: 'rgba(234,67,53,0.1)', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 }
        ]},
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } }, scales: { x: { display: true, grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 10 } } }, y: { display: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } } }, animation: { duration: 200 } }
    });
    var select = document.getElementById('chartMetricSelect');
    if (select) {
        select.addEventListener('change', function(e) {
            var metric = e.target.value;
            var idx = ['gauge', 'level', 'twist'].indexOf(metric);
            realtimeChartInstance.data.datasets.forEach(function(ds, i) { ds.hidden = i !== idx; });
            realtimeChartInstance.update();
        });
    }
}

function updateRealtimeChart(data) {
    if (!realtimeChartInstance) return;
    var now = new Date();
    var ts = pad(now.getHours(), 2) + ':' + pad(now.getMinutes(), 2) + ':' + pad(now.getSeconds(), 2);
    AppState.chartData.labels.push(ts);
    AppState.chartData.gauge.push(data.gauge);
    AppState.chartData.level.push(data.level);
    AppState.chartData.twist.push(data.twist);
    if (AppState.chartData.labels.length > 50) { AppState.chartData.labels.shift(); AppState.chartData.gauge.shift(); AppState.chartData.level.shift(); AppState.chartData.twist.shift(); }
    realtimeChartInstance.data.labels = AppState.chartData.labels.slice();
    realtimeChartInstance.data.datasets[0].data = AppState.chartData.gauge.slice();
    realtimeChartInstance.data.datasets[1].data = AppState.chartData.level.slice();
    realtimeChartInstance.data.datasets[2].data = AppState.chartData.twist.slice();
    realtimeChartInstance.update('none');
}

function pad(n, len) { var s = n.toString(); while (s.length < len) s = '0' + s; return s; }

// ===== 设备管理 =====
function initDeviceManagement() {
    DOM.btnScan.addEventListener('click', function() {
        if (AppState.isScanning) return;
        AppState.isScanning = true;
        DOM.scanningIndicator.classList.add('active');
        DOM.btnScan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 扫描中...';
        setTimeout(function() {
            AppState.isScanning = false;
            DOM.scanningIndicator.classList.remove('active');
            DOM.btnScan.innerHTML = '<i class="fas fa-sync-alt"></i> 扫描设备';
            // 设置扫描结果
            AppState._scannedDevices = [
                { id: 'Gauge-001', name: '轨距尺001', rssi: -65, battery: 85 },
                { id: 'Gauge-002', name: '轨距尺002', rssi: -78, battery: 62 },
                { id: 'Gauge-003', name: '轨距尺003', rssi: -92, battery: 35 }
            ];
            renderDeviceList();
            showToast('扫描完成，发现 ' + AppState._scannedDevices.length + ' 个设备', 'success');
        }, 2000);
    });
    DOM.btnDisconnect.addEventListener('click', function() {
        if (!AppState.isConnected) { showToast('当前没有已连接的设备', 'warning'); return; }
        AppState.isConnected = false;
        DOM.statusText.textContent = '未连接';
        DOM.statusDot.className = 'status-dot disconnected';
        updateConnectButtons();
        renderDeviceList();
        updateDeviceInfoPanel();
        showToast('已断开设备连接', 'info');
    });
    DOM.btnForget.addEventListener('click', function() {
        var currentDevice = null;
        for (var i = 0; i < AppState.savedDevices.length; i++) { if (AppState.savedDevices[i].isCurrent) { currentDevice = AppState.savedDevices[i]; break; } }
        if (!currentDevice) { showToast('没有可移除的设备', 'warning'); return; }
        showModal('移除设备', '确定要移除 "' + currentDevice.name + '" 吗？移除后需要重新扫描连接。', function() {
            var newDevices = [];
            for (var i = 0; i < AppState.savedDevices.length; i++) { if (AppState.savedDevices[i].id !== currentDevice.id) newDevices.push(AppState.savedDevices[i]); }
            AppState.savedDevices = newDevices;
            if (AppState.isConnected) { AppState.isConnected = false; DOM.statusText.textContent = '未连接'; DOM.statusDot.className = 'status-dot disconnected'; }
            renderSavedDevices(); renderDeviceList(); updateConnectButtons(); updateDeviceInfoPanel();
            showToast('设备 "' + currentDevice.name + '" 已移除', 'success');
        });
    });
    renderDeviceList();
    renderSavedDevices();
}

function renderDeviceList() {
    DOM.deviceList.innerHTML = '';
    // 如果没有扫描结果，显示空状态提示
    if (!AppState._scannedDevices || AppState._scannedDevices.length === 0) {
        DOM.deviceList.innerHTML = '<div class="empty-state"><i class="fas fa-bluetooth-b" style="font-size:48px;color:var(--text-light);margin-bottom:12px;"></i><p style="color:var(--text-light);">点击"扫描设备"搜索附近的轨距尺</p></div>';
        return;
    }
    AppState._scannedDevices.forEach(function(device) {
        var saved = null;
        for (var i = 0; i < AppState.savedDevices.length; i++) { if (AppState.savedDevices[i].id === device.id) { saved = AppState.savedDevices[i]; break; } }
        var isCurrent = saved ? saved.isCurrent : false;
        var isConnected = isCurrent && AppState.isConnected;
        // 使用已保存的自定义名称（如果有）
        var displayName = saved ? saved.name : device.name;
        var div = document.createElement('div');
        div.className = 'device-item';
        div.dataset.id = device.id;
        var batClass = device.battery > 75 ? 'three-quarters' : (device.battery > 50 ? 'half' : 'quarter');
        div.innerHTML = '<div class="device-icon"><i class="fas fa-ruler-combined"></i></div><div class="device-info"><div class="device-name">' + displayName + '</div><div class="device-meta"><span class="rssi"><i class="fas fa-signal"></i> ' + device.rssi + 'dBm</span><span class="battery"><i class="fas fa-battery-' + batClass + '"></i> ' + device.battery + '%</span></div></div><button class="btn-sm ' + (isConnected ? 'btn-primary' : 'btn-outline') + ' connect-btn">' + (isConnected ? '已连接' : '连接') + '</button>';
        var btn = div.querySelector('.connect-btn');
        btn.addEventListener('click', function() { handleConnect(device.id, device.name); });
        DOM.deviceList.appendChild(div);
    });
}

function handleConnect(deviceId, deviceName) {
    if (AppState.isConnected) { showToast('请先断开当前设备连接', 'warning'); return; }
    showToast('正在连接 ' + deviceName + '...', 'info');
    setTimeout(function() {
        AppState.isConnected = true;
        DOM.statusText.textContent = '已连接';
        DOM.statusDot.className = 'status-dot connected';
        for (var i = 0; i < AppState.savedDevices.length; i++) { AppState.savedDevices[i].isCurrent = false; }
        var saved = null;
        for (var i = 0; i < AppState.savedDevices.length; i++) { if (AppState.savedDevices[i].id === deviceId) { saved = AppState.savedDevices[i]; break; } }
        if (saved) { saved.isCurrent = true; saved.lastConnected = new Date().toLocaleDateString('zh-CN'); }
        else { AppState.savedDevices.push({ id: deviceId, name: deviceName, rssi: -65, battery: 85, lastConnected: new Date().toLocaleDateString('zh-CN'), isCurrent: true }); }
        updateConnectButtons(); renderSavedDevices(); renderDeviceList(); updateDeviceInfoPanel();
        showToast('已连接到 ' + deviceName, 'success');
    }, 1000);
}

function updateConnectButtons() {
    document.querySelectorAll('.connect-btn').forEach(function(btn) {
        var deviceItem = btn.closest('.device-item');
        if (!deviceItem) return;
        var deviceId = deviceItem.dataset.id;
        var saved = null;
        for (var i = 0; i < AppState.savedDevices.length; i++) { if (AppState.savedDevices[i].id === deviceId) { saved = AppState.savedDevices[i]; break; } }
        var isCurrent = saved && saved.isCurrent && AppState.isConnected;
        btn.classList.remove('btn-primary', 'btn-outline');
        btn.classList.add(isCurrent ? 'btn-primary' : 'btn-outline');
        btn.textContent = isCurrent ? '已连接' : '连接';
    });
}

function updateDeviceInfoPanel() {
    // 更新右侧设备信息面板
    var currentDevice = null;
    for (var i = 0; i < AppState.savedDevices.length; i++) {
        if (AppState.savedDevices[i].isCurrent) { currentDevice = AppState.savedDevices[i]; break; }
    }
    var nameEl = document.getElementById('detailDeviceName');
    if (nameEl) {
        if (currentDevice && AppState.isConnected) {
            nameEl.textContent = currentDevice.name;
        } else {
            nameEl.textContent = '未选择设备';
        }
    }
    // 更新所有设备信息行
    var detailRows = document.querySelectorAll('.device-details .detail-row');
    if (detailRows.length >= 5) {
        // 固件版本行（索引1）
        var fwValue = detailRows[1].querySelector('.detail-value');
        if (fwValue) fwValue.textContent = currentDevice && AppState.isConnected ? 'v2.1.3' : '--';
        // 序列号行（索引2）
        var snValue = detailRows[2].querySelector('.detail-value');
        if (snValue) snValue.textContent = currentDevice && AppState.isConnected ? 'SN-2026-00421' : '--';
        // 校准有效期行（索引3）
        var calValue = detailRows[3].querySelector('.detail-value');
        if (calValue) calValue.textContent = currentDevice && AppState.isConnected ? '2026-12-31' : '--';
        // 连接状态行（索引4）
        var statusRow = detailRows[4];
        var statusDot = statusRow.querySelector('.status-dot');
        var detailValue = statusRow.querySelector('.detail-value');
        if (statusDot && detailValue) {
            if (AppState.isConnected && currentDevice) {
                statusDot.className = 'status-dot connected';
                detailValue.innerHTML = '<span class="status-dot connected"></span> 已连接';
            } else {
                statusDot.className = 'status-dot disconnected';
                detailValue.innerHTML = '<span class="status-dot disconnected"></span> 未连接';
            }
        }
        // 上次使用行（索引5）
        var lastValue = detailRows[5].querySelector('.detail-value');
        if (lastValue) lastValue.textContent = currentDevice && AppState.isConnected ? (currentDevice.lastConnected || '--') : '--';
    }
}

function renderSavedDevices() {
    if (!DOM.savedDevicesContainer) return;
    var html = '';
    for (var i = 0; i < AppState.savedDevices.length; i++) {
        var device = AppState.savedDevices[i];
        html += '<div class="saved-device ' + (device.isCurrent ? 'active' : '') + '">';
        html += '<i class="fas fa-ruler-combined"></i>';
        html += '<div class="saved-device-info">';
        html += '<span class="saved-name">' + device.name + '</span>';
        html += '<span class="saved-meta">最后连接: ' + device.lastConnected + '</span>';
        html += '</div>';
        if (device.isCurrent) {
            html += '<span class="saved-badge">当前</span>';
        } else {
            html += '<button class="btn-sm btn-outline switch-device" data-id="' + device.id + '">切换</button>';
        }
        html += '</div>';
    }
    DOM.savedDevicesContainer.innerHTML = html;
    DOM.savedDevicesContainer.querySelectorAll('.switch-device').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var deviceId = btn.dataset.id;
            var device = null;
            for (var i = 0; i < AppState.savedDevices.length; i++) { if (AppState.savedDevices[i].id === deviceId) { device = AppState.savedDevices[i]; break; } }
            if (device) {
                if (AppState.isConnected) {
                    showModal('切换设备', '确定要切换到 "' + device.name + '" 吗？当前连接将断开。', function() {
                        AppState.isConnected = false; DOM.statusText.textContent = '未连接'; DOM.statusDot.className = 'status-dot disconnected';
                        handleConnect(device.id, device.name);
                    });
                } else { handleConnect(device.id, device.name); }
            }
        });
    });
    // 双击自定义设备名称
    DOM.savedDevicesContainer.querySelectorAll('.saved-name').forEach(function(nameEl) {
        nameEl.style.cursor = 'pointer';
        nameEl.title = '双击修改设备名称';
        nameEl.addEventListener('dblclick', function() {
            var currentName = nameEl.textContent;
            var newName = prompt('请输入新的设备名称：', currentName);
            if (newName && newName.trim() && newName !== currentName) {
                for (var i = 0; i < AppState.savedDevices.length; i++) { if (AppState.savedDevices[i].name === currentName) AppState.savedDevices[i].name = newName.trim(); }
                renderSavedDevices(); renderDeviceList(); updateDeviceInfoPanel();
                showToast('设备名称已修改为 "' + newName.trim() + '"', 'success');
            }
        });
    });
}

// ===== 数据记录 =====
function initDataRecords() {
    DOM.btnSaveRecord.addEventListener('click', function() {
        var line = document.getElementById('recordLine').value;
        if (!line) { showToast('请选择线路名称', 'warning'); return; }
        var record = {
            id: Date.now(), date: new Date().toLocaleString('zh-CN'), line: line,
            direction: document.getElementById('recordDirection').value,
            track: document.getElementById('recordTrack').value,
            switchVal: document.getElementById('recordSwitch').value,
            startKm: document.getElementById('recordStartKm').value,
            endKm: document.getElementById('recordEndKm').value,
            operator: document.getElementById('recordOperator').value,
            gps: document.getElementById('recordGps').value,
            note: document.getElementById('recordNote').value,
            data: {}
        };
        for (var key in AppState.measurementData) { record.data[key] = AppState.measurementData[key]; }
        AppState.records.unshift(record);
        showToast('测量记录已保存', 'success');
        updateRecordList();
    });
    DOM.btnGetGps.addEventListener('click', function() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(pos) { DOM.recordGps.value = pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6); showToast('GPS坐标获取成功', 'success'); },
                function() { DOM.recordGps.value = '41.8054°N, 123.4315°E'; showToast('使用模拟GPS坐标', 'info'); }
            );
        } else { DOM.recordGps.value = '41.8054°N, 123.4315°E'; showToast('使用模拟GPS坐标', 'info'); }
    });
    DOM.recordSearch.addEventListener('input', function(e) {
        var q = e.target.value.toLowerCase();
        document.querySelectorAll('.record-item').forEach(function(item) { item.style.display = item.textContent.toLowerCase().includes(q) ? 'block' : 'none'; });
    });
    document.getElementById('btnAddPhoto').addEventListener('click', function() { showToast('拍照功能已触发（模拟）', 'info'); });
    document.getElementById('btnAddVoice').addEventListener('click', function() { showToast('录音功能已触发（模拟）', 'info'); });
    document.getElementById('btnAddNote').addEventListener('click', function() { showModal('添加备注', '请输入文字备注内容：'); });
    updateRecordList();
}

function updateRecordList() {
    if (!DOM.recordList) return;
    var html = '';
    var maxItems = Math.min(20, AppState.records.length);
    for (var i = 0; i < maxItems; i++) {
        var r = AppState.records[i];
        var gd = Math.abs(r.data.gauge - 1435);
        var bc = gd > 4 ? 'warning' : 'normal';
        var bt = gd > 4 ? '有超限' : '正常';
        html += '<div class="record-item">';
        html += '<div class="record-header"><span class="record-date">' + r.date + '</span><span class="record-badge ' + bc + '">' + bt + '</span></div>';
        html += '<div class="record-info"><span><i class="fas fa-subway"></i> ' + r.line + ' · ' + r.direction + ' · ' + (r.track || '未指定') + '</span><span><i class="fas fa-map-pin"></i> ' + (r.startKm || '未指定') + ' ~ ' + (r.endKm || '未指定') + '</span></div>';
        html += '<div class="record-stats"><span>轨距: ' + r.data.gauge.toFixed(1) + 'mm</span><span>水平: ' + r.data.level.toFixed(1) + 'mm</span><span>三角坑: ' + r.data.twist.toFixed(1) + 'mm</span></div>';
        html += '<div class="record-actions">';
        html += '<button class="btn-sm btn-outline view-record" data-id="' + r.id + '"><i class="fas fa-eye"></i> 查看</button>';
        html += '<button class="btn-sm btn-outline trend-record" data-id="' + r.id + '"><i class="fas fa-chart-line"></i> 趋势</button>';
        html += '<button class="btn-sm btn-outline export-record" data-id="' + r.id + '"><i class="fas fa-file-export"></i> 导出</button>';
        html += '</div></div>';
    }
    DOM.recordList.innerHTML = html;
    // 查看记录
    DOM.recordList.querySelectorAll('.view-record').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = parseInt(btn.dataset.id);
            var r = null;
            for (var i = 0; i < AppState.records.length; i++) { if (AppState.records[i].id === id) { r = AppState.records[i]; break; } }
            if (r) {
                showModal('📋 测量记录详情',
                    '日期: ' + r.date + '\n线路: ' + r.line + ' · ' + r.direction + ' · ' + (r.track || '未指定') + '\n公里标: ' + (r.startKm || '未指定') + ' ~ ' + (r.endKm || '未指定') + '\n测量人员: ' + (r.operator || '未指定') + '\nGPS: ' + (r.gps || '未获取') + '\n备注: ' + (r.note || '无') + '\n\n📊 测量数据:\n轨距: ' + r.data.gauge.toFixed(1) + 'mm\n水平: ' + r.data.level.toFixed(1) + 'mm\n三角坑: ' + r.data.twist.toFixed(1) + 'mm\n轨向: ' + r.data.align.toFixed(1) + 'mm\n温度: ' + r.data.temperature.toFixed(1) + '°C\n湿度: ' + r.data.humidity.toFixed(0) + '%');
            }
        });
    });
    // 趋势查看
    DOM.recordList.querySelectorAll('.trend-record').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = parseInt(btn.dataset.id);
            var r = null;
            for (var i = 0; i < AppState.records.length; i++) { if (AppState.records[i].id === id) { r = AppState.records[i]; break; } }
            if (r) {
                var points = 20;
                var trendStr = '📈 趋势数据 - ' + r.line + ' ' + (r.startKm || '') + '~' + (r.endKm || '') + '\n\n';
                trendStr += '桩号\t轨距(mm)\t水平(mm)\t三角坑(mm)\n';
                trendStr += '──────────────────────────────────────────\n';
                for (var j = 0; j < points; j++) {
                    var g = (r.data.gauge + (Math.random() - 0.5) * 1.5).toFixed(1);
                    var l = (r.data.level + (Math.random() - 0.5) * 2).toFixed(1);
                    var t = (r.data.twist + (Math.random() - 0.5) * 1).toFixed(1);
                    var km = (r.startKm ? r.startKm.split('+')[0] : 'K100') + '+' + pad(j * 25, 3);
                    trendStr += km + '\t' + g + '\t' + l + '\t' + t + '\n';
                }
                showModal('📈 趋势数据', trendStr);
            }
        });
    });
    // 导出单条记录为CSV
    DOM.recordList.querySelectorAll('.export-record').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = parseInt(btn.dataset.id);
            var r = null;
            for (var i = 0; i < AppState.records.length; i++) { if (AppState.records[i].id === id) { r = AppState.records[i]; break; } }
            if (r) { exportSingleRecord(r); }
        });
    });
}

// ===== 导出单条记录为CSV表格 =====
function exportSingleRecord(record) {
    var csv = '\uFEFF';
    csv += '字段,值\n';
    csv += '日期时间,' + record.date + '\n';
    csv += '线路,' + record.line + '\n';
    csv += '行别,' + record.direction + '\n';
    csv += '股道,' + (record.track || '') + '\n';
    csv += '起始公里标,' + (record.startKm || '') + '\n';
    csv += '终止公里标,' + (record.endKm || '') + '\n';
    csv += '测量人员,' + (record.operator || '') + '\n';
    csv += 'GPS坐标,' + (record.gps || '') + '\n';
    csv += '备注,' + (record.note || '') + '\n';
    csv += '\n测量数据\n';
    csv += '轨距(mm),' + record.data.gauge.toFixed(1) + '\n';
    csv += '水平(mm),' + record.data.level.toFixed(1) + '\n';
    csv += '三角坑(mm),' + record.data.twist.toFixed(1) + '\n';
    csv += '轨向(mm),' + record.data.align.toFixed(1) + '\n';
    csv += '温度(°C),' + record.data.temperature.toFixed(1) + '\n';
    csv += '湿度(%),' + record.data.humidity.toFixed(0) + '\n';
    var filename = '轨距测量_' + record.line + '_' + record.date.replace(/[/:]/g, '-') + '.csv';
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
    showToast('记录已导出为CSV表格', 'success');
}

function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== 数据分析图表（真实感数据） =====
var trendChartInstance = null;
var pieChartInstance = null;
var histogramChartInstance = null;

function initAnalysisCharts() {
    initTrendChart();
    initPieChart();
    initHistogramChart();
}

function initTrendChart() {
    var canvas = document.getElementById('trendChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (trendChartInstance) trendChartInstance.destroy();
    
    // 生成真实感趋势数据（沿里程变化）
    var labels = [];
    var gaugeData = [];
    var levelData = [];
    var twistData = [];
    for (var i = 0; i < 30; i++) {
        var km = 'K' + (100 + Math.floor(i / 10)) + '+' + pad((i % 10) * 100, 3);
        labels.push(km);
        gaugeData.push(1435 + Math.sin(i * 0.5) * 1.5 + Math.sin(i * 0.2) * 0.8 + (Math.random() - 0.5) * 0.6);
        levelData.push(Math.sin(i * 0.4 + 1) * 3 + Math.sin(i * 0.15) * 1.5 + (Math.random() - 0.5) * 1);
        twistData.push(Math.sin(i * 0.6 + 2) * 1.2 + Math.sin(i * 0.25) * 0.5 + (Math.random() - 0.5) * 0.4);
    }
    
    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: '轨距', data: gaugeData, borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, hidden: false },
                { label: '水平', data: levelData, borderColor: '#fbbc04', backgroundColor: 'rgba(251,188,4,0.1)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, hidden: false },
                { label: '三角坑', data: twistData, borderColor: '#ea4335', backgroundColor: 'rgba(234,67,53,0.1)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, hidden: false }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 11 } }, onClick: function(e, legendItem, legend) {
                    var index = legendItem.datasetIndex;
                    var ci = legend.chart;
                    var meta = ci.getDatasetMeta(index);
                    meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                    ci.update();
                } }
            },
            scales: {
                x: { display: true, grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 10 } } },
                y: { display: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } }, min: 1430, max: 1440 }
            }
        }
    });
    
    // 下拉选择单独查看某个参数
    var analysisSelect = document.getElementById('analysisMetricSelect');
    if (analysisSelect) {
        analysisSelect.addEventListener('change', function(e) {
            var metric = e.target.value;
            var showMap = { gauge: 0, level: 1, twist: 2 };
            var showIdx = showMap[metric] || 0;
            trendChartInstance.data.datasets.forEach(function(ds, i) {
                ds.hidden = i !== showIdx;
            });
            // 根据选中的参数调整纵坐标范围
            var yMin, yMax;
            if (metric === 'gauge') { yMin = 1430; yMax = 1440; }
            else if (metric === 'level') { yMin = -8; yMax = 8; }
            else { yMin = -4; yMax = 4; }
            trendChartInstance.options.scales.y.min = yMin;
            trendChartInstance.options.scales.y.max = yMax;
            trendChartInstance.update();
        });
    }
    
    // 更新统计值
    var maxVal = Math.max.apply(null, gaugeData);
    var minVal = Math.min.apply(null, gaugeData);
    var sum = 0;
    for (var i = 0; i < gaugeData.length; i++) sum += gaugeData[i];
    var avg = sum / gaugeData.length;
    var variance = 0;
    for (var i = 0; i < gaugeData.length; i++) variance += (gaugeData[i] - avg) * (gaugeData[i] - avg);
    var std = Math.sqrt(variance / gaugeData.length);
    var overLimit = 0;
    for (var i = 0; i < gaugeData.length; i++) { if (Math.abs(gaugeData[i] - 1435) > 4) overLimit++; }
    var passRate = ((gaugeData.length - overLimit) / gaugeData.length * 100).toFixed(1);
    
    document.getElementById('statMax').textContent = maxVal.toFixed(1) + ' mm';
    document.getElementById('statMin').textContent = minVal.toFixed(1) + ' mm';
    document.getElementById('statAvg').textContent = avg.toFixed(1) + ' mm';
    document.getElementById('statStd').textContent = std.toFixed(2) + ' mm';
    document.getElementById('statPassRate').textContent = passRate + '%';
    document.getElementById('statOverLimit').textContent = overLimit;
    
    // 对比分析按钮 - 实现真正的数据叠加对比
    DOM.btnCompare.addEventListener('click', function() {
        if (AppState.records.length < 2) {
            showToast('需要至少2条记录才能进行对比分析', 'warning');
            return;
        }
        // 选择最近的两条记录进行对比
        var r1 = AppState.records[0];
        var r2 = AppState.records[1];
        
        // 生成对比数据
        var labels = [];
        var r1Gauge = [];
        var r2Gauge = [];
        var r1Level = [];
        var r2Level = [];
        var r1Twist = [];
        var r2Twist = [];
        for (var i = 0; i < 20; i++) {
            var km = 'K' + (100 + Math.floor(i / 10)) + '+' + pad((i % 10) * 100, 3);
            labels.push(km);
            // 第一条记录数据（基于实际记录值加随机波动）
            r1Gauge.push(r1.data.gauge + Math.sin(i * 0.5) * 1.2 + (Math.random() - 0.5) * 0.6);
            r1Level.push(r1.data.level + Math.sin(i * 0.4 + 1) * 2 + (Math.random() - 0.5) * 0.8);
            r1Twist.push(r1.data.twist + Math.sin(i * 0.6 + 2) * 0.8 + (Math.random() - 0.5) * 0.4);
            // 第二条记录数据（基于实际记录值加不同随机波动，模拟不同时间测量）
            r2Gauge.push(r2.data.gauge + Math.sin(i * 0.5 + 0.3) * 1.0 + (Math.random() - 0.5) * 0.5);
            r2Level.push(r2.data.level + Math.sin(i * 0.4 + 1.3) * 1.8 + (Math.random() - 0.5) * 0.7);
            r2Twist.push(r2.data.twist + Math.sin(i * 0.6 + 2.3) * 0.7 + (Math.random() - 0.5) * 0.3);
        }
        
        // 计算变化量
        var changeGauge = [];
        var changeLevel = [];
        var changeTwist = [];
        for (var i = 0; i < 20; i++) {
            changeGauge.push((r2Gauge[i] - r1Gauge[i]).toFixed(2));
            changeLevel.push((r2Level[i] - r1Level[i]).toFixed(2));
            changeTwist.push((r2Twist[i] - r1Twist[i]).toFixed(2));
        }
        
        // 创建对比分析模态框
        var modalHtml = '<div style="max-height:70vh;overflow-y:auto;">';
        modalHtml += '<div style="margin-bottom:16px;padding:12px;background:#e8f0fe;border-radius:8px;">';
        modalHtml += '<p style="font-size:13px;color:#1a73e8;margin-bottom:4px;"><strong>对比分析</strong></p>';
        modalHtml += '<p style="font-size:12px;color:#666;">记录1: ' + r1.date + ' · ' + r1.line + ' · 轨距' + r1.data.gauge.toFixed(1) + 'mm</p>';
        modalHtml += '<p style="font-size:12px;color:#666;">记录2: ' + r2.date + ' · ' + r2.line + ' · 轨距' + r2.data.gauge.toFixed(1) + 'mm</p>';
        modalHtml += '</div>';
        
        // 轨距对比表格
        modalHtml += '<h4 style="margin:12px 0 8px;font-size:14px;">📊 轨距对比 (mm)</h4>';
        modalHtml += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">';
        modalHtml += '<tr style="background:#1a73e8;color:#fff;"><th style="padding:6px 8px;text-align:center;">桩号</th><th style="padding:6px 8px;text-align:center;">记录1</th><th style="padding:6px 8px;text-align:center;">记录2</th><th style="padding:6px 8px;text-align:center;">变化量</th></tr>';
        for (var i = 0; i < 20; i++) {
            var change = parseFloat(changeGauge[i]);
            var changeColor = Math.abs(change) > 1 ? 'color:red;' : 'color:green;';
            modalHtml += '<tr' + (i % 2 === 0 ? ' style="background:#f5f8ff;"' : '') + '>';
            modalHtml += '<td style="padding:4px 8px;text-align:center;">' + labels[i] + '</td>';
            modalHtml += '<td style="padding:4px 8px;text-align:center;">' + r1Gauge[i].toFixed(1) + '</td>';
            modalHtml += '<td style="padding:4px 8px;text-align:center;">' + r2Gauge[i].toFixed(1) + '</td>';
            modalHtml += '<td style="padding:4px 8px;text-align:center;' + changeColor + '">' + (change >= 0 ? '+' : '') + change.toFixed(2) + '</td>';
            modalHtml += '</tr>';
        }
        modalHtml += '</table>';
        
        // 水平对比表格
        modalHtml += '<h4 style="margin:12px 0 8px;font-size:14px;">📊 水平对比 (mm)</h4>';
        modalHtml += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">';
        modalHtml += '<tr style="background:#fbbc04;color:#fff;"><th style="padding:6px 8px;text-align:center;">桩号</th><th style="padding:6px 8px;text-align:center;">记录1</th><th style="padding:6px 8px;text-align:center;">记录2</th><th style="padding:6px 8px;text-align:center;">变化量</th></tr>';
        for (var i = 0; i < 20; i++) {
            var change = parseFloat(changeLevel[i]);
            var changeColor = Math.abs(change) > 1.5 ? 'color:red;' : 'color:green;';
            modalHtml += '<tr' + (i % 2 === 0 ? ' style="background:#fffde7;"' : '') + '>';
            modalHtml += '<td style="padding:4px 8px;text-align:center;">' + labels[i] + '</td>';
            modalHtml += '<td style="padding:4px 8px;text-align:center;">' + r1Level[i].toFixed(1) + '</td>';
            modalHtml += '<td style="padding:4px 8px;text-align:center;">' + r2Level[i].toFixed(1) + '</td>';
            modalHtml += '<td style="padding:4px 8px;text-align:center;' + changeColor + '">' + (change >= 0 ? '+' : '') + change.toFixed(2) + '</td>';
            modalHtml += '</tr>';
        }
        modalHtml += '</table>';
        
        // 变化量统计
        var avgChange = 0;
        for (var i = 0; i < 20; i++) avgChange += parseFloat(changeGauge[i]);
        avgChange = (avgChange / 20).toFixed(3);
        var maxChange = Math.max.apply(null, changeGauge.map(parseFloat));
        var minChange = Math.min.apply(null, changeGauge.map(parseFloat));
        
        modalHtml += '<div style="padding:12px;background:#f0f4ff;border-radius:8px;margin-top:8px;">';
        modalHtml += '<p style="font-size:13px;color:#333;"><strong>📈 轨距变化量统计</strong></p>';
        modalHtml += '<p style="font-size:12px;color:#666;">平均变化: ' + (avgChange >= 0 ? '+' : '') + avgChange + 'mm</p>';
        modalHtml += '<p style="font-size:12px;color:#666;">最大变化: ' + (maxChange >= 0 ? '+' : '') + maxChange.toFixed(3) + 'mm</p>';
        modalHtml += '<p style="font-size:12px;color:#666;">最小变化: ' + (minChange >= 0 ? '+' : '') + minChange.toFixed(3) + 'mm</p>';
        modalHtml += '</div>';
        modalHtml += '</div>';
        
        // 使用模态框显示对比结果
        DOM.modalTitle.textContent = '📊 对比分析 - 数据叠加对比';
        DOM.modalMessage.innerHTML = modalHtml;
        DOM.modalOverlay.classList.add('active');
        function handleConfirm() { DOM.modalOverlay.classList.remove('active'); DOM.modalConfirm.removeEventListener('click', handleConfirm); }
        DOM.modalConfirm.addEventListener('click', handleConfirm);
        DOM.modalClose.addEventListener('click', handleConfirm);
        DOM.modalOverlay.addEventListener('click', function(e) { if (e.target === DOM.modalOverlay) handleConfirm(); });
        
        showToast('对比分析完成：已对比 ' + r1.line + ' 和 ' + r2.line + ' 的数据', 'success');
    });
}

function initPieChart() {
    var canvas = document.getElementById('pieChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['正常', '轨距超限', '水平超限', '三角坑超限'],
            datasets: [{
                data: [85, 8, 5, 2],
                backgroundColor: ['#34a853', '#ea4335', '#fbbc04', '#ff6d01'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 10 } }
            },
            cutout: '60%'
        }
    });
}

function initHistogramChart() {
    var canvas = document.getElementById('histogramChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (histogramChartInstance) histogramChartInstance.destroy();
    
    // 生成正态分布偏差数据
    var labels = [];
    var data = [];
    for (var i = -5; i <= 5; i += 0.5) {
        labels.push((i >= 0 ? '+' : '') + i.toFixed(1));
        var val = Math.exp(-(i * i) / (2 * 0.8 * 0.8)) * 20 + (Math.random() - 0.5) * 3;
        data.push(Math.max(0, val));
    }
    
    histogramChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '偏差分布',
                data: data,
                backgroundColor: data.map(function(v, idx) {
                    var dev = -5 + idx * 0.5;
                    return Math.abs(dev) > 4 ? '#ea4335' : (Math.abs(dev) > 3 ? '#fbbc04' : '#34a853');
                }),
                borderWidth: 0,
                borderRadius: 3
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: true, grid: { display: false }, ticks: { font: { size: 8 }, maxTicksLimit: 12 } },
                y: { display: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 9 } }, beginAtZero: true }
            }
        }
    });
}

// ===== 校准维护 =====
function initCalibration() {
    DOM.btnZeroCal.addEventListener('click', function() {
        showToast('零点校准完成，偏移量已归零', 'success');
    });
    DOM.btnSensorCal.addEventListener('click', function() {
        var standard = parseFloat(document.getElementById('standardGauge').value) || 1435;
        showToast('传感器校准完成，已修正至 ' + standard.toFixed(1) + 'mm', 'success');
    });
    DOM.btnTempComp.addEventListener('click', function() {
        showToast('温度补偿参数已保存', 'success');
    });
    DOM.btnFirmwareUpdate.addEventListener('click', function() {
        showModal('固件升级', '当前固件: v2.1.3\n最新固件: v2.2.0\n\n更新内容:\n- 优化温度补偿算法\n- 提升测量稳定性\n- 修复已知问题\n\n确定要下载并升级固件吗？', function() {
            showToast('固件下载中...', 'info');
            setTimeout(function() { showToast('固件升级完成，请重启设备', 'success'); }, 3000);
        });
    });
    DOM.btnSelfCheck.addEventListener('click', function() {
        DOM.checkResults.innerHTML = '';
        var checks = [
            { name: '红外传感器', status: '正常', icon: 'fa-check-circle', cls: 'success' },
            { name: '蓝牙模块', status: '正常', icon: 'fa-check-circle', cls: 'success' },
            { name: '电池状态', status: '85% 电量充足', icon: 'fa-check-circle', cls: 'success' },
            { name: '温度传感器', status: '正常', icon: 'fa-check-circle', cls: 'success' },
            { name: '存储模块', status: '正常', icon: 'fa-check-circle', cls: 'success' }
        ];
        var delay = 0;
        checks.forEach(function(check) {
            setTimeout(function() {
                var item = document.createElement('div');
                item.className = 'check-item ' + check.cls;
                item.innerHTML = '<i class="fas ' + check.icon + '"></i><span>' + check.name + ': ' + check.status + '</span>';
                DOM.checkResults.appendChild(item);
            }, delay);
            delay += 500;
        });
        showToast('自检诊断完成，所有模块正常', 'success');
    });
}

// ===== 最近导出记录 =====
var recentExports = [];

function addRecentExport(format, recordCount) {
    var now = new Date();
    var timeStr = now.toLocaleString('zh-CN');
    var formatNames = { csv: 'CSV数据', excel: 'Excel表格', pdf: 'PDF报告' };
    recentExports.unshift({
        time: timeStr,
        format: formatNames[format] || format.toUpperCase(),
        count: recordCount,
        formatIcon: format === 'csv' ? 'fa-file-csv' : (format === 'excel' ? 'fa-file-excel' : 'fa-file-pdf')
    });
    if (recentExports.length > 10) recentExports.pop();
    updateRecentExportList();
}

function updateRecentExportList() {
    var container = document.getElementById('recentExportList');
    if (!container) return;
    if (recentExports.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-light);"><i class="fas fa-inbox" style="font-size:36px;display:block;margin-bottom:10px;"></i>暂无导出记录</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < recentExports.length; i++) {
        var exp = recentExports[i];
        html += '<div class="record-item">';
        html += '<div class="record-header"><span class="record-date"><i class="fas ' + exp.formatIcon + '" style="margin-right:6px;color:var(--primary);"></i>' + exp.format + '</span><span class="record-badge normal">' + exp.count + '条记录</span></div>';
        html += '<div class="record-info"><span><i class="fas fa-clock"></i> ' + exp.time + '</span></div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// ===== 导出功能 =====
function initExport() {
    DOM.exportOptions.forEach(function(option) {
        option.addEventListener('click', function() {
            DOM.exportOptions.forEach(function(o) { o.classList.remove('active'); });
            option.classList.add('active');
        });
    });
    DOM.btnExport.addEventListener('click', function() {
        if (AppState.records.length === 0) { showToast('没有可导出的数据，请先进行测量并保存记录', 'warning'); return; }
        var format = document.querySelector('.export-option.active');
        var formatName = format ? format.dataset.format : 'pdf';
        if (formatName === 'csv') { exportAllCSV(); addRecentExport('csv', AppState.records.length); }
        else if (formatName === 'excel') { exportAllCSV(); addRecentExport('excel', AppState.records.length); showToast('Excel 格式已生成（CSV格式，可用Excel打开）', 'info'); }
        else { exportAllPDF(); addRecentExport('pdf', AppState.records.length); }
    });
    document.querySelectorAll('.share-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (AppState.records.length === 0) { showToast('没有数据可分享，请先进行测量', 'warning'); return; }
            var method = btn.textContent.trim();
            exportAllCSV();
            addRecentExport('csv', AppState.records.length);
            setTimeout(function() { showToast('数据已导出，可通过 ' + method + ' 发送文件', 'success'); }, 500);
        });
    });
    // 初始化最近导出列表
    updateRecentExportList();
}

function exportAllCSV() {
    var csv = '\uFEFF';
    csv += '序号,日期时间,线路,行别,股道,起始公里标,终止公里标,轨距(mm),水平(mm),三角坑(mm),轨向(mm),温度(°C),湿度(%),GPS坐标,备注\n';
    for (var i = 0; i < AppState.records.length; i++) {
        var r = AppState.records[i];
        csv += (i + 1) + ',' + r.date + ',' + r.line + ',' + r.direction + ',' + (r.track || '') + ',' + (r.startKm || '') + ',' + (r.endKm || '') + ',';
        csv += r.data.gauge.toFixed(1) + ',' + r.data.level.toFixed(1) + ',' + r.data.twist.toFixed(1) + ',' + r.data.align.toFixed(1) + ',';
        csv += r.data.temperature.toFixed(1) + ',' + r.data.humidity.toFixed(0) + ',' + (r.gps || '') + ',' + (r.note || '') + '\n';
    }
    downloadFile(csv, '轨距测量数据_' + new Date().toLocaleDateString('zh-CN').replace(/\//g, '-') + '.csv', 'text/csv;charset=utf-8');
    showToast('CSV 数据已导出并下载', 'success');
}

function exportAllPDF() {
    var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>轨距测量报告</title>';
    html += '<style>body{font-family:"Microsoft YaHei",sans-serif;padding:40px;color:#333;}';
    html += 'h1{text-align:center;color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:10px;}';
    html += 'h2{color:#1557b0;margin-top:30px;}';
    html += 'table{width:100%;border-collapse:collapse;margin:15px 0;table-layout:auto;}';
    html += 'th,td{border:1px solid #ddd;padding:8px 12px;text-align:center;font-size:13px;white-space:nowrap;}';
    html += 'th{background:#1a73e8;color:#fff;}';
    html += 'tr:nth-child(even){background:#f5f8ff;}';
    html += '.date-col{min-width:160px;white-space:nowrap;}';
    html += '.summary{display:flex;gap:20px;justify-content:center;margin:20px 0;}';
    html += '.summary-item{text-align:center;padding:15px 25px;background:#e8f0fe;border-radius:8px;}';
    html += '.summary-item .num{font-size:24px;font-weight:700;color:#1a73e8;}';
    html += '.summary-item .label{font-size:13px;color:#666;margin-top:4px;}';
    html += '.footer{text-align:center;margin-top:40px;color:#999;font-size:12px;}';
    html += '</style></head><body>';
    html += '<h1>📊 轨距智测先锋 - 测量报告</h1>';
    html += '<p style="text-align:center;color:#666;">报告生成时间: ' + new Date().toLocaleString('zh-CN') + '</p>';
    
    var overCount = 0;
    for (var i = 0; i < AppState.records.length; i++) { if (Math.abs(AppState.records[i].data.gauge - 1435) > 4) overCount++; }
    var passRate = AppState.records.length > 0 ? ((AppState.records.length - overCount) / AppState.records.length * 100).toFixed(1) : 0;
    
    html += '<div class="summary"><div class="summary-item"><div class="num">' + AppState.records.length + '</div><div class="label">总记录数</div></div>';
    html += '<div class="summary-item"><div class="num">' + overCount + '</div><div class="label">超限点数</div></div>';
    html += '<div class="summary-item"><div class="num">' + passRate + '%</div><div class="label">合格率</div></div></div>';
    
    html += '<h2>📋 原始数据表</h2><table><tr><th>序号</th><th class="date-col">日期</th><th>线路</th><th>行别</th><th>公里标</th><th>轨距(mm)</th><th>水平(mm)</th><th>三角坑(mm)</th><th>温度(°C)</th></tr>';
    for (var i = 0; i < AppState.records.length; i++) {
        var r = AppState.records[i];
        var isOver = Math.abs(r.data.gauge - 1435) > 4;
        html += '<tr' + (isOver ? ' style="background:#ffe6e6;"' : '') + '><td>' + (i + 1) + '</td><td class="date-col">' + r.date + '</td><td>' + r.line + '</td><td>' + r.direction + '</td><td>' + (r.startKm || '') + '</td>';
        html += '<td' + (isOver ? ' style="color:red;font-weight:bold;"' : '') + '>' + r.data.gauge.toFixed(1) + '</td>';
        html += '<td>' + r.data.level.toFixed(1) + '</td><td>' + r.data.twist.toFixed(1) + '</td><td>' + r.data.temperature.toFixed(1) + '</td></tr>';
    }
    html += '</table><div class="footer"><p>轨距智测先锋 v2.0.0 | 技术支持: 7×24小时技术咨询热线</p><p>本报告由系统自动生成</p></div></body></html>';
    
    var win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    showToast('PDF 报告已生成，请使用浏览器打印(Ctrl+P)保存为PDF', 'success');
}

// ===== 设置功能 =====
function initSettings() {
    DOM.toggles.forEach(function(toggle) {
        toggle.addEventListener('click', function() {
            this.classList.toggle('active');
            var setting = this.dataset.setting;
            var isActive = this.classList.contains('active');
            showToast((isActive ? '已开启' : '已关闭') + ': ' + setting, 'info');
        });
    });
    DOM.btnAlarmSettings.addEventListener('click', function() {
        showModal('报警阈值设置', '请在"系统设置"页面调整各参数阈值。\n\n当前设置:\n轨距: ±' + AppState.alarms.gauge.threshold + 'mm\n水平: ±' + AppState.alarms.level.threshold + 'mm\n三角坑: ±' + AppState.alarms.twist.threshold + 'mm');
    });
    
    // 数据管理功能
    var dataManagementPanel = document.querySelector('.data-management-panel');
    if (dataManagementPanel) {
        var buttons = dataManagementPanel.querySelectorAll('.btn-sm');
        if (buttons.length >= 3) {
            // 清理按钮
            buttons[0].addEventListener('click', function() {
                if (AppState.records.length === 0) {
                    showToast('没有记录需要清理', 'info');
                    return;
                }
                showModal('清理数据', '确定要清理所有测量记录吗？\n当前共 ' + AppState.records.length + ' 条记录。\n此操作不可恢复！', function() {
                    AppState.records = [];
                    updateRecordList();
                    showToast('已清理所有测量记录', 'success');
                });
            });
            // 导出备份按钮
            buttons[1].addEventListener('click', function() {
                if (AppState.records.length === 0) {
                    showToast('没有数据可导出备份', 'warning');
                    return;
                }
                var backup = JSON.stringify({
                    version: '2.0.0',
                    exportTime: new Date().toLocaleString('zh-CN'),
                    records: AppState.records,
                    savedDevices: AppState.savedDevices,
                    alarms: AppState.alarms
                }, null, 2);
                downloadFile(backup, '轨距智测先锋_备份_' + new Date().toLocaleDateString('zh-CN').replace(/\//g, '-') + '.json', 'application/json');
                showToast('数据备份已导出', 'success');
            });
            // 导入按钮
            buttons[2].addEventListener('click', function() {
                var input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.addEventListener('change', function(e) {
                    var file = e.target.files[0];
                    if (!file) return;
                    var reader = new FileReader();
                    reader.onload = function(ev) {
                        try {
                            var data = JSON.parse(ev.target.result);
                            if (data.records && Array.isArray(data.records)) {
                                AppState.records = data.records;
                                if (data.savedDevices) AppState.savedDevices = data.savedDevices;
                                if (data.alarms) AppState.alarms = data.alarms;
                                updateRecordList();
                                renderSavedDevices();
                                showToast('数据导入成功，共 ' + data.records.length + ' 条记录', 'success');
                            } else {
                                showToast('备份文件格式无效', 'error');
                            }
                        } catch(err) {
                            showToast('文件解析失败: ' + err.message, 'error');
                        }
                    };
                    reader.readAsText(file);
                });
                input.click();
            });
        }
    }
    
    // 报警阈值滑块
    var thresholdSliders = document.querySelectorAll('.alarm-threshold-panel input[type="range"]');
    thresholdSliders.forEach(function(slider, idx) {
        slider.addEventListener('change', function() {
            var names = ['gauge', 'level', 'twist', 'align'];
            var labels = ['轨距', '水平', '三角坑', '轨向'];
            var key = names[idx];
            var val = parseFloat(slider.value);
            if (AppState.alarms[key]) AppState.alarms[key].threshold = val;
            var infoEl = slider.closest('.setting-item').querySelector('.setting-info p');
            if (infoEl) infoEl.textContent = '当前: ±' + val.toFixed(1) + ' mm';
            showToast(labels[idx] + '阈值已设置为 ±' + val.toFixed(1) + 'mm', 'info');
        });
    });
}

// ===== 全屏功能 =====
function initFullscreen() {
    DOM.btnFullscreen.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            DOM.btnFullscreen.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            DOM.btnFullscreen.innerHTML = '<i class="fas fa-expand"></i>';
        }
    });
}

// ===== 通知功能 =====
function initNotifications() {
    DOM.btnNotification.addEventListener('click', function() {
        showModal('通知中心', '1. 设备 Gauge-001 连接成功\n2. 轨距超限报警（K100+500）\n3. 固件 v2.2.0 可更新');
    });
}

// ===== 用户资料 =====
var userProfile = {
    username: 'admin',
    company: '沈阳铁路局工务段',
    phone: '138-0000-0000'
};

// ===== 编辑资料 =====
function initProfileEditor() {
    var btnEdit = document.getElementById('btnEditProfile');
    var profileModal = document.getElementById('profileModal');
    var modalClose = document.getElementById('profileModalClose');
    var modalCancel = document.getElementById('profileModalCancel');
    var modalSave = document.getElementById('profileModalSave');
    
    if (!btnEdit || !profileModal) return;
    
    function openProfileModal() {
        document.getElementById('editUsername').value = userProfile.username;
        document.getElementById('editCompany').value = userProfile.company;
        document.getElementById('editPhone').value = userProfile.phone;
        profileModal.classList.add('active');
    }
    
    function closeProfileModal() {
        profileModal.classList.remove('active');
    }
    
    btnEdit.addEventListener('click', openProfileModal);
    modalClose.addEventListener('click', closeProfileModal);
    modalCancel.addEventListener('click', closeProfileModal);
    modalSave.addEventListener('click', function() {
        var newUsername = document.getElementById('editUsername').value.trim();
        var newCompany = document.getElementById('editCompany').value.trim();
        var newPhone = document.getElementById('editPhone').value.trim();
        if (newUsername) {
            userProfile.username = newUsername;
            userProfile.company = newCompany || '未设置';
            userProfile.phone = newPhone || '未设置';
            // 同步更新当前用户
            if (currentUser) {
                currentUser.company = userProfile.company;
                currentUser.phone = userProfile.phone;
                saveAccounts();
            }
            document.getElementById('headerUserName').textContent = userProfile.username;
            showToast('个人信息已更新', 'success');
        }
        closeProfileModal();
    });
}

// ===== 初始化 =====
function init() {
    cacheDOM();
    initAuth();
    initNavigation();
    initRealtimeMeasurement();
    initDeviceManagement();
    initDataRecords();
    initCalibration();
    initExport();
    initSettings();
    initFullscreen();
    initNotifications();
    initProfileEditor();
    // 初始绘制仪表盘
    drawAnalogGauge(1435);
    // 初始生成一些示例记录
    for (var i = 0; i < 5; i++) {
        var data = generateRealisticData();
        var lines = ['京沪高铁', '京广高铁', '沪昆高铁', '哈大高铁', '京津城际'];
        var dirs = ['上行', '下行'];
        var tracks = ['I道', 'II道', 'III道'];
        AppState.records.push({
            id: Date.now() + i,
            date: new Date(Date.now() - i * 3600000).toLocaleString('zh-CN'),
            line: lines[i % lines.length],
            direction: dirs[i % dirs.length],
            track: tracks[i % tracks.length],
            switchVal: '',
            startKm: 'K' + (100 + i) + '+000',
            endKm: 'K' + (100 + i) + '+500',
            operator: '张工',
            gps: '41.8054°N, 123.4315°E',
            note: '日常巡检',
            data: data
        });
    }
    updateRecordList();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
