import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>Ceerion Mail Admin Console</h1>
        <p>Domain: ceerion.com | Host: mail.ceerion.com</p>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </header>
    </div>
  )
}

export default App
