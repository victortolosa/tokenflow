
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    primary: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
    label: { control: 'text' },
  },
  args: {
    primary: true,
    size: 'medium',
    label: 'Button',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default button example. Use the **Theme** dropdown in the toolbar
 * to see how it changes across different themes.
 */
export const Default: Story = {};
