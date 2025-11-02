import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>DoMoreCo AI Workspace</h1>
      <p>Welcome to your AI development workspace.</p>

      <div style={{ marginTop: '20px' }}>
        <h2>Available Workspaces:</h2>
        <ul>
          <li>
            <Link
              href="/workspace-enhanced"
              style={{ color: '#007acc', textDecoration: 'none' }}
            >
              🚀 <strong>Enhanced Monaco Workspace</strong> - Full AI
              development environment with role management
            </Link>
          </li>
          <li>
            <Link
              href="/monaco-test"
              style={{ color: '#007acc', textDecoration: 'none' }}
            >
              🧪 <strong>Monaco Test</strong> - Simple Monaco Editor test page
            </Link>
          </li>
          <li>
            <Link
              href="/workspace"
              style={{ color: '#007acc', textDecoration: 'none' }}
            >
              📝 <strong>Basic Workspace</strong> - Simple Monaco workspace
            </Link>
          </li>
          <li>
            <Link
              href="/orchestration-ui"
              style={{ color: '#007acc', textDecoration: 'none' }}
            >
              orchestrations
            </Link>
          </li>
        </ul>
      </div>

      <div
        style={{
          marginTop: '30px',
          padding: '15px',
          background: '#f0f8ff',
          border: '1px solid #007acc',
          borderRadius: '5px',
        }}
      >
        <h3>🎯 Recommended: Enhanced Workspace</h3>
        <p>The Enhanced Monaco Workspace includes:</p>
        <ul>
          <li>✅ 4-column, 2-row layout</li>
          <li>✅ Role management with backend integration</li>
          <li>✅ LLM generation with ModelSelector</li>
          <li>✅ Parameter-based model selection</li>
          <li>✅ Real-time code editing</li>
        </ul>
      </div>
    </div>
  );
}
