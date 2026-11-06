import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import {
  Users, CheckSquare, Play, BarChart3, Plus, Trash2, Edit3, ShieldAlert,
  RotateCw, Award, Sparkles, RefreshCw, AlertTriangle, Check, X,
  Trophy, Flame, Sliders, ArrowLeftRight, Info, Lock,
  Maximize2, Minimize2, Calendar, Clock, UserMinus
} from 'lucide-react';

const ROLES = ['Passeur', 'R4', 'Central', 'Pointu', 'Libéro', 'Polyvalent'];

const ROLE_COLORS = {
  'Passeur': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'R4': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'Central': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'Pointu': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  'Libéro': 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  'Polyvalent': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
};

const DEFAULT_ROSTER = [
  { id: 'p1', name: 'Thomas (Cap)', gender: 'M', level: 5, roles: ['Passeur'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 8, historySets: 24 },
  { id: 'p2', name: 'Julie', gender: 'F', level: 4, roles: ['Passeur', 'Polyvalent'], isTitulaire: false, isCorpo: false, incompatibilities: [], historyMatches: 8, historySets: 14 },
  { id: 'p3', name: 'Marc', gender: 'M', level: 4, roles: ['R4', 'Pointu'], isTitulaire: true, isCorpo: false, incompatibilities: ['p9'], historyMatches: 7, historySets: 21 },
  { id: 'p4', name: 'Sophie', gender: 'F', level: 4, roles: ['R4'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 8, historySets: 22 },
  { id: 'p5', name: 'Lucas', gender: 'M', level: 3, roles: ['R4', 'Polyvalent'], isTitulaire: false, isCorpo: false, incompatibilities: [], historyMatches: 6, historySets: 11 },
  { id: 'p6', name: 'Karim', gender: 'M', level: 5, roles: ['Central'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 8, historySets: 25 },
  { id: 'p7', name: 'Chloé', gender: 'F', level: 3, roles: ['Central', 'Polyvalent'], isTitulaire: false, isCorpo: false, incompatibilities: [], historyMatches: 7, historySets: 12 },
  { id: 'p8', name: 'Antoine', gender: 'M', level: 4, roles: ['Pointu', 'Central'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 6, historySets: 18 },
  { id: 'p9', name: 'David (Corpo)', gender: 'M', level: 2, roles: ['Polyvalent', 'R4'], isTitulaire: false, isCorpo: true, incompatibilities: ['p3'], historyMatches: 5, historySets: 6 },
  { id: 'p10', name: 'Léa', gender: 'F', level: 4, roles: ['Libéro', 'R4'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 8, historySets: 12.5 },
];

const DEFAULT_MATCH_HISTORY = [
  {
    id: 'm_demo_1',
    date: '2025-02-15T20:30:00.000Z',
    teamName: 'AS Volley Pro',
    opponentName: 'VC Rivière',
    ourSets: 3,
    theirSets: 1,
    mode: 'Loisir',
    setsHistory: [
      { setNumber: 1, ourScore: 25, theirScore: 21, winner: 'us' },
      { setNumber: 2, ourScore: 22, theirScore: 25, winner: 'them' },
      { setNumber: 3, ourScore: 25, theirScore: 18, winner: 'us' },
      { setNumber: 4, ourScore: 25, theirScore: 23, winner: 'us' }
    ]
  }
];

const formatSets = (val) => {
  const num = Number(val || 0);
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(1).replace('.', ',');
};

const formatDateFr = (isoString) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return isoString;
  }
};

function getHistoricalRatio(player) {
  if (!player.historyMatches || player.historyMatches <= 0) return 0;
  return Number(player.historySets || 0) / Number(player.historyMatches);
}

function getStatusRank(player) {
  if (player.isCorpo) return 3;
  if (player.isTitulaire) return 1;
  return 2;
}

function comparePlayersForEquity(a, b, matchSetsMap, isTieBreak) {
  if (isTieBreak) {
    if (b.level !== a.level) return b.level - a.level;
  }
  const setsA = Number(matchSetsMap[a.id] || 0);
  const setsB = Number(matchSetsMap[b.id] || 0);
  if (setsA !== setsB) return setsA - setsB;

  const ratioA = getHistoricalRatio(a);
  const ratioB = getHistoricalRatio(b);
  if (Math.abs(ratioA - ratioB) > 0.001) return ratioA - ratioB;

  const statusA = getStatusRank(a);
  const statusB = getStatusRank(b);
  if (statusA !== statusB) return statusA - statusB;

  return b.level - a.level;
}

function areCompatible(player1, player2) {
  if (!player1 || !player2) return true;
  const inc1 = player1.incompatibilities || [];
  const inc2 = player2.incompatibilities || [];
  return !inc1.includes(player2.id) && !inc2.includes(player1.id);
}

function isGroupCompatible(playersList) {
  for (let i = 0; i < playersList.length; i++) {
    for (let j = i + 1; j < playersList.length; j++) {
      if (!areCompatible(playersList[i], playersList[j])) return false;
    }
  }
  return true;
}

function generateOptimalLineup({
  presentPlayers,
  setterSystem = 1,
  mode = 'Loisir',
  setNumber = 1,
  matchSetsMap = {},
  lockedLiberoId = 'AUTO'
}) {
  const isTieBreak = setNumber === 5;
  const warnings = [];
  const explanations = [];

  if (presentPlayers.length < 6) {
    return {
      court: [],
      libero: null,
      bench: presentPlayers,
      warnings: [`Effectif insuffisant : seulement ${presentPlayers.length} joueur(s) présent(s) pour 6 postes.`],
      explanations: []
    };
  }

  let selectedLibero = null;
  if (lockedLiberoId === 'NONE') {
    selectedLibero = null;
  } else if (lockedLiberoId && lockedLiberoId !== 'AUTO') {
    selectedLibero = presentPlayers.find(p => p.id === lockedLiberoId) || null;
  } else if (lockedLiberoId === 'AUTO' && presentPlayers.length >= 7) {
    const sortedForLibero = [...presentPlayers].sort((a, b) =>
      comparePlayersForEquity(a, b, matchSetsMap, isTieBreak)
    );
    selectedLibero = sortedForLibero.find(p => p.roles.includes('Libéro')) ||
                     sortedForLibero.find(p => p.roles.includes('Polyvalent')) ||
                     null;
  }

  const candidateCourtPlayers = selectedLibero
    ? presentPlayers.filter(p => p.id !== selectedLibero.id)
    : [...presentPlayers];

  const sortedCandidates = [...candidateCourtPlayers].sort((a, b) =>
    comparePlayersForEquity(a, b, matchSetsMap, isTieBreak)
  );

  const requiredSlots = setterSystem === 1
    ? [
        { pos: 'P1', targetRole: 'Passeur', label: 'Passeur' },
        { pos: 'P2', targetRole: 'R4', label: 'R4 (1)' },
        { pos: 'P3', targetRole: 'Central', label: 'Central (1)' },
        { pos: 'P4', targetRole: 'Pointu', label: 'Pointu' },
        { pos: 'P5', targetRole: 'R4', label: 'R4 (2)' },
        { pos: 'P6', targetRole: 'Central', label: 'Central (2)' },
      ]
    : [
        { pos: 'P1', targetRole: 'Passeur', label: 'Passeur (1)' },
        { pos: 'P2', targetRole: 'R4', label: 'R4 (1)' },
        { pos: 'P3', targetRole: 'Central', label: 'Central (1)' },
        { pos: 'P4', targetRole: 'Passeur', label: 'Passeur (2)' },
        { pos: 'P5', targetRole: 'R4', label: 'R4 (2)' },
        { pos: 'P6', targetRole: 'Central', label: 'Central (2)' },
      ];

  const hasFemalesPresent = candidateCourtPlayers.some(p => p.gender === 'F');
  const requireFemaleOnCourt = mode === 'Loisir' && hasFemalesPresent;

  function canPlayRole(player, role, allowFallback = false) {
    if (player.roles.includes(role)) return { ok: true, matchType: 'Spécialiste' };
    if (player.roles.includes('Polyvalent')) return { ok: true, matchType: 'Polyvalent' };
    if (allowFallback) return { ok: true, matchType: 'Dépannage' };
    return { ok: false, matchType: null };
  }

  function solveSlots(allowDepannage) {
    let bestSolution = null;

    function backtrack(slotIdx, currentAssignments, usedIds) {
      if (bestSolution) return;

      if (slotIdx === requiredSlots.length) {
        const chosenPlayers = currentAssignments.map(a => a.player);
        if (requireFemaleOnCourt && !chosenPlayers.some(p => p.gender === 'F')) {
          return;
        }
        bestSolution = currentAssignments;
        return;
      }

      const slot = requiredSlots[slotIdx];
      const tiers = ['Spécialiste', 'Polyvalent'];
      if (allowDepannage) tiers.push('Dépannage');

      for (const tier of tiers) {
        for (const candidate of sortedCandidates) {
          if (usedIds.has(candidate.id)) continue;

          const roleCheck = canPlayRole(candidate, slot.targetRole, allowDepannage);
          if (!roleCheck.ok || roleCheck.matchType !== tier) continue;

          const compatibleWithCourt = currentAssignments.every(a => areCompatible(a.player, candidate));
          if (!compatibleWithCourt) continue;
          if (selectedLibero && !areCompatible(selectedLibero, candidate)) continue;

          usedIds.add(candidate.id);
          currentAssignments.push({
            ...slot,
            player: candidate,
            matchType: tier
          });

          backtrack(slotIdx + 1, currentAssignments, usedIds);
          if (bestSolution) return;

          currentAssignments.pop();
          usedIds.delete(candidate.id);
        }
      }
    }

    backtrack(0, [], new Set());
    return bestSolution;
  }

  let solution = solveSlots(false);
  if (!solution) {
    solution = solveSlots(true);
    if (solution) {
      warnings.push("Certains postes ont été attribués en dépannage (spécialistes ou polyvalents indisponibles).");
    }
  }

  if (!solution) {
    warnings.push("Contraintes strictes impossibles à satisfaire simultanément. Proposition de la meilleure équipe disponible.");
    const fallbackCourt = [];
    for (const candidate of sortedCandidates) {
      if (fallbackCourt.length < 6) {
        const comp = fallbackCourt.every(p => areCompatible(p.player, candidate));
        if (comp || fallbackCourt.length + (sortedCandidates.length - sortedCandidates.indexOf(candidate)) <= 6) {
          const slot = requiredSlots[fallbackCourt.length];
          fallbackCourt.push({
            ...slot,
            player: candidate,
            matchType: candidate.roles.includes(slot.targetRole) ? 'Spécialiste' : 'Adapté'
          });
        }
      }
    }
    solution = fallbackCourt;
  }

  const usedCourtIds = new Set(solution.map(s => s.player.id));
  if (selectedLibero) usedCourtIds.add(selectedLibero.id);

  const bench = presentPlayers.filter(p => !usedCourtIds.has(p.id));

  if (isTieBreak) {
    explanations.push("Set 5 (Tie-Break) : Priorité exclusive aux notes de performance (1 à 5).");
  } else {
    explanations.push("Priorité 1 : Équité du match (sets joués aujourd'hui) • Priorité 2 : Ratio Saison • Priorité 3 : Statut.");
  }
  if (selectedLibero) {
    explanations.push(`Libéro verrouillé sur le match : ${selectedLibero.name} (pondération : 1 set joué = 0,5 set comptabilisé).`);
  } else {
    explanations.push("Configuration sans Libéro : tous les remplaçants sont disponibles sur le banc.");
  }

  return {
    court: solution,
    libero: selectedLibero,
    bench,
    warnings,
    explanations
  };
}

export default function VolleyManagerPro() {
  const [activeTab, setActiveTab] = useState('roster');

  const [players, setPlayers] = useState(() => {
    try {
      const saved = localStorage.getItem('vmp_players_v3') || localStorage.getItem('vmp_players_v2');
      return saved ? JSON.parse(saved) : DEFAULT_ROSTER;
    } catch {
      return DEFAULT_ROSTER;
    }
  });

  const [matchesHistory, setMatchesHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('vmp_matches_v3');
      return saved ? JSON.parse(saved) : DEFAULT_MATCH_HISTORY;
    } catch {
      return DEFAULT_MATCH_HISTORY;
    }
  });

  const [matchState, setMatchState] = useState(() => {
    try {
      const saved = localStorage.getItem('vmp_active_match_v3') || localStorage.getItem('vmp_active_match_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          lockedLiberoId: parsed.lockedLiberoId !== undefined ? parsed.lockedLiberoId : (parsed.libero?.id || 'NONE'),
          isScoreboardReversed: parsed.isScoreboardReversed || false,
          historyRecorded: parsed.historyRecorded || false
        };
      }
    } catch {}
    return {
      isActive: false,
      teamName: 'AS Volley Pro',
      opponentName: 'Visiteurs VC',
      mode: 'Loisir',
      setterSystem: 1,
      presentIds: DEFAULT_ROSTER.map(p => p.id),
      lockedLiberoId: 'p10',
      currentSet: 1,
      ourScore: 0,
      theirScore: 0,
      ourSets: 0,
      theirSets: 0,
      setsHistory: [],
      matchSetsPlayed: {},
      court: [],
      libero: null,
      bench: [],
      algorithmNotes: [],
      algorithmWarnings: [],
      isScoreboardReversed: false,
      historyRecorded: false
    };
  });

  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [swapSelection, setSwapSelection] = useState(null);
  const [nextSetModalOpen, setNextSetModalOpen] = useState(false);
  const [pendingNextSetSystem, setPendingNextSetSystem] = useState(1);
  const [confirmSeasonResetOpen, setConfirmSeasonResetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLandscapeFullscreen, setIsLandscapeFullscreen] = useState(false);
  const [forceRotate90, setForceRotate90] = useState(false);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    try { localStorage.setItem('vmp_players_v3', JSON.stringify(players)); } catch {}
  }, [players]);

  useEffect(() => {
    try { localStorage.setItem('vmp_matches_v3', JSON.stringify(matchesHistory)); } catch {}
  }, [matchesHistory]);

  useEffect(() => {
    try { localStorage.setItem('vmp_active_match_v3', JSON.stringify(matchState)); } catch {}
  }, [matchState]);

  const presentPlayers = useMemo(() => {
    return players.filter(p => matchState.presentIds.includes(p.id));
  }, [players, matchState.presentIds]);

  const presentFemalesCount = useMemo(() => {
    return presentPlayers.filter(p => p.gender === 'F').length;
  }, [presentPlayers]);

  const handleSavePlayer = (formData) => {
    let updatedPlayers;
    if (editingPlayer) {
      updatedPlayers = players.map(p => {
        if (p.id === editingPlayer.id) {
          return { ...p, ...formData };
        }
        const shouldBeIncompatible = formData.incompatibilities.includes(p.id);
        const currentInc = new Set(p.incompatibilities || []);
        if (shouldBeIncompatible) currentInc.add(editingPlayer.id);
        else currentInc.delete(editingPlayer.id);
        return { ...p, incompatibilities: Array.from(currentInc) };
      });
      showToast(`${formData.name} mis à jour.`, 'success');
    } else {
      const newId = 'p_' + Date.now();
      const newPlayer = {
        id: newId,
        ...formData,
        historyMatches: 0,
        historySets: 0
      };
      updatedPlayers = players.map(p => {
        if (formData.incompatibilities.includes(p.id)) {
          return { ...p, incompatibilities: [...(p.incompatibilities || []), newId] };
        }
        return p;
      });
      updatedPlayers.push(newPlayer);
      showToast(`${formData.name} ajouté à l'effectif.`, 'success');
    }

    setPlayers(updatedPlayers);
    setPlayerModalOpen(false);
    setEditingPlayer(null);
  };

  const handleDeletePlayer = (playerId) => {
    const target = players.find(p => p.id === playerId);
    const updated = players
      .filter(p => p.id !== playerId)
      .map(p => ({
        ...p,
        incompatibilities: (p.incompatibilities || []).filter(id => id !== playerId)
      }));
    const updatedMatch = {
      ...matchState,
      presentIds: matchState.presentIds.filter(id => id !== playerId),
      lockedLiberoId: matchState.lockedLiberoId === playerId ? 'NONE' : matchState.lockedLiberoId
    };
    setPlayers(updated);
    setMatchState(updatedMatch);
    if (target) showToast(`${target.name} supprimé.`, 'info');
  };

  const handleResetSeason = () => {
    const resetList = players.map(p => ({
      ...p,
      historyMatches: 0,
      historySets: 0
    }));
    const resetMatch = {
      ...matchState,
      isActive: false,
      currentSet: 1,
      ourScore: 0,
      theirScore: 0,
      ourSets: 0,
      theirSets: 0,
      setsHistory: [],
      matchSetsPlayed: {},
      court: [],
      libero: null,
      bench: [],
      historyRecorded: false
    };
    setPlayers(resetList);
    setMatchesHistory([]);
    setMatchState(resetMatch);
    setConfirmSeasonResetOpen(false);
    showToast('Nouvelle saison initialisée : historiques remis à zéro.', 'success');
  };

  const togglePresence = (playerId) => {
    const isCurrentlyPresent = matchState.presentIds.includes(playerId);
    const nextPresentIds = isCurrentlyPresent
      ? matchState.presentIds.filter(id => id !== playerId)
      : [...matchState.presentIds, playerId];

    let nextLockedLibero = matchState.lockedLiberoId;
    if (
      nextLockedLibero &&
      nextLockedLibero !== 'NONE' &&
      nextLockedLibero !== 'AUTO' &&
      !nextPresentIds.includes(nextLockedLibero)
    ) {
      nextLockedLibero = 'NONE';
    }

    setMatchState({
      ...matchState,
      presentIds: nextPresentIds,
      lockedLiberoId: nextLockedLibero
    });
  };

  const handleStartNewMatch = () => {
    if (presentPlayers.length < 6) {
      showToast('Sélectionnez au moins 6 joueurs présents pour démarrer le match.', 'error');
      return;
    }

    const updatedPlayers = players.map(p => {
      if (matchState.presentIds.includes(p.id)) {
        return { ...p, historyMatches: (p.historyMatches || 0) + 1 };
      }
      return p;
    });

    const initialSetsPlayed = {};
    matchState.presentIds.forEach(id => { initialSetsPlayed[id] = 0; });

    let selectionMode = matchState.lockedLiberoId || 'NONE';
    if (
      selectionMode !== 'NONE' &&
      selectionMode !== 'AUTO' &&
      !matchState.presentIds.includes(selectionMode)
    ) {
      selectionMode = 'NONE';
    }

    const lineup = generateOptimalLineup({
      presentPlayers: updatedPlayers.filter(p => matchState.presentIds.includes(p.id)),
      setterSystem: matchState.setterSystem,
      mode: matchState.mode,
      setNumber: 1,
      matchSetsMap: initialSetsPlayed,
      lockedLiberoId: selectionMode
    });

    const effectiveLockedLiberoId = lineup.libero ? lineup.libero.id : 'NONE';

    const newMatchState = {
      ...matchState,
      isActive: true,
      lockedLiberoId: effectiveLockedLiberoId,
      currentSet: 1,
      ourScore: 0,
      theirScore: 0,
      ourSets: 0,
      theirSets: 0,
      setsHistory: [],
      matchSetsPlayed: initialSetsPlayed,
      court: lineup.court,
      libero: lineup.libero,
      bench: lineup.bench,
      algorithmNotes: lineup.explanations,
      algorithmWarnings: lineup.warnings,
      historyRecorded: false
    };

    setPlayers(updatedPlayers);
    setMatchState(newMatchState);
    setActiveTab('live');
    showToast(
      lineup.libero
        ? `Match lancé ! Libéro verrouillé : ${lineup.libero.name}.`
        : 'Match lancé sans Libéro ! Composition du Set 1 générée.',
      'success'
    );
  };

  const handleRemoveLibero = () => {
    if (!matchState.libero) return;
    const removedLibero = matchState.libero;
    const alreadyOnBench = matchState.bench.some(p => p.id === removedLibero.id);
    const updatedBench = alreadyOnBench
      ? matchState.bench
      : [...matchState.bench, removedLibero];

    const updatedNotes = [
      ...matchState.algorithmNotes.filter(n => !n.startsWith('Libéro verrouillé')),
      `Libéro retiré en cours de match : ${removedLibero.name} est désormais disponible sur le banc.`
    ];

    setSwapSelection(null);
    setMatchState({
      ...matchState,
      lockedLiberoId: 'NONE',
      libero: null,
      bench: updatedBench,
      algorithmNotes: updatedNotes
    });
    showToast(`${removedLibero.name} retiré du poste de Libéro et placé sur le banc.`, 'info');
  };

  const rotateCourtClockwise = () => {
    if (!matchState.court || matchState.court.length !== 6) return;
    const byPos = {};
    matchState.court.forEach(item => { byPos[item.pos] = item; });

    const rotated = [
      { ...byPos['P1'], player: byPos['P2'].player, matchType: byPos['P2'].matchType },
      { ...byPos['P2'], player: byPos['P3'].player, matchType: byPos['P3'].matchType },
      { ...byPos['P3'], player: byPos['P4'].player, matchType: byPos['P4'].matchType },
      { ...byPos['P4'], player: byPos['P5'].player, matchType: byPos['P5'].matchType },
      { ...byPos['P5'], player: byPos['P6'].player, matchType: byPos['P6'].matchType },
      { ...byPos['P6'], player: byPos['P1'].player, matchType: byPos['P1'].matchType },
    ];

    setMatchState({ ...matchState, court: rotated });
    showToast('Rotation horaire effectuée.', 'info');
  };

  const handlePlayerSlotTap = (zone, indexOrId) => {
    if (zone === 'libero') {
      showToast('Le Libéro actif ne peut pas occuper un autre poste (utilisez "Retirer" pour jouer sans Libéro).', 'error');
      return;
    }

    if (!swapSelection) {
      setSwapSelection({ zone, indexOrId });
      return;
    }

    if (swapSelection.zone === zone && swapSelection.indexOrId === indexOrId) {
      setSwapSelection(null);
      return;
    }

    let nextCourt = [...matchState.court];
    let nextBench = [...matchState.bench];
    const currentLibero = matchState.libero;

    const getPlayerFromRef = (ref) => {
      if (ref.zone === 'court') return nextCourt[ref.indexOrId].player;
      if (ref.zone === 'bench') return nextBench.find(p => p.id === ref.indexOrId);
      return null;
    };

    const pA = getPlayerFromRef(swapSelection);
    const pB = getPlayerFromRef({ zone, indexOrId });

    if (!pA || !pB) {
      setSwapSelection(null);
      return;
    }

    if (currentLibero && (pA.id === currentLibero.id || pB.id === currentLibero.id)) {
      showToast('Action refusée : le Libéro actif ne peut pas occuper un autre poste.', 'error');
      setSwapSelection(null);
      return;
    }

    const assignPlayerToRef = (ref, newPlayer) => {
      if (ref.zone === 'court') {
        const slot = nextCourt[ref.indexOrId];
        const isSpec = newPlayer.roles.includes(slot.targetRole);
        const isPoly = newPlayer.roles.includes('Polyvalent');
        nextCourt[ref.indexOrId] = {
          ...slot,
          player: newPlayer,
          matchType: isSpec ? 'Spécialiste' : isPoly ? 'Polyvalent' : 'Manuel'
        };
      } else if (ref.zone === 'bench') {
        nextBench = nextBench.map(p => (p.id === ref.indexOrId ? newPlayer : p));
      }
    };

    assignPlayerToRef(swapSelection, pB);
    assignPlayerToRef({ zone, indexOrId }, pA);

    const activeGroup = [...nextCourt.map(c => c.player), ...(currentLibero ? [currentLibero] : [])];
    if (!isGroupCompatible(activeGroup)) {
      showToast('Échange refusé : incompatibilité relationnelle ou technique détectée !', 'error');
      setSwapSelection(null);
      return;
    }

    if (matchState.mode === 'Loisir' && presentFemalesCount > 0) {
      const hasFemaleOnCourt = nextCourt.some(c => c.player.gender === 'F');
      if (!hasFemaleOnCourt) {
        showToast('Échange refusé : au moins 1 femme doit rester sur le terrain en mode Loisir !', 'error');
        setSwapSelection(null);
        return;
      }
    }

    setMatchState({
      ...matchState,
      court: nextCourt,
      bench: nextBench
    });
    setSwapSelection(null);
    showToast(`Échange effectué : ${pA.name} ⇄ ${pB.name}`, 'success');
  };

  const isSetScoreValidToFinish = () => {
    const target = matchState.currentSet === 5 ? 15 : 25;
    const { ourScore, theirScore } = matchState;
    const maxScore = Math.max(ourScore, theirScore);
    const diff = Math.abs(ourScore - theirScore);
    return maxScore >= target && diff >= 2;
  };

  const handleOpenValidateSetModal = () => {
    if (!isSetScoreValidToFinish()) {
      const target = matchState.currentSet === 5 ? 15 : 25;
      showToast(`Score réglementaire non atteint (${target} pts min avec 2 pts d'écart).`, 'error');
      return;
    }
    setPendingNextSetSystem(matchState.setterSystem);
    setNextSetModalOpen(true);
  };

  const handleConfirmValidateSet = () => {
    const ourWon = matchState.ourScore > matchState.theirScore;
    const nextOurSets = matchState.ourSets + (ourWon ? 1 : 0);
    const nextTheirSets = matchState.theirSets + (ourWon ? 0 : 1);

    const courtPlayerIds = new Set(matchState.court.map(c => c.player.id));
    const activeLiberoId = matchState.libero ? matchState.libero.id : null;

    const updatedMatchSetsPlayed = { ...matchState.matchSetsPlayed };
    courtPlayerIds.forEach(id => {
      updatedMatchSetsPlayed[id] = Number(updatedMatchSetsPlayed[id] || 0) + 1;
    });
    if (activeLiberoId) {
      updatedMatchSetsPlayed[activeLiberoId] = Number(updatedMatchSetsPlayed[activeLiberoId] || 0) + 0.5;
    }

    const updatedPlayers = players.map(p => {
      if (courtPlayerIds.has(p.id)) {
        return { ...p, historySets: Number(p.historySets || 0) + 1 };
      }
      if (activeLiberoId && p.id === activeLiberoId) {
        return { ...p, historySets: Number(p.historySets || 0) + 0.5 };
      }
      return p;
    });

    const newSetRecord = {
      setNumber: matchState.currentSet,
      ourScore: matchState.ourScore,
      theirScore: matchState.theirScore,
      winner: ourWon ? 'us' : 'them',
      lineupNames: matchState.court.map(c => c.player.name),
      liberoName: matchState.libero ? matchState.libero.name : null
    };

    const updatedSetsHistory = [...matchState.setsHistory, newSetRecord];
    const matchIsOver = nextOurSets === 3 || nextTheirSets === 3;

    if (matchIsOver) {
      const newMatchRecord = {
        id: 'match_' + Date.now(),
        date: new Date().toISOString(),
        teamName: matchState.teamName,
        opponentName: matchState.opponentName,
        ourSets: nextOurSets,
        theirSets: nextTheirSets,
        mode: matchState.mode,
        setsHistory: updatedSetsHistory
      };
      const nextMatchesHistory = [newMatchRecord, ...matchesHistory];

      const finishedMatchState = {
        ...matchState,
        ourSets: nextOurSets,
        theirSets: nextTheirSets,
        setsHistory: updatedSetsHistory,
        matchSetsPlayed: updatedMatchSetsPlayed,
        historyRecorded: true
      };

      setPlayers(updatedPlayers);
      setMatchesHistory(nextMatchesHistory);
      setMatchState(finishedMatchState);
      setNextSetModalOpen(false);
      setIsLandscapeFullscreen(false);
      showToast(
        nextOurSets === 3
          ? `Victoire ${nextOurSets}-${nextTheirSets} enregistrée dans l'historique !`
          : `Fin du match (${nextOurSets}-${nextTheirSets}) enregistrée dans l'historique.`,
        'success'
      );
      return;
    }

    const nextSetNumber = matchState.currentSet + 1;
    const updatedPresentPlayers = updatedPlayers.filter(p => matchState.presentIds.includes(p.id));
    const nextLockedLiberoSetting = activeLiberoId ? activeLiberoId : 'NONE';

    const nextLineup = generateOptimalLineup({
      presentPlayers: updatedPresentPlayers,
      setterSystem: pendingNextSetSystem,
      mode: matchState.mode,
      setNumber: nextSetNumber,
      matchSetsMap: updatedMatchSetsPlayed,
      lockedLiberoId: nextLockedLiberoSetting
    });

    const nextMatchState = {
      ...matchState,
      setterSystem: pendingNextSetSystem,
      lockedLiberoId: nextLockedLiberoSetting,
      currentSet: nextSetNumber,
      ourScore: 0,
      theirScore: 0,
      ourSets: nextOurSets,
      theirSets: nextTheirSets,
      setsHistory: updatedSetsHistory,
      matchSetsPlayed: updatedMatchSetsPlayed,
      court: nextLineup.court,
      libero: nextLineup.libero,
      bench: nextLineup.bench,
      algorithmNotes: nextLineup.explanations,
      algorithmWarnings: nextLineup.warnings
    };

    setPlayers(updatedPlayers);
    setMatchState(nextMatchState);
    setNextSetModalOpen(false);
    showToast(
      nextSetNumber === 5
        ? 'Set 5 (Tie-Break) : Meilleure équipe alignée !'
        : `Set ${nextSetNumber} prêt : Composition rééquilibrée.`,
      'success'
    );
  };

  const handleSaveMatchManuallyToHistory = () => {
    if (matchState.setsHistory.length === 0) {
      showToast('Aucun set terminé à enregistrer.', 'error');
      return;
    }
    if (matchState.historyRecorded) {
      showToast('Ce match est déjà enregistré dans l’historique.', 'info');
      return;
    }
    const newMatchRecord = {
      id: 'match_' + Date.now(),
      date: new Date().toISOString(),
      teamName: matchState.teamName,
      opponentName: matchState.opponentName,
      ourSets: matchState.ourSets,
      theirSets: matchState.theirSets,
      mode: matchState.mode,
      setsHistory: matchState.setsHistory
    };
    const nextMatchesHistory = [newMatchRecord, ...matchesHistory];
    setMatchesHistory(nextMatchesHistory);
    setMatchState({ ...matchState, historyRecorded: true });
    showToast('Match enregistré dans l’historique !', 'success');
  };

  const toggleReverseScoreboard = () => {
    setMatchState({
      ...matchState,
      isScoreboardReversed: !matchState.isScoreboardReversed
    });
  };

  const matchFinished = matchState.ourSets === 3 || matchState.theirSets === 3;
  const targetPoints = matchState.currentSet === 5 ? 15 : 25;

  const leftSide = matchState.isScoreboardReversed
    ? {
        isUs: false,
        name: matchState.opponentName,
        score: matchState.theirScore,
        sets: matchState.theirSets,
        colorClass: 'text-rose-400',
        btnPlusClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20',
        onIncrement: () => setMatchState({ ...matchState, theirScore: matchState.theirScore + 1 }),
        onDecrement: () => setMatchState({ ...matchState, theirScore: Math.max(0, matchState.theirScore - 1) })
      }
    : {
        isUs: true,
        name: matchState.teamName,
        score: matchState.ourScore,
        sets: matchState.ourSets,
        colorClass: 'text-indigo-400',
        btnPlusClass: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20',
        onIncrement: () => setMatchState({ ...matchState, ourScore: matchState.ourScore + 1 }),
        onDecrement: () => setMatchState({ ...matchState, ourScore: Math.max(0, matchState.ourScore - 1) })
      };

  const rightSide = matchState.isScoreboardReversed
    ? {
        isUs: true,
        name: matchState.teamName,
        score: matchState.ourScore,
        sets: matchState.ourSets,
        colorClass: 'text-indigo-400',
        btnPlusClass: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20',
        onIncrement: () => setMatchState({ ...matchState, ourScore: matchState.ourScore + 1 }),
        onDecrement: () => setMatchState({ ...matchState, ourScore: Math.max(0, matchState.ourScore - 1) })
      }
    : {
        isUs: false,
        name: matchState.opponentName,
        score: matchState.theirScore,
        sets: matchState.theirSets,
        colorClass: 'text-rose-400',
        btnPlusClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20',
        onIncrement: () => setMatchState({ ...matchState, theirScore: matchState.theirScore + 1 }),
        onDecrement: () => setMatchState({ ...matchState, theirScore: Math.max(0, matchState.theirScore - 1) })
      };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center select-none font-sans">
      <div className="w-full max-w-md min-h-screen bg-slate-900 flex flex-col relative shadow-2xl border-x border-slate-800/80">

        <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-none">
                Volley Manager <span className="text-indigo-400">Pro</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {matchState.isActive
                  ? `En cours : Set ${matchState.currentSet} (${matchState.ourSets}-${matchState.theirSets})`
                  : `${players.length} joueurs • Mode Hors Ligne`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {matchState.mode === 'Loisir' ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                Mixité Loisir
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Classique
              </span>
            )}
          </div>
        
