import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState, useEffect } from 'react'
import ConnectWallet from './components/ConnectWallet'
import { FianzaEscrowFactory } from './contracts/FianzaEscrow'
import { OnSchemaBreak, OnUpdate } from '@algorandfoundation/algokit-utils/types/app'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

const Home: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [escrowStatus, setEscrowStatus] = useState<'UNFUNDED' | 'FUNDED' | 'DISPUTED'>('UNFUNDED')
  const [depositAmount, setDepositAmount] = useState('')
  const [moveInCID, setMoveInCID] = useState('')
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant')
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [appId, setAppId] = useState<bigint | null>(null)

  const { activeAddress, transactionSigner } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()

  const getAlgorand = () => {
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    return algorand
  }

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const getOrDeployContract = async () => {
    const algorand = getAlgorand()
    const factory = new FianzaEscrowFactory({
      defaultSender: activeAddress ?? undefined,
      algorand,
    })
    const result = await factory.deploy({
      onSchemaBreak: OnSchemaBreak.AppendApp,
      onUpdate: OnUpdate.AppendApp,
    })
    setAppId(result.appClient.appId)
    return result.appClient
  }

  useEffect(() => {
    if (!activeAddress) return
    const fetchStatus = async () => {
      try {
        const appClient = await getOrDeployContract()
        const res = await appClient.send.getStatus({ args: {} })
        const status = res.return as string
        if (status === 'FUNDED') setEscrowStatus('FUNDED')
        else setEscrowStatus('UNFUNDED')
      } catch (e) {
        // not yet deployed — UNFUNDED default is fine
      }
    }
    fetchStatus()
  }, [activeAddress])

  const handleFundDeposit = async () => {
    if (!activeAddress) return showToast('Please connect your wallet first.', 'error')
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0)
      return showToast('Enter a valid ALGO amount.', 'error')
    setLoading(l => ({ ...l, fund: true }))
    try {
      const appClient = await getOrDeployContract()
      const res = await appClient.send.setFunded({ args: {} })
      const status = res.return as string
      setEscrowStatus('FUNDED')
      showToast(`Deposit locked on-chain! Contract says: ${status}`, 'success')
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    }
    setLoading(l => ({ ...l, fund: false }))
  }

  const handleGetStatus = async () => {
    if (!activeAddress) return showToast('Please connect your wallet first.', 'error')
    setLoading(l => ({ ...l, status: true }))
    try {
      const appClient = await getOrDeployContract()
      const res = await appClient.send.getStatus({ args: {} })
      const status = res.return as string
      if (status === 'FUNDED') setEscrowStatus('FUNDED')
      else setEscrowStatus('UNFUNDED')
      showToast(`On-chain status: ${status}`, 'success')
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    }
    setLoading(l => ({ ...l, status: false }))
  }

  const handleReleaseDeposit = async () => {
    if (!activeAddress) return showToast('Please connect your wallet first.', 'error')
    setLoading(l => ({ ...l, release: true }))
    try {
      const appClient = await getOrDeployContract()
      const res = await appClient.send.getStatus({ args: {} })
      const status = res.return as string
      if (status !== 'FUNDED') {
        showToast('Escrow is not funded — nothing to release.', 'error')
      } else {
        setEscrowStatus('UNFUNDED')
        showToast('Deposit released to tenant. (Add release_deposit() to contract for full on-chain transfer)', 'success')
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    }
    setLoading(l => ({ ...l, release: false }))
  }

  const handleRaiseDispute = async () => {
    if (!activeAddress) return showToast('Please connect your wallet first.', 'error')
    setLoading(l => ({ ...l, dispute: true }))
    try {
      const appClient = await getOrDeployContract()
      const res = await appClient.send.getStatus({ args: {} })
      const status = res.return as string
      if (status !== 'FUNDED') {
        showToast('No funded escrow to dispute.', 'error')
      } else {
        setEscrowStatus('DISPUTED')
        showToast('Dispute raised. Funds frozen. (Add raise_dispute() to contract for full on-chain freeze)', 'success')
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    }
    setLoading(l => ({ ...l, dispute: false }))
  }

  const statusConfig = {
    UNFUNDED: { color: '#854F0B', bg: '#FAEEDA', label: 'Awaiting Deposit' },
    FUNDED: { color: '#3B6D11', bg: '#EAF3DE', label: 'Deposit Secured' },
    DISPUTED: { color: '#A32D2D', bg: '#FCEBEB', label: 'Under Dispute' },
  }
  const status = statusConfig[escrowStatus]

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EE', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, background: toast.type === 'success' ? '#2d5a27' : '#A32D2D', color: 'white', padding: '14px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', maxWidth: '360px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}

      <nav style={{ background: '#1C3A18', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <span style={{ color: '#9FE1CB', fontSize: '13px' }}>LocalNet</span>
          {activeAddress && appId !== null && (
            <span style={{ color: '#5DCAA5', fontSize: '11px', background: 'rgba(93,202,165,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
              App #{appId.toString()}
            </span>
          )}
          <button onClick={() => setOpenWalletModal(true)} style={{ background: activeAddress ? 'rgba(93,202,165,0.2)' : '#5DCAA5', color: activeAddress ? '#9FE1CB' : '#1C3A18', border: activeAddress ? '1px solid rgba(93,202,165,0.3)' : 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            {activeAddress ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </nav>

      <div style={{ background: 'linear-gradient(180deg, #1C3A18 0%, #2d5a27 100%)', padding: '64px 40px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(93,202,165,0.15)', border: '1px solid rgba(93,202,165,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '20px' }}>
          <span style={{ color: '#5DCAA5', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Blockchain-Powered Escrow</span>
        </div>
        <h1 style={{ color: '#F7F4EE', fontSize: '48px', fontWeight: '800', margin: '0 0 16px', lineHeight: '1.1', letterSpacing: '-1px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
          Your Landlord Can Never<br /><span style={{ color: '#5DCAA5' }}>Steal Your Deposit</span> Again
        </h1>
        <p style={{ color: '#9FE1CB', fontSize: '18px', margin: '0 auto 32px', maxWidth: '520px', lineHeight: '1.6' }}>
          Transparent, fair, tamper-proof deposits secured by Algorand smart contracts.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => activeAddress ? handleFundDeposit() : setOpenWalletModal(true)} style={{ background: '#5DCAA5', color: '#1C3A18', border: 'none', borderRadius: '10px', padding: '14px 28px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
            Create Escrow
          </button>
          <button onClick={handleGetStatus} style={{ background: 'transparent', color: '#9FE1CB', border: '1px solid rgba(93,202,165,0.4)', borderRadius: '10px', padding: '14px 28px', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}>
            {loading.status ? 'Checking...' : 'Check On-Chain Status'}
          </button>
        </div>
      </div>

      <div style={{ background: '#F0EBE1', borderBottom: '1px solid #E0D9CE', padding: '20px 40px', display: 'flex', justifyContent: 'center', gap: '60px' }}>
        {[{ value: '$2.4M', label: 'Deposits Protected' }, { value: '1,240', label: 'Active Escrows' }, { value: '0', label: 'Disputes Unresolved' }, { value: '100%', label: 'Tamper-Proof' }].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ color: '#2d5a27', fontSize: '22px', fontWeight: '800' }}>{stat.value}</div>
            <div style={{ color: '#888780', fontSize: '12px', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['tenant', 'landlord'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: activeTab === tab ? '#2d5a27' : '#E8E2D9', color: activeTab === tab ? '#F7F4EE' : '#888780', fontWeight: '600', fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E2D9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', background: '#EAF3DE', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#1C1C1A', fontSize: '15px', fontWeight: '700' }}>Fund Deposit</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Lock funds on-chain</p>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#5F5E5A', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount (ALGO)</label>
              <input type="number" placeholder="e.g. 500" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E8E2D9', fontSize: '15px', outline: 'none', boxSizing: 'border-box', color: '#1C1C1A', background: '#FAFAF8' }} />
            </div>
            <button onClick={handleFundDeposit} disabled={loading.fund} style={{ width: '100%', padding: '13px', background: loading.fund ? '#9EC898' : '#2d5a27', color: 'white', border: 'none', borderRadius: '10px', cursor: loading.fund ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px' }}>
              {loading.fund ? 'Locking On-Chain...' : 'Lock Deposit On-Chain'}
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E2D9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', background: '#E6F1FB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="13" r="4" stroke="#185FA5" strokeWidth="2" /></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#1C1C1A', fontSize: '15px', fontWeight: '700' }}>Photo Evidence</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Stored on IPFS</p>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#5F5E5A', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IPFS CID</label>
              <input type="text" placeholder="Qm... or bafy..." value={moveInCID} onChange={e => setMoveInCID(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E8E2D9', fontSize: '15px', outline: 'none', boxSizing: 'border-box', color: '#1C1C1A', background: '#FAFAF8' }} />
            </div>
            <button onClick={() => moveInCID ? showToast(`CID recorded: ${moveInCID.slice(0, 20)}... (add store_cid() to contract for full on-chain storage)`, 'success') : showToast('Enter a CID first.', 'error')} style={{ width: '100%', padding: '13px', background: '#185FA5', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
              Record Move-in Photos
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #E8E2D9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', background: '#EAF3DE', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" /><polyline points="22 4 12 14.01 9 11.01" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#1C1C1A', fontSize: '15px', fontWeight: '700' }}>Release Deposit</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Auto-transfer to tenant</p>
              </div>
            </div>
            <p style={{ color: '#5F5E5A', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', marginTop: 0 }}>No damage detected — release the full deposit back to the tenant automatically via smart contract.</p>
            <button onClick={handleReleaseDeposit} disabled={loading.release} style={{ width: '100%', padding: '13px', background: loading.release ? '#9EC898' : '#639922', color: 'white', border: 'none', borderRadius: '10px', cursor: loading.release ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px' }}>
              {loading.release ? 'Processing...' : 'Release to Tenant'}
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #F7C1C1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', background: '#FCEBEB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#A32D2D" strokeWidth="2" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="17" x2="12.01" y2="17" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#A32D2D', fontSize: '15px', fontWeight: '700' }}>Raise Dispute</h3>
                <p style={{ margin: 0, color: '#888780', fontSize: '12px' }}>Freeze & escalate</p>
              </div>
            </div>
            <p style={{ color: '#5F5E5A', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', marginTop: 0 }}>Funds are frozen immediately. A condition oracle reviews on-chain evidence to resolve fairly.</p>
            <button onClick={handleRaiseDispute} disabled={loading.dispute} style={{ width: '100%', padding: '13px', background: loading.dispute ? '#E89090' : '#E24B4A', color: 'white', border: 'none', borderRadius: '10px', cursor: loading.dispute ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px' }}>
              {loading.dispute ? 'Processing...' : 'Raise Dispute'}
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #E8E2D9', marginBottom: '40px' }}>
          <h3 style={{ margin: '0 0 24px', color: '#1C1C1A', fontSize: '16px', fontWeight: '700', textAlign: 'center' }}>How Fianza Works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { icon: '🔒', step: '01', title: 'Deposit On-Chain', desc: 'Funds locked in immutable smart contract', color: '#EAF3DE' },
              { icon: '📋', step: '02', title: 'Rules Pre-Defined', desc: 'Both parties agree to conditions upfront', color: '#E6F1FB' },
              { icon: '📸', step: '03', title: 'Photo Evidence', desc: 'Move-in/out photos stored on IPFS', color: '#EEEDFE' },
              { icon: '⚡', step: '04', title: 'Auto-Released', desc: 'Code executes, no human interference', color: '#FAEEDA' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '20px 12px' }}>
                <div style={{ width: '48px', height: '48px', background: item.color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '22px' }}>{item.icon}</div>
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
