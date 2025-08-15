let hasCalculatedOnce = false;
let debounceTimer;

// This is the new wrapper function that handles UI effects
function triggerCalculation() {
  const resultsDiv = document.getElementById('results');
  const spinner = document.getElementById('spinner');

  // Show spinner and fade table
  spinner.style.display = 'block';
  resultsDiv.classList.add('fading');

  // Use a short timeout to allow the UI to update before the calculation runs
  setTimeout(() => {
    calculate(); // Run the original calculation logic

    // Hide spinner and fade table back in
    spinner.style.display = 'none';
    resultsDiv.classList.remove('fading');
  }, 50);
}


document.addEventListener('DOMContentLoaded', () => {
  function handleAutoRecalculate() {
    if (hasCalculatedOnce) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        triggerCalculation();
      }, 500);
    }
  }

  function setupSliderSync(inputId, sliderId) {
    const input = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);

    if (input && slider) {
      slider.addEventListener('input', () => {
        input.value = slider.value;
        handleAutoRecalculate();
      });

      input.addEventListener('input', () => {
        if (input.value === '' || isNaN(parseFloat(input.value))) {
          slider.value = 0;
        } else {
          slider.value = input.value;
        }
        handleAutoRecalculate();
      });

      // Enable scroll wheel adjustment when the slider is focused
      slider.addEventListener('wheel', (e) => {
        if (document.activeElement !== slider) return;
        e.preventDefault();

        const stepAttr = slider.getAttribute('step');
        const step = stepAttr ? parseFloat(stepAttr) : 1;
        const minAttr = slider.getAttribute('min');
        const maxAttr = slider.getAttribute('max');
        const min = minAttr !== null ? parseFloat(minAttr) : -Infinity;
        const max = maxAttr !== null ? parseFloat(maxAttr) : Infinity;

        const direction = e.deltaY < 0 ? 1 : -1; // up = increase, down = decrease
        const multiplier = e.shiftKey ? 10 : 1; // hold Shift for faster changes

        const current = parseFloat(slider.value || '0');
        const next = current + direction * step * multiplier;
        const bounded = Math.max(min, Math.min(max, next));
        const decimals = (String(step).split('.')[1] || '').length;
        const rounded = Number(bounded.toFixed(decimals));

        slider.value = rounded;
        input.value = rounded;
        handleAutoRecalculate();
      }, { passive: false });
    }
  }

  function setupRadioListeners(radioGroupName) {
    const radios = document.getElementsByName(radioGroupName);
    radios.forEach(radio => {
      radio.addEventListener('change', handleAutoRecalculate);
    });
  }

  setupSliderSync('initial', 'initialSlider');
  setupSliderSync('rate', 'rateSlider');
  setupSliderSync('years', 'yearsSlider');
  setupSliderSync('contribution', 'contributionSlider');
  setupSliderSync('decreaseValue', 'decreaseValueSlider');
  setupSliderSync('contributionLimit', 'contributionLimitSlider');
  setupSliderSync('monthlyWithdrawal', 'monthlyWithdrawalSlider');
  setupSliderSync('taxRate', 'taxRateSlider');
  setupSliderSync('withdrawStartYear', 'withdrawStartYearSlider');
  setupSliderSync('withdrawInflation', 'withdrawInflationSlider');

  setupRadioListeners('decreaseType');
  setupRadioListeners('frequency');

  const aiExplainButton = document.getElementById('aiExplainButton');
  const apiKeyModal = document.getElementById('apiKeyModal');
  const closeButton = document.querySelector('.close-button');
  const saveApiKeyButton = document.getElementById('saveApiKeyButton');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const explanationDiv = document.getElementById('ai-explanation');
  const explanationPopover = document.getElementById('explanationPopover');
  const explanationPopoverContent = document.getElementById('explanationPopoverContent');

  const applicationDescription = `Investment Calculator & Withdrawal Planner\n\nThis single-page tool lets users model long-term investing with:\n- initial capital\n- annual interest rate, compounded yearly or monthly\n- annual contributions that can decrease each year (fixed amount or percent), with an optional contribution limit in years\n- taxes applied to investment gains\n- a retirement phase with net (after-tax) monthly withdrawals that begin after a chosen year and grow with inflation\n\nThe left panel is a sticky form with numeric inputs, sliders, and radio groups. The right panel shows a table of per-year results including annual and monthly contributions, gross withdrawals, and ending balance. As inputs change after the first run, calculations auto-debounce.\n\nAdditional features:\n- inline tooltips explain each field\n- a 'Copy URL' button serializes current inputs into the query string for sharing\n- an 'AI Explain' button summarizes the plan using Google Gemini, based on current inputs and the last computed results.`;

  let apiKeyWaiters = [];
  function requestGeminiApiKey() {
    const existing = localStorage.getItem('geminiApiKey');
    if (existing) return Promise.resolve(existing);
    apiKeyModal.style.display = 'block';
    return new Promise((resolve, reject) => {
      apiKeyWaiters.push({ resolve, reject });
    });
  }

  function hidePopover() {
    if (explanationPopover.style.display === 'block') {
      explanationPopover.style.display = 'none';
      document.removeEventListener('click', handleOutsideClick, true);
    }
  }

  function showPopover(targetElement, text, addOutsideClickListener) {
    explanationPopoverContent.textContent = text;
    explanationPopover.style.display = 'block';
    const popoverRect = explanationPopover.getBoundingClientRect();
    const rect = targetElement.getBoundingClientRect();

    let top = rect.top - popoverRect.height - 15;
    let left = rect.left + (rect.width / 2) - (popoverRect.width / 2);

    explanationPopover.classList.remove('arrow-bottom');
    if (top < 0) {
      top = rect.bottom + 15;
    } else {
      explanationPopover.classList.add('arrow-bottom');
    }
    if (left < 0) left = 10;
    if (left + popoverRect.width > window.innerWidth) {
      left = window.innerWidth - popoverRect.width - 10;
    }

    explanationPopover.style.top = `${top + window.scrollY}px`;
    explanationPopover.style.left = `${left + window.scrollX}px`;

    if (addOutsideClickListener) {
      setTimeout(() => {
        document.addEventListener('click', handleOutsideClick, true);
      }, 100);
    }
  }

  function handleOutsideClick(event) {
    if (!explanationPopover.contains(event.target)) {
      hidePopover();
    }
  }

  function startGlobalInspector(apiKey) {
    if (!window.ElementInspector || typeof window.ElementInspector.configure !== 'function') {
      alert('Global explain library is not available.');
      return;
    }

    hidePopover(); // Hide any previous popover

    globalExplainButton.classList.add('active');

    try {
      window.ElementInspector.configure({
        apiKey: apiKey,
        applicationDescription: applicationDescription
      });
    } catch (e) {
      console.error('ElementInspector.configure failed', e);
    }

    const overrides = {
      pageHtml: document.documentElement.outerHTML,
      onExplanationStart: () => {
        document.documentElement.classList.add('cursor-wait-active');
      },
      onExplanationEnd: () => {
        document.documentElement.classList.remove('cursor-wait-active');
      },
    };

    window.ElementInspector.captureAndExplain(overrides)
      .then(function(out) {
        if (out && out.result && out.result.ok) {
          showPopover(out.element, out.result.answerText, true);
        } else if (out && out.result) {
          alert('Explanation failed: ' + (out.result.message || out.result.code));
        }
      })
      .catch(function(err) {
        alert('Capture or explanation error: ' + (err && err.message));
      })
      .finally(function() {
        globalExplainButton.classList.remove('active');
        hidePopover();
      });
  }

  const globalExplainButton = document.getElementById('globalExplainButton');
  if (globalExplainButton) {
    globalExplainButton.addEventListener('click', async () => {
      if (globalExplainButton.classList.contains('active')) return;

      globalExplainButton.classList.add('active');
      showPopover(globalExplainButton, 'Now click/touch any element on the page to get a hint about it.', false);

      try {
        const apiKey = await requestGeminiApiKey();
        startGlobalInspector(apiKey);
      } catch (error) {
        console.error(error);
        globalExplainButton.classList.remove('active');
        hidePopover();
      }
    });
    
    let isDragging = false;
    let wasDragged = false;
    let startX, startY, offsetX, offsetY;
    const dragThreshold = 5;

    const onPointerDown = (e) => {
      isDragging = true;
      wasDragged = false;
      const event = e.type.startsWith('touch') ? e.touches[0] : e;
      const rect = globalExplainButton.getBoundingClientRect();

      startX = event.clientX;
      startY = event.clientY;
      offsetX = startX - rect.left;
      offsetY = startY - rect.top;

      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const event = e.type.startsWith('touch') ? e.touches[0] : e;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (!wasDragged && (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)) {
        wasDragged = true;
      }

      if (wasDragged) {
          let x = event.clientX - offsetX;
          let y = event.clientY - offsetY;
          const rect = globalExplainButton.getBoundingClientRect();
          x = Math.max(0, Math.min(x, window.innerWidth - rect.width));
          y = Math.max(0, Math.min(y, window.innerHeight - rect.height));
          globalExplainButton.style.left = `${x}px`;
          globalExplainButton.style.top = `${y}px`;
          globalExplainButton.style.right = 'auto';
          globalExplainButton.style.bottom = 'auto';
      }
      if (e.type === 'touchmove') e.preventDefault();
    };

    const onPointerUp = async () => {
      isDragging = false;
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
    };

    globalExplainButton.addEventListener('mousedown', onPointerDown);
    globalExplainButton.addEventListener('touchstart', onPointerDown, { passive: false });
  }

  aiExplainButton.addEventListener('click', async () => {
    const apiKey = await requestGeminiApiKey();
    getAIExplanation(apiKey);
  });

  function cancelApiKeyRequest() {
    apiKeyModal.style.display = 'none';
    if (apiKeyWaiters.length) {
      apiKeyWaiters.forEach(({ reject }) => reject(new Error('API key request cancelled by user.')));
      apiKeyWaiters = [];
    }
  }

  closeButton.addEventListener('click', cancelApiKeyRequest);

  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      localStorage.setItem('geminiApiKey', apiKey);
      apiKeyModal.style.display = 'none';
      if (apiKeyWaiters.length) {
        apiKeyWaiters.forEach(({ resolve }) => resolve(apiKey));
        apiKeyWaiters = [];
      }
    } else {
      alert('Please enter a valid API key.');
    }
  });

  window.addEventListener('click', (event) => {
    if (event.target == apiKeyModal) {
      cancelApiKeyRequest();
    }
  });

  async function getAIExplanation(apiKey) {
    explanationDiv.innerHTML = '<div class="loading-dots"><span class="dot1"></span><span class="dot2"></span><span class="dot3"></span></div>';
    explanationDiv.style.display = 'block';

    const inputs = {
      initial: document.getElementById('initial').value,
      rate: document.getElementById('rate').value,
      years: document.getElementById('years').value,
      startContribution: document.getElementById('contribution').value,
      decreaseType: document.querySelector('input[name="decreaseType"]:checked').value,
      decreaseValue: document.getElementById('decreaseValue').value,
      contributionLimit: document.getElementById('contributionLimit').value || 'no limit',
      freq: document.querySelector('input[name="frequency"]:checked').value === '12' ? 'Monthly' : 'Yearly',
      netMonthlyWithdrawal: document.getElementById('monthlyWithdrawal').value,
      taxRate: document.getElementById('taxRate').value,
      withdrawStartYear: document.getElementById('withdrawStartYear').value,
      withdrawInflation: document.getElementById('withdrawInflation').value,
    };

    const resultsTable = document.querySelector('#results table');
    let resultsSummary = 'No results calculated yet.';
    if (resultsTable) {
      const finalRow = resultsTable.rows[resultsTable.rows.length - 1];
      const finalBalance = finalRow.cells[finalRow.cells.length - 1].innerText;
      resultsSummary = `The final balance after ${inputs.years} years is ${finalBalance}.`;
    }

    const prompt = `
You are a helpful financial assistant. Based on the following investment calculator inputs and results, provide a simple, one-paragraph explanation for a non-expert. Explain what the user is planning to do and what the outcome will be. Be concise and clear.

**Inputs:**
- Initial Investment: $${inputs.initial}
- Annual Interest Rate: ${inputs.rate}%
- Number of Years to Grow: ${inputs.years}
- Starting Annual Contribution: $${inputs.startContribution}
- Contribution Decrease Type: ${inputs.decreaseType}
- Contribution Decrease Value: ${inputs.decreaseValue}
- Contribution Limit Years: ${inputs.contributionLimit}
- Compounding Frequency: ${inputs.freq}
- Monthly Withdrawal (Net): $${inputs.netMonthlyWithdrawal}
- Investment Tax Fee: ${inputs.taxRate}%
- Withdrawals Start After Year: ${inputs.withdrawStartYear}
- Withdrawal Inflation Rate: ${inputs.withdrawInflation}%

**Calculation Summary:**
${resultsSummary}

Generate a natural language summary.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'API Error');
      }

      const data = await response.json();
      const explanation = data.candidates[0].content.parts[0].text;
      explanationDiv.innerHTML = explanation;

    } catch (error) {
      explanationDiv.innerHTML = `Error: ${error.message}. Please check your API key or network connection.`;
      localStorage.removeItem('geminiApiKey'); // Clear invalid key
    }
  }

  function getInputs() {
    const inputs = {
      initial: document.getElementById('initial').value,
      rate: document.getElementById('rate').value,
      years: document.getElementById('years').value,
      contribution: document.getElementById('contribution').value,
      decreaseType: document.querySelector('input[name="decreaseType"]:checked').value,
      decreaseValue: document.getElementById('decreaseValue').value,
      contributionLimit: document.getElementById('contributionLimit').value,
      frequency: document.querySelector('input[name="frequency"]:checked').value,
      monthlyWithdrawal: document.getElementById('monthlyWithdrawal').value,
      taxRate: document.getElementById('taxRate').value,
      withdrawStartYear: document.getElementById('withdrawStartYear').value,
      withdrawInflation: document.getElementById('withdrawInflation').value,
    };
    return inputs;
  }

  function generateShareUrl() {
    const inputs = getInputs();
    const jsonString = JSON.stringify(inputs);
    const base64String = btoa(jsonString);
    const url = new URL(window.location.href);
    url.searchParams.set('data', base64String);
    return url.toString();
  }

  const copyUrlButton = document.getElementById('copyUrlButton');
  copyUrlButton.addEventListener('click', () => {
    const url = generateShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      copyUrlButton.textContent = 'Copied!';
      setTimeout(() => {
        copyUrlButton.textContent = 'Copy URL';
      }, 2000);
    }, () => {
      alert('Failed to copy URL.');
    });
  });

  function applyUrlData() {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (data) {
      try {
        const jsonString = atob(data);
        const inputs = JSON.parse(jsonString);

        document.getElementById('initial').value = inputs.initial;
        document.getElementById('rate').value = inputs.rate;
        document.getElementById('years').value = inputs.years;
        document.getElementById('contribution').value = inputs.contribution;
        document.querySelector(`input[name="decreaseType"][value="${inputs.decreaseType}"]`).checked = true;
        document.getElementById('decreaseValue').value = inputs.decreaseValue;
        document.getElementById('contributionLimit').value = inputs.contributionLimit;
        document.querySelector(`input[name="frequency"][value="${inputs.frequency}"]`).checked = true;
        document.getElementById('monthlyWithdrawal').value = inputs.monthlyWithdrawal;
        document.getElementById('taxRate').value = inputs.taxRate;
        document.getElementById('withdrawStartYear').value = inputs.withdrawStartYear;
        document.getElementById('withdrawInflation').value = inputs.withdrawInflation;

        // Sync sliders
        const inputIds = ['initial', 'rate', 'years', 'contribution', 'decreaseValue', 'contributionLimit', 'monthlyWithdrawal', 'taxRate', 'withdrawStartYear', 'withdrawInflation'];
        inputIds.forEach(id => {
          const input = document.getElementById(id);
          const slider = document.getElementById(id + 'Slider');
          if (input && slider) {
            slider.value = input.value;
          }
        });

        triggerCalculation();
      } catch (e) {
        console.error('Failed to parse URL data:', e);
      }
    }
  }

  applyUrlData();
});

// This function now just contains the core calculation logic
function calculate() {
  const initial = parseFloat(document.getElementById('initial').value);
  const rate = parseFloat(document.getElementById('rate').value) / 100;
  const years = parseInt(document.getElementById('years').value);
  const startContribution = parseFloat(document.getElementById('contribution').value);
  const decreaseType = document.querySelector('input[name="decreaseType"]:checked').value;
  const decreaseValue = parseFloat(document.getElementById('decreaseValue').value);
  const contributionLimit = parseInt(document.getElementById('contributionLimit').value) || 0;
  const freq = parseInt(document.querySelector('input[name="frequency"]:checked').value);

  let netMonthlyWithdrawal = parseFloat(document.getElementById('monthlyWithdrawal').value);
  const taxRate = parseFloat(document.getElementById('taxRate').value) / 100;
  const withdrawStartYear = parseInt(document.getElementById('withdrawStartYear').value);
  const withdrawInflation = parseFloat(document.getElementById('withdrawInflation').value) / 100;

  let balance = initial;
  let annualContribution = startContribution;

  let output = `<table><tr>
                  <th>Year</th>
                  <th>Annual Contribution</th>
                  <th>Monthly Contribution</th>
                  <th>Annual Withdrawal (Gross)</th>
                  <th>Monthly Withdrawal (Gross)</th>
                  <th>End Balance</th>
                </tr>`;

  for (let y = 1; y <= years; y++) {
    let perPeriodRate = rate / freq;
    let periodContribution = 0;

    if (contributionLimit === 0 || y <= contributionLimit) {
      periodContribution = annualContribution / freq;
    }

    let monthlyContributionDisplay = (contributionLimit === 0 || y <= contributionLimit) ? annualContribution / 12 : 0;
    let grossMonthlyWithdrawalDisplay = 0;
    let grossAnnualWithdrawalDisplay = 0;
    let periodWithdrawal = 0;

    if (y > withdrawStartYear) {
      let grossMonthlyWithdrawal = netMonthlyWithdrawal / (1 - taxRate);
      grossMonthlyWithdrawalDisplay = grossMonthlyWithdrawal;
      grossAnnualWithdrawalDisplay = grossMonthlyWithdrawal * 12;
      periodWithdrawal = grossAnnualWithdrawalDisplay / freq;
    }

    for (let p = 0; p < freq; p++) {
      balance += periodContribution;
      if (y > withdrawStartYear) balance -= periodWithdrawal;
      balance *= (1 + perPeriodRate);
    }

    output += `<tr>
                 <td>${y}</td>
                 <td>${(contributionLimit === 0 || y <= contributionLimit) ? annualContribution.toFixed(2) : "0.00"}</td>
                 <td>${monthlyContributionDisplay.toFixed(2)}</td>
                 <td>${grossAnnualWithdrawalDisplay.toFixed(2)}</td>
                 <td>${grossMonthlyWithdrawalDisplay.toFixed(2)}</td>
                 <td>${balance.toFixed(2)}</td>
               </tr>`;

    if ((contributionLimit === 0 || y < contributionLimit)) {
      if (decreaseType === "fixed") {
        annualContribution = Math.max(0, annualContribution - decreaseValue);
      } else if (decreaseType === "percent") {
        annualContribution = Math.max(0, annualContribution * (1 - decreaseValue / 100));
      }
    }

    if (y >= withdrawStartYear) {
      netMonthlyWithdrawal *= (1 + withdrawInflation);
    }
  }

  output += "</table>";
  document.getElementById('results').innerHTML = output;

  // Set the flag to true after the first successful calculation
  if (!hasCalculatedOnce) {
    hasCalculatedOnce = true;
  }
  document.getElementById('aiExplainButton').disabled = false;
}
