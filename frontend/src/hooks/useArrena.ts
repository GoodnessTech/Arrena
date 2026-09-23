import { useState, useEffect, useCallback } from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  keccak256,
  encodePacked,
  toHex,
} from 'viem';
import {
  BOT_CHAIN,
  CONTRACT_ADDRESSES,
  REGISTRY_ABI,
  ARENA_ABI,
  DEPLOYMENT_METADATA,
} from '../config/contracts';

// Public client for read-only queries (doesn't require wallet connection)
export const publicClient = createPublicClient({
  chain: BOT_CHAIN as any,
  transport: http(BOT_CHAIN.rpcUrls.default.http[0]),
});

export interface AgentRecord {
  id: bigint;
  owner: `0x${string}`;
  wallet: `0x${string}`;
  matches: number;
  wins: number;
  totalRewards: bigint;
  createdAt: bigint;
  active: boolean;
  name: string;
  metadataURI: string;
}

export interface MatchRecord {
  matchId: bigint;
  creatorAgentId: bigint;
  opponentAgentId: bigint;
  stake: bigint;
  createdAt: bigint;
  revealDeadline: bigint;
  status: number; // 0: EMPTY, 1: OPEN, 2: COMMITTED, 3: SETTLED, 4: CANCELLED
  creatorCommit: `0x${string}`;
  opponentCommit: `0x${string}`;
  creatorAllocation: [number, number, number];
  opponentAllocation: [number, number, number];
  creatorRevealed: boolean;
  opponentRevealed: boolean;
  winnerAgentId: bigint;
  payout: bigint;
}

