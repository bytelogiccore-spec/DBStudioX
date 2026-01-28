'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            common: {
                tables: 'Tables',
                views: 'Views',
                indexes: 'Indexes',
                triggers: 'Triggers',
                explorer: 'Explorer',
                favorites: 'Favorites',
                monitoring: 'Monitoring',
                performance: 'Performance',
                export: 'Export',
                history: 'History',
                query: 'Query',
                execute: 'Execute',
                connect: 'Connect',
                disconnect: 'Disconnect',
                about: 'About',
                settings: 'Settings'
            }
        }
    },
    ko: {
        translation: {
            common: {
                tables: '테이블',
                views: '뷰',
                indexes: '인덱스',
                triggers: '트리거',
                explorer: '탐색기',
                favorites: '즐겨찾기',
                monitoring: '모니터링',
                performance: '성능',
                export: '내보내기',
                history: '히스토리',
                query: '쿼리',
                execute: '실행',
                connect: '연결',
                disconnect: '해제',
                about: '정보',
                settings: '설정'
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        }
    });

export default i18n;
