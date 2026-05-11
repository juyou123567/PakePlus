// ============================================================
//  状态变量
// ============================================================
let currentFilter = 'all';
let currentSearch = '';
let currentCallExpert = null;
let callTimerInterval = null;
let callSeconds = 0;
let isMuted = false;
let isSpeakerOn = true;

// Canvas 动画相关
let animFrameId = null;
let particles = [];

// 滚动隐藏导航栏相关
let lastScrollY = 0;
let scrollThreshold = 10;
let isNavHidden = false;

// 拖拽相关
let dragState = null;

// ============================================================
//  工具函数
// ============================================================
function getInitials(name) {
    return name.charAt(0);
}

// ============================================================
//  渲染专家卡片
// ============================================================
function renderExperts(filter = 'all', search = '') {
    const grid = document.getElementById('expertGrid');
    let filtered = expertsData;

    // 分类筛选
    if (filter !== 'all') {
        filtered = filtered.filter(e => e.field === filter);
    }

    // 搜索
    if (search.trim()) {
        const keyword = search.trim().toLowerCase();
        filtered = filtered.filter(e =>
            e.name.toLowerCase().includes(keyword) ||
            e.field.toLowerCase().includes(keyword) ||
            e.title.toLowerCase().includes(keyword) ||
            e.desc.toLowerCase().includes(keyword)
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <div class="icon">🔍</div>
                <h3>未找到匹配的专家</h3>
                <p>试试调整筛选条件或搜索关键词</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(expert => `
        <div class="expert-card ${expert.active ? 'active' : 'inactive'}" data-id="${expert.id}" onclick="showExpertDetail(${expert.id})">
            <div class="expert-card-header">
                <div class="expert-avatar" style="background: ${expert.avatar};">
                    ${getInitials(expert.name)}
                    <span class="status-dot ${expert.active ? 'active' : 'inactive'}"></span>
                </div>
                <div class="expert-info">
                    <div class="expert-name">${expert.name}</div>
                    <div class="expert-title">${expert.title}</div>
                </div>
            </div>
            <div class="expert-tags">
                <span class="expert-tag field">${expert.field}</span>
                <span class="expert-tag level">${expert.level}</span>
            </div>
            <div class="expert-desc">${expert.desc}</div>
            <div class="expert-card-footer">
                <span class="expert-status-text ${expert.active ? 'active' : 'inactive'}">
                    ${expert.active ? '🟢 活跃中' : '⚪ 离线'}
                </span>
                <button class="call-btn ${expert.active ? 'active' : 'inactive'}"
                        onclick="event.stopPropagation(); startCall(${expert.id})"
                        ${expert.active ? '' : 'disabled'}>
                    <span class="btn-icon">📞</span>
                    ${expert.active ? '接通电话' : '暂时离线'}
                </button>
            </div>
        </div>
    `).join('');

    // 更新统计数据
    document.getElementById('totalExperts').textContent = expertsData.length;
    document.getElementById('activeExperts').textContent = expertsData.filter(e => e.active).length;

    // 重新绑定拖拽事件
    setupDragCards();
}

// ============================================================
//  筛选与搜索
// ============================================================
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderExperts(currentFilter, currentSearch);
        });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderExperts(currentFilter, currentSearch);
    });
}

// ============================================================
//  滚动隐藏导航栏（类似手机App效果）
// ============================================================
function setupScrollHideNav() {
    const header = document.querySelector('.header');
    const filterBar = document.querySelector('.filter-bar');

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        const scrollDiff = currentScrollY - lastScrollY;

        if (Math.abs(scrollDiff) > scrollThreshold) {
            if (scrollDiff > 0 && currentScrollY > 80) {
                if (!isNavHidden) {
                    header.classList.add('hidden');
                    filterBar.classList.add('hidden');
                    isNavHidden = true;
                }
            } else if (scrollDiff < 0) {
                if (isNavHidden) {
                    header.classList.remove('hidden');
                    filterBar.classList.remove('hidden');
                    isNavHidden = false;
                }
            }
        }

        lastScrollY = currentScrollY;

        const scrollTopBtn = document.getElementById('scrollTopBtn');
        if (currentScrollY > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    }, { passive: true });
}

