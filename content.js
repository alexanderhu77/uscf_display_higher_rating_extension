console.log("Script loaded: waiting for results table to appear after search...");

function addHeader() {
  const headerRow = document.querySelector('table.table.table-bordered thead tr');
  if (headerRow && !headerRow.querySelector('th.crm-search-high-rating')) {
    const newHeader = document.createElement('th');
    newHeader.textContent = 'High Rating';
    newHeader.className = 'crm-sortable-col crm-search-high-rating';
    newHeader.style.fontWeight = 'bold';
    headerRow.appendChild(newHeader);
    console.log("Added High Rating header");
  }
}

function processPlayerRows() {
  const playerRows = document.querySelectorAll('table.table.table-bordered tbody tr:not(.ng-hide)');
  console.log(`Found ${playerRows.length} player rows`);

  if (playerRows.length === 0) {
    console.log("No rows found, inspecting tbody...");
    const tbody = document.querySelector('table.table.table-bordered tbody');
    if (tbody) {
      console.log(`Tbody exists, innerHTML length: ${tbody.innerHTML.length}, classes: ${tbody.className}`);
    } else {
      console.log("Tbody not found");
    }
    setTimeout(processPlayerRows, 500); // Retry after delay
    return;
  }

  playerRows.forEach((row, index) => {
    if (row.dataset.processed === "true" && document.querySelectorAll('table.table.table-bordered tbody tr').length !== playerRows.length) {
      delete row.dataset.processed;
      console.log(`Row ${index}: Processed flag cleared due to table update`);
    }
    if (row.dataset.processed === "true") {
      console.log(`Row ${index}: Already processed, skipping`);
      return;
    }
    row.dataset.processed = "true";

    const memberIdCell = row.querySelector('td:nth-child(2)');
    if (!memberIdCell) {
      console.log(`Row ${index}: No Member ID cell found`);
      const newCell = document.createElement('td');
      newCell.textContent = 'Click to Load';
      newCell.style.fontWeight = 'bold';
      newCell.style.cursor = 'pointer';
      newCell.addEventListener('click', () => fetchRating(row, index));
      row.appendChild(newCell);
      return;
    }

    const memberId = memberIdCell.textContent.trim();
    if (!memberId || isNaN(parseInt(memberId))) {
      console.log(`Row ${index}: Invalid Member ID: ${memberId}`);
      const newCell = document.createElement('td');
      newCell.textContent = 'Click to Load';
      newCell.style.fontWeight = 'bold';
      newCell.style.cursor = 'pointer';
      newCell.addEventListener('click', () => fetchRating(row, index));
      row.appendChild(newCell);
      return;
    }

    const newCell = document.createElement('td');
    newCell.textContent = 'Click to Load';
    newCell.style.fontWeight = 'bold';
    newCell.style.cursor = 'pointer';
    newCell.addEventListener('click', () => fetchRating(row, index));
    row.appendChild(newCell);
  });
}

