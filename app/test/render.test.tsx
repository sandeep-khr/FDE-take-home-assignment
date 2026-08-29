import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../src/App';

afterEach(cleanup);

describe('the review app', () => {
  it('renders the hero with real pipeline numbers', () => {
    render(<App />);
    expect(screen.getByText(/86 raw listings/i)).toBeTruthy();
    expect(screen.getAllByText(/₹59,500/).length).toBeGreaterThan(0);
  });

  it('shows the quarantine gallery with all five planted rows and their stories', () => {
    render(<App />);
    for (const id of ['CP-0081', 'CP-0082', 'CP-0083', 'CP-0084', 'CP-0085']) {
      expect(screen.getAllByText(id).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(/before posted/).length).toBeGreaterThan(0); // CP-0084 story
    expect(screen.getByText(/validates itself/i)).toBeTruthy(); // CP-0081 narrative
  });

  it('renders the suspect pair and the merged alias group incl. Phase 1', () => {
    render(<App />);
    expect(screen.getAllByText('CP-0026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CP-0053').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lakeview Residences Phase 1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/merged · 3 bridges/)).toBeTruthy();
  });

  it('walks the median and shows both verdict readings with opposite signs', () => {
    render(<App />);
    expect(screen.getByText('Tier 1 · semi-furnished')).toBeTruthy();
    expect(screen.getAllByText('+2.5%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-5.9%').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/above/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/below/).length).toBeGreaterThan(0);
  });

  it('renders the failure case: 4 weak survivors, LOW, collect-next list', () => {
    render(<App />);
    for (const id of ['CP-0005', 'CP-0012', 'CP-0016', 'CP-0027']) {
      expect(screen.getAllByText(id).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(/LOW/).length).toBeGreaterThan(0);
    expect(screen.getByText(/what to collect/i)).toBeTruthy();
  });

  it('renders every config threshold from the live object', () => {
    render(<App />);
    expect(screen.getByText('staleExcludeAfterDays')).toBeTruthy();
    expect(screen.getByText('30 d')).toBeTruthy();
    expect(screen.getByText('minIndependentBridgesToMerge')).toBeTruthy();
  });

  it('live override: excluding a tier1 comp shrinks the funnel and logs the reason', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Exclude CP-0018'));
    fireEvent.change(screen.getByLabelText('Reason for CP-0018'), {
      target: { value: 'suspect broker relist' },
    });
    fireEvent.click(screen.getByLabelText('Confirm override CP-0018'));

    const log = screen.getByText('your reason').closest('table')!;
    expect(within(log).getByText('suspect broker relist')).toBeTruthy();
    expect(screen.getByText(/tier 1 = 20 rows/i)).toBeTruthy();
  });
});