// ============================================================
//  卡片拖拽移动功能
// ============================================================
function setupDragCards() {
    const cards = document.querySelectorAll('.expert-card');

    cards.forEach(card => {
        // 移除旧的事件监听（通过克隆节点方式避免重复绑定）
        // 使用新的方式：直接绑定，但用标志防止重复
        if (card._dragBound) return;
        card._dragBound = true;

        // 鼠标拖拽
        card.addEventListener('mousedown', (e) => {
            // 如果点击的是按钮，不触发拖拽
            if (e.target.closest('.call-btn')) return;
            startDrag(e, card);
        });

        // 触摸拖拽（手机）
        card.addEventListener('touchstart', (e) => {
            if (e.target.closest('.call-btn')) return;
            const touch = e.touches[0];
            startDrag({ clientX: touch.clientX, clientY: touch.clientY, isTouch: true }, card);
        }, { passive: true });
    });
}

function startDrag(e, card) {
    const rect = card.getBoundingClientRect();
    const grid = document.getElementById('expertGrid');

    dragState = {
        card: card,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        origX: rect.left,
        origY: rect.top,
        isDragging: false,
        isTouch: e.isTouch || false,
        clone: null
    };

    card.classList.add('dragging');

    // 创建拖拽克隆体
    const clone = card.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.zIndex = '1000';
    clone.style.pointerEvents = 'none';
    clone.style.transition = 'none';
    clone.style.transform = 'scale(1.02) rotate(1deg)';
    clone.style.boxShadow = '0 16px 48px rgba(0,0,0,0.2)';
    clone.style.opacity = '0.92';
    clone.style.borderRadius = '14px';
    clone.style.overflow = 'hidden';
    document.body.appendChild(clone);
    dragState.clone = clone;

    // 原卡片变透明占位
    card.style.opacity = '0.3';

    if (e.isTouch) {
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: false });
    } else {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
}

function onMouseMove(e) {
    if (!dragState) return;
    moveDrag(e.clientX, e.clientY);
}

function onTouchMove(e) {
    if (!dragState) return;
    e.preventDefault();
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
}

function moveDrag(clientX, clientY) {
    if (!dragState || !dragState.clone) return;

    const clone = dragState.clone;
    clone.style.left = (clientX - dragState.offsetX) + 'px';
    clone.style.top = (clientY - dragState.offsetY) + 'px';

    dragState.isDragging = true;
}

function onMouseUp(e) {
    endDrag(e.clientX, e.clientY);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

function onTouchEnd(e) {
    const touch = e.changedTouches[0];
    endDrag(touch.clientX, touch.clientY);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
}

function endDrag(clientX, clientY) {
    if (!dragState) return;

    const { card, clone, isDragging } = dragState;

    // 移除克隆体
    if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
    }

    // 恢复卡片样式
    card.classList.remove('dragging');
    card.style.opacity = '1';

    // 如果发生了拖拽，尝试将卡片移动到新位置
    if (isDragging && clientX && clientY) {
        // 找到鼠标下方的卡片
        const elementsUnder = document.elementsFromPoint(clientX, clientY);
        let targetCard = null;
        for (const el of elementsUnder) {
            if (el.classList && el.classList.contains('expert-card') && el !== card) {
                targetCard = el;
                break;
            }
        }

        if (targetCard) {
            const grid = document.getElementById('expertGrid');
            const cards = [...grid.querySelectorAll('.expert-card')];
            const fromIndex = cards.indexOf(card);
            const toIndex = cards.indexOf(targetCard);

            if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                // 在DOM中移动卡片
                if (fromIndex < toIndex) {
                    targetCard.parentNode.insertBefore(card, targetCard.nextSibling);
                } else {
                    targetCard.parentNode.insertBefore(card, targetCard);
                }

                // 添加微小的动画反馈
                card.style.transition = 'transform 0.2s ease';
                card.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    card.style.transform = 'scale(1)';
                }, 200);
            }
        }
    }

    dragState = null;
}

