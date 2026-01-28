import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
    title: 'UI/Select',
    component: Select,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

const themes = [
    { value: 'dark', label: 'Space Dark (Default)' },
    { value: 'light', label: 'Light Mode' },
    { value: 'system', label: 'System Default' },
];

export const Default: Story = {
    args: {
        options: themes,
    },
};

export const WithLabel: Story = {
    args: {
        label: 'Select Theme',
        options: themes,
    },
};

export const ErrorState: Story = {
    args: {
        label: 'Database Version',
        options: [
            { value: '', label: 'Select version...' },
            { value: '3', label: 'SQLite 3' },
            { value: '2', label: 'SQLite 2 (Outdated)' },
        ],
        error: 'Please select a compatible version.',
    },
};

export const Disabled: Story = {
    args: {
        label: 'Active Migration',
        options: [
            { value: '1', label: 'Migration #202401' },
        ],
        disabled: true,
    },
};
