export function rollLevelToDice(val) {
  switch(safeNumber(val))
  {
    case -1:
      return "1d4"

    case 0:
      return "0"

    case 1:
      return "1d4"

    case 2:
      return "1d6"
    
    case 3:
      return "1d8"
      
    case 4:
      return "1d10"

    case 5:
      return "d12"
      
    case 6:
      return "d20"
  }
  return "d100"
}

export function rollLevelToTraining(val) {
  switch(safeNumber(val))
  {
    case -1:
      return "Rusted"

    case 0:
      return "Untrained"

    case 1:
      return "Amatuer"

    case 2:
      return "Trained"
    
    case 3:
      return "Profession"
      
    case 4:
      return "Master"

    case 5:
      return "Legendary"

    case 6:
      return "Mythic"
  }
  return "Nightmare"
}

export function rollLevelImagePath(val) {
  switch(safeNumber(val))
  {
    case -1:
      return "fas fa-caret-down"

    case 0:
      return "fas circle-o"

    case 1:
      return "fas fa-dice-d4"

    case 2:
      return "fas fa-dice-d6"
    
    case 3:
      return "fas fa-dice-d8"
      
    case 4:
      return "fas fa-dice-d10"

    case 5:
      return "fas fa-dice-d12"
      
    case 6:
      return "fas fa-dice-d20"
  }
  return "fas fa-skull"
}

export function maxDiceNumber(val) {
  switch(safeNumber(val))
  {
    case -1:
      return 0

    case 0:
      return 0

    case 1:
      return 4

    case 2:
      return 6
    
    case 3:
      return 8
      
    case 4:
      return 10

    case 5:
      return 12
      
    case 6:
      return 20
  }
  return 100
}

export function solveSkillRoll( actor, baseskill, trainingval) {
  var skillroll = "" 
  var skillbonus = "";
  if(rollLevelToDice(trainingval) != "0")
  {
    if(safeNumber(trainingval) >= 0)
    {
      skillbonus = " + " + rollLevelToDice(trainingval); // normal
    }
    else
    {
      skillbonus = " - " + rollLevelToDice(trainingval); // rusted
    }
  }
  skillroll += rollLevelToDice(actor.system.attributes[baseskill]) + skillbonus;
  return skillroll
}

export function solveDefenseRoll( actor) {
  var armorbonus = "";
  if(rollLevelToDice(actor.system.currentarmor) != "0")
  {
    armorbonus = " + " + (maxDiceNumber(actor.system.currentarmor) / 2);
  }
  var defenseroll = "4" + armorbonus;
  return defenseroll
}

export function safeNumber( val) {
  if(isNaN(val) || val == null || val == "" || val === false)
  {
    return 0;
  }
  else if(val === true)
  {
    return 1;
  }
  return parseFloat(val);
}


export async function chatCardRoll(rollCast, label, actor, item, token, advNorDis, hasInitButton, grapplestate) {
  if(actor.type === "vehicle")
  {
    ui.notifications.error("Vehicles cannot use items, copy to pilot for use!");
    return
  }

  // get data, fallback otherwise
  let roll = null;
  if(item != null)
  {
    roll = new Roll(rollCast, await item.getRollData());
  }
  else 
  {
    roll = new Roll(rollCast, await actor.getRollData());
  }

  // oops
  if(roll == null) return;
  await roll.evaluate();

  var damagedata = ""
  var typeisdata = ""
  var traitsdata = ""
  
  if(item != null)
  {
    for (let t in item.system.traits) {
      if(safeNumber(item.system.traits[t]) == 1)
      {
        if(traitsdata.length > 0) 
        {
          traitsdata += ", "
        }
        else
        {
          traitsdata = "Traits: "
        }
        traitsdata += (game.i18n.localize(CONFIG.STARDUST.translate[t]) ?? t)
      }
    }
    for (let t in item.system.type) {
      if(safeNumber(item.system.type[t]) == 1)
      {
        typeisdata = (game.i18n.localize(CONFIG.STARDUST.translate[t]) ?? t)
      }
    }
    var typephysicaldata = "P";
    if(typeisdata == "") 
    {
      typeisdata = "RAW";
      typephysicaldata = "X";
    }
    else
    {
      if(item.system.traits == undefined) typephysicaldata = "E";
      else if(item.system?.traits?.energy) typephysicaldata = "E";
    }
    if(safeNumber(item.system.damage) > 0)
    {
      damagedata = "Damage: " + safeNumber(item.system.damage) + " [" + typeisdata + "]" + "[" + typephysicaldata + "]";
    }
  }

  // weeee
  const templateData = {
    actor: actor,
    item: item,
    tokenId: token?.uuid || null,
    speaker: ChatMessage.getSpeaker({actor: actor, token}),
    user: game.user.id,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,

    flavor: actor.name + ": " + label,
    damage: damagedata,
    traits: traitsdata,
    result: roll.result,
    formula: rollCast,
    total: roll.total,
    tooltip: await roll.getTooltip(),

    flags: {"core.canPopout": true},
    rollMode: game.settings.get("core", "rollMode")
  };

  // Create the ChatMessage data object
  await roll.toMessage({
    content: await renderTemplate("systems/stardust/templates/dice/hit-roll.html", templateData),
  })

  return;
}

export function UpdateTokenSettings(actorData, manualToken)
{
  /**************************************************
  Update tokens
  ***************************************************/
  if(manualToken == null) return;
  if(!actorData.isOwner) return;

  // update sight in linked tokens
  const originalAngle = manualToken.sight.angle;
  var update = {["sight"]: actorData.prototypeToken.sight};
  update.sight.angle = originalAngle;
  manualToken.update(update);
}