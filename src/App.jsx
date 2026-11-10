import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import {
  Users, CheckSquare, Play, BarChart3, Plus, Trash2, Edit3, ShieldAlert,
  RotateCw, Award, Sparkles, RefreshCw, AlertTriangle, Check, X,
  Trophy, Flame, Sliders, ArrowLeftRight, Info, Lock,
  Maximize2, Minimize2, Calendar, Clock, Sword, Shield, Zap, UserPlus,
  Database, Download, Upload, History, CheckCircle2, XCircle, FileJson, ShieldCheck
} from 'lucide-react';

// ============================================================================
// 1. CONSTANTES & CONFIGURATION TACTIQUE DE RÉFÉRENCE
// ============================================================================

const APP_VERSION = '4.2.0';
const BACKUP_SCHEMA_VERSION = '1.0.0';
const IDB_DB_NAME = 'VolleyManagerBackupDB';
const IDB_STORE_NAME = 'backups';
const IDB_VERSION = 1;
const FALLBACK_VAULT_KEY = 'vmp_backup_vault_fallback_v1';
const BACKUP_SETTINGS_KEY = 'vmp_backup_settings_v1';

const ROLES = ['Passeur', 'R4', 'Central', 'Pointu', 'Libéro', 'Polyvalent'];

const ROLE_COLORS = {
  Passeur: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  R4: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  Central: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Pointu: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  Libéro: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  Polyvalent: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
};

/**
 * Disposition impérative sur le terrain (de gauche à droite) :
 * - Ligne avant (1re ligne) : P4 (1. Central), P3 (2. R4), P2 (3. Passeur)
 * - Ligne arrière (2e ligne) : P5 (1. Passeur / Pointu), P6 (2. R4), P1 (3. Central)
 * Cycle de rotation horaire autour du terrain : P4 -> P3 -> P2 -> P1 -> P6 -> P5 -> P4
 */
const FRONT_ROW_POSITIONS = ['P4', 'P3', 'P2'];
const BACK_ROW_POSITIONS = ['P5', 'P6', 'P1'];

const ROTATION_RECEIVE_FROM = {
  P3: 'P4',
  P2: 'P3',
  P1: 'P2',
  P6: 'P1',
  P5: 'P6',
  P4: 'P5',
};

function getRequiredSlots(setterSystem = 1) {
  return [
    { pos: 'P4', row: 'front', targetRole: 'Central', label: 'Central' },
    { pos: 'P3', row: 'front', targetRole: 'R4', label: 'R4' },
    { pos: 'P2', row: 'front', targetRole: 'Passeur', label: 'Passeur' },
    {
      pos: 'P5',
      row: 'back',
      targetRole: setterSystem === 1 ? 'Pointu' : 'Passeur',
      label: setterSystem === 1 ? 'Pointu' : 'Passeur'
    },
    { pos: 'P6', row: 'back', targetRole: 'R4', label: 'R4' },
    { pos: 'P1', row: 'back', targetRole: 'Central', label: 'Central' },
  ];
}

const DEFAULT_MATCH_HISTORY = [
  {
    id: 'm_demo_2',
    date: '2025-02-22T20:30:00.000Z',
    teamName: 'AS Volley Pro',
    opponentName: 'AS Martigues',
    ourSets: 3,
    theirSets: 0,
    mode: 'Loisir',
    presentPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
    playerSetsMap: {
      p1: 2, p2: 1, p3: 2, p4: 2, p5: 1, p6: 2, p7: 1, p8: 2, p9: 1, p10: 1.5
    },
    setsHistory: [
      { setNumber: 1, ourScore: 25, theirScore: 19, winner: 'us' },
      { setNumber: 2, ourScore: 25, theirScore: 22, winner: 'us' },
      { setNumber: 3, ourScore: 25, theirScore: 20, winner: 'us' }
    ]
  },
  {
    id: 'm_demo_1',
    date: '2025-02-15T20:30:00.000Z',
    teamName: 'AS Volley Pro',
    opponentName: 'VC Rivière',
    ourSets: 3,
    theirSets: 1,
    mode: 'Loisir',
    presentPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p10'],
    playerSetsMap: {
      p1: 3, p2: 1, p3: 3, p4: 3, p5: 1, p6: 3, p7: 2, p8: 2, p10: 2
    },
    setsHistory: [
      { setNumber: 1, ourScore: 25, theirScore: 21, winner: 'us' },
      { setNumber: 2, ourScore: 22, theirScore: 25, winner: 'them' },
      { setNumber: 3, ourScore: 25, theirScore: 18, winner: 'us' },
      { setNumber: 4, ourScore: 25, theirScore: 23, winner: 'us' }
    ]
  }
];

