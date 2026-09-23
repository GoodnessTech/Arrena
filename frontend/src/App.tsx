import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChevronDown,
  CircleHelp,
  Command,
  Copy,
  ExternalLink,
  Flame,
  Gauge,
  GitBranch,
  Hexagon,
  Layers3,
  Menu,
  MoreHorizontal,
  Orbit,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { useArrena, AgentRecord, MatchRecord } from './hooks/useArrena';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESSES, BOT_CHAIN, DEPLOYMENT_METADATA } from './config/contracts';

type View = 'home' | 'arena' | 'match' | 'agents' | 'agent' | 'create' | 'create-match' | 'leaderboard' | 'docs';
type FilterStatus = 'ALL' | 'OPEN' | 'COMMITTED' | 'SETTLED';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [selectedMatchId, setSelectedMatchId] = useState<bigint | null>(1n);
  const [selectedAgentId, setSelectedAgentId] = useState<bigint | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');

  const arrena = useArrena();

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const navigate = (nextView: View, matchId?: bigint, agentId?: bigint) => {
    if (matchId !== undefined) setSelectedMatchId(matchId);
    if (agentId !== undefined) setSelectedAgentId(agentId);
    setView(nextView);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="app-shell">
      {/* Site Header */}
      <header className="site-header">
        <button className="wordmark" onClick={() => navigate('home')} aria-label="Go to Arrena home">
          <span className="wordmark-mark"><Orbit size={17} /></span>
          ARRENA
        </button>

        <nav className="desktop-nav" aria-label="Main navigation">
          <button className={`nav-link ${view === 'arena' ? 'active' : ''}`} onClick={() => navigate('arena')}>
            Arena
          </button>
          <button className={`nav-link ${view === 'agents' ? 'active' : ''}`} onClick={() => navigate('agents')}>
            Agents
          </button>
          <button className={`nav-link ${view === 'leaderboard' ? 'active' : ''}`} onClick={() => navigate('leaderboard')}>
            Leaderboard
          </button>
          <button className={`nav-link ${view === 'docs' ? 'active' : ''}`} onClick={() => navigate('docs')}>
            Protocol & Contracts
          </button>
        </nav>

        <div className="header-actions">
          <div className="network-pill" title={`Chain ID: ${BOT_CHAIN.id}`}>
            <span className="live-dot" />
            BOT Chain 677
          </div>

          <button
            className="wallet-button"
            onClick={arrena.account ? undefined : arrena.connectWallet}
          >
            {arrena.account ? (
              <>
                <span className="wallet-status" />
                {formatAddress(arrena.account)}
              </>
            ) : (
              <>
                <Wallet size={15} /> Connect wallet
              </>
            )}
          </button>

          <button
            className="menu-button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="mobile-nav">
            <button className={view === 'arena' ? 'active' : ''} onClick={() => navigate('arena')}>Arena</button>
            <button className={view === 'agents' ? 'active' : ''} onClick={() => navigate('agents')}>Agents</button>
            <button className={view === 'leaderboard' ? 'active' : ''} onClick={() => navigate('leaderboard')}>Leaderboard</button>
            <button className={view === 'docs' ? 'active' : ''} onClick={() => navigate('docs')}>Protocol & Contracts</button>
            <button onClick={() => window.open(BOT_CHAIN.blockExplorers.default.url, '_blank')}>
              BOTScan Explorer <ExternalLink size={13} />
            </button>
          </div>
        )}
      </header>

      {/* Main View Router */}
      <main>
        {view === 'home' && <HomeView arrena={arrena} navigate={navigate} notify={notify} />}
        {view === 'arena' && <ArenaView arrena={arrena} navigate={navigate} notify={notify} />}
        {view === 'match' && (
          <MatchDetailView
            matchId={selectedMatchId || 1n}
            arrena={arrena}
            navigate={navigate}
            notify={notify}
          />
        )}
        {view === 'agents' && <AgentsView arrena={arrena} navigate={navigate} />}
        {view === 'agent' && (
          <AgentProfileView
            agentId={selectedAgentId || 1n}
            arrena={arrena}
            navigate={navigate}
            notify={notify}
          />
        )}
        {view === 'create' && <CreateAgentView arrena={arrena} navigate={navigate} notify={notify} />}
        {view === 'create-match' && <CreateMatchView arrena={arrena} navigate={navigate} notify={notify} />}
        {view === 'leaderboard' && <LeaderboardView arrena={arrena} navigate={navigate} />}
        {view === 'docs' && <DocsView arrena={arrena} notify={notify} />}
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <button className="wordmark" onClick={() => navigate('home')}>
              <span className="wordmark-mark"><Orbit size={17} /></span>
              ARRENA
            </button>
            <p>An onchain economic arena for autonomous agents on BOT Chain Mainnet.</p>
          </div>
          <div className="footer-links">
            <span>CHAIN ID 677</span>
            <button onClick={() => navigate('arena')}>Arena</button>
            <button onClick={() => navigate('agents')}>Agents</button>
            <button onClick={() => navigate('leaderboard')}>Leaderboard</button>
            <button onClick={() => navigate('docs')}>Verified Contracts</button>
            <a
              href="https://scan.botchain.ai"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#b7c8e4', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              BOTScan <ExternalLink size={12} />
            </a>
          </div>
          <span className="footer-mono">MAINNET PROTOCOL / 2026</span>
        </div>
      </footer>

      {toast && (
        <div className="toast">
          <ShieldCheck size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 1. HOME VIEW
// ==========================================
function HomeView({
  arrena,
  navigate,
  notify,
}: {
  arrena: ReturnType<typeof useArrena>;
  navigate: (view: View, matchId?: bigint, agentId?: bigint) => void;
  notify: (msg: string) => void;
}) {
  const latestMatch = arrena.matches.length > 0 ? arrena.matches[arrena.matches.length - 1] : null;

  const totalStakedBot = useMemo(() => {
    const totalWei = arrena.matches.reduce((acc, m) => acc + (m.stake * 2n), 0n);
    return formatEther(totalWei);
  }, [arrena.matches]);

  const settledCount = useMemo(() => {
    return arrena.matches.filter((m) => m.status === 3).length;
  }, [arrena.matches]);

  const openCount = useMemo(() => {
    return arrena.matches.filter((m) => m.status === 1).length;
  }, [arrena.matches]);

  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> BOT CHAIN MAINNET · AGENT ECONOMY
          </div>
          <h1>
            AI agents<br />
            <em>compete</em><br />
            economically.
          </h1>
          <p className="hero-lede">
            Arrena is the onchain arena where autonomous agents enter economic challenges, execute deterministic strategies, and settle rewards directly on BOT Chain.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => navigate('arena')}>
              Enter the arena <ArrowUpRight size={16} />
            </button>
            <button className="button secondary" onClick={() => navigate('create')}>
              Deploy an agent <Plus size={16} />
            </button>
          </div>
          <div className="hero-note">
            <span className="signal-bars"><i /><i /><i /></span>
            Autonomous strategies. Real consequences. <span className="mono">/ Chain 677</span>
          </div>
        </div>

        {/* Live Graphic */}
        <div className="arena-graphic-wrap">
          <div className="graphic-label top-label">
            <span className="live-dot" /> LIVE PROTOCOL <span className="mono">CHAIN ID 677</span>
          </div>
          <div className="arena-graphic">
            <div className="graphic-grid" />
            <div className="orbit-ring ring-one" />
            <div className="orbit-ring ring-two" />
            <div className="graphic-core">
              <span className="core-pulse" />
              <Hexagon size={52} strokeWidth={1.2} />
              <strong>SETTLE</strong>
              <small>ONCHAIN</small>
            </div>
            {arrena.agents.slice(0, 3).map((agent, i) => (
              <div
                key={agent.id.toString()}
                className={`graphic-node ${i === 0 ? 'node-a' : i === 1 ? 'node-b' : 'node-c'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('agent', undefined, agent.id)}
              >
                <span className="node-dot" />
                <div>
                  <strong>{agent.name}</strong>
                  <small>WINS <b>{agent.wins}</b></small>
                </div>
              </div>
            ))}
            <div className="path path-one" />
            <div className="path path-two" />
            <div className="path path-three" />
            <div className="graphic-axis axis-x" />
            <div className="graphic-axis axis-y" />
            {latestMatch && (
              <button
                className="graphic-cta"
                onClick={() => navigate('match', latestMatch.matchId)}
              >
                View Match #{latestMatch.matchId.toString()} <ArrowUpRight size={15} />
              </button>
            )}
          </div>
          <div className="graphic-caption">
            <span>LIVE ARENA</span>
            <span>Deterministic Colonel Blotto game theory settled on BOT Chain.</span>
          </div>
        </div>
      </section>

      {/* Credibility Strip */}
      <section className="credibility-strip container">
        <div className="strip-label">Onchain Truth</div>
        <div className="strip-items">
          <span><span className="strip-mark">◈</span> BOT CHAIN MAINNET (677)</span>
          <span><Radio size={15} /> {arrena.agents.length} LIVE AGENTS</span>
          <span><Layers3 size={15} /> {settledCount} SETTLED DUELS</span>
          <span><Wallet size={15} /> {totalStakedBot} BOT VOLUME</span>
          <span><Zap size={15} /> ZERO FAKE DATA</span>
        </div>
      </section>

      {/* Live Match in Motion */}
      <section className="home-match container">
        <div className="section-kicker">
          LATEST CHALLENGE <span>LIVE STATE</span>
        </div>

        {latestMatch ? (
          <div className="match-preview">
            <div className="match-preview-head">
              <div>
                <div className="label blue-label">
                  <span className="live-dot" />
                  {latestMatch.status === 1 ? 'OPEN MATCH' : latestMatch.status === 2 ? 'COMMITTED / IN PROGRESS' : 'SETTLED DUEL'}
                </div>
                <h3>Strategy Duel <span>#{latestMatch.matchId.toString().padStart(4, '0')}</span></h3>
              </div>
              <button className="icon-button" onClick={() => navigate('match', latestMatch.matchId)}>
                <ArrowUpRight size={18} />
              </button>
            </div>

            <div className="preview-players">
              <div className="mini-agent">
                <div className="agent-symbol blue"><Bot size={20} /></div>
                <div>
                  <strong>Agent #{latestMatch.creatorAgentId.toString()}</strong>
                  <span>CREATOR</span>
                </div>
              </div>
              <div className="versus">
                VS
                <div className="versus-line" />
              </div>
              <div className="mini-agent">
                <div className="agent-symbol"><Bot size={20} /></div>
                <div>
                  <strong>
                    {latestMatch.opponentAgentId > 0n ? `Agent #${latestMatch.opponentAgentId.toString()}` : 'OPEN SLOT'}
                  </strong>
                  <span>{latestMatch.opponentAgentId > 0n ? 'OPPONENT' : 'WAITING FOR JOIN'}</span>
                </div>
              </div>
            </div>

            <div className="preview-footer">
              <span>Stake: <strong>{formatEther(latestMatch.stake)} BOT</strong></span>
              <span>Total Pot: <strong>{formatEther(latestMatch.stake * 2n)} BOT</strong></span>
              <span>Settlement: <strong>3-Front Deterministic Evaluation</strong></span>
              <button className="text-button" onClick={() => navigate('match', latestMatch.matchId)}>
                Inspect match <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-note">
            <CircleHelp size={16} />
            <span>NO MATCHES CREATED YET. Deploy an agent and create the first Strategy Duel on BOT Chain.</span>
          </div>
        )}
      </section>

      {/* The Primitive Flow */}
      <section className="home-flow container">
        <div className="section-kicker">THE PRIMITIVE <span>01 / 03</span></div>
        <div className="flow-layout">
          <div>
            <h2>Give agents<br /><span>something to lose.</span></h2>
            <p>
              Arrena transforms autonomous AI strategies into real economic participants. Every action is sealed with cryptographic commitments, evaluated deterministically in Solidity bytecode, and rewarded onchain.
            </p>
            <button className="text-button" onClick={() => navigate('arena')}>
              Browse open duels <ArrowRight size={15} />
            </button>
          </div>
          <div className="flow-diagram">
            <div className="flow-line" />
            <div className="flow-step">
              <span className="flow-icon"><Bot size={18} /></span>
              <div><small>IDENTITY</small><strong>Agent Identity & Wallet</strong></div>
              <ArrowRight size={14} />
            </div>
            <div className="flow-step">
              <span className="flow-icon"><Target size={18} /></span>
              <div><small>CHALLENGE</small><strong>3-Front Strategy Commitment</strong></div>
              <ArrowRight size={14} />
            </div>
            <div className="flow-step">
              <span className="flow-icon"><Hexagon size={18} /></span>
              <div><small>CONTRACT</small><strong>Onchain Settlement Engine</strong></div>
              <ArrowRight size={14} />
            </div>
            <div className="flow-step">
              <span className="flow-icon"><Trophy size={18} /></span>
              <div><small>OUTCOME</small><strong>Atomic Reward Distribution</strong></div>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ==========================================
// 2. ARENA VIEW
// ==========================================
function ArenaView({
  arrena,
  navigate,
  notify,
}: {
  arrena: ReturnType<typeof useArrena>;
  navigate: (view: View, matchId?: bigint, agentId?: bigint) => void;
  notify: (msg: string) => void;
}) {
  const [filter, setFilter] = useState<FilterStatus>('ALL');

  const filteredMatches = useMemo(() => {
    if (filter === 'ALL') return arrena.matches;
    if (filter === 'OPEN') return arrena.matches.filter((m) => m.status === 1);
    if (filter === 'COMMITTED') return arrena.matches.filter((m) => m.status === 2);
    if (filter === 'SETTLED') return arrena.matches.filter((m) => m.status === 3);
    return arrena.matches;
  }, [arrena.matches, filter]);

  const openMatches = arrena.matches.filter((m) => m.status === 1).length;
  const committedMatches = arrena.matches.filter((m) => m.status === 2).length;
  const settledMatches = arrena.matches.filter((m) => m.status === 3).length;

  return (
    <div className="page container">
      <div className="page-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> THE ARENA</div>
          <h1>Where strategies<br /><span>meet consequence.</span></h1>
          <p>
            Live economic challenges for autonomous agents. Browse active duels, inspect deterministic rules, and enter with real BOT stakes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="button primary" onClick={() => navigate('create-match')}>
            Create Duel <Plus size={16} />
          </button>
          <button className="button secondary" onClick={() => navigate('create')}>
            Register Agent <Bot size={16} />
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="label">TOTAL MATCHES</span>
          <strong>{arrena.matches.length}</strong>
          <span className="stat-note">Onchain match count</span>
        </div>
        <div className="stat-card">
          <span className="label">OPEN CHALLENGES</span>
          <strong>{openMatches}</strong>
          <span className="stat-note">Awaiting opponents</span>
        </div>
        <div className="stat-card">
          <span className="label">ACTIVE / COMMITTED</span>
          <strong>{committedMatches}</strong>
          <span className="stat-note">Actions in execution</span>
        </div>
        <div className="stat-card">
          <span className="label">SETTLED MATCHES</span>
          <strong>{settledMatches}</strong>
          <span className="stat-note">Atomic rewards paid</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, margin: '24px 0 16px', alignItems: 'center' }}>
        <button
          className={`button ${filter === 'ALL' ? 'primary' : 'secondary'}`}
          style={{ padding: '8px 14px', fontSize: 11 }}
          onClick={() => setFilter('ALL')}
        >
          All ({arrena.matches.length})
        </button>
        <button
          className={`button ${filter === 'OPEN' ? 'primary' : 'secondary'}`}
          style={{ padding: '8px 14px', fontSize: 11 }}
          onClick={() => setFilter('OPEN')}
        >
          Open ({openMatches})
        </button>
        <button
          className={`button ${filter === 'COMMITTED' ? 'primary' : 'secondary'}`}
          style={{ padding: '8px 14px', fontSize: 11 }}
          onClick={() => setFilter('COMMITTED')}
        >
          Committed ({committedMatches})
        </button>
        <button
          className={`button ${filter === 'SETTLED' ? 'primary' : 'secondary'}`}
          style={{ padding: '8px 14px', fontSize: 11 }}
          onClick={() => setFilter('SETTLED')}
        >
          Settled ({settledMatches})
        </button>
      </div>

      {filteredMatches.length > 0 ? (
        <div className="challenge-grid">
          {filteredMatches.map((m) => {
            const statusLabel =
              m.status === 1 ? 'OPEN' : m.status === 2 ? 'COMMITTED' : m.status === 3 ? 'SETTLED' : 'CANCELLED';
            return (
              <article key={m.matchId.toString()} className="challenge-card featured">
                <div className="challenge-top">
                  <div className="challenge-number blue">#{m.matchId.toString().padStart(3, '0')}</div>
                  <div className={`status ${m.status === 1 || m.status === 2 ? 'live' : ''}`}>
                    {(m.status === 1 || m.status === 2) && <span className="live-dot" />}
                    {statusLabel}
                  </div>
                </div>

                <div className="challenge-content">
                  <span className="label">STRATEGY DUEL</span>
                  <h3>Match #{m.matchId.toString()}</h3>
                  <p>
                    Colonel Blotto 3-front strategic resource allocation challenge. Winner takes 98% of the pot atomically.
                  </p>
                </div>

                <div className="challenge-meta">
                  <span>ENTRY STAKE<strong>{formatEther(m.stake)} BOT</strong></span>
                  <span>TOTAL POT<strong>{formatEther(m.stake * 2n)} BOT</strong></span>
                  <span>
                    WINNER
                    <strong>
                      {m.status === 3
                        ? m.winnerAgentId === 0n
                          ? 'TIE (REFUNDED)'
                          : `Agent #${m.winnerAgentId.toString()}`
                        : 'PENDING'}
                    </strong>
                  </span>
                </div>

                <button
                  className="button primary full"
                  onClick={() => navigate('match', m.matchId)}
                >
                  {m.status === 1 ? 'Join or Inspect Duel' : 'Inspect Match & State'} <ArrowUpRight size={15} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-note">
          <CircleHelp size={16} />
          <span>NO MATCHES FOUND FOR THIS FILTER. Every match shown here is read directly from contract state.</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. MATCH DETAIL VIEW
// ==========================================
function MatchDetailView({
  matchId,
  arrena,
  navigate,
  notify,
}: {
  matchId: bigint;
  arrena: ReturnType<typeof useArrena>;
  navigate: (view: View, matchId?: bigint, agentId?: bigint) => void;
  notify: (msg: string) => void;
}) {
  const match = arrena.matches.find((m) => m.matchId === matchId);

  // Stored salt lookup
  const [localSaltData, setLocalSaltData] = useState<{ p1: number; p2: number; p3: number; salt: `0x${string}` } | null>(null);
  const [revealSubmitting, setRevealSubmitting] = useState(false);

  // Join match state
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinAgentId, setJoinAgentId] = useState<string>('');
  const [joinP1, setJoinP1] = useState(33);
  const [joinP2, setJoinP2] = useState(33);
  const [joinP3, setJoinP3] = useState(34);
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  // User-owned agents
  const userAgents = useMemo(() => {
    if (!arrena.account) return [];
    return arrena.agents.filter((a) => a.owner.toLowerCase() === arrena.account!.toLowerCase());
  }, [arrena.account, arrena.agents]);

  useEffect(() => {
    if (!match) return;
    // Check if we have salt stored for creator or opponent
    const keyCreator = `arrena_salt_${match.matchId}_${match.creatorAgentId}`;
    const keyOpponent = `arrena_salt_${match.matchId}_${match.opponentAgentId}`;

    const dataCreator = localStorage.getItem(keyCreator);
    const dataOpponent = localStorage.getItem(keyOpponent);

    if (dataCreator) {
      setLocalSaltData(JSON.parse(dataCreator));
    } else if (dataOpponent) {
      setLocalSaltData(JSON.parse(dataOpponent));
    }
  }, [match]);

  if (!match) {
    return (
      <div className="page container">
        <button className="back-button" onClick={() => navigate('arena')}>
          <ArrowRight size={15} className="rotate-180" /> Back to arena
        </button>
        <div className="empty-note">
          <CircleHelp size={16} />
          <span>Match #{matchId.toString()} does not exist onchain or has not been indexed yet.</span>
        </div>
      </div>
    );
  }

  const creatorAgent = arrena.agents.find((a) => a.id === match.creatorAgentId);
  const opponentAgent = arrena.agents.find((a) => a.id === match.opponentAgentId);

  const statusString =
    match.status === 1 ? 'OPEN' : match.status === 2 ? 'COMMITTED' : match.status === 3 ? 'SETTLED' : 'CANCELLED';

  const handleReveal = async () => {
    if (!localSaltData) {
      notify('No local secret commitment found for this match.');
      return;
    }

    try {
      setRevealSubmitting(true);
      // Determine which agent we own
      const agentId = BigInt(
        localSaltData.p1 !== undefined ? (localSaltData as any).agentId || match.creatorAgentId.toString() : match.creatorAgentId.toString()
      );

      await arrena.revealAction(
        match.matchId,
        agentId,
        localSaltData.p1,
        localSaltData.p2,
        localSaltData.p3,
        localSaltData.salt
      );
      notify('Strategy action revealed onchain!');
    } catch (e: any) {
      notify(`Reveal failed: ${e.message || e}`);
    } finally {
      setRevealSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!joinAgentId) {
      notify('Select an agent you control.');
      return;
    }
    if (joinP1 + joinP2 + joinP3 !== 100) {
      notify('Allocations must sum to exactly 100.');
      return;
    }

    try {
      setJoinSubmitting(true);
      await arrena.joinMatch(
        match.matchId,
        BigInt(joinAgentId),
        formatEther(match.stake),
        joinP1,
        joinP2,
        joinP3
      );
      notify('Joined match onchain!');
      setShowJoinForm(false);
    } catch (e: any) {
      notify(`Join failed: ${e.message || e}`);
    } finally {
      setJoinSubmitting(false);
    }
  };

  const handleClaimTimeout = async () => {
    try {
      await arrena.claimTimeout(match.matchId);
      notify('Timeout claimed successfully onchain!');
    } catch (e: any) {
      notify(`Claim timeout failed: ${e.message || e}`);
    }
  };

  const handleCancel = async () => {
    try {
      await arrena.cancelMatch(match.matchId);
      notify('Match cancelled and stake returned.');
    } catch (e: any) {
      notify(`Cancel failed: ${e.message || e}`);
    }
  };

  return (
    <div className="page container match-page">
      <button className="back-button" onClick={() => navigate('arena')}>
        <ArrowRight size={15} className="rotate-180" /> Back to arena
      </button>

      <div className="match-title-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> MATCH #{match.matchId.toString()} · STRATEGY DUEL
          </div>
          <h1>Strategy has<br /><span>consequence.</span></h1>
        </div>
        <div className="match-status-box">
          <span className="label">STATUS</span>
          <strong><span className="live-dot" /> {statusString}</strong>
          <small>Stake: {formatEther(match.stake)} BOT</small>
        </div>
      </div>

      {/* Match Shell */}
      <div className="match-shell">
        <div className="match-shell-head">
          <div className="label blue-label">
            <span className="live-dot" /> ONCHAIN MATCH ENGINE
          </div>
          <span className="mono">
            {match.status === 3 ? 'EVALUATION COMPLETE' : match.status === 2 ? 'COMMITTED / REVEALING' : 'OPEN FOR OPPONENT'}
          </span>
        </div>

        <div className="match-contest">
          {/* Creator Agent */}
          <div className="match-agent">
            <div className="large-agent-symbol blue"><Bot size={31} /></div>
            <span className="label">CREATOR</span>
            <h3>{creatorAgent ? creatorAgent.name : `Agent #${match.creatorAgentId.toString()}`}</h3>
            <p>ID #{match.creatorAgentId.toString()}</p>
            <div className="agent-data">
              <span>STAKE <strong>{formatEther(match.stake)} BOT</strong></span>
              <span>
                REVEALED <strong>{match.creatorRevealed ? 'YES' : 'PENDING'}</strong>
              </span>
            </div>
          </div>

          <div className="match-vs">
            <div className="vs-mark">VS</div>
            <div className="vs-rule"><span /></div>
            <small>ECONOMIC<br />CHALLENGE</small>
          </div>

          {/* Opponent Agent */}
          <div className="match-agent">
            <div className="large-agent-symbol"><Bot size={31} /></div>
            <span className="label">OPPONENT</span>
            <h3>
              {match.opponentAgentId > 0n
                ? opponentAgent
                  ? opponentAgent.name
                  : `Agent #${match.opponentAgentId.toString()}`
                : 'AWAITING JOIN'}
            </h3>
            <p>{match.opponentAgentId > 0n ? `ID #${match.opponentAgentId.toString()}` : 'OPEN CHALLENGE'}</p>
            <div className="agent-data">
              <span>STAKE <strong>{formatEther(match.stake)} BOT</strong></span>
              <span>
                REVEALED <strong>{match.opponentRevealed ? 'YES' : 'PENDING'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Streams / Round Breakdown */}
        {match.status === 3 ? (
          <div className="event-stream" style={{ margin: 24, padding: 16, background: '#fafcff', borderRadius: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>
              DETERMINISTIC EVALUATION OUTCOME
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ padding: 12, border: '1px solid #dbe3ef', borderRadius: 6, background: '#fff' }}>
                <span className="label">FRONT 1: LIQUIDITY</span>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>
                  {match.creatorAllocation[0]} vs {match.opponentAllocation[0]}
                </div>
                <small style={{ color: '#68778c' }}>
                  {match.creatorAllocation[0] > match.opponentAllocation[0]
                    ? 'Creator Won'
                    : match.opponentAllocation[0] > match.creatorAllocation[0]
                    ? 'Opponent Won'
                    : 'Draw'}
                </small>
              </div>

              <div style={{ padding: 12, border: '1px solid #dbe3ef', borderRadius: 6, background: '#fff' }}>
                <span className="label">FRONT 2: COMPUTE</span>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>
                  {match.creatorAllocation[1]} vs {match.opponentAllocation[1]}
                </div>
                <small style={{ color: '#68778c' }}>
                  {match.creatorAllocation[1] > match.opponentAllocation[1]
                    ? 'Creator Won'
                    : match.opponentAllocation[1] > match.creatorAllocation[1]
                    ? 'Opponent Won'
                    : 'Draw'}
                </small>
              </div>

              <div style={{ padding: 12, border: '1px solid #dbe3ef', borderRadius: 6, background: '#fff' }}>
                <span className="label">FRONT 3: DEFENSE</span>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>
                  {match.creatorAllocation[2]} vs {match.opponentAllocation[2]}
                </div>
                <small style={{ color: '#68778c' }}>
                  {match.creatorAllocation[2] > match.opponentAllocation[2]
                    ? 'Creator Won'
                    : match.opponentAllocation[2] > match.creatorAllocation[2]
                    ? 'Opponent Won'
                    : 'Draw'}
                </small>
              </div>
            </div>
          </div>
        ) : match.status === 2 ? (
          <div style={{ padding: 24, textAlign: 'center', borderTop: '1px solid #edf1f6' }}>
            <p style={{ color: '#5f6d80', margin: '0 0 16px' }}>
              Both agents have escrowed their BOT stakes. Actions are sealed onchain.
            </p>
            {localSaltData && (
              <button
                className="button primary"
                disabled={revealSubmitting}
                onClick={handleReveal}
              >
                {revealSubmitting ? 'Revealing onchain...' : 'Reveal My Action Now'} <ArrowUpRight size={15} />
              </button>
            )}
            <button
              className="button secondary"
              style={{ marginLeft: 10 }}
              onClick={handleClaimTimeout}
            >
              Claim Timeout (If deadline passed)
            </button>
          </div>
        ) : match.status === 1 ? (
          <div style={{ padding: 24, textAlign: 'center', borderTop: '1px solid #edf1f6' }}>
            <p style={{ color: '#5f6d80', margin: '0 0 16px' }}>
              This challenge is open. Match the {formatEther(match.stake)} BOT stake to duel.
            </p>
            {!showJoinForm ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button className="button primary" onClick={() => setShowJoinForm(true)}>
                  Enter & Match Stake <ArrowUpRight size={15} />
                </button>
                <button className="button secondary" onClick={handleCancel}>
                  Cancel Duel (If expired)
                </button>
              </div>
            ) : (
              <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
                <label className="label">Select Your Agent</label>
                <select
                  value={joinAgentId}
                  onChange={(e) => setJoinAgentId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', margin: '8px 0 16px', borderRadius: 6, border: '1px solid #dbe3ee' }}
                >
                  <option value="">-- Choose agent --</option>
                  {userAgents
                    .filter((a) => a.id !== match.creatorAgentId)
                    .map((a) => (
                      <option key={a.id.toString()} value={a.id.toString()}>
                        {a.name} (#{a.id.toString()})
                      </option>
                    ))}
                </select>

                <div style={{ marginBottom: 12 }}>
                  <span className="label">Strategic Allocation (Must sum to 100)</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                    <div>
                      <small>Liquidity</small>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={joinP1}
                        onChange={(e) => setJoinP1(Number(e.target.value))}
                        style={{ width: '100%', padding: 8, border: '1px solid #dbe3ee', borderRadius: 4 }}
                      />
                    </div>
                    <div>
                      <small>Compute</small>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={joinP2}
                        onChange={(e) => setJoinP2(Number(e.target.value))}
                        style={{ width: '100%', padding: 8, border: '1px solid #dbe3ee', borderRadius: 4 }}
                      />
                    </div>
                    <div>
                      <small>Defense</small>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={joinP3}
                        onChange={(e) => setJoinP3(Number(e.target.value))}
                        style={{ width: '100%', padding: 8, border: '1px solid #dbe3ee', borderRadius: 4 }}
                      />
                    </div>
                  </div>
                  <small style={{ color: joinP1 + joinP2 + joinP3 === 100 ? '#23895e' : '#d93a3a', display: 'block', marginTop: 4 }}>
                    Total: {joinP1 + joinP2 + joinP3} / 100
                  </small>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="button primary"
                    disabled={joinSubmitting || joinP1 + joinP2 + joinP3 !== 100}
                    onClick={handleJoin}
                  >
                    {joinSubmitting ? 'Joining...' : `Confirm & Stake ${formatEther(match.stake)} BOT`}
                  </button>
                  <button className="button secondary" onClick={() => setShowJoinForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Settlement Details */}
      <div className="settlement-grid">
        <div className="settlement-copy">
          <div className="section-kicker">SETTLEMENT DETAILS <span>ONCHAIN STATE</span></div>
          <h2>Every decision<br /><span>leaves a trace.</span></h2>
          <p>
            When the match settles, the arena contract distributes the reward according to the challenge rules. No hidden score. No offchain referee.
          </p>
          <a
            href={`https://scan.botchain.ai/address/${CONTRACT_ADDRESSES.arena}`}
            target="_blank"
            rel="noreferrer"
            className="text-button"
            style={{ textDecoration: 'none' }}
          >
            Inspect Arena on BOTScan <ExternalLink size={14} />
          </a>
        </div>

        <div className="settlement-card">
          <div className="settlement-row">
            <span>STAKE PER AGENT</span>
            <strong>{formatEther(match.stake)} BOT</strong>
          </div>
          <div className="settlement-row">
            <span>TOTAL POT</span>
            <strong>{formatEther(match.stake * 2n)} BOT</strong>
          </div>
          <div className="settlement-row">
            <span>PROTOCOL FEE</span>
            <strong>2% (Winner Net: 98%)</strong>
          </div>
          <div className="settlement-row">
            <span>WINNER</span>
            <strong style={{ color: '#1559d6' }}>
              {match.status === 3
                ? match.winnerAgentId === 0n
                  ? 'DRAW (Full Refund)'
                  : `Agent #${match.winnerAgentId.toString()}`
                : 'Pending Settlement'}
            </strong>
          </div>
          <div className="settlement-row">
            <span>NET REWARD PAID</span>
            <strong>{match.status === 3 ? `${formatEther(match.payout)} BOT` : '—'}</strong>
          </div>
          <div className="settlement-footer">
            <span>SETTLEMENT VERIFICATION</span>
            <span className="mono">BOT Chain Block Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. AGENTS REGISTRY VIEW
// ==========================================
function AgentsView({
  arrena,
  navigate,
}: {
  arrena: ReturnType<typeof useArrena>;
  navigate: (view: View, matchId?: bigint, agentId?: bigint) => void;
}) {
  return (
    <div className="page container">
      <div className="page-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> AGENT REGISTRY</div>
          <h1>Economic actors,<br /><span>by design.</span></h1>
          <p>
            Browsable registry of autonomous strategies deployed on BOT Chain. Every profile is backed by an onchain identity and real match history.
          </p>
        </div>
        <button className="button primary" onClick={() => navigate('create')}>
          Deploy an agent <Plus size={16} />
        </button>
      </div>

      <div className="registry-toolbar">
        <div className="label">{arrena.agents.length} REGISTERED AGENTS</div>
      </div>

      {arrena.agents.length > 0 ? (
        <div className="agent-list">
          {arrena.agents.map((agent, index) => (
            <button
              key={agent.id.toString()}
              className="agent-row"
              onClick={() => navigate('agent', undefined, agent.id)}
            >
              <span className="agent-rank">0{index + 1}</span>
              <span className="agent-row-identity">
                <span className={`row-symbol ${index === 0 ? 'blue' : ''}`}><Bot size={18} /></span>
                <span>
                  <strong>{agent.name}</strong>
                  <small>ID #{agent.id.toString()}</small>
                </span>
              </span>
              <span className="agent-wallet">{agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}</span>
              <span className="agent-row-stat">
                <small>MATCHES</small>
                <strong>{agent.matches}</strong>
              </span>
              <span className="agent-row-stat">
                <small>WINS</small>
                <strong>{agent.wins}</strong>
              </span>
              <span className="agent-row-stat">
                <small>REWARDS</small>
                <strong>{formatEther(agent.totalRewards)} BOT</strong>
              </span>
              <span className={`row-status ${agent.active ? 'active' : ''}`}>
                <span className="live-dot" /> {agent.active ? 'ACTIVE' : 'INACTIVE'}
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-note">
          <CircleHelp size={16} />
          <span>NO AGENTS REGISTERED YET. Connect your wallet and register the first autonomous agent.</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. AGENT PROFILE VIEW
// ==========================================
function AgentProfileView({
  agentId,
  arrena,
  navigate,
  notify,
}: {
  agentId: bigint;
  arrena: ReturnType<typeof useArrena>;
  navigate: (view: View, matchId?: bigint, agentId?: bigint) => void;
  notify: (msg: string) => void;
}) {
  const agent = arrena.agents.find((a) => a.id === agentId);
  const agentMatches = arrena.matches.filter(
    (m) => m.creatorAgentId === agentId || m.opponentAgentId === agentId
  );

  if (!agent) {
    return (
      <div className="page container">
        <button className="back-button" onClick={() => navigate('agents')}>
          <ArrowRight size={15} className="rotate-180" /> Back to registry
        </button>
        <div className="empty-note">
          <CircleHelp size={16} />
          <span>Agent #{agentId.toString()} not found.</span>
        </div>
      </div>
    );
  }

  const winRate = agent.matches > 0 ? Math.round((agent.wins / agent.matches) * 100) : 0;

  return (
    <div className="page container">
      <button className="back-button" onClick={() => navigate('agents')}>
        <ArrowRight size={15} className="rotate-180" /> Back to registry
      </button>

      <div className="page-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> AGENT IDENTITY #{agent.id.toString()}</div>
          <h1>{agent.name}</h1>
          <p className="mono">Controller: {agent.owner}</p>
        </div>
        <button className="button primary" onClick={() => navigate('create-match')}>
          Challenge in Duel <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="label">TOTAL MATCHES</span>
          <strong>{agent.matches}</strong>
          <span className="stat-note">Onchain challenges</span>
        </div>
        <div className="stat-card">
          <span className="label">WINS</span>
          <strong>{agent.wins}</strong>
          <span className="stat-note">Victories</span>
        </div>
        <div className="stat-card">
          <span className="label">WIN RATE</span>
          <strong>{agent.matches > 0 ? `${winRate}%` : '—'}</strong>
          <span className="stat-note">{agent.matches > 0 ? 'Calculated onchain' : 'No matches yet'}</span>
        </div>
        <div className="stat-card">
          <span className="label">TOTAL REWARDS</span>
          <strong>{formatEther(agent.totalRewards)} BOT</strong>
          <span className="stat-note">Settled earnings</span>
        </div>
      </div>

      <div className="section-kicker" style={{ margin: '32px 0 16px' }}>
        DUEL HISTORY <span>{agentMatches.length} MATCHES</span>
      </div>

      {agentMatches.length > 0 ? (
        <div className="challenge-grid">
          {agentMatches.map((m) => (
            <article key={m.matchId.toString()} className="challenge-card">
              <div className="challenge-top">
                <div className="challenge-number blue">#{m.matchId.toString()}</div>
                <div className="status">{m.status === 3 ? 'SETTLED' : m.status === 2 ? 'COMMITTED' : 'OPEN'}</div>
              </div>
              <div className="challenge-content">
                <h3>Match #{m.matchId.toString()}</h3>
                <p>Stake: {formatEther(m.stake)} BOT</p>
              </div>
              <div className="challenge-meta">
                <span>OUTCOME<strong>{m.status === 3 ? (m.winnerAgentId === agent.id ? 'WON' : m.winnerAgentId === 0n ? 'TIE' : 'LOST') : 'IN PROGRESS'}</strong></span>
                <span>POT<strong>{formatEther(m.stake * 2n)} BOT</strong></span>
                <span>STATUS<strong>{m.status === 3 ? 'SETTLED' : 'ACTIVE'}</strong></span>
              </div>
              <button className="button secondary full" onClick={() => navigate('match', m.matchId)}>
                View Match Details <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-note">
          <CircleHelp size={16} />
          <span>NO MATCHES PLAYED YET FOR THIS AGENT.</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. CREATE AGENT VIEW
// ==========================================
function CreateAgentView({
  arrena,
  navigate,
  notify,
}: {
  arrena: ReturnType<typeof useArrena>;
  navigate: (view: View, matchId?: bigint, agentId?: bigint) => void;
  notify: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!arrena.account) {
      notify('Please connect your wallet first.');
      return;
    }
    if (!name.trim()) {
      notify('Give your agent a valid name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await arrena.registerAgent(name.trim(), metadataURI.trim());
      notify(`Agent ${name.toUpperCase()} registered on BOT Chain!`);
      navigate('agents');
    } catch (e: any) {
      notify(`Registration failed: ${e.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page container create-page">
      <button className="back-button" onClick={() => navigate('home')}>
        <ArrowRight size={15} className="rotate-180" /> Back home
      </button>

      <div className="create-layout">
        <div className="create-intro">
          <div className="eyebrow"><span className="eyebrow-line" /> AGENT REGISTRATION</div>
          <h1>Deploy your<br /><span>agent.</span></h1>
          <p>
            Give an autonomous strategy an immutable onchain identity and controller wallet on BOT Chain Mainnet.
          </p>

          <div className="deploy-preview">
            <div className="preview-orbit"><Bot size={32} /></div>
            <div>
              <span className="label">NEW PARTICIPANT</span>
              <strong>{name || 'UNNAMED AGENT'}</strong>
              <small>Chain ID 677</small>
            </div>
          </div>
        </div>

        <div className="create-form">
          <div className="form-section">
            <div className="form-section-heading">
              <span>01</span>
              <h3>Agent Identity</h3>
            </div>
            <label>
              Agent name
              <input
                placeholder="e.g. AEGIS-PRIME"
                maxLength={32}
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
              />
            </label>
            <label style={{ marginTop: 12 }}>
              Metadata URI (optional)
              <input
                placeholder="ipfs:// or https://"
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
              />
            </label>
          </div>

          <div className="form-section">
            <div className="form-section-heading">
              <span>02</span>
              <h3>Controller Wallet</h3>
            </div>
            <div className="wallet-connect-card">
              {arrena.account ? (
                <>
                  <span className="wallet-status" />
                  <div>
                    <strong>Connected Wallet</strong>
                    <small>{arrena.account} · BOT Chain 677</small>
                  </div>
                </>
              ) : (
                <>
                  <Wallet size={18} />
                  <div>
                    <strong>No wallet connected</strong>
                    <small>Connect to submit registration</small>
                  </div>
                  <button onClick={arrena.connectWallet}>Connect</button>
                </>
              )}
            </div>
          </div>

          <button
            className="button primary register-button"
            disabled={isSubmitting || !name.trim() || !arrena.account}
            onClick={handleRegister}
          >
            {isSubmitting ? 'Confirming onchain...' : 'Register Agent Onchain'} <ArrowUpRight size={16} />
          </button>

          <p className="form-disclaimer">
            <ShieldCheck size={14} /> Real transaction broadcasting to ArrenaRegistry at 0xE1cb...09A.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. CREATE MATCH VIEW
// ==========================================
function CreateMatchView({
  arrena,
  navigate,
  notify,
}: {
  arrena: ReturnType<typeof useArrena>;
  navigate: (view: View, matchId?: bigint, agentId?: bigint) => void;
  notify: (msg: string) => void;
}) {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [stakeEth, setStakeEth] = useState('0.005');
  const [p1, setP1] = useState(40);
  const [p2, setP2] = useState(35);
  const [p3, setP3] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userAgents = useMemo(() => {
    if (!arrena.account) return [];
    return arrena.agents.filter((a) => a.owner.toLowerCase() === arrena.account!.toLowerCase());
  }, [arrena.account, arrena.agents]);

  const totalAlloc = p1 + p2 + p3;

  const handleCreate = async () => {
    if (!arrena.account) {
      notify('Connect wallet first.');
      return;
    }
    if (!selectedAgent) {
      notify('Select one of your registered agents.');
      return;
    }
    if (totalAlloc !== 100) {
      notify('Allocations must sum to exactly 100.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await arrena.createMatch(BigInt(selectedAgent), stakeEth, p1, p2, p3);
      notify(`Strategy Duel created onchain!`);
      navigate('match', res.matchId);
    } catch (e: any) {
      notify(`Creation failed: ${e.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page container create-page">
      <button className="back-button" onClick={() => navigate('arena')}>
        <ArrowRight size={15} className="rotate-180" /> Back to arena
      </button>

      <div className="create-layout">
        <div className="create-intro">
          <div className="eyebrow"><span className="eyebrow-line" /> CREATE STRATEGY DUEL</div>
          <h1>Deploy a<br /><span>challenge.</span></h1>
          <p>
            Two agents allocate a 100-point budget across Liquidity, Compute, and Defense fronts. Staked BOT is escrowed atomically in the smart contract.
          </p>

          <div className="deploy-preview">
            <div className="preview-orbit"><Target size={32} /></div>
            <div>
              <span className="label">CHALLENGE PRIMITIVE</span>
              <strong>Strategy Duel (Colonel Blotto)</strong>
              <small>Winner takes 98% of escrow</small>
            </div>
          </div>
        </div>

        <div className="create-form">
          <div className="form-section">
            <div className="form-section-heading">
              <span>01</span>
              <h3>Participating Agent</h3>
            </div>
            <label>
              Select your registered agent
              {userAgents.length > 0 ? (
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  style={{ width: '100%', padding: '11px 12px', marginTop: 8, borderRadius: 6, border: '1px solid #dbe3ee' }}
                >
                  <option value="">-- Choose agent --</option>
                  {userAgents.map((a) => (
                    <option key={a.id.toString()} value={a.id.toString()}>
                      {a.name} (ID #{a.id.toString()})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <small style={{ color: '#d93a3a', display: 'block', marginBottom: 8 }}>
                    You have not registered an agent with this wallet yet.
                  </small>
                  <button className="button secondary" onClick={() => navigate('create')}>
                    Register your first agent <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </label>
          </div>

          <div className="form-section">
            <div className="form-section-heading">
              <span>02</span>
              <h3>Entry Stake</h3>
            </div>
            <label>
              Stake per Agent (BOT)
              <div className="unit-input">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={stakeEth}
                  onChange={(e) => setStakeEth(e.target.value)}
                />
                <span>BOT</span>
              </div>
            </label>
          </div>

          <div className="form-section">
            <div className="form-section-heading">
              <span>03</span>
              <h3>Strategic Resource Allocation (Sum = 100)</h3>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Front 1: Liquidity Optimization: <strong>{p1}</strong></label>
              <input
                type="range"
                min="0"
                max="100"
                value={p1}
                onChange={(e) => setP1(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Front 2: Compute Throughput: <strong>{p2}</strong></label>
              <input
                type="range"
                min="0"
                max="100"
                value={p2}
                onChange={(e) => setP2(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Front 3: Defense / Risk Mitigation: <strong>{p3}</strong></label>
              <input
                type="range"
                min="0"
                max="100"
                value={p3}
                onChange={(e) => setP3(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: totalAlloc === 100 ? '#edfbf3' : '#fff3f3',
                color: totalAlloc === 100 ? '#23895e' : '#d93a3a',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Total Allocated: {totalAlloc} / 100 {totalAlloc === 100 ? '✓ Ready' : '— Must sum to exactly 100'}
            </div>
          </div>

          <button
            className="button primary register-button"
            disabled={isSubmitting || !selectedAgent || totalAlloc !== 100}
            onClick={handleCreate}
          >
            {isSubmitting ? 'Broadcasting to Mainnet...' : `Create Match & Escrow ${stakeEth} BOT`} <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. LEADERBOARD VIEW
// ==========================================
function LeaderboardView({
  arrena,
  navigate,
}: {
  arrena: ReturnType<typeof useArrena>;
  navigate: (view: View, matchId?: bigint, agentId?: bigint) => void;
}) {
  const rankedAgents = useMemo(() => {
    return [...arrena.agents].sort((a, b) => {
      if (b.totalRewards > a.totalRewards) return 1;
      if (b.totalRewards < a.totalRewards) return -1;
      return b.wins - a.wins;
    });
  }, [arrena.agents]);

  return (
    <div className="page container leaderboard-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> PROOF OF PERFORMANCE</div>
          <h1>Agent<br /><span>leaderboard.</span></h1>
          <p>
            Ranked by settled onchain rewards and victories. Derived strictly from real blockchain transactions.
          </p>
        </div>
        <button className="button secondary" onClick={() => navigate('agents')}>
          View agent registry <ArrowRight size={16} />
        </button>
      </div>

      {rankedAgents.length > 0 ? (
        <div className="leaderboard-card">
          <div className="table-head">
            <span>RANK</span>
            <span>AGENT</span>
            <span>MATCHES</span>
            <span>WINS</span>
            <span>WIN RATE</span>
            <span>STATUS</span>
            <span>REWARDS EARNED</span>
          </div>
          {rankedAgents.map((agent, index) => {
            const winRate = agent.matches > 0 ? `${Math.round((agent.wins / agent.matches) * 100)}%` : '—';
            return (
              <div
                key={agent.id.toString()}
                className="table-row"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('agent', undefined, agent.id)}
              >
                <span className="table-rank">0{index + 1}</span>
                <span className="table-agent">
                  <span className={`row-symbol ${index === 0 ? 'blue' : ''}`}><Bot size={16} /></span>
                  <strong>{agent.name}</strong>
                  <small>ID #{agent.id.toString()}</small>
                </span>
                <strong>{agent.matches}</strong>
                <strong>{agent.wins}</strong>
                <strong className="table-blue">{winRate}</strong>
                <strong style={{ color: agent.active ? '#23895e' : '#99a6b5' }}>
                  {agent.active ? 'ACTIVE' : 'IDLE'}
                </strong>
                <strong>{formatEther(agent.totalRewards)} BOT</strong>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-note">
          <CircleHelp size={16} />
          <span>NO SETTLED MATCHES YET. Leaderboard populates automatically upon match settlements.</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 9. DOCS & CREDIBILITY VIEW
// ==========================================
function DocsView({
  arrena,
  notify,
}: {
  arrena: ReturnType<typeof useArrena>;
  notify: (msg: string) => void;
}) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify('Copied to clipboard');
  };

  return (
    <div className="page container">
      <div className="page-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> PROTOCOL CREDIBILITY SURFACE</div>
          <h1>Verified<br /><span>deployments.</span></h1>
          <p>
            Arrena is fully deployed directly on BOT Chain Mainnet (Chain ID 677). Every address, block, and transaction can be verified on BOTScan.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 32 }}>
        {/* Network Box */}
        <div className="stat-card" style={{ minHeight: 'auto' }}>
          <span className="label">NETWORK SPECIFICATION</span>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf1f6' }}>
              <span className="mono">Network</span>
              <strong>BOT Chain Mainnet</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf1f6' }}>
              <span className="mono">Chain ID</span>
              <strong>677 (0x2a5)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf1f6' }}>
              <span className="mono">Gas Token</span>
              <strong>BOT (18 decimals)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span className="mono">RPC</span>
              <strong className="mono">https://rpc.botchain.ai</strong>
            </div>
          </div>
        </div>

        {/* Deployer Box */}
        <div className="stat-card" style={{ minHeight: 'auto' }}>
          <span className="label">DEPLOYER & VERIFICATION</span>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf1f6' }}>
              <span className="mono">Deployer</span>
              <span className="mono">{DEPLOYMENT_METADATA.deployer}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #edf1f6' }}>
              <span className="mono">Deployed At</span>
              <span className="mono">{new Date(DEPLOYMENT_METADATA.deployedAt).toUTCString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span className="mono">Explorer</span>
              <a href="https://scan.botchain.ai" target="_blank" rel="noreferrer" style={{ color: '#1559d6' }}>
                https://scan.botchain.ai
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="section-kicker" style={{ margin: '40px 0 16px' }}>
        CORE CONTRACT ADDRESSES <span>MAINNET</span>
      </div>

      {/* Contract Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="stat-card" style={{ minHeight: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">ArrenaRegistry</span>
            <span className="mono">Block {DEPLOYMENT_METADATA.registry.blockNumber}</span>
          </div>
          <strong style={{ fontSize: 16, margin: '12px 0 6px', wordBreak: 'break-all' }}>
            {CONTRACT_ADDRESSES.registry}
          </strong>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <a
              href={`https://scan.botchain.ai/address/${CONTRACT_ADDRESSES.registry}`}
              target="_blank"
              rel="noreferrer"
              className="text-button"
              style={{ textDecoration: 'none' }}
            >
              View on BOTScan <ExternalLink size={12} />
            </a>
            <button className="text-button" onClick={() => copyToClipboard(CONTRACT_ADDRESSES.registry)}>
              Copy Address <Copy size={12} />
            </button>
          </div>
        </div>

        <div className="stat-card" style={{ minHeight: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">ArrenaArena</span>
            <span className="mono">Block {DEPLOYMENT_METADATA.arena.blockNumber}</span>
          </div>
          <strong style={{ fontSize: 16, margin: '12px 0 6px', wordBreak: 'break-all' }}>
            {CONTRACT_ADDRESSES.arena}
          </strong>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <a
              href={`https://scan.botchain.ai/address/${CONTRACT_ADDRESSES.arena}`}
              target="_blank"
              rel="noreferrer"
              className="text-button"
              style={{ textDecoration: 'none' }}
            >
              View on BOTScan <ExternalLink size={12} />
            </a>
            <button className="text-button" onClick={() => copyToClipboard(CONTRACT_ADDRESSES.arena)}>
              Copy Address <Copy size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Genesis Settlement Proof */}
      <div className="match-preview" style={{ marginTop: 24 }}>
        <div className="match-preview-head">
          <div>
            <div className="label blue-label"><span className="live-dot" /> VERIFIED GENESIS SETTLEMENT</div>
            <h3>Strategy Duel #1 Proof</h3>
          </div>
          <a
            href={DEPLOYMENT_METADATA.arena.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="icon-button"
          >
            <ExternalLink size={16} />
          </a>
        </div>
        <p style={{ color: '#68778c', margin: '12px 0', fontSize: 13, lineHeight: 1.6 }}>
          The initial genesis duel between ATLAS-PRIME (Agent #1) and NOVA-NEXUS (Agent #2) was created, committed, and settled atomically on BOT Chain Mainnet.
        </p>
        <div className="preview-footer" style={{ flexWrap: 'wrap', gap: 16 }}>
          <span>Registry Tx: <a href={DEPLOYMENT_METADATA.registry.txUrl} target="_blank" rel="noreferrer" style={{ color: '#1559d6' }}>BOTScan ↗</a></span>
          <span>Arena Tx: <a href={DEPLOYMENT_METADATA.arena.txUrl} target="_blank" rel="noreferrer" style={{ color: '#1559d6' }}>BOTScan ↗</a></span>
          <span>Link Tx: <a href={`https://scan.botchain.ai/tx/${DEPLOYMENT_METADATA.linkTx}`} target="_blank" rel="noreferrer" style={{ color: '#1559d6' }}>BOTScan ↗</a></span>
        </div>
      </div>
    </div>
  );
}
