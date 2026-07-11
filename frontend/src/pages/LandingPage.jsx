import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      {/* ── Navigation ── */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🧠</div>
          Docu<span>Mind</span>
        </div>
        <div className={styles.navActions}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Sign in</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>Start free</button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <header className={styles.hero}>
        {/* Background glowing orbs */}
        <div className={styles.heroOrbPurple} />
        <div className={styles.heroOrbCyan} />

        <div className={styles.badge}>🟢 Now with Tamil, Hindi & Telugu</div>
        <h1 className={styles.heroTitle}>Chat with any document <span className={styles.gradText}>instantly</span></h1>
        <p className={styles.heroDesc}>
          Upload PDFs, Excel, Word docs. Ask questions, get summaries, extract data, and generate quizzes — powered by ultra-fast LLMs. 100% private.
        </p>
        
        <div className={styles.heroButtons}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>Start free — no card needed →</button>
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/login')}>Sign in</button>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.stat}><span className={styles.statNum}>10+</span><span className={styles.statLabel}>File formats</span></div>
          <div className={styles.statDivider} />
          <div className={styles.stat}><span className={styles.statNum}>3</span><span className={styles.statLabel}>Indian languages</span></div>
          <div className={styles.statDivider} />
          <div className={styles.stat}><span className={styles.statNum}>₹0</span><span className={styles.statLabel}>To start</span></div>
        </div>

        {/* Hero Visual Mockup */}
        <div className={styles.heroVisual}>
          <div className={styles.mockupHeader}>
            <div className={styles.mockupDots}>
              <span className={styles.dotR}></span><span className={styles.dotY}></span><span className={styles.dotG}></span>
            </div>
            <div className={styles.mockupTitle}>documind-ai.com/chat</div>
          </div>
          <div className={styles.mockupBody}>
            <div className={styles.mockupChat}>
              <div className={styles.mockupMsgAI}>✨ I've analyzed the 150-page Q3 Financial Report. What would you like to know?</div>
              <div className={styles.mockupMsgUser}>Summarize the key revenue drivers.</div>
              <div className={styles.mockupMsgAI}>The primary revenue drivers are:<br/>1. Enterprise Subscriptions (up 45%)<br/>2. API Usage (up 22%)<br/>3. Professional Services (flat)</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── How it Works Section ── */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <p className={styles.sectionSubtitle}>Get actionable insights from your files in seconds.</p>
        </div>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>1</div>
            <h3>Upload securely</h3>
            <p>Drag and drop your PDFs, Excel, CSV, or Word files. Your data never trains our models.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>2</div>
            <h3>AI Processing</h3>
            <p>Our intelligent pipeline chunks, embeds, and indexes your document in milliseconds.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>3</div>
            <h3>Chat & Extract</h3>
            <p>Ask questions, generate summaries, or instantly pull structured JSON from invoices.</p>
          </div>
        </div>
      </section>

      {/* ── Use Cases Section ── */}
      <section className={styles.useCases}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Built for every workflow</h2>
        </div>
        <div className={styles.useCaseGrid}>
          <div className={styles.useCaseCard}>
            <div className={styles.useCaseIcon}>💼</div>
            <h3>Finance & Accounting</h3>
            <p>Extract structured totals, line items, and vendor info from hundreds of invoices in one click.</p>
          </div>
          <div className={styles.useCaseCard}>
            <div className={styles.useCaseIcon}>⚖️</div>
            <h3>Legal Teams</h3>
            <p>Instantly summarize 100-page contracts, find specific clauses, and identify risks without reading.</p>
          </div>
          <div className={styles.useCaseCard}>
            <div className={styles.useCaseIcon}>🎓</div>
            <h3>Students & Educators</h3>
            <p>Upload textbooks to auto-generate multiple-choice quizzes and flashcards for exam prep.</p>
          </div>
          <div className={styles.useCaseCard}>
            <div className={styles.useCaseIcon}>👨‍💼</div>
            <h3>Human Resources</h3>
            <p>Parse resumes efficiently, summarize employee feedback forms, and analyze hiring metrics.</p>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section className={styles.pricing}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Simple, honest pricing</h2>
          <p className={styles.sectionSubtitle}>Start free. Upgrade when you need more.</p>
        </div>
        <div className={styles.pricingGrid}>
          {/* Free Tier */}
          <div className={styles.pricingCard}>
            <div className={styles.priceName}>Free</div>
            <div className={styles.priceAmount}>₹0<span className={styles.pricePeriod}>/forever</span></div>
            <ul className={styles.priceFeatures}>
              <li>✓ 3 documents/month</li>
              <li>✓ Chat + basic summary</li>
              <li>✓ Standard support</li>
            </ul>
            <button className="btn btn-ghost w-full" onClick={() => navigate('/signup')}>Start Free</button>
          </div>
          {/* Student Tier */}
          <div className={styles.pricingCard}>
            <div className={styles.priceName}>Student</div>
            <div className={styles.priceAmount}>₹299<span className={styles.pricePeriod}>/month</span></div>
            <ul className={styles.priceFeatures}>
              <li>✓ 50 documents/month</li>
              <li>✓ Quiz generator</li>
              <li>✓ All summary levels</li>
            </ul>
            <button className="btn btn-ghost w-full" onClick={() => navigate('/signup')}>Start Trial</button>
          </div>
          {/* Pro Tier */}
          <div className={`${styles.pricingCard} ${styles.pricingPro}`}>
            <div className={styles.proBadge}>Most Popular</div>
            <div className={styles.priceName}>Professional</div>
            <div className={styles.priceAmount}>₹999<span className={styles.pricePeriod}>/month</span></div>
            <ul className={styles.priceFeatures}>
              <li>✓ 200 documents/month</li>
              <li>✓ Data extraction (JSON)</li>
              <li>✓ Priority AI models</li>
            </ul>
            <button className="btn btn-primary w-full" onClick={() => navigate('/signup')}>Start Free Trial</button>
          </div>
          {/* Business Tier */}
          <div className={styles.pricingCard}>
            <div className={styles.priceName}>Business</div>
            <div className={styles.priceAmount}>₹4,999<span className={styles.pricePeriod}>/month</span></div>
            <ul className={styles.priceFeatures}>
              <li>✓ Unlimited documents</li>
              <li>✓ 10 team members</li>
              <li>✓ Priority SLA</li>
            </ul>
            <button className="btn btn-ghost w-full" onClick={() => navigate('/signup')}>Contact Sales</button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <div className={styles.logo}>🧠 Docu<span>Mind</span></div>
            <p>Enterprise document intelligence. Bridging the gap between raw data and actionable insights.</p>
          </div>
          <div className={styles.footerLinks}>
            <h4>Product</h4>
            <a href="#">Features</a>
            <a href="#">Pricing</a>
            <a href="#">Security</a>
          </div>
          <div className={styles.footerLinks}>
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Contact</a>
            <a href="#">Blog</a>
          </div>
          <div className={styles.footerLinks}>
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>Built by <strong>MOH AI TECH</strong> · Namakkal, Tamil Nadu, India · MSME Registered</p>
          <p>© {new Date().getFullYear()} DocuMind AI Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
