'use client';

export default function SimpleTestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Test Page</h1>
      <p>This is a basic test to see if the page loads.</p>

      <div
        style={{
          background: '#f0f0f0',
          padding: '20px',
          margin: '20px 0',
          border: '1px solid #ccc',
        }}
      >
        <h3>Basic HTML Test</h3>
        <p>If you can see this, the page is loading correctly.</p>
        <button onClick={() => alert('JavaScript is working!')}>
          Click to test JavaScript
        </button>
      </div>

      <div
        id="test-container"
        style={{
          height: '200px',
          background: '#ddd',
          padding: '10px',
          margin: '20px 0',
        }}
      >
        <p>This is a test container. Monaco Editor should load below:</p>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          console.log('Simple test page loaded successfully');
          setTimeout(() => {
            const container = document.getElementById('test-container');
            if (container) {
              container.innerHTML += '<p>JavaScript executed after 1 second!</p>';
            }
          }, 1000);
        `,
        }}
      />
    </div>
  );
}
