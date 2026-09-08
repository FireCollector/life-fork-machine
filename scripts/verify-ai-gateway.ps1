param(
  [string]$BaseUrl = "http://127.0.0.1:4173",
  [string]$ResultPath = "verification/TASK-030/deepseek-probe-result.json",
  [string]$RunLabel = "single"
)

$request = @{
  contractVersion = 1
  requestId = "deepseek-background-probe-$RunLabel"
  task = "propose-next-steps"
  topic = @{
    rawQuestion = "Should I keep a stable job or join my manager's startup? Verification run: $RunLabel"
    locale = "zh-CN"
    confirmedConstraints = @(@{
      category = "cash"
      text = "Keep at least six months of household cash flow."
    })
  }
  evidence = @(
    @{ id = "zh-deepseek-probe-01"; title = "Test source one"; author = "Test editor"; claim = "Verify cash flow and written terms first."; conditions = @("Test-only evidence"); stance = "conditional"; url = "https://www.zhihu.com/question/10000001" },
    @{ id = "zh-deepseek-probe-02"; title = "Test source two"; author = "Test editor"; claim = "Equity terms need to be written down."; conditions = @("Test-only evidence"); stance = "conditional"; url = "https://www.zhihu.com/question/10000002" },
    @{ id = "zh-deepseek-probe-03"; title = "Test source three"; author = "Test editor"; claim = "Keep an exit condition before irreversible commitments."; conditions = @("Test-only evidence"); stance = "oppose"; url = "https://www.zhihu.com/question/10000003" }
  )
  instruction = "Return a reviewable candidate. Do not predict outcomes, recommend a best route, or mutate game state."
}

try {
  $response = Invoke-WebRequest -Uri "$BaseUrl/api/ai/candidate" -Method Post -ContentType "application/json" -Body ($request | ConvertTo-Json -Depth 8 -Compress) -SkipHttpErrorCheck -TimeoutSec 90
  $body = $response.Content | ConvertFrom-Json
  $summary = [pscustomobject]@{
    completedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = [int]$response.StatusCode
    provenance = $body.provenance
    failureCode = $body.code
    diagnostic = $body.diagnostic
    reviewStatus = $body.review.status
    provider = $body.metadata.provider
    keyLeak = ($response.Content -match "sk-[A-Za-z0-9_-]{16,}")
  }
} catch {
  $summary = [pscustomobject]@{
    completedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = $null
    provenance = "transport-failure"
    failureCode = "probe-failed"
    diagnostic = $_.Exception.GetType().Name
    reviewStatus = $null
    provider = $null
    keyLeak = $false
  }
}

$summary | ConvertTo-Json -Compress | Set-Content -LiteralPath $ResultPath -Encoding utf8
