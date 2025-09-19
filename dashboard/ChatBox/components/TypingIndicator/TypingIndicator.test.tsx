import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { type UserProfile } from '@common/types';
import TypingIndicator from './TypingIndicator';

describe('TypingIndicator', () => {
  const mockUser: UserProfile = {
    id: 'test-user-1',
    name: 'John Doe',
    type: 'customer',
    email: 'john@example.com'
  };

  it('should render typing indicator with animated dots', () => {
    // when rendering the typing indicator
    const { container } = render(<TypingIndicator user={mockUser} />);

    // then should display animated dots
    const dots = container.querySelectorAll('.unjam-animate-pulse');
    expect(dots).toHaveLength(3);
  });

  it('should have correct styling for dots', () => {
    // when rendering the typing indicator
    const { container } = render(<TypingIndicator user={mockUser} />);

    // then dots should have correct classes
    const dots = container.querySelectorAll('.unjam-w-2.unjam-h-2.unjam-bg-gray-400.unjam-rounded-full');
    expect(dots).toHaveLength(3);
  });

  it('should have different animation delays for dots', () => {
    // when rendering the typing indicator
    const { container } = render(<TypingIndicator user={mockUser} />);

    // then dots should have different animation delays
    const dots = container.querySelectorAll('.unjam-animate-pulse');
    expect(dots[0]).toHaveStyle('animation-delay: 0ms');
    expect(dots[1]).toHaveStyle('animation-delay: 150ms');
    expect(dots[2]).toHaveStyle('animation-delay: 300ms');
  });

  it('should have correct styling for typing bubble', () => {
    // when rendering the typing indicator
    const { container } = render(<TypingIndicator user={mockUser} />);

    // then should have typing bubble with correct classes matching ChatMessage
    const bubble = container.querySelector('.unjam-rounded-2xl.unjam-px-4.unjam-py-3.unjam-shadow-sm');
    expect(bubble).toBeInTheDocument();
  });
});