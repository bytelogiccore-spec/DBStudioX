import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Dropdown } from './Dropdown';
import {
    Eye, Edit, Trash2, Copy, FileCode, Play,
    Download, Share2, MoreHorizontal
} from 'lucide-react';
import { Button } from './Button';
import React from 'react';

const meta: Meta<typeof Dropdown> = {
    title: 'UI/Dropdown',
    component: Dropdown,
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

const sampleItems = [
    { label: 'View Details', icon: Eye, onClick: () => console.log('View') },
    { label: 'Edit record', icon: Edit, onClick: () => console.log('Edit'), shortcut: 'Enter' },
    { label: 'Copy SQL', icon: Copy, onClick: () => console.log('Copy'), shortcut: 'Ctrl+C' },
    { type: 'separator' as const },
    { label: 'Export as CSV', icon: FileCode, onClick: () => console.log('Export') },
    { type: 'separator' as const },
    { label: 'Delete item', icon: Trash2, danger: true, onClick: () => console.log('Delete'), shortcut: 'Del' },
];

export const Default: Story = {
    render: () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
            <div style={{ padding: '2rem', height: '300px' }}>
                <Button
                    variant="ghost"
                    icon={MoreHorizontal}
                    onClick={() => setIsOpen(true)}
                >
                    Context Menu
                </Button>
                {isOpen && (
                    <Dropdown
                        x={32}
                        y={70}
                        items={sampleItems}
                        onClose={() => setIsOpen(false)}
                    />
                )}
            </div>
        );
    },
};
