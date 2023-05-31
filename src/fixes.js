

function fix_segmentColors_2022_07_15() {
  if (Dock.ls.get('fix_segmentColors_2022_07_15') === 'fixed') return

  Object.entries(localStorage).forEach(entry => {
    if (entry[0].includes('neuroglancerSaveState_v2-')) {
      let e = JSON.parse(entry[1])
      if (e.state && e.state.layers) {
        e.state.layers.forEach(layer => {
          if (layer.type === 'segmentation_with_graph' && layer.segmentColors) {
            layer.segmentColors = {}
            localStorage.setItem(entry[0], JSON.stringify(e))
          }
        })
      }
    }
  })
  Dock.ls.set('fix_segmentColors_2022_07_15', 'fixed')
}


function fix_visibilityOptions_2022_07_30() {
  if (Dock.ls.get('fix_visibilityOptions_2022_07_30') === 'fixed') return

  let settings = Dock.ls.get('utilities', true)
  if (!settings) return

  if (!settings.options) return
  settings.options['kk-utilities-options-toggle-resolution-buttons'].selector = '#kk-utilities-res-wrapper'

  Dock.ls.set('utilities', settings, true)
  Dock.ls.set('fix_visibilityOptions_2022_07_30', 'fixed')
}


function fix_optionsOrganization_2022_08_15() {
  if (Dock.ls.get('fix_optionsOrganization_2022_08_15') === 'fixed') return

  let settings = Dock.ls.get('utilities', true)
  if (!settings) return

  function update(oldName, newName) {
    let option
    let value
    
    option = settings.options[oldName]
    if (!option) return
    value = option.value === undefined ? option.state : option.value
    settings[newName] = value
  }

  if (settings.options) {
    update('kk-utilities-options-toggle-jump-to-start', 'jumpToStart')
    update('kk-utilities-options-toggle-add-point-at-start', 'addAtStart')
    update('kk-utilities-options-toggle-remove-points-at-start', 'removePointsAtStart')
    update('kk-utilities-options-toggle-resolution-buttons', 'resolutionButtons')
    update('kk-utilities-options-toggle-toggle-background', 'toggleBackground')
    update('kk-utilities-options-toggle-show-neuropils', 'showNeuropils')
    delete settings.options
  }

  let leaves = {}
  for(const [key, value] of Object.entries(settings.leaves)) {
    if (value[0] !== null && value[0] !== undefined && !isNaN(value[0])) {
      leaves[key] = value
    }
  }
  settings.leaves = leaves

  let roots = {}
  for(const [key, value] of Object.entries(settings.roots)) {
    if (value[0] !== null && value[0] !== undefined && !isNaN(value[0])) {
      roots[key] = value
    }
  }
  settings.roots = roots

  Dock.ls.set('utilities', settings, true)
  Dock.ls.set('fix_optionsOrganization_2022_08_15', 'fixed')
}

function fix_removeLeavesAndRoots_2023_05_31() {
  if (Dock.ls.get('fix_removeLeavesAndRoots_2023_05_31') === 'fixed') return

  let settings = Dock.ls.get('utilities', true)
  if (!settings) return

  delete settings.leaves
  delete settings.roots

  Dock.ls.set('utilities', settings, true)
  Dock.ls.set('fix_removeLeavesAndRoots_2023_05_31', 'fixed')
}
