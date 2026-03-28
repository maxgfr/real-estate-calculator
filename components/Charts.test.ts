import { computeAmortization, computeAnnualPrincipalVsInterest } from './Charts';

describe('computeAmortization', () => {
  it('should return empty array for zero loan amount', () => {
    expect(computeAmortization(0, 3.5, 20, 1160)).toEqual([]);
  });

  it('should return empty array for zero years', () => {
    expect(computeAmortization(200000, 3.5, 0, 1160)).toEqual([]);
  });

  it('should return empty array for zero monthly payment', () => {
    expect(computeAmortization(200000, 3.5, 20, 0)).toEqual([]);
  });

  it('should start with full balance at year 0', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    expect(data[0]).toEqual({ year: 0, balance: 200000, interest: 0, principal: 0 });
  });

  it('should have balance reach exactly 0 at end (rounded-up payment)', () => {
    // Exact payment ≈ 1159.92, rounded to 1160
    const data = computeAmortization(200000, 3.5, 20, 1160);
    const last = data[data.length - 1];
    expect(last.year).toBe(20);
    expect(last.balance).toBe(0);
    expect(last.principal).toBe(200000);
  });

  it('should have balance reach exactly 0 at end (rounded-down payment)', () => {
    // Exact payment ≈ 872.42, rounded down to 872
    const data = computeAmortization(180000, 3.2, 25, 872);
    const last = data[data.length - 1];
    expect(last.year).toBe(25);
    expect(last.balance).toBe(0);
    expect(last.principal).toBe(180000);
  });

  it('should maintain principal + balance = loanAmount invariant', () => {
    const loanAmount = 180000;
    const data = computeAmortization(loanAmount, 3.2, 25, 872);
    for (const d of data) {
      // Allow ±1 for Math.round
      expect(Math.abs(d.principal + d.balance - loanAmount)).toBeLessThanOrEqual(1);
    }
  });

  it('should handle 0% interest rate correctly', () => {
    const data = computeAmortization(120000, 0, 10, 1000);
    const last = data[data.length - 1];
    expect(last.balance).toBe(0);
    expect(last.principal).toBe(120000);
    expect(last.interest).toBe(0);
  });

  it('should have monotonically decreasing balance', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].balance).toBeLessThanOrEqual(data[i - 1].balance);
    }
  });

  it('should have monotonically increasing cumulative interest', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].interest).toBeGreaterThanOrEqual(data[i - 1].interest);
    }
  });

  it('should have monotonically increasing cumulative principal', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].principal).toBeGreaterThanOrEqual(data[i - 1].principal);
    }
  });

  it('should return years+1 data points', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    expect(data.length).toBe(21); // year 0 through 20
  });
});

describe('computeAnnualPrincipalVsInterest', () => {
  it('should return empty array for zero loan amount', () => {
    expect(computeAnnualPrincipalVsInterest(0, 3.5, 20, 1160)).toEqual([]);
  });

  it('should return empty array for zero years', () => {
    expect(computeAnnualPrincipalVsInterest(200000, 3.5, 0, 1160)).toEqual([]);
  });

  it('should return correct number of data points', () => {
    const data = computeAnnualPrincipalVsInterest(200000, 3.5, 20, 1160);
    expect(data.length).toBe(20); // year 1 through 20
  });

  it('should have total principal sum equal to loan amount (rounded-down payment)', () => {
    // Exact payment ≈ 872.42, rounded down to 872
    const data = computeAnnualPrincipalVsInterest(180000, 3.2, 25, 872);
    const totalPrincipal = data.reduce((sum, d) => sum + d.principal, 0);
    // Allow ±1 for rounding
    expect(Math.abs(totalPrincipal - 180000)).toBeLessThanOrEqual(1);
  });

  it('should have total principal sum equal to loan amount (rounded-up payment)', () => {
    const data = computeAnnualPrincipalVsInterest(200000, 3.5, 20, 1160);
    const totalPrincipal = data.reduce((sum, d) => sum + d.principal, 0);
    // Each year's Math.round can introduce ±0.5, accumulating over 20 years
    expect(Math.abs(totalPrincipal - 200000)).toBeLessThanOrEqual(data.length);
  });

  it('should have interest decreasing and principal increasing over time', () => {
    const data = computeAnnualPrincipalVsInterest(200000, 3.5, 20, 1160);
    // First year should have more interest than last year
    expect(data[0].interest).toBeGreaterThan(data[data.length - 1].interest);
    // First year should have less principal than last year (except last year may be partial)
    expect(data[0].principal).toBeLessThan(data[data.length - 2].principal);
  });

  it('should handle 0% interest rate', () => {
    const data = computeAnnualPrincipalVsInterest(120000, 0, 10, 1000);
    const totalPrincipal = data.reduce((sum, d) => sum + d.principal, 0);
    const totalInterest = data.reduce((sum, d) => sum + d.interest, 0);
    expect(totalPrincipal).toBe(120000);
    expect(totalInterest).toBe(0);
  });
});
