import { getCardDef } from "./cards";
import type {
  BoardMinion,
  HeroId,
  HsAction,
  HsCardDef,
  HsEffect,
  HsMatch,
  PlayerState,
} from "./types";

let _seq = 0;
function uid(prefix: string) {
  _seq += 1;
  return `${prefix}_${_seq}_${Math.random().toString(36).slice(2, 7)}`;
}

function shuffle<T>(arr: T[], seed = Math.random()): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneMatch(m: HsMatch): HsMatch {
  return structuredClone(m);
}

function opponent(i: 0 | 1): 0 | 1 {
  return i === 0 ? 1 : 0;
}

function createMinion(def: HsCardDef): BoardMinion {
  const keywords = [...def.keywords];
  const charge = keywords.includes("charge");
  const rush = keywords.includes("rush");
  return {
    instanceId: uid("m"),
    cardId: def.id,
    attack: def.attack ?? 0,
    health: def.health ?? 1,
    maxHealth: def.health ?? 1,
    keywords,
    slept: !charge,
    canAttack: charge || rush,
    attacksThisTurn: 0,
    divineShield: keywords.includes("divine_shield"),
    stealth: keywords.includes("stealth"),
    rush: rush && !charge,
    exhausted: !(charge || rush),
    lifesteal: keywords.includes("lifesteal"),
  };
}

function createPlayer(
  id: string,
  name: string,
  heroId: HeroId,
  deckIds: string[],
): PlayerState {
  return {
    id,
    name,
    heroId,
    hp: 30,
    armor: 0,
    mana: 0,
    maxMana: 0,
    deck: shuffle(deckIds),
    hand: [],
    board: [],
    weapon: null,
    secrets: [],
    heroPowerUsed: false,
    heroAttackedThisTurn: false,
    fatigue: 0,
  };
}

function drawCard(p: PlayerState, n = 1, log: string[]) {
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      p.fatigue += 1;
      damageHero(p, p.fatigue, log, "Únava");
      continue;
    }
    const id = p.deck.pop()!;
    if (p.hand.length >= 10) {
      log.push(`${p.name} přetáhl kartu (burn).`);
    } else {
      p.hand.push(id);
    }
  }
}

function damageHero(p: PlayerState, amount: number, log: string[], why: string) {
  let left = amount;
  if (p.armor > 0) {
    const use = Math.min(p.armor, left);
    p.armor -= use;
    left -= use;
  }
  p.hp -= left;
  log.push(`${why}: ${p.name} −${amount} → HP ${Math.max(0, p.hp)}`);
}

function damageMinion(m: BoardMinion, amount: number, log: string[]): boolean {
  if (amount <= 0) return false;
  if (m.divineShield) {
    m.divineShield = false;
    log.push(`${getReadable(m.cardId)}: Divine Shield pryč`);
    return false;
  }
  m.health -= amount;
  return m.health <= 0;
}

function getReadable(cardId: string) {
  try {
    return getCardDef(cardId).name;
  } catch {
    return cardId;
  }
}

function healHero(p: PlayerState, amount: number, log: string[]) {
  const before = p.hp;
  p.hp = Math.min(30, p.hp + amount);
  log.push(`${p.name} +${p.hp - before} HP`);
}

function removeDead(match: HsMatch, extra: HsCardDef[], side: 0 | 1) {
  const p = match.players[side]!;
  const dead = p.board.filter((m) => m.health <= 0);
  p.board = p.board.filter((m) => m.health > 0);
  for (const m of dead) {
    match.log.push(`† ${getReadable(m.cardId)}`);
    const def = getCardDef(m.cardId, extra);
    runEffects(
      match,
      extra,
      side,
      def.effects?.filter((e) => e.when === "deathrattle") ?? [],
      m.instanceId,
    );
  }
}

