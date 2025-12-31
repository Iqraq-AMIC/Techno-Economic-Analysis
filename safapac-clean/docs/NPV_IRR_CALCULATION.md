Scenario 1: No Tax (Simple Pre-Tax Model)
=== INPUTS ===
TCI (Total Capital Investment) = $400,000,000
Annual Revenue                 = $1,177,500,000
Annual OPEX                    = $710,150,000
Project Lifetime               = 20 years
Discount Rate                  = 7%

=== CASH FLOW CALCULATION ===

Year 0 (Construction):
  Cash Flow = -TCI
            = -$400,000,000

Years 1-20 (Operations):
  Cash Flow = Revenue - OPEX
            = $1,177,500,000 - $710,150,000
            = $467,350,000/year

=== CASH FLOWS ARRAY ===
cash_flows = [-400,000,000, 467,350,000, 467,350,000, ..., 467,350,000]
             (Year 0)       (Year 1)     (Year 2)          (Year 20)

=== NPV CALCULATION ===
NPV = nf.npv(0.07, cash_flows)
    = $4,551,112,558

=== IRR CALCULATION ===
IRR = nf.irr(cash_flows)
    = 1.1684 (116.84%)

=== PAYBACK PERIOD ===
Year 0: Cumulative = -$400,000,000
Year 1: Cumulative = -$400,000,000 + $467,350,000 = $67,350,000 ✓
Payback Period = 1 year



Scenario 2: 21% Tax Rate (No Depreciation Shield)
=== INPUTS ===
TCI (Total Capital Investment) = $400,000,000
Annual Revenue                 = $1,177,500,000
Annual OPEX                    = $710,150,000
Project Lifetime               = 20 years
Discount Rate                  = 7%
Tax Rate                       = 21%

=== CASH FLOW CALCULATION ===

Year 0 (Construction):
  Cash Flow = -TCI
            = -$400,000,000

Years 1-20 (Operations):
  Gross Profit = Revenue - OPEX
               = $1,177,500,000 - $710,150,000
               = $467,350,000/year

  Income Tax = Gross Profit × Tax Rate
             = $467,350,000 × 0.21
             = $98,143,500/year

  After-Tax Cash Flow = Gross Profit - Income Tax
                      = $467,350,000 - $98,143,500
                      = $369,206,500/year

=== CASH FLOWS ARRAY ===
cash_flows = [-400,000,000, 369,206,500, 369,206,500, ..., 369,206,500]
             (Year 0)       (Year 1)     (Year 2)          (Year 20)

=== NPV CALCULATION ===
NPV = nf.npv(0.07, cash_flows)
    = $3,511,378,921

=== IRR CALCULATION ===
IRR = nf.irr(cash_flows)
    = 0.9230 (92.30%)

=== PAYBACK PERIOD ===
Year 0: Cumulative = -$400,000,000
Year 1: Cumulative = -$400,000,000 + $369,206,500 = -$30,793,500
Year 2: Cumulative = -$30,793,500 + $369,206,500 = $338,413,000 ✓
Payback Period = 2 years


Scenario 2: 21% Tax Rate (No Depreciation Shield)
=== INPUTS ===
TCI (Total Capital Investment) = $400,000,000
Annual Revenue                 = $1,177,500,000
Annual OPEX                    = $710,150,000
Project Lifetime               = 20 years
Discount Rate                  = 7%
Tax Rate                       = 21%

=== CASH FLOW CALCULATION ===

Year 0 (Construction):
  Cash Flow = -TCI
            = -$400,000,000

Years 1-20 (Operations):
  Gross Profit = Revenue - OPEX
               = $1,177,500,000 - $710,150,000
               = $467,350,000/year

  Income Tax = Gross Profit × Tax Rate
             = $467,350,000 × 0.21
             = $98,143,500/year

  After-Tax Cash Flow = Gross Profit - Income Tax
                      = $467,350,000 - $98,143,500
                      = $369,206,500/year

=== CASH FLOWS ARRAY ===
cash_flows = [-400,000,000, 369,206,500, 369,206,500, ..., 369,206,500]
             (Year 0)       (Year 1)     (Year 2)          (Year 20)

=== NPV CALCULATION ===
NPV = nf.npv(0.07, cash_flows)
    = $3,511,378,921

=== IRR CALCULATION ===
IRR = nf.irr(cash_flows)
    = 0.9230 (92.30%)

=== PAYBACK PERIOD ===
Year 0: Cumulative = -$400,000,000
Year 1: Cumulative = -$400,000,000 + $369,206,500 = -$30,793,500
Year 2: Cumulative = -$30,793,500 + $369,206,500 = $338,413,000 ✓
Payback Period = 2 years



Scenario 3: Tax Rate = 28% (default)

=== INPUTS ===
TCI (Total Capital Investment) = $400,000,000
Annual Revenue                 = $1,177,500,000
Annual OPEX                    = $710,150,000
Project Lifetime               = 20 years
Discount Rate                  = 7%
Tax Rate                       = 28%

=== CASH FLOW CALCULATION ===

Year 0 (Construction):
  Cash Flow = -TCI
            = -$400,000,000

Years 1-20 (Operations):
  Gross Profit = Revenue - OPEX
               = $1,177,500,000 - $710,150,000
               = $467,350,000/year

  Income Tax = Gross Profit × Tax Rate
             = $467,350,000 × 0.28
             = $130,858,000/year

  After-Tax Cash Flow = Gross Profit - Income Tax
                      = $467,350,000 - $130,858,000
                      = $336,492,000/year

=== CASH FLOWS ARRAY ===
cash_flows = [-400,000,000, 369,206,500, 369,206,500, ..., 369,206,500]
             (Year 0)       (Year 1)     (Year 2)          (Year 20)

=== NPV CALCULATION ===
NPV = nf.npv(0.07, cash_flows)
    = $3,511,378,921

=== IRR CALCULATION ===
IRR = nf.irr(cash_flows)
    = 0.9230 (92.30%)

=== PAYBACK PERIOD ===
Year 0: Cumulative = -$400,000,000
Year 1: Cumulative = -$400,000,000 + $369,206,500 = -$30,793,500
Year 2: Cumulative = -$30,793,500 + $369,206,500 = $338,413,000 ✓
Payback Period = 2 years


Year 0 (Construction):
  Cash Flow = -$400,000,000 (TCI investment)

Years 1-20 (Operations):
  Gross Profit = Revenue - OPEX
               = $1,177,500,000 - $710,150,000 
               = $467,350,000/year

  Depreciation = TCI / Lifetime 
               = $400,000,000 / 20 
               = $20,000,000/year

  Taxable Income = Gross Profit - Depreciation
                 = $467,350,000 - $20,000,000 
                 = $447,350,000

  Income Tax = Taxable Income × Tax Rate
             = $447,350,000 × 0.28 
             = $125,258,000/year

  After-Tax Cash Flow = Gross Profit - Income Tax
                      = $467,350,000 - $125,258,000
                      = $342,092,000/year