const DEFAULT_ROSTER = [
  { id: 'p1', name: 'Thomas (Cap)', gender: 'M', attackLevel: 5, defenseLevel: 5, level: 5, roles: ['Passeur'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 2, historySets: 5 },
  { id: 'p2', name: 'Julie', gender: 'F', attackLevel: 3, defenseLevel: 4, level: 3.5, roles: ['Passeur', 'Polyvalent'], isTitulaire: false, isCorpo: false, incompatibilities: [], historyMatches: 2, historySets: 2 },
  { id: 'p3', name: 'Marc', gender: 'M', attackLevel: 5, defenseLevel: 3, level: 4, roles: ['R4', 'Pointu'], isTitulaire: true, isCorpo: false, incompatibilities: ['p9'], historyMatches: 2, historySets: 5 },
  { id: 'p4', name: 'Sophie', gender: 'F', attackLevel: 4, defenseLevel: 4, level: 4, roles: ['R4'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 2, historySets: 5 },
  { id: 'p5', name: 'Lucas', gender: 'M', attackLevel: 3, defenseLevel: 3, level: 3, roles: ['R4', 'Polyvalent'], isTitulaire: false, isCorpo: false, incompatibilities: [], historyMatches: 2, historySets: 2 },
  { id: 'p6', name: 'Karim', gender: 'M', attackLevel: 5, defenseLevel: 4, level: 4.5, roles: ['Central'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 2, historySets: 5 },
  { id: 'p7', name: 'Chloé', gender: 'F', attackLevel: 3, defenseLevel: 3, level: 3, roles: ['Central', 'Polyvalent'], isTitulaire: false, isCorpo: false, incompatibilities: [], historyMatches: 2, historySets: 3 },
  { id: 'p8', name: 'Antoine', gender: 'M', attackLevel: 4, defenseLevel: 4, level: 4, roles: ['Pointu', 'Central'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 2, historySets: 4 },
  { id: 'p9', name: 'David (Corpo)', gender: 'M', attackLevel: 2, defenseLevel: 2, level: 2, roles: ['Polyvalent', 'R4'], isTitulaire: false, isCorpo: true, incompatibilities: ['p3'], historyMatches: 1, historySets: 1 },
  { id: 'p10', name: 'Léa', gender: 'F', attackLevel: 2, defenseLevel: 5, level: 3.5, roles: ['Libéro', 'R4'], isTitulaire: true, isCorpo: false, incompatibilities: [], historyMatches: 2, historySets: 3.5 },
];

// ============================================================================
// 2. FONCTIONS UTILITAIRES & CALCULS MÉTIER
// ============================================================================

const formatSets = (val) => {
  const num = Number(val || 0);
  return Number.isInteger(num) ? num.toString() : num.toFixed(1).replace('.', ',');
};

const formatAverage = (val) => Number(val || 0).toFixed(1).replace('.', ',');

const formatDateFr = (isoString) => {
  try {
    return new Date(isoString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
};

const formatDateTimeFr = (isoString) => {
  if (!isoString) return 'Aucune';
  try {
    return new Date(isoString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return isoString;
  }
};

function migratePlayer(p) {
  if (!p || typeof p !== 'object') return null;
  const legacyLevel = Number(p.level || 3);
  const attackLevel = p.attackLevel !== undefined ? Math.min(5, Math.max(1, Number(p.attackLevel))) : legacyLevel;
  const defenseLevel = p.defenseLevel !== undefined ? Math.min(5, Math.max(1, Number(p.defenseLevel))) : legacyLevel;
  return {
    id: String(p.id || 'p_' + Math.random().toString(36).slice(2, 9)),
    name: String(p.name || 'Joueur').trim(),
    gender: p.gender === 'F' ? 'F' : 'M',
    attackLevel,
    defenseLevel,
    level: Number(((attackLevel + defenseLevel) / 2).toFixed(1)),
    roles: Array.isArray(p.roles) && p.roles.length > 0 ? p.roles : ['Polyvalent'],
    isTitulaire: Boolean(p.isTitulaire),
    isCorpo: Boolean(p.isCorpo),
    incompatibilities: Array.isArray(p.incompatibilities) ? p.incompatibilities : [],
    historyMatches: Math.max(0, Number(p.historyMatches || 0)),
    historySets: Math.max(0, Number(p.historySets || 0))
  };
}

function recalculatePlayersStatsFromMatches(playersList, matchesList, preserveBaseline = false) {
  const matchesCountMap = {};
  const setsCountMap = {};

  (matchesList || []).forEach(m => {
    const pIds = m.presentPlayerIds || [];
    const sMap = m.playerSetsMap || {};
    pIds.forEach(id => {
      matchesCountMap[id] = (matchesCountMap[id] || 0) + 1;
    });
    Object.entries(sMap).forEach(([id, setsVal]) => {
      setsCountMap[id] = Number(setsCountMap[id] || 0) + Number(setsVal || 0);
      if (!pIds.includes(id) && Number(setsVal) > 0) {
        matchesCountMap[id] = (matchesCountMap[id] || 0) + 1;
      }
    });
  });

  return playersList.map(p => {
    const calcMatches = matchesCountMap[p.id] || 0;
    const calcSets = setsCountMap[p.id] || 0;
    return {
      ...p,
      historyMatches: preserveBaseline ? Math.max(Number(p.historyMatches || 0), calcMatches) : calcMatches,
      historySets: preserveBaseline ? Math.max(Number(p.historySets || 0), calcSets) : calcSets
    };
  });
}

function computeGlobalTeamStats(matchesList) {
  const list = matchesList || [];
  const totalMatches = list.length;
  const wins = list.filter(m => Number(m.ourSets) > Number(m.theirSets)).length;
  const losses = totalMatches - wins;
  const setsWon = list.reduce((acc, m) => acc + Number(m.ourSets || 0), 0);
  const setsLost = list.reduce((acc, m) => acc + Number(m.theirSets || 0), 0);
  return { totalMatches, wins, losses, setsWon, setsLost };
}

function getPlayerOverallScore(player) {
  const att = Number(player.attackLevel ?? player.level ?? 3);
  const def = Number(player.defenseLevel ?? player.level ?? 3);
  return (att + def) / 2;
}

function getHistoricalRatio(player) {
  if (!player.historyMatches || player.historyMatches <= 0) return 0;
  return Number(player.historySets || 0) / Number(player.historyMatches);
}

function getStatusRank(player) {
  if (player.isCorpo) return 3;
  if (player.isTitulaire) return 1;
  return 2;
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

function getTeamPointAlert(teamScore, oppScore, teamSets, currentSet) {
  const target = currentSet === 5 ? 15 : 25;
  if ((teamScore >= target || oppScore >= target) && Math.abs(teamScore - oppScore) >= 2) {
    return null;
  }
  const nextPoint = teamScore + 1;
  if (nextPoint >= target && (nextPoint - oppScore) >= 2) {
    return teamSets === 2 ? 'BALLE DE MATCH' : 'BALLE DE SET';
  }
  return null;
}

// ============================================================================
// 3. SYSTÈME DE SAUVEGARDE, INTÉGRITÉ, INDEXEDDB & POLITIQUE DE RÉTENTION
// ============================================================================

/**
 * Empreinte déterministe FNV-1a (32-bit) pour vérifier l'intégrité des sauvegardes
 * et détecter si les données ont réellement changé avant de créer une sauvegarde.
 */
function computeDeterministicChecksum(obj) {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return 'fnv1a_' + (hash >>> 0).toString(16).padStart(8, '0') + '_len' + str.length;
}

function computeCanonicalDataHash(players, matchesHistory, matchState) {
  return computeDeterministicChecksum({
    p: players,
    m: matchesHistory,
    a: matchState
  });
}

function createBackupEnvelope({ players, matchesHistory, matchState, triggerType = 'auto', label = '' }) {
  const timestamp = new Date().toISOString();
  const teamStats = computeGlobalTeamStats(matchesHistory);
  const individualStats = (players || []).map(p => ({
    id: p.id,
    name: p.name,
    historyMatches: p.historyMatches || 0,
    historySets: p.historySets || 0,
    ratio: Number(getHistoricalRatio(p).toFixed(3))
  }));

  const dataPayload = {
    players: players || [],
    matchesHistory: matchesHistory || [],
    matchState: matchState || null,
    statisticsSnapshot: {
      teamStats,
      individualStats,
      computedAt: timestamp
    }
  };

  const checksum = computeDeterministicChecksum(dataPayload);
  const dataHash = computeCanonicalDataHash(players, matchesHistory, matchState);

  return {
    id: 'bkp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createdAt: timestamp,
    triggerType, // 'auto' | 'manual' | 'periodic' | 'pre-restore'
    label: label || (triggerType === 'manual' ? 'Export manuel' : 'Sauvegarde automatique'),
    status: 'success',
    playersCount: (players || []).length,
    matchesCount: (matchesHistory || []).length,
    checksum,
    dataHash,
    data: dataPayload
  };
}

/**
 * Vérification stricte d'une sauvegarde (structure, version, intégrité checksum et cohérence des relations)
 */
function validateAndAnalyzeBackup(rawJson) {
  const anomalies = [];
  if (!rawJson || typeof rawJson !== 'object') {
    return { valid: false, error: 'Le fichier fourni ne contient pas un objet JSON valide.', anomalies };
  }

  const schemaVersion = rawJson.schemaVersion;
  if (!schemaVersion) {
    return { valid: false, error: 'Version du format de sauvegarde (schemaVersion) manquante.', anomalies };
  }
  const majorVersion = String(schemaVersion).split('.')[0];
  if (majorVersion !== '1') {
    return {
      valid: false,
      error: `Version de schéma incompatible (${schemaVersion}). Version attendue : 1.x.`,
      anomalies
    };
  }

  const data = rawJson.data;
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Section "data" absente ou corrompue dans la sauvegarde.', anomalies };
  }

  if (!Array.isArray(data.players) || !Array.isArray(data.matchesHistory)) {
    return {
      valid: false,
      error: 'Les listes principales (players ou matchesHistory) sont absentes ou invalides.',
      anomalies
    };
  }

  // Vérification de la somme de contrôle (Checksum)
  if (rawJson.checksum) {
    const expectedChecksum = computeDeterministicChecksum(data);
    if (expectedChecksum !== rawJson.checksum) {
      return {
        valid: false,
        error: 'Échec du contrôle d’intégrité (checksum invalide) : le fichier a été altéré ou tronqué.',
        anomalies
      };
    }
  } else {
    anomalies.push("Aucune empreinte checksum trouvée ; vérification structurelle appliquée.");
  }

  // Vérification de chaque joueur et de la cohérence des incompatibilités
  const playerIds = new Set();
  for (const p of data.players) {
    if (!p || !p.id || !p.name) {
      return { valid: false, error: 'Un joueur de la sauvegarde est dépourvu d’identifiant ou de nom.', anomalies };
    }
    if (playerIds.has(p.id)) {
      anomalies.push(`Doublon d'identifiant joueur détecté (${p.id} - ${p.name}).`);
    }
    playerIds.add(p.id);
  }

  data.players.forEach(p => {
    (p.incompatibilities || []).forEach(incId => {
      if (!playerIds.has(incId)) {
        anomalies.push(`Le joueur "${p.name}" référence une incompatibilité (${incId}) absente de la liste (sera nettoyée automatiquement).`);
      }
    });
  });

  // Vérification des matchs
  for (const m of data.matchesHistory) {
    if (!m || !m.id || m.ourSets === undefined || m.theirSets === undefined) {
      return { valid: false, error: 'Un match enregistré dans la sauvegarde est incomplet ou corrompu.', anomalies };
    }
  }

  return {
    valid: true,
    error: null,
    anomalies,
    summary: {
      createdAt: rawJson.createdAt,
      schemaVersion: rawJson.schemaVersion,
      triggerType: rawJson.triggerType || 'externe',
      playersCount: data.players.length,
      matchesCount: data.matchesHistory.length,
      hasActiveMatch: Boolean(data.matchState?.isActive)
    }
  };
}

/**
 * Gestionnaire de stockage indépendant dans IndexedDB (avec repli sur localStorage)
 */
function openBackupIDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non supporté'));
      return;
    }
    const request = window.indexedDB.open(IDB_DB_NAME, IDB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Erreur ouverture IndexedDB'));
  });
}

async function getAllStoredBackups() {
  try {
    const db = await openBackupIDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? req.result : [];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(FALLBACK_VAULT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }
}

/**
 * Politique de conservation multi-niveaux :
 * - Conserve les 5 sauvegardes réussies les plus récentes (sécurité court terme),
 * - Conserve les 7 dernières sauvegardes quotidiennes (1 par jour calendaire),
 * - Conserve les 4 dernières sauvegardes hebdomadaires (1 par semaine ISO),
 * - Conserve la dernière sauvegarde mensuelle (1 par mois calendaire),
 * - Conserve les 5 dernières sauvegardes manuelles / pré-restauration.
 * Ne supprime JAMAIS toutes les sauvegardes valides.
 */
function applyRetentionPolicy(backupsList) {
  if (!Array.isArray(backupsList) || backupsList.length <= 7) {
    return backupsList.map(b => ({ ...b, retentionTier: b.retentionTier || 'Récente' }));
  }

  const sorted = [...backupsList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const keptMap = new Map();
  const dailyBuckets = new Set();
  const weeklyBuckets = new Set();
  const monthlyBuckets = new Set();
  let manualKept = 0;
  let recentKept = 0;

  const getDayKey = (d) => d.toISOString().slice(0, 10);
  const getWeekKey = (d) => {
    const firstJan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
  };
  const getMonthKey = (d) => d.toISOString().slice(0, 7);

  for (const bkp of sorted) {
    if (bkp.status !== 'success') {
      if (keptMap.size < 25) keptMap.set(bkp.id, { ...bkp, retentionTier: 'Journal erreur' });
      continue;
    }

    const d = new Date(bkp.createdAt);
    const dayKey = getDayKey(d);
    const weekKey = getWeekKey(d);
    const monthKey = getMonthKey(d);

    if (bkp.triggerType === 'manual' || bkp.triggerType === 'pre-restore') {
      if (manualKept < 5) {
        manualKept++;
        keptMap.set(bkp.id, {
          ...bkp,
          retentionTier: bkp.triggerType === 'pre-restore' ? 'Sécurité pré-restauration' : 'Manuelle'
        });
        continue;
      }
    }

    if (recentKept < 3) {
      recentKept++;
      dailyBuckets.add(dayKey);
      keptMap.set(bkp.id, { ...bkp, retentionTier: 'Quotidienne (Récente)' });
      continue;
    }

    if (!dailyBuckets.has(dayKey) && dailyBuckets.size < 7) {
      dailyBuckets.add(dayKey);
      keptMap.set(bkp.id, { ...bkp, retentionTier: 'Quotidienne (7j)' });
      continue;
    }

    if (!weeklyBuckets.has(weekKey) && weeklyBuckets.size < 4) {
      weeklyBuckets.add(weekKey);
      keptMap.set(bkp.id, { ...bkp, retentionTier: 'Hebdomadaire (4 sem.)' });
      continue;
    }

    if (!monthlyBuckets.has(monthKey) && monthlyBuckets.size < 1) {
      monthlyBuckets.add(monthKey);
      keptMap.set(bkp.id, { ...bkp, retentionTier: 'Mensuelle' });
      continue;
    }
  }

  // Garantie absolue : ne jamais supprimer toutes les sauvegardes
  if (keptMap.size === 0 && sorted.length > 0) {
    keptMap.set(sorted[0].id, { ...sorted[0], retentionTier: 'Dernière valide' });
  }

  return Array.from(keptMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function saveBackupToVault(newBackup) {
  // Vérifier l'intégrité du paquet avant de l'enregistrer
  const check = validateAndAnalyzeBackup(newBackup);
  if (!check.valid) {
    throw new Error(check.error || 'Sauvegarde générée invalide');
  }

  const existing = await getAllStoredBackups();
  const merged = [newBackup, ...existing.filter(b => b.id !== newBackup.id)];
  const retained = applyRetentionPolicy(merged);

  try {
    const db = await openBackupIDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const retainedIds = new Set(retained.map(b => b.id));

      existing.forEach(old => {
        if (!retainedIds.has(old.id)) {
          store.delete(old.id);
        }
      });
      retained.forEach(item => {
        store.put(item);
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Repli sécurisé sur localStorage si IndexedDB est bloqué
    const slimRetained = retained.slice(0, 10);
    localStorage.setItem(FALLBACK_VAULT_KEY, JSON.stringify(slimRetained));
  }

  return retained;
}

function triggerJsonFileDownload(backupEnvelope) {
  const dateObj = new Date(backupEnvelope.createdAt || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  const fileDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}_${pad(dateObj.getHours())}-${pad(dateObj.getMinutes())}-${pad(dateObj.getSeconds())}`;
  const fileName = `volley-manager-pro_sauvegarde_${fileDate}.json`;

  const jsonString = JSON.stringify(backupEnvelope, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  return fileName;
}

// ============================================================================
// 4. MOTEUR ALGORITHMIQUE DE SÉLECTION & COMPOSITION
// ============================================================================

function getSelectionStrategy(setNumber, ourSets, theirSets) {
  if (setNumber === 5) return 'TIE_BREAK_MAX';
  if (setNumber <= 2) return 'PRIORITY_1';
  if (ourSets === 0 && theirSets === 2) return 'STRONG_COMEBACK';
  if (ourSets === 2 && theirSets === 0) return 'ROTATION_DEVELOPMENT';
  if (ourSets < theirSets) return 'STRONG_COMEBACK';
  return 'BALANCED_PRIORITY_1';
}

function comparePlayersByStrategy(a, b, matchSetsMap, strategy) {
  const scoreA = getPlayerOverallScore(a);
  const scoreB = getPlayerOverallScore(b);
  const setsA = Number(matchSetsMap[a.id] || 0);
  const setsB = Number(matchSetsMap[b.id] || 0);
  const ratioA = getHistoricalRatio(a);
  const ratioB = getHistoricalRatio(b);
  const statusA = getStatusRank(a);
  const statusB = getStatusRank(b);

  if (strategy === 'TIE_BREAK_MAX') {
    if (Math.abs(scoreB - scoreA) > 0.01) return scoreB - scoreA;
    if (statusA !== statusB) return statusA - statusB;
    return setsA - setsB;
  }

  if (strategy === 'STRONG_COMEBACK') {
    if (Math.abs(setsA - setsB) >= 2) return setsA - setsB;
    if (Math.abs(scoreB - scoreA) > 0.01) return scoreB - scoreA;
    if (statusA !== statusB) return statusA - statusB;
    if (setsA !== setsB) return setsA - setsB;
    return ratioA - ratioB;
  }

  if (strategy === 'ROTATION_DEVELOPMENT') {
    if (setsA !== setsB) return setsA - setsB;
    if (Math.abs(ratioA - ratioB) > 0.001) return ratioA - ratioB;
    if (Math.abs(scoreA - scoreB) > 0.01) return scoreA - scoreB;
    return statusB - statusA;
  }

  if (setsA !== setsB) return setsA - setsB;
  if (Math.abs(ratioA - ratioB) > 0.001) return ratioA - ratioB;
  if (statusA !== statusB) return statusA - statusB;
  return scoreB - scoreA;
}

function getPlayerMatchTypeForRole(player, role) {
  if (player.roles.includes(role)) return 'Spécialiste';
  if (player.roles.includes('Polyvalent')) return 'Polyvalent';
  return 'Manuel';
}

function generateOptimalLineup({
  presentPlayers,
  setterSystem = 1,
  mode = 'Loisir',
  setNumber = 1,
  ourSets = 0,
  theirSets = 0,
  matchSetsMap = {},
  lockedLiberoId = null,
  designatedLiberoIds = []
}) {
  const strategy = getSelectionStrategy(setNumber, ourSets, theirSets);
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
  if (lockedLiberoId && lockedLiberoId !== 'NONE') {
    selectedLibero = presentPlayers.find(p => p.id === lockedLiberoId) || null;
  } else if (!lockedLiberoId && presentPlayers.length >= 7) {
    const sortedForLibero = [...presentPlayers].sort((a, b) => {
      const setsDiff = Number(matchSetsMap[a.id] || 0) - Number(matchSetsMap[b.id] || 0);
      if (setsDiff !== 0) return setsDiff;
      return (b.defenseLevel || 3) - (a.defenseLevel || 3);
    });
    selectedLibero =
      sortedForLibero.find(p => p.roles.includes('Libéro')) ||
      sortedForLibero.find(p => p.roles.includes('Polyvalent')) ||
      null;
  }

  const forbiddenOnCourtIds = new Set(designatedLiberoIds);
  if (selectedLibero) forbiddenOnCourtIds.add(selectedLibero.id);

  const candidateCourtPlayers = presentPlayers.filter(p => !forbiddenOnCourtIds.has(p.id));
  const sortedCandidates = [...candidateCourtPlayers].sort((a, b) =>
    comparePlayersByStrategy(a, b, matchSetsMap, strategy)
  );

  const requiredSlots = getRequiredSlots(setterSystem);
  const requireFemaleOnCourt = mode === 'Loisir' && candidateCourtPlayers.some(p => p.gender === 'F');

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
        if (requireFemaleOnCourt && !currentAssignments.some(a => a.player.gender === 'F')) {
          return;
        }
        bestSolution = currentAssignments;
        return;
      }

      const slot = requiredSlots[slotIdx];
      const tiers = allowDepannage ? ['Spécialiste', 'Polyvalent', 'Dépannage'] : ['Spécialiste', 'Polyvalent'];

      const slotCandidates = [...sortedCandidates].sort((a, b) => {
        const baseCmp = comparePlayersByStrategy(a, b, matchSetsMap, strategy);
        if (baseCmp !== 0) return baseCmp;
        return slot.row === 'front'
          ? (b.attackLevel || 3) - (a.attackLevel || 3)
          : (b.defenseLevel || 3) - (a.defenseLevel || 3);
      });

      for (const tier of tiers) {
        for (const candidate of slotCandidates) {
          if (usedIds.has(candidate.id)) continue;

          const roleCheck = canPlayRole(candidate, slot.targetRole, allowDepannage);
          if (!roleCheck.ok || roleCheck.matchType !== tier) continue;

          if (!currentAssignments.every(a => areCompatible(a.player, candidate))) continue;
          if (selectedLibero && !areCompatible(selectedLibero, candidate)) continue;

          usedIds.add(candidate.id);
          currentAssignments.push({ ...slot, player: candidate, matchType: tier });

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
      warnings.push('Certains postes ont été attribués en dépannage (spécialistes ou polyvalents indisponibles).');
    }
  }

  if (!solution) {
    warnings.push('Contraintes strictes impossibles à satisfaire simultanément. Proposition de la meilleure équipe disponible.');
    solution = sortedCandidates.slice(0, 6).map((candidate, idx) => {
      const slot = requiredSlots[idx];
      return {
        ...slot,
        player: candidate,
        matchType: candidate.roles.includes(slot.targetRole) ? 'Spécialiste' : 'Adapté'
      };
    });
  }

  const usedIds = new Set(solution.map(s => s.player.id));
  if (selectedLibero) usedIds.add(selectedLibero.id);
  const bench = presentPlayers.filter(p => !usedIds.has(p.id));

  const strategyMessages = {
    TIE_BREAK_MAX: "Set 5 (Tie-Break 2-2) : Priorité aux meilleures notes d'Attaque et de Défense.",
    STRONG_COMEBACK: `Set ${setNumber} (Score ${ourSets}-${theirSets}) — Priorité 2 : Composition forte alignée pour renverser le match.`,
    ROTATION_DEVELOPMENT: `Set ${setNumber} (Score ${ourSets}-${theirSets}) — Priorité 2 : Rotation privilégiée pour répartir le temps de jeu.`,
    BALANCED_PRIORITY_1: `Set ${setNumber} (Score ${ourSets}-${theirSets}) — Priorité 2 : Composition équilibrée basée sur la Priorité 1.`,
    PRIORITY_1: `Set ${setNumber} — Priorité 1 : Sélection selon l'équité, le ratio et le niveau individuel.`
  };
  explanations.push(strategyMessages[strategy]);

  if (selectedLibero) {
    explanations.push(`Libéro actif : ${selectedLibero.name} (Déf ★${selectedLibero.defenseLevel} • 0,5 set/set).`);
  } else {
    explanations.push("Configuration sans Libéro (possibilité d'en désigner un en cours de match s'il n'est jamais entré).");
  }

  return { court: solution, libero: selectedLibero, bench, warnings, explanations, strategy };
}

// ============================================================================
// 5. SOUS-COMPOSANTS UI DÉCOUPLÉS
// ============================================================================

function CourtPlayerCard({ slot, idx, isSelected, setsToday, isFrontRow, onSelect }) {
  if (!slot) return null;
  return (
    <div
      onClick={() => onSelect('court', idx)}
      className={`p-2.5 rounded-xl border text-center cursor-pointer transition relative ${
        isSelected
          ? 'bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400 scale-[1.02]'
          : 'bg-slate-900/85 border-slate-700/80 hover:border-emerald-500/50'
      }`}
    >
      <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
        <span
          className={`px-1.5 py-0.2 rounded font-bold ${
            slot.player.gender === 'F' ? 'bg-pink-500/20 text-pink-300' : 'bg-sky-500/20 text-sky-300'
          }`}
        >
          {slot.player.gender === 'F' ? 'F' : 'H'}
        </span>
        <span className={`${isFrontRow ? 'text-orange-300' : 'text-emerald-300'} font-bold`}>
          ⚔️{slot.player.attackLevel} 🛡️{slot.player.defenseLevel}
        </span>
      </div>
      <div className="font-bold text-xs text-white truncate">{slot.player.name}</div>
      <div className="text-[10px] text-amber-300/90 truncate mt-0.5">{slot.targetRole}</div>
      <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-between">
        <span>{slot.matchType}</span>
        <span className="text-indigo-300 font-semibold">{formatSets(setsToday)}s</span>
      </div>
    </div>
  );
}

// ============================================================================
// 6. COMPOSANT PRINCIPAL : VOLLEY MANAGER PRO
// ============================================================================

export default function VolleyManagerPro() {
  const [activeTab, setActiveTab] = useState('roster');

  const [players, setPlayers] = useState(() => {
    try {
      const saved =
        localStorage.getItem('vmp_players_v4') ||
        localStorage.getItem('vmp_players_v3') ||
        localStorage.getItem('vmp_players_v2');
      const parsed = saved ? JSON.parse(saved) : DEFAULT_ROSTER;
      return parsed.map(migratePlayer).filter(Boolean);
    } catch {
      return DEFAULT_ROSTER.map(migratePlayer);
    }
  });

  const [matchesHistory, setMatchesHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('vmp_matches_v4') || localStorage.getItem('vmp_matches_v3');
      return saved ? JSON.parse(saved) : DEFAULT_MATCH_HISTORY;
    } catch {
      return DEFAULT_MATCH_HISTORY;
    }
  });

  const [matchState, setMatchState] = useState(() => {
    try {
      const saved = localStorage.getItem('vmp_active_match_v4') || localStorage.getItem('vmp_active_match_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          lockedLiberoId: parsed.lockedLiberoId !== undefined ? parsed.lockedLiberoId : (parsed.libero?.id || null),
          enteredCourtIds: parsed.enteredCourtIds || (parsed.court ? parsed.court.map(c => c.player.id) : []),
          designatedLiberoIds: parsed.designatedLiberoIds || (parsed.libero ? [parsed.libero.id] : []),
          isScoreboardReversed: parsed.isScoreboardReversed || false,
          historyRecorded: parsed.historyRecorded || false,
          court: (parsed.court || []).map(c => ({ ...c, player: migratePlayer(c.player) })),
          bench: (parsed.bench || []).map(migratePlayer),
          libero: parsed.libero ? migratePlayer(parsed.libero) : null
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
      enteredCourtIds: [],
      designatedLiberoIds: [],
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

  // États des modales métier
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [swapSelection, setSwapSelection] = useState(null);
  const [nextSetModalOpen, setNextSetModalOpen] = useState(false);
  const [pendingNextSetSystem, setPendingNextSetSystem] = useState(1);
  const [confirmSeasonResetOpen, setConfirmSeasonResetOpen] = useState(false);
  const [liberoModalOpen, setLiberoModalOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLandscapeFullscreen, setIsLandscapeFullscreen] = useState(false);
  const [forceRotate90, setForceRotate90] = useState(false);

  // États du système de Sauvegarde & Restauration
  const [backupSettings, setBackupSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(BACKUP_SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      autoBackupEnabled: true,
      debounceSeconds: 2.5,
      periodicHours: 24
    };
  });
  const [backupsList, setBackupsList] = useState([]);
  const [lastBackupAt, setLastBackupAt] = useState(null);
  const [lastBackupError, setLastBackupError] = useState(null);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [dataManagerModalOpen, setDataManagerModalOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [backupToRestoreFromHistory, setBackupToRestoreFromHistory] = useState(null);

  const isSavingRef = useRef(false);
  const lastSavedHashRef = useRef('');
  const latestDataRef = useRef({ players, matchesHistory, matchState });
  const fileInputRef = useRef(null);

  useEffect(() => {
    latestDataRef.current = { players, matchesHistory, matchState };
  }, [players, matchesHistory, matchState]);

  const showToast = useCallback((msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Sauvegarde synchrone dans localStorage (données vives)
  useEffect(() => {
    try { localStorage.setItem('vmp_players_v4', JSON.stringify(players)); } catch {}
  }, [players]);

  useEffect(() => {
    try { localStorage.setItem('vmp_matches_v4', JSON.stringify(matchesHistory)); } catch {}
  }, [matchesHistory]);

  useEffect(() => {
    try { localStorage.setItem('vmp_active_match_v4', JSON.stringify(matchState)); } catch {}
  }, [matchState]);

  useEffect(() => {
    try { localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(backupSettings)); } catch {}
  }, [backupSettings]);

  // Fonction centrale d'exécution d'une sauvegarde avec verrou anti-concurrence et contrôle d'empreinte
  const performBackup = useCallback(
    async ({ triggerType = 'auto', label = '', force = false, silent = true } = {}) => {
      if (isSavingRef.current) return null;
      const { players: curPlayers, matchesHistory: curMatches, matchState: curMatchState } = latestDataRef.current;

      const currentHash = computeCanonicalDataHash(curPlayers, curMatches, curMatchState);
      if (!force && currentHash === lastSavedHashRef.current) {
        return null; // Aucune donnée n'a changé : évite les doublons inutiles
      }

      isSavingRef.current = true;
      setIsBackupRunning(true);

      try {
        const envelope = createBackupEnvelope({
          players: curPlayers,
          matchesHistory: curMatches,
          matchState: curMatchState,
          triggerType,
          label
        });

        const updatedList = await saveBackupToVault(envelope);
        lastSavedHashRef.current = currentHash;
        setBackupsList(updatedList);
        setLastBackupAt(envelope.createdAt);
        setLastBackupError(null);

        if (!silent) {
          showToast('Sauvegarde enregistrée et vérifiée avec succès.', 'success');
        }
        return envelope;
      } catch (err) {
        const errMsg = err?.message || 'Erreur lors de la création de la sauvegarde';
        setLastBackupError(`${formatDateTimeFr(new Date().toISOString())} : ${errMsg}`);
        if (!silent) {
          showToast(`Échec de la sauvegarde : ${errMsg}`, 'error');
        }
        return null;
      } finally {
        isSavingRef.current = false;
        setIsBackupRunning(false);
      }
    },
    [showToast]
  );

  // Chargement initial de l'historique des sauvegardes au démarrage + sauvegarde de démarrage si nécessaire
  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await getAllStoredBackups();
      if (!mounted) return;
      setBackupsList(stored);

      const latestSuccess = stored.find(b => b.status === 'success');
      if (latestSuccess) {
        setLastBackupAt(latestSuccess.createdAt);
        lastSavedHashRef.current = latestSuccess.dataHash || '';
      }

      const currentHash = computeCanonicalDataHash(
        latestDataRef.current.players,
        latestDataRef.current.matchesHistory,
        latestDataRef.current.matchState
      );

      // Si aucune sauvegarde n'existe ou que des modifications non sauvegardées sont détectées au démarrage
      if (backupSettings.autoBackupEnabled && (!latestSuccess || latestSuccess.dataHash !== currentHash)) {
        await performBackup({
          triggerType: 'auto',
          label: !latestSuccess ? 'Sauvegarde initiale au démarrage' : 'Synchronisation au démarrage',
          force: true,
          silent: true
        });
      }
    })();
    return () => { mounted = false; };
  }, []); // Exécuté une seule fois au montage

  // Déclenchement automatique avec regroupement (Debounce) après toute modification des données
  useEffect(() => {
    if (!backupSettings.autoBackupEnabled) return;
    const currentHash = computeCanonicalDataHash(players, matchesHistory, matchState);
    if (currentHash === lastSavedHashRef.current) return;

    const delayMs = Math.max(800, Number(backupSettings.debounceSeconds || 2.5) * 1000);
    const timer = setTimeout(() => {
      performBackup({
        triggerType: 'auto',
        label: 'Sauvegarde auto (modification des données)',
        force: false,
        silent: true
      });
    }, delayMs);

    return () => clearTimeout(timer);
  }, [players, matchesHistory, matchState, backupSettings.autoBackupEnabled, backupSettings.debounceSeconds, performBackup]);

  // Sauvegarde périodique (quotidienne) et lors de la mise en arrière-plan / fermeture sur iPhone
  useEffect(() => {
    if (!backupSettings.autoBackupEnabled) return;

    const handleVisibilityOrUnload = () => {
      if (document.visibilityState === 'hidden') {
        performBackup({
          triggerType: 'periodic',
          label: 'Sauvegarde auto (mise en arrière-plan)',
          force: false,
          silent: true
        });
      }
    };

    const intervalMs = 15 * 60 * 1000; // Vérification toutes les 15 minutes
    const intervalId = setInterval(() => {
      const hoursThreshold = Number(backupSettings.periodicHours || 24);
      const elapsedHours = lastBackupAt
        ? (Date.now() - new Date(lastBackupAt).getTime()) / 3600000
        : 999;

      if (elapsedHours >= hoursThreshold) {
        performBackup({
          triggerType: 'periodic',
          label: 'Sauvegarde périodique quotidienne',
          force: false,
          silent: true
        });
      }
    }, intervalMs);

    document.addEventListener('visibilitychange', handleVisibilityOrUnload);
    window.addEventListener('pagehide', handleVisibilityOrUnload);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      window.removeEventListener('pagehide', handleVisibilityOrUnload);
    };
  }, [backupSettings.autoBackupEnabled, backupSettings.periodicHours, lastBackupAt, performBackup]);

  // Exportation manuelle en fichier JSON téléchargeable
  const handleManualExportFile = async () => {
    const envelope = await performBackup({
      triggerType: 'manual',
      label: 'Exportation manuelle par l’utilisateur',
      force: true,
      silent: true
    });
    const backupToDownload =
      envelope ||
      createBackupEnvelope({
        players,
        matchesHistory,
        matchState,
        triggerType: 'manual',
        label: 'Exportation manuelle'
      });

    const fileName = triggerJsonFileDownload(backupToDownload);
    showToast(`Sauvegarde exportée : ${fileName}`, 'success');
  };

  // Sélection et analyse préalable d'un fichier de sauvegarde à importer
  const handleFileImportSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || ''));
        const validation = validateAndAnalyzeBackup(parsed);
        if (!validation.valid) {
          setLastBackupError(`Import rejeté : ${validation.error}`);
          showToast(validation.error, 'error');
          return;
        }
        setImportReport(null);
        setPendingImportData({
          fileName: file.name,
          envelope: parsed,
          validation
        });
      } catch {
        setLastBackupError('Import rejeté : Le fichier sélectionné n’est pas un fichier JSON valide.');
        showToast('Fichier invalide : impossible de lire le contenu JSON.', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Application atomique d'une RESTAURATION COMPLÈTE (depuis un fichier ou depuis l'historique IndexedDB)
  const executeFullRestore = async (targetEnvelope, createSafetyBackupFirst = true) => {
    const snapshotPrevPlayers = [...players];
    const snapshotPrevMatches = [...matchesHistory];
    const snapshotPrevMatchState = { ...matchState };

    try {
      const check = validateAndAnalyzeBackup(targetEnvelope);
      if (!check.valid) {
        throw new Error(check.error || 'Sauvegarde corrompue');
      }

      if (createSafetyBackupFirst) {
        await performBackup({
          triggerType: 'pre-restore',
          label: 'Sauvegarde de sécurité avant restauration complète',
          force: true,
          silent: true
        });
      }

      const rawPlayers = targetEnvelope.data.players.map(migratePlayer).filter(Boolean);
      const validPlayerIds = new Set(rawPlayers.map(p => p.id));

      // Nettoyage relationnel des incompatibilités
      const cleanedPlayers = rawPlayers.map(p => ({
        ...p,
        incompatibilities: (p.incompatibilities || []).filter(id => validPlayerIds.has(id) && id !== p.id)
      }));

      const restoredMatches = Array.isArray(targetEnvelope.data.matchesHistory)
        ? targetEnvelope.data.matchesHistory
        : [];

      // Recalcul de cohérence des statistiques tout en préservant les compteurs historiques s'ils sont supérieurs
      const synchronizedPlayers = recalculatePlayersStatsFromMatches(cleanedPlayers, restoredMatches, true);

      const restoredMatchState = targetEnvelope.data.matchState
        ? {
            ...targetEnvelope.data.matchState,
            court: (targetEnvelope.data.matchState.court || []).map(c => ({
              ...c,
              player: migratePlayer(c.player)
            })),
            bench: (targetEnvelope.data.matchState.bench || []).map(migratePlayer).filter(Boolean),
            libero: targetEnvelope.data.matchState.libero
              ? migratePlayer(targetEnvelope.data.matchState.libero)
              : null
          }
        : matchState;

      setPlayers(synchronizedPlayers);
      setMatchesHistory(restoredMatches);
      setMatchState(restoredMatchState);

      lastSavedHashRef.current = computeCanonicalDataHash(synchronizedPlayers, restoredMatches, restoredMatchState);
      setPendingImportData(null);
      setBackupToRestoreFromHistory(null);
      setImportReport({
        mode: 'Restauration complète',
        playersImported: synchronizedPlayers.length,
        playersIgnored: 0,
        matchesImported: restoredMatches.length,
        matchesIgnored: 0,
        details: 'Toutes les données (joueurs, matchs, compositions et statistiques) ont été intégralement restaurées.'
      });
      showToast('Restauration complète effectuée avec succès !', 'success');
    } catch (err) {
      // Rollback transactionnel : les données initiales restent intactes
      setPlayers(snapshotPrevPlayers);
      setMatchesHistory(snapshotPrevMatches);
      setMatchState(snapshotPrevMatchState);
      showToast(`Erreur lors de la restauration (données initiales préservées) : ${err.message}`, 'error');
    }
  };

  // Application atomique d'une IMPORTATION COMPLÉMENTAIRE (fusion sans écrasement + détection des doublons)
  const executeComplementaryImport = async (targetEnvelope) => {
    const snapshotPrevPlayers = [...players];
    const snapshotPrevMatches = [...matchesHistory];

    try {
      const check = validateAndAnalyzeBackup(targetEnvelope);
      if (!check.valid) throw new Error(check.error);

      const incomingPlayers = targetEnvelope.data.players.map(migratePlayer).filter(Boolean);
      const incomingMatches = Array.isArray(targetEnvelope.data.matchesHistory)
        ? targetEnvelope.data.matchesHistory
        : [];

      const existingById = new Map(players.map(p => [p.id, p]));
      const existingByName = new Map(players.map(p => [p.name.trim().toLowerCase(), p]));

      // Table de correspondance des IDs pour préserver les relations si un doublon de nom avait un autre ID
      const idRemap = {};
      const addedPlayers = [];
      let ignoredPlayersCount = 0;

      incomingPlayers.forEach(incP => {
        const normName = incP.name.trim().toLowerCase();
        if (existingById.has(incP.id)) {
          idRemap[incP.id] = incP.id;
          ignoredPlayersCount++;
        } else if (existingByName.has(normName)) {
          const matchedExisting = existingByName.get(normName);
          idRemap[incP.id] = matchedExisting.id;
          ignoredPlayersCount++;
        } else {
          idRemap[incP.id] = incP.id;
          addedPlayers.push(incP);
          existingById.set(incP.id, incP);
          existingByName.set(normName, incP);
        }
      });

      const mergedPlayersRaw = [...players, ...addedPlayers];
      const allValidPlayerIds = new Set(mergedPlayersRaw.map(p => p.id));

      // Remappage des incompatibilités sur les joueurs importés
      const mergedPlayersCleaned = mergedPlayersRaw.map(p => {
        const remappedInc = (p.incompatibilities || [])
          .map(oldId => idRemap[oldId] || oldId)
          .filter(id => allValidPlayerIds.has(id) && id !== p.id);
        return { ...p, incompatibilities: Array.from(new Set(remappedInc)) };
      });

      // Détection des doublons de matchs (par ID ou par signature Date + Adversaire + Score)
      const existingMatchIds = new Set(matchesHistory.map(m => m.id));
      const existingMatchSignatures = new Set(
        matchesHistory.map(
          m => `${String(m.date).slice(0, 10)}_${String(m.opponentName).trim().toLowerCase()}_${m.ourSets}-${m.theirSets}`
        )
      );

      const addedMatches = [];
      let ignoredMatchesCount = 0;

      incomingMatches.forEach(incM => {
        const sig = `${String(incM.date).slice(0, 10)}_${String(incM.opponentName).trim().toLowerCase()}_${incM.ourSets}-${incM.theirSets}`;
        if (existingMatchIds.has(incM.id) || existingMatchSignatures.has(sig)) {
          ignoredMatchesCount++;
          return;
        }

        // Remappage des IDs joueurs dans le match importé
        const remappedPresentIds = Array.from(
          new Set((incM.presentPlayerIds || []).map(oldId => idRemap[oldId] || oldId).filter(id => allValidPlayerIds.has(id)))
        );
        const remappedSetsMap = {};
        Object.entries(incM.playerSetsMap || {}).forEach(([oldId, setsVal]) => {
          const targetId = idRemap[oldId] || oldId;
          if (allValidPlayerIds.has(targetId)) {
            remappedSetsMap[targetId] = Number(remappedSetsMap[targetId] || 0) + Number(setsVal || 0);
          }
        });

        addedMatches.push({
          ...incM,
          presentPlayerIds: remappedPresentIds,
          playerSetsMap: remappedSetsMap
        });
        existingMatchIds.add(incM.id);
        existingMatchSignatures.add(sig);
      });

      const finalMatches = [...addedMatches, ...matchesHistory].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const finalPlayers = recalculatePlayersStatsFromMatches(mergedPlayersCleaned, finalMatches, true);

      setPlayers(finalPlayers);
      setMatchesHistory(finalMatches);
      setPendingImportData(null);
      setImportReport({
        mode: 'Importation complémentaire',
        playersImported: addedPlayers.length,
        playersIgnored: ignoredPlayersCount,
        matchesImported: addedMatches.length,
        matchesIgnored: ignoredMatchesCount,
        details: `${addedPlayers.length} nouveau(x) joueur(s) et ${addedMatches.length} nouveau(x) match(s) ajoutés. Doublons ignorés : ${ignoredPlayersCount} joueur(s), ${ignoredMatchesCount} match(s).`
      });

      showToast(
        `Import terminé : +${addedPlayers.length} joueur(s), +${addedMatches.length} match(s).`,
        'success'
      );
    } catch (err) {
      setPlayers(snapshotPrevPlayers);
      setMatchesHistory(snapshotPrevMatches);
      showToast(`Erreur lors de l'importation complémentaire : ${err.message}`, 'error');
    }
  };

  const presentPlayers = useMemo(
    () => players.filter(p => matchState.presentIds.includes(p.id)),
    [players, matchState.presentIds]
  );

  const presentFemalesCount = useMemo(
    () => presentPlayers.filter(p => p.gender === 'F').length,
    [presentPlayers]
  );

  const courtAverages = useMemo(() => {
    const count = matchState.court?.length || 0;
    if (count === 0) return { attackAvg: '0,0', defenseAvg: '0,0' };

    const totalAttack = matchState.court.reduce(
      (sum, slot) => sum + Number(slot.player?.attackLevel ?? slot.player?.level ?? 0),
      0
    );
    const totalDefense = matchState.court.reduce(
      (sum, slot) => sum + Number(slot.player?.defenseLevel ?? slot.player?.level ?? 0),
      0
    );

    return {
      attackAvg: formatAverage(totalAttack / count),
      defenseAvg: formatAverage(totalDefense / count)
    };
  }, [matchState.court]);

  const globalTeamStats = useMemo(() => computeGlobalTeamStats(matchesHistory), [matchesHistory]);

  const eligibleBenchForLibero = useMemo(() => {
    const enteredSet = new Set(matchState.enteredCourtIds || []);
    return matchState.bench.filter(p => !enteredSet.has(p.id));
  }, [matchState.bench, matchState.enteredCourtIds]);

  const handleSavePlayer = (formData) => {
    const combinedLevel = Number(((Number(formData.attackLevel) + Number(formData.defenseLevel)) / 2).toFixed(1));
    const enrichedData = { ...formData, level: combinedLevel };

    let updatedPlayers;
    if (editingPlayer) {
      updatedPlayers = players.map(p => {
        if (p.id === editingPlayer.id) return { ...p, ...enrichedData };
        const shouldBeIncompatible = formData.incompatibilities.includes(p.id);
        const currentInc = new Set(p.incompatibilities || []);
        if (shouldBeIncompatible) currentInc.add(editingPlayer.id);
        else currentInc.delete(editingPlayer.id);
        return { ...p, incompatibilities: Array.from(currentInc) };
      });
      showToast(`${formData.name} mis à jour (Att ★${formData.attackLevel} / Déf ★${formData.defenseLevel}).`, 'success');
    } else {
      const newId = 'p_' + Date.now();
      const newPlayer = { id: newId, ...enrichedData, historyMatches: 0, historySets: 0 };
      updatedPlayers = players.map(p =>
        formData.incompatibilities.includes(p.id)
          ? { ...p, incompatibilities: [...(p.incompatibilities || []), newId] }
          : p
      );
      updatedPlayers.push(newPlayer);
      showToast(`${formData.name} ajouté à l'effectif.`, 'success');
    }

    const mapUpdatedPlayer = (pl) => updatedPlayers.find(u => u.id === pl.id) || pl;
    setMatchState(prev => ({
      ...prev,
      court: prev.court.map(slot => ({ ...slot, player: mapUpdatedPlayer(slot.player) })),
      bench: prev.bench.map(mapUpdatedPlayer),
      libero: prev.libero ? mapUpdatedPlayer(prev.libero) : null
    }));

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

    setPlayers(updated);
    setMatchState(prev => ({
      ...prev,
      presentIds: prev.presentIds.filter(id => id !== playerId),
      bench: prev.bench.filter(p => p.id !== playerId),
      libero: prev.libero?.id === playerId ? null : prev.libero,
      lockedLiberoId: prev.lockedLiberoId === playerId ? 'NONE' : prev.lockedLiberoId
    }));
    if (target) showToast(`${target.name} supprimé.`, 'info');
  };

  const handleResetSeason = async () => {
    await performBackup({
      triggerType: 'pre-restore',
      label: 'Sauvegarde de sécurité avant Reset Saison',
      force: true,
      silent: true
    });
    setPlayers(players.map(p => ({ ...p, historyMatches: 0, historySets: 0 })));
    setMatchesHistory([]);
    setMatchState(prev => ({
      ...prev,
      isActive: false,
      currentSet: 1,
      ourScore: 0,
      theirScore: 0,
      ourSets: 0,
      theirSets: 0,
      setsHistory: [],
      matchSetsPlayed: {},
      enteredCourtIds: [],
      designatedLiberoIds: [],
      court: [],
      libero: null,
      bench: [],
      historyRecorded: false
    }));
    setConfirmSeasonResetOpen(false);
    showToast('Nouvelle saison initialisée (une sauvegarde de sécurité a été créée).', 'success');
  };

  const handleConfirmDeleteMatch = () => {
    if (!matchToDelete) return;
    const remainingMatches = matchesHistory.filter(m => m.id !== matchToDelete.id);
    setMatchesHistory(remainingMatches);
    setPlayers(recalculatePlayersStatsFromMatches(players, remainingMatches));
    setMatchToDelete(null);
    showToast(`Match contre ${matchToDelete.opponentName} supprimé. Statistiques recalculées.`, 'success');
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

    const initialSetsPlayed = {};
    matchState.presentIds.forEach(id => { initialSetsPlayed[id] = 0; });

    let effectiveLockedLiberoId = matchState.lockedLiberoId;
    if (effectiveLockedLiberoId && effectiveLockedLiberoId !== 'NONE' && !matchState.presentIds.includes(effectiveLockedLiberoId)) {
      effectiveLockedLiberoId = null;
    }

    const lineup = generateOptimalLineup({
      presentPlayers,
      setterSystem: matchState.setterSystem,
      mode: matchState.mode,
      setNumber: 1,
      ourSets: 0,
      theirSets: 0,
      matchSetsMap: initialSetsPlayed,
      lockedLiberoId: effectiveLockedLiberoId,
      designatedLiberoIds: []
    });

    const finalLockedLiberoId =
      effectiveLockedLiberoId === 'NONE' ? 'NONE' : lineup.libero ? lineup.libero.id : 'NONE';

    setMatchState({
      ...matchState,
      isActive: true,
      lockedLiberoId: finalLockedLiberoId,
      enteredCourtIds: lineup.court.map(c => c.player.id),
      designatedLiberoIds: lineup.libero ? [lineup.libero.id] : [],
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
    });

    setActiveTab('live');
    showToast(
      lineup.libero
        ? `Match lancé ! Libéro : ${lineup.libero.name}.`
        : 'Match lancé sans Libéro ! Vous pourrez en désigner un en cours de match.',
      'success'
    );
  };

  const handleRemoveLibero = () => {
    if (!matchState.libero) return;
    const removedLibero = matchState.libero;
    const alreadyOnBench = matchState.bench.some(p => p.id === removedLibero.id);

    setSwapSelection(null);
    setMatchState({
      ...matchState,
      libero: null,
      lockedLiberoId: 'NONE',
      bench: alreadyOnBench ? matchState.bench : [...matchState.bench, removedLibero]
    });
    showToast(`${removedLibero.name} retiré du poste de Libéro.`, 'info');
  };

  const handleSelectMidMatchLibero = (candidatePlayer) => {
    if ((matchState.enteredCourtIds || []).includes(candidatePlayer.id)) {
      showToast(`Impossible : ${candidatePlayer.name} est déjà entré sur le terrain durant ce match.`, 'error');
      return;
    }

    const courtPlayers = matchState.court.map(c => c.player);
    if (!isGroupCompatible([...courtPlayers, candidatePlayer])) {
      showToast('Impossible : incompatibilité détectée avec un joueur sur le terrain.', 'error');
      return;
    }

    setMatchState({
      ...matchState,
      libero: candidatePlayer,
      lockedLiberoId: candidatePlayer.id,
      designatedLiberoIds: Array.from(new Set([...(matchState.designatedLiberoIds || []), candidatePlayer.id])),
      bench: matchState.bench.filter(p => p.id !== candidatePlayer.id)
    });
    setLiberoModalOpen(false);
    showToast(`${candidatePlayer.name} est désormais désigné Libéro pour le match !`, 'success');
  };

  const rotateCourtClockwise = () => {
    if (!matchState.court || matchState.court.length !== 6) return;
    const byPos = {};
    matchState.court.forEach(item => { byPos[item.pos] = item; });

    const rotated = matchState.court.map(slot => {
      const sourcePos = ROTATION_RECEIVE_FROM[slot.pos];
      const incoming = byPos[sourcePos];
      return {
        ...slot,
        targetRole: incoming.targetRole,
        label: incoming.label,
        player: incoming.player,
        matchType: incoming.matchType
      };
    });

    setSwapSelection(null);
    setMatchState({ ...matchState, court: rotated });
    showToast('Rotation horaire effectuée.', 'info');
  };

  const handlePlayerSlotTap = (zone, indexOrId) => {
    if (zone === 'libero') {
      showToast('Le Libéro ne peut pas occuper un poste sur le terrain.', 'error');
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
      if (ref.zone === 'court') return nextCourt[ref.indexOrId]?.player;
      if (ref.zone === 'bench') return nextBench.find(p => p.id === ref.indexOrId);
      return null;
    };

    const pA = getPlayerFromRef(swapSelection);
    const pB = getPlayerFromRef({ zone, indexOrId });

    if (!pA || !pB) {
      setSwapSelection(null);
      return;
    }

    const designatedLiberos = new Set(matchState.designatedLiberoIds || []);
    if (currentLibero) designatedLiberos.add(currentLibero.id);

    if (
      (swapSelection.zone === 'court' && designatedLiberos.has(pB.id)) ||
      (zone === 'court' && designatedLiberos.has(pA.id))
    ) {
      showToast('Action refusée : un joueur désigné Libéro ne peut occuper aucun autre poste pendant le match.', 'error');
      setSwapSelection(null);
      return;
    }

    if (swapSelection.zone === 'court' && zone === 'court') {
      const slotA = nextCourt[swapSelection.indexOrId];
      const slotB = nextCourt[indexOrId];
      nextCourt[swapSelection.indexOrId] = {
        ...slotA,
        player: slotB.player,
        targetRole: slotB.targetRole,
        label: slotB.label,
        matchType: slotB.matchType
      };
      nextCourt[indexOrId] = {
        ...slotB,
        player: slotA.player,
        targetRole: slotA.targetRole,
        label: slotA.label,
        matchType: slotA.matchType
      };
    } else {
      const assignPlayerToRef = (ref, newPlayer) => {
        if (ref.zone === 'court') {
          const slot = nextCourt[ref.indexOrId];
          nextCourt[ref.indexOrId] = {
            ...slot,
            player: newPlayer,
            matchType: getPlayerMatchTypeForRole(newPlayer, slot.targetRole)
          };
        } else if (ref.zone === 'bench') {
          nextBench = nextBench.map(p => (p.id === ref.indexOrId ? newPlayer : p));
        }
      };
      assignPlayerToRef(swapSelection, pB);
      assignPlayerToRef({ zone, indexOrId }, pA);
    }

    const activeGroup = [...nextCourt.map(c => c.player), ...(currentLibero ? [currentLibero] : [])];
    if (!isGroupCompatible(activeGroup)) {
      showToast('Échange refusé : incompatibilité relationnelle ou technique détectée !', 'error');
      setSwapSelection(null);
      return;
    }

    if (matchState.mode === 'Loisir' && presentFemalesCount > 0 && !nextCourt.some(c => c.player.gender === 'F')) {
      showToast('Échange refusé : au moins 1 femme doit rester sur le terrain en mode Loisir !', 'error');
      setSwapSelection(null);
      return;
    }

    const updatedEnteredCourtIds = Array.from(
      new Set([...(matchState.enteredCourtIds || []), ...nextCourt.map(c => c.player.id)])
    );

    setMatchState({
      ...matchState,
      court: nextCourt,
      bench: nextBench,
      enteredCourtIds: updatedEnteredCourtIds
    });
    setSwapSelection(null);
    showToast(`Remplacement : ${pA.name} ⇄ ${pB.name}`, 'success');
  };

  const matchFinished = matchState.ourSets === 3 || matchState.theirSets === 3;
  const targetPoints = matchState.currentSet === 5 ? 15 : 25;

  const isSetScoreValidToFinish = () => {
    const { ourScore, theirScore } = matchState;
    return Math.max(ourScore, theirScore) >= targetPoints && Math.abs(ourScore - theirScore) >= 2;
  };

  const applyScoreSuggestion = (leftVal, rightVal) => {
    if (matchFinished) return;
    setMatchState(prev => ({
      ...prev,
      ourScore: prev.isScoreboardReversed ? rightVal : leftVal,
      theirScore: prev.isScoreboardReversed ? leftVal : rightVal
    }));
    showToast(`Score suggéré appliqué : ${leftVal} - ${rightVal}`, 'info');
  };

  const handleOpenValidateSetModal = () => {
    if (!isSetScoreValidToFinish()) {
      showToast(`Validation impossible : il faut au minimum ${targetPoints} points et 2 points d'écart.`, 'error');
      return;
    }
    setPendingNextSetSystem(matchState.setterSystem);
    setNextSetModalOpen(true);
  };

  const recordMatchInHistory = (ourSetsFinal, theirSetsFinal, setsHistoryFinal, matchSetsPlayedFinal) => {
    const newMatchRecord = {
      id: 'match_' + Date.now(),
      date: new Date().toISOString(),
      teamName: matchState.teamName,
      opponentName: matchState.opponentName,
      ourSets: ourSetsFinal,
      theirSets: theirSetsFinal,
      mode: matchState.mode,
      presentPlayerIds: [...matchState.presentIds],
      playerSetsMap: { ...matchSetsPlayedFinal },
      setsHistory: setsHistoryFinal
    };
    const nextMatchesHistory = [newMatchRecord, ...matchesHistory];
    setMatchesHistory(nextMatchesHistory);
    setPlayers(recalculatePlayersStatsFromMatches(players, nextMatchesHistory));
  };

  const handleConfirmValidateSet = () => {
    if (!isSetScoreValidToFinish()) return;

    const ourWon = matchState.ourScore > matchState.theirScore;
    const nextOurSets = matchState.ourSets + (ourWon ? 1 : 0);
    const nextTheirSets = matchState.theirSets + (ourWon ? 0 : 1);

    const courtPlayerIds = new Set(matchState.court.map(c => c.player.id));
    const activeLiberoId = matchState.libero?.id || null;

    const updatedMatchSetsPlayed = { ...matchState.matchSetsPlayed };
    courtPlayerIds.forEach(id => {
      updatedMatchSetsPlayed[id] = Number(updatedMatchSetsPlayed[id] || 0) + 1;
    });
    if (activeLiberoId) {
      updatedMatchSetsPlayed[activeLiberoId] = Number(updatedMatchSetsPlayed[activeLiberoId] || 0) + 0.5;
    }

    const newSetRecord = {
      setNumber: matchState.currentSet,
      ourScore: matchState.ourScore,
      theirScore: matchState.theirScore,
      winner: ourWon ? 'us' : 'them',
      lineupNames: matchState.court.map(c => c.player.name),
      liberoName: matchState.libero?.name || null
    };

    const updatedSetsHistory = [...matchState.setsHistory, newSetRecord];
    const matchIsOver = nextOurSets === 3 || nextTheirSets === 3;

    if (matchIsOver) {
      recordMatchInHistory(nextOurSets, nextTheirSets, updatedSetsHistory, updatedMatchSetsPlayed);
      setMatchState({
        ...matchState,
        ourSets: nextOurSets,
        theirSets: nextTheirSets,
        setsHistory: updatedSetsHistory,
        matchSetsPlayed: updatedMatchSetsPlayed,
        historyRecorded: true
      });
      setNextSetModalOpen(false);
      setIsLandscapeFullscreen(false);
      showToast(
        nextOurSets === 3
          ? `Victoire ${nextOurSets}-${nextTheirSets} enregistrée !`
          : `Fin du match (${nextOurSets}-${nextTheirSets}) enregistrée.`,
        'success'
      );
      return;
    }

    const nextSetNumber = matchState.currentSet + 1;
    const nextLockedLiberoId = activeLiberoId || 'NONE';

    const nextLineup = generateOptimalLineup({
      presentPlayers,
      setterSystem: pendingNextSetSystem,
      mode: matchState.mode,
      setNumber: nextSetNumber,
      ourSets: nextOurSets,
      theirSets: nextTheirSets,
      matchSetsMap: updatedMatchSetsPlayed,
      lockedLiberoId: nextLockedLiberoId,
      designatedLiberoIds: matchState.designatedLiberoIds || []
    });

    const updatedEnteredCourtIds = Array.from(
      new Set([...(matchState.enteredCourtIds || []), ...nextLineup.court.map(c => c.player.id)])
    );

    setMatchState({
      ...matchState,
      setterSystem: pendingNextSetSystem,
      lockedLiberoId: nextLockedLiberoId,
      enteredCourtIds: updatedEnteredCourtIds,
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
    });

    setNextSetModalOpen(false);
    showToast(`Set ${nextSetNumber} généré (${nextOurSets}-${nextTheirSets}).`, 'success');
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
    recordMatchInHistory(matchState.ourSets, matchState.theirSets, matchState.setsHistory, matchState.matchSetsPlayed);
    setMatchState({ ...matchState, historyRecorded: true });
    showToast('Match enregistré et statistiques mises à jour !', 'success');
  };

  const toggleReverseScoreboard = () => {
    setMatchState(prev => ({ ...prev, isScoreboardReversed: !prev.isScoreboardReversed }));
  };

  const ourTeamPanel = {
    isUs: true,
    name: matchState.teamName,
    score: matchState.ourScore,
    sets: matchState.ourSets,
    alert: getTeamPointAlert(matchState.ourScore, matchState.theirScore, matchState.ourSets, matchState.currentSet),
    colorClass: 'text-indigo-400',
    alertClass: 'bg-indigo-500/25 border-indigo-400 text-indigo-200',
    btnPlusClass: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20',
    onIncrement: () => setMatchState(prev => ({ ...prev, ourScore: prev.ourScore + 1 })),
    onDecrement: () => setMatchState(prev => ({ ...prev, ourScore: Math.max(0, prev.ourScore - 1) }))
  };

  const theirTeamPanel = {
    isUs: false,
    name: matchState.opponentName,
    score: matchState.theirScore,
    sets: matchState.theirSets,
    alert: getTeamPointAlert(matchState.theirScore, matchState.ourScore, matchState.theirSets, matchState.currentSet),
    colorClass: 'text-rose-400',
    alertClass: 'bg-rose-500/25 border-rose-400 text-rose-200',
    btnPlusClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20',
    onIncrement: () => setMatchState(prev => ({ ...prev, theirScore: prev.theirScore + 1 })),
    onDecrement: () => setMatchState(prev => ({ ...prev, theirScore: Math.max(0, prev.theirScore - 1) }))
  };

  const leftSide = matchState.isScoreboardReversed ? theirTeamPanel : ourTeamPanel;
  const rightSide = matchState.isScoreboardReversed ? ourTeamPanel : theirTeamPanel;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center select-none font-sans">
      {/* Input fichier caché pour l'importation JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileImportSelect}
        className="hidden"
      />

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
                  : `${players.length} joueurs • ${backupsList.length} sauv.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDataManagerModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 active:scale-95 transition relative"
              title="Gestion des données & Sauvegardes"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Données</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  lastBackupError
                    ? 'bg-rose-500'
                    : backupSettings.autoBackupEnabled
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
              />
            </button>
          </div>
        </header>

        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm animate-bounce">
            <div
              className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-medium ${
                toastMessage.type === 'error'
                  ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
                  : toastMessage.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-800/95 border-slate-600 text-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{toastMessage.msg}</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-24 px-3.5 pt-3 space-y-4">

          {/* ONGLET 1 : EFFECTIF */}
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
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                              player.gender === 'F'
                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}
                          >
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

                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                                <Sword className="w-3 h-3" />
                                Att : {player.attackLevel}/5
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Shield className="w-3 h-3" />
                                Déf : {player.defenseLevel}/5
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

          {/* ONGLET 2 : PRÉSENCE & SETUP */}
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
                    <option value="NONE">Aucun (Jouer sans libéro / Désigner plus tard)</option>
                    <option value="">Auto (Désigné par l'algorithme au lancement)</option>
                    {presentPlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.roles.join(', ')}) — Déf ★{p.defenseLevel}
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
                      onClick={() =>
                        setMatchState({
                          ...matchState,
                          presentIds: [],
                          lockedLiberoId: matchState.lockedLiberoId === 'NONE' ? 'NONE' : null
                        })
                      }
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
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                              isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                              <span>{player.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded ${
                                  player.gender === 'F' ? 'bg-pink-500/20 text-pink-300' : 'bg-sky-500/20 text-sky-300'
                                }`}
                              >
                                {player.gender === 'F' ? 'F' : 'H'}
                              </span>
                              {isDesignatedLibero && isChecked && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> Libéro
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] opacity-75">
                              {player.roles.join(', ')} • Att ★{player.attackLevel} / Déf ★{player.defenseLevel}
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

          {/* ONGLET 3 : MATCH LIVE */}
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
                  {/* SCOREBOARD */}
                  <div className="bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 rounded-2xl p-3.5 shadow-xl">
                    <div className="flex items-center justify-between mb-2 gap-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        {matchState.currentSet === 5 && <Flame className="w-3 h-3 text-amber-400" />}
                        Set {matchState.currentSet} {matchState.currentSet === 5 ? '(Tie-Break 15 pts)' : '(25 pts • 2 pts écart)'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={toggleReverseScoreboard}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-[11px] font-semibold text-slate-200 flex items-center gap-1 active:scale-95 transition"
                        >
                          <ArrowLeftRight className="w-3 h-3 text-indigo-400" />
                          <span>Inverser</span>
                        </button>
                        <button
                          onClick={() => setIsLandscapeFullscreen(true)}
                          className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-[11px] font-semibold text-indigo-200 flex items-center gap-1 active:scale-95 transition"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Paysage</span>
                        </button>
                      </div>
                    </div>

                    {(leftSide.alert || rightSide.alert) && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {[leftSide, rightSide].map((side, i) => (
                          <div key={i}>
                            {side.alert && (
                              <div
                                className={`px-2 py-1 rounded-lg text-center text-[10px] font-black uppercase tracking-wider animate-pulse border ${
                                  side.alert === 'BALLE DE MATCH'
                                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                                    : side.alertClass
                                }`}
                              >
                                ⚡ {side.alert} ({side.name})
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-11 items-center gap-1.5 my-1">
                      {[leftSide, null, rightSide].map((side, idx) => {
                        if (!side) {
                          return (
                            <div key="center-sets" className="col-span-1 flex flex-col items-center justify-center px-0.5">
                              <div className="text-[10px] uppercase text-slate-400 font-semibold">Sets</div>
                              <div className="text-sm font-black text-white my-1 tabular-nums whitespace-nowrap">
                                {leftSide.sets} - {rightSide.sets}
                              </div>
                              <div className="text-[9px] text-slate-500 whitespace-nowrap">min {targetPoints}</div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={idx}
                            className="col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl px-2 py-3 text-center flex flex-col justify-between overflow-hidden"
                          >
                            <div className="text-xs font-bold text-slate-300 truncate px-1">{side.name}</div>
                            <div
                              onClick={!matchFinished ? side.onIncrement : undefined}
                              className={`text-[4.5rem] leading-none font-black my-2.5 tabular-nums tracking-tight cursor-pointer select-none ${side.colorClass}`}
                            >
                              {side.score}
                            </div>
                            <div className="flex justify-center gap-1.5 mt-1">
                              <button
                                onClick={side.onDecrement}
                                disabled={matchFinished}
                                className="w-10 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-base active:scale-90 disabled:opacity-40"
                              >
                                -
                              </button>
                              <button
                                onClick={side.onIncrement}
                                disabled={matchFinished}
                                className={`flex-1 h-9 rounded-xl font-bold text-sm active:scale-95 disabled:opacity-40 ${side.btnPlusClass}`}
                              >
                                +1
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!matchFinished && (
                      <div className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 shrink-0">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Scores rapides :</span>
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            onClick={() => applyScoreSuggestion(25, 20)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 text-[11px] font-bold text-indigo-300 active:scale-95 transition"
                          >
                            25-20
                          </button>
                          <button
                            onClick={() => applyScoreSuggestion(20, 25)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-600/30 border border-slate-700 hover:border-rose-500/50 text-[11px] font-bold text-rose-300 active:scale-95 transition"
                          >
                            20-25
                          </button>
                          {matchState.currentSet === 5 && (
                            <>
                              <button
                                onClick={() => applyScoreSuggestion(15, 10)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 text-[11px] font-bold text-indigo-300 active:scale-95 transition"
                              >
                                15-10
                              </button>
                              <button
                                onClick={() => applyScoreSuggestion(10, 15)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-600/30 border border-slate-700 text-[11px] font-bold text-rose-300 active:scale-95 transition"
                              >
                                10-15
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

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
                        disabled={!isSetScoreValidToFinish()}
                        className={`w-full mt-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                          isSetScoreValidToFinish()
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.98]'
                            : 'bg-slate-800/70 text-slate-500 border border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>
                          {isSetScoreValidToFinish()
                            ? `Valider le Set ${matchState.currentSet} (${matchState.ourScore}-${matchState.theirScore})`
                            : `Valider le Set (${targetPoints} pts min & 2 pts d'écart requis)`}
                        </span>
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

                  {/* TERRAIN DE VOLLEY-BALL : DISPOSITION IMPÉRATIVE & MOYENNES DYNAMIQUES */}
                  <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <span>Terrain (6 Joueurs)</span>
                          <span className="text-[10px] font-normal text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                            {matchState.setterSystem === 1 ? '1 Passeur' : '2 Passeurs'}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Touchez 2 joueurs pour échanger leurs places
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
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/85 border border-orange-500/40">
                        <span className="text-[11px] font-bold text-orange-300 flex items-center gap-1.5">
                          <Sword className="w-3.5 h-3.5 text-orange-400" />
                          <span>Moyenne offensive (6 joueurs)</span>
                        </span>
                        <span className="text-xs font-black text-white bg-orange-500/20 px-2.5 py-0.5 rounded-lg border border-orange-500/40 tabular-nums">
                          {courtAverages.attackAvg} / 5
                        </span>
                      </div>

                      {/* Ligne avant (1re ligne, de gauche à droite) : P4 (Central), P3 (R4), P2 (Passeur) */}
                      <div className="grid grid-cols-3 gap-2">
                        {FRONT_ROW_POSITIONS.map(posCode => {
                          const idx = matchState.court.findIndex(c => c.pos === posCode);
                          const slot = matchState.court[idx];
                          return (
                            <CourtPlayerCard
                              key={posCode}
                              slot={slot}
                              idx={idx}
                              isSelected={swapSelection?.zone === 'court' && swapSelection?.indexOrId === idx}
                              setsToday={slot ? matchState.matchSetsPlayed[slot.player.id] || 0 : 0}
                              isFrontRow={true}
                              onSelect={handlePlayerSlotTap}
                            />
                          );
                        })}
                      </div>

                      <div className="border-t border-emerald-500/30 my-1"></div>

                      {/* Ligne arrière (2e ligne, de gauche à droite) : P5 (Passeur/Pointu), P6 (R4), P1 (Central) */}
                      <div className="grid grid-cols-3 gap-2">
                        {BACK_ROW_POSITIONS.map(posCode => {
                          const idx = matchState.court.findIndex(c => c.pos === posCode);
                          const slot = matchState.court[idx];
                          return (
                            <CourtPlayerCard
                              key={posCode}
                              slot={slot}
                              idx={idx}
                              isSelected={swapSelection?.zone === 'court' && swapSelection?.indexOrId === idx}
                              setsToday={slot ? matchState.matchSetsPlayed[slot.player.id] || 0 : 0}
                              isFrontRow={false}
                              onSelect={handlePlayerSlotTap}
                            />
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/85 border border-emerald-500/40">
                        <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Moyenne défensive (6 joueurs)</span>
                        </span>
                        <span className="text-xs font-black text-white bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-500/40 tabular-nums">
                          {courtAverages.defenseAvg} / 5
                        </span>
                      </div>
                    </div>

                    {/* SECTION LIBÉRO */}
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
                              <span className="text-[10px] text-emerald-300 shrink-0">🛡️Déf {matchState.libero.defenseLevel}/5</span>
                            </div>
                            <div className="text-[10px] text-rose-300/90">
                              {formatSets(matchState.matchSetsPlayed[matchState.libero.id] || 0)} set(s) • Non inclus dans les moyennes terrain
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleRemoveLibero}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-[11px] font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Retirer</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setLiberoModalOpen(true)}
                        className="p-3 rounded-xl border border-dashed border-rose-500/40 bg-rose-950/10 hover:bg-rose-950/25 flex items-center justify-between cursor-pointer active:scale-[0.99] transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-rose-200">
                              Aucun Libéro actif — Désigner un Libéro
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {eligibleBenchForLibero.length > 0
                                ? `${eligibleBenchForLibero.length} joueur(s) éligible(s) (jamais entré sur le terrain)`
                                : 'Aucun joueur du banc éligible (tous ont déjà joué sur le terrain)'}
                            </div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold shrink-0">
                          Choisir
                        </span>
                      </div>
                    )}

                    {/* BANC DES REMPLAÇANTS */}
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
                            const wasLibero = (matchState.designatedLiberoIds || []).includes(p.id);
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
                                    <span
                                      className={`text-[9px] px-1 rounded ${
                                        p.gender === 'F' ? 'bg-pink-500/20 text-pink-300' : 'bg-sky-500/20 text-sky-300'
                                      }`}
                                    >
                                      {p.gender === 'F' ? 'F' : 'H'}
                                    </span>
                                    {wasLibero && (
                                      <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-300">Lib</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    ⚔️{p.attackLevel} 🛡️{p.defenseLevel} • {p.roles.join(', ')}
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

          {/* ONGLET 4 : STATISTIQUES, HISTORIQUE & GESTION DES DONNÉES */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* Carte dédiée : Gestion des données & Sauvegardes */}
              <div className="bg-gradient-to-br from-indigo-950/50 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white">Gestion des Données & Sauvegardes</h2>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      backupSettings.autoBackupEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {backupSettings.autoBackupEnabled ? 'Auto-Save Actif' : 'Auto-Save Désactivé'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <div>
                    Dernière sauvegarde réussie : <strong className="text-white">{formatDateTimeFr(lastBackupAt)}</strong>
                  </div>
                  <div className="text-slate-400">
                    {backupsList.length} version(s) conservée(s) dans le coffre IndexedDB ({players.length} joueurs, {matchesHistory.length} matchs)
                  </div>
                </div>

                {lastBackupError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-[11px] text-rose-200 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{lastBackupError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleManualExportFile}
                    className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/25 active:scale-95 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter (.json)</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Importer / Restaurer</span>
                  </button>
                </div>

                <button
                  onClick={() => setDataManagerModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-indigo-300 flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Ouvrir l'historique des sauvegardes & paramètres ({backupsList.length})</span>
                </button>
              </div>

              <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Bilan Global de l'Équipe</span>
                </h2>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Matchs</div>
                    <div className="text-base font-black text-white">{globalTeamStats.totalMatches}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <div className="text-[10px] text-emerald-300">Victoires</div>
                    <div className="text-base font-black text-emerald-400">{globalTeamStats.wins}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30">
                    <div className="text-[10px] text-rose-300">Défaites</div>
                    <div className="text-base font-black text-rose-400">{globalTeamStats.losses}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
                    <div className="text-[10px] text-indigo-300">Sets G/P</div>
                    <div className="text-sm font-black text-indigo-300">{globalTeamStats.setsWon}-{globalTeamStats.setsLost}</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span>Historique des Matchs ({matchesHistory.length})</span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      La suppression d'un match recalcule toutes les statistiques
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
                    Aucun match enregistré. Toutes les statistiques de saison sont à zéro.
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
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">vs {m.opponentName}</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      won
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    }`}
                                  >
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

                              <div className="flex items-center gap-2">
                                <div
                                  className={`text-base font-black px-3 py-1 rounded-xl border tabular-nums whitespace-nowrap ${
                                    won
                                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                                      : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                                  }`}
                                >
                                  {m.ourSets} - {m.theirSets}
                                </div>
                                <button
                                  onClick={() => setMatchToDelete(m)}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-rose-400 active:scale-95 transition"
                                  title="Supprimer ce match et recalculer les statistiques"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
                            <span className="text-[10px] text-slate-400">
                              ⚔️{player.attackLevel} 🛡️{player.defenseLevel}
                            </span>
                          </div>
                          <span className="text-slate-300 font-semibold">
                            {formatSets(setsPlayedToday)} / {matchState.setsHistory.length} set(s) ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct >= 65 ? 'bg-emerald-500' : pct >= 35 ? 'bg-indigo-500' : 'bg-amber-500'
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
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Classement & Statistiques Individuelles</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Synchronisé avec les matchs enregistrés et le score du match
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                        <th className="py-2 pr-2">#</th>
                        <th className="py-2 pr-2">Joueur</th>
                        <th className="py-2 px-2 text-center">Notes</th>
                        <th className="py-2 px-2 text-center">Sets Jour</th>
                        <th className="py-2 pl-2 text-right">Saison (Ratio)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {[...presentPlayers]
                        .sort((a, b) =>
                          comparePlayersByStrategy(
                            a,
                            b,
                            matchState.matchSetsPlayed,
                            getSelectionStrategy(matchState.currentSet, matchState.ourSets, matchState.theirSets)
                          )
                        )
                        .map((player, idx) => {
                          const setsToday = matchState.matchSetsPlayed[player.id] || 0;
                          const ratio = getHistoricalRatio(player).toFixed(2);
                          return (
                            <tr key={player.id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 pr-2 font-bold text-indigo-400">{idx + 1}</td>
                              <td className="py-2.5 pr-2">
                                <div className="font-bold text-white">{player.name}</div>
                                <div className="text-[10px] text-slate-400">
                                  {player.isCorpo ? 'Corpo' : player.isTitulaire ? 'Titulaire' : 'Régulier'}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                <span className="text-orange-300 font-semibold">⚔️{player.attackLevel}</span>{' '}
                                <span className="text-emerald-300 font-semibold">🛡️{player.defenseLevel}</span>
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-amber-300">
                                {formatSets(setsToday)}
                              </td>
                              <td className="py-2.5 pl-2 text-right">
                                <div className="font-bold text-slate-200">{ratio}</div>
                                <div className="text-[10px] text-slate-500">
                                  {formatSets(player.historySets)}s / {player.historyMatches}m
                                </div>
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

        {/* BARRE DE NAVIGATION BASSE */}
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

        {/* MODALE : CENTRE DE GESTION DES DONNÉES, SAUVEGARDES AUTOMATIQUES & RESTAURATION */}
        {dataManagerModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      Sauvegardes & Restauration
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Coffre IndexedDB indépendant & Export JSON externe
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDataManagerModalOpen(false);
                    setPendingImportData(null);
                    setBackupToRestoreFromHistory(null);
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Compte-rendu d'importation / restauration */}
              {importReport && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Opération réussie : {importReport.mode}</span>
                    </span>
                    <button onClick={() => setImportReport(null)} className="text-slate-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-200">{importReport.details}</p>
                </div>
              )}

              {/* Panneau de confirmation avant Importation / Restauration d'un fichier sélectionné */}
              {pendingImportData && (
                <div className="p-4 rounded-2xl bg-indigo-950/40 border-2 border-indigo-500/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                      <FileJson className="w-4 h-4 text-indigo-400" />
                      <span>Fichier vérifié : {pendingImportData.fileName}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Intégrité OK
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <div>Joueurs contenus : <strong className="text-white">{pendingImportData.validation.summary.playersCount}</strong></div>
                    <div>Matchs contenus : <strong className="text-white">{pendingImportData.validation.summary.matchesCount}</strong></div>
                    <div className="col-span-2 text-slate-400">
                      Créée le : {formatDateTimeFr(pendingImportData.validation.summary.createdAt)} (v{pendingImportData.validation.summary.schemaVersion})
                    </div>
                  </div>

                  {pendingImportData.validation.anomalies.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[10px] text-amber-200 space-y-1">
                      <div className="font-bold">Remarques détectées :</div>
                      {pendingImportData.validation.anomalies.map((anom, i) => (
                        <div key={i}>• {anom}</div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-bold text-white">Choisissez le mode d'application :</div>

                    {/* Mode B : Importation complémentaire (sans écrasement) */}
                    <button
                      onClick={() => executeComplementaryImport(pendingImportData.envelope)}
                      className="w-full p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-left transition active:scale-[0.99]"
                    >
                      <div className="text-xs font-bold">1. Importation complémentaire (Recommandé)</div>
                      <div className="text-[10px] opacity-90 mt-0.5">
                        Ajoute uniquement les nouveaux joueurs et matchs sans écraser vos données actuelles. Détecte et ignore les doublons.
                      </div>
                    </button>

                    {/* Mode A : Restauration complète (remplacement avec sauvegarde de sécurité auto) */}
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
                      <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>2. Restauration complète (Remplacement total)</span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        Attention : remplace toutes les données actuelles par celles du fichier. Une sauvegarde de sécurité de vos données actuelles sera créée automatiquement avant l'opération.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleManualExportFile}
                          className="flex-1 py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 border border-slate-700"
                        >
                          Télécharger copie actuelle
                        </button>
                        <button
                          onClick={() => executeFullRestore(pendingImportData.envelope, true)}
                          className="flex-1 py-2 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-[10px] font-bold text-white"
                        >
                          Confirmer remplacement
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setPendingImportData(null)}
                      className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Actions principales : Exporter / Importer / Sauvegarde immédiate */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Actions manuelles
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleManualExportFile}
                    className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex flex-col items-center gap-1 shadow-lg shadow-indigo-600/25 active:scale-95 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exporter une sauvegarde</span>
                    <span className="text-[9px] font-normal opacity-80">Fichier .json complet</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex flex-col items-center gap-1 active:scale-95 transition"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Importer un fichier</span>
                    <span className="text-[9px] font-normal text-slate-400">Restaurer ou fusionner</span>
                  </button>
                </div>

                <button
                  onClick={() =>
                    performBackup({
                      triggerType: 'manual',
                      label: 'Sauvegarde immédiate déclenchée manuellement',
                      force: true,
                      silent: false
                    })
                  }
                  disabled={isBackupRunning}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-indigo-300 flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isBackupRunning ? 'Sauvegarde en cours...' : 'Lancer une sauvegarde interne immédiate'}</span>
                </button>
              </div>

              {/* Paramètres de sauvegarde automatique */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Sauvegarde automatique</div>
                    <div className="text-[10px] text-slate-400">
                      Après chaque modification, en arrière-plan et périodiquement
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setBackupSettings(prev => ({
                        ...prev,
                        autoBackupEnabled: !prev.autoBackupEnabled
                      }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      backupSettings.autoBackupEnabled
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {backupSettings.autoBackupEnabled ? 'Activée' : 'Désactivée'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Délai regroupement (Debounce)</label>
                    <select
                      value={backupSettings.debounceSeconds}
                      onChange={e =>
                        setBackupSettings(prev => ({ ...prev, debounceSeconds: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value={1.5}>Rapide (1,5 sec)</option>
                      <option value={2.5}>Standard (2,5 sec)</option>
                      <option value={5}>Économique (5 sec)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Fréquence périodique</label>
                    <select
                      value={backupSettings.periodicHours}
                      onChange={e =>
                        setBackupSettings(prev => ({ ...prev, periodicHours: Number(e.target.value) }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value={6}>Toutes les 6h</option>
                      <option value={12}>Toutes les 12h</option>
                      <option value={24}>Quotidienne (24h)</option>
                    </select>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                  <span>Dernière sauvegarde réussie :</span>
                  <strong className="text-slate-200">{formatDateTimeFr(lastBackupAt)}</strong>
                </div>
              </div>

              {/* Historique des sauvegardes internes (Politique 7 quotidiennes / 4 hebdomadaires / 1 mensuelle) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Historique des sauvegardes ({backupsList.length})
                  </label>
                  <span className="text-[10px] text-slate-400">Rétention : 7j / 4 sem. / 1 mois</span>
                </div>

                {backupToRestoreFromHistory && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 space-y-2">
                    <div className="text-xs font-bold text-rose-200">
                      Confirmer la restauration du point du {formatDateTimeFr(backupToRestoreFromHistory.createdAt)} ?
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Vos données actuelles seront sauvegardées automatiquement avant de restaurer cette version ({backupToRestoreFromHistory.playersCount} joueurs, {backupToRestoreFromHistory.matchesCount} matchs).
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBackupToRestoreFromHistory(null)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-semibold"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => executeFullRestore(backupToRestoreFromHistory, true)}
                        className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold"
                      >
                        Restaurer maintenant
                      </button>
                    </div>
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5">
                  {backupsList.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-4 text-center">
                      Aucune sauvegarde dans l'historique.
                    </div>
                  ) : (
                    backupsList.map(bkp => (
                      <div
                        key={bkp.id}
                        className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white">{formatDateTimeFr(bkp.createdAt)}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                bkp.triggerType === 'manual'
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : bkp.triggerType === 'pre-restore'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {bkp.triggerType === 'manual'
                                ? 'Manuelle'
                                : bkp.triggerType === 'pre-restore'
                                ? 'Sécurité'
                                : 'Automatique'}
                            </span>
                            {bkp.retentionTier && (
                              <span className="text-[9px] text-slate-400">({bkp.retentionTier})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{bkp.playersCount} joueurs</span>
                            <span>•</span>
                            <span>{bkp.matchesCount} matchs</span>
                            <span>•</span>
                            <span className={bkp.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                              {bkp.status === 'success' ? '✓ Réussie' : '✗ Échouée'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => triggerJsonFileDownload(bkp)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Télécharger ce point de sauvegarde en fichier .json"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setBackupToRestoreFromHistory(bkp)}
                            className="px-2 py-1.5 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 text-[10px] font-bold"
                          >
                            Restaurer
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={() => setDataManagerModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* SCOREBOARD EN MODE PAYSAGE PLEIN ÉCRAN */}
        {isLandscapeFullscreen && (
          <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-3 sm:p-4 select-none overflow-hidden">
            <div
              className={
                forceRotate90
                  ? 'w-[100vh] h-[100vw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 flex flex-col justify-between p-4 bg-slate-950'
                  : 'w-full h-full flex flex-col justify-between'
              }
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs whitespace-nowrap">
                    SET {matchState.currentSet} • Min. {targetPoints} pts
                  </span>
                  <div className="flex items-center gap-1.5">
                    {matchState.setsHistory.map(s => (
                      <span
                        key={s.setNumber}
                        className="px-2 py-0.5 rounded bg-slate-800 text-xs font-bold text-slate-300 whitespace-nowrap"
                      >
                        S{s.setNumber}: {matchState.isScoreboardReversed ? `${s.theirScore}-${s.ourScore}` : `${s.ourScore}-${s.theirScore}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={toggleReverseScoreboard}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5 active:scale-95"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Inverser</span>
                  </button>
                  <button
                    onClick={() => setForceRotate90(!forceRotate90)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 ${
                      forceRotate90
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>90°</span>
                  </button>
                  <button
                    onClick={() => { setIsLandscapeFullscreen(false); setForceRotate90(false); }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Quitter</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-12 items-center gap-3 my-2 min-h-0">
                {[leftSide, null, rightSide].map((side, idx) => {
                  if (!side) {
                    return (
                      <div key="landscape-sets" className="col-span-2 flex flex-col items-center justify-center gap-1.5 px-1">
                        <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">SETS</div>
                        <div className="px-2.5 py-1.5 rounded-2xl bg-slate-900 border border-slate-700 text-xl sm:text-2xl font-black text-white tabular-nums whitespace-nowrap shrink-0">
                          {leftSide.sets} - {rightSide.sets}
                        </div>
                        {isSetScoreValidToFinish() && !matchFinished && (
                          <button
                            onClick={() => {
                              setIsLandscapeFullscreen(false);
                              setForceRotate90(false);
                              handleOpenValidateSetModal();
                            }}
                            className="mt-2 px-2.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-[11px] text-center shadow-lg animate-pulse whitespace-nowrap"
                          >
                            Valider Set
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="col-span-5 h-full bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-3 flex flex-col justify-between items-center overflow-hidden"
                    >
                      <div className="w-full flex items-center justify-between px-1 gap-2 shrink-0">
                        <span className="text-base sm:text-lg font-extrabold text-slate-200 truncate">{side.name}</span>
                        {side.alert && (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap animate-pulse border ${
                              side.alert === 'BALLE DE MATCH'
                                ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                                : side.alertClass
                            }`}
                          >
                            {side.alert}
                          </span>
                        )}
                      </div>

                      <div
                        onClick={!matchFinished ? side.onIncrement : undefined}
                        className={`text-[7.5rem] sm:text-[9rem] leading-none font-black tabular-nums tracking-tight cursor-pointer select-none my-auto ${side.colorClass}`}
                      >
                        {side.score}
                      </div>

                      <div className="w-full grid grid-cols-3 gap-2 shrink-0">
                        <button
                          onClick={side.onDecrement}
                          disabled={matchFinished}
                          className="col-span-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-lg active:scale-95 disabled:opacity-40"
                        >
                          -1
                        </button>
                        <button
                          onClick={side.onIncrement}
                          disabled={matchFinished}
                          className={`col-span-2 py-2.5 rounded-2xl font-black text-lg active:scale-95 disabled:opacity-40 ${side.btnPlusClass}`}
                        >
                          +1 PT
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MODALE : SÉLECTION D'UN LIBÉRO EN COURS DE MATCH */}
        {liberoModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Désigner un Libéro</span>
                </h3>
                <button onClick={() => setLiberoModalOpen(false)} className="text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Règle officielle : seuls les joueurs du banc qui <strong>ne sont jamais entrés sur le terrain</strong> depuis le début du match peuvent être désignés Libéro.
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {matchState.bench.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4">
                    Aucun joueur disponible sur le banc.
                  </div>
                ) : (
                  matchState.bench.map(p => {
                    const hasEnteredCourt = (matchState.enteredCourtIds || []).includes(p.id);
                    return (
                      <button
                        key={p.id}
                        disabled={hasEnteredCourt}
                        onClick={() => handleSelectMidMatchLibero(p)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                          hasEnteredCourt
                            ? 'bg-slate-950/50 border-slate-800/70 opacity-50 cursor-not-allowed'
                            : 'bg-slate-800/70 hover:bg-rose-950/30 border-slate-700 hover:border-rose-500/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{p.name}</span>
                            <span className="text-[10px] text-emerald-300">🛡️Déf {p.defenseLevel}/5</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {hasEnteredCourt
                              ? '⛔ Déjà entré sur le terrain durant ce match (inéligible)'
                              : `Postes : ${p.roles.join(', ')} • Éligible Libéro`}
                          </div>
                        </div>
                        {!hasEnteredCourt && (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold">
                            Désigner
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => setLiberoModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* MODALE : CONFIRMATION DE SUPPRESSION D'UN MATCH ENREGISTRÉ */}
        {matchToDelete && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold text-white">Supprimer ce match ?</h3>
              </div>
              <p className="text-xs text-slate-300">
                Vous êtes sur le point de supprimer le match contre <strong>{matchToDelete.opponentName}</strong> ({matchToDelete.ourSets} - {matchToDelete.theirSets}).
              </p>
              <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                Les statistiques individuelles des joueurs (matchs joués, sets joués, ratios) et les statistiques globales de l'équipe seront immédiatement recalculées à partir des seuls matchs restants.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setMatchToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmDeleteMatch}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Supprimer & Recalculer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE : FORMULAIRE JOUEUR */}
        {playerModalOpen && (
          <PlayerFormModal
            player={editingPlayer}
            allPlayers={players}
            onClose={() => { setPlayerModalOpen(false); setEditingPlayer(null); }}
            onSave={handleSavePlayer}
          />
        )}

        {/* MODALE : VALIDATION DE SET */}
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
                <div>• Adaptation automatique de la composition selon le score des sets (Priorité 1 & 2).</div>
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

        {/* MODALE : RESET SAISON */}
        {confirmSeasonResetOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4">
              <h3 className="text-base font-bold text-white">Réinitialiser la saison ?</h3>
              <p className="text-xs text-slate-400">
                Tous les compteurs de matchs, de sets joués et l'historique des rencontres seront remis à zéro. Vos joueurs et leurs notes d'attaque/défense seront conservés. Une sauvegarde de sécurité sera créée automatiquement avant l'opération.
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
  const [attackLevel, setAttackLevel] = useState(player?.attackLevel ?? player?.level ?? 3);
  const [defenseLevel, setDefenseLevel] = useState(player?.defenseLevel ?? player?.level ?? 3);
  const [roles, setRoles] = useState(player?.roles || ['R4']);
  const [statusType, setStatusType] = useState(
    player?.isCorpo ? 'corpo' : player?.isTitulaire ? 'titulaire' : 'normal'
  );
  const [incompatibilities, setIncompatibilities] = useState(player?.incompatibilities || []);

  const toggleRole = (role) => {
    if (roles.includes(role)) {
      if (roles.length > 1) setRoles(roles.filter(r => r !== role));
    } else {
      setRoles([...roles, role]);
    }
  };

  const toggleIncompatibility = (otherId) => {
    setIncompatibilities(prev =>
      prev.includes(otherId) ? prev.filter(id => id !== otherId) : [...prev, otherId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      gender,
      attackLevel: Number(attackLevel),
      defenseLevel: Number(defenseLevel),
      roles,
      isTitulaire: statusType === 'titulaire',
      isCorpo: statusType === 'corpo',
      incompatibilities
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
          <label className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
            <Sword className="w-3.5 h-3.5 text-orange-400" />
            <span>Note d'attaque : <strong className="text-orange-300">{attackLevel} / 5</strong></span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setAttackLevel(n)}
                className={`py-2 rounded-xl border text-xs font-bold ${
                  attackLevel === n
                    ? 'bg-orange-500/25 border-orange-400 text-orange-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {n} ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Note de défense : <strong className="text-emerald-300">{defenseLevel} / 5</strong></span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setDefenseLevel(n)}
                className={`py-2 rounded-xl border text-xs font-bold ${
                  defenseLevel === n
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
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
          <label className="text-[11px] text-slate-400 block mb-1.5">Statut Priorité</label>
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
