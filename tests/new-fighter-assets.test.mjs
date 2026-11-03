import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("new attack poses referenced by the fight exist as transparent PNGs", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const names = new Set([...css.matchAll(/\/assets\/new-fighters\/((?:bacora|borja|bonviure|elchica|ogalla)-(?:punch-[1234]|kick-[1234]|punch-contact-v2|bottle-special-v2|throw-special-v2|staff-special-v2|release-shield-v1)\.webp)/g)].map((match) => match[1]));
  assert.ok(names.size >= 30, "all five fighters should have their new poses wired in");
  for (const name of names) {
    const png = await readFile(new URL(`../public/assets/new-fighters/${name.replace(/\.webp$/, ".png")}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG", `${name} must be a PNG`);
    assert.ok(png.readUInt32BE(16) > 100 && png.readUInt32BE(20) > 100, `${name} needs enough resolution`);
    assert.ok([4, 6].includes(png[25]), `${name} must have an alpha channel`);
  }
});

test("new fighter attacks clear the legacy body layer and use opponent-facing poses", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const legacyBacoraPose = css.indexOf(".arena .fighter.motion-rig.special.shield .fighter-art.bacora");
  const cleanAttackLayer = css.lastIndexOf("background:transparent none no-repeat center bottom / auto 100%!important");
  const legacyPunchMirror = css.indexOf("Bacora's and El Chica's punch cutouts were authored facing left");
  const correctedFacing = css.lastIndexOf(".face-right .fighter-art:is(.borja,.bacora,.bonviure,.elchica,.ogalla)");

  assert.ok(legacyBacoraPose >= 0, "the regression should cover Bacora's legacy shield pose");
  assert.ok(cleanAttackLayer > legacyBacoraPose, "the replacement sprite must clear the legacy Bacora body layer");
  assert.ok(legacyPunchMirror >= 0, "the regression should cover the old Bacora/El Chica mirror rule");
  assert.ok(correctedFacing > legacyPunchMirror, "the new poses must override the old direction reversal");
  assert.match(css.slice(cleanAttackLayer), /background:transparent none no-repeat center bottom \/ auto 100%!important/);
  assert.match(css.slice(correctedFacing), /transform:scaleX\(1\)!important/);
  assert.match(css, /--special-c:url\('\/assets\/new-fighters\/bacora-release-shield-v1\.webp'\)/);

  const punchRecovery = css.match(/@keyframes new-punch-sequence-v21828\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(punchRecovery, /70%\s*\{\s*background-image:var\(--punch-d\)/,
    "punches should recover to the neutral/contact recovery frame, not re-strike backwards");

  const bacoraShieldRecovery = css.match(/@keyframes bacora-shield-sequence-v21832\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(bacoraShieldRecovery, /36%,78%,100%\s*\{\s*background-image:url\('\/assets\/new-fighters\/bacora-release-shield-v1\.webp'\)/,
    "the W shield must stay out of Bacora's hand during projectile travel and recovery");
});

test("weapon specials keep their fighter-specific contact frame", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.fighter\.motion-rig\.borja\.special:is\(\.toad,\.venom\)\.pose-phase-2[\s\S]*borja-attack\.webp/);
  assert.match(css, /\.fighter\.motion-rig\.ogalla\.special\.artichokes\.pose-phase-2[\s\S]*ogalla-punch-3\.webp/);
  assert.match(css, /\.fighter\.motion-rig\.tonimassama\.special\.goldPistol\.pose-phase-2[\s\S]*tonimassama-frames\/pistol\.webp/);
  assert.match(css, /\.fighter\.motion-rig\.tonimassama\.special\.fingerPeinetas\.pose-phase-2[\s\S]*tonimassama-frames\/punch\.webp/);
});

test("new fighter kicks show windup, brief contact, planted recovery, then neutral", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const sequence = css.match(/@keyframes new-kick-strip-v21836\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(sequence, /15%\s*\{\s*background-position:25% 0%/,
    "the attack should show its windup before extending");
  assert.match(sequence, /30%\s*\{\s*background-position:50% 0%/,
    "the extended kick should begin before the hit registers");
  assert.match(sequence, /44%\s*\{\s*background-position:75% 0%/,
    "the leg should recoil into a planted recovery pose instead of staying extended");
  assert.match(sequence, /62%,100%\s*\{\s*background-position:100% 0%/,
    "the kick should finish in a neutral grounded stance");
  assert.doesNotMatch(sequence, /background-image:/,
    "the attack must keep a single image loaded while its strip position changes");

  for (const fighter of ["borja", "bacora", "bonviure", "elchica", "ogalla"]) {
    assert.match(css, new RegExp(`\\.arena \\.fighter\\.motion-rig\\.kick\\.${fighter} \\.fighter-art::after \\{ background-image:url\\('/assets/new-fighters/${fighter}-kick-strip-v21836\\.webp'\\)!important; animation:new-kick-strip-v21836 760ms`),
      `${fighter} needs a stable kick strip and grounded recovery frame`);
    assert.match(css, new RegExp(`\\.arena \\.fighter\\.motion-rig\\.punch\\.${fighter} \\.fighter-art::after \\{ background-image:url\\('/assets/new-fighters/${fighter}-punch-strip-v21836\\.webp'\\)!important; animation:new-punch-strip-v21836 480ms`),
      `${fighter} needs a stable punch strip`);
    for (const action of ["punch", "kick"]) {
      const png = await readFile(new URL(`../public/assets/new-fighters/${fighter}-${action}-strip-v21836.png`, import.meta.url));
      assert.equal(png.subarray(1, 4).toString(), "PNG");
      assert.equal(png.readUInt32BE(16), 2900, `${fighter} ${action} strip has five 580px frames`);
      assert.equal(png.readUInt32BE(20), 552, `${fighter} ${action} frames share one floor baseline`);
      assert.equal(png[25], 6, `${fighter} ${action} strip retains transparent cutouts`);
    }
  }

  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const stripBuilder = await readFile(new URL("../scripts/build-new-fighter-action-strips.mjs", import.meta.url), "utf8");
  assert.match(page, /type FighterPosePhase = 0 \| 1 \| 2 \| 3 \| 4/,
    "late-roster attacks should expose all five authored poses");
  assert.match(page, /later\(\(\) => setPosePhase\(4\), Math\.max\(330, Math\.round\(actionDuration \* 0\.82\)\)\)/,
    "the fifth grounded recovery frame must appear before an attack ends");
  assert.match(css, /\.punch\.pose-phase-4[\s\S]*?background-position:100% bottom!important/,
    "Yoye's punch must finish on the fifth strip frame");
  assert.match(css, /\.kick\.pose-phase-4[\s\S]*?background-position:100% bottom!important/,
    "Yoye's kick must finish on the fifth strip frame");
  assert.match(stripBuilder, /bonviure-kick-3\.png", "bonviure-kick-2\.png", "bonviure-kick-1\.png"/,
    "Bonviure should recoil after the extended kick instead of snapping directly to neutral");
  assert.match(css, /\.arena \.fighter\.motion-rig\.kick:is\(\.borja,\.bacora,\.bonviure,\.elchica,\.ogalla\) \{ --move-duration:760ms; \}/);
  assert.match(page, /const actionDuration = (?:isSuper \? 1180 : )?level > 0 \? \(level === 2 \? 980 : 820\) : normalMove === "kick" \? \(extendedNewKick \? 760 : 620\) : 480/);
});

test("new fighter walk cycles use walk art and preserve facing", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--weapon-walk-b:url\('\/assets\/new-fighters\/bacora-walk\.webp'\)/);
  assert.match(css, /--weapon-walk-b:url\('\/assets\/new-fighters\/bonviure-walk\.webp'\)/);
  assert.match(css, /background-image:url\('\/assets\/new-fighters\/elchica-atlas\.webp'\)!important/);
  assert.match(css, /background-image:url\('\/assets\/new-fighters\/ogalla-atlas\.webp'\)!important/);
  assert.match(css, /@keyframes atlas-walk-v21835\s*\{[\s\S]*?50%,100%\s*\{\s*background-position:100% 0%/);
  assert.doesNotMatch(css, /--clean-walk-[ab]:url\('\/assets\/new-fighters\/(?:elchica|ogalla)-punch-/,
    "walking must not reuse punch poses");
  assert.match(css, /@keyframes new-weapon-walk-v21833/);
  assert.match(css, /new-kick-root-right-v21835 760ms/);
  assert.match(css, /new-kick-root-left-v21835 760ms/);
  assert.match(css, /@keyframes new-kick-root-right-v21835/);
  assert.match(css, /@keyframes new-kick-root-left-v21835/);
  assert.match(css, /\.arena \.fighter\.motion-rig\.kick:is\(\.borja,\.bacora,\.bonviure,\.elchica,\.ogalla\)\.face-left \.fighter-art \{ transform:scaleX\(-1\)!important; \}/);
});

test("new fighter scale stays close to the original roster, with Bonviure only slightly taller", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rosterScale = css.match(/\/\* Match the six newer fighters to the original roster's visible combat height\. \*\/([\s\S]*?)\/\* Bacora and Bonviure were drawn on square canvases/);
  const bonviureScale = css.match(/\/\* Bonviure remains just taller than the rest of the roster\. \*\/([\s\S]*?)@media \(max-width:680px\)/);
  const shortLandscape = css.match(/\/\* Match the original fighters' height on low landscape screens\. \*\/([\s\S]*?)\/\* Preparation and recovery/);

  assert.ok(rosterScale, "the final roster scale rule should remain easy to locate");
  assert.match(rosterScale[1], /width:clamp\(157px,29\.333vh,274px\)!important/);
  assert.match(rosterScale[1], /height:clamp\(235px,44vh,410px\)!important/);
  assert.ok(bonviureScale, "Bonviure should have a modest size adjustment");
  assert.match(bonviureScale[1], /height:clamp\(246px,46vh,428px\)!important/);
  assert.ok(shortLandscape, "short landscape screens need a roster scale override");
  assert.match(shortLandscape[1], /is\(\.cesaret,\.borja,\.bacora,\.bonviure,\.elchica,\.ogalla\)/);
  assert.match(shortLandscape[1], /height:clamp\(144px,44vh,264px\)!important/);
  assert.match(shortLandscape[1], /height:clamp\(150px,46vh,276px\)!important/);
});
