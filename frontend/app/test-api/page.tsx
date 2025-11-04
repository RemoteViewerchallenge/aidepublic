'use client';

import { useEffect, useState } from 'react';

export default function TestAPI() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('🧪 Testing API endpoint...');
        const response = await fetch(
          'http://localhost:3000/api/trpc/getModelsFromDatabase'
        );
        console.log('📊 Response status:', response.status);

        const result = await response.json();
        console.log('📊 Response data:', result);

        // Check if it's a tRPC response format
        if (result && result.result && result.result.data) {
          setData(result.result.data);
          console.log(
            '✅ Found tRPC formatted data:',
            result.result.data.length,
            'models'
          );
        } else if (Array.isArray(result)) {
          setData(result);
          console.log('✅ Found direct array data:', result.length, 'models');
        } else {
          setError('Unexpected response format');
          console.log('❌ Unexpected response format:', result);
        }
      } catch (err) {
        console.error('❌ API test failed:', err);
        setError(`API test failed: ${err}`);
      }
    };

    testAPI();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API Test Page</h1>
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>Error: {error}</div>
      )}
      {data && (
        <div>
          <h2>
            Success! Found {Array.isArray(data) ? data.length : 'unknown'}{' '}
            models
          </h2>
          <h3>First few models:</h3>
          <pre
            style={{
              background: '#f5f5f5',
              padding: '10px',
              overflow: 'auto',
              maxHeight: '400px',
            }}
          >
            {JSON.stringify(
              Array.isArray(data) ? data.slice(0, 3) : data,
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
