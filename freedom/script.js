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

  aiExplainButton.addEventListener('click', () => {
    let apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
      apiKeyModal.style.display = 'block';
    } else {
      getAIExplanation(apiKey);
    }
  });

  closeButton.addEventListener('click', () => {
    apiKeyModal.style.display = 'none';
  });

  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      localStorage.setItem('geminiApiKey', apiKey);
      apiKeyModal.style.display = 'none';
      getAIExplanation(apiKey);
    } else {
      alert('Please enter a valid API key.');
    }
  });

  window.addEventListener('click', (event) => {
    if (event.target == apiKeyModal) {
      apiKeyModal.style.display = 'none';
    }
  });

  async function getAIExplanation(apiKey) {
    explanationDiv.innerHTML = '<div class="spinner"></div>';
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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
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