function checkWinner(match: HsMatch) {
  const p0 = match.players[0]!.hp <= 0;
  const p1 = match.players[1]!.hp <= 0;
  if (p0 && p1) {
    match.phase = "ended";
    match.winner = opponent(match.active);
  } else if (p0) {
    match.phase = "ended";
    match.winner = 1;
  } else if (p1) {
    match.phase = "ended";
    match.winner = 0;
  }
}

function runEffects(
  match: HsMatch,
  extra: HsCardDef[],
  side: 0 | 1,
  effects: HsEffect[],
  _sourceInstanceId?: string,
  targetInstanceId?: string,
  attackerInstanceId?: string,
) {
  const me = match.players[side]!;
  const foe = match.players[opponent(side)]!;
  for (const fx of effects) {
    switch (fx.op) {
      case "noop":
        break;
      case "draw":
        drawCard(me, fx.amount ?? 1, match.log);
        break;
      case "heal_hero":
        healHero(me, fx.amount ?? 0, match.log);
        break;
      case "armor":
        me.armor += fx.amount ?? 0;
        match.log.push(`${me.name} +${fx.amount} armor`);
        break;
      case "damage_enemy_hero":
        damageHero(foe, fx.amount ?? 0, match.log, "Kouzlo");
        break;
      case "gain_mana_crystal": {
        // The Coin: temporary mana this turn only
        me.mana = Math.min(10, me.mana + (fx.amount ?? 1));
        match.log.push(`${me.name} +${fx.amount ?? 1} mana (dočasná)`);
        break;
      }
      case "summon": {
        if (me.board.length >= 7) break;
        const def = getCardDef(fx.cardId!, extra);
        me.board.push(createMinion(def));
        match.log.push(`Summon: ${def.name}`);
        break;
      }
      case "heal_random_friendly_minion": {
        if (me.board.length === 0) break;
        const t = me.board[Math.floor(Math.random() * me.board.length)]!;
        t.health = Math.min(t.maxHealth, t.health + (fx.amount ?? 0));
        break;
      }
      case "debuff_enemy_minion": {
        const board = foe.board;
        if (board.length === 0) break;
        const t =
          (targetInstanceId &&
            board.find((m) => m.instanceId === targetInstanceId)) ||
          board[0]!;
        t.attack = Math.max(0, t.attack + (fx.attack ?? 0));
        t.health += fx.health ?? 0;
        t.maxHealth += fx.health ?? 0;
        if (t.health <= 0) removeDead(match, extra, opponent(side));
        break;
      }
      case "buff_friendly_minion": {
        const t = me.board.find((m) => m.instanceId === targetInstanceId);
        if (!t) break;
        t.attack += fx.attack ?? 0;
        t.health += fx.health ?? 0;
        t.maxHealth += fx.health ?? 0;
        break;
      }
      case "aoe_enemy_minions": {
        for (const m of [...foe.board]) {
          damageMinion(m, fx.amount ?? 0, match.log);
        }
        removeDead(match, extra, opponent(side));
        break;
      }
      case "damage_enemy_minion": {
        const t = foe.board.find((m) => m.instanceId === targetInstanceId);
        if (!t) throw new Error("Vyber cíl.");
        damageMinion(t, fx.amount ?? 0, match.log);
        removeDead(match, extra, opponent(side));
        break;
      }
      case "destroy_minion_leq_health": {
        const t = foe.board.find((m) => m.instanceId === targetInstanceId);
        if (!t) throw new Error("Vyber cíl.");
        if (t.health <= (fx.amount ?? 0)) {
          t.health = 0;
          removeDead(match, extra, opponent(side));
        } else {
          throw new Error("Cíl má moc HP.");
        }
        break;
      }
      case "damage_attacker": {
        if (!attackerInstanceId) break;
        const t = foe.board.find((m) => m.instanceId === attackerInstanceId);
        if (t) {
          damageMinion(t, fx.amount ?? 0, match.log);
          removeDead(match, extra, opponent(side));
        }
        break;
      }
      default:
        match.log.push(`Neznámý efekt ${fx.op}`);
    }
  }
  checkWinner(match);
}

