

// below only code for options
function generateHtmlForNumber(optionName, params, value, group) {
  return /*html*/`
    <input
      type="number"
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      data-option-name="${optionName}"
      value="${value}"
    >${params.text}<br />
  `
}


function generateHtmlForText(optionName, params, value, group) {
  return /*html*/`
    <input
      type="text"
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      data-option-name="${optionName}"
      value="${value}"
    >${params.text}<br />
  `
}


function generateHtmlForTextarea(optionName, params, value, group) {
  return /*html*/`
    <textarea
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      data-option-name="${optionName}"
      value="${value}"
    >${params.text}</textarea><br />
  `
}


function generateHtmlForCheckbox(optionName, params, value, group) {
  return /*html*/`
    <label><input
      type="checkbox"
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      data-option-name="${optionName}"
      ${value ? 'checked' : ''}
    >${params.text}</label><br />
  `
}


function generateHtmlForRange(optionName, params, value, group) {
  return /*html*/`
    <label><input
      type="range"
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      value="${value}"
      min="${params.min}"
      max="${params.max}"
      step="${params.step}"
    >${params.text}</label><br />
  `
}


function generateHtmlForInput(optionName, group) {
  let params = group ? options[group][optionName] : options[optionName]
  let value = saveable[optionName]
  let func

  let type = group ? options[group][optionName].type : options[optionName].type

  switch (type) {
    case TYPES.CHECKBOX: func = generateHtmlForCheckbox; break
    case TYPES.TEXT: func = generateHtmlForText; break
    case TYPES.NUMBER: func = generateHtmlForNumber; break
    case TYPES.TEXTAREA: func = generateHtmlForTextarea; break // TODO: doesn't have a handler
    case TYPES.RANGE: func = generateHtmlForRange; break // TODO: doesn't have a handler
  }

  return func(optionName, params, value, group)
}


function generateOptionsHtml() {
  let html = ''
  for (const [optionName, value] of Object.entries(options)) {
    if (value.isGroup) {
      html += '<div class="kk-utilities-options-wrapper">'

      const subOptions = Object.entries(value)
      for (const [subOptionName, subValue] of subOptions) {

        if (subOptionName === 'isGroup') continue
        html += generateHtmlForInput(subOptionName, optionName) // optionName === group name in this case
      }

      html += '</div>'
    }
    else {
      html += generateHtmlForInput(optionName)
    }
  }

  return html
}


function optionsDialogSettings() {
  let prefix = ap + 'options-'
  let dialogId = ap + 'options-dialog'

  return {
    html: generateOptionsHtml(),
    css: /*css*/`
      #${dialogId} {
        font-size: 13px;
        padding-bottom: 5px;
        display: inline-block;
      }

      #${dialogId} input[type="checkbox"] {
        margin-right: 15px;
      }

      #${dialogId} input[type="text"] {
        width: 30px !important;
        margin-right: 10px !important;
        height: 15px !important;
        margin-left: 4px !important;
      }

      .kk-utilities-options-wrapper {
        border: 1px solid gray;
        border-radius: 4px;
      }
    `,
    id: dialogId,
    okCallback: () => {},
    okLabel: 'Close',
    width: 330,
    afterCreateCallback: () => {
      document.querySelectorAll(`#${op}neuropil-transparency-on-black, #${op}neuropil-transparency-on-white`).forEach(el => {
        el.addEventListener('input', e => changeNeuropilTransparencyEventHandler(e))
      })
    }
  }
}


function optionsDialogToggleFeature(optionName, value) {
  const element = document.getElementById(value.optionSelector)
  if (!element || element.type !== 'checkbox') return
  const group = Object.keys(element.dataset).length && element.dataset.group
  const feature = document.querySelectorAll(value.featureSelector)

  if (!feature) return

  const state = element.checked
  feature.forEach(el => el.style.display = state && Object.keys(el.dataset).length ? el.dataset.display : 'none')

  if (optionName === 'removeWithCtrlShift') {
    removeWithCtrlShift = document.getElementById(value.optionSelector).checked
  }

  return state
}


function optionsDialogToggleFeatures(e) {
  let dialogId = ap + 'options-dialog'
  if (e.target.type !== 'checkbox' && e.target.tagName !== 'LABEL') return

  let dialog = e.target
  do {
    dialog = dialog.parentNode
  }
  while (dialog.id !== dialogId && dialog.tagName !== 'BODY')
  
  if (dialog.id !== dialogId) return

  let elementId
  if (e.target.type === 'checkbox') {
    elementId = e.target.id
  }
  else if (e.target.tagName === 'LABEL') {
    elementId = e.target.firstChild.id
  }
  else return

  const element = document.getElementById(elementId)
  const optionName = Object.keys(element.dataset).length && element.dataset.optionName
  if (!optionName) return
  const group = Object.keys(element.dataset).length && element.dataset.group

  const values = group ? options[group][optionName] : options[optionName]
  const value = optionsDialogToggleFeature(optionName, values)

  saveable[optionName] = value
  saveable.visibleFeatures[optionName] = value
  saveToLS()
}


function optionsDialogTextInputHandler(e) {
  const node = e.target

  if (!['text', 'number', 'range'].includes(node.type)) return
  if (!Object.keys(node.dataset).length || node.dataset.optionName) return

  const optionName = node.dataset.optionName
  saveable[optionName] = node.value
  saveToLS()
}


function generateHtml() {
  return /*html*/`
    <button id="kk-utilities-jump-to-start" data-display="block" title="Jump to point, at which you've started this cell">Jump to start</button>
    <label data-display="block" id="kk-utilities-add-annotation-at-start-wrapper" title="Adds annotation at the starting point of the cell">
      <input type="checkbox" id="kk-utilities-add-annotation-at-start">
      Add point at start
    </label>
    <label data-display="block" id="kk-utilities-remove-annotations-at-start-wrapper" title="Removes all annotations, when a new cell has been claimed">
      <input type="checkbox" id="kk-utilities-remove-annotations-at-start">
      Remove points at start
    </label>
    <div id="kk-utilities-res-wrapper" data-display="block">
      <button class="kk-utilities-res" data-resolution="1" title="Changes slides resolution to 1px">1px</button>
      <button class="kk-utilities-res" data-resolution="5" title="Changes slides resolution to 5px">5px</button>
    </div>
    <button id="kk-utilities-toggle-background" data-display="block" title="Switches between white and black background">Background</button>
    <button id="kk-utilities-show-neuropils" data-display="block" title="Shows or hides optic lobe neuropils as separate layers">Neuropils</button>
    <div id="kk-utilities-copy-position-wrapper" data-display="block">
      <button id="kk-utilities-copy-position-copy" title="Copy current position">C-Pos</button>
      <button id="kk-utilities-copy-position-paste" title="Paste copied position">P-Pos</button>
    </div>
    <button id="kk-utilities-options" title="Options to show or hide elements" data-display="block">Options</button>
  `
}
