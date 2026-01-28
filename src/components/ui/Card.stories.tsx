import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card } from './Card';
import { Button } from './Button';
import { Database, Info, Settings } from 'lucide-react';

const meta: Meta<typeof Card> = {
    title: 'UI/Card',
    component: Card,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    args: {
        title: 'Database Statistics',
        icon: Database,
        children: 'This is a sample card content showing database performance metrics.',
    },
};

export const WithFooter: Story = {
    args: {
        title: 'Connection Settings',
        icon: Settings,
        children: 'Configure your SQLite connection parameters here.',
        footer: (
            <>
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button variant="primary" size="sm">Save Changes</Button>
            </>
        ),
    },
};

export const Hoverable: Story = {
    args: {
        title: 'Clickable Card',
        icon: Info,
        children: 'Hover over this card to see the transformation effect.',
        hoverable: true,
    },
};

export const Complex: Story = {
    args: {
        title: 'User Profile',
        headerAction: <Button variant="ghost" size="sm">Edit</Button>,
        children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p><strong>Name:</strong> Admin User</p>
                <p><strong>Role:</strong> Superuser</p>
                <p><strong>Last Login:</strong> 2026-01-28</p>
            </div>
        ),
        footer: <span style={{ fontSize: '12px', opacity: 0.6 }}>Last updated 5 mins ago</span>,
    },
};
