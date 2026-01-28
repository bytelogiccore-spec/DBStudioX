'use client';

import React from 'react';
import { Info, ExternalLink, ShieldCheck, Cpu } from 'lucide-react';
import styles from './AboutDashboard.module.css';

const AboutDashboard: React.FC = () => {
    const libraries = [
        { name: 'Monaco Editor', license: 'MIT', url: 'https://github.com/microsoft/monaco-editor', desc: 'The powerful code editor powering VS Code.' },
        { name: 'TanStack Table', license: 'MIT', url: 'https://tanstack.com/table', desc: 'Headless UI for building powerful tables & datagrids.' },
        { name: 'Tauri', license: 'Apache 2.0 / MIT', url: 'https://tauri.app/', desc: 'Build smaller, faster, and more secure desktop apps.' },
        { name: 'React', license: 'MIT', url: 'https://reactjs.org/', desc: 'A JavaScript library for building user interfaces.' },
        { name: 'Zustand', license: 'MIT', url: 'https://zustand-demo.pmnd.rs/', desc: 'A small, fast and scalable bearbones state-management solution.' },
        { name: 'Recharts', license: 'MIT', url: 'https://recharts.org/', desc: 'A composable charting library built on React components.' },
        { name: 'Lucide React', license: 'ISC', url: 'https://lucide.dev/', desc: 'Beautiful & consistent icon toolkit.' },
    ];

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.hero}>
                <div className={styles.logoWrapper}>
                    <div className={styles.logoInner}>
                        <Cpu size={48} style={{ color: 'var(--brand-primary)' }} />
                    </div>
                </div>
                <h1 className={styles.title}>
                    DBStudio<span className={styles.titleAccent}>X</span>
                </h1>
                <div className={styles.versionBadge}>
                    Version 0.0.1 Alpha
                </div>
                <p className={styles.description}>
                    The next-generation SQLite management workstation built for performance, precision, and visual excellence.
                </p>
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Organization Section */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <ShieldCheck size={14} style={{ color: 'var(--brand-primary)' }} />
                        Engineering Team
                    </h2>
                    <div className={styles.card}>
                        <p className={styles.cardText}>
                            Developed with pride by <span className={styles.highlight}>ByteLogic Studio</span>.
                            Our mission is to bridge the gap between low-level database efficiency and modern developer experience.
                        </p>
                    </div>
                </section>

                {/* Open Source Licenses */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Info size={14} style={{ color: 'var(--brand-primary)' }} />
                        Open Source & Licenses
                    </h2>
                    <div className={styles.libraryGrid}>
                        {libraries.map((lib) => (
                            <a
                                key={lib.name}
                                href={lib.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.libraryCard}
                            >
                                <div>
                                    <div className={styles.libraryHeader}>
                                        <h3 className={styles.libraryName}>{lib.name}</h3>
                                        <div className={styles.licenseBadge}>{lib.license}</div>
                                    </div>
                                    <p className={styles.libraryDesc}>{lib.desc}</p>
                                </div>
                                <div className={styles.viewSource}>
                                    View Source <ExternalLink size={10} />
                                </div>
                            </a>
                        ))}
                    </div>
                </section>

                {/* Footer */}
                <div className={styles.footer}>
                    <p>© 2026 ByteLogic Studio. All Rights Reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default AboutDashboard;
