import { useRef, useState } from 'react'
import Brief from './Brief.jsx'
import { ApiError, fetchBrief } from './api.js'

// The chains the API can resolve. Only ethereum has been exercised against
// live provider data in this build, which the option text says rather than
// leaving the reader to find out from an error.
const CHAINS = [
  'ethereum',
  'polygon',
  'bsc',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
]

export default function App() {
  const [wallet, setWallet] = useState('')
  const [chain, setChain] = useState('ethereum')
  const [preferCached, setPreferCached] = useState(true)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [brief, setBrief] = useState(null)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  async function submit(event) {
    event.preventDefault()
    if (!wallet.trim() || status === 'loading') return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('loading')
    setError(null)
    // The previous result is cleared before the new one is requested. Leaving
    // it on screen under a spinner invites reading a stale verdict as the
    // answer to the address just typed.
    setBrief(null)

    try {
      const result = await fetchBrief({ wallet, chain, preferCached }, controller.signal)
      setBrief(result)
      setStatus('done')
    } catch (cause) {
      if (cause?.name === 'AbortError') return
      setError(
        cause instanceof ApiError
          ? cause
          : new ApiError('UNEXPECTED', cause?.message || 'Something went wrong.', 0),
      )
      setStatus('error')
    }
  }

  function cancel() {
    abortRef.current?.abort()
    setStatus('idle')
  }

  return (
    <div className="page">
      <header className="masthead">
        <h1>Wallet investigation</h1>
        <p>
          Real blockchain data, bidirectional VASP attribution, and an advisory ML signal.
          Investigative indicators only &mdash; nothing here is a finding of wrongdoing.
        </p>
      </header>

      <form className="card query" onSubmit={submit}>
        <div className="row">
          <label className="grow">
            <span className="label">Wallet address</span>
            <input
              className="mono"
              type="text"
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              placeholder="0x followed by 40 hexadecimal characters"
              spellCheck="false"
              autoComplete="off"
              autoCapitalize="off"
              aria-label="Wallet address"
            />
          </label>
          <label>
            <span className="label">Chain</span>
            <select value={chain} onChange={(event) => setChain(event.target.value)}>
              {CHAINS.map((name) => (
                <option key={name} value={name}>
                  {name}
                  {name === 'ethereum' ? '' : ' (not live-validated)'}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row bottom">
          <label className="check">
            <input
              type="checkbox"
              checked={preferCached}
              onChange={(event) => setPreferCached(event.target.checked)}
            />
            <span>
              Reuse real data already cached for this wallet
              <em>
                {' '}
                &mdash; uncheck to fetch live, which expands hop by hop and can take several
                minutes
              </em>
            </span>
          </label>
          <div className="actions">
            {status === 'loading' && (
              <button type="button" className="ghost" onClick={cancel}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={!wallet.trim() || status === 'loading'}>
              {status === 'loading' ? 'Investigating' : 'Investigate'}
            </button>
          </div>
        </div>
      </form>

      {status === 'loading' && (
        <div className="card state">
          <div className="pulse" aria-hidden="true" />
          <div>
            <strong>Running the investigation.</strong>
            <p>
              {preferCached
                ? 'Loading the cached real graph and running every analysis stage.'
                : 'Fetching live blockchain data hop by hop. This can take several minutes; no demo or synthetic data is substituted if it fails.'}
            </p>
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="card state error">
          <div>
            <strong>
              {error.code === 'INVESTIGATION_STOPPED'
                ? 'The investigation stopped'
                : 'That request could not be answered'}
            </strong>
            <p>{error.detail}</p>
            <p className="mono muted">
              {error.code}
              {error.status ? ` · HTTP ${error.status}` : ''}
            </p>
          </div>
        </div>
      )}

      {status === 'done' && brief && <Brief brief={brief} />}

      {status === 'idle' && (
        <div className="card state hint">
          <div>
            <strong>Enter a wallet address to begin.</strong>
            <p>
              A result is labelled with the data it came from: <span className="mono">REAL</span>{' '}
              for a live fetch, <span className="mono">CACHED REAL DATA</span> for real records
              already on disk. Nothing is ever substituted for missing data &mdash; a run that
              cannot get real data fails instead.
            </p>
          </div>
        </div>
      )}

      <footer className="page-foot">
        Absent values read <span className="mono">N/A</span>. An inconclusive search stays
        inconclusive: a bounded search that found no route is not the same as a wallet with no
        route.
      </footer>
    </div>
  )
}
