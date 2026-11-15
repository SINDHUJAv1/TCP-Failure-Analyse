
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
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const successRate = attempts > 0
    ? ((successCount / attempts) * 100).toFixed(1)
    : '0.0'

  const addLog = (message) => {
    setLogs(old => [
      { message, time: new Date().toLocaleTimeString() },
      ...old
    ])
  }

  // Fetch latest connection history from MongoDB
  const fetchHistory = async (showFeedback = false) => {
    if (showFeedback) {
      setRefreshing(true)
      setRefreshMessage('')
    }

    try {
      const response = await fetch(`${API}/api/history`)

      if (!response.ok) {
        throw new Error('Unable to fetch latest history')
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('Invalid history response')
      }

      setConnectionHistory(data)
      setMongoStatus('Connected')
      setAttempts(data.length)

      setSuccessCount(
        data.filter(item => item.status === 'Success').length
      )

      setFailureCount(
        data.filter(item => item.status !== 'Success').length
      )

      setFlatAnalysis(
        data.length > 0
          ? data[0].flatAnalysis || null
          : null
      )

      setLastUpdated(new Date())

      if (showFeedback) {
        setRefreshMessage('Data refreshed successfully!')
        addLog('Dashboard data refreshed from MongoDB')
      }
    } catch (error) {
      setMongoStatus('Disconnected')
      console.error(error.message)

      if (showFeedback) {
        setRefreshMessage('Refresh failed. Check backend connection.')
        addLog(`Refresh failed: ${error.message}`)
      }
    } finally {
      if (showFeedback) {
        setRefreshing(false)
      }
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  // TCP connection testing
  const startConnection = async () => {
    if (!ip.trim() || !port) {
      setStatus('Please enter hostname and port')
      return
    }

    const portNumber = Number(port)

    if (
      !Number.isInteger(portNumber) ||
      portNumber < 1 ||
      portNumber > 65535
    ) {
      setStatus('Invalid Port')
      addLog('Invalid port number entered')
      return
    }

    setLoading(true)
    setStatus('Connecting')
    addLog(`Testing ${ip.trim()}:${portNumber}`)

    try {
      const response = await fetch(`${API}/api/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host: ip.trim(),
          port: portNumber
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Connection request failed')
      }

      setStatus(data.status === 'Success' ? 'Established' : 'Failed')
      setFlatAnalysis(data.flatAnalysis || null)

      addLog(
        `${data.status}: ${data.message || 'TCP test completed'}`
      )

      await fetchHistory()
    } catch (error) {
      setStatus('Failed')
      setFlatAnalysis(null)
      addLog(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const disconnect = () => {
    setStatus('Terminated')
    addLog('Connection terminated by user')
  }

  const clearLogs = () => {
    setLogs([])
  }

  // PDF Report
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

  // Navigation
  const scrollTo = (page) => {
    setActivePage(page)

    const element = document.getElementById(
      page === 'Dashboard' ? 'dashboard' :
      page === 'Simulator' ? 'simulator' :
      page === 'History' ? 'history' : 'reports'
    )

    element?.scrollIntoView({ behavior: 'smooth' })
  }

  // Actual state sequence received from backend
  const transitionStates = Array.isArray(flatAnalysis?.transitions)
    ? flatAnalysis.transitions
    : []

  const transitionTable = Array.isArray(flatAnalysis?.transitionTable)
    ? flatAnalysis.transitionTable
    : []

  // Find the input responsible for each transition
  const getTransitionInput = (currentState, nextState) => {
    const transition = transitionTable.find(item =>
      item.currentState === currentState &&
      item.nextState === nextState
    )

    return transition?.input || 'Transition'
  }

  const getStateType = (state) => {
    if (state === flatAnalysis?.initialState) return 'initial'
    if (state === flatAnalysis?.finalState) return 'final'
    return 'intermediate'
  }

  return (
    <div className="app">

      {/* Sidebar */}
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
            <span>{icon}</span>
            {name}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="mongo-side">
            <span
              className={`dot ${
                mongoStatus === 'Connected' ? 'green' : 'red'
              }`}
            />
            <div>
              <strong>MongoDB</strong>
              <small>{mongoStatus}</small>
            </div>
          </div>

          <p>TCP Failure Analysis v1.0</p>
        </div>
      </aside>

      {/* Main Dashboard */}
      <main className="main-content" id="dashboard">

        <header className="topbar">
          <div>
            <h1>TCP Connection Failure Analysis</h1>
            <p>Monitor, test and analyze TCP connections</p>
          </div>

          <div className="online-status">
            <span className="dot green" />
            System Online
          </div>
        </header>

        {/* Dashboard Overview */}
        <section className="welcome-row">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Real-time TCP connection monitoring dashboard</p>
          </div>

          <div>
            <button
              className="refresh-btn"
              onClick={() => fetchHistory(true)}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh Data'}
            </button>

            <small className="refresh-message">{refreshMessage}</small>

            {lastUpdated && (
              <small className="last-updated">
                Last Updated: {lastUpdated.toLocaleTimeString()}
              </small>
            )}
          </div>
        </section>

        {/* Statistics */}
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

        {/* Simulator and FLAT Analysis */}
        <section className="content-grid" id="simulator">

          {/* Connection Simulator */}
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

              <button
                className="secondary-btn"
                onClick={disconnect}
              >
                Disconnect
              </button>
            </div>

            <div className="result-box">
              <div>
                <small>CONNECTION RESULT</small>
                <h3
                  className={
                    status === 'Established'
                      ? 'success-text'
                      : status === 'Failed'
                      ? 'error-text'
                      : ''
                  }
                >
                  {status}
                </h3>
              </div>

              <span
                className={`result-indicator ${
                  status === 'Established'
                    ? 'success-bg'
                    : status === 'Failed'
                    ? 'error-bg'
                    : ''
                }`}
              >
                {status === 'Established'
                  ? '✓'
                  : status === 'Failed'
                  ? '✕'
                  : '●'}
              </span>
            </div>
          </div>

          {/* FLAT DFA State Analysis */}
          <div className="panel dfa-panel">
            <div className="panel-heading">
              <div>
                <h2>FLAT – DFA Analysis</h2>
                <p>TCP finite automata state transition diagram</p>
              </div>
              <span className="small-tag">FLAT</span>
            </div>

            {flatAnalysis ? (
              <>
                <h3 className="table-title">
                  TCP State Transition Diagram
                </h3>

                {transitionStates.length > 0 ? (
                  <div className="transition-diagram-wrapper">

                    <div className="diagram-result-heading">
                      <span className={
                        flatAnalysis.result === 'Success'
                          ? 'diagram-success'
                          : 'diagram-failure'
                      }>
                        {flatAnalysis.result === 'Success'
                          ? '✓ Connection Successful'
                          : '✕ Connection Failed'}
                      </span>
                    </div>

                    <div className="transition-diagram">
                      {transitionStates.map((state, index) => {
                        const stateType = getStateType(state)
                        const nextState = transitionStates[index + 1]
                        const transitionInput = nextState
                          ? getTransitionInput(state, nextState)
                          : ''

                        return (
                          <div
                            className="transition-step"
                            key={`${state}-${index}`}
                          >
                            <div className="state-card">
                              <span className={`state-label ${stateType}-label`}>
                                {stateType === 'initial'
                                  ? 'START'
                                  : stateType === 'final'
                                  ? 'FINAL STATE'
                                  : `STATE ${index + 1}`}
                              </span>

                              <div className={`state-node ${stateType}-node`}>
                                <span className="state-number">
                                  {index + 1}
                                </span>
                                <strong>{state}</strong>
                                {stateType === 'final' && (
                                  <span className="state-check">
                                    {state === 'ESTABLISHED' ? '✓' : '✕'}
                                  </span>
                                )}
                              </div>

                              <span className="state-description">
                                {stateType === 'initial'
                                  ? 'Initial State'
                                  : stateType === 'final'
                                  ? 'Final State'
                                  : 'Intermediate State'}
                              </span>
                            </div>

                            {nextState && (
                              <div className="transition-connector">
                                <span className="transition-input">
                                  {transitionInput}
                                </span>
                                <span className="connector-line" />
                                <span className="connector-arrow">➜</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="diagram-legend">
                      <span>
                        <i className="legend-dot initial-legend" />
                        Initial State
                      </span>
                      <span>
                        <i className="legend-dot intermediate-legend" />
                        Intermediate State
                      </span>
                      <span>
                        <i className="legend-dot final-legend" />
                        Final State
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state diagram-empty">
                    <div>⇄</div>
                    <p>No transition states available for this test.</p>
                  </div>
                )}

                <div className="dfa-details">
                  <p>
                    <strong>Initial State:</strong>{' '}
                    {flatAnalysis.initialState || '-'}
                  </p>
                  <p>
                    <strong>Input:</strong>{' '}
                    {flatAnalysis.input || '-'}
                  </p>
                  <p>
                    <strong>Final State:</strong>{' '}
                    {flatAnalysis.finalState || '-'}
                  </p>
                  <p>
                    <strong>Result:</strong>{' '}
                    {flatAnalysis.result || '-'}
                  </p>
                </div>

                <h3 className="table-title">
                  State Transition Table
                </h3>

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
                      {transitionTable.length > 0 ? (
                        transitionTable.map((item, index) => (
                          <tr key={index}>
                            <td>{item.currentState}</td>
                            <td>{item.input}</td>
                            <td>{item.nextState}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="empty-table">
                            No transition table data available.
                          </td>
                        </tr>
                      )}
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

        {/* Connection History */}
        <section className="panel history-panel" id="history">
          <div className="panel-heading">
            <div>
              <h2>Connection History</h2>
              <p>Previously tested TCP connections saved in MongoDB</p>
            </div>

            <button
              className="refresh-btn"
              onClick={() => fetchHistory(true)}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
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
                        <span
                          className={`status-badge ${
                            item.status === 'Success'
                              ? 'badge-success'
                              : 'badge-failed'
                          }`}
                        >
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

        {/* Logs and Reports */}
        <section className="bottom-grid" id="reports">
          <div className="panel logs-panel">
            <div className="panel-heading">
              <div>
                <h2>Activity Logs</h2>
                <p>Recent dashboard activities</p>
              </div>

              <button className="clear-btn" onClick={clearLogs}>
                Clear
              </button>
            </div>

            {logs.length > 0 ? (
              logs.slice(0, 6).map((log, index) => (
                <div className="log-row" key={index}>
                  <span className="log-dot" />
                  <div>
                    <p>{log.message}</p>
                    <small>{log.time}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No recent activities.</p>
            )}
          </div>

          <div className="panel report-panel">
            <div className="report-icon">PDF</div>
            <h2>Generate Report</h2>
            <p>
              Download a PDF containing connection statistics and history.
            </p>

            <button className="primary-btn" onClick={generateReport}>
              ↓ Download PDF Report
            </button>
          </div>
        </section>

        <footer className="footer">
          TCP Failure Analysis System · Full Stack Web Development ·
          Computer Networks · FLAT
        </footer>
      </main>
    </div>
  )
}

export default App
