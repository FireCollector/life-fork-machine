param(
  [string]$BaseUrl = "http://127.0.0.1:4173",
  [int]$Count = 20,
  [string]$ResultPath = "verification/TASK-030/deepseek-stability-result.json"
)

$singleProbe = Join-Path $PSScriptRoot "verify-ai-gateway.ps1"
$singleResult = Join-Path $PSScriptRoot "..\verification\TASK-030\deepseek-single-result.json"
$allResults = @()

for ($index = 1; $index -le $Count; $index += 1) {
  & $singleProbe -BaseUrl $BaseUrl -ResultPath $singleResult -RunLabel ("run-{0:D2}" -f $index)
  $result = Get-Content -LiteralPath $singleResult -Raw | ConvertFrom-Json
  $allResults += $result

  [pscustomobject]@{
    completed = $index
    target = $Count
    structuredCandidates = @($allResults | Where-Object { $_.provenance -eq "ai-generated-candidate" }).Count
  } | ConvertTo-Json -Compress | Set-Content -LiteralPath $ResultPath -Encoding utf8
}

$successful = @($allResults | Where-Object { $_.provenance -eq "ai-generated-candidate" })
$failures = $allResults |
  Where-Object { $_.provenance -ne "ai-generated-candidate" } |
  Group-Object failureCode |
  ForEach-Object { [pscustomobject]@{ code = $_.Name; count = $_.Count } }

[pscustomobject]@{
  completedAt = (Get-Date).ToUniversalTime().ToString("o")
  count = $Count
  structuredCandidates = $successful.Count
  successRate = if ($Count -gt 0) { [math]::Round($successful.Count / $Count, 3) } else { 0 }
  meetsThreshold = ($successful.Count -ge 19)
  failureCounts = @($failures)
  keyLeakDetected = [bool]($allResults | Where-Object { $_.keyLeak } | Select-Object -First 1)
} | ConvertTo-Json -Compress | Set-Content -LiteralPath $ResultPath -Encoding utf8
