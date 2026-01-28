import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Settings, AlertTriangle } from 'lucide-react';
import React from 'react';

const meta: Meta<typeof Modal> = {
    title: 'UI/Modal',
    component: Modal,
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
    render: () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
            <div style={{ padding: '2rem' }}>
                <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
                <Modal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    title="System Settings"
                    icon={Settings}
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={() => setIsOpen(false)}>Save Changes</Button>
                        </>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p>Configure your workspace preferences and database connections below.</p>
                        <Input label="Workspace Name" defaultValue="My Project" />
                        <Input label="Backup Interval (mins)" type="number" defaultValue="30" />
                    </div>
                </Modal>
            </div>
        );
    },
};

export const Danger: Story = {
    render: () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
            <div style={{ padding: '2rem' }}>
                <Button variant="danger" onClick={() => setIsOpen(true)}>Delete Database</Button>
                <Modal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    title="Confirm Deletion"
                    icon={AlertTriangle}
                    size="sm"
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button variant="danger" onClick={() => setIsOpen(false)}>Confirm Delete</Button>
                        </>
                    }
                >
                    <p>Are you sure you want to permanently delete the database <strong>demo.db</strong>? This action cannot be undone.</p>
                </Modal>
            </div>
        );
    },
};