function triggerSecrets(
  match: HsMatch,
  extra: HsCardDef[],
  defenderSide: 0 | 1,
  trigger: "on_attacked" | "on_spell" | "on_minion_played",
  attackerInstanceId?: string,
) {
  const def = match.players[defenderSide]!;
  const fired: typeof def.secrets = [];
  for (const secret of def.secrets) {
    if (secret.trigger !== trigger) continue;
    const card = getCardDef(secret.cardId, extra);
    match.log.push(`Secret! ${card.name}`);
    runEffects(
      match,
      extra,
      defenderSide,
      card.effects ?? [],
      undefined,
      undefined,
      attackerInstanceId,
    );
    fired.push(secret);
    break;
  }
  def.secrets = def.secrets.filter((s) => !fired.includes(s));
}

function refreshAttackers(p: PlayerState) {
  for (const m of p.board) {
    m.slept = false;
    m.rush = false;
    m.attacksThisTurn = 0;
    m.exhausted = false;
    m.canAttack = m.attack > 0;
  }
}

function startTurn(match: HsMatch, _extra: HsCardDef[]) {
  const p = match.players[match.active]!;
  p.maxMana = Math.min(10, p.maxMana + 1);
  p.mana = p.maxMana;
  p.heroPowerUsed = false;
  p.heroAttackedThisTurn = false;
  refreshAttackers(p);
  drawCard(p, 1, match.log);
  match.log.push(`—— Tah ${match.turn}: ${p.name} (${p.mana} mana) ——`);
}

export function createMatch(opts: {
  id?: string;
  p0: { id: string; name: string; heroId: HeroId; deck: string[] };
  p1: { id: string; name: string; heroId: HeroId; deck: string[] };
  extraCards?: HsCardDef[];
}): HsMatch {
  const match: HsMatch = {
    id: opts.id ?? uid("match"),
    players: [
      createPlayer(opts.p0.id, opts.p0.name, opts.p0.heroId, opts.p0.deck),
      createPlayer(opts.p1.id, opts.p1.name, opts.p1.heroId, opts.p1.deck),
    ],
    active: 0,
    turn: 1,
    phase: "play",
    winner: null,
    log: ["Zápas začíná."],
  };
  // HS opening: first 3, second 4 + The Coin
  drawCard(match.players[0]!, 3, match.log);
  drawCard(match.players[1]!, 4, match.log);
  if (match.players[1]!.hand.length < 10) {
    match.players[1]!.hand.push("the_coin");
  }
  match.players[0]!.maxMana = 0;
  match.players[1]!.maxMana = 0;
  startTurn(match, opts.extraCards ?? []);
  return match;
}

function legalAttackTargets(foe: PlayerState): Array<"hero" | string> {
  const taunts = foe.board.filter(
    (m) => m.keywords.includes("taunt") && !m.stealth,
  );
  if (taunts.length) return taunts.map((m) => m.instanceId);
  return [
    "hero",
    ...foe.board.filter((m) => !m.stealth).map((m) => m.instanceId),
  ];
}

function canMinionAttackTarget(
  attacker: BoardMinion,
  target: "hero" | string,
): boolean {
  if (attacker.attack <= 0) return false;
  if (attacker.exhausted && !attacker.canAttack) return false;
  const maxAttacks = attacker.keywords.includes("windfury") ? 2 : 1;
  if (attacker.attacksThisTurn >= maxAttacks) return false;
  if (!attacker.canAttack) return false;
  // Rush while slept: minions only
  if (attacker.slept && attacker.rush && target === "hero") return false;
  // Full summoning sickness (no charge/rush)
  if (attacker.slept && !attacker.rush && !attacker.keywords.includes("charge")) {
    return false;
  }
  return true;
}

function needsPlayTarget(def: HsCardDef): HsEffect["needsTarget"] | null {
  const fx = def.effects?.find((e) => e.needsTarget);
  return fx?.needsTarget ?? null;
}

