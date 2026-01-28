'use client';

import React, { useState } from 'react';
import { X, Moon, Sun, Globe, Database, Palette, Bell, Shield, Info } from 'lucide-react';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
    onClose?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'database' | 'notifications' | 'about'>('general');

    // Settings state (placeholder - would connect to a settings store)
    const [settings, setSettings] = useState({
        theme: 'dark',
        language: 'en',
        fontSize: 14,
        autoSave: true,
        confirmOnClose: true,
        queryTimeout: 30,
        maxResults: 1000,
        enableNotifications: true,
        soundEnabled: false,
    });

    const tabs = [
        { id: 'general', label: 'General', icon: <Globe size={16} /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
        { id: 'database', label: 'Database', icon: <Database size={16} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
        { id: 'about', label: 'About', icon: <Info size={16} /> },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Settings</h2>
            </div>

            <div className={styles.content}>
                {/* Sidebar Tabs */}
                <div className={styles.sidebar}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
                            onClick={() => setActiveTab(tab.id as any)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className={styles.panel}>
                    {activeTab === 'general' && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>General Settings</h3>

                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Language</span>
                                    <span className={styles.settingDesc}>Select your preferred language</span>
                                </div>
                                <select
                                    className={styles.select}
                                    value={settings.language}
                                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                >
                                    <option value="en">English</option>
                                    <option value="ko">한국어</option>
                                    <option value="ja">日本語</option>
                                </select>
                            </div>

                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Auto-save queries</span>
                                    <span className={styles.settingDesc}>Automatically save query tabs</span>
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={settings.autoSave}
                                        onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>

                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Confirm on close</span>
                                    <span className={styles.settingDesc}>Ask before closing unsaved tabs</span>
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={settings.confirmOnClose}
                                        onChange={(e) => setSettings({ ...settings, confirmOnClose: e.target.checked })}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Appearance</h3>

                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Theme</span>
                                    <span className={styles.settingDesc}>Choose your preferred theme</span>
                                </div>
                                <div className={styles.themeOptions}>
                                    <button
                                        className={`${styles.themeBtn} ${settings.theme === 'dark' ? styles.active : ''}`}
                                        onClick={() => setSettings({ ...settings, theme: 'dark' })}
                                    >
                                        <Moon size={16} />
                                        Dark
                                    </button>
                                    <button
                                        className={`${styles.themeBtn} ${settings.theme === 'light' ? styles.active : ''}`}
                                        onClick={() => setSettings({ ...settings, theme: 'light' })}
                                    >
                                        <Sun size={16} />
                                        Light
                                    </button>
                                </div>
                            </div>

                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Editor font size</span>
                                    <span className={styles.settingDesc}>Font size for the SQL editor</span>
                                </div>
                                <input
                                    type="number"
                                    className={styles.numberInput}
                                    value={settings.fontSize}
                                    min={10}
                                    max={24}
                                    onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'database' && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Database Settings</h3>

                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Query timeout (seconds)</span>
                                    <span className={styles.settingDesc}>Maximum time for query execution</span>
                                </div>
                                <input
                                    type="number"
                                    className={styles.numberInput}
                                    value={settings.queryTimeout}
                                    min={5}
                                    max={300}
                                    onChange={(e) => setSettings({ ...settings, queryTimeout: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Max result rows</span>
                                    <span className={styles.settingDesc}>Limit results to prevent memory issues</span>
                                </div>
                                <input
                                    type="number"
                                    className={styles.numberInput}
                                    value={settings.maxResults}
                                    min={100}
                                    max={100000}
                                    step={100}
                                    onChange={(e) => setSettings({ ...settings, maxResults: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Notifications</h3>

                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Enable notifications</span>
                                    <span className={styles.settingDesc}>Show query completion notifications</span>
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={settings.enableNotifications}
                                        onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>

                            <div className={styles.setting}>
                                <div className={styles.settingInfo}>
                                    <span className={styles.settingLabel}>Sound</span>
                                    <span className={styles.settingDesc}>Play sound on notifications</span>
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={settings.soundEnabled}
                                        onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>About DBStudioX</h3>

                            <div className={styles.aboutContent}>
                                <div className={styles.aboutLogo}>
                                    <div className={styles.logoIcon}>
                                        <span className="material-symbols-outlined">database</span>
                                    </div>
                                    <div>
                                        <span className={styles.appName}>DBStudioX</span>
                                        <span className={styles.appVersion}>Version 0.0.1</span>
                                    </div>
                                </div>

                                <p className={styles.aboutDesc}>
                                    A modern, cross-platform SQLite database management tool built with
                                    Next.js, Tauri, and Rust. Designed for developers who need a fast,
                                    beautiful, and efficient way to work with SQLite databases.
                                </p>

                                <div className={styles.links}>
                                    <a href="#" className={styles.link}>Documentation</a>
                                    <a href="#" className={styles.link}>GitHub Repository</a>
                                    <a href="#" className={styles.link}>Report an Issue</a>
                                </div>

                                <div className={styles.copyright}>
                                    © 2026 ByteLogic Studio. All rights reserved.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
