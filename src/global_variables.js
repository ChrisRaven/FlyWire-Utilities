let shift = false
let ctrl = false
let alt = false
let removeWithCtrlShift = false
let hideWithAltShift = false

let saveable = {
  roots: {},
  leaves: {},
  startCoords: null,
  addAnnotationAtStartState: false,
  removeAnnotationsAtStartState: false,
  startAnnotationId: 0,
  visibleFeatures: {
    jumpToStart: true,
    addAtStart: true,
    removePointsAtStart: true,
    resolutionButtons: true,
    background: true,
    neuropils: true,
    copyPosition: true,
    removeWithCtrlShift: false,
    hideWithAltShift: false
  },
  neuropils_opticLobe: true,
  neuropils_medulla: true,
  neuropils_lobula: true,
  neuropils_lobulaPlate: true,
  neuropils_accessoryMedulla: true,
  neuropils_blackBackgroundTransparency: 0.1,
  neuropils_whiteBackgroundTransparency: 0.05,
  currentResolutionButton: 1,
  backgroundColor: 'black',
  displayNumberOfSegments: true
}