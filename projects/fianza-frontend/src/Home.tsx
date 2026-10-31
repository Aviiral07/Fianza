import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import AuthGate from './components/AuthGate'
import type { AuthForm } from './components/AuthGate'
import { FianzaEscrowClient } from './contracts/FianzaEscrow'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'

const APP_ID = BigInt(766160152)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

type AuthUser = {
  id: string
  name: string
  email: string
}

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'error'

const Home: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [escrowStatus, setEscrowStatus] = useState<'UNFUNDED' | 'FUNDED' | 'DISPUTED'>('UNFUNDED')
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant')
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [authError, setAuthError] = useState('')
  const [authForm, setAuthForm] = useState<AuthForm>({ name: '', email: '', password: '' })
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [depositAmount, setDepositAmount] = useState('1')

  const { activeAddress, transactionSigner } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()

  const loadCurrentUser = async () => {
    setAuthStatus('checking')
    setAuthError('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
      })

      if (response.status === 401) {
        setAuthUser(null)
        setAuthStatus('unauthenticated')
        return
      }

      if (!response.ok) {
        throw new Error('The sign-in service could not verify your session.')
      }

      const data = await response.json()
      setAuthUser(data.user)
      setAuthStatus('authenticated')
    } catch {
      setAuthUser(null)
      setAuthStatus('error')
      setAuthError('Could not connect to the authentication service. Check that the backend is running.')
    }
  }

  useEffect(() => {
    void loadCurrentUser()
  }, [])

  const handleAuthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setAuthForm((prev) => ({ ...prev, [name]: value }))
    setAuthError('')
  }

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : { name: authForm.name, email: authForm.email, password: authForm.password }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed')
      }

      setAuthUser(data.user)
      setAuthStatus('authenticated')
      setAuthForm({ name: '', email: '', password: '' })
      showToast(authMode === 'login' ? 'Signed in successfully' : 'Account created successfully', 'success')
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('The server could not end your session. Please try again.')
      }

      setAuthUser(null)
      setAuthStatus('unauthenticated')
      setAuthError('')
      setAuthForm({ name: '', email: '', password: '' })
      showToast('Signed out successfully', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Sign out failed. Please try again.', 'error')
    }
  }

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  // Distinguishes a genuine bug/network failure from the smart contract correctly
  // rejecting an invalid action (e.g. trying to fund an already-funded escrow).
  // Both surface as thrown errors, but only the former is actually a "problem".
  const isContractRejection = (msg: string) => /logic eval error|TransactionPool\.Remember|assert failed/i.test(msg)

  const reportError = (e: any) => {
    console.error(e)
    const msg = e?.message || String(e)
    if (isContractRejection(msg)) {
      showToast('The smart contract rejected this action — a rule was violated (e.g. escrow already funded). This is expected behavior, not a bug.', 'info')
    } else {
      showToast(`Error: ${msg}`, 'error')
    }
  }

  const getAppClient = () => {
    if (!activeAddress) throw new Error('Wallet not connected')
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    algorand.setSigner(activeAddress, transactionSigner)
    return new FianzaEscrowClient({
      algorand,
      appId: APP_ID,
      defaultSender: activeAddress,
      defaultSigner: transactionSigner,
    })
  }

  const handleGetStatus = async () => {
    if (!activeAddress) return showToast('Connect your wallet first!', 'error')
    setLoading(true)
    try {
      const appClient = getAppClient()
      const res = await appClient.send.getStatus({ args: {} })
      const s = res.return as string
      if (s === 'FUNDED') setEscrowStatus('FUNDED')
      else if (s === 'DISPUTED') setEscrowStatus('DISPUTED')
      else setEscrowStatus('UNFUNDED')
      showToast(`On-chain status: ${s}`, 'success')
    } catch (e: any) {
      reportError(e)
    }
    setLoading(false)
  }

  const handleFundDeposit = async () => {
    if (!activeAddress) return showToast('Connect your wallet first!', 'error')
    const amount = Number(depositAmount)
    if (!amount || amount <= 0) return showToast('Enter a valid deposit amount', 'error')
    setLoading(true)
    try {
      const appClient = getAppClient()
      const algodClient = appClient.algorand.client.algod
      const suggestedParams = await algodClient.getTransactionParams().do()
      const appAddress = appClient.appAddress.toString()

      // fund_deposit() on-chain expects a linked Payment transaction (group index 0)
      // carrying the ALGO being locked into escrow, followed by the app call (index 1).
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: appAddress,
        amount: Math.round(amount * 1_000_000),
        suggestedParams,
      })

      const method = algosdk.ABIMethod.fromSignature('fund_deposit()string')
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAddress,
        appIndex: Number(APP_ID),
        appArgs: [method.getSelector()],
        suggestedParams,
      })

      algosdk.assignGroupID([paymentTxn, appCallTxn])

      const signedTxns = await transactionSigner([paymentTxn, appCallTxn], [0, 1])

      const { txid } = await algodClient.sendRawTransaction(signedTxns).do()
      await algosdk.waitForConfirmation(algodClient, txid, 4)

      setEscrowStatus('FUNDED')
      showToast('Deposit funded on-chain!', 'success')
    } catch (e: any) {
      reportError(e)
    }
    setLoading(false)
  }

  const statusConfig = {
    UNFUNDED: { color: '#854F0B', bg: '#FAEEDA', label: 'Awaiting Deposit' },
    FUNDED:   { color: '#3B6D11', bg: '#EAF3DE', label: 'Deposit Secured' },
    DISPUTED: { color: '#A32D2D', bg: '#FCEBEB', label: 'Under Dispute' },
  }
  const status = statusConfig[escrowStatus]

  if (authStatus === 'checking') {
    return (
      <main className="rentchain-session-loading" role="status" aria-live="polite">
        <div>
          <div className="rentchain-brand">
            <span className="rentchain-brand-mark" aria-hidden="true">R+</span>
            <span>RentChain<span className="rentchain-brand-plus">+</span></span>
            <span className="rentchain-brand-by">by Fianza</span>
          </div>
          <p>Checking your secure session…</p>
        </div>
      </main>
    )
  }

  if (authStatus === 'error' || authStatus === 'unauthenticated' || !authUser) {
    return (
      <AuthGate
        mode={authMode}
        setMode={(mode) => {
          setAuthMode(mode)
          setAuthError('')
        }}
        form={authForm}
        onChange={handleAuthChange}
        onSubmit={handleAuthSubmit}
        loading={authLoading}
        error={authError}
        sessionError={authStatus === 'error'}
        onRetry={() => void loadCurrentUser()}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EE', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        @media (max-width: 720px) {
          .fianza-nav { padding: 0 16px !important; flex-wrap: wrap; height: auto !important; padding-top: 12px !important; padding-bottom: 12px !important; }
          .fianza-hero { padding: 40px 20px 56px !important; }
          .fianza-hero-title { font-size: 32px !important; }
          .fianza-stats-bar { padding: 16px 20px !important; gap: 28px !important; }
          .fianza-actions-grid { grid-template-columns: 1fr !important; }
          .fianza-info-grid { grid-template-columns: 1fr 1fr !important; }
          .fianza-steps-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 420px) {
          .fianza-hero-title { font-size: 26px !important; }
          .fianza-info-grid { grid-template-columns: 1fr !important; }
          .fianza-steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: toast.type === 'success' ? '#2d5a27' : toast.type === 'info' ? '#B98900' : '#A32D2D',
          color: 'white', padding: '14px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', maxWidth: '360px',
        }}>
          {toast.msg}
        </div>
      )}

      <nav className="fianza-nav" style={{ background: '#1C3A18', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#5DCAA5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#1C3A18" strokeWidth="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="#1C3A18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ color: '#F7F4EE', fontSize: '20px', fontWeight: '700' }}>Fianza</span>
          <span style={{ color: '#5DCAA5', fontSize: '11px', background: 'rgba(93,202,165,0.15)', padding: '2px 8px', borderRadius: '20px', marginLeft: '4px' }}>on Algorand</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#9FE1CB', fontSize: '13px' }}>🟢 TestNet</span>
          <span style={{ color: '#5DCAA5', fontSize: '11px', background: 'rgba(93,202,165,0.1)', padding: '2px 8px', borderRadius: '20px' }}>App #{APP_ID.toString()}</span>
          <button onClick={() => setOpenWalletModal(true)} style={{ background: activeAddress ? 'rgba(93,202,165,0.2)' : '#5DCAA5', color: activeAddress ? '#9FE1CB' : '#1C3A18', border: activeAddress ? '1px solid rgba(93,202,165,0.3)' : 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            {activeAddress ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}` : 'Connect Wallet'}
          </button>
          <span style={{ color: '#F7F4EE', fontSize: '12px' }}>{authUser.name}</span>
          <button onClick={handleLogout} style={{ background: 'transparent', color: '#9FE1CB', border: '1px solid rgba(93,202,165,0.4)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}>
            Sign out
          </button>
        </div>
      </nav>

      <div className="fianza-hero" style={{ background: 'linear-gradient(180deg, #1C3A18 0%, #2d5a27 100%)', padding: '64px 40px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(93,202,165,0.15)', border: '1px solid rgba(93,202,165,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '20px' }}>
          <span style={{ color: '#5DCAA5', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Evidence-driven rental settlement</span>
        </div>
        <h1 className="fianza-hero-title" style={{ color: '#F7F4EE', fontSize: '48px', fontWeight: '800', margin: '0 0 16px', lineHeight: '1.1', letterSpacing: '-1px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
          A clearer record for<br /><span style={{ color: '#5DCAA5' }}>every deposit.</span>
        </h1>
        <p style={{ color: '#9FE1CB', fontSize: '18px', margin: '0 auto 32px', maxWidth: '520px', lineHeight: '1.6' }}>
          Compare inspection evidence, review settlement proposals, and use Algorand escrow for transparent on-chain actions.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleFundDeposit} disabled={loading} style={{ background: '#5DCAA5', color: '#1C3A18', border: 'none', borderRadius: '10px', padding: '14px 28px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
            {loading ? 'Processing...' : 'Create Escrow'}
          </button>
          <button onClick={handleGetStatus} disabled={loading} style={{ background: 'transparent', color: '#9FE1CB', border: '1px solid rgba(93,202,165,0.4)', borderRadius: '10px', padding: '14px 28px', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}>
            {loading ? 'Checking...' : 'Check On-Chain Status'}
          </button>
        </div>
      </div>

      <div className="fianza-stats-bar" style={{ background: '#F0EBE1', borderBottom: '1px solid #E0D9CE', padding: '20px 40px', display: 'flex', justifyContent: 'center', gap: '60px', flexWrap: 'wrap' }}>
        {[
          { value: `#${APP_ID.toString()}`, label: 'App ID on TestNet' },
          { value: escrowStatus, label: 'Escrow Status' },
          { value: activeAddress ? `${activeAddress.slice(0,6)}...` : '—', label: 'Connected Wallet' },
          { value: 'On-chain', label: 'Settlement record' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ color: '#2d5a27', fontSize: '18px', fontWeight: '800' }}>{stat.value}</div>
            <div style={{ color: '#888780', fontSize: '12px', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <section className="rentchain-workflow" aria-labelledby="rentchain-workflow-title">
        <div className="rentchain-workflow-heading">
          <p>THE RENTCHAIN+ APPROACH</p>
          <h2 id="rentchain-workflow-title">Evidence first. Settlement second.</h2>
          <span>
            A proposed deduction is a reviewable recommendation, never an unquestioned AI decision.
          </span>
        </div>
        <div className="rentchain-workflow-grid">
          {[
            { number: '01', title: 'Agree', text: 'Record the rental terms, deposit amount, parties, and inspection expectations.' },
            { number: '02', title: 'Document', text: 'Capture comparable move-in and move-out evidence and preserve its provenance.' },
            { number: '03', title: 'Assess & explain', text: 'Compare evidence, identify candidate damage, and explain any proposed cost.' },
            { number: '04', title: 'Route by confidence', text: 'Request more evidence or human review when a case is uncertain or contested.' },
            { number: '05', title: 'Settle & audit', text: 'Execute only an approved outcome and retain a verifiable settlement record.' },
          ].map((step) => (
            <article key={step.number} className="rentchain-workflow-step">
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
        <p className="rentchain-prototype-note">
          Prototype status: Algorand wallet connection and escrow status/funding are available. Paired-photo
          damage detection, explainable AI, evidence upload, and confidence-based approval are research modules
          and are not yet active in this prototype.
        </p>
      </section>

      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['tenant', 'landlord'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: activeTab === tab ? '#2d5a27' : '#E8E2D9', color: activeTab === tab ? '#F7F4EE' : '#888780', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                {tab === 'tenant' ? 'Tenant View' : 'Landlord View'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: status.bg, border: `1px solid ${status.color}30`, borderRadius: '10px', padding: '10px 18px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.color }} />
            <span style={{ color: status.color, fontWeight: '700', fontSize: '13px' }}>{status.label}</span>
          </div>
        </div>

        {!activeAddress && (
          <div style={{ background: '#FAEEDA', border: '1px solid #F0C070', borderRadius: '12px', padding: '14px 20px', marginBottom: '16px', color: '#854F0B', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
            ⚠️ Connect your wallet to interact with the smart contract
          </div>
        )}

        <div className="fianza-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E2D9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', background: '#EAF3DE', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" /><polyline points="22 4 12 14.01 9 11.01" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#1C1C1A', fontSize: '15px', fontWeight: '700' }}>Lock Deposit</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Mark escrow as funded on-chain</p>
              </div>
            </div>
            <p style={{ color: '#5F5E5A', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', marginTop: 0 }}>
              Sends an ALGO payment together with <code style={{ background: '#F0EBE1', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>fund_deposit</code> on the smart contract — locks the deposit into escrow on Algorand TestNet.
            </p>
            <input
              type="number"
              min="0"
              step="0.1"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount in ALGO"
              style={{ width: '100%', padding: '10px 12px', marginBottom: '12px', border: '1px solid #E0D9CE', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <button onClick={handleFundDeposit} disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#9EC898' : '#2d5a27', color: 'white', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px' }}>
              {loading ? 'Processing...' : 'Lock Deposit On-Chain'}
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E2D9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', background: '#E6F1FB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="#185FA5" strokeWidth="2" /><path d="M21 21l-4.35-4.35" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#1C1C1A', fontSize: '15px', fontWeight: '700' }}>Check Status</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Read live state from blockchain</p>
              </div>
            </div>
            <p style={{ color: '#5F5E5A', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', marginTop: 0 }}>
              Calls <code style={{ background: '#F0EBE1', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>get_status</code> on-chain and returns <strong>UNFUNDED</strong>, <strong>FUNDED</strong>, or <strong>DISPUTED</strong>.
            </p>
            <button onClick={handleGetStatus} disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#90B8D8' : '#185FA5', color: 'white', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px' }}>
              {loading ? 'Checking...' : 'Check On-Chain Status'}
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #F7C1C1', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ width: '40px', height: '40px', background: '#FCEBEB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#A32D2D" strokeWidth="2" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="17" x2="12.01" y2="17" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#A32D2D', fontSize: '15px', fontWeight: '700' }}>Live Contract Info</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Deployed on Algorand TestNet</p>
              </div>
              <a href={`https://lora.algokit.io/testnet/application/${APP_ID.toString()}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', background: '#1C3A18', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                View on Lora Explorer →
              </a>
            </div>
            <div className="fianza-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Network', value: 'Algorand TestNet' },
                { label: 'App ID', value: APP_ID.toString() },
                { label: 'Language', value: 'Python (Puya)' },
                { label: 'Methods', value: 'get_status, fund_deposit' },
                { label: 'Storage', value: 'Global State' },
                { label: 'Status', value: escrowStatus },
              ].map((item, i) => (
                <div key={i} style={{ background: '#F7F4EE', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ color: '#888780', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ color: '#1C1C1A', fontSize: '13px', fontWeight: '700' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #E8E2D9', marginBottom: '40px' }}>
          <h3 style={{ margin: '0 0 24px', color: '#1C1C1A', fontSize: '16px', fontWeight: '700', textAlign: 'center' }}>Prototype and Research Roadmap</h3>
          <div className="fianza-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { icon: '🔒', step: 'LIVE', title: 'Fund escrow', desc: 'Connect an Algorand wallet and lock a deposit on TestNet.', color: '#EAF3DE' },
              { icon: '🔎', step: 'LIVE', title: 'Check status', desc: 'Read the escrow status from the deployed smart contract.', color: '#E6F1FB' },
              { icon: '📸', step: 'RESEARCH', title: 'Evidence + AI review', desc: 'Paired inspection photos, explainable damage proposals, and evidence integrity.', color: '#EEEDFE' },
              { icon: '⚖️', step: 'RESEARCH', title: 'Confidence-based review', desc: 'Route uncertain or contested deductions to people before settlement.', color: '#FAEEDA' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '20px 12px' }}>
                <div style={{ width: '48px', height: '48px', background: item.color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '22px' }}>{item.icon}</div>
                <div style={{ color: item.step === 'LIVE' ? '#3B6D11' : '#854F0B', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', marginBottom: '6px' }}>{item.step}</div>
                <div style={{ color: '#1C1C1A', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>{item.title}</div>
                <div style={{ color: '#888780', fontSize: '12px', lineHeight: '1.5' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
    </div>
  )
}

export default Home
