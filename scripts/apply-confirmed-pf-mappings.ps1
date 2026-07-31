$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$birthdayPath = Join-Path $root "outputs\019fb7b3-pf-correction\Birthday Details 2025 - corrected.xlsx"
$employeePath = Join-Path $root "Project Documents\MASTER\Employee Master.xlsx"
$supervisorPath = Join-Path $root "Project Documents\MASTER\Supervisor Master.xlsx"

# Master worksheet row -> confirmed All Name worksheet row.
$employeeMappings = @{
    2=146; 3=148; 4=149; 5=151; 6=143; 7=156; 8=155; 9=418
    10=144; 11=286; 12=420; 13=150; 14=129; 15=280; 16=135
    18=134; 19=130; 20=131; 21=62; 22=136; 23=302; 24=301
    25=304; 26=300; 27=306; 28=308; 29=309; 30=312; 31=311
    32=314; 33=316; 34=315; 35=320; 36=318; 37=449; 38=484
    39=325; 40=326; 41=307; 42=335; 43=331; 44=332; 45=330
}

$supervisorMappings = @{
    2=223; 3=39; 4=226; 5=193; 6=291; 7=179; 8=296; 9=298
    10=508; 11=224; 12=376; 14=374; 15=377; 17=375; 18=412
    19=450; 20=404; 21=297; 24=121; 25=119; 26=126; 27=124
    29=127; 30=77; 31=80; 32=97; 33=79; 35=61; 36=78
    38=44; 39=105; 40=53
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$birthdayBook = $null
$employeeBook = $null
$supervisorBook = $null

try {
    $birthdayBook = $excel.Workbooks.Open($birthdayPath, 0, $true)
    $birthdaySheet = $birthdayBook.Worksheets.Item("All Name")

    $employeeBook = $excel.Workbooks.Open($employeePath, 0, $false)
    $employeeSheet = $employeeBook.Worksheets.Item("Employee Master")
    $employeeSheet.Range("E1:E47").Copy()
    $employeeSheet.Range("F1:F47").PasteSpecial(-4122)
    $employeeSheet.Range("F1").Value2 = "PF Number"
    $employeeSheet.Range("F2:F47").NumberFormat = "@"
    $employeeSheet.Range("F2:F47").ClearContents()

    foreach ($masterRow in $employeeMappings.Keys) {
        $birthdayRow = $employeeMappings[$masterRow]
        $pf = [string]$birthdaySheet.Range("F$birthdayRow").Text
        if ([string]::IsNullOrWhiteSpace($pf)) {
            throw "Birthday PF is blank at All Name row $birthdayRow"
        }
        $employeeSheet.Range("F$masterRow").Value2 = $pf.Trim()
    }
    $employeeBook.Save()

    $supervisorBook = $excel.Workbooks.Open($supervisorPath, 0, $false)
    $supervisorSheet = $supervisorBook.Worksheets.Item("SupervisorS ")
    # This worksheet starts at column C; Role is H, so PF belongs in I.
    $supervisorSheet.Range("H1:H40").Copy()
    $supervisorSheet.Range("I1:I40").PasteSpecial(-4122)
    $supervisorSheet.Range("I1").Value2 = "PF Number"
    $supervisorSheet.Range("I2:I40").NumberFormat = "@"
    $supervisorSheet.Range("I2:I40").ClearContents()

    # Restore the original Section column in case an earlier interrupted run
    # wrote PF values into absolute column G.
    $sectionGroups = @{
        "G2:G4"="MH"; "G5:G7"="MA"; "G8:G13"="ML"
        "G14:G17"="UF"; "G18:G23"="GEN"; "G24:G29"="EL"
        "G30:G37"="EH"; "G38:G40"="EA"
    }
    $supervisorSheet.Range("G1").Value2 = "Section"
    foreach ($rangeAddress in $sectionGroups.Keys) {
        $supervisorSheet.Range($rangeAddress).Value2 = $sectionGroups[$rangeAddress]
    }

    foreach ($masterRow in $supervisorMappings.Keys) {
        $birthdayRow = $supervisorMappings[$masterRow]
        $pf = [string]$birthdaySheet.Range("F$birthdayRow").Text
        if ([string]::IsNullOrWhiteSpace($pf)) {
            throw "Birthday PF is blank at All Name row $birthdayRow"
        }
        $supervisorSheet.Range("I$masterRow").Value2 = $pf.Trim()
    }
    $supervisorBook.Save()

    Write-Output "Employee mappings: $($employeeMappings.Count)"
    Write-Output "Supervisor mappings: $($supervisorMappings.Count)"
}
finally {
    if ($supervisorBook) { $supervisorBook.Close($false) }
    if ($employeeBook) { $employeeBook.Close($false) }
    if ($birthdayBook) { $birthdayBook.Close($false) }
    $excel.Quit()
}
