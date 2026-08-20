import { useEffect, useState } from 'react'
import './App.css'

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
      setResult(null)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/analyse',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()

      setResult(data)

      await loadHistory()
    } catch (error) {
      console.error(error)
      setError('Unable to analyse the message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <h1>Triage Desk</h1>
        <p>Customer support triage system</p>
      </header>


      {/* INPUT SECTION */}
      <section className="input-section">

        <label htmlFor="message">
          Customer message
        </label>

        <textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Enter the customer's complaint..."
          rows={6}
        />

        <button
          type="button"
          className="analyse-button"
          onClick={handleAnalyse}
          disabled={loading}
        >
          {loading ? 'Analysing...' : 'Analyse'}
        </button>

      </section>


      {/* ERROR */}
      {error && (
        <section className="error">
          <h2>Error</h2>
          <p>{error}</p>
        </section>
      )}


      {/* CURRENT RESULT */}
      {result && (
        <section className="result-card">

          <h2>Analysis Result</h2>

          <div className="result-row">
            <strong>Category:</strong>
            <span>{result.category}</span>
          </div>

          <div className="result-row">
            <strong>Urgency:</strong>
            <span>{result.urgency}</span>
          </div>

          <div className="reply-section">
            <strong>Suggested Reply:</strong>
            <p>{result.suggested_reply}</p>
          </div>

        </section>
      )}


      {/* HISTORY */}
      <section className="history">

        <h2>History</h2>

        {historyLoading ? (
          <p className="loading">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="empty-history">
            No previous analyses.
          </p>
        ) : (
          <div className="history-list">

            {history.map((item) => (
              <div
                className="history-item"
                key={item.id}
              >

                <div className="history-message">
                  <strong>Customer message:</strong>
                  <p>{item.message}</p>
                </div>

                <div className="history-details">

                  <p>
                    <strong>Category:</strong>{' '}
                    {item.category}
                  </p>

                  <p>
                    <strong>Urgency:</strong>{' '}
                    {item.urgency}
                  </p>

                </div>

                <div className="history-reply">
                  <strong>Suggested Reply:</strong>
                  <p>{item.suggested_reply}</p>
                </div>

              </div>
            ))}

          </div>
        )}

      </section>

    </div>
  )
}

export default App