export function useArrena() {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTxState, setActionTxState] = useState<{
    status: 'IDLE' | 'CONFIRMING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';
    txHash?: string;
    error?: string;
  }>({ status: 'IDLE' });

  // Check connected wallet
  const checkWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
      }

      const currentChain = await ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(currentChain, 16);
      setChainId(currentChainId);
      setIsCorrectNetwork(currentChainId === BOT_CHAIN.id);
    } catch (e) {
      console.error('Failed to check wallet:', e);
    }
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('Please install MetaMask or an EIP-1193 compatible wallet to connect.');
      return;
    }
    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      }
      await switchNetwork();
    } catch (e: any) {
      console.error('Wallet connection failed:', e);
      throw e;
    }
  };

  // Switch or add BOT Chain
  const switchNetwork = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    const ethereum = (window as any).ethereum;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BOT_CHAIN.id.toString(16)}` }],
      });
      setIsCorrectNetwork(true);
      setChainId(BOT_CHAIN.id);
    } catch (switchError: any) {
      // Code 4902 means network needs to be added
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${BOT_CHAIN.id.toString(16)}`,
                chainName: BOT_CHAIN.name,
                rpcUrls: BOT_CHAIN.rpcUrls.default.http,
                nativeCurrency: BOT_CHAIN.nativeCurrency,
                blockExplorerUrls: [BOT_CHAIN.blockExplorers.default.url],
              },
            ],
          });
          setIsCorrectNetwork(true);
          setChainId(BOT_CHAIN.id);
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  };

  // Fetch live state from contracts
  const fetchState = useCallback(async () => {
    try {
      setLoading(true);

      // Read total agents
      const totalAgents = (await publicClient.readContract({
        address: CONTRACT_ADDRESSES.registry,
        abi: REGISTRY_ABI as any,
        functionName: 'totalAgents',
      })) as bigint;

      let fetchedAgents: AgentRecord[] = [];
      if (totalAgents > 0n) {
        const batch = (await publicClient.readContract({
          address: CONTRACT_ADDRESSES.registry,
          abi: REGISTRY_ABI as any,
          functionName: 'getAgents',
          args: [0n, totalAgents],
        })) as any[];

        fetchedAgents = batch.map((a: any) => ({
          id: a.id,
          owner: a.owner,
          wallet: a.wallet,
          matches: Number(a.matches),
          wins: Number(a.wins),
          totalRewards: a.totalRewards,
          createdAt: a.createdAt,
          active: a.active,
          name: a.name,
          metadataURI: a.metadataURI,
        }));
      }

      // Read total matches
      const totalMatches = (await publicClient.readContract({
        address: CONTRACT_ADDRESSES.arena,
        abi: ARENA_ABI as any,
        functionName: 'totalMatches',
      })) as bigint;

      let fetchedMatches: MatchRecord[] = [];
      if (totalMatches > 0n) {
        const batch = (await publicClient.readContract({
          address: CONTRACT_ADDRESSES.arena,
          abi: ARENA_ABI as any,
          functionName: 'getMatches',
          args: [0n, totalMatches],
        })) as any[];

        fetchedMatches = batch.map((m: any) => ({
          matchId: m.matchId,
          creatorAgentId: m.creatorAgentId,
          opponentAgentId: m.opponentAgentId,
          stake: m.stake,
          createdAt: m.createdAt,
          revealDeadline: m.revealDeadline,
          status: Number(m.status),
          creatorCommit: m.creatorCommit,
          opponentCommit: m.opponentCommit,
          creatorAllocation: [m.creatorAllocation[0], m.creatorAllocation[1], m.creatorAllocation[2]],
          opponentAllocation: [m.opponentAllocation[0], m.opponentAllocation[1], m.opponentAllocation[2]],
          creatorRevealed: m.creatorRevealed,
          opponentRevealed: m.opponentRevealed,
          winnerAgentId: m.winnerAgentId,
          payout: m.payout,
        }));
      }

      setAgents(fetchedAgents);
      setMatches(fetchedMatches);
    } catch (e) {
      console.error('Error fetching live Arrena state:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkWallet();
    fetchState();

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      const handleAccountsChanged = (accounts: string[]) => {
        setAccount(accounts.length > 0 ? (accounts[0] as `0x${string}`) : null);
      };
      const handleChainChanged = (chainHex: string) => {
        const id = parseInt(chainHex, 16);
        setChainId(id);
        setIsCorrectNetwork(id === BOT_CHAIN.id);
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [checkWallet, fetchState]);

  // --- Write Actions ---

  const getWalletClient = () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('Wallet not available');
    }
    return createWalletClient({
      chain: BOT_CHAIN as any,
      transport: custom((window as any).ethereum),
    }) as any;
  };

  // Register Agent
  const registerAgent = async (name: string, metadataURI: string = '') => {
    if (!account) throw new Error('Connect wallet first');
    if (!isCorrectNetwork) await switchNetwork();

    try {
      setActionTxState({ status: 'CONFIRMING' });
      const walletClient = getWalletClient();

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.registry,
        abi: REGISTRY_ABI as any,
        functionName: 'registerAgent',
        args: [name.toUpperCase(), metadataURI],
        account,
      });

      setActionTxState({ status: 'SUBMITTED', txHash: hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setActionTxState({ status: 'CONFIRMED', txHash: hash });

      await fetchState();
      return { hash, receipt };
    } catch (e: any) {
      setActionTxState({ status: 'FAILED', error: e.message || 'Transaction failed' });
      throw e;
    }
  };

  // Compute Commitment Hash: keccak256(abi.encodePacked(matchId, agentId, p1, p2, p3, salt))
  const computeCommitHash = (
    matchId: bigint,
    agentId: bigint,
    p1: number,
    p2: number,
    p3: number,
    saltHex: `0x${string}`
  ): `0x${string}` => {
    return keccak256(
      encodePacked(
        ['uint256', 'uint256', 'uint8', 'uint8', 'uint8', 'bytes32'],
        [matchId, agentId, p1, p2, p3, saltHex]
      )
    );
  };

  // Create Match
  const createMatch = async (
    agentId: bigint,
    stakeEth: string,
    p1: number,
    p2: number,
    p3: number
  ) => {
    if (!account) throw new Error('Connect wallet first');
    if (p1 + p2 + p3 !== 100) throw new Error('Allocations must sum to 100');

    try {
      setActionTxState({ status: 'CONFIRMING' });
      const walletClient = getWalletClient();

      // Read current matchId counter + 1
      const total = (await publicClient.readContract({
        address: CONTRACT_ADDRESSES.arena,
        abi: ARENA_ABI as any,
        functionName: 'totalMatches',
      })) as bigint;
      const expectedMatchId = total + 1n;

      // Generate random salt
      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      const saltHex = toHex(randomBytes) as `0x${string}`;

      const commitHash = computeCommitHash(expectedMatchId, agentId, p1, p2, p3, saltHex);

      // Save salt in localStorage for later reveal
      const storageKey = `arrena_salt_${expectedMatchId}_${agentId}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({ matchId: expectedMatchId.toString(), agentId: agentId.toString(), p1, p2, p3, salt: saltHex })
      );

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.arena,
        abi: ARENA_ABI as any,
        functionName: 'createMatch',
        args: [agentId, commitHash],
        value: parseEther(stakeEth),
        account,
      });

      setActionTxState({ status: 'SUBMITTED', txHash: hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setActionTxState({ status: 'CONFIRMED', txHash: hash });

      await fetchState();
      return { hash, receipt, matchId: expectedMatchId };
    } catch (e: any) {
      setActionTxState({ status: 'FAILED', error: e.message || 'Transaction failed' });
      throw e;
    }
  };

  // Join Match
  const joinMatch = async (
    matchId: bigint,
    agentId: bigint,
    stakeEth: string,
    p1: number,
    p2: number,
    p3: number
  ) => {
    if (!account) throw new Error('Connect wallet first');
    if (p1 + p2 + p3 !== 100) throw new Error('Allocations must sum to 100');

    try {
      setActionTxState({ status: 'CONFIRMING' });
      const walletClient = getWalletClient();

      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      const saltHex = toHex(randomBytes) as `0x${string}`;

      const commitHash = computeCommitHash(matchId, agentId, p1, p2, p3, saltHex);

      const storageKey = `arrena_salt_${matchId}_${agentId}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({ matchId: matchId.toString(), agentId: agentId.toString(), p1, p2, p3, salt: saltHex })
      );

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.arena,
        abi: ARENA_ABI as any,
        functionName: 'joinMatch',
        args: [matchId, agentId, commitHash],
        value: parseEther(stakeEth),
        account,
      });

      setActionTxState({ status: 'SUBMITTED', txHash: hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setActionTxState({ status: 'CONFIRMED', txHash: hash });

      await fetchState();
      return { hash, receipt };
    } catch (e: any) {
      setActionTxState({ status: 'FAILED', error: e.message || 'Transaction failed' });
      throw e;
    }
  };

  // Reveal Action
  const revealAction = async (
    matchId: bigint,
    agentId: bigint,
    p1: number,
    p2: number,
    p3: number,
    saltHex: `0x${string}`
  ) => {
    if (!account) throw new Error('Connect wallet first');

    try {
      setActionTxState({ status: 'CONFIRMING' });
      const walletClient = getWalletClient();

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.arena,
        abi: ARENA_ABI as any,
        functionName: 'revealAction',
        args: [matchId, agentId, p1, p2, p3, saltHex],
        account,
      });

      setActionTxState({ status: 'SUBMITTED', txHash: hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setActionTxState({ status: 'CONFIRMED', txHash: hash });

      await fetchState();
      return { hash, receipt };
    } catch (e: any) {
      setActionTxState({ status: 'FAILED', error: e.message || 'Transaction failed' });
      throw e;
    }
  };

  // Claim Timeout
  const claimTimeout = async (matchId: bigint) => {
    if (!account) throw new Error('Connect wallet first');

    try {
      setActionTxState({ status: 'CONFIRMING' });
      const walletClient = getWalletClient();

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.arena,
        abi: ARENA_ABI as any,
        functionName: 'claimTimeout',
        args: [matchId],
        account,
      });

      setActionTxState({ status: 'SUBMITTED', txHash: hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setActionTxState({ status: 'CONFIRMED', txHash: hash });

      await fetchState();
      return { hash, receipt };
    } catch (e: any) {
      setActionTxState({ status: 'FAILED', error: e.message || 'Transaction failed' });
      throw e;
    }
  };

  // Cancel Match
  const cancelMatch = async (matchId: bigint) => {
    if (!account) throw new Error('Connect wallet first');

    try {
      setActionTxState({ status: 'CONFIRMING' });
      const walletClient = getWalletClient();

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.arena,
        abi: ARENA_ABI as any,
        functionName: 'cancelMatch',
        args: [matchId],
        account,
      });

      setActionTxState({ status: 'SUBMITTED', txHash: hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setActionTxState({ status: 'CONFIRMED', txHash: hash });

      await fetchState();
      return { hash, receipt };
    } catch (e: any) {
      setActionTxState({ status: 'FAILED', error: e.message || 'Transaction failed' });
      throw e;
    }
  };

  return {
    account,
    chainId,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
    agents,
    matches,
    loading,
    refresh: fetchState,
    actionTxState,
    registerAgent,
    createMatch,
    joinMatch,
    revealAction,
    claimTimeout,
    cancelMatch,
    metadata: DEPLOYMENT_METADATA,
  };
}
