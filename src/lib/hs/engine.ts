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
  return {
    instanceId: uid("m"),
    cardId: def.id,
    attack: def.attack ?? 0,
    health: def.health ?? 1,
    maxHealth: def.health ?? 1,
    keywords,
    canAttack: charge,
    attacksThisTurn: 0,
    divineShield: keywords.includes("divine_shield"),
    stealth: keywords.includes("stealth"),
    exhausted: !charge,
  };
}

function createPlayer(
  id: string,
  name: string,
  heroId: HeroId,
  deckIds: string[],
): PlayerState {
  const deck = shuffle(deckIds);
  return {
    id,
    name,
    heroId,
    hp: 30,
    armor: 0,
    mana: 0,
    maxMana: 0,
    deck,
    hand: [],
    board: [],
    weapon: null,
    secrets: [],
    heroPowerUsed: false,
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
      log.push(`${p.name} přetáhl kartu (zahozeno).`);
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
  log.push(`${why}: ${p.name} −${amount} (HP ${p.hp}, armor ${p.armor})`);
}

function damageMinion(
  m: BoardMinion,
  amount: number,
  log: string[],
): boolean {
  if (amount <= 0) return false;
  if (m.divineShield) {
    m.divineShield = false;
    log.push(`${m.cardId} ztratil Divine Shield.`);
    return false;
  }
  m.health -= amount;
  return m.health <= 0;
}

function removeDead(
  match: HsMatch,
  extra: HsCardDef[],
  side: 0 | 1,
) {
  const p = match.players[side]!;
  const dead = p.board.filter((m) => m.health <= 0);
  p.board = p.board.filter((m) => m.health > 0);
  for (const m of dead) {
    match.log.push(`Zemřel: ${m.cardId}`);
    const def = getCardDef(m.cardId, extra);
    runEffects(match, extra, side, def.effects?.filter((e) => e.when === "deathrattle") ?? [], m.instanceId);
  }
}

function checkWinner(match: HsMatch) {
  if (match.players[0]!.hp <= 0 && match.players[1]!.hp <= 0) {
    match.phase = "ended";
    match.winner = match.active; // active wins ties weirdly — prefer second player alive check
    if (match.players[0]!.hp <= 0) match.winner = 1;
    if (match.players[1]!.hp <= 0) match.winner = 0;
  } else if (match.players[0]!.hp <= 0) {
    match.phase = "ended";
    match.winner = 1;
  } else if (match.players[1]!.hp <= 0) {
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
        me.hp = Math.min(30, me.hp + (fx.amount ?? 0));
        match.log.push(`${me.name} heal +${fx.amount}`);
        break;
      case "armor":
        me.armor += fx.amount ?? 0;
        break;
      case "damage_enemy_hero":
        damageHero(foe, fx.amount ?? 0, match.log, "Kouzlo");
        break;
      case "summon": {
        if (me.board.length >= 7) break;
        const def = getCardDef(fx.cardId!, extra);
        me.board.push(createMinion(def));
        match.log.push(`${me.name} summon ${def.name}`);
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
        for (const m of foe.board) {
          damageMinion(m, fx.amount ?? 0, match.log);
        }
        removeDead(match, extra, opponent(side));
        break;
      }
      case "destroy_minion_leq_health": {
        const t = foe.board.find((m) => m.instanceId === targetInstanceId);
        if (t && t.health <= (fx.amount ?? 0)) {
          t.health = 0;
          removeDead(match, extra, opponent(side));
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
    break; // one secret per trigger event
  }
  def.secrets = def.secrets.filter((s) => !fired.includes(s));
}

function startTurn(match: HsMatch, extra: HsCardDef[]) {
  const p = match.players[match.active]!;
  p.maxMana = Math.min(10, p.maxMana + 1);
  p.mana = p.maxMana;
  p.heroPowerUsed = false;
  for (const m of p.board) {
    m.exhausted = false;
    m.canAttack = true;
    m.attacksThisTurn = 0;
    if (m.stealth && m.keywords.includes("stealth")) {
      // keep stealth until attacks
    }
  }
  drawCard(p, 1, match.log);
  match.log.push(`— Tah ${match.turn}: ${p.name} (${p.mana}/${p.maxMana} mana) —`);
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
  drawCard(match.players[0]!, 3, match.log);
  drawCard(match.players[1]!, 4, match.log); // second player coin-equivalent: +1 card
  match.players[0]!.maxMana = 0;
  match.players[1]!.maxMana = 0;
  startTurn(match, opts.extraCards ?? []);
  return match;
}

function hasTaunt(board: BoardMinion[]) {
  return board.some((m) => m.keywords.includes("taunt") && !m.stealth);
}

function legalAttackTargets(
  foe: PlayerState,
): Array<"hero" | string> {
  const taunts = foe.board.filter(
    (m) => m.keywords.includes("taunt") && !m.stealth,
  );
  if (taunts.length) return taunts.map((m) => m.instanceId);
  return ["hero", ...foe.board.filter((m) => !m.stealth).map((m) => m.instanceId)];
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
        me.hp = Math.min(30, me.hp + 2);
        match.log.push("Hero power: heal 2");
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
        match.log.push(`${me.name} kouzlo ${def.name}`);
        triggerSecrets(match, extraCards, opponent(side), "on_spell");
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
        match.log.push(`${me.name} zbraň ${def.name}`);
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
      if (!attacker.canAttack || attacker.exhausted || attacker.attack <= 0) {
        throw new Error("Nemůže útočit.");
      }
      const maxAttacks = attacker.keywords.includes("windfury") ? 2 : 1;
      if (attacker.attacksThisTurn >= maxAttacks) {
        throw new Error("Už utočil.");
      }
      const targets = legalAttackTargets(foe);
      if (!targets.includes(action.target)) {
        throw new Error("Neplatný cíl (Taunt?).");
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
      if (
        attacker.attacksThisTurn >=
        (attacker.keywords.includes("windfury") ? 2 : 1)
      ) {
        attacker.canAttack = false;
        attacker.exhausted = true;
      }

      if (action.target === "hero") {
        damageHero(foe, attacker.attack, match.log, `${attacker.cardId} → hero`);
      } else {
        const target = foe.board.find((m) => m.instanceId === action.target);
        if (!target) throw new Error("Cíl zmizel.");
        const killedT = damageMinion(target, attacker.attack, match.log);
        const killedA = damageMinion(attacker, target.attack, match.log);
        if (killedT || killedA) {
          removeDead(match, extraCards, side);
          removeDead(match, extraCards, opponent(side));
        }
      }
      break;
    }
    case "hero_attack": {
      if (!me.weapon || me.weapon.attack <= 0) throw new Error("Nemáš zbraň.");
      const targets = legalAttackTargets(foe);
      if (!targets.includes(action.target)) throw new Error("Neplatný cíl.");
      const dmg = me.weapon.attack;
      if (action.target === "hero") {
        damageHero(foe, dmg, match.log, "Zbraň → hero");
      } else {
        const target = foe.board.find((m) => m.instanceId === action.target)!;
        damageMinion(target, dmg, match.log);
        damageHero(me, target.attack, match.log, "Odveta na hrdinu");
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
    const needs = def.effects?.find((e) => e.needsTarget)?.needsTarget;
    if (needs === "enemy_minion") {
      for (const t of foe.board) {
        actions.push({
          type: "play_card",
          handIndex,
          targetInstanceId: t.instanceId,
        });
      }
    } else if (needs === "friendly_minion") {
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
    if (!m.canAttack || m.exhausted || m.attack <= 0) continue;
    for (const t of targets) {
      actions.push({
        type: "attack",
        attackerInstanceId: m.instanceId,
        target: t,
      });
    }
  }

  if (me.weapon) {
    for (const t of targets) {
      actions.push({ type: "hero_attack", target: t });
    }
  }

  return actions;
}
