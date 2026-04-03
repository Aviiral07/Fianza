import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'

const Home: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [escrowStatus, setEscrowStatus] = useState<'UNFUNDED' | 'FUNDED' | 'DISPUTED'>('UNFUNDED')
  const [depositAmount, setDepositAmount] = useState('')
  const [moveInCID, setMoveInCID] = useState('')
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant')
  const { activeAddress } = useWallet()

  const statusConfig = {
    UNFUNDED: { color: '#854F0B', bg: '#FAEEDA', label: 'Awaiting Deposit' },
    FUNDED: { color: '#3B6D11', bg: '#EAF3DE', label: 'Deposit Secured' },
    DISPUTED: { color: '#A32D2D', bg: '#FCEBEB', label: 'Under Dispute' },
  }

  const status = statusConfig[escrowStatus]

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EE', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Navbar */}
      <nav style={{ background: '#1C3A18', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#5DCAA5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#1C3A18" strokeWidth="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="#1C3A18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ color: '#F7F4EE', fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px' }}>Fianza</span>
          <span style={{ color: '#5DCAA5', fontSize: '11px', background: 'rgba(93,202,165,0.15)', padding: '2px 8px', borderRadius: '20px', marginLeft: '4px' }}>on Algorand</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#9FE1CB', fontSize: '13px' }}>LocalNet</span>
          <button
            onClick={() => setOpenWalletModal(true)}
            style={{
              background: activeAddress ? 'rgba(93,202,165,0.2)' : '#5DCAA5',
              color: activeAddress ? '#9FE1CB' : '#1C3A18',
              border: activeAddress ? '1px solid rgba(93,202,165,0.3)' : 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              letterSpacing: '0.1px'
            }}
          >
            {activeAddress ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(180deg, #1C3A18 0%, #2d5a27 100%)', padding: '64px 40px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(93,202,165,0.15)', border: '1px solid rgba(93,202,165,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '20px' }}>
          <span style={{ color: '#5DCAA5', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Blockchain-Powered Escrow</span>
        </div>
        <h1 style={{ color: '#F7F4EE', fontSize: '48px', fontWeight: '800', margin: '0 0 16px', lineHeight: '1.1', letterSpacing: '-1px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
          Your Landlord Can Never<br />
          <span style={{ color: '#5DCAA5' }}>Steal Your Deposit</span> Again
        </h1>
        <p style={{ color: '#9FE1CB', fontSize: '18px', margin: '0 auto 32px', maxWidth: '520px', lineHeight: '1.6' }}>
          Transparent, fair, tamper-proof deposits secured by Algorand smart contracts.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button style={{ background: '#5DCAA5', color: '#1C3A18', border: 'none', borderRadius: '10px', padding: '14px 28px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
            Create Escrow
          </button>
          <button style={{ background: 'transparent', color: '#9FE1CB', border: '1px solid rgba(93,202,165,0.4)', borderRadius: '10px', padding: '14px 28px', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}>
            How it Works
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ background: '#F0EBE1', borderBottom: '1px solid #E0D9CE', padding: '20px 40px', display: 'flex', justifyContent: 'center', gap: '60px' }}>
        {[
          { value: '$2.4M', label: 'Deposits Protected' },
          { value: '1,240', label: 'Active Escrows' },
          { value: '0', label: 'Disputes Unresolved' },
          { value: '100%', label: 'Tamper-Proof' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ color: '#2d5a27', fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>{stat.value}</div>
            <div style={{ color: '#888780', fontSize: '12px', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Dashboard */}
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>

        {/* Status + Tab Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['tenant', 'landlord'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === tab ? '#2d5a27' : '#E8E2D9',
                  color: activeTab === tab ? '#F7F4EE' : '#888780',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'tenant' ? 'Tenant View' : 'Landlord View'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: status.bg, border: `1px solid ${status.color}30`, borderRadius: '10px', padding: '10px 18px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.color }} />
            <span style={{ color: status.color, fontWeight: '700', fontSize: '13px' }}>{status.label}</span>
          </div>
        </div>

        {/* Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          {/* Fund Deposit */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E2D9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', background: '#EAF3DE', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#1C1C1A', fontSize: '15px', fontWeight: '700' }}>Fund Deposit</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Lock funds on-chain</p>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#5F5E5A', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount (ALGO)</label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E8E2D9', fontSize: '15px', outline: 'none', boxSizing: 'border-box', color: '#1C1C1A', background: '#FAFAF8' }}
              />
            </div>
            <button
              onClick={() => setEscrowStatus('FUNDED')}
              style={{ width: '100%', padding: '13px', background: '#2d5a27', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', letterSpacing: '0.1px' }}
            >
              Lock Deposit On-Chain
            </button>
          </div>

          {/* Move-in Evidence */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E2D9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', background: '#E6F1FB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" stroke="#185FA5" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#1C1C1A', fontSize: '15px', fontWeight: '700' }}>Photo Evidence</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Stored on IPFS</p>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#5F5E5A', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IPFS CID</label>
              <input
                type="text"
                placeholder="Qm... or bafy..."
                value={moveInCID}
                onChange={e => setMoveInCID(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E8E2D9', fontSize: '15px', outline: 'none', boxSizing: 'border-box', color: '#1C1C1A', background: '#FAFAF8' }}
              />
            </div>
            <button
              style={{ width: '100%', padding: '13px', background: '#185FA5', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
            >
              Record Move-in Photos
            </button>
          </div>

          {/* Release Deposit */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E2D9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', background: '#EAF3DE', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="22 4 12 14.01 9 11.01" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#1C1C1A', fontSize: '15px', fontWeight: '700' }}>Release Deposit</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Auto-transfer to tenant</p>
              </div>
            </div>
            <p style={{ color: '#5F5E5A', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', marginTop: 0 }}>
              No damage detected — release the full deposit back to the tenant automatically via smart contract.
            </p>
            <button
              onClick={() => setEscrowStatus('UNFUNDED')}
              style={{ width: '100%', padding: '13px', background: '#639922', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
            >
              Release to Tenant
            </button>
          </div>

          {/* Raise Dispute */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #F7C1C1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', background: '#FCEBEB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#A32D2D" strokeWidth="2" strokeLinejoin="round" />
                  <line x1="12" y1="9" x2="12" y2="13" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="17" x2="12.01" y2="17" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#A32D2D', fontSize: '15px', fontWeight: '700' }}>Raise Dispute</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Freeze & escalate</p>
              </div>
            </div>
            <p style={{ color: '#5F5E5A', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', marginTop: 0 }}>
              Funds are frozen immediately. A condition oracle reviews on-chain evidence to resolve fairly.
            </p>
            <button
              onClick={() => setEscrowStatus('DISPUTED')}
              style={{ width: '100%', padding: '13px', background: '#E24B4A', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
            >
              Raise Dispute
            </button>
          </div>
        </div>

        {/* How it Works */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #E8E2D9', marginBottom: '40px' }}>
          <h3 style={{ margin: '0 0 24px', color: '#1C1C1A', fontSize: '16px', fontWeight: '700', textAlign: 'center' }}>How Fianza Works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { icon: '🔒', step: '01', title: 'Deposit On-Chain', desc: 'Funds locked in immutable smart contract', color: '#EAF3DE', iconBg: '#3B6D11' },
              { icon: '📋', step: '02', title: 'Rules Pre-Defined', desc: 'Both parties agree to conditions upfront', color: '#E6F1FB', iconBg: '#185FA5' },
              { icon: '📸', step: '03', title: 'Photo Evidence', desc: 'Move-in/out photos stored on IPFS', color: '#EEEDFE', iconBg: '#534AB7' },
              { icon: '⚡', step: '04', title: 'Auto-Released', desc: 'Code executes, no human interference', color: '#FAEEDA', iconBg: '#854F0B' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '20px 12px' }}>
                <div style={{ width: '48px', height: '48px', background: item.color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '22px' }}>
                  {item.icon}
                </div>
                <div style={{ color: '#B4B2A9', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '6px' }}>STEP {item.step}</div>
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
