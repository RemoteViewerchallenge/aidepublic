/**
 * @file This is the main entry point for our frontend application.
 *
 * This is the root page of our CSE IDE, where the human director
 * interacts with the system.
 */

import TRPCProvider from './src/app/providers';

export default function HomePage() {
  return (
    <TRPCProvider>
      <h1>Welcome to the Co-operative Multimedia Development Environment</h1>
      {/* Other components will go here */}
    </TRPCProvider>
  );
}