// ============================================================
//  专家详情弹窗
// ============================================================
function showExpertDetail(expertId) {
    const expert = expertsData.find(e => e.id === expertId);
    if (!expert) return;

    const overlay = document.getElementById('detailOverlay');
    const content = document.getElementById('detailContent');

    const statusClass = expert.active ? 'active' : 'inactive';
    const statusText = expert.active ? '🟢 活跃中 · 可接通电话' : '⚪ 离线 · 暂时无法接通';
    const bannerClass = expert.active ? 'active-banner' : 'inactive-banner';

    content.innerHTML = `
        <div class="detail-banner ${bannerClass}">
            <div class="banner-pattern"></div>
            <span class="banner-status">${expert.active ? '🟢 活跃中' : '⚪ 离线'}</span>
        </div>
        <div class="detail-body">
            <div class="detail-avatar-wrap">
                <div class="detail-avatar" style="background: ${expert.avatar};">
                    ${getInitials(expert.name)}
                    <span class="detail-status-dot ${statusClass}"></span>
                </div>
                <div class="detail-name-wrap">
                    <div class="detail-name">${expert.name}</div>
                    <div class="detail-title">${expert.title}</div>
                </div>
            </div>

            <div class="detail-tags">
                <span class="detail-tag field">${expert.field}</span>
                <span class="detail-tag level">${expert.level}</span>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">📋 个人简介</div>
                <div class="detail-desc">${expert.desc}</div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">📊 基本信息</div>
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <span class="label">专业领域</span>
                        <span class="value">${expert.field}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="label">技术等级</span>
                        <span class="value">${expert.level}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="label">当前状态</span>
                        <span class="value" style="color: ${expert.active ? '#2e7d32' : '#999'}">${expert.active ? '活跃中' : '离线'}</span>
                    </div>
                    <div class="detail-info-item">
                        <span class="label">专家编号</span>
                        <span class="value">EXP-${String(expert.id).padStart(3, '0')}</span>
                    </div>
                </div>
            </div>

            <button class="detail-call-btn ${statusClass}"
                    onclick="startCall(${expert.id})"
                    ${expert.active ? '' : 'disabled'}>
                <span>${expert.active ? '📞 接通电话' : '⏳ 暂时离线'}</span>
            </button>
        </div>
    `;

    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeExpertDetail() {
    const overlay = document.getElementById('detailOverlay');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

function setupDetailOverlay() {
    // 点击遮罩关闭
    document.getElementById('detailOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeExpertDetail();
        }
    });

    // 关闭按钮
    document.getElementById('detailClose').addEventListener('click', closeExpertDetail);

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const detailOverlay = document.getElementById('detailOverlay');
            if (detailOverlay.classList.contains('show')) {
                closeExpertDetail();
            }
        }
    });
}

// ============================================================
//  回到顶部功能
// ============================================================
function setupScrollTop() {
    const btn = document.getElementById('scrollTopBtn');
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============================================================
//  视频通话逻辑
// ============================================================
function startCall(expertId) {
    const expert = expertsData.find(e => e.id === expertId);
    if (!expert || !expert.active) return;

    currentCallExpert = expert;
    const overlay = document.getElementById('videoOverlay');
    const callerName = document.getElementById('callerName');
    const callerField = document.getElementById('callerField');
    const callerAvatar = document.getElementById('callerAvatar');

    callerName.textContent = expert.name;
    callerField.textContent = `${expert.field} · 通话中`;
    callerAvatar.style.background = expert.avatar;
    callerAvatar.textContent = getInitials(expert.name);

    overlay.classList.add('show');

    // 重置计时器
    callSeconds = 0;
    document.getElementById('callTimer').textContent = '00:00';
    if (callTimerInterval) clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
        callSeconds++;
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        document.getElementById('callTimer').textContent = `${mins}:${secs}`;
    }, 1000);

    // 启动 canvas 视频动画
    startVideoAnimation(expert);
}

function endCall() {
    const overlay = document.getElementById('videoOverlay');
    overlay.classList.remove('show');
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }
    stopVideoAnimation();
    currentCallExpert = null;
}

function setupCallControls() {
    document.getElementById('endCallBtn').addEventListener('click', endCall);

    // 静音控制
    document.getElementById('muteBtn').addEventListener('click', () => {
        isMuted = !isMuted;
        const btn = document.getElementById('muteBtn');
        btn.textContent = isMuted ? '🔇' : '🎤';
        btn.classList.toggle('muted', isMuted);
    });

    // 扬声器控制
    document.getElementById('speakerBtn').addEventListener('click', () => {
        isSpeakerOn = !isSpeakerOn;
        const btn = document.getElementById('speakerBtn');
        btn.textContent = isSpeakerOn ? '🔊' : '🔈';
    });
}

