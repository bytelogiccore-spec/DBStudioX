import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './Button';
import { Search, Trash2, Save, Download } from 'lucide-react';

const meta: Meta<typeof Button> = {
    title: 'UI/Button',
    component: Button,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'danger', 'ghost'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
    args: {
        variant: 'primary',
        children: 'Primary Button',
    },
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary Button',
    },
};

export const Danger: Story = {
    args: {
        variant: 'danger',
        children: 'Delete Item',
        icon: Trash2,
    },
};

export const Ghost: Story = {
    args: {
        variant: 'ghost',
        children: 'Ghost Button',
    },
};

export const WithIcon: Story = {
    args: {
        variant: 'primary',
        children: 'Search Database',
        icon: Search,
    },
};

export const IconOnly: Story = {
    args: {
        variant: 'secondary',
        icon: Save,
        'aria-label': 'Save Changes',
    },
};

export const Loading: Story = {
    args: {
        variant: 'primary',
        children: 'Saving...',
        isLoading: true,
    },
};

export const Sizes: Story = {
    render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Button size="sm" variant="primary">Small</Button>
            <Button size="md" variant="primary">Medium</Button>
            <Button size="lg" variant="primary">Large</Button>
        </div>
    ),
};
