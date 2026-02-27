import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Header } from './Header';

const meta = {
  title: 'Example/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onSearch: fn(),
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  args: {
    breakpoint: 'desktop',
    pageName: 'Page Name',
    navItems: [
      { label: 'Nav item 1', active: true, dropdown: false },
      { label: 'Nav item 2', dropdown: true },
      { label: 'Nav item 3', dropdown: true },
      { label: 'Nav item 4', dropdown: true },
      { label: 'Nav item 5', dropdown: true },
    ],
    showSearch: true,
    showButtonGroup: true,
    secondaryCta: { label: 'Secondary' },
    primaryCta: { label: 'Primary' },
  },
};

export const Mobile: Story = {
  args: {
    breakpoint: 'mobile',
    showSearch: true,
    primaryCta: { label: 'Primary CTA' },
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const NoNav: Story = {
  args: {
    breakpoint: 'desktop',
    pageName: 'Page Name',
    navItems: [],
    showSearch: true,
    showButtonGroup: true,
    primaryCta: { label: 'Get started' },
  },
};
