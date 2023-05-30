// addon prefix - used in all nodes, that have to have an ID
const ap = 'kk-utilities-'

const op = ap + 'option-'

const TYPES = {
  CHECKBOX: 1,
  TEXT: 2,
  NUMBER: 3,
  TEXTAREA: 4,
  RANGE: 5
}

const options = {
  jumpToStart: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'jump-to-start',
    featureSelector: `#${ap}jump-to-start`,
    text: 'Jump to start'
  },
  addAtStart: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'add-point-at-start',
    featureSelector: `#${ap}add-annotation-at-start-wrapper`,
    text: 'Add point at start'
  },
  removePointsAtStart: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'remove-points-at-start',
    featureSelector: `#${ap}remove-annotations-at-start-wrapper`,
    text: 'Remove points at start'
  },
  resolutionButtons: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'resolution-buttons',
    featureSelector: `#${ap}res-wrapper`,
    text: 'Resolution buttons'
  },
  toggleBackground: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'toggle-background',
    featureSelector: `#${ap}toggle-background`,
    text: 'Background color switch'
  },
  displayNumberOfSegments: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'display-number-of-segments',
    featureSelector: `#${ap}display-number-of-segments`,
    text: 'Display number of segments'
  },
  showNeuropils: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'show-neuropils',
    featureSelector: `#${ap}show-neuropils`,
    text: 'Show neuropils'
  },
  copyPosition: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'copy-position',
    featureSelector: `#${ap}copy-position-wrapper`,
    text: 'Copy position'
  },
  removeWithCtrlShift: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'remove-with-ctrl-shift',
    text: 'Remove segments when Ctrl and Shift are pressed'
  },
  hideWithAltShift: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'hide-with-alt-shift',
    text: 'Hide segments when Alt and Shift are pressed'
  },
  neuropils: {
    isGroup: true,
    neuropils_opticLobe: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-optic-lobe',
      text: 'Show Optic Lobe'
    },
    neuropils_medulla: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-medulla',
      text: 'Show Medulla'
    },
    neuropils_lobula: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-lobula',
      text: 'Show Lobula'
    },
    neuropils_lobulaPlate: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-lobula-plate',
      text: 'Show Lobula Plate'
    },
    neuropils_accessoryMedulla: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-accessory-medulla',
      text: 'Show Accessory Medulla'
    },
    neuropils_blackBackgroundTransparency: {
      type: TYPES.TEXT,
      optionSelector: op + 'neuropil-transparency-on-black',
      text: 'Neuropil transparency on black background'
    },
    neuropils_whiteBackgroundTransparency: {
      type: TYPES.TEXT,
      optionSelector: op + 'neuropil-transparency-on-white',
      text: 'Neuropil transparency on white background'
    }
  }
}