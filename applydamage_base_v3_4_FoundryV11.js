let dmg = typeof args != 'undefined' && typeof args[0] == "number" ? args[0] : null

let weaponStyle = "color:white"
let burnStyle = "color:white"
let heatStyle = "color:white"

if(typeof args != 'undefined' && typeof args[1] == "string"){
	console.log("hi")
	let type = args[1]
	if(type == "heat"){
		heatStyle = "color:red"
	}else if(type == "burn"){
		burnStyle = "color:orange"
	}else{
		weaponStyle = "color:blue"
	}
}




const htmlFormContent = `<form class="lancer accdiff window-content">
	<div class="flexrow lancer-border-primary" style="padding-bottom: 4px;">
		<div class="flexcol">
			<label class="container">
				<h3 class="lancer-border-primary">Damage</h3>
				<input type="number" value=${dmg} name="damage_amount" class="lancer-text-field grow"
				style="color:var(--color-text-dark-primary, black); text-align: center;"/>
			</label>
		</div>
		<div class="flexcol">
			<h3 class="lancer-border-primary">Modifiers</h3>
			<label class="container">
				<input type="checkbox" name="has_resistance">
				<span class="checkmark">Resistance</span>
			</label><br/>
			<label class="container">
				<input type="checkbox" name="is_exposed"> Exposed
			</label>
			<label class="container">
				<input type="checkbox" name="attack_is_piercing"> Armor Piercing
			</label>
		</div>
	</div>
	<div class="flexrow" style="padding-top: 4px;">
		<div class="flexcol">
			<button name="dmgType" value="Weapon" type="button">
				<i class="cci cci-reticule i--l" style=${weaponStyle}></i></br>Damage
			</button>
		</div>
		<div class="flexcol">
			<button name="dmgType" value="Burn" type="button">
				<i class="cci cci-burn i--l" style=${burnStyle}></i></br>Burn
			</button>
		</div>
		<div class="flexcol">
			<button name="dmgType" value="Heat" type="button">
				<i class="cci cci-heat i--l" style=${heatStyle}></i></br>Heat
			</button>
		</div>
	</div>
</form>`;


