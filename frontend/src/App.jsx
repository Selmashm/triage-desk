import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadHistory() {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/history')

      if (!response.ok) {
        throw new Error('Failed to load history')
      }

      const data = await response.json()
      setHistory(data.history)
    } catch (error) {
      console.error(error)
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleAnalyse() {
    if (!message.trim()) {
      setError('Please enter a customer message.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
        }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()
      setResult(data)

      await loadHistory()
    } catch (error) {
      setError('Unable to analyse the message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  return (
    <div>
      <h1>Triage Desk</h1>
      <p>Customer support triage system</p>

      <label htmlFor="message">Customer message</label>

      <br />

      <textarea
        id="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Enter the customer's complaint..."
        rows="6"
      />

      <br />
      <br />

      <button type="button" onClick={handleAnalyse} disabled={loading}>
        {loading ? 'Analysing...' : 'Analyse'}
      </button>

      {error && (
        <div>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div>
          <h2>Analysis Result</h2>

          <p>
            <strong>Category:</strong> {result.category}
          </p>

          <p>
            <strong>Urgency:</strong> {result.urgency}
          </p>

          <p>
            <strong>Suggested Reply:</strong>
          </p>

          <p>{result.suggested_reply}</p>
        </div>
      )}

      <hr />

      <h2>History</h2>

      {historyLoading ? (
        <p>Loading history...</p>
      ) : history.length === 0 ? (
        <p>No previous analyses.</p>
      ) : (
        history.map((item) => (
          <div key={item.id}>
            <p>
              <strong>Message:</strong> {item.message}
            </p>

            <p>
              <strong>Category:</strong> {item.category}
            </p>

            <p>
              <strong>Urgency:</strong> {item.urgency}
            </p>

            <p>
              <strong>Suggested Reply:</strong> {item.suggested_reply}
            </p>

            <hr />
          </div>
        ))
      )}
    </div>
  )
}

export default App