function fetchRating(row, index) {
  const memberIdCell = row.querySelector('td:nth-child(2)');
  const memberId = memberIdCell.textContent.trim();
  const msaUrl = `https://www.uschess.org/msa/MbrDtlMain.php?${memberId}`;
  const liveUrl = `https://www.uschess.org/msa/MbrDtlTnmtHst.php?${memberId}`;
  console.log(`Row ${index}: Fetching MSA and live pages for Member ID: ${memberId} on click`);

  const newCell = row.querySelector('td:last-child');
  newCell.textContent = 'Loading...';
  newCell.style.color = 'orange';

  // Fetch MSA page (official rating)
  chrome.runtime.sendMessage({ type: "fetchMSA", url: msaUrl }, (msaResponse) => {
    if (chrome.runtime.lastError) {
      console.error(`Row ${index}: MSA message send failed`, chrome.runtime.lastError.message);
      newCell.textContent = 'High Rating: Connection Error';
      newCell.style.color = 'red';
      return;
    }
    if (!msaResponse) {
      console.error(`Row ${index}: No MSA response from background script`);
      newCell.textContent = 'High Rating: No Response';
      newCell.style.color = 'red';
      return;
    }
    if (msaResponse.error) {
      console.error(`Row ${index}: MSA fetch failed`, msaResponse.error);
      newCell.textContent = 'High Rating: Error';
      newCell.style.color = 'red';
      return;
    }

    // Fetch live page (current rating)
    chrome.runtime.sendMessage({ type: "fetchMSA", url: liveUrl }, (liveResponse) => {
      if (chrome.runtime.lastError) {
        console.error(`Row ${index}: Live message send failed`, chrome.runtime.lastError.message);
        newCell.textContent = 'High Rating: Connection Error';
        newCell.style.color = 'red';
        return;
      }
      if (!liveResponse) {
        console.error(`Row ${index}: No live response from background script`);
        newCell.textContent = 'High Rating: No Response';
        newCell.style.color = 'red';
        return;
      }
      if (liveResponse.error) {
        console.error(`Row ${index}: Live fetch failed`, liveResponse.error);
        newCell.textContent = 'High Rating: Error';
        newCell.style.color = 'red';
        return;
      }

      // Parse MSA page
      console.log(`Row ${index}: MSA page fetched, parsing started`);
      const msaParser = new DOMParser();
      const msaDoc = msaParser.parseFromString(msaResponse.data, 'text/html');
      const msaTables = msaDoc.querySelectorAll('table');
      console.log(`Row ${index}: Found ${msaTables.length} tables on MSA page`);
      if (msaTables.length < 5) {
        console.log(`Row ${index}: No tables found on MSA page`);
        newCell.textContent = 'High Rating: N/A';
        newCell.style.color = 'red';
        return;
      }

      const msaRatingTable = msaTables[msaTables.length - 1];
      const msaRows = msaRatingTable.querySelectorAll('tr');
      console.log(`Row ${index}: MSA rating table has ${msaRows.length} rows`);
      if (msaRows.length < 5) {
        console.log(`Row ${index}: MSA rating table has insufficient rows`);
        newCell.textContent = 'High Rating: N/A';
        newCell.style.color = 'red';
        return;
      }

      let official = null;
      for (let i = 2; i < msaRows.length; i++) {
        const cells = msaRows[i].querySelectorAll('td');
        if (cells.length < 2) continue;
        const label = cells[0].textContent.trim();
        const ratingStr = cells[1].textContent.trim().split(' ')[0];
        const rating = parseInt(ratingStr, 10);
        if (!isNaN(rating) && label === 'Regular Rating') {
          official = rating;
          break;
        }
      }

      // Parse live page for current rating
      console.log(`Row ${index}: Live page fetched, parsing started`);
      const liveParser = new DOMParser();
      const liveDoc = liveParser.parseFromString(liveResponse.data, 'text/html');
      let liveRating = null;
      const currentRatingElement = liveDoc.querySelector('body > table > tbody > tr:nth-child(3) > td > center > table:nth-child(4) > tbody > tr:nth-child(2) > td > table:nth-child(3) > tbody > tr:nth-child(3) > td:nth-child(3) > b');
      if (currentRatingElement) {
        const ratingStr = currentRatingElement.textContent.trim().split(' ')[0];
        liveRating = parseInt(ratingStr, 10);
        console.log(`Row ${index}: Live rating extracted: ${liveRating}`);
      } else {
        console.log(`Row ${index}: Current rating element not found`);
      }

      console.log(`Row ${index}: Official=${official}, Live=${liveRating}`);
      let highest = null;
      if (official !== null && !isNaN(official)) official = parseInt(official);
      if (liveRating !== null && !isNaN(liveRating)) liveRating = parseInt(liveRating);

      if (official !== null && liveRating !== null) {
        highest = Math.max(official, liveRating);
      } else if (official !== null) {
        highest = official;
      } else if (liveRating !== null) {
        highest = liveRating;
      }

      newCell.textContent = `High Rating: ${highest !== null ? highest : 'N/A'}`;
      newCell.style.color = highest !== null ? 'darkgreen' : 'red';
      newCell.style.cursor = 'default';
      newCell.removeEventListener('click', () => fetchRating(row, index));
    });
  });
}

// Persistent observer for table appearance after searches
const tableObserver = new MutationObserver((mutations, observer) => {
  const table = document.querySelector('table.table.table-bordered');
  if (table) {
    console.log("Table detected after search. Attaching row observer...");
    addHeader();

    const tbody = table.querySelector('tbody');
    if (tbody) {
      const rowObserver = new MutationObserver(() => {
        console.log("Rows updated: processing player rows...");
        addHeader();
        processPlayerRows();
      });

      rowObserver.observe(tbody, { childList: true, subtree: true });
      processPlayerRows();
    } else {
      console.log("Tbody not found in table");
    }
  }
});

tableObserver.observe(document.body, { childList: true, subtree: true});