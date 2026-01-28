import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
    title: 'UI/Badge',
    component: Badge,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Info: Story = {
    args: {
        variant: 'info',
        children: 'Info',
    },
};

export const Success: Story = {
    args: {
        variant: 'success',
        children: 'Success',
    },
};

export const Warning: Story = {
    args: {
        variant: 'warning',
        children: 'Warning',
    },
};

export const Error: Story = {
    args: {
        variant: 'error',
        children: 'Error',
    },
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary',
    },
};

export const Outline: Story = {
    args: {
        variant: 'outline',
        children: 'Outline',
    },
};

export const Variants: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Badge variant="success">Connected</Badge>
            <Badge variant="warning">Syncing</Badge>
            <Badge variant="error">Failed</Badge>
            <Badge variant="info">New</Badge>
            <Badge variant="secondary">UDF</Badge>
        </div>
    ),
};