// ============================================================
//  Canvas 视频动画
// ============================================================
function initParticles() {
    particles = [];
    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random(),
            y: Math.random(),
            size: 2 + Math.random() * 4,
            speed: 0.002 + Math.random() * 0.005,
            alpha: 0.3 + Math.random() * 0.4,
            hue: 200 + Math.random() * 60
        });
    }
}

// 不同领域颜色主题（铁路工务段各岗位）
const colorThemes = {
    '钢轨探伤': { primary: '#1565c0', secondary: '#0d47a1' },
    '桥隧': { primary: '#7b1fa2', secondary: '#4a148c' },
    '线路': { primary: '#2e7d32', secondary: '#1b5e20' },
    '道口': { primary: '#e65100', secondary: '#bf360c' },
    '路基': { primary: '#c62828', secondary: '#b71c1c' },
    '大型养路机械': { primary: '#00838f', secondary: '#006064' },
    '钢轨焊接': { primary: '#d84315', secondary: '#bf360c' },
    '测量': { primary: '#283593', secondary: '#1a237e' },
    '调度': { primary: '#37474f', secondary: '#263238' },
    '安全': { primary: '#d32f2f', secondary: '#b71c1c' },
    '材料': { primary: '#558b2f', secondary: '#33691e' },
    '教育': { primary: '#5d4037', secondary: '#4e342e' },
    '绿化': { primary: '#1b5e20', secondary: '#0d5302' },
    '防洪': { primary: '#006064', secondary: '#004d40' },
    '信息化': { primary: '#0d47a1', secondary: '#072a6c' }
};

function startVideoAnimation(expert) {
    const canvas = document.getElementById('videoCanvas');
    const container = document.getElementById('videoMain');
    canvas.width = container.clientWidth || 800;
    canvas.height = container.clientHeight || 450;

    const ctx = canvas.getContext('2d');
    initParticles();

    const theme = colorThemes[expert.field] || { primary: '#2196f3', secondary: '#0d47a1' };

    let time = 0;

    function draw() {
        if (!canvas || !canvas.getContext) return;
        const w = canvas.width;
        const h = canvas.height;

        // 清空画布
        ctx.clearRect(0, 0, w, h);

        // 绘制渐变背景
        const gradient = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7);
        gradient.addColorStop(0, theme.primary + '33');
        gradient.addColorStop(0.5, theme.secondary + '44');
        gradient.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // 绘制信号波纹
        ctx.save();
        const centerX = w * 0.5;
        const centerY = h * 0.45;
        for (let i = 0; i < 3; i++) {
            const radius = 40 + i * 35 + (time % 60) * 2;
            const alpha = 0.3 - i * 0.1 - (time % 60) / 600;
            if (alpha > 0) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(76, 175, 80, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        ctx.restore();

        // 绘制粒子
        particles.forEach(p => {
            p.y -= p.speed;
            if (p.y < -0.05) {
                p.y = 1.05;
                p.x = Math.random();
            }
            const x = p.x * w;
            const y = p.y * h;
            const alpha = p.alpha * (0.6 + 0.4 * Math.sin(time * 0.05 + p.x * 10));
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha})`;
            ctx.fill();
        });

        // 绘制底部文字
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = '40px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📹 视频通话中...', w * 0.5, h * 0.85);
        ctx.restore();

        // 绘制专家名称水印
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(expert.name + ' · ' + expert.field, w * 0.5, h * 0.2);
        ctx.restore();

        time++;
        animFrameId = requestAnimationFrame(draw);
    }

    draw();

    // 窗口大小变化时调整 canvas
    function resizeCanvas() {
        if (!container) return;
        canvas.width = container.clientWidth || 800;
        canvas.height = container.clientHeight || 450;
    }
    window.addEventListener('resize', resizeCanvas);
    canvas._resizeHandler = resizeCanvas;
}

function stopVideoAnimation() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    const canvas = document.getElementById('videoCanvas');
    if (canvas && canvas._resizeHandler) {
        window.removeEventListener('resize', canvas._resizeHandler);
    }
}

// ============================================================
//  键盘快捷键
// ============================================================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('videoOverlay');
            if (overlay.classList.contains('show')) {
                endCall();
            }
        }
    });
}

// ============================================================
//  初始化
// ============================================================
function init() {
    renderExperts();
    setupFilters();
    setupCallControls();
    setupKeyboardShortcuts();
    setupScrollHideNav();
    setupScrollTop();
    setupDragCards();
    setupDetailOverlay();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
