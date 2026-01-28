import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from './Input';
import { Search, Mail, Lock, Database } from 'lucide-react';

const meta: Meta<typeof Input> = {
    title: 'UI/Input',
    component: Input,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        placeholder: 'Enter text here...',
    },
};

export const WithLabel: Story = {
    args: {
        label: 'Database Path',
        placeholder: 'C:/path/to/database.db',
        defaultValue: 'demo.db',
    },
};

export const WithIconLeft: Story = {
    args: {
        placeholder: 'Search tables...',
        iconLeft: Search,
    },
};

export const WithIconRight: Story = {
    args: {
        placeholder: 'Database name',
        iconRight: Database,
    },
};

export const Password: Story = {
    args: {
        label: 'Password',
        type: 'password',
        placeholder: '••••••••',
        iconLeft: Lock,
    },
};

export const ErrorState: Story = {
    args: {
        label: 'Email Address',
        type: 'email',
        placeholder: 'user@example.com',
        iconLeft: Mail,
        error: 'Please enter a valid email address.',
        defaultValue: 'invalid-email',
    },
};

export const Disabled: Story = {
    args: {
        label: 'Read Only Field',
        defaultValue: 'You cannot edit this',
        disabled: true,
    },
};
