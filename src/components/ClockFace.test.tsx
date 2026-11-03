import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClockFace, FinishedFace } from './ClockFace';

const digitsOf = (container: HTMLElement) =>
  [...container.querySelectorAll('.clock-digits')].map((g) =>
    // A flip card holds its digit several times (halves and moving flaps); the first half is the current one.
    g.querySelector('.flip-digit')
      ? [...g.querySelectorAll('.flip-digit')].map((d) => d.querySelector('.flip-top')?.textContent).join('')
      : g.textContent,
  );

describe('ClockFace', () => {
  it('shows days, hours, minutes and seconds with labels, and reads well to screen readers', () => {
    const { container } = render(<ClockFace seconds={58 * 86_400 + 3_600 + 24 * 60 + 7} variant="card" flip={false} />);
    expect(digitsOf(container)).toEqual(['58', '01', '24', '07']);
    expect([...container.querySelectorAll('.clock-unit')].map((u) => u.textContent)).toEqual(['days', 'hours', 'minutes', 'seconds']);
    expect(screen.getByRole('timer')).toHaveAccessibleName('58 days, 1 hour, 24 minutes, 7 seconds left');
  });

  it('tells CSS how many digits and separators it has, so it can size them to fit', () => {
    const { container } = render(<ClockFace seconds={25 * 60} variant="stage" flip={false} />);
    const clock = container.querySelector('.clock') as HTMLElement;
    expect(clock.style.getPropertyValue('--cells')).toBe('4');
    expect(clock.style.getPropertyValue('--seps')).toBe('1');
    expect(clock).toHaveClass('clock-stage');
  });

  it('draws split-flap cards in the Flip theme and flips only the digits that change', () => {
    const { container, rerender } = render(<ClockFace seconds={25 * 60} variant="card" flip />);
    expect(digitsOf(container)).toEqual(['25', '00']);
    expect(container.querySelectorAll('.flip-fold')).toHaveLength(0);
    rerender(<ClockFace seconds={25 * 60 - 1} variant="card" flip />);
    expect(digitsOf(container)).toEqual(['24', '59']);
    // 25:00 → 24:59 changes three digits: 5→4, 0→5, 0→9.
    expect(container.querySelectorAll('.flip-fold')).toHaveLength(3);
  });
});

describe('FinishedFace', () => {
  it('says time is up and counts the overtime', () => {
    render(<FinishedFace overtime={83} variant="card" />);
    expect(screen.getByText('Time’s up!')).toBeInTheDocument();
    expect(screen.getByText('+1:23')).toHaveAccessibleName('1 minute, 23 seconds over');
  });
});
