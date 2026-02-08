
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'flat'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    label: { control: 'text' },
  },
  args: {
    variant: 'primary',
    size: 'medium',
    label: 'Button',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default button example. Use the **Mode** dropdown in the toolbar
 * to see how it changes across different modes.
 */
export const Default: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: 'calc(100vh - 200px)',
          padding: '100px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
