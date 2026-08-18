import { useState } from 'react'

function App() {
  const [message, setMessage] = useState('')

  return (
    <div>
      <h1>Triage Desk</h1>
      <p>Customer support triage system</p>

      <label htmlFor="message">Customer message</label>

      <textarea
        id="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Enter the customer's complaint..."
        rows="6"
      />

      <button type="button">Analyse</button>
    </div>
  )
}

export default App