import React from 'react'

export type AuthForm = {
  name: string
  email: string
  password: string
}

interface AuthGateProps {
  mode: 'login' | 'register'
  setMode: (mode: 'login' | 'register') => void
  form: AuthForm
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: React.FormEvent) => void
  loading: boolean
  error: string
  sessionError?: boolean
  onRetry?: () => void
}

const AuthGate: React.FC<AuthGateProps> = ({
  mode,
  setMode,
  form,
  onChange,
  onSubmit,
  loading,
  error,
  sessionError = false,
  onRetry,
}) => (
  <main className="rentchain-auth">
    <div className="rentchain-auth-shell">
      <section className="rentchain-intro" aria-labelledby="rentchain-title">
        <div className="rentchain-brand">
          <span className="rentchain-brand-mark" aria-hidden="true">R+</span>
          <span>RentChain<span className="rentchain-brand-plus">+</span></span>
          <span className="rentchain-brand-by">by Fianza</span>
        </div>

        <div className="rentchain-intro-copy">
          <p className="rentchain-eyebrow">Evidence-driven rental settlement</p>
          <h1 id="rentchain-title">A fairer way to settle security deposits.</h1>
          <p className="rentchain-lead">
            Compare property condition with clear evidence, review proposed deductions, and settle approved
            outcomes transparently.
          </p>

          <div className="rentchain-principles">
            <article>
              <span className="rentchain-principle-number">01</span>
              <div>
                <h2>Document both inspections</h2>
                <p>Keep move-in and move-out evidence connected to the same rental agreement.</p>
              </div>
            </article>
            <article>
              <span className="rentchain-principle-number">02</span>
              <div>
                <h2>Review, don’t blindly automate</h2>
                <p>Damage assessments are proposals; uncertain or contested cases need human review.</p>
              </div>
            </article>
            <article>
              <span className="rentchain-principle-number">03</span>
              <div>
                <h2>Execute approved outcomes</h2>
                <p>Blockchain provides a transparent record for escrow actions and settlement.</p>
              </div>
            </article>
          </div>
        </div>

        <p className="rentchain-research-note">
          Research framework: explainable computer vision, evidence integrity, and confidence-aware review.
        </p>
      </section>

      <section className="rentchain-auth-card" aria-labelledby="auth-heading">
        <div className="rentchain-auth-card-heading">
          <p className="rentchain-eyebrow">{sessionError ? 'Session check' : 'Your rental workspace'}</p>
          <h2 id="auth-heading">
            {sessionError ? 'Can’t verify your session' : mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p>
            {sessionError
              ? 'The sign-in service could not be reached. Start the backend and try again.'
              : mode === 'login'
                ? 'Sign in to continue to your secure escrow workspace.'
                : 'Register to create a secure rental escrow workspace.'}
          </p>
        </div>

        {sessionError ? (
          <div className="rentchain-auth-error-state">
            <p role="alert">{error}</p>
            <button type="button" className="rentchain-submit" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="rentchain-auth-tabs" role="tablist" aria-label="Account access">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? 'is-active' : ''}
                onClick={() => setMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={mode === 'register' ? 'is-active' : ''}
                onClick={() => setMode('register')}
              >
                Create account
              </button>
            </div>

            <form className="rentchain-auth-form" onSubmit={onSubmit}>
              {mode === 'register' && (
                <label>
                  Full name
                  <input
                    autoComplete="name"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    placeholder="Your name"
                    required
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </label>

              {error && <p className="rentchain-inline-error" role="alert">{error}</p>}

              <button type="submit" className="rentchain-submit" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in securely' : 'Create account'}
              </button>
            </form>

            <p className="rentchain-auth-footnote">
              Your account is separate from your Algorand wallet. Connect a wallet after signing in to use escrow.
            </p>
          </>
        )}
      </section>

      <footer className="rentchain-auth-footer">
        <span>R+ RentChain</span>
        <span>Evidence first. Fairness always.</span>
      </footer>
    </div>
  </main>
)

export default AuthGate
