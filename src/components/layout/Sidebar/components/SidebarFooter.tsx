'use client';

import React from 'react';
import { MainView } from '@/stores/uiStore';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from '../../Sidebar.module.css';

interface SidebarFooterProps {
    activeConnection: any;
    activeView: MainView;
    setActiveView: (view: MainView) => void;
    sidebarCollapsed: boolean;
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({
    activeConnection,
    activeView,
    setActiveView,
    sidebarCollapsed
}) => {
    return (
        <div className={styles.footer}>
            <Button
                variant={activeView === 'about' ? 'secondary' : 'ghost'}
                size="sm"
                fullWidth
                icon={Info}
                onClick={() => setActiveView('about')}
                className={styles.footerAction}
            >
                {!sidebarCollapsed && 'About'}
            </Button>
        </div>
    );
};

export default SidebarFooter;
