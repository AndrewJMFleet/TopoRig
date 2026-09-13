// ICT FaceKit's 53-control order, as used in the supplied paper (not standard FACS IDs).
const vocabulary = [
  'browDown_L','browDown_R','browInnerUp_L','browInnerUp_R','browOuterUp_L','browOuterUp_R',
  'cheekPuff_L','cheekPuff_R','cheekSquint_L','cheekSquint_R','eyeBlink_L','eyeBlink_R',
  'eyeLookDown_L','eyeLookDown_R','eyeLookIn_L','eyeLookIn_R','eyeLookOut_L','eyeLookOut_R','eyeLookUp_L','eyeLookUp_R',
  'eyeSquint_L','eyeSquint_R','eyeWide_L','eyeWide_R','jawForward','jawLeft','jawOpen','jawRight',
  'mouthClose','mouthDimple_L','mouthDimple_R','mouthFrown_L','mouthFrown_R','mouthFunnel','mouthLeft',
  'mouthLowerDown_L','mouthLowerDown_R','mouthPress_L','mouthPress_R','mouthPucker','mouthRight',
  'mouthRollLower','mouthRollUpper','mouthShrugLower','mouthShrugUpper','mouthSmile_L','mouthSmile_R',
  'mouthStretch_L','mouthStretch_R','mouthUpperUp_L','mouthUpperUp_R','noseSneer_L','noseSneer_R',
];
const descriptions = {
  browDown:'Lowers the brow.', browInnerUp:'Raises the inner part of the brow.', browOuterUp:'Raises the outer part of the brow.',
  cheekPuff:'Puffs out the cheek.',cheekSquint:'Raises the cheek toward the eye.',eyeBlink:'Closes the eyelid.',
  eyeSquint:'Narrows the eye.',eyeWide:'Opens the eye wider.',jawForward:'Pushes the jaw forward.',
  jawLeft:'Moves the jaw toward the character’s left.',jawOpen:'Lowers the jaw to open the mouth.',jawRight:'Moves the jaw toward the character’s right.',
  mouthClose:'Brings the lips together.',mouthDimple:'Draws the mouth corner inward.',mouthFrown:'Pulls the mouth corner downward.',
  mouthFunnel:'Rounds the lips into a funnel.',mouthLeft:'Moves the mouth toward the character’s left.',
  mouthLowerDown:'Lowers the lower lip.',mouthPress:'Presses the lips together.',mouthPucker:'Pushes the lips forward into a pucker.',
  mouthRight:'Moves the mouth toward the character’s right.',mouthRollLower:'Rolls the lower lip inward.',mouthRollUpper:'Rolls the upper lip inward.',
  mouthShrugLower:'Raises the lower lip.',mouthShrugUpper:'Raises the upper lip.',mouthSmile:'Lifts the mouth corner into a smile.',
  mouthStretch:'Stretches the mouth corner outward.',mouthUpperUp:'Raises the upper lip.',noseSneer:'Lifts the side of the nose and upper lip.',
  eyeLookDown:'Turns the eyeball downward.',eyeLookIn:'Turns the eyeball toward the nose.',eyeLookOut:'Turns the eyeball away from the nose.',eyeLookUp:'Turns the eyeball upward.',
};
const mappedControls = vocabulary.map((name,index)=>{
  const base=name.replace(/_[LR]$/,'');
  const side=name.endsWith('_L')?'left':name.endsWith('_R')?'right':null;
  let label=base.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase();
  label=label[0].toUpperCase()+label.slice(1);
  return {name,au:`AU${String(index).padStart(2,'0')}`,label:label+(side?` · ${side}`:''),
    group:name.startsWith('eyeLook')?'gaze':name.match(/^(brow|cheek|eye|jaw|mouth|nose)/)[0],
    description:descriptions[base]+(side?` Character’s ${side} side.`:'')};
});
// Preserve the original ICT indices after excluding controls from the demo.
export const CONTROLS = mappedControls.filter(c=>c.group!=='gaze'&&!c.name.startsWith('eyeWide'));
export const GAZE_CONTROLS = mappedControls.filter(c=>c.group==='gaze').map(({au,...control})=>control);
