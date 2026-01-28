import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tabs } from './Tabs';
import { Database, Table, Code, History, Plus } from 'lucide-react';
import { Button } from './Button';
import React, { useState } from 'react';

const meta: Meta<typeof Tabs> = {
    title: 'UI/Tabs',
    component: Tabs,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const sampleTabs = [
    { id: '1', label: 'Query 1', icon: Code, closable: true },
    { id: '2', label: 'Users Table', icon: Table, closable: true },
    { id: '3', label: 'Database Logs', icon: Database },
];

export const Default: Story = {
    args: {
        tabs: sampleTabs,
        activeTabId: '1',
    },
};

export const WithExtra: Story = {
    args: {
        tabs: sampleTabs,
        activeTabId: '1',
        extra: <Button variant="ghost" size="sm" icon={Plus} />,
    },
};

export const Interactive: Story = {
    render: () => {
        const [active, setActive] = useState('1');
        return (
            <Tabs
                tabs={sampleTabs}
                activeTabId={active}
                onTabChange={setActive}
                onTabClose={(id: string) => console.log('Closed', id)}
                extra={<Button variant="ghost" size="sm" icon={Plus} />}
            />
        );
    },
};
