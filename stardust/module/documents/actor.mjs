import { rollLevelToDice,safeNumber,maxDiceNumber,UpdateTokenSettings } from "../helpers/utility.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class StardustActor extends Actor {

  /** @override */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    var updates = {};
    updates.system = {};
    
    if(this.type === "character")
    {
      // init linkage
      updates.prototypeToken = {};
      updates.prototypeToken.actorLink = true;
    }
    this.updateSource(updates);
  }

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.stardust || {};

    // Do not process vehicles as characters
    if(actorData.type !== "vehicle")
    {
      // prepare item modified data
      systemData.currentarmor = 0

      // reset stats
      systemData.attributes.body = 0
      systemData.attributes.agility = 0
      systemData.attributes.mind = 0
      systemData.attributes.will = 0
      for (var k in CONFIG.STARDUST.skillattribute){
        if(!(k in systemData.skills)) systemData.skills[k] = {} // Reinit
        systemData.skills[k].training = 0;
        systemData.skills[k].base = CONFIG.STARDUST.skillattribute[k] // Reset to config
      }
      
      systemData.currentMemoryUsed = 0;
    }
    systemData.currentBulk = 0
    systemData.currentarmorType = ""
    systemData.maxBulk = 0

    // Iterate through items, scan for armor
    for (let i of actorData.items) {
      if (i.type === 'feature') {
        if(actorData.type !== "vehicle")
        {
          for (var k in systemData.attributes){
            if(safeNumber(i.system.attributes[k]) > 0)
            {
              systemData.attributes[k] += safeNumber(i.system.attributes[k]);
            }
          }
          for (var k in CONFIG.STARDUST.skillattribute){
            if(safeNumber(i.system.skills[k].training) != 0)
            {
              systemData.skills[k].training += safeNumber(i.system.skills[k].training);
            }
          }
        }
      }
      else if (i.type === 'item') {
        if(safeNumber(i.system.disabled) == 0)
        {
          if(actorData.type !== "vehicle")
          {
            if(safeNumber(i.system.armor) > 0)
            {
              // scan for armors
              systemData.currentarmor = Math.max( safeNumber(i.system.armor), systemData.currentarmor);
              for (var k in i.system.type){
                if(safeNumber(i.system.type[k]) == 1)
                {
                  systemData.currentarmorType = " [" + (game.i18n.localize(CONFIG.STARDUST.translate[k]) ?? k) + "]";
                }
              }
            }
          }
          if(safeNumber(i.system.addedstoragebulk) != 0)
          {
            // scan for bags
            systemData.maxBulk += safeNumber(i.system.addedstoragebulk)
          }
        }
        // Items always weigh you down... Unless it's implanted
        if(!i.system.traits.implant)
        {
          systemData.currentBulk += safeNumber(i.system.bulk) * safeNumber(i.system.quantity);
        }
      }
      else if (i.type === 'spell') {
        if(actorData.type !== "vehicle")
        {
          // get memory cost of all spells
          systemData.currentMemoryUsed += safeNumber(i.system.memory);
        }
      }
    }

    if(actorData.type !== "vehicle")
    {
      // lock minimum attributes
      for (var k in systemData.attributes){
        if(safeNumber(systemData.attributes[k]) <= 0)
        {
          systemData.attributes[k] = 1
        }
      }

      // bulk control
      systemData.maxBulk += maxDiceNumber(this.system.attributes["body"])

      // vision handling for entities
      if(actorData.prototypeToken)
      {
        actorData.prototypeToken.sight.enabled = true;
        actorData.prototypeToken.sight.range = maxDiceNumber(this.system.attributes["will"]) + maxDiceNumber( safeNumber(this.system.skills["perception"].training));
      }
    }
    else
    {
      // bulk control
      systemData.maxBulk += maxDiceNumber(this.system.wounddie)

      // vision handling for vehicles
      if(actorData.prototypeToken)
      {
        actorData.prototypeToken.sight.enabled = true;
        actorData.prototypeToken.sight.range = 20;
      }
    }
  }
  
  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    // update tokens from prototype
    if(this.prototypeToken)
    {
      if(this.prototypeToken.actorLink)
      {
        for (let tok of this.getActiveTokens(true)) {
          UpdateTokenSettings(this, tok.document);
        }
      }
      else if(this.token != null && this.token.id != null)
      {
        UpdateTokenSettings(this, this.token);
      }
    }
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = rollLevelToDice( foundry.utils.deepClone(v) ) + "["+ (game.i18n.localize(CONFIG.STARDUST.translate[k]) ?? k) +"]";
      }
    }

    return data;
  }
}