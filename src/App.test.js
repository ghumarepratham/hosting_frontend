import { render, screen } from '@testing-library/react';
import App from './App';

test('renders analyzer heading', () => {
  render(<App />);
  expect(screen.getByText(/CSV \/ Excel Analyzer/i)).toBeInTheDocument();
});