export function applyAction(
  matchInput: HsMatch,
  action: HsAction,
  extraCards: HsCardDef[] = [],
): HsMatch {
  const match = cloneMatch(matchInput);
  if (match.phase === "ended") return match;
  const side = match.active;
  const me = match.players[side]!;
  const foe = match.players[opponent(side)]!;

  switch (action.type) {
    case "end_turn": {
      match.active = opponent(side);
      match.turn += 1;
      startTurn(match, extraCards);
      break;
    }
    case "hero_power": {
      if (me.heroPowerUsed) throw new Error("Hero power už použit.");
      if (me.mana < 2) throw new Error("Málo many.");
      me.mana -= 2;
      me.heroPowerUsed = true;
      if (me.heroId === "nevychovanec") {
        damageHero(foe, 1, match.log, "Hero power");
      } else if (me.heroId === "vychovanec") {
        healHero(me, 2, match.log);
      } else {
        me.armor += 2;
        match.log.push("Hero power: +2 armor");
      }
      break;
    }
    case "play_card": {
      const cardId = me.hand[action.handIndex];
      if (!cardId) throw new Error("Neplatná karta v ruce.");
      const def = getCardDef(cardId, extraCards);
      if (def.cost > me.mana) throw new Error("Málo many.");

      const need = needsPlayTarget(def);
      if (need === "enemy_minion" || need === "any_minion") {
        if (!action.targetInstanceId) throw new Error("Vyber cíl.");
        const boards = need === "enemy_minion" ? foe.board : [...me.board, ...foe.board];
        if (!boards.some((m) => m.instanceId === action.targetInstanceId)) {
          throw new Error("Neplatný cíl.");
        }
      }
      if (need === "friendly_minion") {
        if (!action.targetInstanceId) throw new Error("Vyber spojenecký cíl.");
        if (!me.board.some((m) => m.instanceId === action.targetInstanceId)) {
          throw new Error("Neplatný cíl.");
        }
      }

      me.mana -= def.cost;
      me.hand.splice(action.handIndex, 1);

      if (def.type === "minion") {
        if (me.board.length >= 7) throw new Error("Stůl je plný.");
        const minion = createMinion(def);
        me.board.push(minion);
        match.log.push(`${me.name} hraje ${def.name}`);
        runEffects(
          match,
          extraCards,
          side,
          def.effects?.filter((e) => e.when === "battlecry") ?? [],
          minion.instanceId,
          action.targetInstanceId,
        );
        triggerSecrets(match, extraCards, opponent(side), "on_minion_played");
      } else if (def.type === "spell") {
        match.log.push(`${me.name}: ${def.name}`);
        triggerSecrets(match, extraCards, opponent(side), "on_spell");
        if (match.winner !== null) break;
        runEffects(
          match,
          extraCards,
          side,
          def.effects?.filter((e) => e.when === "play") ?? [],
          undefined,
          action.targetInstanceId,
        );
      } else if (def.type === "weapon") {
        me.weapon = {
          cardId: def.id,
          attack: def.attack ?? 0,
          durability: def.health ?? 1,
        };
        match.log.push(`${me.name} vyzbrojuje ${def.name}`);
      } else if (def.type === "secret") {
        if (me.secrets.length >= 5) throw new Error("Max 5 secretů.");
        if (me.secrets.some((s) => s.cardId === def.id)) {
          throw new Error("Stejný secret už máš.");
        }
        me.secrets.push({
          instanceId: uid("s"),
          cardId: def.id,
          trigger: def.secretTrigger ?? "on_attacked",
        });
        match.log.push(`${me.name} secret…`);
      }
      break;
    }
    case "attack": {
      const attacker = me.board.find(
        (m) => m.instanceId === action.attackerInstanceId,
      );
      if (!attacker) throw new Error("Útočník neexistuje.");
      if (!canMinionAttackTarget(attacker, action.target)) {
        throw new Error("Nemůže útočit (sickness / rush / už útočil).");
      }
      const targets = legalAttackTargets(foe);
      if (!targets.includes(action.target)) {
        throw new Error("Neplatný cíl (Taunt / Stealth).");
      }

      triggerSecrets(
        match,
        extraCards,
        opponent(side),
        "on_attacked",
        attacker.instanceId,
      );
      if (match.winner !== null) break;

      attacker.stealth = false;
      attacker.attacksThisTurn += 1;
      const maxAttacks = attacker.keywords.includes("windfury") ? 2 : 1;
      if (attacker.attacksThisTurn >= maxAttacks) {
        attacker.canAttack = false;
        attacker.exhausted = true;
      }

      if (action.target === "hero") {
        damageHero(foe, attacker.attack, match.log, getReadable(attacker.cardId));
        if (attacker.lifesteal) healHero(me, attacker.attack, match.log);
      } else {
        const target = foe.board.find((m) => m.instanceId === action.target);
        if (!target) throw new Error("Cíl zmizel.");
        const dmgOut = attacker.attack;
        const dmgBack = target.attack;
        damageMinion(target, dmgOut, match.log);
        damageMinion(attacker, dmgBack, match.log);
        if (attacker.lifesteal) healHero(me, dmgOut, match.log);
        removeDead(match, extraCards, side);
        removeDead(match, extraCards, opponent(side));
      }
      break;
    }
    case "hero_attack": {
      if (!me.weapon || me.weapon.attack <= 0) throw new Error("Nemáš zbraň.");
      if (me.heroAttackedThisTurn) throw new Error("Hrdina už útočil.");
      const targets = legalAttackTargets(foe);
      if (!targets.includes(action.target)) throw new Error("Neplatný cíl.");
      const dmg = me.weapon.attack;
      me.heroAttackedThisTurn = true;
      if (action.target === "hero") {
        damageHero(foe, dmg, match.log, "Zbraň");
      } else {
        const target = foe.board.find((m) => m.instanceId === action.target)!;
        damageMinion(target, dmg, match.log);
        damageHero(me, target.attack, match.log, "Odveta");
        removeDead(match, extraCards, opponent(side));
      }
      me.weapon.durability -= 1;
      if (me.weapon.durability <= 0) me.weapon = null;
      break;
    }
  }

  checkWinner(match);
  return match;
}

