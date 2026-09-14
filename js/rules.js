import { ballType } from "./table.js";

export function oppositeGroup(group) {
  return group === "solids" ? "stripes" : "solids";
}

export function legalObjectTypes(shooter, groups) {
  const mine = groups[shooter];
  if (!mine) return ["solids", "stripes"];
  return [mine];
}

export function shooterHasGroupLeft(shooter, groups, balls) {
  const mine = groups[shooter];
  if (!mine) {
    return balls.some((b) => !b.pocketed && (b.type === "solids" || b.type === "stripes"));
  }
  return balls.some((b) => !b.pocketed && b.type === mine);
}

export function eightIsOn(shooter, groups, balls) {
  return groups[shooter] != null && !shooterHasGroupLeft(shooter, groups, balls);
}

function firstPocketedGroup(pocketedNs, balls) {
  for (const n of pocketedNs) {
    if (n === 0 || n === 8) continue;
    const b = balls.find((x) => x.n === n);
    if (b && (b.type === "solids" || b.type === "stripes")) return b.type;
  }
  return null;
}

export function evaluateShot({
  shooter,
  opponent,
  isBreak,
  groups,
  firstHit,
  pocketed,
  railAfterContact,
  cuePocketed,
  balls,
  eightOn,
}) {
  const objectPocketed = pocketed.filter((n) => n !== 0);
  const eightPocketed = objectPocketed.includes(8);
  const nonEightPocketed = objectPocketed.filter((n) => n !== 8);
  const shooterGroup = groups[shooter];

  let foul = false;
  let foulReason = "";

  if (firstHit == null) {
    foul = true;
    foulReason = "No ball contacted";
  } else if (eightOn) {
    if (firstHit !== 8) {
      foul = true;
      foulReason = "Must hit the 8-ball first";
    }
  } else if (!shooterGroup) {
    if (firstHit === 8) {
      foul = true;
      foulReason = "Cannot hit the 8 first on an open table";
    }
  } else if (ballType(firstHit) !== shooterGroup) {
    foul = true;
    foulReason = `Must hit ${shooterGroup} first`;
  }

  if (!foul && nonEightPocketed.length === 0 && !eightPocketed && !railAfterContact) {
    foul = true;
    foulReason = "No ball to a rail";
  }

  if (cuePocketed) {
    foul = true;
    foulReason = isBreak ? "Scratch on the break" : "Cue ball scratch";
  }

  let winner = null;
  let loser = null;
  let respotEight = false;
  const nextGroups = { ...groups };

  if (isBreak && eightPocketed) {
    respotEight = true;
  } else if (eightPocketed) {
    if (eightOn && !foul && firstHit === 8) winner = shooter;
    else loser = shooter;
  }

  if (!winner && !loser && !foul && !shooterGroup) {
    const assigned = firstPocketedGroup(nonEightPocketed, balls);
    if (assigned) {
      nextGroups[shooter] = assigned;
      nextGroups[opponent] = oppositeGroup(assigned);
    }
  }

  const legalPockets = nonEightPocketed.filter((n) => {
    const t = ballType(n);
    if (!nextGroups[shooter]) return t === "solids" || t === "stripes";
    return t === nextGroups[shooter];
  });

  const keepShooting =
    !winner && !loser && !foul && legalPockets.length > 0;

  const ballInHand = foul && !winner && !loser;
  const kitchenOnly = Boolean(isBreak && cuePocketed);

  let message;
  if (winner) {
    message =
      shooter === "player"
        ? "You legally pocketed the 8. You win the rack!"
        : "Bot legally pocketed the 8.";
  } else if (loser) {
    message =
      shooter === "player"
        ? "Illegal 8-ball. Bot wins the rack."
        : "Bot fouled on the 8. You win the rack!";
  } else if (foul) {
    message = `Foul: ${foulReason}. Ball in hand.`;
  } else if (keepShooting) {
    message = shooter === "player" ? "Nice shot — go again." : "Bot continues.";
  } else {
    message = shooter === "player" ? "Turn over. Bot to shoot." : "Your turn.";
  }

  return {
    foul,
    foulReason,
    keepShooting,
    groups: nextGroups,
    winner,
    loser,
    message,
    ballInHand,
    kitchenOnly,
    respotEight,
  };
}
