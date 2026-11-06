import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import {
  Users, CheckSquare, Play, BarChart3, Plus, Trash2, Edit3, ShieldAlert,
  RotateCw, Award, Sparkles, RefreshCw, AlertTriangle, Check, X,
  Trophy, Flame, Sliders, ArrowLeftRight, Info, Lock,
  Maximize2, Minimize2, Calendar, Clock
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
  lockedLiberoId = null
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
  } else if (lockedLiberoId) {
    selectedLibero = presentPlayers.find(p => p.id === lockedLiberoId) || null;
  } else if (presentPlayers.length >= 7) {
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
    explanations.push(`Libéro verrouillé : ${selectedLibero.name} (pondération : 1 set joué = 0,5 set comptabilisé).`);
  } else if (lockedLiberoId === 'NONE') {
    explanations.push("Configuration sans Libéro (Option « Aucun » activée).");
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
          lockedLiberoId: parsed.lockedLiberoId !== undefined ? parsed.lockedLiberoId : (parsed.libero?.id || null),
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
      lockedLiberoId: matchState.lockedLiberoId === playerId ? null : matchState.lockedLiberoId
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

    const nextLockedLibero =
      matchState.lockedLiberoId === 'NONE'
        ? 'NONE'
        : nextPresentIds.includes(matchState.lockedLiberoId)
        ? matchState.lockedLiberoId
        : null;

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

    let effectiveLockedLiberoId = matchState.lockedLiberoId;

    if (effectiveLockedLiberoId === 'NONE') {
      effectiveLockedLiberoId = 'NONE';
    } else if (effectiveLockedLiberoId && !matchState.presentIds.includes(effectiveLockedLiberoId)) {
      effectiveLockedLiberoId = null;
    }

    const lineup = generateOptimalLineup({
      presentPlayers: updatedPlayers.filter(p => matchState.presentIds.includes(p.id)),
      setterSystem: matchState.setterSystem,
      mode: matchState.mode,
      setNumber: 1,
      matchSetsMap: initialSetsPlayed,
      lockedLiberoId: effectiveLockedLiberoId
    });

    const finalLockedLiberoId =
      effectiveLockedLiberoId === 'NONE'
        ? 'NONE'
        : lineup.libero
        ? lineup.libero.id
        : 'NONE';

    const newMatchState = {
      ...matchState,
      isActive: true,
      lockedLiberoId: finalLockedLiberoId,
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
    const updatedBench = alreadyOnBench ? matchState.bench : [...matchState.bench, removedLibero];

    setSwapSelection(null);
    setMatchState({
      ...matchState,
      libero: null,
      lockedLiberoId: 'NONE',
      bench: updatedBench
    });
    showToast(`${removedLibero.name} a été retiré du poste de Libéro et rejoint le banc.`, 'info');
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
      showToast('Le Libéro actif ne peut pas occuper un autre poste. Utilisez « Retirer » pour jouer sans Libéro.', 'error');
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
    const nextLockedLiberoId = activeLiberoId ? activeLiberoId : 'NONE';

    const nextLineup = generateOptimalLineup({
      presentPlayers: updatedPresentPlayers,
      setterSystem: pendingNextSetSystem,
      mode: matchState.mode,
      setNumber: nextSetNumber,
      matchSetsMap: updatedMatchSetsPlayed,
      lockedLiberoId: nextLockedLiberoId
    });

    const nextMatchState = {
      ...matchState,
      setterSystem: pendingNextSetSystem,
      lockedLiberoId: nextLockedLiberoId,
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
        </header>

        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm animate-bounce">
            <div className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-medium ${
              toastMessage.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-800/95 border-slate-600 text-slate-100'
            }`}>
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{toastMessage.msg}</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-24 px-3.5 pt-3 space-y-4">

          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Base Joueurs (Saison)</h2>
                  <p className="text-xs text-slate-400">
                    {players.length} inscrits • {players.filter(p => p.gender === 'F').length} F / {players.filter(p => p.gender === 'M').length} H
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmSeasonResetOpen(true)}
                    className="px-2.5 py-2 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 active:scale-95 transition"
                    title="Nouvelle Saison"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Saison</span>
                  </button>
                  <button
                    onClick={() => { setEditingPlayer(null); setPlayerModalOpen(true); }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 active:scale-95 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Joueur</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {players.map(player => {
                  const ratio = getHistoricalRatio(player).toFixed(2);
                  const incNames = (player.incompatibilities || [])
                    .map(id => players.find(p => p.id === id)?.name)
                    .filter(Boolean);

                  return (
                    <div
                      key={player.id}
                      className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            player.gender === 'F'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}>
                            {player.gender === 'F' ? 'F' : 'H'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-white">{player.name}</span>
                              {player.isTitulaire && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Titulaire
                                </span>
                              )}
                              {player.isCorpo && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-600/40 text-slate-300 border border-slate-500/30">
                                  Corpo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`text-xs ${i < player.level ? 'text-amber-400' : 'text-slate-600'}`}
                                >
                                  ★
                                </span>
                              ))}
                              <span className="text-[11px] text-slate-400 ml-1">
                                Niv. {player.level}/5
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingPlayer(player); setPlayerModalOpen(true); }}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-400 active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {player.roles.map(role => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-lg border ${ROLE_COLORS[role] || 'bg-slate-700 text-slate-200'}`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-3">
                          <span>Matchs : <strong className="text-slate-200">{player.historyMatches}</strong></span>
                          <span>Sets : <strong className="text-slate-200">{formatSets(player.historySets)}</strong></span>
                          <span>Ratio : <strong className="text-indigo-300">{ratio}</strong></span>
                        </div>
                        {incNames.length > 0 && (
                          <div className="flex items-center gap-1 text-rose-400 font-medium">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Incomp: {incNames.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3.5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Configuration du Match</span>
                </h2>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Notre Équipe</label>
                    <input
                      type="text"
                      value={matchState.teamName}
                      onChange={e => setMatchState({ ...matchState, teamName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Adversaire</label>
                    <input
                      type="text"
                      value={matchState.opponentName}
                      onChange={e => setMatchState({ ...matchState, opponentName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5">Mode de compétition</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMatchState({ ...matchState, mode: 'Loisir' })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-0.5 transition ${
                        matchState.mode === 'Loisir'
                          ? 'bg-pink-500/20 border-pink-500 text-pink-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Mode Loisir</span>
                      <span className="text-[10px] font-normal opacity-80">Mixité obligatoire (au moins 1 F)</span>
                    </button>
                    <button
                      onClick={() => setMatchState({ ...matchState, mode: 'Classique' })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-0.5 transition ${
                        matchState.mode === 'Classique'
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Mode Classique</span>
                      <span className="text-[10px] font-normal opacity-80">Sans contrainte genre</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5">Système Tactique (Set 1)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMatchState({ ...matchState, setterSystem: 1 })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-0.5 transition ${
                        matchState.setterSystem === 1
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Option 1 Passeur</span>
                      <span className="text-[10px] font-normal opacity-80">1P • 2C • 1Pt • 2R4</span>
                    </button>
                    <button
                      onClick={() => setMatchState({ ...matchState, setterSystem: 2 })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-0.5 transition ${
                        matchState.setterSystem === 2
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Option 2 Passeurs</span>
                      <span className="text-[10px] font-normal opacity-80">2P • 2C • 2R4</span>
                    </button>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sélection du Libéro</span>
                    </label>
                    <span className="text-[10px] text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                      1 set = 0,5 set
                    </span>
                  </div>
                  <select
                    value={matchState.lockedLiberoId || ''}
                    onChange={e => setMatchState({ ...matchState, lockedLiberoId: e.target.value || null })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="NONE">Aucun (Jouer sans libéro)</option>
                    <option value="">Auto (Désigné par l'algorithme au lancement)</option>
                    {presentPlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.roles.join(', ')}) — Ratio: {getHistoricalRatio(p).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Feuille de Présence</h3>
                    <p className="text-xs text-indigo-300 font-medium mt-0.5">
                      {presentPlayers.length} présents, dont {presentFemalesCount} femme{presentFemalesCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setMatchState({ ...matchState, presentIds: players.map(p => p.id) })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700"
                    >
                      Tous
                    </button>
                    <button
                      onClick={() => setMatchState({
                        ...matchState,
                        presentIds: [],
                        lockedLiberoId: matchState.lockedLiberoId === 'NONE' ? 'NONE' : null
                      })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700"
                    >
                      Aucun
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {players.map(player => {
                    const isChecked = matchState.presentIds.includes(player.id);
                    const isDesignatedLibero = matchState.lockedLiberoId === player.id;
                    return (
                      <div
                        key={player.id}
                        onClick={() => togglePresence(player.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer active:scale-[0.99] transition ${
                          isChecked
                            ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
                            : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                              <span>{player.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                                player.gender === 'F' ? 'bg-pink-500/20 text-pink-300' : 'bg-sky-500/20 text-sky-300'
                              }`}>
                                {player.gender === 'F' ? 'F' : 'H'}
                              </span>
                              {isDesignatedLibero && isChecked && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> Libéro
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] opacity-75">
                              {player.roles.join(', ')} • Niv {player.level}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-[11px] opacity-80">
                          <div>Ratio : {getHistoricalRatio(player).toFixed(2)}</div>
                          <div className="text-[10px]">{formatSets(player.historySets)}s / {player.historyMatches}m</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleStartNewMatch}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-[0.98] transition mt-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Générer la Composition & Lancer le Match</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'live' && (
            <div className="space-y-3.5">
              {!matchState.isActive ? (
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <Play className="w-10 h-10 text-indigo-400 mx-auto opacity-80" />
                  <h3 className="text-base font-bold text-white">Aucun match actif</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Validez la feuille de présence dans l'onglet <strong>2. Présence</strong> pour lancer l'algorithme de composition.
                  </p>
                  <button
                    onClick={() => setActiveTab('setup')}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                  >
                    Aller à la Feuille de Présence
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 rounded-2xl p-3.5 shadow-xl">
                    <div className="flex items-center justify-between mb-2 gap-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        {matchState.currentSet === 5 && <Flame className="w-3 h-3 text-amber-400" />}
                        Set {matchState.currentSet} {matchState.currentSet === 5 ? '(Tie-Break 15 pts)' : `(25 pts)`}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={toggleReverseScoreboard}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-[11px] font-semibold text-slate-200 flex items-center gap-1 active:scale-95 transition"
                          title="Inverser la position des deux équipes"
                        >
                          <ArrowLeftRight className="w-3 h-3 text-indigo-400" />
                          <span>Inverser côtés</span>
                        </button>
                        <button
                          onClick={() => setIsLandscapeFullscreen(true)}
                          className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-[11px] font-semibold text-indigo-200 flex items-center gap-1 active:scale-95 transition"
                          title="Afficher le Scoreboard en mode Paysage Plein Écran"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Paysage</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 items-center gap-2 my-1">
                      <div className="col-span-3 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-center">
                        <div className="text-xs font-bold text-slate-300 truncate">{leftSide.name}</div>
                        <div className={`text-4xl font-black my-1 tabular-nums ${leftSide.colorClass}`}>
                          {leftSide.score}
                        </div>
                        <div className="flex justify-center gap-1.5 mt-1">
                          <button
                            onClick={leftSide.onDecrement}
                            disabled={matchFinished}
                            className="w-9 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm active:scale-90 disabled:opacity-40"
                          >
                            -
                          </button>
                          <button
                            onClick={leftSide.onIncrement}
                            disabled={matchFinished}
                            className={`flex-1 h-8 rounded-lg font-bold text-sm active:scale-95 disabled:opacity-40 ${leftSide.btnPlusClass}`}
                          >
                            +1
                          </button>
                        </div>
                      </div>

                      <div className="col-span-1 flex flex-col items-center justify-center">
                        <div className="text-[10px] uppercase text-slate-400 font-semibold">Sets</div>
                        <div className="text-lg font-black text-white my-0.5 tabular-nums">
                          {leftSide.sets} - {rightSide.sets}
                        </div>
                        <div className="text-[10px] text-slate-500">obj. {targetPoints}</div>
                      </div>

                      <div className="col-span-3 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-center">
                        <div className="text-xs font-bold text-slate-300 truncate">{rightSide.name}</div>
                        <div className={`text-4xl font-black my-1 tabular-nums ${rightSide.colorClass}`}>
                          {rightSide.score}
                        </div>
                        <div className="flex justify-center gap-1.5 mt-1">
                          <button
                            onClick={rightSide.onDecrement}
                            disabled={matchFinished}
                            className="w-9 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm active:scale-90 disabled:opacity-40"
                          >
                            -
                          </button>
                          <button
                            onClick={rightSide.onIncrement}
                            disabled={matchFinished}
                            className={`flex-1 h-8 rounded-lg font-bold text-sm active:scale-95 disabled:opacity-40 ${rightSide.btnPlusClass}`}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    </div>

                    {matchState.setsHistory.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-400">Sets validés :</span>
                        {matchState.setsHistory.map(s => (
                          <span
                            key={s.setNumber}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.winner === 'us'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            S{s.setNumber}: {matchState.isScoreboardReversed ? `${s.theirScore}-${s.ourScore}` : `${s.ourScore}-${s.theirScore}`}
                          </span>
                        ))}
                      </div>
                    )}

                    {!matchFinished ? (
                      <button
                        onClick={handleOpenValidateSetModal}
                        className={`w-full mt-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                          isSetScoreValidToFinish()
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 animate-pulse'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>Valider le Set {matchState.currentSet} & Préparer Set {matchState.currentSet + 1}</span>
                      </button>
                    ) : (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-center space-y-2">
                        <div className="text-xs font-bold text-amber-200">
                          Match terminé ({matchState.ourSets} - {matchState.theirSets}) ! Enregistré dans l'historique.
                        </div>
                        <button
                          onClick={() => setActiveTab('stats')}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                        >
                          Voir le Bilan & Historique des Matchs
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <span>Terrain (6 Titulaires)</span>
                          <span className="text-[10px] font-normal text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                            {matchState.setterSystem === 1 ? '1 Passeur' : '2 Passeurs'}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Touchez 2 joueurs (Terrain ou Banc) pour les échanger manuellement
                        </p>
                      </div>
                      <button
                        onClick={rotateCourtClockwise}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 active:scale-95"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Rotation</span>
                      </button>
                    </div>

                    <div className="relative bg-gradient-to-b from-emerald-950/60 to-emerald-900/30 border-2 border-emerald-500/40 rounded-2xl p-3 space-y-3">
                      <div className="text-center border-b-2 border-dashed border-emerald-400/50 pb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/90">
                          ▲ Filet (Ligne Avant : P4 • P3 • P2) ▲
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {['P4', 'P3', 'P2'].map(posCode => {
                          const idx = matchState.court.findIndex(c => c.pos === posCode);
                          const slot = matchState.court[idx];
                          if (!slot) return null;
                          const isSelected = swapSelection?.zone === 'court' && swapSelection?.indexOrId === idx;
                          const setsToday = matchState.matchSetsPlayed[slot.player.id] || 0;

                          return (
                            <div
                              key={posCode}
                              onClick={() => handlePlayerSlotTap('court', idx)}
                              className={`p-2.5 rounded-xl border text-center cursor-pointer transition relative ${
                                isSelected
                                  ? 'bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400 scale-[1.02]'
                                  : 'bg-slate-900/85 border-slate-700/80 hover:border-emerald-500/50'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span className="font-bold text-emerald-400">{posCode}</span>
                                <span className={`px-1 rounded text-[9px] font-bold ${
                                  slot.player.gender === 'F' ? 'bg-pink-500/20 text-pink-300' : 'bg-sky-500/20 text-sky-300'
                                }`}>
                                  {slot.player.gender === 'F' ? 'F' : 'H'} • ★{slot.player.level}
                                </span>
                              </div>
                              <div className="font-bold text-xs text-white truncate">{slot.player.name}</div>
                              <div className="text-[10px] text-amber-300/90 truncate mt-0.5">{slot.targetRole}</div>
                              <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-between">
                                <span>{slot.matchType}</span>
                                <span className="text-indigo-300 font-semibold">{formatSets(setsToday)} set(s)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-emerald-500/30 my-1"></div>

                      <div className="grid grid-cols-3 gap-2">
                        {['P5', 'P6', 'P1'].map(posCode => {
                          const idx = matchState.court.findIndex(c => c.pos === posCode);
                          const slot = matchState.court[idx];
                          if (!slot) return null;
                          const isSelected = swapSelection?.zone === 'court' && swapSelection?.indexOrId === idx;
                          const setsToday = matchState.matchSetsPlayed[slot.player.id] || 0;

                          return (
                            <div
                              key={posCode}
                              onClick={() => handlePlayerSlotTap('court', idx)}
                              className={`p-2.5 rounded-xl border text-center cursor-pointer transition relative ${
                                isSelected
                                  ? 'bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400 scale-[1.02]'
                                  : 'bg-slate-900/85 border-slate-700/80 hover:border-emerald-500/50'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span className="font-bold text-emerald-400">{posCode} {posCode === 'P1' ? '🏐' : ''}</span>
                                <span className={`px-1 rounded text-[9px] font-bold ${
                                  slot.player.gender === 'F' ? 'bg-pink-500/20 text-pink-300' : 'bg-sky-500/20 text-sky-300'
                                }`}>
                                  {slot.player.gender === 'F' ? 'F' : 'H'} • ★{slot.player.level}
                                </span>
                              </div>
                              <div className="font-bold text-xs text-white truncate">{slot.player.name}</div>
                              <div className="text-[10px] text-amber-300/90 truncate mt-0.5">{slot.targetRole}</div>
                              <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-between">
                                <span>{slot.matchType}</span>
                                <span className="text-indigo-300 font-semibold">{formatSets(setsToday)} set(s)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-center pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                          Ligne Arrière (P5 • P6 • P1 Service)
                        </span>
                      </div>
                    </div>

                    {matchState.libero ? (
                      <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/20 flex items-center justify-between gap-2">
                        <div
                          onClick={() => handlePlayerSlotTap('libero', matchState.libero.id)}
                          className="flex items-center gap-2.5 flex-1 cursor-not-allowed"
                        >
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shrink-0">
                            <Lock className="w-3 h-3" />
                            <span>LIBÉRO</span>
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{matchState.libero.name}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">★{matchState.libero.level}</span>
                            </div>
                            <div className="text-[10px] text-rose-300/90">
                              {formatSets(matchState.matchSetsPlayed[matchState.libero.id] || 0)} set(s) • 0,5 set / set joué
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleRemoveLibero}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-[11px] font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition"
                          title="Retirer le libéro et l'envoyer sur le banc"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Retirer</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Configuration actuelle : <strong className="text-slate-300">Sans Libéro (Aucun)</strong></span>
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Banc des Remplaçants ({matchState.bench.length})
                        </h4>
                        {swapSelection && (
                          <button
                            onClick={() => setSwapSelection(null)}
                            className="text-[11px] text-rose-400 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Annuler sélection
                          </button>
                        )}
                      </div>

                      {matchState.bench.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-2 text-center">
                          Aucun remplaçant sur le banc.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {matchState.bench.map(p => {
                            const isSelected = swapSelection?.zone === 'bench' && swapSelection?.indexOrId === p.id;
                            const setsToday = matchState.matchSetsPlayed[p.id] || 0;
                            return (
                              <div
                                key={p.id}
                                onClick={() => handlePlayerSlotTap('bench', p.id)}
                                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400'
                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <div className="truncate pr-1">
                                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                                    <span>{p.name}</span>
                                    <span className={`text-[9px] px-1 rounded ${
                                      p.gender === 'F' ? 'bg-pink-500/20 text-pink-300' : 'bg-sky-500/20 text-sky-300'
                                    }`}>
                                      {p.gender === 'F' ? 'F' : 'H'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {p.roles.join(', ')} • ★{p.level}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xs font-bold text-amber-300">{formatSets(setsToday)}s</div>
                                  <div className="text-[9px] text-slate-500">R:{getHistoricalRatio(p).toFixed(1)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {(matchState.algorithmWarnings?.length > 0 || matchState.algorithmNotes?.length > 0) && (
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-[11px]">
                        {matchState.algorithmWarnings?.map((w, i) => (
                          <div key={i} className="text-amber-300 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </div>
                        ))}
                        {matchState.algorithmNotes?.map((n, i) => (
                          <div key={i} className="text-slate-400 flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
                            <span>{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span>Historique des Matchs ({matchesHistory.length})</span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Classés du plus récent au plus ancien
                    </p>
                  </div>
                  {matchState.isActive && matchState.setsHistory.length > 0 && !matchState.historyRecorded && (
                    <button
                      onClick={handleSaveMatchManuallyToHistory}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold active:scale-95 transition"
                    >
                      Enregistrer ce match
                    </button>
                  )}
                </div>

                {matchesHistory.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-4 text-center">
                    Aucun match terminé enregistré pour le moment.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {[...matchesHistory]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(m => {
                        const won = m.ourSets > m.theirSets;
                        return (
                          <div
                            key={m.id}
                            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">
                                    vs {m.opponentName}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    won
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}>
                                    {won ? 'Victoire' : 'Défaite'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>{formatDateFr(m.date)}</span>
                                  <span>•</span>
                                  <span>{m.teamName}</span>
                                </div>
                              </div>

                              <div className={`text-lg font-black px-3 py-1 rounded-xl border tabular-nums ${
                                won
                                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                              }`}>
                                {m.ourSets} - {m.theirSets}
                              </div>
                            </div>

                            {m.setsHistory && m.setsHistory.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-800/80">
                                <span className="text-[10px] text-slate-500">Détail sets :</span>
                                {m.setsHistory.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300"
                                  >
                                    S{s.setNumber}: {s.ourScore}-{s.theirScore}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>Indicateur d'Équité (Match du Jour)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Jauges de participation sur le match en cours (Libéro : 1 set joué = 0,5 set comptabilisé).
                </p>

                <div className="space-y-2.5 pt-1">
                  {presentPlayers.map(player => {
                    const setsPlayedToday = Number(matchState.matchSetsPlayed[player.id] || 0);
                    const totalSetsCompleted = Math.max(1, matchState.setsHistory.length);
                    const pct = Math.min(100, Math.round((setsPlayedToday / totalSetsCompleted) * 100));
                    const isCurrentLib = matchState.libero?.id === player.id;

                    return (
                      <div key={player.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{player.name}</span>
                            {isCurrentLib && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Libéro (0,5/set)
                              </span>
                            )}
                            {player.isTitulaire && (
                              <span className="text-[10px] text-amber-400 font-semibold">[Tit.]</span>
                            )}
                            {player.isCorpo && (
                              <span className="text-[10px] text-slate-400">[Corpo]</span>
                            )}
                          </div>
                          <span className="text-slate-300 font-semibold">
                            {formatSets(setsPlayedToday)} / {matchState.setsHistory.length} set(s) ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct >= 65
                                ? 'bg-emerald-500'
                                : pct >= 35
                                ? 'bg-indigo-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Ordre de Priorité Algorithme</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Classement en temps réel pour l'attribution du prochain set
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                        <th className="py-2 pr-2">#</th>
                        <th className="py-2 pr-2">Joueur</th>
                        <th className="py-2 px-2 text-center">P1: Sets Jour</th>
                        <th className="py-2 px-2 text-center">P2: Ratio Saison</th>
                        <th className="py-2 pl-2 text-right">P3: Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {[...presentPlayers]
                        .sort((a, b) => comparePlayersForEquity(a, b, matchState.matchSetsPlayed, false))
                        .map((player, idx) => {
                          const setsToday = matchState.matchSetsPlayed[player.id] || 0;
                          const ratio = getHistoricalRatio(player).toFixed(2);
                          const isCurrentLib = matchState.libero?.id === player.id;
                          return (
                            <tr key={player.id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 pr-2 font-bold text-indigo-400">{idx + 1}</td>
                              <td className="py-2.5 pr-2">
                                <div className="font-bold text-white flex items-center gap-1">
                                  <span>{player.name}</span>
                                  {isCurrentLib && (
                                    <Lock className="w-3 h-3 text-rose-400" title="Libéro actif" />
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">Niv. ★{player.level}</div>
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-amber-300">
                                {formatSets(setsToday)}
                              </td>
                              <td className="py-2.5 px-2 text-center text-slate-200">
                                <div>{ratio}</div>
                                <div className="text-[10px] text-slate-500">
                                  ({formatSets(player.historySets)}s/{player.historyMatches}m)
                                </div>
                              </td>
                              <td className="py-2.5 pl-2 text-right">
                                {player.isCorpo ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]">
                                    3. Corpo
                                  </span>
                                ) : player.isTitulaire ? (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                                    1. Titulaire
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                                    2. Régulier
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 z-30">
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: 'roster', label: '1. Effectif', icon: Users },
              { id: 'setup', label: '2. Présence', icon: CheckSquare },
              { id: 'live', label: '3. Match Live', icon: Play, badge: matchState.isActive },
              { id: 'stats', label: '4. Stats', icon: BarChart3 }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition relative ${
                    active ? 'text-indigo-400 bg-indigo-500/10 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px]">{tab.label}</span>
                  {tab.badge && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1.5 right-6 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {isLandscapeFullscreen && (
          <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-4 select-none overflow-hidden">
            <div
              className={
                forceRotate90
                  ? 'w-[100vh] h-[100vw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 flex flex-col justify-between p-5 bg-slate-950'
                  : 'w-full h-full flex flex-col justify-between'
              }
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-sm">
                    SET {matchState.currentSet} • Obj. {targetPoints} pts
                  </span>
                  <div className="flex items-center gap-1.5">
                    {matchState.setsHistory.map(s => (
                      <span
                        key={s.setNumber}
                        className="px-2 py-0.5 rounded bg-slate-800 text-xs font-bold text-slate-300"
                      >
                        S{s.setNumber}: {matchState.isScoreboardReversed ? `${s.theirScore}-${s.ourScore}` : `${s.ourScore}-${s.theirScore}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleReverseScoreboard}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5 active:scale-95"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                    <span>Inverser Équipes</span>
                  </button>
                  <button
                    onClick={() => setForceRotate90(!forceRotate90)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 ${
                      forceRotate90
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Pivoter 90°</span>
                  </button>
                  <button
                    onClick={() => { setIsLandscapeFullscreen(false); setForceRotate90(false); }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span>Quitter</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-11 items-center gap-4 my-2">
                <div className="col-span-5 h-full bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-4 flex flex-col justify-between items-center">
                  <div className="w-full flex items-center justify-between px-2">
                    <span className="text-lg font-extrabold text-slate-200 truncate">{leftSide.name}</span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-base font-black text-white">
                      {leftSide.sets} set(s)
                    </span>
                  </div>

                  <div
                    onClick={!matchFinished ? leftSide.onIncrement : undefined}
                    className={`text-7xl sm:text-8xl font-black tabular-nums cursor-pointer select-none my-auto ${leftSide.colorClass}`}
                  >
                    {leftSide.score}
                  </div>

                  <div className="w-full grid grid-cols-3 gap-3">
                    <button
                      onClick={leftSide.onDecrement}
                      disabled={matchFinished}
                      className="col-span-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xl active:scale-95 disabled:opacity-40"
                    >
                      -1
                    </button>
                    <button
                      onClick={leftSide.onIncrement}
                      disabled={matchFinished}
                      className={`col-span-2 py-3.5 rounded-2xl font-black text-xl active:scale-95 disabled:opacity-40 ${leftSide.btnPlusClass}`}
                    >
                      +1 POINT
                    </button>
                  </div>
                </div>

                <div className="col-span-1 flex flex-col items-center justify-center gap-2">
                  <div className="text-xs font-bold uppercase text-slate-500">SETS</div>
                  <div className="text-3xl font-black text-white tabular-nums">
                    {leftSide.sets} - {rightSide.sets}
                  </div>
                  {isSetScoreValidToFinish() && !matchFinished && (
                    <button
                      onClick={() => {
                        setIsLandscapeFullscreen(false);
                        setForceRotate90(false);
                        handleOpenValidateSetModal();
                      }}
                      className="mt-2 px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs text-center shadow-lg animate-pulse"
                    >
                      Valider Set
                    </button>
                  )}
                </div>

                <div className="col-span-5 h-full bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-4 flex flex-col justify-between items-center">
                  <div className="w-full flex items-center justify-between px-2">
                    <span className="text-lg font-extrabold text-slate-200 truncate">{rightSide.name}</span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-base font-black text-white">
                      {rightSide.sets} set(s)
                    </span>
                  </div>

                  <div
                    onClick={!matchFinished ? rightSide.onIncrement : undefined}
                    className={`text-7xl sm:text-8xl font-black tabular-nums cursor-pointer select-none my-auto ${rightSide.colorClass}`}
                  >
                    {rightSide.score}
                  </div>

                  <div className="w-full grid grid-cols-3 gap-3">
                    <button
                      onClick={rightSide.onDecrement}
                      disabled={matchFinished}
                      className="col-span-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xl active:scale-95 disabled:opacity-40"
                    >
                      -1
                    </button>
                    <button
                      onClick={rightSide.onIncrement}
                      disabled={matchFinished}
                      className={`col-span-2 py-3.5 rounded-2xl font-black text-xl active:scale-95 disabled:opacity-40 ${rightSide.btnPlusClass}`}
                    >
                      +1 POINT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {playerModalOpen && (
          <PlayerFormModal
            player={editingPlayer}
            allPlayers={players}
            onClose={() => { setPlayerModalOpen(false); setEditingPlayer(null); }}
            onSave={handleSavePlayer}
          />
        )}

        {nextSetModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">
                  Valider le Set {matchState.currentSet} ({matchState.ourScore} - {matchState.theirScore})
                </h3>
                <button onClick={() => setNextSetModalOpen(false)} className="text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-1">
                <div>• <strong>+1 set</strong> ajouté aux 6 joueurs présents sur le terrain.</div>
                {matchState.libero && (
                  <div className="text-rose-300">
                    • <strong>+0,5 set</strong> ajouté au Libéro actif ({matchState.libero.name}).
                  </div>
                )}
                <div>• Recalcul dynamique de la composition pour le set suivant.</div>
              </div>

              {((matchState.ourSets + (matchState.ourScore > matchState.theirScore ? 1 : 0)) < 3 &&
                (matchState.theirSets + (matchState.theirScore > matchState.ourScore ? 1 : 0)) < 3) && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Système tactique souhaité pour le Set {matchState.currentSet + 1} :
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPendingNextSetSystem(1)}
                      className={`p-3 rounded-xl border text-xs font-bold transition ${
                        pendingNextSetSystem === 1
                          ? 'bg-indigo-600/30 border-indigo-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      1 Passeur
                      <div className="text-[10px] font-normal opacity-80">1P • 2C • 1Pt • 2R4</div>
                    </button>
                    <button
                      onClick={() => setPendingNextSetSystem(2)}
                      className={`p-3 rounded-xl border text-xs font-bold transition ${
                        pendingNextSetSystem === 2
                          ? 'bg-indigo-600/30 border-indigo-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      2 Passeurs
                      <div className="text-[10px] font-normal opacity-80">2P • 2C • 2R4</div>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setNextSetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmValidateSet}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Confirmer & Générer
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmSeasonResetOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4">
              <h3 className="text-base font-bold text-white">Réinitialiser la saison ?</h3>
              <p className="text-xs text-slate-400">
                Tous les compteurs de matchs, de sets joués et l'historique des rencontres seront remis à zéro. La liste de vos joueurs et leurs postes seront conservés.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmSeasonResetOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleResetSeason}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold"
                >
                  Confirmer Reset
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function PlayerFormModal({ player, allPlayers, onClose, onSave }) {
  const [name, setName] = useState(player?.name || '');
  const [gender, setGender] = useState(player?.gender || 'M');
  const [level, setLevel] = useState(player?.level || 3);
  const [roles, setRoles] = useState(player?.roles || ['R4']);
  const [statusType, setStatusType] = useState(
    player?.isCorpo ? 'corpo' : player?.isTitulaire ? 'titulaire' : 'normal'
  );
  const [incompatibilities, setIncompatibilities] = useState(player?.incompatibilities || []);
  const [historyMatches, setHistoryMatches] = useState(player?.historyMatches || 0);
  const [historySets, setHistorySets] = useState(player?.historySets || 0);

  const toggleRole = (role) => {
    if (roles.includes(role)) {
      if (roles.length > 1) setRoles(roles.filter(r => r !== role));
    } else {
      setRoles([...roles, role]);
    }
  };

  const toggleIncompatibility = (otherId) => {
    if (incompatibilities.includes(otherId)) {
      setIncompatibilities(incompatibilities.filter(id => id !== otherId));
    } else {
      setIncompatibilities([...incompatibilities, otherId]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      gender,
      level: Number(level),
      roles,
      isTitulaire: statusType === 'titulaire',
      isCorpo: statusType === 'corpo',
      incompatibilities,
      historyMatches: Number(historyMatches),
      historySets: Number(historySets)
    });
  };

  const otherPlayers = allPlayers.filter(p => p.id !== player?.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            {player ? `Modifier ${player.name}` : 'Nouveau Joueur'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="col-span-2">
            <label className="text-[11px] text-slate-400 block mb-1">Nom / Prénom</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Camille"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Genre</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setGender('M')}
                className={`py-1.5 rounded-lg text-xs font-bold ${
                  gender === 'M' ? 'bg-sky-600 text-white' : 'text-slate-400'
                }`}
              >
                H
              </button>
              <button
                type="button"
                onClick={() => setGender('F')}
                className={`py-1.5 rounded-lg text-xs font-bold ${
                  gender === 'F' ? 'bg-pink-600 text-white' : 'text-slate-400'
                }`}
              >
                F
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">
            Niveau de performance : <strong className="text-amber-400">{level} / 5</strong>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setLevel(n)}
                className={`py-2 rounded-xl border text-xs font-bold ${
                  level === n
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {n} ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1.5">Postes maîtrisés</label>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map(role => {
              const active = roles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                    active
                      ? 'bg-indigo-600 border-indigo-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1.5">Statut Priorité (Équité P3)</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatusType('titulaire')}
              className={`py-2 px-2 rounded-xl border text-xs font-semibold ${
                statusType === 'titulaire'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              1. Titulaire
            </button>
            <button
              type="button"
              onClick={() => setStatusType('normal')}
              className={`py-2 px-2 rounded-xl border text-xs font-semibold ${
                statusType === 'normal'
                  ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              2. Non-titulaire
            </button>
            <button
              type="button"
              onClick={() => setStatusType('corpo')}
              className={`py-2 px-2 rounded-xl border text-xs font-semibold ${
                statusType === 'corpo'
                  ? 'bg-slate-700 border-slate-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              3. Corpo
            </button>
          </div>
        </div>

        {player && (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Matchs présents (Saison)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={historyMatches}
                onChange={e => setHistoryMatches(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Sets joués (Saison, pas de 0.5)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={historySets}
                onChange={e => setHistorySets(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {otherPlayers.length > 0 && (
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">
              Incompatibilités (ne jouera jamais simultanément avec) :
            </label>
            <div className="max-h-28 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-wrap gap-1.5">
              {otherPlayers.map(op => {
                const isInc = incompatibilities.includes(op.id);
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => toggleIncompatibility(op.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                      isInc
                        ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {isInc ? '⛔ ' : ''}{op.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<VolleyManagerPro />);
}
