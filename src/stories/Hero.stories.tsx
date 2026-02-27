import type { Meta, StoryObj } from '@storybook/react';
import { Hero as HeroComponent } from './Hero';

const meta: Meta<typeof HeroComponent> = {
  title: 'Components/Hero',
  component: HeroComponent,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    curtainActive: { control: 'boolean' },
    showScrollButton: { control: 'boolean' },
  },
  args: {
    eyebrow: 'Eyebrow text (annotation)',
    title: 'Hero Title (H1)',
    titleSuffix: 'Inceptos Tempor',
    subtitle: 'Hero Subtitle (p1) Duis tempor auctor ultricies habitant',
    body: 'Hero Body (p2) Duis tempor auctor ultricies habitant facilisi malesuada natoque vehicula semper curabitur vivamus efficitur porta varius turpis praesent ornare hendreri.',
    primaryCta: 'Primary CTA',
    secondaryCta: 'Secondary CTA',
    imageAlt: 'Placeholder image',
    showScrollButton: false,
    curtainActive: false,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Hero: Story = {};
