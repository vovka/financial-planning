function calculate() {
  const initial = parseFloat(document.getElementById('initial').value);
  const rate = parseFloat(document.getElementById('rate').value) / 100;
  const years = parseInt(document.getElementById('years').value);
  const startContribution = parseFloat(document.getElementById('contribution').value);
  const decreaseType = document.getElementById('decreaseType').value;
  const decreaseValue = parseFloat(document.getElementById('decreaseValue').value);
  const contributionLimit = parseInt(document.getElementById('contributionLimit').value) || 0;
  const freq = parseInt(document.getElementById('frequency').value);

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

    // Stop contributions after limit year (if set)
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

    // Decrease contribution only if still contributing next year
    if ((contributionLimit === 0 || y < contributionLimit)) {
      if (decreaseType === "fixed") {
        annualContribution = Math.max(0, annualContribution - decreaseValue);
      } else if (decreaseType === "percent") {
        annualContribution = Math.max(0, annualContribution * (1 - decreaseValue / 100));
      }
    }

    // Apply withdrawal inflation after each year if in withdrawal phase
    if (y >= withdrawStartYear) {
      netMonthlyWithdrawal *= (1 + withdrawInflation);
    }
  }

  output += "</table>";
  document.getElementById('results').innerHTML = output;
}
