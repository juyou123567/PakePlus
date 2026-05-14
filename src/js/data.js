// ============================================
// 轨距智测先锋 - 数据管理模块
// 负责所有本地数据的存储、读取、导入导出
// ============================================

/**
 * 数据存储管理器
 * 将数据持久化到 localStorage，并提供统一的读写接口
 */
const DataManager = {
    // 存储键名常量
    KEYS: {
        USERS: 'gaugeApp_users',
        LOGGED_IN: 'gaugeApp_loggedIn',
        RECORDS: 'gaugeApp_records',
        DEVICES: 'gaugeApp_devices',
        SETTINGS: 'gaugeApp_settings',
        PROFILE: 'gaugeApp_profile'
    },

    // ===== 通用方法 =====

    /**
     * 保存数据到 localStorage
     * @param {string} key - 存储键名
     * @param {*} data - 要存储的数据
     */
    save: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('数据保存失败:', key, e);
            return false;
        }
    },

    /**
     * 从 localStorage 读取数据
     * @param {string} key - 存储键名
     * @param {*} defaultValue - 默认值（数据不存在时返回）
     * @returns {*} 解析后的数据
     */
    load: function(key, defaultValue) {
        try {
            var raw = localStorage.getItem(key);
            if (raw) {
                return JSON.parse(raw);
            }
            return defaultValue;
        } catch (e) {
            console.error('数据读取失败:', key, e);
            return defaultValue;
        }
    },

    /**
     * 删除指定键的数据
     * @param {string} key - 存储键名
     */
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('数据删除失败:', key, e);
            return false;
        }
    },

    /**
     * 清空所有应用数据
     */
    clearAll: function() {
        var keys = Object.values(this.KEYS);
        keys.forEach(function(key) {
            localStorage.removeItem(key);
        });
    },

    /**
     * 获取当前存储使用量（字节）
     * @returns {number} 已使用的字节数
     */
    getStorageSize: function() {
        var total = 0;
        for (var key in localStorage) {
            if (key.startsWith('gaugeApp_')) {
                total += localStorage[key].length * 2; // UTF-16 编码
            }
        }
        return total;
    },

    /**
     * 格式化存储大小
     * @returns {string} 格式化后的大小字符串
     */
    getStorageSizeFormatted: function() {
        var bytes = this.getStorageSize();
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    // ===== 用户账号管理 =====

    /**
     * 获取所有用户账号
     * @returns {Array} 用户账号数组
     */
    getUsers: function() {
        return this.load(this.KEYS.USERS, []);
    },

    /**
     * 保存用户账号列表
     * @param {Array} users - 用户账号数组
     */
    saveUsers: function(users) {
        return this.save(this.KEYS.USERS, users);
    },

    /**
     * 添加新用户
     * @param {Object} user - 用户对象 { username, password, company, phone }
     * @returns {boolean} 是否成功
     */
    addUser: function(user) {
        var users = this.getUsers();
        // 检查用户名是否已存在
        for (var i = 0; i < users.length; i++) {
            if (users[i].username === user.username) {
                return false;
            }
        }
        users.push(user);
        return this.saveUsers(users);
    },

    /**
     * 验证用户登录
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Object|null} 匹配的用户对象，失败返回 null
     */
    validateLogin: function(username, password) {
        var users = this.getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].username === username && users[i].password === password) {
                return users[i];
            }
        }
        return null;
    },

    /**
     * 更新用户信息
     * @param {string} username - 用户名
     * @param {Object} updates - 要更新的字段
     * @returns {boolean} 是否成功
     */
    updateUser: function(username, updates) {
        var users = this.getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].username === username) {
                for (var key in updates) {
                    users[i][key] = updates[key];
                }
                return this.saveUsers(users);
            }
        }
        return false;
    },

    /**
     * 获取当前登录用户
     * @returns {Object|null} 当前登录用户
     */
    getLoggedInUser: function() {
        return this.load(this.KEYS.LOGGED_IN, null);
    },

    /**
     * 设置当前登录用户
     * @param {Object} userData - 用户数据 { username }
     */
    setLoggedInUser: function(userData) {
        return this.save(this.KEYS.LOGGED_IN, userData);
    },

    /**
     * 清除登录状态
     */
    clearLoggedInUser: function() {
        return this.remove(this.KEYS.LOGGED_IN);
    },

    // ===== 测量记录管理 =====

    /**
     * 获取所有测量记录
     * @returns {Array} 测量记录数组
     */
    getRecords: function() {
        return this.load(this.KEYS.RECORDS, []);
    },

    /**
     * 保存测量记录列表
     * @param {Array} records - 测量记录数组
     */
    saveRecords: function(records) {
        return this.save(this.KEYS.RECORDS, records);
    },

    /**
     * 添加一条测量记录
     * @param {Object} record - 测量记录对象
     * @returns {boolean} 是否成功
     */
    addRecord: function(record) {
        var records = this.getRecords();
        records.unshift(record);
        return this.saveRecords(records);
    },

    /**
     * 批量添加测量记录
     * @param {Array} newRecords - 新记录数组
     */
    addRecords: function(newRecords) {
        var records = this.getRecords();
        for (var i = 0; i < newRecords.length; i++) {
            records.unshift(newRecords[i]);
        }
        return this.saveRecords(records);
    },

    /**
     * 删除指定记录
     * @param {number|string} recordId - 记录ID
     * @returns {boolean} 是否成功
     */
    deleteRecord: function(recordId) {
        var records = this.getRecords();
        var newRecords = [];
        for (var i = 0; i < records.length; i++) {
            if (records[i].id !== recordId) {
                newRecords.push(records[i]);
            }
        }
        return this.saveRecords(newRecords);
    },

    /**
     * 清空所有测量记录
     */
    clearRecords: function() {
        return this.save(this.KEYS.RECORDS, []);
    },

    /**
     * 按条件查询记录
     * @param {Object} filters - 过滤条件 { line, direction, dateFrom, dateTo, keyword }
     * @returns {Array} 符合条件的记录
     */
    queryRecords: function(filters) {
        var records = this.getRecords();
        if (!filters) return records;

        return records.filter(function(record) {
            // 按线路筛选
            if (filters.line && record.line !== filters.line) return false;
            // 按行别筛选
            if (filters.direction && record.direction !== filters.direction) return false;
            // 按日期范围筛选
            if (filters.dateFrom && record.date < filters.dateFrom) return false;
            if (filters.dateTo && record.date > filters.dateTo) return false;
            // 按关键词搜索
            if (filters.keyword) {
                var kw = filters.keyword.toLowerCase();
                var searchText = (record.line + record.direction + record.startKm + record.endKm + record.operator + record.note).toLowerCase();
                if (searchText.indexOf(kw) === -1) return false;
            }
            return true;
        });
    },

    /**
     * 获取记录统计信息
     * @returns {Object} 统计信息
     */
    getRecordStats: function() {
        var records = this.getRecords();
        if (records.length === 0) {
            return { total: 0, overLimit: 0, passRate: 0, avgGauge: 0, maxGauge: 0, minGauge: 0 };
        }

        var overLimit = 0;
        var sumGauge = 0;
        var maxGauge = -Infinity;
        var minGauge = Infinity;

        for (var i = 0; i < records.length; i++) {
            var g = records[i].data.gauge;
            sumGauge += g;
            if (g > maxGauge) maxGauge = g;
            if (g < minGauge) minGauge = g;
            if (Math.abs(g - 1435) > 4) overLimit++;
        }

        return {
            total: records.length,
            overLimit: overLimit,
            passRate: ((records.length - overLimit) / records.length * 100).toFixed(1),
            avgGauge: (sumGauge / records.length).toFixed(1),
            maxGauge: maxGauge.toFixed(1),
            minGauge: minGauge.toFixed(1)
        };
    },

    // ===== 设备管理 =====

    /**
     * 获取已保存的设备列表
     * @returns {Array} 设备数组
     */
    getDevices: function() {
        return this.load(this.KEYS.DEVICES, []);
    },

    /**
     * 保存设备列表
     * @param {Array} devices - 设备数组
     */
    saveDevices: function(devices) {
        return this.save(this.KEYS.DEVICES, devices);
    },

    /**
     * 添加或更新设备
     * @param {Object} device - 设备对象
     */
    saveDevice: function(device) {
        var devices = this.getDevices();
        var found = false;
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].id === device.id) {
                devices[i] = device;
                found = true;
                break;
            }
        }
        if (!found) {
            devices.push(device);
        }
        return this.saveDevices(devices);
    },

    /**
     * 删除设备
     * @param {string} deviceId - 设备ID
     */
    deleteDevice: function(deviceId) {
        var devices = this.getDevices();
        var newDevices = [];
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].id !== deviceId) {
                newDevices.push(devices[i]);
            }
        }
        return this.saveDevices(newDevices);
    },

    /**
     * 获取当前连接的设备
     * @returns {Object|null} 当前设备
     */
    getCurrentDevice: function() {
        var devices = this.getDevices();
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].isCurrent) return devices[i];
        }
        return null;
    },

    // ===== 设置管理 =====

    /**
     * 获取应用设置
     * @returns {Object} 设置对象
     */
    getSettings: function() {
        var defaults = {
            autoConnect: true,
            voiceReport: false,
            alarmPopup: true,
            autoSave: true,
            cloudSync: false,
            thresholds: {
                gauge: 4.0,
                level: 5.0,
                twist: 3.0,
                align: 4.0
            }
        };
        var saved = this.load(this.KEYS.SETTINGS, null);
        if (saved) {
            // 合并默认值，确保所有字段都存在
            for (var key in defaults) {
                if (saved[key] === undefined) saved[key] = defaults[key];
            }
            return saved;
        }
        return defaults;
    },

    /**
     * 保存应用设置
     * @param {Object} settings - 设置对象
     */
    saveSettings: function(settings) {
        return this.save(this.KEYS.SETTINGS, settings);
    },

    /**
     * 更新单个设置项
     * @param {string} key - 设置键名
     * @param {*} value - 设置值
     */
    updateSetting: function(key, value) {
        var settings = this.getSettings();
        settings[key] = value;
        return this.saveSettings(settings);
    },

    // ===== 用户资料管理 =====

    /**
     * 获取用户资料
     * @returns {Object} 用户资料
     */
    getProfile: function() {
        var defaults = {
            username: '管理员',
            company: '未设置',
            phone: '未设置'
        };
        var saved = this.load(this.KEYS.PROFILE, null);
        if (saved) {
            for (var key in defaults) {
                if (saved[key] === undefined) saved[key] = defaults[key];
            }
            return saved;
        }
        return defaults;
    },

    /**
     * 保存用户资料
     * @param {Object} profile - 用户资料
     */
    saveProfile: function(profile) {
        return this.save(this.KEYS.PROFILE, profile);
    },

    // ===== 数据导入导出 =====

    /**
     * 导出所有数据为 JSON 字符串
     * @returns {string} JSON 格式的完整数据
     */
    exportAllData: function() {
        var data = {
            version: '2.0.0',
            exportTime: new Date().toLocaleString('zh-CN'),
            users: this.getUsers(),
            records: this.getRecords(),
            devices: this.getDevices(),
            settings: this.getSettings(),
            profile: this.getProfile()
        };
        return JSON.stringify(data, null, 2);
    },

    /**
     * 从 JSON 字符串导入数据
     * @param {string} jsonStr - JSON 格式的数据
     * @returns {Object} 导入结果 { success, message, recordCount }
     */
    importAllData: function(jsonStr) {
        try {
            var data = JSON.parse(jsonStr);
            if (!data.version) {
                return { success: false, message: '无效的备份文件格式', recordCount: 0 };
            }

            if (data.users && Array.isArray(data.users)) {
                this.saveUsers(data.users);
            }
            if (data.records && Array.isArray(data.records)) {
                this.saveRecords(data.records);
            }
            if (data.devices && Array.isArray(data.devices)) {
                this.saveDevices(data.devices);
            }
            if (data.settings) {
                this.saveSettings(data.settings);
            }
            if (data.profile) {
                this.saveProfile(data.profile);
            }

            var count = data.records ? data.records.length : 0;
            return { success: true, message: '数据导入成功', recordCount: count };
        } catch (e) {
            return { success: false, message: '数据解析失败: ' + e.message, recordCount: 0 };
        }
    },

    /**
     * 下载数据为文件
     * @param {string} content - 文件内容
     * @param {string} filename - 文件名
     * @param {string} mimeType - MIME 类型
     */
    downloadFile: function(content, filename, mimeType) {
        var blob = new Blob([content], { type: mimeType || 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 导出数据为备份文件（下载）
     * @param {string} filename - 文件名（可选）
     */
    downloadBackup: function(filename) {
        if (!filename) {
            var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
            filename = '轨距智测先锋_备份_' + dateStr + '.json';
        }
        var content = this.exportAllData();
        this.downloadFile(content, filename, 'application/json');
    },

    /**
     * 从文件导入数据
     * @param {File} file - 文件对象
     * @param {Function} callback - 回调函数 (result)
     */
    importFromFile: function(file, callback) {
        var reader = new FileReader();
        var self = this;
        reader.onload = function(e) {
            var result = self.importAllData(e.target.result);
            if (callback) callback(result);
        };
        reader.onerror = function() {
            if (callback) callback({ success: false, message: '文件读取失败', recordCount: 0 });
        };
        reader.readAsText(file);
    },

    // ===== 数据统计与清理 =====

    /**
     * 获取数据概览
     * @returns {Object} 数据概览
     */
    getOverview: function() {
        var users = this.getUsers();
        var records = this.getRecords();
        var devices = this.getDevices();
        var stats = this.getRecordStats();

        return {
            userCount: users.length,
            recordCount: records.length,
            deviceCount: devices.length,
            storageSize: this.getStorageSizeFormatted(),
            stats: stats
        };
    },

    /**
     * 清理所有数据（恢复出厂设置）
     */
    factoryReset: function() {
        this.clearAll();
        // 重新创建默认管理员账号
        var defaultUsers = [
            { username: 'admin', password: '123456', company: '沈阳铁路局工务段', phone: '138-0000-0000' }
        ];
        this.saveUsers(defaultUsers);
    }
};

// ===== 导出模块（兼容不同环境） =====
// 浏览器环境
if (typeof window !== 'undefined') {
    window.DataManager = DataManager;
}

// Node.js 环境（Electron 等）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
