$src = 'c:\Users\Brayan\Downloads\crm-dr\crm-dr\src\features\prospects\SeguimientoProspectos.jsx'
$newNotes = 'c:\Users\Brayan\Downloads\crm-dr\crm-dr\notes_section.txt'

$content = Get-Content $src
$newBlock = Get-Content $newNotes

# Line 1467 (0-indexed: 1466) starts the broken notes section
# Line 1480 (0-indexed: 1479) ends it
$before = $content[0..1465]
$after  = $content[1480..($content.Length - 1)]

$result = $before + $newBlock + $after
$result | Set-Content $src -Encoding utf8
Write-Host "Done. Lines: $($result.Length)"
