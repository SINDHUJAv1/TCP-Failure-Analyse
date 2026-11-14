
import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import './App.css'

const API = 'https://tcp-failure-analyse-1.onrender.com'

function App() {
  const [ip, setIp] = useState('google.com')
  const [port, setPort] = useState('443')
  const [status, setStatus] = useState('Ready')
  const [logs, setLogs] = useState([])
  const [attempts, setAttempts] = useState(0)
  const [successCount, setSuccessCount] = useState(0)
  const [failureCount, setFailureCount] = useState(0)
  const [connectionHistory, setConnectionHistory] = useState([])
  const [flatAnalysis, setFlatAnalysis] = useState(null)
  const [mongoStatus, setMongoStatus] = useState('Checking')
  const [loading, setLoading] = useState(false)
  const [activePage, setActivePage] = useState('Dashboard')

  const successRate = attempts > 0
    ? ((successCount / attempts) * 100).toFixed(1)
    : '0.0'

  const addLog = (message) => {
    setLogs(old => [
      { message, time: new Date().toLocaleTimeString() },
      ...old
    ])
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API}/api/history`)
      if (!response.ok) throw new Error('History unavailable')

      const data = await response.json()

      setConnectionHistory(data)
      setMongoStatus('Connected')

      // Calculate statistics from saved MongoDB records
      setAttempts(data.length)
      setSuccessCount(data.filter(x => x.status === 'Success').length)
      setFailureCount(data.filter(x => x.status !== 'Success').length)

      if (data.length > 0) {
        setFlatAnalysis(data[0].flatAnalysis || null)
      }
    } catch (error) {
      setMongoStatus('Disconnected')
      console.error(error.message)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const startConnection = async () => {
    if (!ip.trim() || !port) {
      setStatus('Please enter hostname and port')
      return
    }

    const portNumber = Number(port)

    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      setStatus('Invalid Port')
      addLog('Invalid port number entered')
      return
    }

    setLoading(true)
    setStatus('Connecting')
    addLog(`Testing ${ip}:${portNumber}`)

    try {
      const response = await fetch(`${API}/api/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: ip.trim(), port: portNumber })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Connection request failed')
      }

      setStatus(data.status === 'Success' ? 'Established' : 'Failed')
      setFlatAnalysis(data.flatAnalysis || null)

      addLog(`${data.status}: ${data.message || 'TCP test completed'}`)

      await fetchHistory()
    } catch (error) {
      setStatus('Failed')
      addLog(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const disconnect = () => {
    setStatus('Terminated')
    addLog('Connection terminated by user')
  }

  const simulateFailure = () => {
    setStatus('Failed')
    addLog('Simulated failure: Connection timeout')
  }

  const clearLogs = () => {
    setLogs([])
  }

  const generateReport = () => {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('TCP FAILURE ANALYSIS REPORT', 20, 25)

    doc.setFontSize(12)
    doc.text(`Total Attempts: ${attempts}`, 20, 45)
    doc.text(`Successful Connections: ${successCount}`, 20, 60)
    doc.text(`Failed Connections: ${failureCount}`, 20, 75)
    doc.text(`Success Rate: ${successRate}%`, 20, 90)
    doc.text(`Current Status: ${status}`, 20, 105)
    doc.text(`MongoDB: ${mongoStatus}`, 20, 120)

    doc.text('CONNECTION HISTORY', 20, 145)

    let y = 160

    connectionHistory.forEach(item => {
      const lines = doc.splitTextToSize(
        `${item.time} | ${item.host}:${item.port} | ${item.status}`,
        170
      )

      lines.forEach(line => {
        if (y > 280) {
          doc.addPage()
          y = 20
        }
        doc.text(line, 20, y)
        y += 7
      })
    })

    doc.save('TCP_Failure_Report.pdf')
    addLog('PDF report downloaded')
  }

  const scrollTo = (page) => {
    setActivePage(page)
    const element = document.getElementById(
      page === 'Dashboard' ? 'dashboard' :
      page === 'Simulator' ? 'simulator' :
      page === 'History' ? 'history' : 'reports'
    )
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">TCP</div>
          <div>
            <h2>TCP Monitor</h2>
            <span>Connection Analysis</span>
          </div>
        </div>

        <p className="menu-heading">MAIN MENU</p>

        {[
          ['Dashboard', '▦'],
          ['Simulator', '⇄'],
          ['History', '◷'],
          ['Reports', '▤']
        ].map(([name, icon]) => (
          <button
            key={name}
            className={`nav-item ${activePage === name ? 'active' : ''}`}
            onClick={() => scrollTo(name)}
          >
            <span>{icon}</span>{name}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="mongo-side">
            <span className={`dot ${mongoStatus === 'Connected' ? 'green' : 'red'}`} />
            <div>
              <strong>MongoDB</strong>
              <small>{mongoStatus}</small>
            </div>
          </div>
          <p>TCP Failure Analysis v1.0</p>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <h1>TCP Connection Failure Analysis</h1>
            <p>Monitor, test and analyze TCP connections</p>
          </div>
          <div className="online-status">
            <span className="dot green" /> System Online
          </div>
        </header>

        <section className="welcome-row">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Real-time TCP connection monitoring dashboard</p>
          </div>
          <button className="refresh-btn" onClick={fetchHistory}>
            ↻ Refresh Data
          </button>
        </section>

        <section className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">⌁</div>
            <p>Total Attempts</p>
            <h2>{attempts}</h2>
            <small>Recorded connections</small>
          </div>

          <div className="stat-card green-card">
            <div className="stat-icon">✓</div>
            <p>Successful</p>
            <h2>{successCount}</h2>
            <small>Established connections</small>
          </div>

          <div className="stat-card red-card">
            <div className="stat-icon">✕</div>
            <p>Failed</p>
            <h2>{failureCount}</h2>
            <small>Failed connections</small>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon">%</div>
            <p>Success Rate</p>
            <h2>{successRate}%</h2>
            <small>Based on saved history</small>
          </div>
        </section>

        <section className="content-grid" id="simulator">
          <div className="panel simulator-panel">
            <div className="panel-heading">
              <div>
                <h2>Connection Simulator</h2>
                <p>Test a TCP connection using hostname and port</p>
              </div>
              <span className="small-tag">TCP TEST</span>
            </div>

            <label>Hostname / IP Address</label>
            <input
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="Example: google.com"
            />

            <label>Port Number</label>
            <input
              type="number"
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="443"
            />

            <div className="action-buttons">
              <button
                className="primary-btn"
                onClick={startConnection}
                disabled={loading}
              >
                {loading ? 'Testing...' : '▶ Test Connection'}
              </button>
              <button className="secondary-btn" onClick={disconnect}>
                Disconnect
              </button>
            </div>

            <div className="result-box">
              <div>
                <small>CONNECTION RESULT</small>
                <h3 className={status === 'Established' ? 'success-text' : status === 'Failed' ? 'error-text' : ''}>
                  {status}
                </h3>
              </div>
              <span className={`result-indicator ${status === 'Established' ? 'success-bg' : status === 'Failed' ? 'error-bg' : ''}`}>
                {status === 'Established' ? '✓' : status === 'Failed' ? '✕' : '●'}
              </span>
            </div>
          </div>

          <div className="panel dfa-panel">
            <div className="panel-heading">
              <div>
                <h2>FLAT – DFA Analysis</h2>
                <p>Finite automata state transition</p>
              </div>
              <span className="small-tag">FLAT</span>
            </div>

            {flatAnalysis ? (
              <>
                <div className="dfa-flow">
                  {flatAnalysis.transitions.map((state, index) => (
                    <div className="dfa-step" key={`${state}-${index}`}>
                      <div className={`dfa-node ${index === flatAnalysis.transitions.length - 1 ? 'final-node' : ''}`}>
                        {state}
                      </div>
                      {index < flatAnalysis.transitions.length - 1 && (
                        <span className="dfa-arrow">→</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="dfa-details">
                  <p><strong>Initial State:</strong> {flatAnalysis.initialState}</p>
                  <p><strong>Input:</strong> {flatAnalysis.input}</p>
                  <p><strong>Final State:</strong> {flatAnalysis.finalState}</p>
                  <p><strong>Result:</strong> {flatAnalysis.result}</p>
                </div>

                <h3 className="table-title">Transition Table</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Current State</th>
                        <th>Input</th>
                        <th>Next State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatAnalysis.transitionTable?.map((item, index) => (
                        <tr key={index}>
                          <td>{item.currentState}</td>
                          <td>{item.input}</td>
                          <td>{item.nextState}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div>⇄</div>
                <p>Run a TCP test to view DFA state transitions.</p>
              </div>
            )}
          </div>
        </section>

        <section className="panel history-panel" id="history">
          <div className="panel-heading">
            <div>
              <h2>Connection History</h2>
              <p>Previously tested TCP connections saved in MongoDB</p>
            </div>
            <button className="refresh-btn" onClick={fetchHistory}>
              ↻ Refresh
            </button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Hostname / IP</th>
                  <th>Port</th>
                  <th>Status</th>
                  <th>Message</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {connectionHistory.length > 0 ? (
                  connectionHistory.map((item, index) => (
                    <tr key={item._id || index}>
                      <td>{item.host}</td>
                      <td>{item.port}</td>
                      <td>
                        <span className={`status-badge ${item.status === 'Success' ? 'badge-success' : 'badge-failed'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.message || '-'}</td>
                      <td>{item.time || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-table">
                      No connection history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bottom-grid" id="reports">
          <div className="panel logs-panel">
            <div className="panel-heading">
              <div>
                <h2>Activity Logs</h2>
                <p>Recent dashboard activities</p>
              </div>
              <button className="clear-btn" onClick={clearLogs}>Clear</button>
            </div>
            {logs.length > 0 ? logs.slice(0, 6).map((log, index) => (
              <div className="log-row" key={index}>
                <span className="log-dot" />
                <div>
                  <p>{log.message}</p>
                  <small>{log.time}</small>
                </div>
              </div>
            )) : <p className="muted">No recent activities.</p>}
          </div>

          <div className="panel report-panel">
            <div className="report-icon">PDF</div>
            <h2>Generate Report</h2>
            <p>Download a PDF containing connection statistics and history.</p>
            <button className="primary-btn" onClick={generateReport}>
              ↓ Download PDF Report
            </button>
          </div>
        </section>

        <footer className="footer">
          TCP Failure Analysis System · Full Stack Web Development · Computer Networks · FLAT
        </footer>
      </main>
    </div>
  )
}

export default App
