'use strict'

/**
 * @param {string} timeStr - The time in format 'hh:mm'
 * @returns {number} - Minutes
 */
function _t(timeStr) {
  const [h, m] = timeStr.split(':').map(x => parseInt(x, 10))
  return h * 60 + m
}

// Remove a DOM element
function removeElement(ele) {
  ele.parentNode.removeChild(ele)
}

// Parse table cell to time
function cellToTime(cell) {
  const cellInfos = cell.innerHTML.match(/\d+\:\d+/)
  if (cellInfos.length === 0) {
    return null
  } else {
    return _t(cellInfos[0])
  }
}

/**
 * @param {number} minutes - Minutes
 * @returns {string} - The time in format 'hh:mm'
 */
function formatTime(min) {
  if (min < 0) {
    return 'N/A'
  }

  let hr = Math.floor(min / 60)
  min = (min % 60).toString().padStart(2, '0')

  return `${hr}:${min}`
}

function timeEmoji(time) {
  if (time < _t('8:00')) {
    // :*
    return '&#x1F910'
  } else if (time < _t('8:15')) {
    return '&#x1F92B'
  } else if (time < _t('8:30')) {
    // :)
    return '&#x1F642'
  } else if (time < _t('9:00')) {
    return '&#x1F44D'
  } else if (time < _t('10:00')) {
    return '&#x1F91D'
  } else if (time < _t('12:00')) {
    // <3
    return '&#x1F60D'
  } else {
    // $.$
    return '&#x1F911'
  }
}

function parseRowWorkTime(row) {
  const REST_TIME = 60

  const { cells } = row
  const [startTime, endTime] = [cells[1], cells[3]].map(cellToTime)

  if (startTime && endTime) {
    return endTime - startTime - REST_TIME
  } else {
    return 0
  }
}

function appendToRow(row, content, { query } = {}) {
  let goodChild = row.cells[0]
  let clonedCol = goodChild.cloneNode(true)

  clonedCol.removeAttribute("data-reactid")

  if (query) {
    clonedCol.querySelector(query).innerHTML = content
  } else {
    clonedCol.innerHTML = content
  }

  goodChild.parentNode.appendChild(clonedCol)
}

function appendToHeader(headerTable, content) {
  appendToRow(headerTable.rows[0], content, 'span')
}

function appendToDataRow(row, content) {
  appendToRow(row, content)
}

/**
 * Append time info to each row, and return total time
 * @param {array} rows - Rows of data table
 * @returns {number} - Sum of working time
 */
function appendWorkTimeToRows(rows) {
  let sum = 0

  for (let i = 0; i < rows.length; i += 1) {
    let row = rows[i]
    if (row.cells.length < 5) { continue }

    let time = parseRowWorkTime(row)
    sum += time
    appendWorkTimeToRow(row, time)
  }

  return sum
}

function appendAvgTime(table, time) {
  const { rows } = table
  if (!rows || rows.length === 0) { return }

  const rowsParent = rows[0].parentNode
  let row = document.createElement('tr');
  let col = document.createElement('td');

  const avg = Math.floor(time / rows.length)
  col.innerHTML = `您的平均工時只有 ${formatTime(avg)}。請多加努力。`

  col.setAttribute('colspan', '8')
  row.appendChild(col)
  rowsParent.appendChild(row)
}

function appendWorkTimeToTable(dataTable) {
  const { rows } = dataTable
  const { length } = rows
  if (length === 0) { return }

  const lastRow = rows[length - 1]
  if ( lastRow.cells.length === 1) {
    removeElement(lastRow)
  }

  let time = appendWorkTimeToRows(rows)
  appendAvgTime(dataTable, time)
}

function appendWorkTimeToRow(row, time) {
  const text = formatTime(time)
  const emoji = timeEmoji(time)
  appendToDataRow(row, `${text} ${emoji}`)
}

function hasContent(table, s) {
  const { rows } = table
  if (!rows || rows.length === 0) { return false }
  const cells = rows[rows.length - 1].cells
  if (!cells || cells.length === 0) { return false }

  const cell = cells[cells.length - 1]
  return cell.innerHTML.includes(s)
}

function getTables() {
  return document.querySelectorAll('div.ta_grid_table > table')
}

function tableIsCreated() {
  let tables = getTables()

  if (!tables || tables.length < 2) {
    return false
  }

  let dataTable = tables[1]
  return dataTable.rows.length > 1
}

let running = false
function run() {
  if (running) { return }
  running = true

  let tables = getTables()
  let headerTable = tables[0]
  let dataTable = tables[1]

  if (!hasContent(headerTable, '當日工時')) {
    appendToHeader(headerTable, '當日工時')
  }
  appendWorkTimeToTable(dataTable)

  setTimeout(() => { running = false }, 500)
}

let runned = false
const callback = function(mutationsList) {
  for(let mutation of mutationsList) {
    if (runned) { return }

    if (mutation.type == 'childList' && tableIsCreated()) {
      runned = true

      // wait for TUBE React rendering
      setTimeout(() => { run() }, 300)
      setTimeout(() => { runned = false }, 2000)
    }
  }
};

const observer = new MutationObserver(callback);
const options = { attributes: true, childList: true, subtree: true }
observer.observe(document, options);
