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
}