function handleButtonClick(html, event) {
  const targetElement = event.currentTarget;
  const presetType = targetElement.dataset?.preset;

  const formElement = $(targetElement).parents('form');

  const damage = parseInt(formElement?.find('[name="damage_amount"]').val());

  const resistDmg = formElement?.find('[name="has_resistance"]').prop("checked");
  const exposed = formElement?.find('[name="is_exposed"]').prop("checked");
  const armorPiercing = formElement?.find('[name="attack_is_piercing"]').prop("checked");

  const selectedTokens = canvas.tokens.controlled;

  if (damage === "") {
    return "Damage must be a number.";
  }

  const attackType = targetElement.value;

  if (!isNaN(damage) && damage > 0) {
    selectedTokens.forEach(token => {
      let name = token.name;
      let armor = token.actor.system.armor;
      let hp = token.actor.system.hp.value;
      let heat = token.actor.system.heat.value;
      let burn = token.actor.system.burn;
      let overshield = token.actor.system.overshield.value;
      let tokenURL = token.actor.img;

      let overshieldRemain = 0;

      let effects = "";
      let dmgType = "";
      let tempdamage = 0;
      let newVal = 0;
      let remain = "HP";

      // BASIC DAMAGE HANDLING
      if (attackType === "Weapon") {
        //use a new variable here so that it doesn't actually alter damage for the other parts of the loop.
        tempdamage = damage;
        dmgType = "Damage";
        remain = "HP";
        //if exposed, double damage.
        if (exposed) {
          tempdamage = tempdamage * 2;
        }

        //if not armorpiercing, factor in armor.
        if (!armorPiercing) {
          tempdamage = Math.max(tempdamage - armor, 0); //subtract armor
        }

        //if resistance, halve damage, rounding up.
        // order matters, of course- lancer is Exposed -> armor -> resistance.
        if (resistDmg) {
          tempdamage = Math.ceil(tempdamage / 2)
        }

        effects = effects + `[Armor: ${armor}] `;
        overshieldRemain = overshield - tempdamage;

        if (overshield > 0 && overshieldRemain >= 0) {
          //case 1 - has overshield, damage doesn't break shield
          token.actor.update({ "system.overshield": overshieldRemain });
          effects = effects + `[Overshield: ${overshield} -> ${overshieldRemain}] `;
          tempdamage = 0;

        } else if (overshield > 0 && overshieldRemain < 0) {
          //case 2: has overshield, damage breaks overshield and deals real damage
          token.actor.update({ "system.overshield": 0 });
          effects = effects + `[Overshield: ${overshield} -> 0] `;
          tempdamage = tempdamage - overshield;

        }

        if (resistDmg) {
          effects = effects + `[Dmg Resistance (x1/2)] `;
        }

        if (exposed) {
          effects = effects + `[Exposed (x2)] `;
        }

        if (armorPiercing) {
          effects = effects + `[Armor Piercing] `;
        }

        token.actor.update({ "system.hp.value": hp - tempdamage });
        newVal = hp - tempdamage;

      } else if (attackType === "Burn") {
        // BURN HANDLING
        tempdamage = damage; //pierces armor.
        dmgType = "Burn";
        remain = "HP";
        let burndamage = damage;
        /* unfortunately there's a bit of complexity here.
        Tempdamage is the 'current running total' of damage,
        i.e after resistance and overshield reductions.
        But the amount of burn you gain shouldn't count overshield, 
        so we need a second variable to track it- hence burn damage.
        */

        // burn can be resisted
        if (resistDmg) {
          tempdamage = Math.ceil(tempdamage / 2)
        }

        burndamage = tempdamage;
        effects = effects + `[Burn: ${burndamage}] `;
        overshieldRemain = overshield - tempdamage;

        if (overshield >= 0 && overshieldRemain >= 0) {
          token.actor.update({ "system.overshield": overshield - tempdamage });
          effects = effects + `[Overshield: ${overshield} -> ${overshieldRemain}] `;
          tempdamage = 0;

        } else if (overshield > 0 && overshieldRemain < overshield) {
          token.actor.update({ "system.overshield": 0 });
          effects = effects + `[Overshield: ${overshield} -> 0] `;
          tempdamage = tempdamage - overshield;

        }

        if (resistDmg) {
          effects = effects + `[Burn Resistance (x1/2)] `;
        }

        //hp damage taken might be reduced by overshield, but burn gained is not.
        token.actor.update({ "system.hp.value": hp - tempdamage, "system.burn": bur) + burndamage});
        newVal = hp - tempdamage;

      } else if (attackType === "Heat") {
        // HEAT HANDLING
        tempdamage = damage;
        dmgType = "Heat";
        remain = "Heat";
        // I suppose heat can be resisted too.
        if (resistDmg) {
          tempdamage = Math.ceil(tempdamage / 2);
          effects = effects + `[Heat Resistance (x1/2)] `;
        }

        if (heat + tempdamage >= token.actor.system.heat.max / 2) {
          effects = effects + `[DANGER ZONE] `;
        }
        newVal = heat + tempdamage;

        token.actor.update({ "system.heat.value": heat + tempdamage });

      }



      let msgContent = `<div class="card clipped-bot" style="margin: 0px;">
				<div class="card clipped">
					<div class="lancer-mini-header" >// DAMAGE APPLIED //</div>
						<div class="lancer-hit">
							<div>
								<img class="lancer-hit-thumb" src="${tokenURL}" />
							</div>
							<div class="lancer-hit-text">
								<span class="lancer-hit-text-name">${name} has taken
								${tempdamage} ${dmgType} (New Value: ${newVal} ${remain})</span>
							</div>
						</div>
				</div>
				<div class="card clipped">
					<div class="lancer-mini-header">// DAMAGE MODS //</div>
					<span class="effect-text">${effects}</span>
				</div>
			</div>`

      ChatMessage.create({ //comment this part out if you don't want stuff whispered to chat.
        content: msgContent,
        whisper: ChatMessage.getWhisperRecipients("GM")
      });
    });

    const formData = new FormDataExtended(html[0].querySelector('form')).object;
    ui.activeWindow.close();
    return formData;
  } else {
    ui.notifications.warn("Damage must be a positive number.");
    return "Damage must be a number.";
  }
  return null;
}

async function promptForDamage() {
  return new Promise((resolve) => {
    const dialog = new Dialog({
      title: "Apply Damage to Selected Token",
      content: htmlFormContent,
      buttons: {},
      render: (html) => {
        html.on('click', 'button[name="dmgType"]', (event) => {
          let clickResult = handleButtonClick(html, event);

          if (clickResult === null) {
            resolve(null);
          } else if (typeof clickResult === "string") {
            resolve(null);
          } else {
            resolve(clickResult);
          }
        });
      },
      close: () => {
        resolve('User closed dialog without making a selection.');
      },
    });
    dialog.render(true);
  });
}

const damage = await promptForDamage();