export function getLegalActions(
  match: HsMatch,
  extraCards: HsCardDef[] = [],
): HsAction[] {
  if (match.phase === "ended") return [];
  const side = match.active;
  const me = match.players[side]!;
  const foe = match.players[opponent(side)]!;
  const actions: HsAction[] = [{ type: "end_turn" }];

  if (!me.heroPowerUsed && me.mana >= 2) {
    actions.push({ type: "hero_power" });
  }

  me.hand.forEach((cardId, handIndex) => {
    const def = getCardDef(cardId, extraCards);
    if (def.cost > me.mana) return;
    if (def.type === "minion" && me.board.length >= 7) return;
    const needs = needsPlayTarget(def);
    if (needs === "enemy_minion" || needs === "any_minion") {
      const pool = needs === "enemy_minion" ? foe.board : [...foe.board, ...me.board];
      if (pool.length === 0) return;
      for (const t of pool) {
        actions.push({
          type: "play_card",
          handIndex,
          targetInstanceId: t.instanceId,
        });
      }
    } else if (needs === "friendly_minion") {
      if (me.board.length === 0) return;
      for (const t of me.board) {
        actions.push({
          type: "play_card",
          handIndex,
          targetInstanceId: t.instanceId,
        });
      }
    } else {
      actions.push({ type: "play_card", handIndex });
    }
  });

  const targets = legalAttackTargets(foe);
  for (const m of me.board) {
    for (const t of targets) {
      if (canMinionAttackTarget(m, t)) {
        actions.push({
          type: "attack",
          attackerInstanceId: m.instanceId,
          target: t,
        });
      }
    }
  }

  if (me.weapon && !me.heroAttackedThisTurn) {
    for (const t of targets) {
      actions.push({ type: "hero_attack", target: t });
    }
  }

  return actions;
}
