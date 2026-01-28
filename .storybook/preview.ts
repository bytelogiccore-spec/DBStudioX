import type { Preview } from '@storybook/nextjs-vite';
import '../src/styles/globals.css';
import '../src/styles/fonts.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo'
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0c' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};

export default preview;